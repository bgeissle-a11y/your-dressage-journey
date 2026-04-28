# YDJ Pricing, Discounts & Cost Control — Consolidated Reference
*Version 2.0 — April 21, 2026*
*Status: All decisions resolved unless noted; ready for Stripe implementation*

---

## Part 1: Tier Structure (Locked)

| | Working | Medium | Extended |
|---|---|---|---|
| Monthly | $30 | $50 | $130 |
| Annual | $300 | $500 | $1,300 |
| IC Annual (founder rate) | $265 | $425 | $1,150 |

Tier names are **Working / Medium / Extended**. Annual = 10 months of monthly cost.

### Feature gating

- All data entry forms: all tiers, now and future
- Learn section + Rider's Toolkit: all tiers
- Multi-Voice Coaching, Journey Map, Weekly Focus, Weekly Coach Brief: all tiers
- GPT, Physical Guidance, Show Planner, Visualization Scripts, Practice Card, Readiness Snapshot, Pre-Lesson Summary: Medium + Extended only
- New API-dependent outputs default to Medium + Extended at launch and draw from existing token pool

---

## Part 2: Refresh Cadence Matrix (Final)

| Output | Working | Medium | Extended |
|---|---|---|---|
| Multi-Voice Coaching | Auto-regen at 10 debriefs OR monthly fallback (5+ briefs/reflections combined). Monthly fallback only fires if 10-debrief trigger hasn't fired in same calendar month. Max 1/month. | Auto-regen at 10 debriefs. Weekly $20 cap. | Same as Medium + manual regen up to budget. 4-hour cooldown. |
| Journey Map | Auto-regen on (1 Journey event in 2 mo + 5 combined briefs/reflections) OR (10 combined briefs/reflections). Build on cache when possible. Max 1/month. | Same trigger. Max 2/month. Subject to cap. | Same trigger. No frequency cap. Subject to cap. |
| Weekly Focus | Extraction only — updates when sources regen | Same | Same |
| Weekly Coach Brief | Weekly assembly (Mon 6am local). Sections blank if sources gated. No API cost. | Same | Same |
| GPT L1 | ❌ | Monthly cycle + 1 triggered mid-cycle refresh | Unrestricted, up to budget |
| GPT L2 | ❌ | Monthly, in sync with L1 cycle | Unrestricted, up to budget. **Soft cap: 4 Opus generations/month.** |
| Physical Guidance | ❌ | Monthly cycle + 1 triggered mid-cycle refresh | Unrestricted, up to budget |
| Show Planner | ❌ | 10 shows/rolling year. **Bi-weekly content calls during active prep.** Subject to cap. | Unrestricted, up to budget. |
| Visualization Scripts | ❌ | As requested. Subject to cap. | As requested. Subject to cap. |
| Practice Card | ❌ | Weekly, tied to Multi-Voice cycle | Same |
| Readiness Snapshot | ❌ | 1 per show plan + 1 refresh near show date | Same |
| Pre-Lesson Summary | ❌ | Weekly assembly. No API cost. | Same |

### Cache buffer (applies to Multi-Voice across all tiers)

Cache stays valid until either threshold:
- 5 new debriefs since last generation, OR
- 3 new debriefs + 1 new reflection since last generation

---

## Part 3: Token Budgets

Final spec lives in `YDJ_Token_Budget_Spec_v2.md`. Summary:

| Tier | Monthly cost ceiling | Worst-case margin |
|---|---|---|
| Working | $10 | 67% |
| Medium | $40 | 20% |
| Extended | $80 | 38% |

Weekly $20 cap applies to Medium and Extended only.

---

## Part 4: Initial Centerline (IC) — Founder Cohort

### Eligibility

- Anyone who signs up for an annual paid subscription between launch and **July 7, 2026** (NDPC + grace period)
- Maximum **100 members** total
- Pilot participants must actively enroll — no auto-conversion
- First-come, first-served once enrollment is open

### Locked rates (annual only)

| Tier | Standard annual | IC annual | Discount $ | Discount % |
|---|---|---|---|---|
| Working | $300 | $265 | $35 | 11.7% |
| Medium | $500 | $425 | $75 | **15.0%** |
| Extended | $1,300 | $1,150 | $150 | 11.5% |

Medium has the largest percentage discount by design — Medium is the target tier.

### Membership rules

| Rule | Detail |
|---|---|
| Annual only | IC rate does not apply to monthly billing |
| Locked tier | IC rate locked to the tier the user signs up at |
| Permanence | Rates are permanent regardless of any future Anthropic API price changes or platform cost shifts |
| Downgrade | Loses IC entirely; reverts to standard pricing of new tier |
| Switch to monthly | Loses IC entirely; reverts to standard monthly pricing |
| Upgrade within 6 months | Gets IC rate at the new tier for life |
| Upgrade after 6 months | Keeps existing IC rate at original tier; pays standard rate at new tier (no IC at new tier) |
| Lapse (cancel or 14-day payment failure) | Loses IC. Subscription continues at standard pricing seamlessly — does not auto-cancel |
| Other discount stacking | Not allowed — IC is a final price |
| Transferability | Non-transferable |

### Cohort cap behavior

- Live spots-remaining counter visible publicly when fewer than 20 spots remain
- Atomic Firestore transaction at successful payment confirms the spot
- 101st signup attempt mid-checkout sees a graceful "Founder pricing has just sold out — standard pricing applies" with the option to continue at standard rate

### In-app recognition (build over time, not blocking launch)

- Founder/Centerline badge on profile
- Cohort designation visible to user (not other users initially)
- Special early access to new features as they ship
- Future considerations: private community access, founder-specific communications

---

## Part 5: Free Trial Program

### Terms

| Item | Detail |
|---|---|
| Eligibility window | Anyone who signs up between launch and **July 7, 2026** |
| Trial length | 1 month |
| Trial tier | Medium (full access) |
| Payment method | Required at signup; charged on day 31 unless cancelled |
| First Light access | Guaranteed during trial |
| Multiple trials | One per email + payment method (Stripe-enforced) |
| Mutual exclusion with IC | A user can do trial OR IC, not both — but a trialing user can convert early to IC during the IC window |

### Conversion paths

| User decision | Outcome |
|---|---|
| Cancels before day 31 | Trial ends; no charge |
| Decides to commit during trial AND IC window still open | May convert early to IC pricing (annual) |
| Decides to commit during trial, IC window closed | Auto-converts on day 31 with **10% off first year** (monthly or annual) |
| Lets trial auto-convert (no action) | Charged at standard rate with 10% off first year applied automatically |
| Cancels during trial then re-subscribes later | No second trial; no 10% discount |

### 10% trial converter discount

- Applies to the **first year only** (12 monthly billings or one annual)
- Applies to monthly OR annual at any tier
- After first year, renews at standard pricing
- Does not stack with any other discount

---

## Part 6: Pilot Participant Conversion

Pilots had free access during the test period. They now have three options to continue:

| Option | Rate | Terms |
|---|---|---|
| Annual IC | $265 / $425 / $1,150 | Same IC rules as Part 4 |
| Monthly with pilot discount | $27 / $45 / $117 | **10% off monthly, for life** — pilot-only discount |
| Don't convert | n/a | Account archived for 60 days, then permanently deleted |

### Pilot monthly discount rules

- Available to pilot participants only — not generally available
- 10% off applies to monthly subscriptions at any tier, for the lifetime of continuous subscription
- If a pilot lapses (cancel or 14-day payment failure), they lose the pilot discount permanently
- Does not stack with any other discount
- Non-transferable

### Archive clock

Un-converted pilot accounts enter archive on **July 7, 2026** (uniform across all pilots, regardless of when they were last active). Account permanently deleted 60 days later (September 5, 2026). Email warnings fire 30 days and 7 days before deletion.

### Pilot grandfather consideration

Reviewed and closed: no specific pilot received explicit commitments around "6 months free" prior to the structure change. The new IC + monthly 10% structure applies uniformly to all pilots without exceptions.

### Communication timing

The change from "6 months free" to "annual IC + monthly 10% lifetime" should be announced to pilots well before July 7. Frame:
- IC annual as the strongest long-term reward
- Monthly 10% lifetime as the soft landing
- Acknowledge directly that this replaces the originally-discussed 6 months free and explain the reasoning

---

## Part 7: NDPC Booth Promotion (Resolved)

The previously-discussed NDPC 20% discount is **retired** in favor of the unified IC structure. Booth attendees who sign up during NDPC (July 2–5) get IC pricing along with everyone else who enrolls before July 7.

**Action items:**
- Update `ydj-ndpc-quick-glimpse.html` to remove 20% discount language
- Replace with IC pricing messaging and live spots-remaining counter
- Booth signage updated to feature IC pricing

---

## Part 8: Stripe Coupon Catalog

| Coupon ID | Discount | Duration | Applies to | Auto-applied at checkout |
|---|---|---|---|---|
| `IC_WORKING_2026` | $35 off | Forever | Annual Working only | Yes — when within window AND spots remain |
| `IC_MEDIUM_2026` | $75 off | Forever | Annual Medium only | Yes — when within window AND spots remain |
| `IC_EXTENDED_2026` | $150 off | Forever | Annual Extended only | Yes — when within window AND spots remain |
| `TRIAL_FIRSTYEAR_10` | 10% off | First year only | Monthly or annual, any tier | Yes — at trial → paid conversion |
| `PILOT_MONTHLY_10` | 10% off | Forever | Monthly only, any tier | Yes — for pilot-flagged accounts at first paid signup |

### Coupon application logic

All coupons applied automatically based on date, cohort cap, and account flags. Users do not enter codes. This avoids:
- Code-sharing leakage
- Third-party "promo finder" sites picking up codes
- Confusion at checkout

### Mutual exclusion enforcement

- IC coupon attempt outside July 7 window: blocked at checkout
- IC coupon attempt when 100 spots filled: blocked at checkout
- Trial converter cannot also receive IC unless they actively chose IC during trial
- Pilot monthly discount cannot stack with IC (pilot must pick one path)

---

## Part 9: Firestore Schema Additions

### User document additions

```
// IC tracking
isInitialCenterline: boolean
icEnrollmentDate: timestamp | null
icTier: "working" | "medium" | "extended" | null
icStatus: "active" | "lapsed" | null
icLapseReason: string | null
icLapsedAt: timestamp | null

// Pilot tracking
isPilot: boolean                        // set during pilot enrollment
pilotDiscountActive: boolean            // false until they convert to paid monthly
pilotDiscountLapsedAt: timestamp | null

// Trial tracking
trialStarted: boolean
trialStartDate: timestamp | null
trialEndDate: timestamp | null
trialConverted: boolean
trialConverter10PctYearEnd: timestamp | null  // when first-year discount expires

// Account lifecycle (for un-converted pilots)
archivedAt: timestamp | null            // 60-day grace period before deletion
scheduledDeletionAt: timestamp | null
```

### IC cohort counter

```
/admin/icCohort
  enrollmentCount: number
  enrollmentCap: 100
  enrollmentClosedAt: timestamp | null
  windowOpenDate: timestamp
  windowCloseDate: timestamp           // July 7, 2026
```

Atomic increment via Firestore transaction at successful payment webhook.

---

## Part 10: Communications & Email — Open Item

The following lifecycle communications are required. Currently, no integrated email provider is wired into the platform.

### Communications to build

| Trigger | Audience | Message |
|---|---|---|
| Pilot conversion announcement | All pilots | Personal note + IC enrollment link + monthly 10% option + 6-mo-free change explanation |
| IC enrollment confirmation | New IC member | Welcome + cohort number + badge reveal + what's coming |
| IC spots running low | Site visitors | "20 spots left" urgency at 80 enrollments |
| IC closing soon | Trial users + site visitors | "IC closing in 7 days" reminder around July 1 |
| IC closed | Site visitors + late-comers | Standard pricing now in effect |
| Trial signup | New trial user | Welcome + First Light timeline + days 7/14/21/28 reminders |
| Trial converting tomorrow | Day 30 trial users | "Your subscription begins tomorrow at 10% off your first year" |
| Pilot account 30 days from deletion | Un-converted pilots | "Your data will be deleted in 30 days unless you re-activate" |
| Pilot account 7 days from deletion | Un-converted pilots | Final warning |

### Open TODO: email provider integration

Pick and integrate a transactional + lifecycle email provider before launch. Options:
- Resend (used by Cloud Function in Weekly Coach Brief spec)
- Postmark
- ConvertKit (originally specced for lifecycle/marketing in roadmap)
- Mailgun

**Recommend revisiting this within 2 weeks** so it's wired before the IC window opens. Without it, none of the above lifecycle communications can fire automatically.

---

## Part 11: Resolved Decisions Log

All decisions made during the April 21, 2026 pricing review.

| # | Topic | Resolution |
|---|---|---|
| 1 | IC eligibility window | Launch through July 7, 2026 |
| 2 | IC max cohort size | 100 |
| 3 | IC tier placement | Locked to tier at signup |
| 4 | IC billing requirement | Annual only |
| 5 | IC rates | $265 / $425 / $1,150 |
| 6 | Permanence | Permanent regardless of cost shifts |
| 7 | Continuity — lapse | Loses IC; subscription continues at standard |
| 8 | Continuity — downgrade | Loses IC entirely |
| 9 | Continuity — switch to monthly | Loses IC entirely |
| 10 | Upgrade within 6 mo | New tier IC for life |
| 11 | Upgrade after 6 mo | Keeps original tier IC; new tier at standard |
| 12 | Other discount stacking | Not allowed |
| 13 | Transferability | Non-transferable |
| 14 | Cohort cap UX | Live counter <20 spots |
| 15 | NDPC 20% promo | Retired in favor of IC |
| 16 | Pilot conversion path | Active enrollment required (no auto) |
| 17 | Un-converted pilots | 60-day archive then deletion. Archive clock starts uniformly July 7, 2026; deletion September 5, 2026 |
| 18 | Pilot monthly discount | 10% lifetime on monthly only |
| 19 | Pilot 6-mo-free original plan | Replaced by IC + monthly 10% structure |
| 20 | Free trial length | 1 month |
| 21 | Trial tier | Medium |
| 22 | Trial payment method | Required |
| 23 | Trial → IC conversion | Allowed early during IC window |
| 24 | Trial converter discount | 10% off first year only |
| 25 | Trial repeat | One per email/payment method |
| 26 | Stripe coupon strategy | 5 auto-applied coupons, no user-entered codes |
| 27 | Pricing display strategy | IC pricing prominent during window; standard pricing post-July 7 |
| 28 | Email provider | Decision matrix being developed in separate chat — revisit within 2 weeks |

---

## Part 12: Future / Out of Scope

Items intentionally deferred:

- **Referral program** — separate from IC; consider post-launch once cohort behavior is observed
- **Gift subscriptions** — not in scope for v1
- **International expansion** — USD-only at launch
- **Free trial offer post-July 7** — possible re-evaluation after first cohort data
- **IC waitlist** — if 100 spots fill before July 7, consider whether to maintain a waitlist for any future expansion

---

*Companion documents: `YDJ_Pricing_Tiers_Stripe_Reference.md` (base tier definitions), `YDJ_Token_Budget_Spec_v2.md` (cost controls), `YDJ_GPT_Physical_30DayCycle_Implementation_Brief.md` (cycle architecture), `YDJ_WeeklyCoachBrief_Implementation_Brief.md` (weekly brief assembly).*
