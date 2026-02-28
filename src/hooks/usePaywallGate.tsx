import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PaywallContext, shouldShowPaywall, recordPaywallShow, recordPaywallDismiss, logPaywallEvent } from '@/lib/paywall';
import { usePaywallStore } from '@/lib/paywallStore';
import { supabase } from '@/integrations/supabase/client';
import { PaywallModal } from '@/components/PaywallModal';

export function usePaywallGate() {
  const navigate = useNavigate();
  const { openMain, closeMain, isMainOpen, mainContext } = usePaywallStore();

  const closePaywall = useCallback(async () => {
    closeMain();
    // Record dismiss when user closes the modal
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user && mainContext) {
      await recordPaywallDismiss(session.user.id, mainContext);
    }
  }, [mainContext, closeMain]);

  const handleUpgrade = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user && mainContext) {
      await logPaywallEvent(session.user.id, 'paywall_cta_clicked', mainContext);
    }
    closeMain();
    navigate('/premium', { state: { context: mainContext } });
  }, [navigate, mainContext, closeMain]);

  const checkGate = useCallback(async (triggerContext: PaywallContext): Promise<boolean> => {
    try {
      const shouldShow = await shouldShowPaywall(triggerContext);
      
      if (shouldShow) {
        // Check global conversion cooldown before showing
        const { isConversionCooldownActive, setLastConversionShown } = usePaywallStore.getState();
        
        if (isConversionCooldownActive() && triggerContext.trigger !== 'feature_locked' && triggerContext.trigger !== 'manual' && triggerContext.trigger !== 'periodic_force') {
          console.log('[PaywallGate] Skipped: Global conversion cooldown active');
          return true; // Allow action to proceed
        }

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
           // Soft gate: Show modal via Global Store
           openMain(triggerContext);
           return false; // Block action (or indicate paywall shown)
        }
      }
      
      return true; // Proceed
    } catch (error) {
      console.error("Error checking paywall gate:", error);
      return true; // Fail safe: allow access if error
    }
  }, [navigate, openMain]);

  // Wrapper component to render the modal controlled by this hook
  const PaywallDialog = useCallback(() => (
    <PaywallModal 
      open={isMainOpen} 
      onClose={closePaywall} 
      onUpgrade={handleUpgrade}
      context={mainContext}
    />
  ), [isMainOpen, closePaywall, handleUpgrade, mainContext]);

  return {
    checkGate,
    PaywallDialog,
    isPaywallOpen: isMainOpen,
    closePaywall,
    handleUpgrade
  };
}
