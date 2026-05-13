# Pre-Launch Deep Audit: Précis · Show Planner · Coaching Voices · Bulk Fan-Out

**Audit date:** 2026-05-12 · **Launch:** 2026-06-01 · **Days remaining:** 20

This audit walks the four subsystems that surfaced problems today, reads the actual code (not just docs), and flags every launch risk severe enough to embarrass YDJ in week 1. Conservative severity bar: anything that produces wrong output, silently fails, costs more than expected, or leaves a new user stuck = **BLOCKER**.

There is also `YDJ_PostGoLive_PolishBacklog.md` from May 8 documenting three known polish items. **Two of those three should be elevated to launch BLOCKERs** (see B8 and B9 below). Items already noted there are referenced rather than re-derived.

---

## Executive Summary

The four subsystems are **architecturally sound but operationally fragile at launch scale.** The biggest danger isn't bad logic — it's silent failure modes that look fine in pilot (12 riders) and break invisibly at 100+ users. Specifically:

- **The weekly fan-out has a hard 200-user ceiling and a 120-second timeout** that will be invisible until you cross those thresholds, and then will silently leave riders unrefreshed.
- **The Show Planner promises "10 shows/yr" on the pricing page but enforces no usage cap** — Medium-tier users can generate unlimited plans until their dollar budget bites.
- **Multi-Voice partial-failure UX shows error placeholders instead of falling back to yesterday's good content** — this is the most likely new-user "broken app" perception in week 1.
- **Show Planner Bi-Weekly cron is OFF by default** (env-flag gated to `false`). If you forget to flip it on, no plans get bi-weekly content. Easy miss.
- **Steps 2–4 of the Event Planner have no caching, no in-flight lock, and no truncation handling** — refresh mid-flow burns tokens and loses work.

The précis subsystem itself is **well-implemented and recent** — it has lock guards, idempotency checks, fail-safe behavior on errors, and a thoughtful trailing-generation path for the progressive-render flow. Its risks are mostly downstream consumer fallback behavior and prompt-builder edge cases.

The fixes below are mostly small (lines of code, not architecture). The blockers are estimated at **~16–20 hours of focused engineering work** plus QA. That fits comfortably in 20 days, but only if you start this week.

---

## BLOCKERS — Must fix before June 1

### B1. `weeklyFocusRefresh` silently truncates at 200 users

**File:** `functions/api/weeklyFocusRefresh.js:133`
```js
const listResult = await auth.listUsers(200);
```
**Failure mode:** Firebase Auth `listUsers()` returns at most `maxResults` users. Once you cross 200 users (achievable in IC cohort + a handful of paid signups), the 201st user onward never gets a Monday weekly snapshot. They see a stale snapshot indefinitely. **No error, no log, just silence.**

**Fix:** Paginate using `pageToken`. Either iterate to completion (acceptable for ≤2k users) or chunk into a Pub/Sub queue.

```js
let pageToken;
do {
  const res = await auth.listUsers(1000, pageToken);
  for (const user of res.users) { /* process */ }
  pageToken = res.pageToken;
} while (pageToken);
```

**Why a blocker:** This is the most embarrassing kind of bug — works in pilot, fails silently in launch.

---

### B2. `weeklyFocusRefresh` has a 120-second timeout and no resume mechanism

**File:** `functions/api/weeklyFocusRefresh.js` (config in `functions/index.js:228`)

Per-user processing reads ~8 cache rows + ~2 Firestore queries + 1 write — call it ~150 ms/user under load. At 100 users that's 15 s, at 500 users that's 75 s, at 1000 users that's 150 s — past the 120 s budget. When the timeout fires mid-batch, the unprocessed users don't get retried until next Monday.

**Fix:** Either bump timeout to 540 s **and** paginate (B1), or split into a fan-out where the scheduled function enqueues per-user jobs to Pub/Sub and a worker function processes each. Pub/Sub fan-out is cleaner; bumping timeout is the smaller change.

**Why a blocker:** Compounds B1. Even if you paginate, the loop will time out at scale.

---

### B3. Show Planner promises "10 shows/yr" but enforces no usage cap

**Files:** `functions/lib/entitlements.js`, `functions/api/eventPlanner.js`, `src/services/subscriptionService.js`

`CAPABILITIES.generateShowPrepPlan` is a boolean — the user either has it or doesn't. There is **no per-user count of show plans generated this year, no monthly cap, nothing**. Marketing copy on the pricing page says "10 shows/yr" for Medium and "unlimited" for Extended; the backend treats both identically. A Medium subscriber could generate 100 plans before the $40/mo dollar cap eventually bites (each plan is ~$0.20–0.50).

**Fix options:**
1. **Enforce in code** — track plan count per calendar year on the user doc; reject EP-1 calls when count ≥ 10 for Medium tier.
2. **Quietly drop the marketing claim** — change pricing page copy from "Show Planner (10 shows/yr)" to "Show Planner (typical use)", remove the cap promise.

Option 2 is the smaller change for launch. Option 1 is the correct long-term answer.

**Why a blocker:** A Medium user who generates 11 shows and reads the pricing page later has grounds for a refund.

---

### B4. Event Planner Steps 2–4 have no cache, no in-flight lock, no truncation handling

**File:** `functions/api/eventPlanner.js:296–411`

Step 1 has solid cache + truncation logic. Steps 2–4 are bare API calls:
- A page reload mid-flow re-runs all completed steps from scratch.
- Two simultaneous client requests (e.g., user clicks "Generate" twice) fire two parallel pipelines burning tokens twice.
- Truncation in Steps 2/3/4 throws unhelpful "Failed to extract valid JSON" errors instead of the helpful `RESOURCE_EXHAUSTED` Step 1 returns.
- Cache is only written at Step 4 — abandon at Step 3, lose Steps 2 + 3 tokens (wasted spend).

**Fix:**
- Add `cacheKey` lookup at the top of Steps 2/3 that checks for a per-step cache row keyed on `(planId, dataSnapshotHash, eventPrepHash, step)`. Write that cache row at the end of each step.
- Add an in-flight lock on `(uid, planId, step)` so concurrent calls don't double-bill.
- Wrap Steps 2/3/4 `callClaude` in the same `TRUNCATED` try/catch Step 1 has.

**Why a blocker:** Show Planner is the marquee Medium-tier feature. A user clicking Generate twice and getting double-billed against their monthly cap is an immediate refund.

---

### B5. Multi-Voice partial-failure UX shows error placeholders instead of stale fallback

**Files:** `functions/api/coaching.js:549–552`, `src/components/AICoaching/MultiVoicePanel.jsx:436–438`, `CoachingVoiceCard.jsx:56`

When a single voice fails (non-budget reason — transient Anthropic error, rate limit, malformed JSON), the bulk handler returns:
```js
voices[i] = { _error: true, _errorMessage: "This coaching voice encountered a temporary issue. Try refreshing." }
```
The frontend renders a tab with a red error state and that message. **Yesterday's perfectly good cached version of that voice is ignored.**

`coaching.js:400–414` already has a `loadStaleCoaching()` helper that does the right fallback, but it's only invoked when *budget* is exceeded or *all four* voices fail. The 1-of-4 / 2-of-4 / 3-of-4 partial failure path skips it.

**Fix:** Inside the partial-failure branch (around line 547), per-failed-voice, attempt `getStaleCache(uid, OUTPUT_TYPE, { voiceIndex: i, maxAgeDays: 90 })` and serve that with `{ _meta: { stale: true, recoveredFromError: true } }` instead of an `_error` placeholder. Only render the "temporary issue" message when no stale cache exists.

**Why a blocker:** This is the most likely week-1 user complaint pattern. New users hitting a single transient Anthropic error will see "your coach is broken" instead of "here's yesterday's coaching, refreshing soon."

---

### B6. `SHOW_PLANNER_BIWEEKLY_ENABLED` defaults to `false`

**File:** `functions/api/showPlannerBiweeklyContent.js:45–50`

The bi-weekly content cron is registered but the handler short-circuits on the env flag. Default value is `"false"`. **If the launch deploy doesn't explicitly set this to `true`, no plans get bi-weekly check-ins.**

**Fix:** Either flip the default to `true` after a manual validation run on the live project, OR add explicit "set this to true at launch" to the deploy checklist (and add a `firebase functions:secrets:set` line to a deploy script). I'd recommend the latter — defaulting OFF is a good safety posture, you just need to remember to flip it.

**Why a blocker:** Show Planner UX promises bi-weekly check-ins. If they never arrive, refund risk.

---

### B7. `dataTriggeredRegeneration` recursion has no depth limit

**File:** `functions/api/dataTriggeredRegeneration.js:191–195`
```js
if (needsRerun) {
  console.log(`[dataRegen] ${uid}: rerun requested — starting new cycle`);
  await runRegeneration(uid, outputTypes, "data_change");
}
```
If `needsRerun` keeps returning true (data continues to arrive during regen), this recurses indefinitely until the function timeout. With 540 s timeouts on 4-output pipelines that each take 3+ minutes, this can chew through 8–10 minutes and a lot of tokens before dying.

**Fix:** Add a depth counter argument to `runRegeneration(uid, outputTypes, triggeredBy, depth = 0)`, bail with a log line when `depth >= 2`, schedule a follow-up trigger via Pub/Sub or a debounced re-trigger if more data accumulated.

**Why a blocker:** Even if it never fires in pilot, a single anomalous user hitting this in launch week is a budget surprise.

---

### B8. No Cloud Function error-rate alerting (already in polish backlog)

Already documented in `YDJ_PostGoLive_PolishBacklog.md` Item #1 as a 1-hour Cloud Console config task. **Elevate to launch BLOCKER.** Without this, an Anthropic incident plus a stuck pipeline is invisible to Barb until a user complains.

**Action:** Configure Cloud Monitoring alert: `severity=ERROR` rate > 5%/15min on `getMultiVoiceCoaching`, `getJourneyMap`, `getGrandPrixThinking`, `getDataVisualizations`, `getPhysicalGuidance`, `getEventPlanner`, **plus** `weeklyFocusRefresh`, `showPlannerBiweeklyContent`, `onDebriefCreated`, `onReflectionCreated`. Email or SMS the founder.

---

### B9. No `lastRegenError` rider-visible banner (already in polish backlog)

Already documented in polish backlog Item #2 as ~3 hours. **Elevate to launch BLOCKER for the Multi-Voice + Physical Guidance + GPT panels at minimum.** Without it, a user whose regen fails after navigating away has zero in-product signal that anything went wrong — they just see stale data forever.

**Action:** Per the polish backlog spec — write `lastRegenError` to user doc on regen catch, render a "tap to retry" banner on panel mount when it exists and is < 24h old.

---

## HIGH-RISK — Likely to embarrass in week 1

### H1. `refreshWeeklyFocusSnapshotSection` not in try/catch

**File:** `functions/api/coaching.js:613`

If snapshot extraction throws (e.g., a malformed cached voice payload, a Firestore transient), the entire Multi-Voice handler throws — even though all four voices succeeded and were cached. Frontend sees a failure for an output that actually succeeded.

**Fix:** Wrap in try/catch, log error, continue. The snapshot is a side-extract and should never gate the main response.

---

### H2. Précis lock collision between bulk path and concurrent bulk

**File:** `functions/api/coaching.js:539-540` (bulk releases voice lock before line 603 précis call)

The bulk path acquires the `coaching` voice lock at line 492, releases it at line 539 (in `finally`), then runs the précis at line 603 **without** acquiring the dedicated `coaching_precis` lock that the trailing single-voice path uses (line 244). Two near-simultaneous bulk requests → both run précis → last-writer wins on the cache row. Wasted tokens.

**Fix:** Wrap the précis block (lines 594–607) in `tryAcquireLock(uid, "coaching_precis")` / `releaseLock` like the trailing path does. Add idempotency check on précis cache hash before generating.

---

### H3. Show Planner bi-weekly cron uses `arrayUnion` without dedup

**File:** `functions/api/showPlannerBiweeklyContent.js:209–215`
```js
await planRef.update({
  biweeklyContent: FieldValue.arrayUnion({
    text, generatedAt: ..., source: "scheduled"
  }),
});
```
`arrayUnion` deduplicates by deep equality of the entire object, but `generatedAt` is a fresh timestamp on every fire, so **duplicates are never detected**. If Barb manually re-runs `runShowPlannerBiweekly` on the same day, the plan gets a duplicate check-in. If the scheduled cron retries on transient failure, same problem.

**Fix:** Before the `arrayUnion`, read the doc and check whether a `biweeklyContent` entry exists with `generatedAt` within the same calendar day. Skip if so.

---

### H4. Show Planner bi-weekly cron has no per-fire spend cap

**File:** `functions/api/showPlannerBiweeklyContent.js:230–247`

Sequential per-plan processing. With 50 active plans across all users, that's 50 Sonnet calls in one cron fire. At ~$0.05/call that's $2.50 — fine. At 500 plans that's $25 in one fire, no cap enforced. The per-user dollar cap doesn't help because each plan belongs to a different user.

**Fix:** Add a global ceiling: track total cost in cron fire, abort with log when crossing (e.g.) $50. Configurable env var.

---

### H5. Précis prompt context includes failing voices

**File:** `functions/api/coaching.js:594–606`

When 1 voice fails (failedVoices.length === 1), précis still runs. The précis prompt is fed only the 3 successful voice JSONs (line 597 `if results[i].status === "fulfilled"`). But the prompt template (`buildMultiVoicePrecisPrompt`) probably expects all 4 voice keys present. **If it doesn't handle the missing key gracefully, the précis will be skewed or broken.**

**Action:** Verify `buildMultiVoicePrecisPrompt` in `functions/lib/promptBuilder.js` handles missing voice keys (3 of 4) without crashing or producing a malformed prompt. If it doesn't, either skip précis for partial failures (raise the threshold to `failedVoices.length === 0`) or update the prompt to handle gaps.

---

### H6. Daily 40-call user limit is tight for power users

**File:** `functions/lib/claudeCall.js:32`
```js
const DAILY_CALL_LIMIT = 40;
```
A Multi-Voice generation = 5 calls (4 voices + insights), précis = 1, Journey Map = 3, Data Viz = 3, GPT mental = 1, Physical Guidance = 2, Show Planner = 4. That's **19 calls** for a single full Insights page refresh of all outputs. Two refreshes in one day + a couple of show planner step-throughs = exhausted. New users exploring the app on day 1 can hit this.

**Fix options:** raise to 60, or make tier-aware (Working 30, Medium 60, Extended 100). Document the rationale either way.

---

### H7. New-user precis race: micro-debrief / Fresh Start fire before precis exists

**Files:** `functions/api/microDebrief.js`, `functions/api/freshStart.js`, `functions/api/coaching.js`

A brand-new user's first micro-debrief fires `onMicroDebriefSubmit` immediately — before any Multi-Voice generation has run, before a précis exists. Spec says consumers fall back to "no cached coaching context" gracefully. **Verify this fallback path produces a sensible response, not a crash or generic "I don't know who you are" message.**

**Action:** Manually test a brand-new account: signup → 1 debrief → confirm the empathetic response is reasonable without a precis. Repeat for Fresh Start.

---

### H8. `weeklyFocusRefresh` silently swallows GPT/Physical advance errors

**File:** `functions/api/weeklyFocusRefresh.js:147–150`
```js
await Promise.all([
  advanceWeekAndExtract(uid, "gpt").catch(() => ({ advanced: false, currentWeek: 1 })),
  ...
]);
```
A corrupted cycle doc throws, the catch resets to "currentWeek: 1" silently. **The user's cycle pointer just rolled back to week 1 with no log.** This is invisible until they wonder why their week-3 program is showing week-1 content.

**Fix:** At minimum, log the error before swallowing. Consider writing a `lastCycleAdvanceError` field to the user doc so it's surfaced.

---

## MEDIUM — Worth fixing post-launch but before scaling

- **M1.** `eventPlanner.js` cache key omits the test database hash. If you update `comprehensive_dressage_test_database.json`, cached plans don't invalidate. Acceptable since DB changes are rare, but document the cache-bust requirement.
- **M2.** `getStaleCache` `maxAgeDays: 90` for stale fallback in coaching is generous. A user whose voices are 90 days old probably needs a fresh generation, not stale serving.
- **M3.** `dataTriggeredRegeneration.runRegeneration` runs handlers sequentially and doesn't isolate budget exceptions — a budget-exhausted user mid-pipeline still attempts subsequent outputs (which will also fail). Detect budget exhaustion in the catch (line 169-173) and abort the rest of the pipeline.
- **M4.** Cycle-state `silent fail` on `silentCanAccess` (line 109): silent skip is correct but never updates `generationStatus`, so the frontend's progress poll could hang. Set status to `skipped` on capability denial.
- **M5.** `repairTruncatedJSON` is impressive but quietly produces partial outputs. A truncated voice JSON repaired into a half-empty schema will look fine to the cache write but render as a sparse coaching tab. Add a sanity check on required fields after repair.

---

## Operational Observations

1. **Reference docs are excellent** — every system has a v3+ spec. The recent `YDJ_PostGoLive_PolishBacklog.md` proves Barb is already running a deliberate pre-launch reliability sweep. Most of the remaining issues are gaps between "spec exists" and "code matches spec at scale."

2. **Recent reliability commits** (referenced in polish backlog: `91cf1d9`, `bc25132`, `e0b70eb`, `267c912`, `ea1d727`, `7ebfd33`) show a clear pattern of timeout and snapshot-desync fixes. The codebase is being actively hardened. The fan-out scaling issues (B1, B2) feel like the next layer of that work.

3. **Diagnostic scripts exist** under `scripts/`: `inspectRegenState.js`, `triggerPhysicalRegen.js`, `testTrajectoryChunked.js`, etc. These are great launch-week tools — make sure Barb knows them cold by June 1. Add a one-page runbook.

4. **No `*.test.js` files anywhere** in the codebase (confirmed by earlier audit). For launch, the highest-leverage 3 tests would be:
   - Unit test for `coaching.js` partial-failure stale fallback (B5)
   - Unit test for `weeklyFocusRefresh.js` pagination (B1)
   - Unit test for `eventPlanner.js` step caching + idempotency (B4)

---

## Recommended Action Plan (20 days)

**Week 1 (May 12–17) — Land the blockers:**
| # | Item | Est. hours | Owner |
|---|---|---|---|
| B1 | `weeklyFocusRefresh` pagination | 2 | Engineering |
| B2 | `weeklyFocusRefresh` timeout / Pub/Sub fan-out | 4 | Engineering |
| B5 | Multi-Voice partial-failure stale fallback | 3 | Engineering |
| B7 | `dataTriggeredRegeneration` depth limit | 1 | Engineering |
| B8 | Cloud Function error-rate alerting | 1 | Ops |
| B9 | `lastRegenError` field + banner | 3 | Engineering |
| H1 | `refreshWeeklyFocusSnapshotSection` try/catch | 0.5 | Engineering |
| H2 | Précis lock for bulk path | 1 | Engineering |

**Total: ~15.5 hours**

**Week 2 (May 18–23) — Land remaining blockers + highs:**
| # | Item | Est. hours |
|---|---|---|
| B3 | Show Planner usage cap (or copy fix) | 2 |
| B4 | Event Planner step caching + locks | 4 |
| H3 | bi-weekly cron same-day dedup | 1 |
| H4 | bi-weekly cron global spend cap | 1 |
| H5 | précis prompt verification | 1 |
| H6 | tier-aware daily call limit | 1 |
| H7 | new-user precis-race manual test | 1 |
| H8 | cycle-advance error logging | 0.5 |

**Total: ~11.5 hours**

**Week 3 (May 24–31) — QA + deploy hardening:**
| # | Item | Est. hours |
|---|---|---|
| B6 | flip `SHOW_PLANNER_BIWEEKLY_ENABLED=true` after one validation run | 1 |
| - | Write 3 high-leverage unit tests | 4 |
| - | End-to-end live smoke test, all 7 outputs, fresh user | 4 |
| - | Manual: brand new user → micro-debrief → fresh start fallback | 1 |
| - | Manual: trigger every cron from admin panel | 1 |
| - | Document diagnostic scripts in a one-page runbook | 1 |

**Total: ~12 hours**

**Grand total: ~39 hours** spread across 3 weeks. Aggressive but achievable for a single founder-engineer if blockers are tackled in order and nothing else demands attention.

---

## What I Did NOT Audit (worth a follow-up if you want it)

- `journeyMap.js`, `physicalGuidance.js`, `grandPrixThinking.js` (separate handlers, possibly share these patterns)
- `firstLight.js`, `microDebrief.js`, `freshStart.js` (the new-user empathetic responses — H7 only spot-checked)
- Frontend rendering of partial-failure states for outputs other than coaching
- Stripe webhook reliability (separate audit area)
- Firestore security rules under load
- Anthropic rate-limit behavior at concurrent fan-out (speculative without load testing)

If you want any of these audited next, just say which and I'll do the same depth-pass.
