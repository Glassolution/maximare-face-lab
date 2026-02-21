
import { supabase } from "@/integrations/supabase/client";
import { PLAN_CONFIG } from "@/config/plans";

interface PaywallContext {
  trigger: 'feature_locked' | 'manual' | 'periodic';
  featureName?: string;
}

export async function shouldShowPaywall(context: PaywallContext): Promise<boolean> {
  if (!PLAN_CONFIG.ENABLE_PAYWALL) return false;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false; // Or true if you want to force login? Usually false for paywall, login first.

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('premium_status, last_paywall_shown_at, paywall_show_count_7d')
    .eq('id', user.id)
    .single();

  if (!profile) return false;

  // If already premium, don't show
  if (profile.premium_status === 'premium') return false;

  // Always show if manually triggered or feature locked
  if (context.trigger === 'feature_locked' || context.trigger === 'manual') {
    await recordPaywallView(user.id, profile.paywall_show_count_7d);
    return true;
  }

  // Periodic check logic
  if (context.trigger === 'periodic') {
    const now = new Date();
    const lastShown = profile.last_paywall_shown_at ? new Date(profile.last_paywall_shown_at) : new Date(0);
    const hoursSinceLast = (now.getTime() - lastShown.getTime()) / (1000 * 60 * 60);

    // Check cooldown (e.g. 24h)
    if (hoursSinceLast < 24) return false;

    // Check backoff (if shown too many times recently)
    if (profile.paywall_show_count_7d >= PLAN_CONFIG.BACKOFF_AFTER_DISMISS) {
      const daysSinceLast = hoursSinceLast / 24;
      if (daysSinceLast < PLAN_CONFIG.BACKOFF_COOLDOWN_DAYS) return false;
    }

    await recordPaywallView(user.id, profile.paywall_show_count_7d);
    return true;
  }

  return false;
}

async function recordPaywallView(userId: string, currentCount: number) {
  const now = new Date().toISOString();
  // Reset count if > 7 days (simplified logic, ideally we'd track window)
  // For now, just increment
  await supabase
    .from('profiles')
    .update({
      last_paywall_shown_at: now,
      paywall_show_count_7d: currentCount + 1
    })
    .eq('id', userId);
}
