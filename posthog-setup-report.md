<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the MAXIMARE Face Lab project. A new singleton client module (`src/lib/posthog.ts`) was created using the edge-compatible `posthog-node` build, which works correctly in both the Vite/React browser environment and any future edge/server-side code. All credentials are loaded from environment variables — the API key and host are stored in `.env` as `VITE_POSTHOG_API_KEY` and `VITE_POSTHOG_HOST`. Twelve events were instrumented across six files covering the full user lifecycle: authentication, core product usage (face analysis), and monetisation (checkout and payment).

| Event | Description | File |
|---|---|---|
| `user_signed_up` | Fired when a user successfully creates a new account | `src/hooks/useAuth.tsx` |
| `user_logged_in` | Fired when a user successfully signs in | `src/hooks/useAuth.tsx` |
| `user_logged_out` | Fired when a user signs out | `src/hooks/useAuth.tsx` |
| `face_analysis_started` | Fired when user submits photos for AI processing | `src/pages/Analysis.tsx` |
| `face_analysis_completed` | Fired when analysis succeeds with a GER score | `src/pages/Analysis.tsx` |
| `face_analysis_failed` | Fired when analysis fails (error or invalid image) | `src/pages/Analysis.tsx` |
| `checkout_started` | Fired when user begins the premium checkout flow | `src/components/PremiumContent.tsx` |
| `payment_completed` | Fired when a card or PIX payment is approved | `src/components/CheckoutPremium.tsx` |
| `payment_failed` | Fired when a payment is rejected or processing fails | `src/components/CheckoutPremium.tsx` |
| `onboarding_completed` | Fired when user finishes the onboarding quiz | `src/pages/Onboarding.tsx` |
| `battle_created` | Fired when a user creates a new battle challenge | `src/pages/Battles.tsx` |
| `battle_accepted` | Fired when a user accepts a battle challenge | `src/pages/Battles.tsx` |

`identifyUser()` is called on sign-up and sign-in to associate Supabase user IDs with PostHog person profiles. `captureException()` is called in the face analysis error handler and both payment error handlers for automatic error tracking.

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- 📊 **Dashboard — Analytics basics:** https://us.posthog.com/project/325651/dashboard/1314328
- 📈 **Sign Ups & Logins (Daily):** https://us.posthog.com/project/325651/insights/8rcQucVA
- 🔁 **Conversion Funnel: Sign Up → Analysis → Payment:** https://us.posthog.com/project/325651/insights/UUnSKfiN
- 🧠 **Face Analysis: Started vs Completed vs Failed:** https://us.posthog.com/project/325651/insights/EpsRhvFr
- 💳 **Payment Completed vs Failed:** https://us.posthog.com/project/325651/insights/fH9qKSIn
- 🚪 **User Churn: Logged Out (Daily):** https://us.posthog.com/project/325651/insights/NlB8M6wk

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/posthog-integration-javascript_node/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
