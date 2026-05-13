# YDJ Token Budget Spec — Reference Document
*Version 2.0 — April 21, 2026*
*Status: All decisions resolved; ready for Stripe implementation*

---

## Part 1: Tier Budgets — Final Numbers

### Per-tier monthly cost ceiling

| Tier | Monthly cost ceiling | Monthly price | Worst-case margin | Typical-user margin |
|---|---|---|---|---|
| **Working** | **$10** | $30 | 67% | ~85% |
| **Medium** | **$40** | $50 | 20% | ~60% |
| **Extended** | **$80** | $130 | 38% | ~75% |

The Medium worst-case margin of 20% is tight by design. It accommodates the upper quartile of Medium use without leaving the typical user on a too-loose plan. Aggressive Medium users hitting the cap is the natural upgrade signal to Extended.

### Per-tier per-regeneration `max_tokens`

These are the `max_tokens` values passed to the Anthropic API per call type. They cap output *size*; cost differentiation between Medium and Extended comes from frequency via cadence rules, not output size.

| Output type | Working | Medium | Extended |
|---|---|---|---|
| Multi-Voice Coaching (per voice call) | 2,000 | 2,500 | 2,500 |
| Multi-Voice Coaching (insights call) | 1,500 | 2,000 | 2,000 |
| Journey Map | 3,000 | 4,000 | 4,000 |
| GPT L1 | n/a | 6,000 | 6,000 |
| GPT L2 | n/a | 4,000 | 4,000 |
| Physical Guidance | n/a | 5,000 | 5,000 |
| Show Planner (per call) | n/a | 3,000 | 3,000 |
| Visualization Scripts | n/a | 2,000 | 2,000 |
| Readiness Snapshot | n/a | 2,500 | 2,500 |

### Weekly $20 cap — application

- **Working:** Does NOT apply. Cadence rules already cap usage well below $20/week.
- **Medium:** Applies. Cache-only serve when exceeded, resets Monday 00:00 local time.
- **Extended:** Applies. Same behavior.

---

## Part 2: Active Tightening Levers (Applied April 21, 2026)

These two levers are pulled into the baseline spec, not held in reserve. They lower expected cost across all tiers without changing tier pricing or output access.

### Lever 1: Multi-Voice cache staleness buffer — widened

**Old behavior:** Cache invalidates on every new debrief (`dataSnapshotHash` keyed per-debrief). Heavy loggers see a "fresh data available" prompt after every ride and effectively pay for one generation per ride.

**New behavior:** Cache stays valid until either threshold is met:
- 5 new debriefs since last generation, OR
- 3 new debriefs + 1 new reflection since last generation

When neither threshold is met, served cache is treated as current. Auto-regen triggers (10 debriefs) and time-based fallbacks fire as defined per tier; the buffer only governs intermediate cache invalidation.

**Scope:** Applies to Multi-Voice Coaching across all tiers.

**Implementation note:** Replace `dataSnapshotHash` per-debrief invalidation with a `bufferThresholdMet()` check. The check reads counts of debriefs and reflections submitted after the cached generation's `generatedAt` timestamp.

### Lever 2: Show Planner active-prep cadence — bi-weekly

**Old behavior:** Weekly content call during active show prep (per show plan).

**New behavior:** Bi-weekly content call. Riders may still manually request additional content within their budget cap.

**Scope:** Applies to Medium and Extended (Show Planner is gated to those tiers).

**Implementation note:** Adjust the scheduled-trigger interval in the show plan content-generation function from 7 days to 14 days. Manual regeneration remains available to Extended; Medium has no manual show-planner-content button.

---

## Part 3: Reserve Tightening Levers (Hold for Pilot Data)

These can be pulled without changing tier prices or feature access. Pull individually if first-billing-cycle data shows median Medium cost above $25 or upper-quartile Medium cost above $40.

| Lever | Effect | Priority to pull |
|---|---|---|
| Multi-Voice cooldown: widen 4 → 8 hours at Medium (Extended stays at 4) | Reduces manual-regen frequency at Medium without affecting Extended | First — least user-visible |
| Auto-regen threshold: raise 10 → 15 debriefs at Medium | Cuts auto-trigger frequency for active Medium loggers | Second |
| Per-call `max_tokens` trim at Medium (10–15% reduction across all outputs) | Reduces cost per generation; modest output size impact | Third — touches output quality |
| Multi-Voice cache buffer: widen further to 7 debriefs OR 5+1 at Medium | Further dampens cache-driven regens for active users | Fourth — already widened in baseline |
| Show Planner active-prep cadence: monthly at Medium | Cuts active-prep cost in half again at Medium | Fifth — already bi-weekly in baseline |

**Decision rule:** Pull one lever at a time. Wait one full billing cycle before pulling the next.

---

## Part 4: Cost Model — What's Behind the Numbers

### Real data anchor

| User | Period | Total cost | Coaching cost | Notes |
|---|---|---|---|---|
| Barb (founder, aggressive Medium use) | 30 days pre-fix | $54.09 | $33.44 | Pre-inflight-lock, pre-10-debrief-threshold, dev-testing inflated |
| Estimated post-fix equivalent | — | ~$35–40 | ~$18 | Same usage pattern, post-Lever 1 + Lever 2 lands at ~$32–36 |

### Per-output cost estimates (post-fix, post-levers)

| Output | Cost per generation | Driver |
|---|---|---|
| Multi-Voice Coaching (5-call fan-out) | $2.50–3.00 | Sonnet, post-pre-processing |
| Journey Map | $1.00–1.50 | Sonnet, smaller output |
| GPT L1 | $1.00–1.50 | Sonnet, full 4-week program |
| GPT L2 (Training Trajectory) | $3.00–5.00 | Includes Opus calls |
| Physical Guidance | $1.00–1.50 | Sonnet, full 4-week program |
| Show Planner (per full plan) | $4.00–6.00 | 4 API calls + bi-weekly content |
| Show Planner (bi-weekly content call) | $0.40–0.50 | Single Sonnet call |
| Visualization Scripts | $0.30–0.60 | Single Sonnet call |
| Readiness Snapshot | $0.50–1.00 | Single Sonnet call |
| Pre-Lesson Summary | $0 | Assembly only |
| Weekly Focus | $0 | Extraction only |
| Practice Card | $0 | Tied to Multi-Voice fan-out |

### Expected typical-user monthly cost

| Tier | User profile | Estimated monthly cost |
|---|---|---|
| Working | Light (1×/wk rides) | $2.50–3 |
| Working | Typical (2–3×/wk rides) | $3–7 |
| Medium | Typical (3–4×/wk rides, occasional shows) | $12–26 |
| Medium | Aggressive (Barb-class post-fix) | $32–38 |
| Extended | Typical (4–6×/wk, active competitor) | $18–35 |
| Extended | Outlier (Linda-class, post-fix) | capped at $80 by weekly cap |

---

## Part 5: First Light — New User Onboarding Output

First Light is a distinct limited-data output, not a bonus refresh of standard Multi-Voice. It introduces the multi-voice coaching frame using rider profile data plus First Glimpse responses, before the rider has accumulated enough debriefs and reflections to drive the standard outputs. Detailed spec to be developed separately.

### Cost model for First Light

| Element | Behavior | Cost impact |
|---|---|---|
| Initial First Light generation | Triggered after rider profile + First Glimpse complete | One-time, ~$1–2 |
| First Light refresh | One refresh of First Light output (not standard MV) before graduation | One-time, ~$1–2 |
| Graduation | Automatic when rider reaches 5 debriefs + 6 reflections (1 per category) | No cost — switches to standard MV cadence |

**Total First Light cost per new user:** ~$2–4, one-time, amortized to <$0.50/month over first year.

### Firestore tracking

```
firstLightStatus: "pending" | "first-generated" | "refresh-used" | "graduated"
firstLightGeneratedAt: timestamp
firstLightRefreshUsedAt: timestamp | null
firstLightGraduatedAt: timestamp | null
```

Graduation trigger: client-side or Cloud Function check after every reflection or debrief submission, flips status to `"graduated"` when threshold met.

---

## Part 6: Resolved Decisions Reference

All items below were resolved during the April 21 pricing/cadence review.

| # | Decision | Resolution |
|---|---|---|
| 1 | Pre-Lesson Summary cost model | Assembly only; no API call |
| 2 | First Light scope | Distinct limited-data MV output; refresh applies only to First Light format |
| 3 | Working tier Multi-Voice trigger semantics | Monthly trigger only fires if 10-debrief trigger hasn't fired in same calendar month (max 1/mo, not 2) |
| 4 | L2 Opus monthly soft cap | 4 generations per Extended user per month, enforced at API route |
| 5 | Multi-Voice cooldown window | 4 hours between regens (all tiers, baseline) |
| 6 | Cache staleness buffer width | 5 debriefs OR 3 debriefs + 1 reflection (replaces per-debrief invalidation) |
| 7 | Weekly cap window definition | Monday-Sunday in user's local timezone |
| 8 | First Light graduation criterion | Automatic at 5 debriefs + 6 reflections (1 per category) — matches QuickStart Map core-unlock milestone |
| 9 | Show Planner active-prep cadence | Bi-weekly (down from weekly) |
| 10 | Medium tier monthly ceiling | $40 (up from initially proposed $35) |

---

## Part 7: Implementation Constraints

1. **Track dollars, not raw tokens.** Sonnet input vs. output rates differ; Opus is ~5× Sonnet. A unified cost ledger handles this. Compute per-call cost from API response usage data:
   ```
   cost = (inputTokens × inputRate + outputTokens × outputRate) × modelMultiplier
   ```
   Store on every API call. Sum into a `costAccruedThisPeriod` field (renamed from `tokensUsedThisPeriod` for clarity).

2. **Two ceilings per user, both enforced server-side:**
   - Monthly: `costAccruedThisPeriod` against tier budget ($10/$40/$80)
   - Weekly: `costAccruedThisWeek` against $20 cap (Medium and Extended only)

3. **Graceful exhaustion behavior:**
   - Generation API returns `200` with cached content + `cacheServed: true` flag and a `refreshEligibleAt` timestamp
   - Client surfaces a small banner: *"Your weekly fresh-coaching allowance is used. Your next refresh is available [next Monday date]. Existing outputs remain available."*
   - Auto-regen events that hit the cap during off-hours simply don't fire — no error surfaced

4. **Cache buffer enforcement** (Lever 1 mechanic):
   ```
   function shouldInvalidateCache(lastGeneration, debriefsSince, reflectionsSince) {
     if (debriefsSince >= 5) return true;
     if (debriefsSince >= 3 && reflectionsSince >= 1) return true;
     return false;
   }
   ```

5. **Soft cap for L2 Opus.** Hard limit of 4 Opus L2 generations per Extended user per month, enforced at API route level.

6. **Show Planner bi-weekly trigger** (Lever 2 mechanic): scheduled function checks active show plans every 14 days, generates content call only if plan is still in active prep window.

---

## Part 8: Calibration Plan — First Real Billing Cycle

Once the first full post-fix billing cycle completes (May 2026), validate against:

| Metric | Target | Action if miss |
|---|---|---|
| Median Medium cost | <$20/mo | If higher, pull Reserve Lever 1 (cooldown widen) |
| Upper-quartile Medium cost | <$30/mo | If higher, pull Reserve Lever 2 (auto-regen threshold raise) |
| 95th-percentile Medium cost | <$40/mo (=ceiling) | If many users hit the ceiling, pull Reserve Lever 3 (max_tokens trim) |
| Median Extended cost | <$40/mo | If higher, evaluate Extended-specific cooldown |
| % of Medium users hitting weekly cap | <5% | If higher, the cap or cadence is too tight for normal use |
| Cost per Multi-Voice generation (median) | $2.50–3.00 | If higher, re-examine pre-processing efficiency |

Pull reserve levers individually, one at a time, with one billing cycle between pulls.

---

*This document is the reference spec for Stripe implementation. Companion docs: `YDJ_Pricing_Tiers_Stripe_Reference.md` (tier definitions), `YDJ_GPT_Physical_30DayCycle_Implementation_Brief.md` (cycle architecture), `YDJ_Pricing_Discounts_Consolidation.md` (decision history).*
