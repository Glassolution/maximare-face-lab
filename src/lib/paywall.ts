import { supabase } from "@/integrations/supabase/client";
import { PLAN_CONFIG } from "@/config/plans";
import { toast } from "sonner";

// Extend Window interface for debug mode
declare global {
  interface Window {
    ENABLE_PAYWALL_DEBUG?: boolean;
  }
}

export type PaywallTrigger = 'feature_locked' | 'manual' | 'analysis_completed' | 'app_open' | 'report_view' | 'periodic_force';

export interface PaywallContext {
  trigger: PaywallTrigger;
  featureName?: string;
  variant?: 'modal' | 'screen';
}

// Session tracking using sessionStorage to persist across page reloads in the same session
const SESSION_KEY = 'maximare_session_paywall_shown';

function getSessionPaywallShown(): boolean {
  return sessionStorage.getItem(SESSION_KEY) === 'true';
}

function setSessionPaywallShown(value: boolean) {
  sessionStorage.setItem(SESSION_KEY, String(value));
}

export async function shouldShowPaywall(context: PaywallContext): Promise<boolean> {
  // Debug mode override
  if (window.ENABLE_PAYWALL_DEBUG) {
    console.log('[Paywall] Debug mode enabled: Showing paywall');
    return true;
  }

  if (!PLAN_CONFIG.ENABLE_PAYWALL) return false;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return false;

  // Fetch profile with all paywall fields
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('subscription_status, subscription_expires_at, last_paywall_shown_at, paywall_show_count_7d, last_paywall_dismissed_at, paywall_dismiss_count_7d')
    .eq('id', session.user.id)
    .single();

  if (error || !profile) {
    console.error('Error fetching profile for paywall check:', error);
    return false;
  }

  // 1. Check if user is actively premium
  const isPremium = 
    profile.subscription_status === 'premium_active' && 
    profile.subscription_expires_at && 
    new Date(profile.subscription_expires_at) > new Date();

  if (isPremium) {
    console.log('User is premium, not showing paywall');
    return false;
  }

  // 2. Hard Gates (always show)
  if (context.trigger === 'feature_locked' || context.trigger === 'manual' || context.trigger === 'periodic_force') {
    return true;
  }

  // 3. Soft Gates (Anti-spam rules)
  
  // Rule: Not twice in the same session
  if (getSessionPaywallShown()) {
    console.log('[Paywall] Skipped: Already shown in this session');
    return false;
  }

  const now = new Date();
  const lastShown = profile.last_paywall_shown_at ? new Date(profile.last_paywall_shown_at) : new Date(0);
  const hoursSinceLastShow = (now.getTime() - lastShown.getTime()) / (1000 * 60 * 60);

  // Rule: Max 1 per day (24h cooldown for any soft gate)
  if (hoursSinceLastShow < 24) {
     console.log('[Paywall] Skipped: Daily limit reached');
     return false;
  }

  // Rule: Cooldown 72h (standard soft gate cooldown)
  // We can make this configurable per trigger if needed, but 72h is requested as standard
  if (hoursSinceLastShow < PLAN_CONFIG.PAYWALL_COOLDOWN_HOURS) {
    console.log('[Paywall] Skipped: Standard 72h cooldown active');
    return false;
  }

  // Rule: Max 2 times per week
  // We check paywall_show_count_7d. If we reset it weekly, or just check a rolling window?
  // The DB field paywall_show_count_7d is intended to be maintained. 
  // For simplicity, let's assume it's updated correctly or we reset it if last_shown > 7 days ago.
  // Actually, we need to handle the reset logic in the record function or here.
  // Let's check if the count is high.
  if (profile.paywall_show_count_7d >= 2) {
      // Check if the count is stale (older than 7 days)
      const daysSinceLastShow = hoursSinceLastShow / 24;
      if (daysSinceLastShow < 7) {
          console.log('[Paywall] Skipped: Weekly limit (2) reached');
          return false;
      }
  }

  // Rule: Backoff (3 dismissals in 7 days -> 7 days cooldown)
  if (profile.paywall_dismiss_count_7d >= 3) {
      const lastDismissed = profile.last_paywall_dismissed_at ? new Date(profile.last_paywall_dismissed_at) : new Date(0);
      const daysSinceDismiss = (now.getTime() - lastDismissed.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceDismiss < 7) {
          console.log('[Paywall] Skipped: High dismiss count backoff (7 days)');
          return false;
      }
  }

  return true;
}

export async function logPaywallEvent(userId: string, eventType: string, context: object = {}) {
  try {
    await supabase.from('paywall_events').insert({
      user_id: userId,
      event_type: eventType,
      context: context
    });
  } catch (err) {
    console.error('Failed to log paywall event', err);
  }
}

export async function recordPaywallShow(userId: string, context?: PaywallContext) {
  const now = new Date();
  setSessionPaywallShown(true);

  // We need to fetch current count to increment or reset
   const { data: profile } = await supabase
    .from('profiles')
    .select('paywall_show_count_7d, last_paywall_shown_at')
    .eq('id', userId)
    .single();
    
  if (!profile) return;

  const lastShown = profile.last_paywall_shown_at ? new Date(profile.last_paywall_shown_at) : new Date(0);
  const daysSinceLast = (now.getTime() - lastShown.getTime()) / (1000 * 60 * 60 * 24);

  let newCount = (profile.paywall_show_count_7d || 0) + 1;
  // Reset count if it's been more than 7 days since last show (simple rolling window approximation)
  if (daysSinceLast > 7) {
      newCount = 1;
  }

  await supabase
    .from('profiles')
    .update({
      last_paywall_shown_at: now.toISOString(),
      paywall_show_count_7d: newCount
    })
    .eq('id', userId);

  // Log analytics event
  await logPaywallEvent(userId, 'paywall_shown', context);
  console.log('[Analytics] paywall_shown', { userId, timestamp: now });
}

export async function recordPaywallDismiss(userId: string, context?: PaywallContext) {
  const now = new Date();

   const { data: profile } = await supabase
    .from('profiles')
    .select('paywall_dismiss_count_7d, last_paywall_dismissed_at')
    .eq('id', userId)
    .single();
    
  if (!profile) return;

  const lastDismissed = profile.last_paywall_dismissed_at ? new Date(profile.last_paywall_dismissed_at) : new Date(0);
  const daysSinceLast = (now.getTime() - lastDismissed.getTime()) / (1000 * 60 * 60 * 24);

  let newCount = (profile.paywall_dismiss_count_7d || 0) + 1;
  if (daysSinceLast > 7) {
      newCount = 1;
  }

  await supabase
    .from('profiles')
    .update({
      last_paywall_dismissed_at: now.toISOString(),
      paywall_dismiss_count_7d: newCount
    })
    .eq('id', userId);

  await logPaywallEvent(userId, 'paywall_dismissed', context);
  console.log('[Analytics] paywall_dismissed', { userId, timestamp: now });
}
