/**
 * PostHog Analytics Client (Browser/React)
 *
 * Uses posthog-js for proper browser support (SPA tracking, session replay, etc).
 * Replaces the node/edge client to fix build issues with 'path' module.
 */

import posthog from 'posthog-js';

function initializePosthog() {
  const apiKey = import.meta.env.VITE_POSTHOG_API_KEY as string | undefined;
  const apiHost = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || 'https://us.i.posthog.com';

  if (!apiKey) {
    console.warn('WARNING: PostHog not configured (VITE_POSTHOG_API_KEY not set)');
    return null;
  }

  // Initialize PostHog
  posthog.init(apiKey, {
    api_host: apiHost,
    person_profiles: 'identified_only', // Optimized for privacy/performance
    capture_pageview: false, // We handle pageviews manually in SPA if needed, or set to true for auto
    autocapture: true,
  });

  return posthog;
}

// Initialize immediately (side-effect)
const client = initializePosthog();

export { posthog };

/**
 * Capture a PostHog event.
 * @param distinctId - Optional distinct ID (ignored in JS client if user is identified, uses internal ID)
 * @param event - The event name
 * @param properties - Optional event properties
 */
export function trackEvent(
  distinctId: string, // Kept for compatibility with previous interface, but posthog-js handles ID internally
  event: string,
  properties: Record<string, unknown> = {}
): void {
  if (!client) return;
  
  // In posthog-js, we just call capture. The user ID is handled by identify().
  // If distinctId is provided and different from current, we might need to identify, 
  // but usually trackEvent is called after identify.
  posthog.capture(event, properties);
}

/**
 * Identify a user and set their properties.
 * @param distinctId - The user's unique identifier
 * @param properties - User properties to set
 */
export function identifyUser(
  distinctId: string,
  properties: Record<string, unknown> = {}
): void {
  if (!client) return;

  posthog.identify(distinctId, properties);
}

/**
 * Capture an exception / error event.
 * @param error - The error to capture
 * @param distinctId - Optional user distinct ID
 * @param additionalProperties - Optional additional properties
 */
export function captureException(
  error: unknown,
  distinctId?: string,
  additionalProperties?: Record<string, unknown>
): void {
  if (!client) return;
  
  // posthog-js doesn't have explicit captureException like node, 
  // but we can track an error event manually.
  console.error('[PostHog] Capturing exception:', error);
  
  posthog.capture('exception', {
    error: String(error),
    ...additionalProperties
  });
}
