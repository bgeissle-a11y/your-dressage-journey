# YDJ Final Pre-Launch Remediation List

**Audit complete:** 2026-05-12 · **Launch:** 2026-06-01 · **Last status update:** 2026-05-16
**Items shipped:** 9 of 50 · **Effort remaining:** ~38 hours over ~16 days

> **🎯 Read this section. Skip the rest unless you need detail.**
>
> Everything below the "FULL AUDIT REFERENCE" divider is the original audit
> for lookup. The two sections immediately following — **WHAT'S SHIPPED** and
> **WHAT'S LEFT (work this list)** — are your live priority view. Update them
> as items complete; everything below stays as the reference of record.

---

## ✅ WHAT'S SHIPPED (as of 2026-05-16)

**Weekly focus / fan-out scaling** — Claude Code session 1
- ✅ B1 — `weeklyFocusRefresh` paginated past 200-user cap
- ✅ B2 — `weeklyFocusRefresh` timeout bumped to 540s
- ✅ B6 — `refreshWeeklyFocusSnapshotSection` wrapped in try/catch (3 handlers)
- ✅ H5 — Silent `advanceWeekAndExtract` errors now logged

**iOS data persistence** — Claude Code session 2
- ✅ B25 — `useFormRecovery` TTL bumped to 7 days
- ✅ B26 — `waitForPendingWrites` readback in 5 high-investment forms
- ✅ B27 — Shared `SaveConfirmation` blocking interstitial
- ✅ B28 — `useIsIOSSafari` hook + Save-button cue + FAQ entry

**Stripe live mode**
- ✅ B16 — Live keys swapped, live coupons created, billing portal lockdown re-run

**Cleared from BLOCKER count: 8 of 28. Cleared from HIGH-RISK: 1 of 12.**
**The two scariest classes of bug — silent fan-out failure and iOS save loss — are now neutralized.**

---

## 🎯 WHAT'S LEFT (work this list, top to bottom)

> **🔥 = BLOCKER (must ship before June 1)** · **⚠️ = HIGH-RISK (will embarrass in week 1)** · **➖ = MEDIUM (post-launch ok)**
> Time estimates are total engineering hours; budget realistic chunks against your day.

### This week (May 16–17): finish the BLOCKER tier in code

- 🔥 **B3** — `dataTriggeredRegeneration` recursion depth limit (1h)
- 🔥 **B15** — Stripe webhook event-ID idempotency (2h)
- 🔥 **B18** — Cloud Function error-rate alerting in Cloud Console (1h)
- 🔥 **B19** — `lastRegenError` field + 5 panel banners (4h)
- 🔥 **B20** — Anthropic production-tier API key swap (0.5h)
- 🔥 **B21** — UptimeRobot pings on frontend, functions, Stripe webhook (0.5h)
- 🔥 **B22** — Firestore + Anthropic + Stripe spend alerts (1h)
- ⚠️ **H1** — Bump frontend timeouts from 300s to 540s for JM/GPT/Physical/DataViz (0.5h)
- ⚠️ **H6** — `firstLight.graduate` use `count()` aggregation instead of full reads (1h)
- ⚠️ **H12** — Tighten `microDebriefs`/`freshStarts` rules so AI fields are immutable to client (1h)
- 📧 **Pilot conversion email Round 1** + apology to lesson-notes user (1.5h)

**Subtotal this week: 14h.** This finishes off the operational-visibility tier and the highest-leverage UX fixes.

### Next week (May 18–23): coaching/show-planner BLOCKERs + AI hardening

- 🔥 **B4** — Multi-Voice partial-failure stale fallback (instead of red error tab) (3h)
- 🔥 **B5** — Précis lock for bulk path (1h)
- 🔥 **B7** — Show Planner "10 shows/yr" — drop the marketing claim OR enforce (0.5h for copy fix)
- 🔥 **B8** — Event Planner Step 2–4 caching + locks + truncation handling (4h)
- 🔥 **B10** — Bi-weekly cron same-day dedup (1h)
- 🔥 **B11** — Bi-weekly cron global spend cap (1h)
- 🔥 **B12** — GPT trajectory step 1 resume banner (2h)
- 🔥 **B13** — `_countL2OpusThisMonth` add date-range filter (1h)
- 🔥 **B14** — Data Viz `maxTokens` migrate to `tokenBudgets` (1.5h)
- 🔥 **B17** — 14-day past-due → IC/pilot lapse scheduled job (2h)
- ⚠️ **H2** — Multi-Voice backend timeout 120 → 240s (1h)
- ⚠️ **H3** — Précis prompt verification for 3-of-4 voice path (1h)
- ⚠️ **H4** — Tier-aware daily call limit (Working 30 / Medium 60 / Extended 100) (1h)
- 📧 **Pilot conversion email Round 2** (1h)

**Subtotal next week: 21h.**

### Launch week (May 24–31): QA, deploy hardening, comms

- 🔥 **B9** — Flip `SHOW_PLANNER_BIWEEKLY_ENABLED=true` after one validation run (1h)
- 🔥 **B23** — ToS / Privacy / Refund finalized & published (external — lawyer)
- 🔥 **B24** — End-to-end live-mode dry run (4h)
- ⚠️ **H7** — Cycle-state extension try/catch with logging (1h)
- ⚠️ **H8** — iOS Safari QA pass — full app on real iPhone (4h)
- ⚠️ **H9** — Voice input QA on iOS + Android (1.5h)
- ⚠️ **H10** — Pilot conversion email Round 3 (1h)
- ⚠️ **H11** — Support runbook + canned responses (2h)
- ➖ **M6** — 3 high-leverage unit tests (defer if tight) (4h)

**Subtotal launch week: 14.5h** (or 10.5h with M6 deferred).

### Launch day (June 1)

- Morning: final smoke test on production
- Send launch announcement; post to social
- Watch dashboards: Sentry, Stripe, Firebase Functions, Anthropic, UptimeRobot
- **Be at the keyboard. Don't schedule anything else.**

### Week 1 post-launch (June 2–8) — backlog (not blocking)

- ➖ **M11 (NEW)** — Vite chunk-size warning. Lazy-load Insights route + manualChunks for recharts/firebase. Improves new-user mobile first-load. (1.5h)
- ➖ **M1** — Add test database hash to eventPrep cache key
- ➖ **M2** — Tighten `getStaleCache` `maxAgeDays: 90` for coaching to something tighter
- ➖ **M3** — Isolate budget exhaustion mid-pipeline in `runRegeneration`
- ➖ **M4** — `silentCanAccess` denial path should set `generationStatus = skipped`
- ➖ **M5** — Sanity-check repaired truncated JSON for required fields
- ➖ **M7** — GitHub Actions CI workflow
- ➖ **M8** — One-page diagnostic-script runbook
- ➖ **M9** — Surface MicroDebrief/FreshStart failures in `lastRegenError`
- ➖ **M10** — Verify `firstLight` 1500-token cap doesn't truncate rich riders

---

## 📊 EFFORT REMAINING

| Bucket | Hours | Calendar window |
|---|---|---|
| This week (May 16–17) | 14 | 2 days |
| Next week (May 18–23) | 21 | 6 days |
| Launch week (May 24–31) | 14.5 (or 10.5) | 8 days |
| **Total to launch** | **~50h** | **~16 days** |

**Pace check:** ~3.1 hours/day average. The This-Week list is heavier per-day because the 2-day window is short — if you can clear B3, B15, B18, B20, B21, B22 today (6 hours of mostly-config work), the rest of the week is pure code at a comfortable pace.

**If you slip, drop in this order:** M6 (tests) → H4 (tier-aware call limit) → H1 (frontend timeout flip) → H9 (voice input QA). Do NOT drop anything from BLOCKER tier.

---

## 🆕 ADDED SINCE INITIAL AUDIT

- **M11** (May 16) — Vite chunk-size warning surfaced after a deploy. ~1.5h fix; lazy-load Insights route + `manualChunks` for recharts/firebase in `vite.config.js`. Affects new-user mobile first-load on the Insights page. Slot post-launch unless Week 1 has bandwidth. Full Claude Code prompt is in the chat thread that introduced this item.

---

# FULL AUDIT REFERENCE

> Everything below this line is the original audit, kept for lookup.
> Don't work from this section — work from "WHAT'S LEFT" above.

---

## EXECUTIVE SUMMARY

**The good news (don't re-litigate):**
- Précis, First Light, Micro-Debrief, and Fresh Start are **well-designed and recent**. The new-user empathetic-response path correctly handles the case where no précis exists yet (`empatheticContext.detectRiderState` routes to `new_no_first_light` / `new_with_first_light` / `established` paths). Both subsystems write fallback responses on AI failure.
- Stripe webhook signature verification, IC cohort atomic claim transaction, IC upgrade window logic, and pilot lifecycle date enforcement are all correct.
- Most AI handlers (Journey Map, Physical Guidance, GPT, DataViz) have good in-flight locks, stale-cache fallback, partial-failure handling for *most* paths.
- The `YDJ_PostGoLive_PolishBacklog.md` from May 8 already documented 3 known polish items — Barb is running a deliberate hardening sweep.

**The bad news:**
- **The biggest single risk** is silent fan-out failure at scale: `weeklyFocusRefresh` will silently truncate at 200 users.
- **The biggest single oversight** is webhook idempotency: Stripe retries are not de-duplicated, which can cause double-claims and double-counter-resets.
- **The biggest single product gap** is Show Planner's "10 shows/yr" Medium-tier claim with zero enforcement.
- **The biggest single UX foot-gun** is Multi-Voice partial-failure rendering error placeholders instead of stale fallback (audit #1 B5).
- **The biggest single ops gap** is no Cloud Function error-rate alerting (audit #1 B8).
- **🆕 The biggest single data-loss risk on mobile** is iOS Safari's tab-backgrounding race: forms show "Saved!" because the SDK promise resolved from the local cache, but the network sync never completed. CLAUDE.md flagged this category as a known issue, but no code-level defenses exist. **A pilot user already lost lesson notes this way (5/13).**

**Total fix budget:** ~52 engineering hours over 20 days. Tight but doable for a focused single founder-engineer with no scope creep.

---

## BLOCKERS (28 items — must fix before June 1)

### 🚨 Bulk fan-out & scaling

**B1. `weeklyFocusRefresh` silently truncates at 200 users.**
File: `functions/api/weeklyFocusRefresh.js:133` — `auth.listUsers(200)` returns at most 200 users with no pagination. Above 200 users, no Monday snapshot fires for anyone after #200. Silent failure.
**Fix:** Paginate via `pageToken` loop. **Effort: 2h.**

**B2. `weeklyFocusRefresh` 120s timeout will cap-out at scale.**
File: `functions/index.js:228`. Per-user processing ~150ms; at 800+ users you exceed budget mid-batch.
**Fix:** Bump timeout to 540s, plus paginate (B1). Long-term: Pub/Sub fan-out. **Effort: 1h** (configuration only).

**B3. `dataTriggeredRegeneration` recursion has no depth limit.**
File: `functions/api/dataTriggeredRegeneration.js:191`. `runRegeneration(...)` recursively re-fires when `needsRerun` is true; can chew through 8–10 minutes and many tokens.
**Fix:** Add `depth` arg, bail at `depth >= 2`. **Effort: 1h.**

### 🚨 Coaching / Multi-Voice

**B4. Multi-Voice partial-failure UX shows error placeholder instead of stale fallback.**
Files: `functions/api/coaching.js:549`, `src/components/AICoaching/MultiVoicePanel.jsx:436`, `CoachingVoiceCard.jsx:56`. `loadStaleCoaching` exists but only fires on all-fail or budget-exceeded. 1-of-4 transient failure renders red error tab.
**Fix:** In partial-failure branch, attempt per-voice stale cache load before placeholder. **Effort: 3h.**

**B5. Précis lock collision between bulk and concurrent bulk.**
File: `functions/api/coaching.js:539` releases lock before line 603 précis call. Two bulk requests racing → both run précis → wasted tokens.
**Fix:** Wrap précis block in `tryAcquireLock(uid, "coaching_precis")` + idempotency check. **Effort: 1h.**

**B6. `refreshWeeklyFocusSnapshotSection` crashes propagate as handler failures.**
Files: `coaching.js:613`, `physicalGuidance.js:328`, `grandPrixThinking.js:413`. Snapshot extraction throws → entire handler throws even though main output succeeded.
**Fix:** Wrap in try/catch, log, continue. **Effort: 0.5h** (one-line per handler).

### 🚨 Show Planner / Event Planner

**B7. Show Planner promises "10 shows/yr" but enforces no usage cap.**
Files: `functions/lib/entitlements.js`, `functions/api/eventPlanner.js`. `CAPABILITIES.generateShowPrepPlan` is boolean. Pricing copy claims "10 shows/yr" for Medium.
**Fix:** Either (a) update pricing copy to drop the "10/yr" claim, or (b) enforce `showPlansCreatedThisYear` counter on the user doc (already initialized at `stripe.js:765`). Recommend (a) for launch, (b) post-launch. **Effort: (a) 0.5h, (b) 4h.**

**B8. Event Planner Steps 2–4 have no cache, no in-flight lock, no truncation handling.**
File: `functions/api/eventPlanner.js:296–411`. Refresh mid-flow re-runs all completed steps; double-click burns tokens twice; truncation in steps 2/3/4 throws unhelpful "Failed to extract valid JSON" instead of resource-exhausted.
**Fix:** Add per-step cache `(planId, dataSnapshotHash, eventPrepHash, step)`, in-flight lock per step, truncation try/catch matching step 1. **Effort: 4h.**

**B9. `SHOW_PLANNER_BIWEEKLY_ENABLED` defaults to `false`.**
File: `functions/api/showPlannerBiweeklyContent.js:48`. If launch deploy doesn't set this to `true`, no plans get bi-weekly check-ins.
**Fix:** Add to deploy checklist + `firebase functions:secrets:set` line. Default OFF is fine; just remember. **Effort: 0.5h.**

**B10. Show Planner bi-weekly cron `arrayUnion` doesn't dedup.**
File: `functions/api/showPlannerBiweeklyContent.js:209`. `generatedAt` is fresh on every fire so `arrayUnion` never deduplicates → duplicates on cron retries or manual re-runs.
**Fix:** Read doc first; check whether a `biweeklyContent` entry exists with `generatedAt` within the same UTC day. Skip if so. **Effort: 1h.**

**B11. Show Planner bi-weekly cron has no global spend cap.**
File: `functions/api/showPlannerBiweeklyContent.js:230–247`. Per-user dollar cap doesn't help because each plan = different user; one fire could blow $50–100 with no abort.
**Fix:** Track total cost in cron run; abort with log when crossing configurable env ceiling. **Effort: 1h.**

### 🚨 GPT / Physical Guidance

**B12. GPT trajectory step 1 cache has no rider-visible resume banner.**
Per polish backlog item #3. A rider who clicks Regenerate, sees Step 1 (Opus, ~$0.30) complete, then closes the tab loses the value of that Opus call on next attempt.
**Fix:** Per polish backlog spec — mount-time check on GPT panel, banner if `grandPrixTrajectoryStep1` cache > final cache, "Continue" button resumes from cached step 1. **Effort: 2h.**

**B13. `_countL2OpusThisMonth` reads all matching usageLogs without date filter.**
File: `functions/api/grandPrixThinking.js:73`. After 6+ months of operation, this query reads hundreds of historical log docs per Opus check.
**Fix:** Add `where("timestamp", ">=", monthStartIso)` range filter or maintain a counter doc. **Effort: 1h.**

### 🚨 Data Visualizations

**B14. Data Visualizations has hardcoded `maxTokens` bypassing `tokenBudgets`.**
File: `functions/api/dataVisualizations.js:154,162,178`. Uses `8192`, `4096`, `4096` regardless of tier. Inconsistent with all other handlers; could over-budget output.
**Fix:** Migrate to `getMaxTokens("data-viz-pattern", budgetTier)` etc; add SPEC rows to `tokenBudgets.js`. **Effort: 1.5h.**

### 🚨 Stripe & Webhooks

**B15. Stripe webhook handler has no event-ID idempotency.**
File: `functions/api/stripe.js:610–655`. Stripe retries on non-2xx and on its own; without `processedEvents/{event.id}` check, the same event can fire `onSubscriptionCreated` (double IC claim transaction protects count, but writes user doc twice), `onPaymentSucceeded` (double counter reset), etc.
**Fix:** At top of handler, check/write to `processedStripeEvents/{event.id}` with TTL. Skip if exists. **Effort: 2h.**

**B16. Stripe live-mode swap not in audit trail.**
Per launch checklist. Test keys → live keys, `scripts/configureBillingPortal.cjs --allow-live`, all 5 coupon IDs created in live mode.
**Fix:** Run, log, test one live checkout end-to-end. **Effort: 2h.**

**B17. No 14-day past-due → IC/pilot lapse job.**
File: `functions/api/stripe.js:969–988`. `onPaymentFailed` sets `subscriptionStatus: past_due` but the spec'd 14-day-then-lapse logic is "TODO in implementation brief; not in initial commit".
**Fix:** Add scheduled function: query `users` where `subscriptionStatus == past_due` for >14 days; lapse IC + pilot discount, update status. **Effort: 2h.**

### 🚨 Operational visibility

**B18. No Cloud Function error-rate alerting.**
Per polish backlog item #1. Without this, Anthropic incidents and stuck pipelines are invisible.
**Fix:** Cloud Console alert: `severity=ERROR` rate > 5% / 15min on `getMultiVoiceCoaching`, `getJourneyMap`, `getGrandPrixThinking`, `getDataVisualizations`, `getPhysicalGuidance`, `getEventPlanner`, `weeklyFocusRefresh`, `showPlannerBiweeklyContent`, `onDebriefCreated`, `onReflectionCreated`, `stripeWebhook`, `onMicroDebriefSubmit`, `onFreshStartSubmit`. SMS or email founder. **Effort: 1h.**

**B19. No `lastRegenError` rider-visible banner.**
Per polish backlog item #2. Riders whose regen fails have zero in-product signal.
**Fix:** Per polish backlog spec — write `lastRegenError` on regen catch in coaching/journeyMap/GPT/Physical/DataViz; render banner on panel mount when present and < 24h old. **Effort: 4h** (5 panels).

**B20. Anthropic API key + production tier confirmed.**
Per launch checklist. Production-tier key with rate limits sized for projected weekly load. Set `ANTHROPIC_API_KEY` in functions config.
**Fix:** Verify and rotate from any pilot/dev key. **Effort: 0.5h.**

**B21. UptimeRobot ping for `/health` endpoint.**
`functions/index.js:64` exposes `health` onRequest endpoint. Wire to UptimeRobot with SMS alert.
**Fix:** Configure monitor + frontend URL + Stripe webhook URL. **Effort: 0.5h.**

**B22. Firestore + Anthropic + Stripe budget alerts.**
Per launch checklist. 50/80/100% spend alerts on each.
**Fix:** Console config in three places. **Effort: 1h.**

### 🚨 iOS Safari data persistence (NEW — added 2026-05-15)

**Why this is now a first-class engineering concern, not just QA:** A pilot user lost Lesson Notes on 5/13 because iOS Safari backgrounded the tab between Save click and Firestore sync. The SDK promise resolved from the local cache write so the UI showed "Saved!", but the network flush never happened, and by the time she came back the recovery hook had purged the draft (24h TTL exceeded). **This bug pattern applies to every form that writes via Firestore SDK — meaning every high-investment form in the product.** CLAUDE.md flags iOS Safari as historically problematic but no code-level defenses exist. Promote from manual-QA-only to engineering-hardened.

**B25. Bump `useFormRecovery` TTL from 24h to 7 days for high-investment forms.**
File: `src/hooks/useFormRecovery.js:4`. `MAX_AGE_MS = 24 * 60 * 60 * 1000`. A user reporting a missing save on day 3 has zero recovery path because the hook silently purges on mount. Used by 5 forms: Debrief, PhysicalAssessment, RiderAssessment, TechnicalPhilosophical, LessonNote — every high-investment form in the product.
**Fix:** Bump default `MAX_AGE_MS` to `7 * 24 * 60 * 60 * 1000`. Per-record scoping already prevents cross-record bleed; longer TTL is low-risk because each draft is one form's worth of data and `purgeLegacyRecoveryKeys` runs at boot. **Effort: 5 min.** Ship today.

**B26. Save-readback pattern: confirm the doc actually exists before claiming success.**
Files: `LessonNoteForm.jsx:260–280` (and the equivalent submit handlers in DebriefForm, RiderAssessmentForm, PhysicalAssessmentForm, TechnicalPhilosophicalForm). Today the flow is `await saveDoc → setLoading(false) → setSavedData(data)`. The SDK's resolved promise lies on iOS Safari when the tab hides mid-flight: the local cache write resolves, but the network sync never fires. Confirmation screen renders on a write that didn't actually happen.
**Fix:** After `saveDoc` resolves, do a `getDoc(savedDoc.ref)` readback (or `await waitForPendingWrites(db)` from Firestore SDK) before transitioning to the success state. If readback fails or times out (10s), keep the draft in localStorage and show a "Still syncing — keep this page open" warning. Don't clear the recovery cache until the readback succeeds. **Effort: 3h** for the 5 forms.

**B27. Make "Saved!" a blocking visual state, not a promise-trust transition.**
LessonNotes already uses a full-screen confirmation (`LessonNoteForm.jsx:407`) which is the right pattern — but it fires on the SDK promise. The other 4 high-investment forms (`DebriefForm`, `PhysicalAssessmentForm`, `RiderAssessmentForm`, `TechnicalPhilosophicalForm`) use less-blocking confirmations (toasts, inline messages, immediate navigation). On iOS Safari with backgrounding, those confirmations can flash by while the actual write is still pending.
**Fix:** Standardize on a blocking "Saved!" interstitial across all 5 forms — a card the user must click to dismiss, gated behind the readback from B26. Same component, reused. The interstitial is the user's unambiguous signal that the data is on the server, not just in the SDK queue. **Effort: 2h** to extract a shared `SaveConfirmation` component and wire it into the 4 forms that don't already have one.

**B28. iOS-contextual cue at the Save button + FAQ entry.**
Detect iOS Safari (cheap UA sniff: `/iPad|iPhone|iPod/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS/.test(navigator.userAgent)`). On iOS Safari sessions only, render a one-line cue under the Save button on high-investment forms: *"Stay on this page until you see the green confirmation."* Add a corresponding FAQ entry to `src/pages/TipsAndFaq.jsx`: *"Why did my save not work on iPhone?"* explaining the backgrounding pattern and pointing at the recovery banner.
**Fix:** Build `useIsIOSSafari()` hook in `src/hooks/`, render conditional cue in 5 form footers, add FAQ section. Skip the first-visit-only suppression — pre-launch budget doesn't justify it; the cue is one line. **Effort: 2h.**

### 🚨 Legal / compliance

**B23. ToS / Privacy / Refund Policy published.**
Per launch checklist. Cover AI-generated content disclaimers, Anthropic API data flow, refund window for annual + IC tier-coupon forfeit rule.
**Fix:** Final lawyer pass + publish. **Effort: external.**

**B24. End-to-end live-mode dry run.**
Per launch checklist. Brand-new user → onboarding → 5 debriefs → trigger Multi-Voice → upgrade Working → IC upgrade flow → cancel → verify pilot-grace.
**Fix:** Document each issue, fix or defer. **Effort: 4h.**

---

## HIGH-RISK (12 items — likely week-1 embarrassment if untreated)

**H1. Frontend timeout (300s) shorter than backend (540s) for JM/GPT/Physical/DataViz.**
File: `src/services/aiService.js:71,88,117,132`. Slow Anthropic → user sees timeout error while backend keeps running and writes cache. Polish backlog `lastRegenError` (B19) partially addresses this. Consider raising frontend timeout to 540s OR rendering "still cooking" UI on timeout.
**Effort: 0.5h** (config flip).

**H2. Multi-Voice frontend timeout = backend timeout (both 120s).**
File: `src/services/aiService.js:56`, `functions/index.js:95`. 5-call fan-out under slow Anthropic conditions can race timeout.
**Fix:** Bump backend timeout to 240s OR add backend-side per-voice timeout with stale fallback. **Effort: 1h.**

**H3. Précis prompt may break with 3-of-4 voices.**
File: `functions/api/coaching.js:594`. When 1 voice fails, précis still runs but `buildMultiVoicePrecisPrompt` likely expects all 4 keys.
**Fix:** Manually inspect prompt builder; either tighten threshold to `failedVoices.length === 0` or update template. **Effort: 1h.**

**H4. Daily 40-call user limit is tight for power users.**
File: `functions/lib/claudeCall.js:32`. Full Insights refresh ≈ 19 calls; two refreshes + show planner step-throughs = exhausted same day.
**Fix:** Make tier-aware: Working 30, Medium 60, Extended 100. **Effort: 1h.**

**H5. `weeklyFocusRefresh` silently swallows GPT/Physical advance errors.**
File: `functions/api/weeklyFocusRefresh.js:147`. Catch silently resets to "currentWeek: 1" — corrupted cycle invisible.
**Fix:** Log error before swallowing; consider surfacing via `lastCycleAdvanceError` user doc field. **Effort: 0.5h.**

**H6. `firstLightGraduateOnDebrief` and `firstLightGraduateOnReflection` read all docs every time.**
File: `functions/api/firstLight.js:484,492`. On every new debrief or reflection (frequent!), reads all of user's debriefs and reflections.
**Fix:** Use `count()` aggregation queries (already used in `dataTriggeredRegeneration.js:67`). **Effort: 1h.**

**H7. Cycle-state extension paths swallow errors.**
File: `physicalGuidance.js:165–183`, `grandPrixThinking.js:294–318`. `shouldExtendCycle` writes status; if write fails the user sees stale cache without knowing why.
**Fix:** Try/catch the extension flow with explicit error logging. **Effort: 1h.**

**H8. iOS Safari QA pass.**
Per launch checklist. Safari has caused data persistence issues before.
**Fix:** Walk every form, every output, full checkout flow on real iPhone. **Effort: 4h.**

**H9. Voice input QA on iOS + Android.**
Per launch checklist. Web Speech API in barn conditions.
**Fix:** Test 3 highest-use forms on both platforms. **Effort: 1.5h.**

**H10. Pilot conversion email sequence (3 sends).**
Per launch checklist. May 11 / May 19 / May 26.
**Fix:** Draft, schedule. **Effort: 3h.**

**H11. Customer support runbook + canned responses.**
Per launch checklist. Top 10 expected questions, refund flow, account deletion.
**Fix:** Document. **Effort: 2h.**

**H12. `microDebriefs` and `freshStarts` allow client `update`.**
File: `firestore.rules:55-67`. The empathetic response field is written by Cloud Function but rules let user `update` the doc — they could overwrite the AI response.
**Fix:** Tighten rules: allow update only if `request.resource.data.empatheticResponse == resource.data.empatheticResponse` (immutable AI fields). **Effort: 1h.**

---

## MEDIUM (10 items — acceptable to defer to week 1–2 of production)

**M1.** Test database hash not in `eventPrep` cache key — `comprehensive_dressage_test_database.json` updates don't invalidate cached plans.
**M2.** `getStaleCache` `maxAgeDays: 90` for coaching is generous — 90-day-old voices probably need fresh generation, not stale serving.
**M3.** `runRegeneration` doesn't isolate budget exhaustion mid-pipeline — will attempt subsequent outputs that will also fail.
**M4.** `silentCanAccess` denial path doesn't update `generationStatus` — frontend progress poll could hang.
**M5.** `repairTruncatedJSON` quietly produces partial outputs — sparse cache rows look fine to writer but render as empty UI sections.
**M6.** Add 3 high-leverage unit tests: `entitlements.js` (pilot lifecycle), `stripe.js` (`changeSubscriptionPlan` flows), `coaching.js` (partial-failure stale fallback). Per launch checklist.
**M7.** Set up basic GitHub Actions CI: build + smoke tests on push to main.
**M8.** Document diagnostic scripts (`inspectRegenState`, `triggerPhysicalRegen`, `testTrajectoryChunked`) in a one-page runbook.
**M9.** `MicroDebrief` and `FreshStart` failures don't surface in `lastRegenError` — only in Cloud Function logs.
**M10.** Consider whether `generateFirstLight` (1500 max tokens) might truncate for riders with rich 6-reflection input.

---

## CONFIRMED-SAFE FROM AUDIT (don't re-litigate, just sanity-check at code freeze)

- Entitlements + tier capabilities synchronized between frontend and backend
- Pilot lifecycle date constants correct (PILOT_END_ISO=2026-05-15, PILOT_GRACE_END_ISO=2026-07-07)
- Stripe webhook signature verification + IC cohort atomic claim transaction
- All 4 voices + précis pipeline (Précis call 5 implemented per spec)
- New-user empathetic response routing (`detectRiderState` → 3 paths, all with fallbacks)
- Token budgets per tier × output (except Data Viz — see B14)
- Per-user dollar caps + daily call limits (claudeCall.js)
- L2 Opus monthly cap of 4 generations/user
- Cycle-state architecture for GPT mental + Physical Guidance
- Firestore security rules — auth-scoped, no test mode, IC cohort public-read
- Recent reliability commits (Weekly Focus snapshot desync, Practice Card, function timeouts 300→540s, GPT L2 chunking)

---

## ACTION PLAN — 20-Day Schedule

### Week 1 (May 15–17) — Land scaling + ops + iOS persistence blockers (~24h)

| # | Item | Hours |
|---|---|---|
| **B25** | **Bump `useFormRecovery` TTL to 7 days (SHIP TODAY)** | **0.1** |
| **B26** | **Save-readback pattern across 5 high-investment forms** | **3** |
| **B27** | **Shared `SaveConfirmation` blocking interstitial component** | **2** |
| **B28** | **`useIsIOSSafari` hook + Save-button cue + FAQ entry** | **2** |
| B1 | `weeklyFocusRefresh` pagination | 2 |
| B2 | `weeklyFocusRefresh` 540s timeout | 1 |
| B3 | `dataTriggeredRegeneration` depth limit | 1 |
| B6 | `refreshWeeklyFocusSnapshotSection` try/catch (3 files) | 0.5 |
| B15 | Stripe webhook idempotency | 2 |
| B18 | Cloud Function error-rate alerting | 1 |
| B19 | `lastRegenError` field + 5 panel banners | 4 |
| B20 | Anthropic prod-tier key swap | 0.5 |
| B21 | UptimeRobot pings | 0.5 |
| B22 | Firestore + Anthropic + Stripe spend alerts | 1 |
| H10 | Pilot conversion email Round 1 + apology-with-context to the affected lesson-notes user | 1.5 |
| H1 | Bump frontend timeouts to 540s | 0.5 |
| H6 | `firstLight.graduate` count-aggregation | 1 |
| H12 | Tighten `microDebriefs`/`freshStarts` update rules | 1 |

**Subtotal: 24h** (iOS hardening adds ~7h; we lose 2 calendar days vs. May 12 start but absorb it.)

### Week 2 (May 18–23) — Land coaching/show-planner blockers + AI hardening (~17h)

| # | Item | Hours |
|---|---|---|
| B4 | Multi-Voice partial-failure stale fallback | 3 |
| B5 | Précis lock for bulk path | 1 |
| B7 | Show Planner copy fix (drop "10/yr" claim) | 0.5 |
| B8 | Event Planner step caching + locks + truncation | 4 |
| B10 | Bi-weekly cron same-day dedup | 1 |
| B11 | Bi-weekly cron global spend cap | 1 |
| B12 | GPT trajectory step 1 resume banner | 2 |
| B13 | `_countL2OpusThisMonth` date-range filter | 1 |
| B14 | Data Viz `maxTokens` → tokenBudgets | 1.5 |
| B17 | 14-day past-due lapse scheduled job | 2 |
| H2 | Multi-Voice backend timeout 120 → 240s | 1 |
| H3 | Précis prompt verification 3-of-4 path | 1 |
| H4 | Tier-aware daily call limit | 1 |
| H10 | Pilot conversion email Round 2 (May 19) | 1 |

**Subtotal: 21h**

### Week 3 (May 24–31) — QA, deploy hardening, polish (~18h)

| # | Item | Hours |
|---|---|---|
| B9 | `SHOW_PLANNER_BIWEEKLY_ENABLED=true` validation + flip | 1 |
| B16 | Stripe live-mode swap + 5 coupons | 2 |
| B23 | ToS / Privacy / Refund finalization | external |
| B24 | End-to-end live-mode dry run | 4 |
| H5 | `weeklyFocusRefresh` advance-error logging | 0.5 |
| H7 | Cycle-state extension try/catch | 1 |
| H8 | iOS Safari QA pass — full app | 4 |
| H9 | Voice input QA iOS + Android | 1.5 |
| H10 | Pilot conversion email Round 3 (May 26) | 1 |
| H11 | Support runbook + canned responses | 2 |
| M6 | 3 high-leverage unit tests | 4 (or defer) |

**Subtotal: 21h** (or 17h if M6 deferred)

### Launch Day (June 1)

- Morning: final smoke test on production
- Send launch announcement email
- Post to social / community channels
- Watch dashboards live: Sentry / Stripe / Firebase Functions / Anthropic console / UptimeRobot
- Be at the keyboard for support — don't schedule anything else

### Week 1 post-launch (June 2–8)

- Daily signup → first-debrief funnel triage
- Daily conversion-to-paid check for pilots in grace
- Reply to every support email within 24h
- First "weekly batch" AI generation should fire successfully ~June 8
- Snapshot week-1 metrics

---

## TOTAL EFFORT

- **Week 1: 24h** — scaling + ops + iOS persistence (the silent-failure killers, including the new lesson-notes-loss class of bug)
- **Week 2: 21h** — coaching + show planner + AI hardening
- **Week 3: 21h** (or 17h with M6 deferred) — QA + deploy hardening + comms

**Grand total: 62–66 hours over 17 days = ~3.7 hours/day.** Tight. Still achievable for a focused founder-engineer who clears the calendar, but you've used 3 days of the original 20-day budget — every weekday now matters.

If you slip, drop in this order: M6 → M7 (CI) → H9 (voice input QA) → H4 (tier-aware call limit) → H1 (frontend timeout flip). **Do NOT drop B25–B28 — the iOS save-loss bug is happening to real pilot users now and will hit new users on day 1.**

If you want to add one item back: an explicit "founder office hours" calendar block May 24 → June 14 in the support runbook so pilots and new users have a clear "Barb is available" channel.

---

## What Got Audited (full coverage now)

| Subsystem | File | Status |
|---|---|---|
| Multi-Voice Coaching | `coaching.js` | Done — B4, B5, B6 |
| Précis | `coaching.js`, `MultiVoicePrecis_Spec.md` | Done — B5, H3 |
| Quick Insights / Practice Card / Viz Suggestion | `coaching.js` | Done — confirmed-safe |
| Journey Map | `journeyMap.js` | Done — B6, M5 |
| Grand Prix Thinking L1 (mental) | `grandPrixThinking.js` | Done — B6, B12, B13 |
| Grand Prix Thinking L2 (trajectory chunked) | `grandPrixThinking.js` | Done — B12 |
| Physical Guidance | `physicalGuidance.js` | Done — B6, H7 |
| Data Visualizations | `dataVisualizations.js` | Done — B14 |
| Event Planner / Show Planner | `eventPlanner.js` | Done — B7, B8 |
| Show Planner Bi-Weekly Cron | `showPlannerBiweeklyContent.js` | Done — B9, B10, B11 |
| Weekly Focus Refresh | `weeklyFocusRefresh.js` | Done — B1, B2, H5 |
| Data-Triggered Regeneration | `dataTriggeredRegeneration.js` | Done — B3 |
| First Light | `firstLight.js` | Done — H6, M10 |
| Micro-Debrief | `microDebrief.js` | Done — H12, M9 |
| Fresh Start | `freshStart.js` | Done — H12, M9 |
| Empathetic Context | `empatheticContext.js` | Done — confirmed-safe |
| Token budgets | `tokenBudgets.js` | Done — B14 |
| Claude API wrapper | `claudeCall.js` | Done — H4 |
| Entitlements (frontend + backend) | `entitlements.js` × 2 | Done — confirmed-safe |
| Subscription loader | `loadSubscription.js` | Done — confirmed-safe |
| Stripe checkout / portal / webhook | `stripe.js` | Done — B15, B16, B17 |
| Firestore rules | `firestore.rules` | Done — H12 |
| Cloud Function entry points | `functions/index.js` | Done — confirmed-safe |
| `prepareRiderData` | `prepareRiderData.js` | Done — confirmed-safe |
| Frontend Multi-Voice panel | `MultiVoicePanel.jsx` | Done — B4, H1 |
| Frontend Physical / GPT / JM panels | various `*Panel.jsx` | Done — H1 |
| Frontend AI service timeouts | `aiService.js` | Done — H1, H2 |

Total: **27 subsystems** audited end-to-end. Findings: **28 BLOCKERs** (24 from initial audit + 4 iOS persistence added 5/15), **12 HIGH-RISK**, **10 MEDIUM**, **27 confirmed-safe**.

### Addendum: iOS Safari data persistence (5/15)

After the original audit, a pilot user reported a Lesson Notes save loss on iOS Safari. The root cause class — SDK promise resolves before network sync flushes when the tab backgrounds — applies to **every form that writes via Firestore SDK**, not just Lesson Notes. CLAUDE.md flagged the area but the technical specs had no engineering requirements. Promoted to first-class concern with B25–B28. Files involved:

- `src/hooks/useFormRecovery.js` (5 forms consume it)
- `src/components/LessonNotes/LessonNoteForm.jsx`
- `src/components/Debrief/DebriefForm.jsx`
- `src/components/PhysicalAssessment/PhysicalAssessmentForm.jsx`
- `src/components/RiderAssessment/RiderAssessmentForm.jsx`
- `src/components/TechnicalPhilosophical/TechnicalPhilosophicalForm.jsx`
- `src/pages/TipsAndFaq.jsx` (FAQ entry)
- New: `src/hooks/useIsIOSSafari.js`, `src/components/shared/SaveConfirmation.jsx`

---

## Sources

- `LAUNCH_CHECKLIST_JUNE_1.md` (initial broad checklist, May 10)
- `LAUNCH_AUDIT_PrecisShowMVCFanout.md` (deep audit #1, May 12)
- `YDJ_PostGoLive_PolishBacklog.md` (founder's pre-go-live sweep notes, May 8)
- `CLAUDE.md` (project doc)
- All handler files under `functions/api/` and library files under `functions/lib/`
- `firestore.rules`
- Frontend: `src/services/aiService.js`, `src/components/AICoaching/*.jsx`
