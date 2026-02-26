import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface AnalysisLimitState {
  canAnalyze: boolean;
  nextAvailableAt: Date | null;
  remainingToday: number;
  loading: boolean;
  isPremium: boolean;
}

export function useAnalysisLimit() {
  const { user } = useAuth();
  const [state, setState] = useState<AnalysisLimitState>({
    canAnalyze: false,
    nextAvailableAt: null,
    remainingToday: 0,
    loading: true,
    isPremium: false
  });

  const checkLimit = useCallback(async () => {
    if (!user) {
        setState(prev => ({ ...prev, loading: false }));
        return;
    }

    try {
      // 1. Check RPC
      const { data, error } = await supabase.rpc('can_user_analyze_face');
      
      if (error) throw error;
      
      // 2. Determine Premium Status (could be part of RPC or separate profile check)
      // The RPC already returns logic based on premium, but let's get explicit flag if needed
      // Actually, RPC result handles logic.
      
      setState({
        canAnalyze: data.can_analyze,
        nextAvailableAt: data.next_available_at ? new Date(data.next_available_at) : null,
        remainingToday: data.remaining_today,
        loading: false,
        isPremium: data.remaining_today === -1 // Convention: -1 means infinite
      });

    } catch (err: any) {
      console.error('Error checking limit:', err);
      // Fail safe: allow if error? No, safer to block or retry.
      // Let's assume block to prevent abuse if system down, but show error toast
    } finally {
        setState(prev => ({ ...prev, loading: false }));
    }
  }, [user]);

  const logEvent = async (source: string = 'app') => {
      if (!user) return;
      try {
          await supabase.rpc('log_analysis_event', { p_source: source });
          // Refresh limit after logging
          checkLimit();
      } catch (err) {
          console.error('Failed to log event', err);
      }
  };

  useEffect(() => {
    checkLimit();
  }, [checkLimit]);

  return {
    ...state,
    checkLimit,
    logEvent
  };
}
