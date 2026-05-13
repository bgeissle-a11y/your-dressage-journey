# YDJ — Token Budget v2 + Tier Gating + Précis Integration
# Implementation Brief for Claude Code

**Version:** 1.0
**Date:** May 2026
**Status:** Ready for implementation
**Bundles:**
- Token Budget Spec v2 gap closure (`YDJ_Token_Budget_Spec_v2.md`)
- Tier-gating wire-up of the existing `entitlements.js` module
- Précis integration into Show Planner cadence + Readiness Snapshot + graceful-exhaustion UX

---

## Why one brief

Three workstreams want to touch the same Cloud Function handlers (every `functions/api/*.js` and parts of `functions/lib/`):

1. **Tier gating** — the `canAccess` / `assertCanAccess` helpers in `functions/lib/entitlements.js` and `src/constants/entitlements.js` are written but not yet wired into a single handler or UI button. We're already mid-flight on this.
2. **Token Budget Spec v2** — partially implemented (dollar ceilings, weekly/monthly accumulators, top-tier max-token overrides for Physical/GPT). Several spec decisions and both Active Tightening Levers are not implemented.
3. **Précis** — already produced and cached (commit `9761eb8` "Ship Habit Loop"), but currently consumed only by micro-debrief and Fresh Start. Three additional consumers are obvious wins and should be added while we're already inside these handlers.

Doing them as one ordered piece avoids touching the same files twice and keeps cost decisions, capability decisions, and prompt-input decisions consistent.

---

## Source-of-truth files (read first, do not skim)

- `YDJ_Token_Budget_Spec_v2.md` — the spec being implemented
- `YDJ_MultiVoicePrecis_Spec.md` — what the précis is and isn't
- `functions/lib/entitlements.js` and `src/constants/entitlements.js` — capability registry, `canAccess`, `assertCanAccess`
- `functions/lib/claudeCall.js` — already does pre-call weekly/monthly $ enforcement and post-call cost accumulation in millicents on `usageBudgets/{uid}`
- `functions/lib/tierBudgets.js` — env-driven tier budget loader
- `functions/lib/cacheManager.js` — current per-`dataSnapshotHash` invalidation; this is what Lever 1 replaces
- `functions/lib/cycleState.js` — 30-day cycle state and the existing `REGEN_COOLDOWN_HOURS` env hook
- `functions/api/dataTriggeredRegeneration.js` — the auto-regen orchestrator with hardcoded 2h cooldown
- `functions/api/coaching.js` — précis generation + persistence as `coaching_precis` cache row
- `functions/lib/empatheticContext.js` — example of a précis consumer
- `CLAUDE.md` — pilot lifecycle dates, tier definitions, "read token budgets from environment config — never hardcode"

---

## What's already in place (do NOT redo)

| Capability | Implementation | Notes |
|---|---|---|
| Tier dollar ceilings | `functions/lib/tierBudgets.js` reads `TIER_*_MONTHLY_BUDGET_USD` and `TIER_*_WEEKLY_BUDGET_USD` from env | Working has no weekly cap (correct per spec) |
| Pre-call $ enforcement | `claudeCall.js _checkAndIncrementBudget` blocks calls when bucket exceeds tier cap | Correctly throws on over-cap |
| Cost ledger in millicents | `_logUsage` writes `usageLogs` per call and accumulates onto `usageBudgets/{uid}` | Sonnet vs Opus rates baked in |
| 30-day GPT/Physical cycles | `functions/lib/cycleState.js` + per-output `*Cycle` Firestore docs | Standard vs top tier rules enforced |
| Top-tier max-token overrides | `PHYSICAL_GPT_TOP_TIER_MAX_TOKENS`, `PHYSICAL_PROTOCOL_TOP_TIER_MAX_TOKENS`, `PHYSICAL_AWARENESS_TOP_TIER_MAX_TOKENS` env vars | Only applied to Physical/GPT today |
| Précis generation + cache | `coaching.js generatePrecis` + `persistPrecis` write to `analysisCache/{uid}_coaching_precis` | Already running on every Multi-Voice fan-out |
| First Light lifecycle | `firstLight.generate`, `firstLight.regenerate`, `firstLight.graduate` | Schema uses `regeneratedAt` / `graduatedAt` fields, not the spec's enum |
| Capability registry | `entitlements.js` (frontend + backend) with `canAccess`, `assertCanAccess`, pilot lifecycle dates | NOT YET CALLED from any handler or UI button |

---

## Build order

The order matters. Each phase leaves the system shippable.

### Phase 1 — Wire `canAccess` into Cloud Function handlers and the UI

**Why first:** the entitlements module already exists and is the substrate every later phase depends on. Without it, the budget brick (Phase 2) and graceful-exhaustion UX (Phase 4) can't tell paid tiers apart at the route boundary.

**Backend work** — at the top of every `onCall` handler, after `validateAuth`, fetch the user's subscription doc and call `assertCanAccess` for the matching capability. Throw `HttpsError` on deny. Handler → capability mapping:

| Handler | Capability |
|---|---|
| `coaching.handler` | `generateCoaching` |
| `journeyMap.handler` | `generateJourneyMap` |
| `dataVisualizations.handler` | `generateDataVisualizations` |
| `grandPrixThinking.handler` (mental layer) | `generateGrandPrixThinking` |
| `grandPrixThinking.handler` (trajectory layer, manual regen path) | `regenerateGrandPrixThinking` |
| `physicalGuidance.handler` | `generatePhysicalGuidance` |
| `physicalGuidance.handler` (manual mid-cycle path) | `regeneratePhysicalGuidance` |
| `eventPlanner.handler` | `generateShowPrepPlan` |
| `readinessSnapshot.handler` | `generateShowPrepPlan` (lives under Show Planner gate) |
| `visualizationScript.handler` | `generateVisualizationScript` (NEW — Medium+; see capability registry change below) |
| `firstLight.generate` / `firstLight.regenerate` | always allowed during pilot/grace; check `canAccess(sub, "generateCoaching")` post-pilot |

**Capability registry change required.** Add a new capability `generateVisualizationScript` to both `functions/lib/entitlements.js` and `src/constants/entitlements.js`, mapped to `MEDIUM_ADDS` (so Medium and Extended unlock it; Working does not). This is one extra `CAPABILITIES.generateVisualizationScript` line plus one entry in each `MEDIUM_ADDS` set. Pilot users still get it during pilot/grace via the `STATUS.PILOT` short-circuit in `canAccess`.

**Confirmed tier scopes** (no change to existing entitlements, just locking these in writing so Claude Code doesn't second-guess):
- **Data Visualizations** — Working+ (already in `WORKING_CAPS` via `generateDataVisualizations` and `viewDataVisualizations`). Stays available at every paid tier.
- **Visualization Script** — Medium+ (the new capability above). Distinct from Data Visualizations; do not collapse them.

For data-write handlers and Firestore-trigger functions (`onDebriefCreated`, `dataTriggeredRegeneration.handle*`), use `canAccess` to skip the work silently when the user is in `pilot-grace` or `pilot-expired` — don't error; just no-op and log.

**Frontend work** — surface a single `useEntitlements()` hook that wraps `canAccess` and the user's subscription. Replace any hand-rolled tier checks with `canAccess(...)` calls. Disable, don't hide, the buttons that the user doesn't have entitlement for, and show an upgrade CTA citing `requiredTierFor(capability)`. Specifically:

- `MultiVoicePanel`, `JourneyMapPanel`, `GrandPrixPanel`, `PhysicalGuidancePanel`, `DataVisualizationsPanel`
- ShowPrep buttons (`ShowPrepForm`, `ShowPrepList`, `ShowPrepPlan`)
- Insights tabs that gate on Medium+
- Settings and Account sections that show subscription state

**Acceptance:** for a Working-tier test user, attempting to call `getGrandPrixThinking` returns `permission-denied` with details `{ reason: "TIER_REQUIRED", requiredTier: "medium", capability: "generateGrandPrixThinking" }`. The Insights GPT tab is visibly disabled with an "Upgrade to Medium" CTA.

---

### Phase 2 — Align per-output `max_tokens` with Token Budget Spec v2

**Why second:** lowest-effort cost win, doesn't depend on Phase 3 architecture, and surfaces test-quality questions that should be answered before we move on.

**Create** `functions/lib/tokenBudgets.js` — a single module exporting `getMaxTokens(outputType, tier, callIndex?)`. Read from env where reasonable, hardcoded fallbacks per spec. Tier passed in is `'working' | 'medium' | 'extended'`; pilot users map to `'extended'` for budget purposes (full access during pilot).

**Apply per spec:**

| Output | Working | Medium / Extended | Replaces hardcoded |
|---|---|---|---|
| Multi-Voice per voice (`coaching.js generateVoice`) | 2,000 | 2,500 | `maxTokens: 4096` (line 88) |
| Multi-Voice insights (`generateQuickInsights`) | 1,500 | 2,000 | `maxTokens: 4096` (line 138) |
| Multi-Voice précis (`generatePrecis`) | 400 | 400 | `maxTokens: 400` (already correct, leave alone) |
| Journey Map call 1 (`journeyMap.js`) | 3,000 | 4,000 | `maxTokens: 8192` (line 208) |
| Journey Map calls 2-3 | 2,000 | 2,000 | `maxTokens: 4096` / `2048` (lines 235, 243) |
| GPT L1 (`grandPrixThinking.js` standard tier) | n/a (gated) | 6,000 | `8192` (line 315 fallback) |
| GPT L2 calls (`grandPrixThinking.js` trajectory) | n/a | 4,000 each | `8192` / `16384` (lines 472, 489, 497, 534, 625, 670, 678, 753) |
| Physical Guidance protocol (`physicalGuidance.js`) | n/a | 5,000 | line 230 currently env-overridden |
| Physical Guidance awareness | n/a | 5,000 | line 252 currently env-overridden |
| Show Planner per call (`eventPlanner.js`) | n/a | 3,000 | currently 24,576 / 8,192 / 24,576 / 12,288 — these are 3-8× spec |
| Visualization Scripts (`visualizationScript.js`) | n/a | 2,000 | currently `getMaxTokens(scriptLength)` |
| Readiness Snapshot (`readinessSnapshot.js`) | n/a | 2,500 | currently `700` — under-spec, raise |

**Important:** Show Planner is the biggest immediate cost reduction. Going from 24,576 → 3,000 on three of the four calls is real money. **Validate output quality** by force-regenerating one full Show Plan for a pilot rider before/after and comparing. If the spec's 3,000 truncates Show Planner mid-step-3 (the prep timeline call), file a calibration follow-up rather than reverting silently — the spec contemplates this.

**Acceptance:** `tokenBudgets.js` exports the table; all `callClaude` sites pass tier-aware `maxTokens`; one full force-regen per output type completes without `stop_reason: "max_tokens"` for at least one pilot rider; Show Planner generation cost per plan drops to ≤ $1.50 (was ≥ $4).

---

### Phase 3 — Lever 1: Multi-Voice cache buffer

**Why third:** the architecturally biggest change. Higher risk than Phase 2, so it goes after the easy quality validation work.

**Replace** the per-debrief `dataSnapshotHash` invalidation in `cacheManager.getCache`. Add a new function `bufferThresholdMet({ generatedAt, uid })` that:

1. Counts non-deleted debriefs and reflections created after `generatedAt`.
2. Returns `true` if `debriefsSince >= 5 || (debriefsSince >= 3 && reflectionsSince >= 1)`.
3. Caches the count check for 60 seconds per uid (avoid hammering Firestore on a page load that fires multiple cache reads).

**Wire into Multi-Voice and Journey Map only.** Show Planner, GPT, and Physical have their own cadence rules — don't change those. The buffer mechanic applies to outputs whose spec entry says "Multi-Voice cache buffer" (only Multi-Voice today; Journey Map shares the staleness model so include it).

**Behavior change:**
- `getCache` no longer returns `null` purely on hash mismatch. It calls `bufferThresholdMet` and only treats the cache as stale if the threshold IS met. Hash mismatch with threshold not met = serve cache as fresh.
- `getStaleCache` keeps returning `_stale: true` for any hash mismatch (preserves the existing stale-while-revalidate flow when the buffer DID trip).

**Auto-regen trigger** (`dataTriggeredRegeneration.handleDebriefCreated`) — keep the existing `REGEN_THRESHOLD = 10` and 28-day floor. Lever 1 does NOT change that mechanic; it only changes whether the on-demand cache read prompts the user with a "fresh data available" indicator.

**Acceptance:** with two new debriefs and zero reflections, `getCache` returns the existing voice JSON marked fresh (no regeneration triggered). With five new debriefs, `getCache` returns null (regeneration eligible). With three new debriefs + one reflection, returns null. Unit-testable in isolation.

---

### Phase 4 — Graceful exhaustion + précis as "where you are now"

**Why fourth:** depends on Phase 1 (knowing the user's tier and capability) and Phase 2 (max_tokens enforced so caps trigger predictably).

**Backend change** — when `_checkAndIncrementBudget` returns `allowed: false`, `claudeCall.callClaude` currently throws `monthly-budget-exceeded` / `weekly-budget-exceeded`. Change the contract for the four "main view" handlers (`coaching`, `journeyMap`, `dataVisualizations`, `grandPrixThinking` mental layer):

- Catch the budget error at the handler boundary (not in `callClaude` — keep that layer clean for inner uses).
- Return HTTP 200 with `{ success: true, cacheServed: true, refreshEligibleAt: <ISO>, voices/result: <stale cache>, precis: <coaching_precis result>, capExceeded: { kind: "weekly"|"monthly", limitUSD: number } }`.
- `refreshEligibleAt` = next Monday 00:00 in user's local timezone for weekly, first of next month UTC for monthly.

**Per-user local timezone** — Decision #7 in spec. Add `timezone` field to `users/{uid}` (IANA string, e.g. `"America/New_York"`). Default to UTC if missing. Use it ONLY for the `refreshEligibleAt` computation in this phase; the existing weekly bucket key in `claudeCall.js` continues to use UTC ISO weeks for now (changing the bucket key is its own migration and is not blocking).

**Frontend change** — `useGenerationStatus` and the per-output panels detect `cacheServed: true` and render a small banner above the cached output:

> "Your weekly fresh-coaching allowance is used. Next refresh: Mon May 18. Your existing coaching is below."
>
> *Where you are right now: <précis text>*

The précis line is the win. Pull from `coaching_precis` cache (already there). Falls back to "Existing coaching is below" with no précis line if the cache is missing.

**Acceptance:** force a test user past the weekly cap; calling `getMultiVoiceCoaching` returns `cacheServed: true` with `refreshEligibleAt` set to the right local Monday and the précis text included; the Insights page renders the banner; no `HttpsError` is thrown.

---

### Phase 5 — Lever 2: Show Planner bi-weekly content trigger + Readiness Snapshot précis input

**Why fifth:** depends on Phase 1 (tier gate the trigger), Phase 2 (correct max_tokens), and Phase 4 architecture (graceful return when cap is hit). The précis-as-input wins land here.

**Add** `exports.showPlannerBiweeklyContent` in `functions/index.js` as `onSchedule("every 14 days 06:00", { timeZone: "America/New_York" })`. The handler:

1. Queries `showPreparations` for plans where `showDateStart` is within the next 90 days and `showDateStart > now` (active prep window).
2. For each plan owner, calls `assertCanAccess(sub, "generateShowPrepPlan")`. Skip on deny.
3. Reads `coaching_precis` from cache. **Pass précis into the content prompt as `<rider_current_state>` context** rather than re-running `prepareRiderData`. If précis is missing (rider has no Multi-Voice yet), skip the bi-weekly content for that plan and log.
4. Runs ONE Sonnet call (the content/check-in call) at `max_tokens` per spec (3,000 for Show Planner).
5. Writes the content to the plan's `biweeklyContent` array with a timestamp.

**Readiness Snapshot précis input** — modify `readinessSnapshot.handler`:

1. Read `coaching_precis` cache after auth.
2. If present, inject as `<rider_current_state>` into the prompt (place it right above the rider data block — see Habit Loop precedent in `empatheticContext.js`).
3. If absent, fall back to current behavior. Don't fail.

**Acceptance:** the scheduled function appears in `firebase functions:list`; manual trigger from the emulator generates content for one test plan; Readiness Snapshot output references current focus from précis (verifiable by sampling).

---

### Phase 6 — Multi-Voice 4-hour cooldown + L2 Opus monthly soft cap + Working-tier max-1-monthly trigger

These are the smaller spec items. Group them so the brief stays focused.

**6a — Multi-Voice cooldown 2h → 4h.** In `dataTriggeredRegeneration.js`, replace `REGEN_COOLDOWN_MS = 2 * 60 * 60 * 1000` with a tier-aware lookup: 4h for Working/Medium/Extended baseline. Read from a new env `MULTIVOICE_COOLDOWN_HOURS` (default 4). The 2h `REGEN_COOLDOWN_HOURS` env in `cycleState.js` stays at 2 (it's the GPT/Physical mid-cycle cooldown, not Multi-Voice). Two distinct knobs.

**6b — L2 Opus monthly soft cap (4/mo at Extended).** In `grandPrixThinking.js` trajectory pipeline, before kicking off the L2-1 Opus call, count this user's Opus calls in `usageLogs` for the current calendar month (filter on `model.includes("opus")`, `outputType === "grandPrixThinking"`). If `>= 4`, throw `HttpsError("resource-exhausted", "Trajectory regeneration limit reached for this month.")`. Read the cap from env `GPT_L2_OPUS_MONTHLY_CAP` (default 4).

**6c — Working tier Multi-Voice max-1-monthly trigger.** In `dataTriggeredRegeneration.handleDebriefCreated`, if the user's tier is Working AND the threshold trigger has already fired in the same calendar month (check `generationStatus` doc + month key), skip the regeneration. Don't replace the monthly-floor logic; gate it.

**Acceptance:** unit tests for each of the three rules; one log scrub showing the new behavior in the emulator.

---

### Phase 7 — Cycle status `"extended"` and field-naming cleanup

Lowest priority. Land if there's room in the iteration; otherwise defer.

- `cycleState.js shouldExtendCycle` — when true, also set `status: "extended"` on the cycle doc. Consumers (`checkRegenPermission`, panel UIs) read this to render the "Cached extended cycle — fewer than 5 new debriefs" UX.
- Cosmetic: in `usageBudgets/{uid}`, alias `costAccruedThisPeriod` to `monthCostMillicents / 100_000` in any admin readout. Don't migrate the underlying field — too much churn for a name change.

---

## Out of scope (intentionally deferred)

- **Reserve Levers 1–5** — held until first post-launch billing cycle data; Phase 6a installs the lever knob (`MULTIVOICE_COOLDOWN_HOURS`) so future widening to 8h at Medium is one env change.
- **First Light schema migration to spec's enum** (`firstLightStatus: "pending"|"first-generated"|"refresh-used"|"graduated"`). Functionally equivalent today via `regeneratedAt` / `graduatedAt`. Defer to when the rider-facing copy needs the explicit status.
- **Migrating weekly bucket key from UTC to user-local time** in `claudeCall.js getWeekKey`. Phase 4 honors local time for the user-facing `refreshEligibleAt`, which is the visible part. The bucket key migration is a separate cleanup that needs careful thought about in-flight bucket boundaries.
- **Précis as input to Journey Map / GPT / Physical.** The précis spec explicitly defers cross-output use. Show Planner content + Readiness Snapshot are the additions sanctioned here because they live in the Show Planner box that the précis spec doesn't claim.

---

## Conventions to follow

- **Read budgets from env.** Every numeric cap, cooldown, or threshold lives in `functions/.env.example` with a default. Per `CLAUDE.md`: never hardcode.
- **Fail closed on capability checks; fail open on budget reads.** If `usageBudgets/{uid}` read errors, `_checkAndIncrementBudget` already allows the call (existing behavior — keep it). If `assertCanAccess` errors, throw `permission-denied` rather than letting the call through.
- **Précis is internal infrastructure.** Per spec §"Précis is NOT visible to the rider": the only new user-facing surface added in this brief is the graceful-exhaustion banner, which is allowed because it's a system message, not coaching content.
- **Don't break the in-flight tier-gating work.** The entitlements files are still untracked. Treat them as authoritative; if a handler's gating decision needs a new capability, ADD it to both `entitlements.js` files in the same commit and document the addition in this brief's Phase 1 table.
- **Test against the live test user** documented in `scripts/resetTestUser.cjs` before considering a phase done.

---

## Cost projection after full implementation

Assumes typical Medium-tier rider, 3 debriefs/week, 1 reflection/week, occasional show, current pricing.

| Cost line | Today | After implementation | Delta |
|---|---|---|---|
| Multi-Voice (5 calls/regen, 2-3 regens/mo) | $7-12/mo | $4-7/mo (max_tokens trim + buffer cuts regen frequency) | -45% |
| Journey Map | $3-4/mo | $2/mo (max_tokens trim) | -40% |
| GPT L1 | $1-2/mo | $1-1.50/mo (max_tokens trim) | -25% |
| GPT L2 (occasional) | $3-5/mo | $3-5/mo (capped at 4 Opus/mo) | flat, capped |
| Physical Guidance | $1-1.50/mo | $1-1.50/mo (already env-driven) | flat |
| Show Planner per plan | $4-6 | $1-1.50 (max_tokens trim, précis input) | -75% |
| Bi-weekly Show content | $0 (not running) | $0.40-0.50 per plan per check-in | new line |
| Readiness Snapshot | $0.50-1 | $0.40-0.80 (précis input) | -20% |
| Précis | already in price | unchanged | n/a |

**Net Medium-tier monthly cost:** drops from $25-35 toward the spec's $12-26 typical band. Aggressive Medium users (Barb-class) drop from $40+ toward the $32-38 range the spec targets.

---

## What "done" looks like for this whole bundle

1. All seven phases land behind feature flags or directly, with smoke tests passing for one Working, one Medium, one Extended, and one pilot test user.
2. `firebase functions:list` shows the new `showPlannerBiweeklyContent` scheduled function.
3. The Insights page shows the graceful-exhaustion banner with précis when a test user is forced past the cap.
4. Per-output max_tokens are read from a single `tokenBudgets.js` module — no more per-handler hardcodes.
5. Auto-regen on a 4-debrief delta does not invalidate the Multi-Voice cache; auto-regen on a 5-debrief delta does.
6. A spot-check against three pilot riders shows no `stop_reason: "max_tokens"` truncations on the standard outputs.
7. CLAUDE.md is updated to point at this brief and to note the new env vars.

---

*End of brief. Companion docs: `YDJ_Token_Budget_Spec_v2.md`, `YDJ_MultiVoicePrecis_Spec.md`, `CLAUDE.md`, `functions/lib/entitlements.js`, `src/constants/entitlements.js`.*
