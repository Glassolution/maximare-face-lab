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
      const { data, error } = await supabase.rpc('create_battle_challenge_v2', {
        target_opponent_id: opponentId,
        battle_mode: 'front_lateral'
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
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
      const { data, error } = await supabase.rpc('accept_battle_challenge_v2', {
        p_battle_id: battleId
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast.success('Desafio aceito! Redirecionando...');
      fetchBattles();
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
