import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Battle, BattleSubmission, BattleResult } from '@/types/battle';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export function useBattleRoom(battleId: string) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [battle, setBattle] = useState<Battle | null>(null);
  const [opponentProfile, setOpponentProfile] = useState<any>(null);
  const [submissions, setSubmissions] = useState<BattleSubmission[]>([]);
  const [result, setResult] = useState<BattleResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Realtime Subscription
  useEffect(() => {
    if (!battleId || !user) return;

    const channel = supabase
      .channel(`battle-${battleId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'battles', filter: `id=eq.${battleId}` },
        (payload) => {
          setBattle(payload.new as Battle);
          if (payload.new.status === 'completed') {
            fetchResult();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'battle_submissions', filter: `battle_id=eq.${battleId}` },
        () => fetchSubmissions() // Refetch all to update UI state safely
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [battleId, user]);

  // Initial Fetch
  const fetchBattleState = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Get Battle
      const { data: battleData, error: battleError } = await supabase
        .from('battles')
        .select('*')
        .eq('id', battleId)
        .single();

      if (battleError) throw battleError;
      setBattle(battleData as Battle);

      // 2. Get Opponent Profile
      const opponentId = battleData.created_by === user?.id ? battleData.opponent_id : battleData.created_by;
      if (opponentId) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', opponentId).single();
        setOpponentProfile(profile);
      }

      // 3. Get Submissions
      await fetchSubmissions();

      // 4. Get Result if completed
      if (battleData.status === 'completed') {
        await fetchResult();
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message);
      toast.error('Erro ao carregar batalha');
    } finally {
      setLoading(false);
    }
  }, [battleId, user]);

  const fetchSubmissions = async () => {
    const { data } = await supabase.from('battle_submissions').select('*').eq('battle_id', battleId);
    if (data) setSubmissions(data as BattleSubmission[]);
  };

  const fetchResult = async () => {
    const { data } = await supabase.from('battle_results').select('*').eq('battle_id', battleId).single();
    if (data) setResult(data as BattleResult);
  };

  useEffect(() => {
    fetchBattleState();
  }, [fetchBattleState]);

  // Actions
  const submitPhotos = async (frontFile: File, sideFile?: File) => {
    if (!user || !battle) return;

    try {
      // Upload Front
      const frontPath = `${battleId}/${user.id}/front.jpg`;
      const { error: uploadError1 } = await supabase.storage.from('battle-photos').upload(frontPath, frontFile, { upsert: true });
      if (uploadError1) throw uploadError1;

      // Upload Side (Optional)
      let sidePath = null;
      if (sideFile) {
        sidePath = `${battleId}/${user.id}/side.jpg`;
        const { error: uploadError2 } = await supabase.storage.from('battle-photos').upload(sidePath, sideFile, { upsert: true });
        if (uploadError2) throw uploadError2;
      }

      // Submit RPC (Updates DB status)
      const { data, error } = await supabase.rpc('submit_battle_photos_v2', {
        p_battle_id: battleId,
        p_front_path: frontPath,
        p_side_path: sidePath
      });

      if (error) throw error;
      toast.success('Fotos enviadas!');
      
      // Simulate AI Processing Trigger (Normally Edge Function)
      // We check if both submitted locally to trigger simulation, or wait for server state
      // For demo purposes, call simulation RPC after a short delay
      setTimeout(async () => {
          // Only trigger if status becomes processing
          const { data: current } = await supabase.from('battles').select('status').eq('id', battleId).single();
          if (current?.status === 'processing') {
             toast.info('Processando resultados...');
             await supabase.rpc('mock_process_battle_result', { p_battle_id: battleId });
          }
      }, 2000);

    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar fotos');
    }
  };

  return {
    battle,
    opponentProfile,
    submissions,
    result,
    loading,
    error,
    submitPhotos
  };
}
