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

  const [serverTimeOffsetMs, setServerTimeOffsetMs] = useState(0);

  // Watchdog Timer Ref
  const watchdogRef = useRef<NodeJS.Timeout>();
  const latestBattleRef = useRef<Battle | null>(null);

  const fetchServerTimeOffset = useCallback(async () => {
    try {
      const { data, error: timeError } = await supabase.rpc('get_server_time');
      if (timeError) return;
      const serverMs = new Date(data as unknown as string).getTime();
      if (!Number.isFinite(serverMs)) return;
      setServerTimeOffsetMs(serverMs - Date.now());
    } catch {
      // ignore
    }
  }, []);

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
      latestBattleRef.current = battleData as Battle;

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
      if (battleData.status === 'finished') {
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

    fetchServerTimeOffset();

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
          latestBattleRef.current = payload.new as Battle;
          
          if ((payload.new as Battle).status === 'finished') {
            setTimeout(() => {
              supabase
                .from('battle_results')
                .select('*')
                .eq('battle_id', battleId)
                .single()
                .then(({ data }) => {
                  if (data) setResult(data as BattleResult);
                });
            }, 300);
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

    // Fallback polling: keep UI progressing even if realtime drops
    watchdogRef.current = setInterval(() => {
      const b = latestBattleRef.current;
      const needsResult = b?.status === 'finished' && !result;
      const notFinished = b && b.status !== 'finished' && b.status !== 'canceled' && b.status !== 'expired';
      if (needsResult || notFinished) {
        fetchBattleState();
      }
    }, 4000);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchServerTimeOffset();
        fetchBattleState();
      }
    };

    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      supabase.removeChannel(channel);
      if (watchdogRef.current) clearInterval(watchdogRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [battleId, user, fetchBattleState, fetchServerTimeOffset, result]);

  // Actions
  const submitPhotos = async (frontFile: File, sideFile?: File) => {
    if (!user || !battle) return;

    try {
      const frontPath = `${battleId}/${user.id}/front.jpg`;
      const { error: uploadError1 } = await supabase.storage
        .from('battle-photos')
        .upload(frontPath, frontFile, { upsert: true, contentType: frontFile.type });
      if (uploadError1) throw uploadError1;

      const { data: { publicUrl } } = supabase.storage.from('battle-photos').getPublicUrl(frontPath);

      const { data, error } = await supabase.rpc('submit_battle_photo_urls_v3', {
        p_battle_id: battleId,
        p_front_url: publicUrl,
      });

      if (error) throw error;
      if (data && (data as any).success === false) throw new Error((data as any).error);

      toast.success('Fotos enviadas!');

      // If the battle becomes ready/running, we let start_at synchronize animations.
      // Trigger mock processing after a safe delay (only once battle is running).
      setTimeout(async () => {
        const { data: current } = await supabase
          .from('battles')
          .select('status, start_at')
          .eq('id', battleId)
          .single();

        if (current?.status === 'ready' || current?.status === 'running') {
          const startAtMs = current?.start_at ? new Date(current.start_at).getTime() : Date.now();
          const fireIn = Math.max(0, startAtMs + 9000 - (Date.now() + serverTimeOffsetMs));
          setTimeout(() => {
            supabase.rpc('mock_process_battle_result', { p_battle_id: battleId });
          }, fireIn);
        }
      }, 300);

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
    submitPhotos,
    serverTimeOffsetMs,
  };
}
