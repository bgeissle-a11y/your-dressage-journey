# YDJ Final Pre-Launch Remediation List

**Audit complete:** 2026-05-12 · **Launch:** 2026-06-01 · **Days remaining:** 20

This is the consolidated remediation list across the full codebase audit:
- Initial launch checklist (`LAUNCH_CHECKLIST_JUNE_1.md`)
- Deep audit #1 — Précis · Show Planner · Coaching Voices · Fan-Out (`LAUNCH_AUDIT_PrecisShowMVCFanout.md`)
- Deep audit #2 — Journey Map · GPT · Physical Guidance · Data Viz · Stripe · Firestore Rules · First Light · Micro-Debrief · Fresh Start · Frontend resilience (this file's findings)

Every BLOCKER below has a file:line reference and a one-sentence fix. Every fix has an effort estimate. The action plan at the bottom orders them across the remaining 20 days.

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

**Total fix budget:** ~52 engineering hours over 20 days. Tight but doable for a focused single founder-engineer with no scope creep.

---

## BLOCKERS (24 items — must fix before June 1)

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

### Week 1 (May 12–17) — Land scaling + ops blockers (~16h)

| # | Item | Hours |
|---|---|---|
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
| H10 | Pilot conversion email Round 1 (May 11–13) | 1 |
| H1 | Bump frontend timeouts to 540s | 0.5 |
| H6 | `firstLight.graduate` count-aggregation | 1 |
| H12 | Tighten `microDebriefs`/`freshStarts` update rules | 1 |

**Subtotal: 17h**

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

- **Week 1: 17h** — scaling + ops (the silent-failure killers)
- **Week 2: 21h** — coaching + show planner + AI hardening
- **Week 3: 21h** (or 17h with M6 deferred) — QA + deploy hardening + comms

**Grand total: 55–59 hours over 20 days = ~3 hours/day.** Achievable for a focused founder-engineer who clears the calendar.

If you slip, drop in this order: M6 → M7 (CI) → H9 (voice input QA) → H4 (tier-aware call limit) → H1 (frontend timeout flip).

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

Total: **27 subsystems** audited end-to-end. Findings: **24 BLOCKERs**, **12 HIGH-RISK**, **10 MEDIUM**, **27 confirmed-safe**.

---

## Sources

- `LAUNCH_CHECKLIST_JUNE_1.md` (initial broad checklist, May 10)
- `LAUNCH_AUDIT_PrecisShowMVCFanout.md` (deep audit #1, May 12)
- `YDJ_PostGoLive_PolishBacklog.md` (founder's pre-go-live sweep notes, May 8)
- `CLAUDE.md` (project doc)
- All handler files under `functions/api/` and library files under `functions/lib/`
- `firestore.rules`
- Frontend: `src/services/aiService.js`, `src/components/AICoaching/*.jsx`
