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

  // Watchdog Timer Ref
  const watchdogRef = useRef<NodeJS.Timeout>();

  // Fetch Battle State
  const fetchBattleState = useCallback(async () => {
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
      const { data: subs } = await supabase.from('battle_submissions').select('*').eq('battle_id', battleId);
      if (subs) setSubmissions(subs as BattleSubmission[]);

      // 4. Get Result if needed (status is completed or reveal_loser)
      if (['completed', 'reveal_loser'].includes(battleData.status)) {
        const { data: res } = await supabase.from('battle_results').select('*').eq('battle_id', battleId).single();
        if (res) setResult(res as BattleResult);
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [battleId, user]);

  // Realtime Subscription
  useEffect(() => {
    if (!battleId || !user) return;

    // Initial fetch
    fetchBattleState();

    const channel = supabase
      .channel(`battle-room-${battleId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'battles', filter: `id=eq.${battleId}` },
        (payload) => {
          console.log('[Realtime] Battle update:', payload.new);
          setBattle(payload.new as Battle);
          
          // If status became reveal_loser or completed, fetch result immediately
          if (['reveal_loser', 'completed'].includes((payload.new as Battle).status)) {
             // Small delay to ensure result is inserted before we fetch
             setTimeout(() => {
                 supabase.from('battle_results').select('*').eq('battle_id', battleId).single()
                 .then(({ data }) => {
                     if (data) setResult(data as BattleResult);
                 });
             }, 500);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'battle_submissions', filter: `battle_id=eq.${battleId}` },
        () => {
            console.log('[Realtime] Submission update');
            supabase.from('battle_submissions').select('*').eq('battle_id', battleId).then(({ data }) => {
                if (data) setSubmissions(data as BattleSubmission[]);
            });
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'battle_results', filter: `battle_id=eq.${battleId}` },
        (payload) => {
            console.log('[Realtime] Result created:', payload.new);
            setResult(payload.new as BattleResult);
        }
      )
      .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
              console.log('[Realtime] Connected to battle room');
          }
      });

    // Watchdog: If status is processing for too long (>15s), force refetch
    watchdogRef.current = setInterval(() => {
        if (battle?.status === 'processing') {
            fetchBattleState();
        }
    }, 10000);

    return () => {
      supabase.removeChannel(channel);
      if (watchdogRef.current) clearInterval(watchdogRef.current);
    };
  }, [battleId, user, fetchBattleState]); // Removed 'battle' from dependency to avoid re-subscribing on state change

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

      // Submit RPC
      const { error } = await supabase.rpc('submit_battle_photos_v2', {
        p_battle_id: battleId,
        p_front_path: frontPath,
        p_side_path: sidePath
      });

      if (error) throw error;
      toast.success('Fotos enviadas!');
      
      // Simulate Processing Trigger (Mock)
      // Check if opponent has submitted (locally) or just try to trigger
      // We trigger the mock logic after 2s to simulate "waiting for other / processing"
      setTimeout(async () => {
             // Only trigger mock if status is processing (meaning both submitted)
             // Or we can try to force it for the demo flow if this user is the second one
             const { data: current } = await supabase.from('battles').select('status').eq('id', battleId).single();
             if (current?.status === 'processing') {
                 // Trigger Mock AI
                 await supabase.rpc('mock_process_battle_result', { p_battle_id: battleId });
             }
      }, 2500); 

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
