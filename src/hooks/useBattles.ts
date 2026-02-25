import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface BattleProfile {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface Battle {
  id: string;
  challenger_id: string;
  opponent_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'waiting_upload' | 'analyzing' | 'finished' | 'canceled';
  challenger_photo_url: string | null;
  opponent_photo_url: string | null;
  challenger_score: number | null;
  opponent_score: number | null;
  winner_id: string | null;
  loser_id: string | null;
  win_reason: string | null;
  created_at: string;
  finished_at: string | null;
  challenger?: BattleProfile;
  opponent?: BattleProfile;
}

export function useBattles() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [battles, setBattles] = useState<Battle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBattles = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('battles')
        .select('*')
        .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        // ... (existing logic)
        const userIds = new Set<string>();
        data.forEach(b => {
            userIds.add(b.challenger_id);
            userIds.add(b.opponent_id);
        });

        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url')
            .in('id', Array.from(userIds));
        
        if (profilesError) throw profilesError;

        const enrichedBattles = data.map(b => ({
            ...b,
            challenger: profiles?.find(p => p.id === b.challenger_id),
            opponent: profiles?.find(p => p.id === b.opponent_id)
        })) as Battle[];

        setBattles(enrichedBattles);
      } else {
        setBattles([]);
      }
    } catch (error: any) {
      console.error('Error fetching battles:', error);
      // Specifically catch missing table error
      if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
          setError('SETUP_REQUIRED');
      } else {
          setError(error.message);
          toast({
            title: 'Erro ao carregar duelos',
            description: error.message,
            variant: 'destructive',
          });
      }
    } finally {
      setLoading(false);
    }
  };

  const createBattle = async (opponentId: string): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const { error } = await supabase
        .from('battles')
        .insert({
          challenger_id: user.id,
          opponent_id: opponentId,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Desafio enviado!",
        description: "Aguarde seu amigo aceitar o duelo.",
      });
      
      fetchBattles();
      return true;
    } catch (error: any) {
      console.error('Error creating battle:', error);
      toast({
        title: "Erro ao criar duelo",
        description: error.message,
        variant: "destructive"
      });
      return false;
    }
  };

  const respondBattle = async (battleId: string, action: 'accepted' | 'rejected') => {
    if (!user) return;

    try {
      const newStatus = action === 'accepted' ? 'waiting_upload' : 'rejected';
      
      const { error } = await supabase
        .from('battles')
        .update({ status: newStatus })
        .eq('id', battleId);

      if (error) throw error;

      toast({
        title: action === 'accepted' ? "Desafio aceito!" : "Desafio recusado",
        description: action === 'accepted' ? "Prepare-se para enviar sua foto." : undefined,
      });

      fetchBattles();
    } catch (error: any) {
      console.error('Error responding to battle:', error);
      toast({
        title: "Erro ao responder",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (user) {
        fetchBattles();
        
        // Realtime subscription (only if no critical setup error)
        if (error !== 'SETUP_REQUIRED') {
            const channel = supabase
                .channel('battles_changes')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'battles',
                        filter: `challenger_id=eq.${user.id}`,
                    },
                    () => fetchBattles()
                )
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'battles',
                        filter: `opponent_id=eq.${user.id}`,
                    },
                    () => fetchBattles()
                )
                .subscribe();
            return () => { supabase.removeChannel(channel); };
        }
    }
  }, [user]);

  return { battles, loading, error, fetchBattles, createBattle, respondBattle };
}
