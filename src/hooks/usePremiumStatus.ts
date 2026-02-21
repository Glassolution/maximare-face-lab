import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';

export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'refunded' | 'expired' | 'trialing' | 'free';

export function usePremiumStatus() {
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>('free');
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [planType, setPlanType] = useState<string>('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsPremium(false);
      setSubscriptionStatus('free');
      setLoading(false);
      return;
    }

    const checkStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('subscription_status, subscription_expires_at, plan_type')
          .eq('id', user.id)
          .single();

        if (error || !data) {
          console.error('Error fetching profile for premium status:', error);
          setIsPremium(false);
          setSubscriptionStatus('free');
        } else {
          const status = (data.subscription_status as SubscriptionStatus) || 'free';
          const expires = data.subscription_expires_at ? new Date(data.subscription_expires_at) : null;
          const plan = data.plan_type || 'free';

          // Server-side validation principle:
          // Access is granted ONLY if status is 'active' (or 'trialing') AND expiration date is valid.
          // We do NOT write to the DB here. The backend is the source of truth.
          const now = new Date();
          const isValid = (status === 'active' || status === 'trialing') && (expires ? expires > now : false);

          setIsPremium(isValid);
          setSubscriptionStatus(status);
          setExpiresAt(expires);
          setPlanType(plan);
        }
      } catch (err) {
        console.error('Unexpected error checking premium status:', err);
        setIsPremium(false);
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
    
    // Subscribe to realtime changes on profiles table for this user
    const channel = supabase
      .channel(`profile-subscription-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Realtime subscription update:', payload);
          checkStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };

  }, [user]);

  return { isPremium, subscriptionStatus, expiresAt, planType, loading };
}
