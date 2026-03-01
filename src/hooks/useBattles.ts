import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { EnrichedBattle } from '@/types/battle';
import { toast } from 'sonner';

export function useBattles() {
  const { user } = useAuth();
  const [battles, setBattles] = useState<EnrichedBattle[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBattles = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch battles where user is creator or opponent
      const { data, error } = await supabase
        .from('battles')
        .select('*')
        .or(`created_by.eq.${user.id},opponent_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log("Battles fetched:", data); // Debug log requested by user

      if (data && data.length > 0) {
        // Collect all user IDs needed (both creators and opponents)
        const userIds = new Set<string>();
        data.forEach(b => {
          if (b.created_by) userIds.add(b.created_by);
          if (b.opponent_id) userIds.add(b.opponent_id);
        });

        // Fetch profile data for all involved users
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, display_name, full_name, avatar_url, public_id, short_id')
          .in('id', Array.from(userIds));

        const enriched = data.map(b => {
          const isCreator = b.created_by === user.id;
          // Determine who is the "other" person to show
          const otherId = isCreator ? b.opponent_id : b.created_by;
          const otherProfile = profiles?.find(p => p.id === otherId);

          // Normalize avatar
          let avatarUrl = otherProfile?.avatar_url;
          if (avatarUrl && !avatarUrl.startsWith('http') && !avatarUrl.startsWith('data:')) {
             const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(avatarUrl);
             avatarUrl = publicUrlData.publicUrl + `?t=${Date.now()}`;
          }
          
          // Normalize display name
          const displayName = otherProfile ? (otherProfile.display_name || otherProfile.full_name || otherProfile.username || `User ${otherProfile.short_id}`) : 'Desconhecido';

          return {
            ...b,
            opponent_profile: otherProfile ? { ...otherProfile, avatar_url: avatarUrl, display_name: displayName } : undefined,
            is_creator: isCreator
          };
        })
        .filter(b => {
          // Filter out stale waiting battles (older than 24h)
          if (b.status === 'waiting_for_opponent') {
            const createdAt = new Date(b.created_at).getTime();
            const now = Date.now();
            const hoursDiff = (now - createdAt) / (1000 * 60 * 60);
            return hoursDiff < 24;
          }
          return true;
        });

        setBattles(enriched);
      } else {
        setBattles([]);
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao carregar batalhas');
    } finally {
      setLoading(false);
    }
  };

  const createBattle = async (opponentId: string) => {
    try {
      // 1. Check for existing pending battle
      const { data: existing } = await supabase
        .from('battles')
        .select('id')
        .eq('created_by', user.id)
        .eq('opponent_id', opponentId)
        .eq('status', 'waiting')
        .maybeSingle();
      
      if (existing) {
        toast.error('Já existe um desafio pendente para este usuário.');
        return false;
      }

      // 2. Create directly (bypass RPC to ensure correct status)
      const { data, error } = await supabase.from('battles').insert({
        created_by: user.id,
        opponent_id: opponentId,
        status: 'waiting',
        mode: 'front_lateral',
        room_version: 1,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24h
      }).select().single();

      if (error) throw error;
      
      toast.success('Desafio criado!');
      fetchBattles();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar desafio');
      return false;
    }
  };

  const acceptBattle = async (battleId: string) => {
    try {
      // Use RPC to avoid RLS issues and ensure atomicity
      const { data, error } = await supabase.rpc('accept_battle_challenge_v2', {
        p_battle_id: battleId
      });

      if (error) throw error;
      if (data && (data as any).success === false) throw new Error((data as any).error);

      toast.success('Desafio aceito! Redirecionando...');
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Erro ao aceitar desafio');
      return false;
    }
  };

  const rejectBattle = async (battleId: string) => {
    try {
      // Optimistic update: Remove from list immediately
      setBattles(prev => prev.filter(b => b.id !== battleId));

      // Just update status to canceled/rejected
      const { error } = await supabase
        .from('battles')
        .update({ status: 'canceled' })
        .eq('id', battleId)
        .eq('opponent_id', user.id); // Security check

      if (error) {
        console.error('Error rejecting battle:', error);
        // Rollback if error
        fetchBattles();
        throw error;
      }

      toast.info('Desafio recusado.');
      // No need to fetch again if optimistic update worked, but we can do it silently
      // fetchBattles(); 
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Erro ao recusar desafio');
      return false;
    }
  };

  useEffect(() => {
    fetchBattles();

    if (!user) return;

    // Realtime subscription for battles involving the user
    const channel = supabase
      .channel('battles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'battles'
        },
        (payload) => {
          const newBattle = payload.new as any;
          const oldBattle = payload.old as any;
          
          // Check if the change is relevant to the current user
          const isRelevant = 
            (newBattle && (newBattle.created_by === user.id || newBattle.opponent_id === user.id)) ||
            (oldBattle && (oldBattle.created_by === user.id || oldBattle.opponent_id === user.id));

          if (isRelevant) {
            console.log("Realtime update detected:", payload);
            fetchBattles();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    battles,
    loading,
    fetchBattles,
    createBattle,
    acceptBattle,
    rejectBattle
  };
}
