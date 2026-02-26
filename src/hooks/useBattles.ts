import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Battle, BattleStatus, EnrichedBattle } from '@/types/battle';
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
        // Enrich with opponent profile
        const userIds = new Set<string>();
        data.forEach(b => {
          if (b.created_by) userIds.add(b.created_by);
          if (b.opponent_id) userIds.add(b.opponent_id);
        });

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .in('id', Array.from(userIds));

        const enriched = data.map(b => {
          const isCreator = b.created_by === user.id;
          const opponentId = isCreator ? b.opponent_id : b.created_by;
          const opponent = profiles?.find(p => p.id === opponentId);
          
          return {
            ...b,
            opponent_profile: opponent,
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
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Erro ao aceitar desafio');
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
    acceptBattle
  };
}
