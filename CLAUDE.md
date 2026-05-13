# CLAUDE.md — Your Dressage Journey (YDJ)

## What This Project Is

Your Dressage Journey is an AI-powered coaching platform for adult amateur dressage riders. It transforms structured rider journaling into personalized coaching intelligence through pattern analysis across multiple data types, delivered through four distinct AI coaching voices.

**The core insight:** Journaling without analysis is just expensive record-keeping. YDJ's value is cross-data pattern analysis that humans cannot perform due to context limitations — the AI simultaneously analyzes rider profiles, horse profiles, post-ride debriefs, weekly reflections, observations, journey events, and self-assessments to reveal invisible patterns and correlations.

**Founder:** Barb — 20+ years dressage experience, developing this platform to address the gap between pure memory/intuition and unanalyzed journals.

---

## Architecture Overview

### Data Flow
1. User completes forms on mobile or desktop browser
2. Form validates client-side, then writes to Firestore via Firebase SDK
3. Firestore security rules enforce per-user data isolation
4. Cloud Function triggered on data thresholds (e.g., 5th debrief submitted)
5. Pre-processing function aggregates raw data into computed summaries
6. Summaries sent to Claude API with output-specific system prompts
7. API response parsed, validated, cached in Firestore
8. Frontend queries cached results and renders dashboard/reports

### Current State (Pilot — Feb–mid-May 2026)
- **React + Vite frontend** with full authentication, 7 form systems, data dashboard, and 10 visualization charts
- **Firebase backend** (Firestore + Auth + Cloud Functions) fully deployed
- **Mobile app with all inputs and outputs available to all pilot participants through mid-May 2026**
- AI coaching pipeline initiated (Cloud Functions + Claude API integration in progress)
- Barb facilitating data review and coaching output generation during pilot

### Target State (Production — May 2026+)
- React frontend on Netlify
- Firebase (Firestore + Auth + Cloud Functions)
- Server-side Claude API calls (27 unique call patterns)
- Stripe subscription billing
- Progressive Web App with offline form capability

### Tech Stack
- **Frontend:** React 19 + Vite, Recharts for visualizations
- **Backend:** Firebase (Firestore, Auth, Cloud Functions)
- **AI:** Anthropic Claude API (Sonnet for most calls, Opus for Grand Prix Thinking Layer 2)
- **Payments:** Stripe
- **Hosting:** Netlify (frontend), Firebase (functions)
- **Email:** Resend (transactional)
- **Monitoring:** Sentry, UptimeRobot

### Design System
- **Fonts:** Playfair Display (headings), Work Sans (body)
- **Colors:** Warm brown/gold palette reflecting dressage sophistication
- **Mobile-first:** All interfaces optimized for barn/stable use
- **Voice input:** Web Speech API for hands-free data entry at the barn

---

## Development Progress (Completed Phases)

### Phase 1: Firebase Setup & Environment Config
- Initialized the Vite + React 19 project
- Configured Firebase v11 (Auth + Firestore)
- Set up environment variables and `firebase-config.js`
- Established the project's design system (Playfair Display / Work Sans fonts, warm brown/gold palette)

### Phase 2: Authentication
- Built email/password authentication with Firebase Auth
- Login and registration flows
- Auth state management across the app

### Phase 3: Firestore Data Layer (9 Service Modules)
- Created `createBaseService(collectionName)` factory pattern — all services return `{success, data, error}`
- Built services for all 11 Firestore collections: users, riderProfiles, horseProfiles, reflections, debriefs, journeyEvents, observations, eventPrepPlans, physicalAssessments, riderAssessments, horseHealthEntries
- Implemented soft delete with `isDeleted` flag
- Solved the Firestore composite index problem by removing `orderBy` and sorting client-side

### Phase 4: Form Integration (8 Form Systems)
- Built all 8 form + list page pairs with consistent patterns (`useState` for formData/errors/loading, validation, edit mode via URL params)
- Created AppLayout with navigation
- Built shared components including VoiceInput (Web Speech API for hands-free entry at the barn)
- Handled date timezone issues (ISO strings parsed with `+ 'T00:00:00'`)
- Event Prep form matched the reference HTML spec (`event-preparation-formV2.html` is the current version — multi-horse support, per-horse goals/concerns, Logistics section with packing list button)

### Phase 5: Deployment & Dashboard
- Configured Firebase Hosting (`firebase.json` with SPA rewrite, asset caching)
- Deployed Firestore security rules (auth-scoped, replacing expired test-mode rules)
- Built the live data Dashboard with:
  - Stats cards (total rides, streak, data coverage)
  - Recent rides display
  - Quick action buttons
- CSV/JSON export on all 7 list pages via `exportUtils.js`
- Created `useDashboardData.js` hook that fetches all collections and computes stats

### Phase 6: Debrief Enhancements + New Assessment Forms
- Enhanced the Debrief form with:
  - Confidence level slider
  - Rider effort and horse effort sliders
  - Movement tag system (6 categories, ~30 tags via `MOVEMENT_CATEGORIES`)
- Built Physical Self-Assessment form + list (4 sections: profile, coaching, kinesthetic slider, tension body-map grids)
- Built Rider Self-Assessment form + list (6 sections: 3 scenarios, journey, regulation, attribute grids max 4, 5 self-rating sliders)
- Added new CSS patterns: `.movement-tag`, `.scenario-box`, `.scale-group`, `.attribute-grid`, `.body-parts-grid`

### Phase 7: Journey Event Log Enhancement
- Added planned/unplanned entry mode
- Added post-event reflection capability

### Phase 8: Data Visualizations (10 Charts)
- Built 7 client-side Recharts charts + 2 AI-derived charts + 1 Phase 2 placeholder
- Chart types: Line, Pie, Bar, Area, Radar
- Created `chartDataTransforms.js` with 7 pure transform functions
- Built `useVisualizationData.js` — two-phase hook (Firestore client-side data first, then async AI-derived data)
- Created `DataVisualizationsPanel.jsx` with `ChartWithInsight` wrapper component
- 10 individual chart components in `src/components/AICoaching/charts/`

### Phase 9: Cloud Functions + AI Integration
- Built Firebase Cloud Functions backend in `functions/`
- Created `functions/api/dataVisualizations.js` — handler for 3 API call patterns (DV-1 + DV-2 parallel, DV-3 sequential)
- Built `functions/lib/promptBuilder.js` with `buildDataVisualizationPrompt()` for the 3 API calls
- Created `src/services/aiService.js` for frontend-to-Cloud-Function communication

### Phase 10: Insights Page
- Built the Insights page with 4 tabs:
  - Coaching Voices (4 distinct AI coaching personalities)
  - Journey Map
  - Grand Prix Thinking
  - Data Visualizations

### Supporting Work Completed
- Comprehensive dressage test database (`comprehensive_dressage_test_database.json`) — all USDF levels through Grand Prix + freestyle
- Multiple reference/spec documents for prompt engineering, guardrails, and voice integration
- Tips & FAQ page with nav integration and getting-started banner

---

## Input Data Model (9 Data Collection Forms)

| Form | Frequency | Purpose |
|---|---|---|
| **Rider Profile** | One-time setup | Background, experience, goals, learning style, riding history |
| **Horse Profile** | One per horse | Name, breed, level, temperament, training history, quirks |
| **Post-Ride Debrief** | After every ride | Intentions, rider/horse state, what happened, wins, challenges, exercises |
| **Reflection Form** | Weekly+ | Deeper exploration across 6 categories with curated prompts (150+) |
| **Observation Form** | As needed | Learning from watching others ride, clinics, videos |
| **Journey Event Log** | As needed | Significant life events affecting training (planned/unplanned with post-event reflection) |
| **Rider Self-Assessment** | Periodic | Mental skills, emotional patterns, strengths/growth areas (6 sections incl. scenarios, regulation, attribute grids, self-rating sliders) |
| **Physical Self-Assessment** | Periodic | Body awareness, physical strengths/limitations (4 sections incl. kinesthetic slider, tension body-map grids) |
| **Horse Health & Soundness** | As needed | Per-horse log of vet visits, body work, saddle fittings, soundness concerns, emergencies (issue type, professionals, results, next steps, status) |
| **Rider Health & Wellness Log** | As needed | Rider's own dated health events affecting riding — appointments, injuries, recurring tightness; tracks issue type (maintenance/concern/injury), impact on riding, body areas, professionals, and resolution status |

### The Six Reflection Categories
These are a core innovation of YDJ — a universal framework for skill development reflection:
1. **Personal Milestone** — Progress the rider recognizes in themselves
2. **External Validation** — Recognition or feedback from others
3. **Aha Moment** — Sudden insight or understanding
4. **Obstacle** — Challenges, setbacks, frustrations
5. **Connection** — Moments of partnership with the horse
6. **Feel/Body Awareness** — Physical sensations and embodied learning

---

## AI Output System (7 Outputs)

Every output follows the same pattern: structured input → pre-processing → output-specific system prompt → Claude API → parsed response → rendered deliverable.

| Output | API Calls | Model | Trigger |
|---|---|---|---|
| **Journey Map** | 3 | Sonnet | Weekly + on-demand |
| **Multi-Voice Coaching** | 4 | Sonnet | Weekly + on-demand |
| **Data Visualizations** | 3 | Sonnet | Weekly (with coaching) |
| **Grand Prix Thinking L1** | 1 + pre-processing | Sonnet | Data threshold (5+ debriefs) or 30 days |
| **Grand Prix Thinking L2** | 4 | Opus (2) + Sonnet (2) | Milestones: onboarding, Week 4, Week 8 |
| **Physical Guidance** | 2 | Sonnet | Bi-weekly + on self-assessment |
| **Event Planner** | 4 | Sonnet | On-demand (event form submission) |
| **Self-Assessment Analysis** | 3 | Sonnet | On self-assessment submission |

**Weekly per-rider recurring:** ~10 API calls (Journey Map + Multi-Voice + Data Viz)

### Cost Management
- **Pre-processing is critical:** Aggregating raw data into computed summaries before API calls reduces input tokens by 60-80%
- **Caching:** GP Thinking dashboards cached in Firestore, regenerated on data thresholds only
- **Model selection:** Only GP Thinking Layer 2 (Calls 1-2) uses Opus; everything else uses Sonnet
- **Batch processing:** Weekly reports generated in batch during scheduled window

---

## Four Coaching Voices

Each voice receives identical pre-processed data but analyzes through a distinct lens:

| Voice | Perspective | Catchphrase | Tone |
|---|---|---|---|
| **The Classical Master** | Principles & Philosophy | "Why not the first time?" | Wise, patient, sometimes poetic |
| **The Empathetic Coach** | Rider Psychology & Partnership | "You've got this" | Warm, validating, insightful |
| **The Technical Coach** | Biomechanics & Precision | "Did you feel that?" | Clear, specific, constructive |
| **The Practical Strategist** | Goal Achievement & Planning | "Be accurate!" | Direct, organized, action-oriented |

### Intellectual Lineage (shapes voice character, not name-dropped)
- **Classical Master:** Alois Podhajsky, Charles de Kunffy, Kyra Kyrklund
- **Empathetic Coach:** Jane Savoie (mental side of riding)
- **Technical Coach:** Beth Baumert, Sally Swift, Susanne von Dietze, Mary Wanless (biomechanics/position)
- **Practical Strategist:** Reiner and Ingrid Klimke (systematic training)

---

## Critical Reference Documents

**Before modifying any prompt templates or AI-related code, read these documents first:**

### Prompt System
- `YDJ_AI_Coaching_Voice_Prompts_v3.md` — The master prompt file. Contains the Shared Base Context (prepended to all calls) and all four voice-specific system prompts. **This is where prompt additions get inserted.**

### Guardrails & Principles (included in API call context at runtime)
- `YDJ_Core_Dressage_Principles.md` — Authoritative training philosophy, movement execution standards, and philosophical foundation. The AI must evaluate all coaching recommendations against these principles. **This is a living document that the founder updates over time.**
- `YDJ_Level_Progression_Guardrails.md` — Realistic timelines for dressage level transitions. Prevents the AI from suggesting unrealistic advancement. The Inter I → Inter II transition (passage/piaffe introduction) is the most critical guardrail.
- `YDJ_Freestyle_Guardrails.md` — Competition rules for freestyle tests: compulsory elements, forbidden movements, eligibility requirements.

### Prompt Additions (wiring instructions for inserting guardrails into prompts)
- `YDJ_Prompt_Additions_Dressage_Principles.md` — Specifies exactly where/how to inject Core Dressage Principles awareness into each prompt
- `YDJ_Prompt_Additions_Level_Progression.md` — Specifies exactly where/how to inject level progression guardrails
- `YDJ_Prompt_Additions_Freestyle.md` — Specifies exactly where/how to inject freestyle guardrails
- `YDJ_Prompt_Additions_Horse_Health.md` — Specifies exactly where/how to inject horse health & soundness awareness into each prompt

### Platform Definition
- `YDJ_Platform_Outputs_Definition_v2.docx` — Comprehensive definition of all 7 outputs, input data model, API call architecture, and implementation priorities
- `YDJ_Complete_Technical_Plan_v2.docx` — Full technical plan: architecture, service providers, database schema, development phases, cost projections
- `YDJ_Voice_Integration_Update.docx` — How coaching voice snippets are embedded across all outputs (not just the Multi-Voice Coaching output)

### Supporting References
- `comprehensive_dressage_test_database.json` — Complete USDF test database (Training through Grand Prix + freestyle)
- `grand-prix-thinking-personalization-spec.md` — Detailed spec for the two-layer Grand Prix Thinking system
- `formatting-guide-for-chunked-outputs.md` — How to chunk and progressively disclose long AI outputs

---

## How AI Prompt Context Works at Runtime

This is the most important architectural concept to understand:

When the platform makes a Claude API call, the **system prompt** is assembled from multiple sources:

```
System Prompt = Shared Base Context
             + Voice-Specific Prompt (for coaching calls)
             + Output-Specific Instructions
             + Guardrail References (included as context documents):
                 - Core Dressage Principles
                 - Level Progression Guardrails (when level/timeline relevant)
                 - Freestyle Guardrails (when freestyle relevant)
             + Pre-Processed Rider Data
```

The Prompt Additions documents specify the exact text that gets **baked into** the Shared Base Context and voice prompts. The Guardrails/Principles documents are passed as **context documents** alongside the rider data.

**Key implication:** When the founder updates `YDJ_Core_Dressage_Principles.md` with new content, the AI automatically sees it on the next API call — no code changes needed. The Prompt Additions files only need updating if an entirely new *category* of guidance is created.

---

## Grand Prix Thinking + Physical Guidance — 30-Day Cycle Architecture (Updated April 2026)

Both outputs operate on a 30-day program model, not a report model.
A single monthly API call generates a full 4-week program.
Nothing regenerates until cycle expiry or a permitted trigger fires.

**Cycle state** (week pointer, tier, status) lives in separate Firestore documents:
- `analysis/grandPrixThinkingCycle/{userId}`
- `analysis/physicalGuidanceCycle/{userId}`

`weeklyAssignments` (GPT) and `weeklyFocusItems` (Physical) are extracted server-side
from the current week's content after generation and after each week advancement.
They are NEVER generated by the AI as separate fields.

### Hard Rules

1. **GPT L1 receives cached L2 `activePath` as input context** (unchanged from previous brief)
2. **Physical Body Awareness receives cached Exercise Protocol as input context** — Exercise Protocol generates first; Body Awareness Call 2 receives it as input
3. **Both outputs receive active GPT trajectory as input context**
4. **All weeklyFocus fields = extracted server-side, never AI-generated**

### Edge Cases

- **Mid-cycle start / new horse with < 5 debriefs:** truncated 2-week program, `status = "truncated"`
- **< 5 new debriefs in 30 days:** cached serve, `status = "extended"`, no API call
- **Significant health event:** `status = "health_hold"`, no regen, no AI guidance — hold notice only
- **Cycle expiry:** rider-triggered refresh only; no auto-regeneration

### Tier Rules

Enforced at API route level. Read token budgets from environment config — never hardcode.
- Standard: regen on expiry only (or first generation)
- Top: on demand up to token budget; mid-cycle upgrade unlocks immediately

### Path Options (L1 selects one per cycle)
- Pre-Ride (preparation, visualization, focus)
- In-Saddle (real-time mental strategies)
- Resilience (bouncing back from setbacks)

### Trajectory Paths (L2 generates all three monthly)
- Ambitious Competitor (push toward next level with appropriate timelines)
- Steady Builder (deepen current level, no rush)
- Curious Explorer (broaden skills laterally rather than vertically)

Layer 2 uses Opus for the analysis calls because it requires simultaneous reasoning about rider psychology, horse capability, level progression rules, and training philosophy.

### Implementation Reference
- `YDJ_GPT_Physical_30DayCycle_Implementation_Brief.md` — Authoritative brief for all cycle architecture details
- `gpt-v2.html` — GPT UI prototype
- `physical-guidance-v2.html` — Physical Guidance UI prototype
- `GPT_Redesign_Implementation_Brief.md` — **DEPRECATED** — superseded by the 30-Day Cycle brief; do not implement

---

## Subscription Tiers

YDJ uses a **3-tier paid model** plus a **free Pilot tier** with a date-driven grace period. The authoritative tier × capability mapping lives in [`src/constants/entitlements.js`](src/constants/entitlements.js) and its backend mirror [`functions/lib/entitlements.js`](functions/lib/entitlements.js) — update both together when changing what a tier unlocks. The price/feature definitions live in [`src/services/subscriptionService.js`](src/services/subscriptionService.js) (`TIERS`).

| Tier | Monthly | Annual (effective /mo) | What's Included |
|---|---|---|---|
| **Pilot** | Free | — | Full platform access through 2026-05-15. Read-only grace through 2026-07-07; blocked thereafter unless converted. |
| **Working** | $30/mo | $300/yr ($25/mo) | All data entry forms, Multi-Voice Coaching (all 4 voices), Journey Map (12-month history), Weekly Focus, Weekly Coach Brief, Learn section & Rider's Toolkit |
| **Medium** ★ popular | $50/mo | $500/yr ($41.67/mo) | Everything in Working + Grand Prix Thinking (monthly cycle), Physical Guidance (monthly cycle), Show Planner (10 shows/yr), Journey Map (full history), Visualization Scripts, Practice Card, Readiness Snapshot |
| **Extended** | $130/mo | $1,300/yr ($108.33/mo) | Everything in Medium + unrestricted GPT & Physical Guidance regeneration, unlimited Show Planner, priority processing |

### Discount Programs
- **Initial Centerline (IC) — Founder cohort.** Annual-only, capped at 100 spots, enrollment closes 2026-07-08. Locked-in tier-specific discount; 6-month upgrade window during which the founder rate carries to a higher annual tier. Lifetime rate while continuously subscribed. Coupon IDs: `IC_WORKING_2026`, `IC_MEDIUM_2026`, `IC_EXTENDED_2026`.
- **Pilot Monthly Discount.** 10% off any monthly tier for the lifetime of continuous subscription. Lapsing (cancel, downgrade, or switch to annual) forfeits the discount permanently. Coupon: `PILOT_MONTHLY_10`.
- **30-Day Free Trial.** 30 days free on Medium monthly + 10% off the first year on whatever plan the user ultimately chooses. Coupon: `TRIAL_FIRSTYEAR_10`.

### Pilot Lifecycle (Critical Dates)
| Date Range | Status | Effect |
|---|---|---|
| ≤ 2026-05-15 | `pilot` | Full access — same capabilities as Extended tier |
| 2026-05-16 → 2026-07-07 | `pilot-grace` | Read-only on existing data; cannot create new entries or generate new AI outputs |
| ≥ 2026-07-08 | `pilot-expired` | Blocked until conversion to a paid plan |

These boundary dates live in `entitlements.js` (`PILOT_END_ISO`, `PILOT_GRACE_END_ISO`). Status transitions are **computed at access time** — there is no migration step on June 1 or July 8.

### Stripe & Billing Wiring
- **Coupon + tier definitions:** [`functions/api/stripe.js`](functions/api/stripe.js) (`COUPON_IDS`, `IC_TIER_COUPONS`).
- **Subscription state:** Firestore `users/{uid}` document — fields: `subscriptionTier` (`working`/`medium`/`extended`/`none`), `subscriptionStatus` (`active`/`trialing`/`past_due`/`unpaid`/`canceled`/`none`), `subscriptionInterval` (`monthly`/`annual`), `isInitialCenterline`, `icTier`, `icStatus`, `icEnrollmentDate`, `isPilot`, `pilotDiscountActive`, `trialStarted`, `trialConverted`.
- **Tier-change flows that preserve coupons:** `changeSubscriptionPlan` callable supports `flow: "ic_upgrade"` (IC member upgrading within their 6-month window) and `flow: "pilot_monthly_upgrade"` (pilot upgrading monthly tier, retains 10% lifetime).
- **Customer Portal lockdown:** plan switching is disabled in the portal — config ID stored at Firestore `/admin/stripeConfig.billingPortalConfigId`. All tier changes route through `/pricing` so coupon swap logic isn't bypassed. Configured by `scripts/configureBillingPortal.cjs` (test-mode by default; pass `--allow-live` after the live-key swap).
- **Live ↔ test scope:** Stripe portal configurations are per-account (test ≠ live). When production swaps to a live key, re-run the portal-config script with `--allow-live`.

---

## Development Phases

| Phase | Timeline | Focus |
|---|---|---|
| **1: Pilot** | Feb–mid-May 2026 | React app with full forms, dashboard, visualizations, Cloud Functions; all inputs/outputs available to pilot participants |
| **2: AI Integration** | May–Jun 2026 | All 27 API call patterns server-side, pre-processing pipeline, report rendering |
| **3: Payments** | May 2026 (parallel) | Stripe, subscription gating, feature tiers |
| **4: Dashboard Phase 2** | Jun–Aug 2026 | GP Thinking L2, Event Planner, PDF export |
| **5: PWA** | Aug–Sep 2026 | Offline forms, push notifications, install-to-home |
| **6: Scale** | Sep–Dec 2026 | Performance, analytics, referral program, 200+ users |

---

## Key Domain Knowledge

### Dressage Level Progression (USDF → FEI)
Introductory → Training → First → Second → Third → Fourth → Prix St. Georges (PSG) → Intermediate I → **Intermediate II** → Grand Prix → Grand Prix Special

**The most critical transition:** Inter I → Inter II introduces passage and piaffe — entirely new movement categories (not harder versions of existing movements). This takes 18-36 months and should NEVER be skipped or compressed in AI recommendations.

### Three Non-Negotiable Training Principles
Every AI coaching recommendation must respect these:
1. **Relaxation** (Losgelassenheit) — freedom from tension
2. **Forwardness** (Schwung) — immediate response to light aids
3. **Trust in the Hand** (Anlehnung) — horse seeks pleasant contact

If any of these is compromised, the AI should recommend restoring basics before advancing.

### The Training Scale (pyramid — each level builds on the one below)
Rhythm → Relaxation → Contact → Impulsion → Straightness → Collection

---

## Common Development Tasks

### Adding a new movement to the principles
Edit `YDJ_Core_Dressage_Principles.md` Section 4. No other files need changes.

### Adding a new coaching voice behavior
Edit `YDJ_AI_Coaching_Voice_Prompts_v3.md` in the relevant voice section.

### Adding a new guardrail rule
If it fits an existing category (principles, level progression, freestyle), add it to that document. If it's a new category, create a new guardrails + prompt additions pair following the existing pattern.

### Modifying an output's API call structure
Reference `YDJ_Platform_Outputs_Definition_v2.docx` for the current architecture, then update the relevant prompt template and Cloud Function.

### Working with the dressage test database
The database is in `comprehensive_dressage_test_database.json`. It covers all USDF levels (Introductory through Grand Prix) plus freestyle tests. Verification process is documented in the Platform Outputs Definition.

### Adding a persistent prompt box to a textarea field
Use the `.prompt-box` / `.prompt-box-content` pattern established in
post-ride-debrief-with-intentions.html. The CSS lives in the <style> block
of each file. Call togglePrompt(fieldId) for the hide/show toggle.
Placeholder text should be simplified to "Start typing…" when a prompt
box is present.

---

## Important Conventions

- **Mobile-first:** All UI must work on phones at the barn. Test on iOS Safari specifically (it has caused data persistence issues before).
- **Voice input:** Forms support Web Speech API dictation. Keep form labels clear enough to work as voice prompts.
- **Horse names:** When a rider has named their horse(s), the AI always uses the horse's name — never "your horse."
- **Data grounding:** AI coaching should quote the rider's own language from debriefs/reflections. Never generic.
- **Chunked output:** Long AI responses use progressive disclosure — "scan first, dive deep when ready."
- **Cost consciousness:** Pre-process aggressively to reduce API tokens. Use Sonnet unless the task specifically requires Opus-level reasoning.
- **Horse health records:** Health data contextualizes training — it explains patterns, tempers recommendations, and surfaces connections. The AI should never use health records to alarm the rider or second-guess veterinary/professional judgment. Its role is correlation, not diagnosis.
- **Rider health records:** When AI outputs reference rider health patterns, draw from the `riderHealthEntries` collection. This is separate from `horseHealthEntries` which tracks horse health. Rider entries use `title` as the primary identifier; there is no `name` field parallel to horse's `horseName`. Rider health is rider-private: strip it from any shared-audience output (Weekly Coach Brief, Journey Map) at the prompt-assembly layer, never rely on instructions alone. Never echo numeric body data (weight, BF%, BMR) back to the rider; never reference professionals by first name.

---

## IP Notes

- "Your Dressage Journey" — dressage-specific brand (IP filed)
- "Your Training Journey" — universal platform brand for future expansion (IP filed)
- The six-category reflection framework applies to skill development broadly, beyond dressage
