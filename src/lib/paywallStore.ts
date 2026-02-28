import { create } from 'zustand';
import { PaywallContext } from './paywall';

export type PaywallType = 'main' | 'popup';

interface PaywallState {
  // Modal 1: Main (High Priority)
  isMainOpen: boolean;
  mainContext: PaywallContext | undefined;
  openMain: (context: PaywallContext) => void;
  closeMain: () => void;

  // Modal 2: Popup (Low Priority)
  isPopupOpen: boolean;
  popupContext: PaywallContext | undefined;
  openPopup: (context: PaywallContext) => void;
  closePopup: () => void;

  // Global Logic
  closeAll: () => void;
  
  // Cooldown tracking
  lastConversionShown: number;
  setLastConversionShown: (timestamp: number) => void;
  isConversionCooldownActive: () => boolean;
}

export const usePaywallStore = create<PaywallState>((set, get) => ({
  isMainOpen: false,
  mainContext: undefined,
  isPopupOpen: false,
  popupContext: undefined,
  lastConversionShown: 0,

  openMain: (context) => {
    // High priority: Closes popup if open
    set({
      isMainOpen: true,
      mainContext: context,
      isPopupOpen: false,
      popupContext: undefined,
      lastConversionShown: Date.now()
    });
  },

  closeMain: () => {
    set({
      isMainOpen: false,
      mainContext: undefined
    });
  },

  openPopup: (context) => {
    const { isMainOpen } = get();
    // Low priority: Only opens if Main is NOT open
    if (!isMainOpen) {
      set({
        isPopupOpen: true,
        popupContext: context,
        lastConversionShown: Date.now()
      });
    }
  },

  closePopup: () => {
    set({
      isPopupOpen: false,
      popupContext: undefined
    });
  },

  closeAll: () => {
    set({
      isMainOpen: false,
      mainContext: undefined,
      isPopupOpen: false,
      popupContext: undefined
    });
  },

  setLastConversionShown: (timestamp) => {
    set({ lastConversionShown: timestamp });
  },

  isConversionCooldownActive: () => {
    const { lastConversionShown } = get();
    const now = Date.now();
    const COOLDOWN_MS = 600000; // 10 minutes
    return (now - lastConversionShown) < COOLDOWN_MS;
  }
}));
