# YDJ Pricing Tiers & Stripe Implementation Reference
*Version 1.2 — April 2026*
*Status: Approved for implementation planning*

---

## Tier Overview

| | Working | Medium | Extended |
|---|---|---|---|
| **Monthly** | $30 | $50 | $130 |
| **Annual** | $300 ($25/mo) | $500 ($41.67/mo) | $1,300 ($108.33/mo) |
| **Annual savings** | Save $60 | Save $100 | Save $260 |
| **Positioning** | Conversion funnel; legitimate long-term home for low-volume riders | Target majority; serious adult amateur in active training | Unrestricted; high-volume or high-frequency competitor |

*Annual pricing = 2 months free (10 months × monthly rate).*

---

## Feature Access Matrix

### Data Entry (All Forms)
All tiers — Working, Medium, and Extended — have full access to all data entry forms, without restriction. This applies to all forms currently in the platform and any forms added in the future. No data entry feature shall ever be gated by subscription tier.

---

### AI Outputs

| Output | Working | Medium | Extended |
|---|---|---|---|
| **Multi-Voice Coaching** | ✅ Full access | ✅ Full access | ✅ Full access |
| **Journey Map** | ✅ 12-month history cap | ✅ Full history | ✅ Full history |
| **Weekly Focus** | ✅ Full access | ✅ Full access | ✅ Full access |
| **Weekly Coach Brief** | ✅ All sections available; some sections may have no output at Working level due to gated source outputs | ✅ Full access | ✅ Full access |
| **Grand Prix Thinking (GPT)** | ❌ | ✅ Monthly cycle + triggered refresh | ✅ Unrestricted |
| **Physical Guidance** | ❌ | ✅ Monthly cycle + triggered refresh | ✅ Unrestricted |
| **Show Planner / Event Planner** | ❌ | ✅ 10 shows/year | ✅ Unrestricted |
| **Visualization Scripts** | ❌ | ✅ Full access | ✅ Full access |
| **Practice Card** | ❌ | ✅ Full access | ✅ Full access |
| **Readiness Snapshot** | ❌ | ✅ Full access | ✅ Full access |

> **Policy — New AI Outputs:** Any new output that requires an API call must be placed in Medium and Extended tiers at launch. Working tier access is not assumed. Token budget caps for Medium and Extended do not increase when new outputs are added; new outputs draw from the existing pool.

### Learn Section
All tiers have full access to all Learn content (no AI generation cost).

### Rider's Toolkit
All tiers have full access to Rider's Toolkit.

---

## API Token Budget Policy

### Rationale
No user should be able to generate API costs exceeding their monthly subscription price. Token budgets are a cost protection mechanism, not a usage punishment. Messaging to riders should reflect this: framed as a fair use policy designed for one active rider, not a hard paywall.

### Token Budgets (Monthly)

| Tier | Monthly Token Budget | Notes |
|---|---|---|
| Working | Low — sufficient for Coaching Voices + Journey Map + Weekly Focus only | Outputs available are inherently bounded |
| Medium | To be calibrated during Stripe implementation based on observed pilot usage data | See calibration guidance below |
| Extended | Set at a level no single active rider can reasonably reach | Outlier protection only; should never trigger in normal use |

### Calibration Guidance for Medium Tier
- Baseline: analyze token consumption across pilot participants, excluding show planner usage
- Target: set Medium budget at 2–2.5× median active user consumption
- Hard ceiling: Medium budget must not allow a single user to exceed $50 in API costs in any billing month
- Extended ceiling: must not allow a single user to exceed $130 in API costs in any billing month

### Token Pool Architecture (Medium Tier)
Medium tier uses a **shared monthly token pool** rather than per-output refresh limits. This means:
- The rider decides how to allocate — skipping Physical one month banks tokens toward a GPT refresh
- No per-feature quota tracking required
- One Firestore field: `tokensUsedThisPeriod` checked against `tokenBudget` before every API call
- Server-side gate: API calls return a graceful error message (not a crash) when budget is near exhausted

---

## Refresh Logic — Medium Tier

### Standard Cadence
- GPT (Grand Prix Thinking): one full generation per 30-day cycle
- Physical Guidance: one full generation per 30-day cycle
- Cycle resets on billing date

### Triggered Mid-Cycle Refresh
A rider may request one mid-cycle refresh per output per cycle under qualifying conditions.

**Qualifying triggers:**
1. New horse added to the platform
2. Major health or soundness event logged in Health & Soundness Tracker (severity threshold TBD at implementation)

**Behavior:**
- Refresh generates a truncated output scoped to approximately 2 weeks (not a full 30-day cycle)
- Truncated output is clearly labeled as a mid-cycle refresh
- Token cost of truncated output draws from the monthly pool
- Remaining standard cycle continues on original billing cadence; next full refresh resets at the next billing date

**Detection approach (implementation recommendation):**
Where possible, detect qualifying triggers automatically from logged data rather than requiring a manual rider request. New horse detection: new entry in `horses/{userId}`. Health event detection: entry in health tracker above a defined severity threshold. Surface a prompt: *"We noticed a significant change — would you like a mid-cycle refresh?"*

---

## Show Planner — Medium Tier

- Maximum 10 show plans per rolling 12-month period
- No limit on concurrent active show plans (removed — not needed given annual cap)
- Counter: `showPlansCreatedThisYear` tracked in Firestore, rolling 12-month window
- Riders approaching limit (e.g., at 8) receive a soft warning in the UI
- Riders at recognized show frequency exceeding 10/year are expected to be at Extended tier

---

## Stripe Implementation Notes

### Products and Prices to Create

```
Product: Your Dressage Journey — Working
  Price 1: $30.00/month (recurring, monthly)
  Price 2: $300.00/year (recurring, annual)

Product: Your Dressage Journey — Medium
  Price 1: $50.00/month (recurring, monthly)
  Price 2: $500.00/year (recurring, annual)

Product: Your Dressage Journey — Extended
  Price 1: $130.00/month (recurring, monthly)
  Price 2: $1,300.00/year (recurring, annual)
```

*Tier names are confirmed as Working / Medium / Extended.*

### Subscription Lifecycle

**Upgrades:** Immediate access to new tier features. Prorate charge for remainder of billing period at new price.

**Downgrades:** Access to higher-tier features continues until end of current billing period. Downgrade takes effect at next renewal. No proration on downgrade — rider retains access through paid period.

**Cancellations:** Access continues through end of paid period. Prorated refund for unused **full months** only (no partial month refunds). Annual subscribers: refund = (months remaining − current partial month) × monthly equivalent rate.

**Annual → Monthly migration:** Permitted at renewal only, not mid-cycle.

**Free trial:** TBD — not in scope for initial launch. Revisit post-launch.

### Firestore Fields Required (per user)

```
subscriptionTier: "working" | "medium" | "extended" | "none"
subscriptionStatus: "active" | "past_due" | "canceled" | "trialing"
subscriptionInterval: "monthly" | "annual"
stripeCustomerId: string
stripeSubscriptionId: string
currentPeriodStart: timestamp
currentPeriodEnd: timestamp
tokensUsedThisPeriod: number
tokenBudget: number          // set by tier at subscription creation/change
showPlansCreatedThisYear: number
showPlanYearWindowStart: timestamp
midCycleRefreshUsed: {
  gpt: boolean,
  physical: boolean
}                            // resets each billing cycle
```

### Webhooks Required

| Event | Action |
|---|---|
| `customer.subscription.created` | Set `subscriptionTier`, `tokenBudget`, `currentPeriodStart/End` in Firestore |
| `customer.subscription.updated` | Update tier and token budget; handle upgrade/downgrade feature access |
| `customer.subscription.deleted` | Set `subscriptionStatus: canceled`; enforce access cutoff at `currentPeriodEnd` |
| `invoice.payment_succeeded` | Reset `tokensUsedThisPeriod`, `midCycleRefreshUsed`; advance `currentPeriodStart/End` |
| `invoice.payment_failed` | Set `subscriptionStatus: past_due`; surface payment prompt in app |

### Access Gating Architecture

Feature access should be determined by a single server-side utility function:
```
canAccess(userId, feature) → boolean
```
Reads `subscriptionTier` and `subscriptionStatus` from Firestore. All API route handlers call this before executing generation. Client-side UI reflects access state (grayed out with upgrade prompt) but server-side is the authoritative gate.

---

## Upgrade Path Design Principles

- Upgrade from Working → Medium must be one action with no data loss
- All history, reflections, profiles, and toolkit entries carry over seamlessly
- First time a Working user encounters a gated feature, show a brief contextual upgrade prompt (not a generic paywall modal) — e.g., *"Show Planner is available on Medium. Your data is ready whenever you are."*
- Annual pricing should be surfaced prominently at checkout — not buried

---

## Open Items Before Stripe Implementation

1. Calibrate Medium and Extended token budgets against pilot usage data
2. Define health event severity threshold for automatic mid-cycle refresh trigger
3. Confirm proration policy language for Terms of Service
4. Decide on free trial offer (yes/no, duration) — recommend deferring post-launch
5. Stripe account must be live and verified before any of the above can be activated

---

*This document is an input to the Stripe Implementation Brief. Do not implement until Stripe account is live and token budget calibration is complete.*
