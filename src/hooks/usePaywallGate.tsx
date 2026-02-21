import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PaywallContext, shouldShowPaywall, recordPaywallShow, recordPaywallDismiss, logPaywallEvent } from '@/lib/paywall';
import PaywallModal from '@/components/PaywallModal';
import { supabase } from '@/integrations/supabase/client';

export function usePaywallGate() {
  const [isOpen, setIsOpen] = useState(false);
  const [context, setContext] = useState<PaywallContext | undefined>(undefined);
  const navigate = useNavigate();

  const closePaywall = useCallback(async () => {
    setIsOpen(false);
    // Record dismiss when user closes the modal
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await recordPaywallDismiss(session.user.id, context);
    }
  }, [context]);

  const handleUpgrade = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await logPaywallEvent(session.user.id, 'paywall_cta_clicked', context);
    }
    setIsOpen(false);
    navigate('/premium', { state: { context } });
  }, [navigate, context]);

  const checkGate = useCallback(async (triggerContext: PaywallContext): Promise<boolean> => {
    try {
      const shouldShow = await shouldShowPaywall(triggerContext);
      
      if (shouldShow) {
        // Log show event
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await recordPaywallShow(session.user.id, triggerContext);
        }

        if (triggerContext.trigger === 'feature_locked') {
           // Hard gate: Redirect directly to premium
           navigate('/premium', { state: { context: triggerContext } });
           return false; // Block action
        } else {
           // Soft gate: Show modal
           setContext(triggerContext);
           setIsOpen(true);
           return false; // Block action (or indicate paywall shown)
        }
      }
      
      return true; // Proceed
    } catch (error) {
      console.error("Error checking paywall gate:", error);
      return true; // Fail safe: allow access if error
    }
  }, [navigate]);

  const PaywallDialog = useCallback(() => (
    <PaywallModal 
      open={isOpen} 
      onClose={closePaywall} 
      onUpgrade={handleUpgrade}
      context={context}
    />
  ), [isOpen, closePaywall, handleUpgrade, context]);

  return {
    checkGate,
    PaywallDialog,
    isPaywallOpen: isOpen,
    closePaywall
  };
}
