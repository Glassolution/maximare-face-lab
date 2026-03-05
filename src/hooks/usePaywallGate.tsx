import { useCallback } from 'react';
import { PaywallContext } from '@/lib/paywall';

export function usePaywallGate() {
  const checkGate = useCallback(async (_triggerContext: PaywallContext): Promise<boolean> => {
    return true;
  }, []);

  return {
    checkGate,
    isPaywallOpen: false,
    closePaywall: () => {},
    handleUpgrade: () => {},
  };
}
