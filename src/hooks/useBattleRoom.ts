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
      // CORRIGIDO: Selecionar apenas campos necessários em vez de *
      const { data: battleData, error: battleError } = await supabase
        .from('battles')
        .select('id, created_by, opponent_id, status, created_at, expires_at, theme, stake, winner_id, created_by_ready, opponent_ready')
        .eq('id', battleId)
        .single();

      if (battleError) throw battleError;
      setBattle(battleData as Battle);
      latestBattleRef.current = battleData as Battle;

      // 2. Get Opponent Profile
      // CORRIGIDO: Selecionar apenas campos necessários
      const opponentId = battleData.created_by === user?.id ? battleData.opponent_id : battleData.created_by;
      if (opponentId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username, display_name, full_name, avatar_url, is_premium')
          .eq('id', opponentId)
          .single();
        setOpponentProfile(profile);
      }

      // 3. Get Submissions
      // CORRIGIDO: Selecionar apenas campos necessários
      const { data: subs } = await supabase
        .from('battle_submissions')
        .select('id, user_id, battle_id, photo_front_url, photo_side_url, status, submitted_at')
        .eq('battle_id', battleId);
      if (subs) setSubmissions(subs as BattleSubmission[]);

      if (battleData.status !== 'waiting') {
        // CORRIGIDO: Selecionar apenas campos necessários
        const { data: res } = await supabase
          .from('battle_results')
          .select('id, battle_id, winner_id, loser_id, draw, completed_at, winner_score, loser_score')
          .eq('battle_id', battleId)
          .maybeSingle();
        if (res) setResult(res as BattleResult);
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [battleId, user]);

  const ensureBattleProgress = useCallback(async () => {
    try {
      const { data, error: rpcError } = await supabase.rpc('ensure_battle_progress_v3', {
        p_battle_id: battleId,
      });
      if (rpcError) {
        console.error('[Battle] ensure_battle_progress_v3 failed', { battleId, rpcError });
        console.error('[Battle] ensure error body:', rpcError);
        return;
      }
      if (data && (data as any).success === false) {
        console.error('[Battle] ensure_battle_progress_v3 rejected', { battleId, data });
      }
    } catch (e) {
      console.error('[Battle] ensure_battle_progress_v3 exception', { battleId, e });
    }
  }, [battleId]);

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
    // Also acts as a safety net to trigger transitions if they get stuck
    watchdogRef.current = setInterval(() => {
      const b = latestBattleRef.current;
      if (!b) return;

      const now = Date.now() + serverTimeOffsetMs;

      console.log('[Battle][poll]', {
        battleId,
        status: b.status,
        ready_at: (b as any).ready_at,
        start_at: (b as any).start_at,
        now_server_approx: new Date(now).toISOString(),
      });

      const needsResult = b.status === 'finished' && !result;
      const shouldStop =
        b.status === 'finished' ||
        b.status === 'canceled' ||
        b.status === 'expired' ||
        !!result;
      const notFinished = !shouldStop;
      
      if (shouldStop) {
        console.log('[Battle][poll] stopping', { battleId, status: b.status, hasResult: !!result });
        if (watchdogRef.current) {
          clearInterval(watchdogRef.current);
          watchdogRef.current = undefined;
        }
        return;
      }
      if (notFinished) {
        ensureBattleProgress();
      }
      if (needsResult || notFinished) {
        fetchBattleState();
      }
    }, 2000);

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
  }, [battleId, user, fetchBattleState, fetchServerTimeOffset, result, serverTimeOffsetMs, ensureBattleProgress]);

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
      ensureBattleProgress();

    } catch (err: any) {
      console.error('[Battle] submitPhotos failed', { battleId, err });
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
    refresh: async () => {
      await ensureBattleProgress();
      await fetchBattleState();
    },
  };
}
