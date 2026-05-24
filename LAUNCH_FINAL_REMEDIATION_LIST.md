# YDJ Final Pre-Launch Remediation List

**Audit complete:** 2026-05-12 · **Launch:** 2026-06-01 · **Last status update:** 2026-05-24
**Items shipped:** 38 of 50 · **Effort remaining:** ~2 hours over ~8 days

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
- ✅ B15 — Webhook event-ID idempotency (`stripeWebhookEvents/{event.id}` ledger, status-based skip, 90d `expiresAt` Firestore Timestamp, TTL policy `ACTIVE` 2026-05-18, deployed live)

**Monitoring & alerting** — 2026-05-18
- ✅ B18 — Cloud Function error-rate alert (>5 ERROR / 15 min across 22 monitored functions) + Stripe webhook failures alert; both routed to verified `barb@yourdressagejourney.com` notification channel via `scripts/setup-monitoring.sh`
- ✅ B22 — Spend alerts across all three providers: GCP Cloud Functions $100/mo and Firestore $50/mo budgets at 50/80/100% (via setup-monitoring.sh); Anthropic API usage limit and Stripe billing thresholds configured in their respective provider dashboards

**Anthropic API key rotation** — 2026-05-18
- ✅ B20 — Production-tier key created (`ydj-production-2026-06-01`), set as Firebase secret, deployed, smoke-tested; prior key disabled (scheduled for deletion 2026-06-08 — logged in `docs/monitoring.md`)
- ✅ B21 — UptimeRobot monitors live for Frontend, Functions health, Stripe webhook (Stripe monitor's 405 false-positives mitigated by pausing or relying on B18 alert + Stripe dashboard)

**Coaching panel visibility & timeout alignment** — 2026-05-18 (commit `67daa5c`)
- ✅ B19 — `users/{uid}/lastRegenError/{output}` written on regen failure + cleared on success across all 5 handlers (`coaching` / `journeyMap` / `grandPrixThinking` / `physicalGuidance` / `dataVisualizations`); rider-visible `RegenErrorBanner` wired into all 5 panels; `firestore.rules` locks the doc to read-only for the owner with no client write. Skips budget-exhaustion cases that already surface their own banner.
- ✅ H1 — Frontend timeouts in `aiService.js` bumped 300s → 540s (Journey Map / GPT / Physical / DataViz) so the client no longer aborts on a regen that the backend successfully completed.
- ✅ H2 — `getMultiVoiceCoaching` timeoutSeconds bumped 120 → 240s on both frontend (`aiService.js`) and backend (`functions/index.js`); covers `getQuickInsights` since it routes to the same Cloud Function.
- ✅ M12 (new) — `FreshnessStrip` shows "Based on data through {date} · N new rides since · [Refresh now]" on Multi-Voice + Journey Map panels; hides on same-day cache. Pure visibility hint — no cache or threshold-logic changes.

**Regen pipeline hardening** — 2026-05-17 (commit `5525c98`)
- ✅ B3 — `runRegeneration` self-rerun capped at `depth >= 2` ([functions/api/dataTriggeredRegeneration.js:225](functions/api/dataTriggeredRegeneration.js#L225)) so a rapid logger or stuck trigger can't burn the function's 540s budget on recursion; data catches up on next trigger.
- ✅ M3 — Budget-exhaustion isolation: when a per-output handler throws a budget-exceeded error the pipeline loop `break`s instead of churning through remaining handlers that would hit the same cap; still falls through to the completion path so the run is recorded ([dataTriggeredRegeneration.js:199-202](functions/api/dataTriggeredRegeneration.js#L199-L202)).
- ✅ M4 — `silentCanAccess` denial path now resolves any stale `in_progress` `generationStatus` as `skipped` (with reason) instead of leaving frontend progress polls hanging forever; same defensive sweep added at the cooldown-skip site. `completeGeneration` accepts `{skipped, skippedReason}` to distinguish a no-op close-out from a true completion.

**First Light perf** — 2026-05-XX (commit `8f1b9ad`)
- ✅ H6 — `firstLight.graduate` trigger uses `count()` aggregation instead of reading every debrief doc on each fire ([functions/api/firstLight.js:490](functions/api/firstLight.js#L490)); avoids O(n) reads on every new debrief/reflection for graduated-or-soon-to-graduate riders.

**AI-field tamper protection** — 2026-05-18 (commit `a69d038`, deployed live)
- ✅ H12 — Firestore update rules on `microDebriefs` and `freshStarts` use `diff().affectedKeys().hasAny([...])` to reject any client write that touches AI-written fields (`empatheticResponse`, `empatheticResponseGeneratedAt`, `riderState`/`voiceUsed` on microDebriefs, `cacheAgeAtSubmission`, `cacheBandAtSubmission`, `empatheticResponseError`). Cloud Functions unaffected — admin SDK bypasses rules. Read/create/delete unchanged.

**Event Planner step hardening** — 2026-05-20 (commit `b5b0142`)
- ✅ B8 — Event Planner Steps 2–4 now match Step 1's hardening: per-step Firestore cache keyed by `stepKey(N)` with `currentHash` guard so a mid-flow reload skips redundant Claude calls ([eventPlanner.js:411](functions/api/eventPlanner.js#L411), [L482](functions/api/eventPlanner.js#L482)); in-flight `tryAcquireLock` / `releaseLock` per step returning `inFlightResponse` short-circuit so a double-click can't double-bill ([L425](functions/api/eventPlanner.js#L425), [L496](functions/api/eventPlanner.js#L496), [L589](functions/api/eventPlanner.js#L589)); and TRUNCATED errors caught and rethrown as `HttpsError("resource-exhausted", …)` with step-specific messaging instead of leaking "Failed to extract valid JSON" ([L448-460](functions/api/eventPlanner.js#L448-L460), [L533-545](functions/api/eventPlanner.js#L533-L545), [L616-628](functions/api/eventPlanner.js#L616-L628)). Step 4 still writes the full assembled result to the `cacheKey` doc and updates `generatedPlan` metadata on the prep-plan document.

**Token budgets + past-due lapse** — 2026-05-21 (deployed live)
- ✅ B14 — Data Visualizations migrated to `tokenBudgets`: added `dataviz-pattern-extraction` / `dataviz-goal-mapping` / `dataviz-insight-narratives` SPEC rows (Working trimmed to 6000/3000/3000; Medium+Extended preserve 8192/4096/4096) plus three `TOKENS_DATAVIZ_*` env knobs. Handler now reads `getMaxTokens(...)` per call using `budgetTier` derived from the `enforceCapability` return. Also cleaned up the two remaining authenticated hardcoded sites: `coaching.js` précis and `processLessonTranscript.js` (new tier-flat `lesson-transcript` SPEC row at 5000). Only `firstGlimpse` and `arenaCoaching` still hardcode — both unauthenticated, no tier identity. Deployed: `getDataVisualizations`, `getMultiVoiceCoaching`, `processLessonTranscript`.
- ✅ B17 — Stripe past-due lapse job shipped. `onPaymentFailed` now stamps `pastDueSince` on first transition; `onPaymentSucceeded` clears it via `FieldValue.delete()`. New `stripeLapseJob` daily at 04:00 ET pages users in batches of 50, lapses anyone past_due longer than `PAST_DUE_GRACE_DAYS` (default 14): clears subscription, lapses IC discount if `icStatus==active`, lapses pilot monthly discount if `pilotDiscountActive`. Per-user try/catch + one-line tally summary. Pure `decideOutcome()` exported and covered by 4 `node:test` cases (`functions/test/stripeLapseJob.test.js`). Doc: new "Stripe past-due lapse job" section in `docs/monitoring.md`. Deployed: `stripeWebhook`, `stripeLapseJob`.

**Multi-Voice partial-failure & précis hardening** — 2026-05-22 (deployed live)
- ✅ B4 — Multi-Voice partial-failure stale fallback: when a single voice rejects in the bulk fan-out, [coaching.js:553-585](functions/api/coaching.js#L553-L585) now reads `getStaleCache(..., { voiceIndex, maxAgeDays: 90 })` and surfaces stale content with `_meta.stale: true` + `_meta.failedThisRun: true` (telemetry-only). Error placeholder only emitted when no stale row exists. Rider sees three working voices + one "Updated <date>" voice instead of a red error card next to three healthy ones.
- ✅ B5 — Bulk-path précis generation now acquires the same `coaching_precis` lock the trailing single-voice path uses ([coaching.js:603-630](functions/api/coaching.js#L603-L630)); two concurrent bulk runs (or bulk + trailing) no longer both spend précis tokens. Lock released in `finally`; précis failure caught and logged (non-fatal — voices already returned).
- ✅ H3 — `buildMultiVoicePrecisPrompt` ([promptBuilder.js:2295-2370](functions/lib/promptBuilder.js#L2295-L2370)) substitutes the sentinel `"[ANALYSIS UNAVAILABLE THIS RUN]"` for any missing voice instead of literal `null`, and a new MISSING ANALYSES system-prompt section instructs the model to omit that voice's perspective silently. No-op when all 4 voices succeed.
- Tests: 11 new `node:test` cases across `coaching.partialFailure.test.js` / `coaching.precisLock.test.js` / `promptBuilder.precisMissing.test.js` (require.cache-injection fixture for hermetic handler tests). `npm test` script added to `functions/package.json`. Existing `stripeLapseJob` suite still green.
- Doc: new "Multi-Voice Coaching diagnostics" section in `docs/monitoring.md` covering the `Voice N failed` + stale-serve pairing (B4) and the `Précis lock held — skipping bulk-path précis generation` log line (B5). Deployed: `getMultiVoiceCoaching`.

**GPT trajectory + tier-aware rate limit — Claude Code session 2026-05-22 (B12 + B13 + H4 bundle)**
- ✅ B12 — Trajectory step-1 resume banner (verified wired, added testids + checkResume console.log + unit tests)
- ✅ B13 — `_countL2OpusThisMonth` date-range filter (verified live, composite index confirmed deployed, unit tests added)
- ✅ H4 — Tier-aware daily call limit (Working 30 / Medium 60 / Extended 100 / pilot→Extended) via `getDailyCallLimit` in tierBudgets.js

**Show Planner pre-launch cleanup — 2026-05-23 (deployed live)**
- ✅ B7 — Rolling-12-month show-plan quota enforced on the Medium tier (10/window) using the existing `showPlansCreatedThisYear` counter + `showPlanYearWindowStart` window-start that stripe.js was already seeding. New helper [functions/lib/showPlanQuota.js](functions/lib/showPlanQuota.js) gates EP-1 entry (`enforceShowPlanQuota`) and stamps the per-plan `aiGenerationStartedAt` marker + atomically increments the counter on first generation (`markPlanGenerationStarted`); rollover runs in the same transaction when `now - windowStart ≥ 365d`. Regenerations of an already-counted plan bypass the cap (`aiGenerationStartedAt` doubles as idempotency marker — no double-counting on retries or forced refreshes). Extended/Pilot are unlimited. `SHOW_PLAN_ANNUAL_CAP_MEDIUM` env override lets ops dial the cap without a redeploy. Frontend ([ShowPlanner.jsx](src/components/ShowPlanner/ShowPlanner.jsx#L228-L242)) detects `details.code === 'show_plan_quota_exceeded'`, shows "Upgrade to Extended" link, disables Try Again. Pricing copy `Show Planner (10 shows/year)` retained — now matches the enforcement. **Approach diverged from initial brief** (which proposed Firestore aggregate `count()` over `aiGenerationStartedAt` + calendar-year window) to wire up the pre-existing scaffolding documented in YDJ_Pricing_Tiers_Stripe_Reference.md, avoiding orphan fields.
- ✅ B29 — `TestRequirementsDisplay` import + render restored in [ShowPlanner.jsx](src/components/ShowPlanner/ShowPlanner.jsx#L11) (above the week-chip row). EP-1 movement enrichment + level context now visible to riders; the AI was already generating it (it's just been hitting `accumulated.testRequirements` and being dropped on the floor since the Mar-22 rewrite). Zero new backend cost.
- ✅ B30 — Three layers of defense against FEI movement fabrication: (1) EP-1 prompt no longer instructs the LLM to "structure movements from required_movements data" — now explicitly forbidden to invent numbers ([promptBuilder.js:4292](functions/lib/promptBuilder.js#L4292)); (2) EP-2 geometry guidance level-gated via new `getGeometryReferenceForLevel(levelName)` ([promptBuilder.js:4130](functions/lib/promptBuilder.js#L4130)) so PSG no longer cites 20m circles (it has none), and GP/Inter II add piaffe/passage/tempi geometry; (3) post-EP-3 validator (`validateEP3Movements` in [eventPlanner.js](functions/api/eventPlanner.js)) catches residual hallucinations and retries once with an explicit valid-numbers list injected into the system prompt — logs warn on first failure and error on retry exhaustion (plan still served; not fatal).
- Tests: 37 new `node:test` cases across `showPlanQuota.test.js` (24) / `eventPlannerValidators.test.js` (8) / `promptBuilderGeometry.test.js` (13 + overlap). Total suite: 101 green (74 pre-existing). Build clean.
- Deploy order: `firebase deploy --only firestore:rules` (no rules change but kept order discipline) → `firebase deploy --only functions:getEventPlanner` → `firebase deploy --only hosting`.

**Error-path hardening — 2026-05-24 (deployed live)**
- ✅ H14 — Confirmed `generationLocks/{lockId}` Firestore rule was already in `firestore.rules:258-262` (read access via `lockId.split('_')[0] == request.auth.uid`). Tightened [src/services/weeklyFocusService.js:160](src/services/weeklyFocusService.js#L160) to (a) bail early when `uid` is falsy (pre-auth panel-mount race), (b) silently swallow `permission-denied` errors (expected logout/auth-transition race — caller already gets `null`), (c) demote all other errors from `console.error` → `console.warn` so real Firestore outages stay visible but don't trip B18's error-rate alert. Eliminates the recurring noise that would have fired the launch alert under load.
- ✅ H7 — Wrapped cycle-extension flow in [functions/api/physicalGuidance.js:165-195](functions/api/physicalGuidance.js#L165-L195) and [functions/api/grandPrixThinking.js:300-335](functions/api/grandPrixThinking.js#L300-L335) with try/catch + warning log + fall-through to fresh generation. If `shouldExtendCycle`'s debriefs query, `getStaleCache`, or the follow-up `getCycleState` throws, the rider gets fresh AI output (cost overhead ≤$0.10/case) instead of a hard failure. Warn line `Cycle-extension flow failed for {uid}: {msg}` is the operational signal — repeated hits for the same uid suggest cycle-state corruption.
- ✅ H13 regression guard — Added [functions/test/tokenBudgets.journeyMap.test.js](functions/test/tokenBudgets.journeyMap.test.js) (3 assertions) to prevent `journey-map-synthesis` budgets from silently being walked back from the 2026-05-23 fix (`{working: 4000, medium: 8000, extended: 8000}`).
- Tests: 12 new `node:test` cases across `cycleExtensionErrorHandling.test.js` (9: 3 error-path × 2 handlers + 2 happy-path regressions + 1 console-restore) and `tokenBudgets.journeyMap.test.js` (3). Total suite: 113 green. Build clean.
- Deploy: `firebase deploy --only functions:getPhysicalGuidance,functions:getGrandPrixThinking` + `firebase deploy --only hosting`. Rules deploy skipped — `generationLocks/{lockId}` rule already live.

**Show Planner bi-weekly cron hardening — Claude Code session 2026-05-22 (B10 + B11 bundle)**
- ✅ B10 — Same-day UTC dedup verified in [showPlannerBiweeklyContent.js:222-229](functions/api/showPlannerBiweeklyContent.js#L222-L229); 8 dedup tests added; `_utcDateOnly` hardened to recognize Firestore Timestamp objects (`{_seconds}` and `.toDate()`-shaped) as a defensive guard against any legacy entry that wasn't ISO-encoded.
- ✅ B11 — Plan-count + USD spend caps verified; `BIWEEKLY_ESTIMATED_USD_PER_PLAN` made env-overridable so the USD cap math can be retuned without a redeploy; 50 lines of duplicated cap-check + loop logic extracted to a shared `_runFire` helper (test-only injection seams for `capOverrides` / `_queryActivePlans` / `_processPlan`); aborted runs now also fire a Sentry warning event so the founder doesn't have to grep logs. Env knobs documented in `.env.example`. 7 cap tests added covering both caps, skipped-vs-generated tally math, mid-loop throw recovery, planId collection, empty-plan list, and abort-boundary planId capture.
- All 52 `node:test` cases green (15 new + 37 pre-existing). Deploys via the existing `firebase deploy --only functions:showPlannerBiweeklyContent,functions:runShowPlannerBiweekly` command — flag still defaults OFF.

**Cleared from BLOCKER count: 25 of 28 (B29 added then downgraded to M14 on 2026-05-18). Cleared from HIGH-RISK: 9 of 14 (H13 + H14 added 2026-05-18; H7 / H13 / H14 closed 2026-05-24).**
**The two scariest classes of bug — silent fan-out failure and iOS save loss — are now neutralized. As of 2026-05-24, every code BLOCKER and code HIGH-RISK is closed except B9 (deploy gate awaiting validation run).**

---

## 🎯 WHAT'S LEFT (work this list, top to bottom)

> **🔥 = BLOCKER (must ship before June 1)** · **⚠️ = HIGH-RISK (will embarrass in week 1)** · **➖ = MEDIUM (post-launch ok)**
> Time estimates are total engineering hours; budget realistic chunks against your day.

### This week (May 16–17): finish the BLOCKER tier in code

- ~~H13~~ — shipped 2026-05-23 (`journey-map-synthesis` bumped to `{working: 4000, medium: 8000, extended: 8000}`); regression guard added 2026-05-24
- ~~H14~~ — shipped 2026-05-24 (rules already deployed; `readInflightLock` tightened to silently swallow `permission-denied` and bail on pre-auth `uid`)
- 📧 **Pilot conversion email Round 1** + apology to lesson-notes user (1.5h)

**Subtotal this week: 2.5h.** B3 (1h) + H6 (1h) shipped 2026-05-17; B19 (4h) + H1 (0.5h) + H12 (1h) shipped 2026-05-18 — see WHAT'S SHIPPED.

### Next week (May 18–23): coaching/show-planner BLOCKERs + AI hardening

- ~~B7~~ — shipped 2026-05-23 (rolling-12-mo quota enforced via `showPlansCreatedThisYear` counter; pricing copy retained, now matches enforcement)
- ~~B8~~ — shipped 2026-05-20 (Event Planner Steps 2–4 per-step cache + in-flight locks + truncation handling, commit `b5b0142`)
- ~~B10~~ — shipped 2026-05-22 (bi-weekly cron same-day dedup)
- ~~B11~~ — shipped 2026-05-22 (bi-weekly cron global spend cap)
- ~~B12~~ — shipped 2026-05-22 (GPT trajectory step 1 resume banner)
- ~~B13~~ — shipped 2026-05-22 (`_countL2OpusThisMonth` date-range filter)
- ~~H4~~ — shipped 2026-05-22 (tier-aware daily call limit)
- 📧 **Pilot conversion email Round 2** (1h)

**Subtotal next week: 13.5h.** H2 (1h) shipped alongside H1 on 2026-05-18. B8 (4h) shipped 2026-05-20. B14 (1.5h) + B17 (2h) shipped 2026-05-21. B4 (3h) + B5 (1h) + H3 (1h) + B12 (2h) + B13 (1h) + H4 (1h) + B10 (1h) + B11 (1h) shipped 2026-05-22 — see WHAT'S SHIPPED.

### Launch week (May 24–31): QA, deploy hardening, comms

- ~~B29~~ — shipped 2026-05-23 (TestRequirementsDisplay restored above week-chip row)
- ~~B30~~ — shipped 2026-05-23 (EP-1 prompt + EP-2 level-gated geometry + EP-3 movement validator with 1 retry)
- 🔥 **B9** — Flip `SHOW_PLANNER_BIWEEKLY_ENABLED=true` after one validation run (1h)
- 🔥 **B23** — ToS / Privacy / Refund finalized & published (external — lawyer)
- 🔥 **B24** — End-to-end live-mode dry run (4h)
- ~~H7~~ — shipped 2026-05-24 (cycle-extension flow wrapped in try/catch + warn + fall-through in both `physicalGuidance.js` and `grandPrixThinking.js`)
- ⚠️ **H8** — iOS Safari QA pass — full app on real iPhone (4h)
- ⚠️ **H9** — Voice input QA on iOS + Android (1.5h)
- ⚠️ **H10** — Pilot conversion email Round 3 (1h)
- ⚠️ **H11** — Support runbook + canned responses (2h)
- ➖ **M6** — 3 high-leverage unit tests (defer if tight) (4h)

**Subtotal launch week: 13.5h** (or 9.5h with M6 deferred). H7 (1h) shipped 2026-05-24 — see WHAT'S SHIPPED.

### Launch day (June 1)

- Morning: final smoke test on production
- Send launch announcement; post to social
- Watch dashboards: Sentry, Stripe, Firebase Functions, Anthropic, UptimeRobot
- **Be at the keyboard. Don't schedule anything else.**

### Week 1 post-launch (June 2–8) — backlog (not blocking)

- ➖ **M15 (NEW 2026-05-18)** — Wider token-budget audit. H13 exposed that `journey-map-synthesis` quietly truncates trailing JSON fields when rider data grows. Same failure mode is silent for any output whose budget is now close to typical output size. Top suspects in `functions/lib/tokenBudgets.js`: `journey-map-narrative` (2000), `physical-awareness` (5000 for 4-week program), `gpt-l2` (4000). Audit by sampling actual `usageLogs` `outputTokens` vs. budget; if any output is regularly within 10% of budget for active riders, bump the budget. ~1h post-launch.
- ➖ **M14 (NEW, downgraded from B29 on 2026-05-18)** — useFormRecovery auto-mounts the form on list-view entry when a draft exists, confusing users who think they're locked into the form rather than being offered recovery. Symptom resolved naturally for the original iPhone reporter (her drafts cleared) but the code path will recur for any user with stale drafts. Fix: move recovery from form-mount UX to a list-view banner ("You have an unfinished draft — resume?"). Touches `useFormRecovery.js` + 5 list pages. ~1.5h.
- ➖ **M13 (NEW)** — "Moment worth keeping" dashboard card not visibly updating. **Diagnosed 2026-05-18 as cause (a):** picker is correctly selecting per design but lands on the same entries due to pool dynamics. Fix: modify `selectCelebration` in `weeklyFocusRefresh.js` to exclude reflectionIds chosen in the last 2–4 weeks before picking this week's. Stays deterministic (cron-fairness safe) and forces visible rotation. ~1h.
- ➖ **M11 (NEW)** — Vite chunk-size warning. Lazy-load Insights route + manualChunks for recharts/firebase. Improves new-user mobile first-load. (1.5h)
- ➖ **M1** — Add test database hash to eventPrep cache key
- ➖ **M2** — Tighten `getStaleCache` `maxAgeDays: 90` for coaching to something tighter
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

**Pace check:** ~3.1 hours/day average. The This-Week list is heavier per-day because the 2-day window is short — if you can clear B3, B20, B21 today (2 hours of mostly-config work), the rest of the week is pure code at a comfortable pace.

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

**B29 (NEW — 2026-05-23). Show Planner stopped rendering EP-1 test movements after Mar-22 rewrite — paid LLM output discarded.**
Files: `src/components/ShowPlanner/ShowPlanner.jsx`, `src/components/EventPrep/EventPlannerOutput.jsx`, `src/components/EventPrep/TestRequirementsDisplay.jsx`. **Root cause confirmed 2026-05-23:** commits `0375a7e` (Show Planner rewrite) + `56831db` (route consolidation that retired `ShowPrepPlan.jsx`) shipped a new `ShowPlanner.jsx` that dropped imports of `EventPlannerOutput` and `TestRequirementsDisplay`. The new page still calls EP-1 and stores `accumulated.testRequirements` (ShowPlanner.jsx:208) — so the full LLM-enriched movements list (with per-movement `common_errors`, `geometry_notes`, `scoring_tips`) is still being generated and paid for, then never rendered. Reproducible by inspecting any cached plan: `testRequirements.tests[0].movements` is present in Firestore but absent from the UI. The "Test Reference" sidebar shows the static gait-categorized list from `src/services/testDatabase.js`, which is not the same surface and is missing the rich per-movement notes.
**Fix:** Re-add the import and render `{accumulated.testRequirements && <TestRequirementsDisplay data={accumulated.testRequirements} />}` to `src/components/ShowPlanner/ShowPlanner.jsx` above the preparation-plan render. Component still exists, still works, data is already in state. **Effort: 0.25h.**

**B30 (NEW — 2026-05-23). Show Planner generates fabricated/wrong movement references for FEI tests (e.g., "Movement 10 down centerline in collected trot" for PSG; 20m-circle prep advice for a test that has no 20m circles).**
File: `functions/lib/promptBuilder.js`. Two compounding prompt bugs hit hard once `0375a7e` started correctly resolving the level to PSG (rather than falling back to Training):
- **Line 4292** explicitly instructs the LLM: *"For FEI tests without a full movement sequence, structure the movements field from the required_movements data grouped by gait."* The model knows movement 10 carries a coefficient (`coefficient_movements: [5, 10, 13, 14, 18, 20]`) but has no idea what movement 10 actually is, so it invents one. Real PSG movement 10 is a half-pass right at EG/G.
- **Lines 4349–4355** hardcode 20m-circle geometry guidance for every level with no level gate. PSG has no 20m circles (smallest figures are 8m voltes). Line 4353's "accuracy affects both individual movement scores AND collective marks" lands verbatim in the rendered card.
**Fix:** (a) Replace line 4292 with `"For FEI tests, reference only movements present in the supplied test data. Do not invent movement numbers or descriptions. If specific movement detail is unavailable, refer to movement types rather than numbered movements."` (b) Level-gate lines 4349–4355: Intro/Training/First get 20m-circle guidance; Second/Third get 10m circles; Fourth+ get voltes/pirouettes/tempi geometry. (c) Add a post-EP-3 validator that asserts every movement number in EP-3 prep cards exists in `testRequirements.tests[0].movements`; retry once on failure. **Effort: 2h** (0.25h for a+b, 1.75h for c).

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
| ~~B8~~ | ~~Event Planner step caching + locks + truncation~~ — shipped 2026-05-20 | — |
| ~~B10~~ | ~~Bi-weekly cron same-day dedup~~ — shipped 2026-05-22 | — |
| ~~B11~~ | ~~Bi-weekly cron global spend cap~~ — shipped 2026-05-22 | — |
| ~~B12~~ | ~~GPT trajectory step 1 resume banner~~ — shipped 2026-05-22 | — |
| ~~B13~~ | ~~`_countL2OpusThisMonth` date-range filter~~ — shipped 2026-05-22 | — |
| ~~B14~~ | ~~Data Viz `maxTokens` → tokenBudgets~~ — shipped 2026-05-21 | — |
| ~~B17~~ | ~~14-day past-due lapse scheduled job~~ — shipped 2026-05-21 | — |
| H2 | Multi-Voice backend timeout 120 → 240s | 1 |
| H3 | Précis prompt verification 3-of-4 path | 1 |
| ~~H4~~ | ~~Tier-aware daily call limit~~ — shipped 2026-05-22 | — |
| H10 | Pilot conversion email Round 2 (May 19) | 1 |

**Subtotal: 15.5h** (B14 + B17 shipped 2026-05-21; B10 + B11 shipped 2026-05-22)

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
- **Week 2: 17.5h** — coaching + show planner + AI hardening (B14 + B17 shipped 2026-05-21)
- **Week 3: 21h** (or 17h with M6 deferred) — QA + deploy hardening + comms

**Grand total: 58.5–62.5 hours over 14 days = ~4.2 hours/day.** Tight. Still achievable for a focused founder-engineer who clears the calendar, but every weekday now matters.

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
