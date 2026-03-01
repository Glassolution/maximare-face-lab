import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function usePendingBattles() {
  const { user } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    // 1. Initial fetch
    const fetchPendingCount = async () => {
      const { count, error } = await supabase
        .from('battles')
        .select('*', { count: 'exact', head: true })
        .eq('opponent_id', user.id)
        .in('status', ['waiting', 'waiting_for_opponent'])
        .is('matched_at', null);

      if (!error && count !== null) {
        setPendingCount(count);
      }
    };

    fetchPendingCount();

    // 2. Realtime subscription
    const channel = supabase
      .channel(`pending-battles-count-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'battles',
          filter: `opponent_id=eq.${user.id}`,
        },
        () => {
          // Refresh count on any change involving this user as opponent
          fetchPendingCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return pendingCount;
}
