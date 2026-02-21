import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/auth/AuthProvider';

export function usePremiumStatus() {
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsPremium(false);
      setLoading(false);
      return;
    }

    const checkStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('premium_status, premium_until')
          .eq('id', user.id)
          .single();

        if (error || !data) {
          setIsPremium(false);
        } else {
          const isActive = data.premium_status === 'premium';
          const isValidDate = data.premium_until ? new Date(data.premium_until) > new Date() : false;
          setIsPremium(isActive && isValidDate);
        }
      } catch (err) {
        console.error('Error checking premium status:', err);
        setIsPremium(false);
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
  }, [user]);

  return { isPremium, loading };
}
