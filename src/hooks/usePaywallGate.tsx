import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PaywallContext, shouldShowPaywall, recordPaywallShow, recordPaywallDismiss, logPaywallEvent } from '@/lib/paywall';
import { usePaywallStore } from '@/lib/paywallStore';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';

export function usePaywallGate() {
  const navigate = useNavigate();
  const { openMain, closeMain, isMainOpen, mainContext } = usePaywallStore();
  const { profile } = useAuth();
  const { isPremium } = usePremiumStatus();
  
  // TODOS os hooks primeiro, sem exceção
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  
  const closePaywall = useCallback(async () => {
    closeMain();
    // Record dismiss when user closes modal
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

  // Verificação de premium DENTRO da função, não no corpo do hook
  const checkGate = useCallback(async (triggerContext: PaywallContext): Promise<boolean> => {
    console.log('[PaywallGate] checkGate chamado:', {
      trigger: triggerContext.trigger,
      isPremium,
      profile: {
        is_premium: profile?.is_premium,
        subscription_status: profile?.subscription_status
      }
    });
    
    if (isPremium) {
      console.log('[PaywallGate] Usuário é premium, permitindo todas as ações');
      return true; // Permitir ação para premium
    }
    
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
           setIsPaywallOpen(true); // Controlar estado local
           return false; // Block action (or indicate paywall shown)
        }
      }
      
      return true; // Proceed
    } catch (error) {
      console.error("Error checking paywall gate:", error);
      return true; // Fail safe: allow access if error
    }
  }, [navigate, openMain, setIsPaywallOpen, isPremium, profile?.is_premium, profile?.subscription_status]);

  return {
    checkGate,
    isPaywallOpen: isMainOpen,
    closePaywall,
    handleUpgrade
  };
}
