import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/auth/AuthProvider';

export function usePremiumStatus() {
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<'free' | 'premium_active' | 'premium_expired'>('free');
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
          .select('subscription_status, subscription_expires_at, plan_type, premium_status, premium_until, premium_plan') // Fetch old cols too for fallback
          .eq('id', user.id)
          .single();

        if (error || !data) {
          setIsPremium(false);
          setSubscriptionStatus('free');
        } else {
          // Priority: New columns > Old columns
          let status = data.subscription_status as 'free' | 'premium_active' | 'premium_expired' | null;
          let expires = data.subscription_expires_at;
          let plan = data.plan_type;

          // Fallback migration logic in frontend if DB migration hasn't run yet or for old data
          if (!status) {
             if (data.premium_status === 'premium') status = 'premium_active';
             else status = 'free';
          }
          if (!expires) expires = data.premium_until;
          if (!plan) {
            // Map old plan names to new plan types
            const oldPlan = data.premium_plan;
            if (oldPlan === 'monthly') plan = 'premium_monthly';
            else if (oldPlan === 'yearly') plan = 'premium_yearly';
            else if (oldPlan === 'weekly') plan = 'premium_weekly';
            else plan = 'free';
          }

          // Auto-expire logic
          const now = new Date();
          const expirationDate = expires ? new Date(expires) : null;
          const isExpired = expirationDate ? expirationDate < now : true;

          if (status === 'premium_active' && isExpired) {
             status = 'premium_expired';
             // Update DB to reflect expiration
             try {
               await supabase
                 .from('profiles')
                 .update({ 
                   subscription_status: 'premium_expired',
                   plan_type: 'free' // Reset plan type on expiration? User said "Atualizar automaticamente para premium_expired". keeping plan_type might be useful for history, but typically free users have 'free' plan. Let's set to 'free' as per webhook logic.
                 })
                 .eq('id', user.id);
             } catch (updateErr) {
               console.error('Error auto-expiring subscription:', updateErr);
             }
          }

          const isActive = status === 'premium_active' && !isExpired;
          
          setIsPremium(isActive);
          setSubscriptionStatus(status || 'free');
          setExpiresAt(expirationDate);
          setPlanType(plan || 'free');
        }
      } catch (err) {
        console.error('Error checking premium status:', err);
        setIsPremium(false);
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
    
    // Subscribe to realtime changes on profiles table for this user
    const channel = supabase
      .channel('profile-subscription-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        () => {
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
