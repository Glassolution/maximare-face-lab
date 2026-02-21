import { toast } from "sonner";

/**
 * Opens the checkout URL handling different environments (Web vs Mobile)
 * @param url The payment URL to open
 * @param plan The plan identifier for analytics
 * @returns boolean indicating if the action was initiated successfully
 */
export const openCheckout = (url: string, plan: string): boolean => {
  try {
    // Analytics logging
    console.log(`[Checkout] Opening link for plan: ${plan}`);

    // Detect if running in a React Native WebView context (common pattern)
    const isReactNative = 
      typeof window !== 'undefined' && 
      // @ts-ignore
      (window.ReactNativeWebView || window.ReactNative);

    if (isReactNative) {
      // If we were in a RN WebView, we might want to post a message
      // or just use window.location if the native app intercepts it
      window.location.href = url;
    } else {
      // Standard Web behavior
      const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
      
      if (newWindow) {
        newWindow.opener = null;
      } else {
        // Fallback for pop-up blockers: navigate in same tab
        window.location.href = url;
      }
    }

    return true;
  } catch (error) {
    console.error("Error opening checkout:", error);
    toast.error("Não foi possível abrir o pagamento. Tente novamente.");
    return false;
  }
};
