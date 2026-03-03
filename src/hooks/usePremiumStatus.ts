
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/lib/logger";

export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'refunded' | 'expired' | 'trialing' | 'free';

interface ExtendedProfile {
    subscription_status?: string;
    subscription_expires_at?: string;
    plan_type?: string;
}

export function usePremiumStatus() {
  const { user, profile, refreshUserData } = useAuth(); // Depend on global profile state
  const [isPremium, setIsPremium] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>('free');
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [planType, setPlanType] = useState<string>('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Logic: Sync with Auth Profile (Single Source of Truth)
    if (!user) {
      setIsPremium(false);
      setSubscriptionStatus('free');
      setExpiresAt(null);
      setPlanType('free');
      setLoading(false);
      return;
    }

    if (!profile) {
      setIsPremium(false);
      setSubscriptionStatus('free');
      setExpiresAt(null);
      setPlanType('free');
      setLoading(false);
      return;
    }

    // Parse status from global profile
    const status = (profile.subscription_status as SubscriptionStatus) || 'free';
    const expires = profile.subscription_expires_at ? new Date(profile.subscription_expires_at) : null;
    const plan = profile.plan_type || 'free';
    
    const now = new Date();
    
    // STRICT CHECK: Only active/trialing AND future expiration date are valid.
    const isValid = (status === 'active' || status === 'trialing') && (expires ? expires > now : false);
    
    logger.log("[PremiumStatus]", `User: ${user.id} | Status: ${status} | Valid: ${isValid}`);
    
    setIsPremium(isValid);
    setSubscriptionStatus(status);
    setExpiresAt(expires);
    setPlanType(plan);
    setLoading(false);

  }, [user, profile]); // Re-run when global profile changes

  // Realtime is handled in AuthProvider via fetchProfile, 
  // but if we want instant feedback here without waiting for AuthProvider:
  useEffect(() => {
     if (!user) return;
     const channel = supabase
      .channel(`premium-status-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload: any) => {
          logger.log("[PremiumStatus]", 'Realtime update:', payload.new);
          const newData = payload.new;
          if (newData) {
              const status = (newData.subscription_status as SubscriptionStatus) || 'free';
              const expires = newData.subscription_expires_at ? new Date(newData.subscription_expires_at) : null;
              const isValid = (status === 'active' || status === 'trialing') && (expires ? expires > new Date() : false);

              setIsPremium(isValid);
              setSubscriptionStatus(status);
              setExpiresAt(expires);
              setPlanType(newData.plan_type || 'free');
              // Sync global AuthContext so all consumers reflect the change immediately
              refreshUserData();
          }
        }
      )
      .subscribe();
      
      return () => { supabase.removeChannel(channel); };
  }, [user]);

  return { isPremium, subscriptionStatus, expiresAt, planType, loading };
}
