# YDJ Launch Checklist — Go-Live June 1, 2026

**Today:** May 10, 2026 · **Launch:** June 1, 2026 · **Days remaining:** 22

This checklist is grounded in a fresh codebase audit (May 10). The core platform — entitlements, Stripe, Cloud Functions, security rules, reference docs — looks 85–90% ready. The remaining work is concentrated in **test coverage, monitoring, the pilot-to-paid cutover, and launch-day operational readiness**.

How to use it: work the buckets in order. Anything in the "This Week" bucket is on the critical path; slipping it cascades. Items marked **[BLOCKER]** must be done before flipping the live switch. Items marked **[VERIFIED ✓]** were confirmed by the audit and just need a final sanity check.

---

## Bucket 1 — This Week (May 10–16): Critical-Path Engineering & Pilot Comms

### Engineering & technical

- [ ] **[BLOCKER] Stripe live-mode swap.** Swap test keys for live keys in production env (`STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`). Re-run `scripts/configureBillingPortal.cjs --allow-live` to lock down the live billing portal. Confirm `/admin/stripeConfig.billingPortalConfigId` updates.
- [ ] **[BLOCKER] Create live-mode coupons in Stripe.** All seven coupon IDs from `functions/api/stripe.js` (`IC_WORKING_2026`, `IC_MEDIUM_2026`, `IC_EXTENDED_2026`, `PILOT_MONTHLY_10`, `TRIAL_FIRSTYEAR_10`, plus any annual/monthly variants) must exist in **live** mode with matching IDs.
- [ ] **[BLOCKER] Anthropic API key — production tier.** Confirm production-tier key with rate limits sized for projected weekly load (~10 calls/rider × N riders). Rotate from any pilot/dev key. Set `ANTHROPIC_API_KEY` in functions config.
- [ ] **Add React error boundaries.** Audit found no top-level `<ErrorBoundary>` wrapping the app. Wrap App root and each Insights tab. Wire to Sentry's `Sentry.ErrorBoundary` so crashes report cleanly instead of white-screening users at the barn.
- [ ] **Smoke-test critical-path unit tests.** No `*.test.js` files exist. Don't try to backfill full coverage — write **only** the high-leverage tests:
  - `entitlements.js` — pilot/grace/expired status transitions across the three boundary dates
  - `stripe.js` — `changeSubscriptionPlan` for `ic_upgrade` and `pilot_monthly_upgrade` flows (mocked Stripe)
  - `promptBuilder.js` — assert rider health is stripped from shared-audience prompts
- [ ] **Verify Firestore composite indexes are deployed live.** Any query that uses `where + orderBy` needs an index. Run a full app walkthrough in the live project and watch the console for index-required errors.
- [ ] **Confirm Cloud Functions cold-start budget.** Time the first call to each AI handler from a cold function. If GPT/Physical Guidance cold starts exceed ~10s, set `minInstances: 1` on the heaviest handlers.

### Pilot → paid migration

- [ ] **[BLOCKER] Pilot conversion email — Round 1 (sent ~May 11).** "Pilot ends May 15, here's what changes, here's your Founder discount." Personalized link to `/pricing` with IC banner. Track open/click rate.
- [ ] **Lock the IC cohort counter logic.** Audit confirmed `icCohort` is public-readable. Manually verify the live spots-remaining counter on `/pricing` updates as a test enrollment runs through. Cap = 100.
- [ ] **Decide and document IC enrollment cutoff handling.** What happens at 99 → 100 → 101 attempted enrollments? Race-condition handling matters because annual checkout can take 30+ seconds.

### AI pipeline & content

- [ ] **Founder review of every AI output type with real pilot data.** Generate one of each from a pilot account: Multi-Voice (×4), Journey Map, Data Visualizations, GPT L1, Physical Guidance, Event Planner, Self-Assessment Analysis. Read each end-to-end. Flag tone/accuracy issues to fix this week.
- [ ] **Verify Inter I → Inter II guardrail fires.** Create a test rider at Inter I with aggressive timeline goals and confirm the AI does NOT recommend passage/piaffe acceleration. This is the highest-stakes guardrail in the system.
- [ ] **Verify rider health stripping in shared outputs.** Generate a Weekly Coach Brief and Journey Map for a test rider with `riderHealthEntries` populated. Inspect raw AI input and output — health data must not appear.

---

## Bucket 2 — Next Week (May 17–23): Dress Rehearsal & Marketing Prep

### Engineering & technical

- [ ] **Set up basic CI.** A single GitHub Actions workflow on push to main: `npm run build` + run the smoke tests from Bucket 1. Don't over-engineer — one workflow, one job.
- [ ] **UptimeRobot pings.** Add monitors for: production frontend URL, Firebase Functions health endpoint, Stripe webhook endpoint. SMS alert to founder phone.
- [ ] **Sentry alert routing.** Confirm Sentry sends email on new errors. Set rate limit so a single bad deploy doesn't flood you. Add release tagging on deploy.
- [ ] **Firebase budget alerts.** Set Firestore reads/writes and Functions invocation budget alerts at 50%, 80%, 100% of monthly projection.
- [ ] **Anthropic spend alert.** Set a daily spend cap or alert in the Anthropic console — first 30 days of paid traffic is when surprise bills happen.
- [ ] **Mobile QA pass on iOS Safari.** CLAUDE.md flags Safari has caused data-persistence issues before. Walk every form on a real iPhone, every output on a real iPhone, the full pricing/checkout flow on a real iPhone. Don't skip the checkout test on Safari.
- [ ] **Voice input QA.** Test Web Speech API dictation on the three highest-use forms (Debrief, Reflection, Observation) on both iOS and Android.

### Pilot → paid migration

- [ ] **Pilot conversion email — Round 2 (sent ~May 19).** "3 days until grace period — your data stays read-only until July 7. Here's how to keep going." Include specific CTAs by tier with founder-rate pricing visible.
- [ ] **Founder availability calendar.** Block out office hours / direct support availability for May 24 → June 14 (the first two weeks of conversion + launch). Communicate this in conversion emails.
- [ ] **Test the pilot-grace state in the live app.** Manually flip a test user's `subscriptionTier` and date to land in `pilot-grace` and confirm: read access works, all create/generate buttons disabled with conversion CTA, no broken pages.

### Marketing, support & legal

- [ ] **[BLOCKER] Terms of Service finalized & published.** Subscription terms, refund policy, data retention, AI-generated content disclaimers. Lawyer review if not already done.
- [ ] **[BLOCKER] Privacy Policy finalized & published.** Cover Firestore data, Anthropic API data handling (no training, ephemeral), Sentry, GA4, Stripe data flow. GDPR/CCPA consideration if any non-US pilots.
- [ ] **[BLOCKER] Refund policy documented.** Annual subscriptions especially — what's the refund window? IC-cohort refunds and the lifetime-rate forfeit rule must be explicit.
- [ ] **Onboarding email sequence.** Welcome + first-step prompt + week-1 check-in + week-2 reflection prompt. Resend templates ready to fire on user creation.
- [ ] **Landing page copy review.** Hero, four coaching voices section, pricing, testimonials (from pilot if available), FAQ. Read it cold — does it explain *why* journaling alone is "expensive record-keeping"?
- [ ] **Pricing page final pass.** IC banner, spots-remaining counter, trial CTA, monthly/annual toggle, coupon visibility — all rendering correctly on mobile.
- [ ] **Support inbox triage plan.** Where do support emails go? What's the SLA? If founder is the only support person, define expected response time honestly ("within 24h on weekdays").
- [ ] **Tips & FAQ page review.** Add launch-week-specific FAQs: "What happens to my pilot data?", "Can I switch tiers?", "What's the IC cohort?", "How do refunds work?".

### AI pipeline & content

- [ ] **Cost projection sanity check.** Pull last 7 days of Anthropic API usage from pilot, multiply by projected June 1 user count, compare to monthly budget. If off by >2x, decide whether to throttle or accept.
- [ ] **Tier budget enforcement smoke test.** Force an Extended-tier user to exceed token budget mid-month — does the system gracefully decline regen with an explanatory message?

---

## Bucket 3 — Launch Week (May 24–31): Lockdown & Final QA

### Engineering & technical

- [ ] **[BLOCKER] Code freeze May 27.** No new features after this date. Bug fixes only. Anything not done by May 27 ships post-launch.
- [ ] **[BLOCKER] Full end-to-end live-mode dry run.** Create a brand-new user from scratch in the live project: signup → onboarding → enter rider/horse profile → 5 debriefs → trigger an AI generation → upgrade to Working tier → test the IC upgrade flow → cancel subscription → verify pilot-grace fallback. Document every issue, fix or defer.
- [ ] **[BLOCKER] Stripe webhook delivery test.** Trigger every webhook event type (subscription.created/updated/deleted, invoice.payment_succeeded/failed) from Stripe dashboard against production endpoint. Confirm Firestore user document updates correctly each time.
- [ ] **[BLOCKER] Backup the pilot Firestore database.** Export to GCS bucket. This is your pre-launch snapshot if anything goes sideways.
- [ ] **Rate-limit and abuse protection.** Confirm Firebase Auth has reCAPTCHA Enterprise on signup, password reset is rate-limited, and Cloud Functions have per-user quotas to prevent runaway costs.
- [ ] **DNS & SSL verification.** Custom domain points to Firebase Hosting, SSL cert valid and not expiring within 60 days, www and apex both resolve.
- [ ] **Performance budget check.** Lighthouse score on key pages — Home, Pricing, Dashboard, Insights — should be ≥85 on mobile.

### Pilot → paid migration

- [ ] **Pilot conversion email — Round 3 (sent May 26).** "Last call — pilot ends in 5 days. After May 15 you're read-only; after July 7 you're locked out unless you convert."
- [ ] **Pilot-to-paid conversion dashboard.** Spreadsheet or simple admin view: who converted, who's in grace, who hasn't engaged. Update daily through June 14.

### Marketing, support & legal

- [ ] **[BLOCKER] Public launch announcement drafted.** Email to mailing list (pilots + waitlist + personal network), social posts (LinkedIn, FB groups, dressage forums), founder blog post if applicable.
- [ ] **Press list / influencer outreach (if any).** Dressage publications, podcast hosts, prominent USDF figures who beta-tested. Personal email, not press release.
- [ ] **Customer support runbook.** Top 10 expected support questions with canned-but-personalized response templates. Refund flow documented step-by-step. Account deletion flow documented.
- [ ] **Legal: confirm no IP issues with launch copy.** "Your Dressage Journey" and "Your Training Journey" trademarks filed — confirm no conflicting use in launch materials.

### AI pipeline & content

- [ ] **Final pass on `YDJ_Core_Dressage_Principles.md`.** This is the living document the AI references at runtime. Anything Barb wants to be authoritative on day 1 needs to be in this file.
- [ ] **Verify all guardrail docs are loaded in the API context.** Trace one production API call end-to-end and confirm the system prompt includes Core Dressage Principles + Level Progression + Freestyle guardrails.

---

## Bucket 4 — Launch Day (June 1)

- [ ] **Morning (founder time): final smoke test on production.** Same flow as the dry run, abbreviated.
- [ ] **Send launch announcement email** at chosen send time (suggest mid-morning founder time zone).
- [ ] **Post to social channels.**
- [ ] **Pin a "We're live!" message in any community channels** (FB groups, Discord, etc.) where allowed.
- [ ] **Watch dashboards live for the first 4 hours:**
  - Sentry — any error spikes?
  - Stripe — successful checkouts? Webhook deliveries?
  - Firebase Functions — invocation rate, error rate?
  - Anthropic console — token spend?
  - UptimeRobot — all green?
- [ ] **Be at the keyboard for support.** Don't schedule meetings. Don't go to the barn. (Sorry.)
- [ ] **End-of-day status note:** signup count, conversion count, IC cohort count, any outstanding incidents. Write it up even if just for yourself.

---

## Bucket 5 — Post-Launch Week 1 (June 2–8)

- [ ] **Daily: signup → first-debrief funnel check.** If users sign up and never enter data, the onboarding flow needs work. Triage Day 1.
- [ ] **Daily: conversion-to-paid check** for pilot users still in grace.
- [ ] **Reply to every support email within 24h** — reputation-defining window.
- [ ] **First "weekly batch" AI generation should fire successfully** for cohort of new paid users by ~June 8. Monitor for errors and cost.
- [ ] **Founder: write down every friction point you observe** in a single doc. Don't fix them yet — collect them, prioritize next week.
- [ ] **Snapshot week-1 metrics:** signups, conversions, IC enrollments, AI generation count, total spend, NPS-style feedback if collected.

---

## Standing Reminders

- **Mobile-first, Safari-tested.** Every fix gets QA'd on iOS Safari before merging.
- **Pilot data is sacred.** Any migration or schema change touching pilot user docs gets a Firestore export first.
- **Cost discipline.** Pre-process aggressively, cache aggressively, Sonnet-by-default. Watch the Anthropic dashboard daily for the first month.
- **Voice consistency.** When publishing AI output examples in marketing, use the four voices' actual catchphrases ("Why not the first time?", "You've got this", "Did you feel that?", "Be accurate!") — they're the brand.

---

## Audit-Confirmed Strengths (Don't Re-Litigate)

These were verified as solid in the May 10 codebase audit — sanity-check at code freeze but don't rebuild:
- Entitlements logic (`src/constants/entitlements.js` ↔ `functions/lib/entitlements.js` synchronized, pilot dates correct)
- Stripe handler with all flows (standard, IC, pilot_monthly, trial, ic_upgrade, pilot_monthly_upgrade)
- Cloud Function handlers for all 7 outputs + cycle-state architecture
- Firestore security rules (auth-scoped, production-ready)
- All 4 reference doc categories present (voice prompts, principles, level progression, freestyle, prompt additions)
- Frontend pages: Pricing, Insights (5 tabs), Dashboard, subscription success/cancel
- Sentry + GA4 wired
- `.env.example` files comprehensive
