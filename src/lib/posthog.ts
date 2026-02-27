/**
 * PostHog Analytics Client
 *
 * Singleton PostHog Node.js client for server-side analytics tracking.
 * Uses environment variables for configuration — never hardcode keys.
 */

import { PostHog } from 'posthog-node';

function initializePosthog(): PostHog | null {
  const apiKey = import.meta.env.VITE_POSTHOG_API_KEY;

  if (!apiKey) {
    console.warn('WARNING: PostHog not configured (VITE_POSTHOG_API_KEY not set)');
    console.warn('         App will work but analytics will not be tracked');
    return null;
  }

  const client = new PostHog(apiKey, {
    host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
    enableExceptionAutocapture: true,
    // In a browser-like long-running context, batch events automatically.
    // For short-lived server processes you would set flushAt: 1, flushInterval: 0.
  });

  return client;
}

export const posthog = initializePosthog();

/**
 * Capture a PostHog event.
 * @param distinctId - The user's unique identifier (Supabase user ID or 'anonymous')
 * @param event - The event name
 * @param properties - Optional event properties
 */
export function trackEvent(
  distinctId: string,
  event: string,
  properties: Record<string, unknown> = {}
): void {
  if (!posthog) return;

  posthog.capture({
    distinctId,
    event,
    properties,
  });
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
  if (!posthog) return;

  posthog.identify({
    distinctId,
    properties,
  });
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
  if (!posthog) return;

  posthog.captureException(error, distinctId, additionalProperties);
}
