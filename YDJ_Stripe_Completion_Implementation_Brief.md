# YDJ Stripe Completion — Implementation Brief

*Version 1.0 — May 11, 2026*
*Status: Ready to execute. Target go-live: June 1, 2026 (T-21 days).*

---

## 1. Purpose

Gating and token-budget enforcement are done. This brief catalogs the remaining work to get Stripe from "partially implemented" to **100% ready to accept live payments**, organized into:

- **Code work** — gaps in the existing handlers that still need shipping
- **Stripe Dashboard configuration** — products, prices, coupons, webhooks, tax, branding
- **Production cutover** — secrets, scripts, seeds, pilot flagging
- **Verification** — tests, smoke flows, monitoring

Nothing here is a blank-page rewrite. The 1,007-line `functions/api/stripe.js`, the Pricing page, the entitlements layer, and the supporting scripts (`configureBillingPortal.cjs`, `seedICCohort.cjs`, `flagPilots.cjs`) are solid. This is a finishing-pass brief.

---

## 2. Current State Audit (May 11, 2026)

### What is already shipped

| Area | Where | Status |
|---|---|---|
| Checkout session creation (4 flows: standard, trial, ic, pilot_monthly) | `functions/api/stripe.js` `createCheckoutSession` | Implemented |
| In-place plan change (ic_upgrade, pilot_monthly_upgrade) | `changeSubscriptionPlan` | Implemented |
| Billing Portal session creation w/ locked config | `createPortalSession` | Implemented |
| Pricing eligibility (auth + anonymous) | `getPricingEligibility` | Implemented |
| Webhook dispatcher (5 events) | `handleWebhook` + handlers | Implemented |
| IC cohort atomic claim transaction | `claimICCohortSpot` | Implemented |
| Coupon ID + tier × interval lookup-key catalog | `COUPON_IDS`, `parseLookupKey` | Implemented |
| Pilot lifecycle status derivation | `functions/lib/entitlements.js` + `src/constants/entitlements.js` | Implemented and mirrored |
| Pricing page UI (all flows, IC banner, spots counter, upgrade modal) | `src/pages/Pricing.jsx` | Implemented |
| Success / Cancel pages | `src/pages/SubscriptionSuccess.jsx`, `SubscriptionCancel.jsx` | Implemented |
| Subscription card on Settings page | `src/components/Settings/AccountSection.jsx` | Implemented |
| Firestore rules: public read `/admin/icCohort`, locked writes | `firestore.rules` (lines 233-238) | Implemented |
| Cloud Function exports + secret declarations | `functions/index.js` (lines 352-394) | Implemented |
| Portal lockdown script (disables `subscription_update`) | `scripts/configureBillingPortal.cjs` | Implemented (test-mode validated) |
| IC cohort seed script | `scripts/seedICCohort.cjs` | Implemented |
| Pilot flagging script | `scripts/flagPilots.cjs` | Implemented |
| `.env.example` covers `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` | `functions/.env.example` lines 75-80 | Implemented |

### What is missing or incomplete

| Gap | Severity | Notes |
|---|---|---|
| **G1.** 14-day past-due → IC/pilot lapse scheduled job | Blocker | `onPaymentFailed` comment at `stripe.js:971` admits this is unimplemented; spec Part 4 row "Lapse" requires it |
| **G2.** Webhook event idempotency (Stripe re-delivers on 5xx) | Blocker | No `event.id` dedupe → re-deliveries could re-claim IC spots, double-reset counters, double-send emails |
| **G3.** Trial → early IC conversion path | High | Spec Part 5: "trialing user can convert early to IC during the IC window." `computeEligibility` blocks IC if user is `isAlreadyIC`, but never lets a trial user *become* IC before day 31 |
| **G4.** Mid-checkout IC sold-out fallback | High | Today: `createCheckoutSession` throws `failed-precondition` if cohort fills mid-flow. Spec Part 4: should gracefully fall back to standard rate |
| **G5.** Critical-path Jest tests (`stripe.test.js`, `entitlements.test.js`) | Blocker | Launch Checklist Bucket 1 calls these out; no `*.test.js` files exist |
| **G6.** Stripe webhook URL not stable / not branded | Medium | No Hosting rewrite for the webhook; relies on `cloudfunctions.net` default URL. Works, but rebrand later means re-registering in Stripe |
| **G7.** Customer email sync on user-email-change | Medium | Customer email set once at create; no sync if user changes email later |
| **G8.** Pricing page footer doesn't link to Terms / Privacy / Refund | Blocker | Launch Checklist Bucket 2 BLOCKER. The three docs themselves must also be published |
| **G9.** Webhook delivery monitoring (UptimeRobot + Sentry alerts) | High | Launch Checklist Bucket 2; no current alert on webhook 5xx |
| **G10.** Stripe Dashboard — live-mode Products/Prices/Coupons not created | Blocker | Lookup keys, coupon IDs, and exact USD amounts must match `stripe.js` and `subscriptionService.js` exactly |
| **G11.** Stripe Dashboard — live webhook endpoint not registered | Blocker | And `STRIPE_WEBHOOK_SECRET` not set against the live secret |
| **G12.** Stripe Tax decision + configuration | Blocker | Sales-tax handling for digital subscriptions must be either configured (Stripe Tax on) or explicitly waived in writing |
| **G13.** Live-mode portal lockdown not yet run | Blocker | `configureBillingPortal.cjs --commit --allow-live` deferred until live keys are in place |
| **G14.** End-to-end live-mode dry run | Blocker | Launch Checklist Bucket 3 BLOCKER |
| **G15.** Receipt / lifecycle emails (Resend) not wired | High | Receipt emails Stripe-native (verify), but pilot conversion blast, IC welcome, trial reminders, IC-closing announcements are not yet implemented |
| **G16.** Token budget calibration for Medium / Extended | Medium | Spec §3; uses `.env`-driven defaults today. Non-blocking for first payment, blocking before broad GA |

---

## 3. Workstream Plan

Work is organized into four sequential workstreams. **WS1 (code completions) and WS2 (Dashboard config) run in parallel**; WS3 (cutover) blocks on both; WS4 (verification) blocks on WS3.

### Workstream 1 — Code completions (engineering)

Owner: engineer (Barb + Claude-assisted). Estimated 3-4 working days.

**1.1 Webhook idempotency (G2)** — first because every other webhook change inherits this guard.

In `handleWebhook`, before the `switch (event.type)` block, dedupe on `event.id`:

```js
const eventRef = db.doc(`admin/stripeWebhookEvents/${event.id}`);
const existing = await eventRef.get();
if (existing.exists) {
  console.log(`Duplicate webhook event ${event.id} (${event.type}) — skipping`);
  res.status(200).json({ received: true, duplicate: true });
  return;
}
await eventRef.set({
  type: event.type,
  receivedAt: new Date().toISOString(),
  livemode: event.livemode,
});
```

Add a Firestore TTL policy on the `stripeWebhookEvents` collection (30 days) so it doesn't grow unbounded. Update `firestore.rules` to lock writes to admin SDK only.

**1.2 14-day past-due lapse job (G1)** — new file `functions/api/stripeLapseSweep.js`.

```js
// Daily at 04:00 UTC. For every user with subscriptionStatus === 'past_due'
// for ≥14 days, lapse IC (icStatus → "lapsed", icLapseReason: "payment_failure_14d")
// and pilotDiscountActive → false. Do NOT remove the Stripe coupon at this
// stage (Stripe will cancel the sub on its own dunning timer); only update
// our Firestore flags so future regen / upgrade decisions are correct.
```

Wire as `onSchedule("every day 04:00")` in `functions/index.js`. The sweep query is `users.where('subscriptionStatus', 'in', ['past_due', 'unpaid'])` — small enough for a single pass at our scale.

**1.3 Trial → early IC conversion (G3)** — new flow in `changeSubscriptionPlan`.

Add `flow: "trial_to_ic"`:
- Require active trial (`subscriptionStatus === 'trialing'`, `trialStarted === true`).
- Require IC cohort still open and spots remaining.
- Require target `lookupKey` is annual.
- End trial early via `stripe.subscriptions.update(id, { trial_end: 'now', items: [{ id, price: newPriceId }], discounts: [{ coupon: IC_TIER_COUPONS[tier] }], proration_behavior: 'create_prorations' })`.
- Atomically claim IC cohort spot in the resulting `customer.subscription.updated` webhook (the updated handler already needs to recognize an IC coupon appearing where one wasn't before — extend the existing IC continuity block).
- On Pricing page: when `subscription.status === 'trialing'` AND `cohort.isOpen`, show a "Lock in Founder rate now" CTA on the annual tier cards that calls `changeSubscriptionPlan('medium_annual', 'trial_to_ic')` (or whichever tier the user picks).

**1.4 Mid-checkout IC sold-out fallback (G4)** — in `createCheckoutSession`:

When `flow === "ic"` and `discount.couponId` resolves to `null` because of `cohort_full` or `window_closed`:
- Option A (recommended per spec language): proceed with standard pricing, return `{ url, fellBackToStandard: true, reason: "cohort_full" }`.
- Option B: throw `failed-precondition` (today's behavior) and let the UI re-render with a banner.

Decision: **Option A**. The Pricing page already shows the IC banner; on success page, show "Founder pricing sold out — you're on standard pricing. Your account is still locked in for life at this rate."

**1.5 Customer email sync (G7)** — small enhancement.

In `AccountSection.jsx` and in any email-change flow (Auth `updateEmail`), trigger a new callable `syncStripeCustomerEmail` that calls `stripe.customers.update(customerId, { email: newEmail })`. Low priority but cleaner.

**1.6 Webhook URL rewrite (G6)** — in `firebase.json` add:

```json
{ "source": "/api/stripe/webhook", "function": "stripeWebhook" }
```

This gives Stripe a stable branded URL: `https://your-dressage-journey.web.app/api/stripe/webhook`. Register that in the Stripe Dashboard instead of the raw `cloudfunctions.net` URL. Reduces re-registration risk if we ever change Firebase regions.

**1.7 Critical-path tests (G5)** — new dir `functions/__tests__/`.

`stripe.test.js` should cover:
- `parseLookupKey` returns correct tier/interval; rejects garbage
- `isWithinICWindow` / `isWithinICUpgradeWindow` boundary cases (the exact-millisecond edges)
- `resolveAutomaticDiscount` for each `flow` × eligibility combination (incl. trial-mode override, IC blocked on monthly, pilot-monthly blocked on annual)
- `claimICCohortSpot` succeeds at count=99→100 and fails at count=100→101 (mock Firestore transaction)
- Webhook idempotency: same `event.id` arriving twice writes Firestore once
- `onSubscriptionCreated` w/ IC coupon — atomic claim path
- `onSubscriptionUpdated` — downgrade triggers IC lapse; in-window upgrade with IC coupon updates `icTier` only

`entitlements.test.js`:
- `getTierStatus` on the three pilot boundary dates: 2026-05-15T23:59:59Z (PILOT), 2026-05-16T00:00:00Z (PILOT_GRACE), 2026-07-08T00:00:00Z (PILOT_EXPIRED)
- `canAccess` denies `generate*` during `pilot-grace`, allows `view*`
- `canAccess` denies everything during `paid-canceled`

Wire via `npm test` in `functions/package.json`. Use `jest` + `firebase-functions-test`.

**1.8 Pricing page footer links (G8 — UX half)** — add `<Link>` to `/terms`, `/privacy`, and a new `/refund-policy` route. The legal copy itself is WS3 / outside engineering.

### Workstream 2 — Stripe Dashboard configuration (Stripe admin)

Owner: founder (Barb), with Claude pairing for verification. Estimated 1 working day (excluding Stripe Tax onboarding).

**2.1 Live-mode account onboarding**
- Confirm Stripe account is fully activated (bank account verified, tax IDs entered, business profile complete).
- Statement descriptor: e.g. `YDJ COACHING` (max 22 chars, no special chars).
- Logo + brand colors uploaded under Settings → Branding (used by Checkout + Customer Portal).

**2.2 Products & Prices (live mode)** — exact match required for `parseLookupKey`:

| Product name | Price | Interval | `lookup_key` |
|---|---|---|---|
| YDJ — Working | $30.00 | monthly | `working_monthly` |
| YDJ — Working | $300.00 | yearly | `working_annual` |
| YDJ — Medium | $50.00 | monthly | `medium_monthly` |
| YDJ — Medium | $500.00 | yearly | `medium_annual` |
| YDJ — Extended | $130.00 | monthly | `extended_monthly` |
| YDJ — Extended | $1,300.00 | yearly | `extended_annual` |

Set `metadata.tier` on each Price as a defense-in-depth fallback for `resolveTierFromSubscription` (already coded).

**2.3 Coupons (live mode)** — exact ID match required:

| Coupon ID | Amount | Duration | Notes |
|---|---|---|---|
| `IC_WORKING_2026` | $35 off | forever | Server-side restricts to annual Working |
| `IC_MEDIUM_2026` | $75 off | forever | Server-side restricts to annual Medium |
| `IC_EXTENDED_2026` | $150 off | forever | Server-side restricts to annual Extended |
| `TRIAL_FIRSTYEAR_10` | 10% off | repeating, 12 months | First-year discount on trial conversion |
| `PILOT_MONTHLY_10` | 10% off | forever | Server-side restricts to monthly |

Mark all five as **internal-only** (not customer-facing); we never expose codes to users.

**2.4 Webhook endpoint registration**
- Endpoint URL: `https://your-dressage-journey.web.app/api/stripe/webhook` (after WS1.6 ships) or the raw Cloud Function URL.
- Events to listen for (exactly five):
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
- Copy the signing secret — you'll set it as `STRIPE_WEBHOOK_SECRET` in WS3.

**2.5 Stripe Tax (decision required)**
- Recommendation: enable Stripe Tax. US-only at launch (Pricing Consolidation Part 12); subscriptions are taxable in some US states (e.g. New York, Pennsylvania, Washington for SaaS).
- If enabled: complete the Stripe Tax onboarding (nexus declarations, tax registration numbers per state). Update Checkout sessions to `automatic_tax: { enabled: true }` and Customer to `tax: { ip_address: 'auto' }` (a small `stripe.js` change in `createCheckoutSession`).
- If deferred: document the decision in `YDJ_Pricing_Discounts_Consolidation_v2.md` and revisit before international expansion.

**2.6 Receipt emails**
- Settings → Emails → enable "Successful payments" and "Subscription updates".
- Confirm sender domain matches business email; verify SPF/DKIM if using a custom domain.

**2.7 Radar (fraud prevention)**
- Enable default Radar rules.
- Add rule: block charges where `card.country` differs from `customer.country` by >2 (low signal for digital subscriptions, but cheap insurance).
- Set `Radar for Fraud Teams` to *Off* (paid add-on, not needed at this scale).

**2.8 Customer Portal default config**
- Note: Stripe still keeps the *default* configuration alongside our locked-down one. The `createPortalSession` always passes our config ID, so the default doesn't matter — but as belt-and-braces, disable `subscription_update` on the default config too via Settings → Customer Portal.

### Workstream 3 — Production cutover

Owner: founder. Estimated 0.5 working days. **Run in this order.**

**3.1 Set live secrets**
```bash
firebase functions:secrets:set STRIPE_SECRET_KEY    # paste sk_live_...
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET # paste whsec_... from WS2.4
firebase deploy --only functions:createCheckoutSession,createPortalSession,changeSubscriptionPlan,stripeWebhook,getPricingEligibility,stripeLapseSweep
```
Verify with `firebase functions:secrets:access STRIPE_SECRET_KEY` that the value parses as `sk_live_...`.

**3.2 Run live-mode portal lockdown**
```bash
cd scripts
node configureBillingPortal.cjs --commit --allow-live
```
Expected output: created new config, stored ID at `/admin/stripeConfig.billingPortalConfigId`. Verify in Stripe Dashboard that the new config shows `subscription_update.enabled = false`.

**3.3 Seed live IC cohort counter**
```bash
node seedICCohort.cjs
```
Idempotent — safe to re-run. Verify `/admin/icCohort` shows `enrollmentCount: 0`, `enrollmentCap: 100`, `windowCloseDate: "2026-07-08T00:00:00.000Z"`.

**3.4 Flag live pilot users**
- Confirm the UID list in `scripts/flagPilots.cjs` matches the pilot roster.
- Run `node flagPilots.cjs --commit` against the live project.
- Spot-check 3 random pilot user docs in Firestore for `isPilot: true`.

**3.5 Anthropic API key — production tier**
- Already on the Launch Checklist (Bucket 1). Set `ANTHROPIC_API_KEY` via `firebase functions:secrets:set` to the production key with rate limits sized for projected load. Not strictly Stripe, but blocks paid users from seeing AI failures on Day 1.

**3.6 Publish legal docs**
- Terms of Service, Privacy Policy, Refund Policy: lawyer-reviewed copy at `/terms`, `/privacy`, `/refund-policy` (already routed in `firebase.json` for `/terms` and `/privacy` to static HTML pages — refund needs adding).

### Workstream 4 — Verification

Owner: founder (with Claude on smoke tests). Estimated 1 working day.

**4.1 Stripe webhook delivery test** (Launch Checklist Bucket 3 BLOCKER)
- In Stripe Dashboard → Webhooks → your endpoint → Send test event.
- Fire each of the 5 event types. Verify each:
  - 200 response within 30s
  - Firestore user doc updated correctly (use a Test Mode customer/subscription for `subscription.created` test if needed)
  - `/admin/stripeWebhookEvents/{event.id}` doc exists after first delivery
  - Re-firing the same event returns `duplicate: true` and does not double-write

**4.2 End-to-end live-mode dry run**
- Sign up a fresh account in the production app.
- Checkout `medium_annual` with `flow: "ic"`. Use a real card (refund yourself afterwards).
- Verify:
  - Customer created in Stripe with `metadata.firebaseUID`
  - Subscription created with `IC_MEDIUM_2026` coupon attached and `metadata.couponId === "IC_MEDIUM_2026"`
  - Firestore user doc: `subscriptionTier: "medium"`, `subscriptionStatus: "active"`, `subscriptionInterval: "annual"`, `isInitialCenterline: true`, `icCohortNumber: 1`, `tokenBudget: 200000`
  - `/admin/icCohort.enrollmentCount === 1`
  - Pricing page updates immediately (cohort listener), shows "Current Plan"
  - Settings page shows IC badge + cohort number
- Generate one of each AI output (Multi-Voice, Journey Map, Data Viz, GPT L1, Physical Guidance). Confirm token usage updates `tokensUsedThisPeriod`.
- Trigger `changeSubscriptionPlan('extended_annual', 'ic_upgrade')`. Verify proration charge, new `tokenBudget: 1000000`, `icTier: "extended"`, `icCohortNumber: 1` (unchanged).
- Open Billing Portal. Confirm no "Switch plan" UI is visible. Cancel subscription from portal.
- Verify `subscriptionStatus: "canceled"` after webhook, `icStatus: "lapsed"`, `icLapseReason: "canceled"`.
- Refund yourself in Stripe Dashboard.

**4.3 Pilot conversion smoke test**
- Pick one pilot test account. Verify Pricing page shows pilot banner with both paths.
- Run `flow: "pilot_monthly"` checkout for `medium_monthly`. Confirm `PILOT_MONTHLY_10` coupon attaches and `pilotDiscountActive: true` lands in Firestore.
- Run `changeSubscriptionPlan('extended_monthly', 'pilot_monthly_upgrade')`. Verify discount carries over.
- Cancel. Confirm `pilotDiscountActive: false` and `pilotDiscountLapsedAt` set.

**4.4 Trial flow smoke test**
- New account → `/pricing` → Start Free Trial. Confirm trial subscription created with `trial_period_days: 30`, `TRIAL_FIRSTYEAR_10` attached, payment method required.
- Use a Stripe test clock to advance 31 days. Verify `trialConverted: true`, `trialConverter10PctYearEnd` set 12 months out, charge processed with 10% off.
- Repeat with WS1.3 `trial_to_ic` flow: convert mid-trial to `medium_annual` IC. Verify trial ends immediately, IC coupon attaches, cohort spot claimed.

**4.5 14-day past-due lapse smoke test**
- Stripe test clock: create a subscription, fail the first invoice, advance 15 days.
- Verify `stripeLapseSweep` ran (logs), `icStatus: "lapsed"`, `pilotDiscountActive: false` if applicable.

**4.6 Monitoring**
- UptimeRobot HTTP monitor on `https://your-dressage-journey.web.app/api/stripe/webhook` (HEAD request — Stripe webhook returns 405 on non-POST, which we can monitor for).
- Sentry alert rule: any error in `handleWebhook` → email founder.
- Stripe Dashboard → Workbench → Webhook health daily check during launch week.

**4.7 Tests pass in CI**
- `cd functions && npm test` returns green.
- GitHub Actions workflow runs the same on push to main.

---

## 4. Sequencing & Critical Path

```
Day 1-2  WS1.1 idempotency + WS1.2 lapse sweep + WS1.6 hosting rewrite
         (parallel) WS2.1-2.4 Stripe Dashboard products/prices/coupons/webhook
Day 3    WS1.3 trial→IC + WS1.4 mid-checkout fallback
         (parallel) WS2.5-2.8 Tax / receipt emails / Radar / portal default
Day 4    WS1.5 tests + WS1.7 footer links + WS1.8 syncEmail
Day 5    WS3.1-3.6 production cutover (sequential)
Day 6    WS4.1-4.7 verification (full end-to-end)
Day 7    Buffer / fixes
```

Total elapsed: **7 working days** with reasonable buffer. Fits inside the Launch Checklist Bucket 1+2 window (May 10-23).

**Critical-path blockers** (cannot ship payments without these):

1. WS1.1 webhook idempotency (without it, Stripe retries corrupt state)
2. WS1.2 lapse sweep (spec-required; without it IC/pilot continuity rules are wrong)
3. WS1.5 tests (Launch Checklist BLOCKER; risk floor is too low without them)
4. WS2.2 Products/Prices in live mode (no payments work without this)
5. WS2.3 Coupons in live mode (IC + pilot paths fail without this)
6. WS2.4 + WS3.1 webhook registration + secret (state never syncs without this)
7. WS3.2 portal lockdown (without it, users bypass our coupon logic via portal)
8. WS3.6 legal docs (Stripe and consumer law both require)
9. WS4.2 end-to-end dry run (Launch Checklist BLOCKER)

**Non-blockers for first payment, ship before broad GA:**

- G15 Resend lifecycle emails — only Stripe receipts strictly required; conversion / IC welcome / trial reminders should ship in the same week
- G16 Token budget calibration — defaults in `.env` are conservative; recalibrate after first 50 paid users
- G7 Customer email sync — nice-to-have

---

## 5. Go-Live Checklist (T-1 day)

Sign-off check before flipping the live switch. Use the same morning as the Launch Day smoke test.

- [ ] All 6 Products/Prices present in **live** Stripe Dashboard with correct `lookup_key`
- [ ] All 5 Coupons present in **live** Stripe Dashboard with correct IDs and durations
- [ ] Live webhook endpoint registered, signing secret loaded as `STRIPE_WEBHOOK_SECRET`
- [ ] `STRIPE_SECRET_KEY` is `sk_live_...` (verified via `firebase functions:secrets:access`)
- [ ] `node scripts/configureBillingPortal.cjs --commit --allow-live` completed, config ID stored
- [ ] `/admin/icCohort` seeded in live project (enrollmentCount: 0, cap: 100)
- [ ] All pilot users flagged with `isPilot: true` in live project
- [ ] Legal pages live: `/terms`, `/privacy`, `/refund-policy`
- [ ] Pricing page footer links to all three legal pages
- [ ] Stripe Tax decision made and documented (configured or formally deferred)
- [ ] Receipt emails enabled in Stripe Dashboard
- [ ] UptimeRobot monitor on webhook endpoint active
- [ ] Sentry alert routing for `handleWebhook` errors configured
- [ ] `cd functions && npm test` passes locally and in CI
- [ ] End-to-end dry run completed (signup → checkout → webhook → tier active → upgrade → cancel)
- [ ] Webhook idempotency verified (re-send the same `event.id` from Stripe Dashboard, confirm `duplicate: true`)
- [ ] Stripe test clock dry run of trial → IC early conversion completed
- [ ] Stripe test clock dry run of 14-day past-due lapse completed
- [ ] All discounts auto-resolve correctly: standard / ic / pilot_monthly / trial / ic_upgrade / pilot_monthly_upgrade / trial_to_ic
- [ ] Anthropic production API key set with rate limits matched to projected load

---

## 6. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| IC cohort race condition (101st enrollment) | Medium | High | Atomic Firestore transaction already in place; WS1.4 fallback to standard pricing |
| Webhook delivery failure (Stripe → us) | Low | High | Idempotency (WS1.1); UptimeRobot monitor; Stripe retries on 5xx |
| Stripe coupon ID typo in Dashboard ≠ code | Low | Critical | Cross-reference Dashboard against `COUPON_IDS` constant character-by-character during WS2.3 |
| `lookup_key` mismatch on Prices | Low | Critical | `createCheckoutSession` will throw `not-found` immediately; WS4.2 catches this |
| User changes email after subscribing → Stripe sends receipt to old address | Medium | Low | WS1.5 syncStripeCustomerEmail callable |
| Live portal accidentally allows plan switching | Low | High | WS3.2 + verification via WS4.2 (open portal, confirm no Switch plan UI) |
| First Day-1 paying user hits a bug we haven't seen | Medium | Medium | WS4.2 dry run reduces blast radius; founder available for support during first week (Launch Checklist Bucket 4) |
| Sales tax not collected → state nexus liability | Medium | Medium-High | WS2.5 Stripe Tax decision; lawyer review of nexus thresholds |
| Pilot user reactivates after lapse, re-gains pilot discount accidentally | Low | Low | Verify in WS4.3 that re-subscribe after cancellation does NOT flip `pilotDiscountActive` back to true (it currently doesn't, because the create handler only sets it when the coupon is present) |

---

## 7. Open Decisions

These need a founder call before WS1 ships:

1. **Stripe Tax — on or off at launch?** Recommendation: on. Cost: a few hours of Stripe Tax onboarding. Risk of "off": state-level nexus exposure within 6 months at scale.
2. **Mid-checkout IC sold-out behavior** — auto-fall back to standard (recommended) or throw and reload Pricing? Brief assumes auto-fallback.
3. **Webhook endpoint URL** — branded Hosting rewrite (recommended) or raw Cloud Function URL? Brief assumes branded.
4. **Annual → Monthly migration** — Pricing Tiers Reference says "renewal only, not mid-cycle." Portal lockdown blocks it. Do we surface this as a path on Pricing, or is "cancel and re-subscribe at end of period" the documented mechanism? Brief assumes the latter (no UI work needed).
5. **Refund policy specifics** — annual subscriptions: full prorated by full months only? IC forfeit on refund? Lock the policy text before publishing.

---

## 8. References

- `functions/api/stripe.js` — full handler implementation (audited)
- `functions/lib/entitlements.js` + `src/constants/entitlements.js` — tier × capability mapping
- `src/pages/Pricing.jsx` — Pricing UI with all flows
- `scripts/configureBillingPortal.cjs` — portal lockdown
- `scripts/seedICCohort.cjs` — cohort counter seed
- `scripts/flagPilots.cjs` — pilot user flagging
- `YDJ_Pricing_Tiers_Stripe_Reference.md` — base tier definitions (v1.2)
- `YDJ_Pricing_Discounts_Consolidation_v2.md` — discount system, IC cohort, trial, pilot rules
- `YDJ_Token_Budget_Spec_v2.md` — cost controls (separate effort)
- `LAUNCH_CHECKLIST_JUNE_1.md` — broader go-live checklist (this brief feeds into Buckets 1-3)

---

*Companion to `LAUNCH_CHECKLIST_JUNE_1.md`. This brief is the engineering plan for the "Stripe" rows of that checklist. Update this document as items complete and check them off in both places.*
