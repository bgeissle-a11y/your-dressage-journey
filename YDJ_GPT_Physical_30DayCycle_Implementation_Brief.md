# YDJ — Grand Prix Thinking + Physical Guidance
# 30-Day Cycle Architecture — Implementation Brief

**Version:** 1.0  
**Date:** April 2026  
**Status:** Ready for Claude Code implementation  
**Reference prototypes:** `physical-guidance-v2.html` · `gpt-v2.html`  
**Supersedes:** `GPT_Redesign_Implementation_Brief.md` (see deprecation note below)

---

> ⚠️ **DEPRECATION NOTICE — `GPT_Redesign_Implementation_Brief.md`**
>
> That document is superseded by this brief and must not be implemented. Three specific conflicts:
> - It specifies slim output (Week 1 only) + on-demand expansion — **superseded by full 4-week upfront generation**
> - It specifies weekly L1 cycle — **superseded by monthly 30-day cycle**
> - It references the `expanded/{pathId}` subcollection — **this brief explicitly removes that**
>
> If the old file still exists in the project, ignore it entirely. This document is the authoritative implementation reference.

---

## Overview

This brief covers the redesign of both Grand Prix Thinking (GPT) and Physical Guidance from outputs that generate on demand into 30-day programs with internal 4-week progression. Both outputs share identical architecture: a single monthly API generation, a lightweight week-pointer stored in Firestore, and a two-tab structure (4-week program / stable monthly content). The outputs are built in parallel and the implementation checklist at the end is structured accordingly.

**What changes across both outputs:**

- Single monthly API generation replaces any weekly generation trigger
- Full 4-week program generated upfront — no on-demand week expansion
- Cycle status bar (started / week X of 4 / next refresh / regenerate) in every hero
- Week chip navigation (1–4) reads from the cached document; no API call on week switch
- `weeklyFocus` extraction reads from `weeks[currentWeekIndex]` instead of always `weeks[0]`
- Tier-based regeneration rules enforced at the API route level

**What does NOT change:**

- Grand Prix Thinking name, nav placement, or Firestore path
- Physical Guidance name, nav placement, or Firestore path
- `weeklyFocusItems` field name or structure (Physical)
- `weeklyAssignments` field name or structure (GPT)
- Weekly Focus brief or implementation — no edits needed
- Voice Integration fields (`voice_annotation`, `voice_intro`) in either output
- Training Trajectory (GPT L2) prompt or generation logic — only its cadence label changes
- Body Mapping prompt additions or exercise priority hierarchy (Physical)

---

## Part 1: The 30-Day Cycle Model

Both GPT and Physical Guidance operate on a **program model, not a report model.** The monthly API call generates a complete 4-week program. Nothing regenerates until the cycle ends or a permitted trigger fires. The rider navigates within a stable document.

### 1A. Cycle State — Firestore

A single lightweight document tracks cycle state for each output, per user. This is not the output document — it is only the pointer.

**GPT cycle state:** `analysis/grandPrixThinkingCycle/{userId}`  
**Physical cycle state:** `analysis/physicalGuidanceCycle/{userId}`

Both documents use identical schema:

```
{
  cycleStartDate:  timestamp         // Date the current 30-day cycle began
  currentWeek:     number (1–4)      // Auto-advances; never AI-generated
  cycleId:         string            // YYYY-MM-DD of cycle start (e.g. "2026-04-01")
  tier:            string            // "standard" | "top" — copied from user profile at generation time
  lastRegenAt:     timestamp | null  // Timestamp of last manual regen (null if never)
  regenCount:      number            // Count of manual regens in current billing period
  status:          string            // "active" | "expired" | "truncated" | "extended" | "health_hold"
}
```

### 1B. Week Pointer Advancement

`currentWeek` advances automatically — no API call, no rider action required.

```javascript
// Computed client-side on page load and on Weekly Focus load
weekNumber = Math.min(4, Math.floor((today - cycleStartDate) / 7) + 1)

// If currentWeek in Firestore is behind the computed value, update it
// Weekly Focus reads the updated currentWeek to extract the correct items
```

The week pointer is read-only from the rider's perspective. They can navigate to any week via the week chips, but the "current week" that feeds Weekly Focus is always the computed value above. Future weeks are accessible (content is pre-generated) but visually marked as upcoming.

### 1C. Cycle Expiration and Refresh

When `today > cycleStartDate + 30 days`, status becomes `"expired"`. The output page shows a prominent refresh prompt in place of the normal cycle status bar:

> *New cycle ready — your data has grown since [cycleStartDate]. Tap to generate your next 4-week program.*

**The system does NOT auto-regenerate on expiration.** Reasons:
- A rider who hasn't ridden in two weeks has no new data to improve the generation
- Auto-generation burns API tokens without rider awareness
- The rider's trigger is the signal that they're ready for a new cycle

**Weekly Focus behavior when cycle is expired:** continue showing Week 4 content. Do not show a stale warning on Weekly Focus — the content is still valid. Show the refresh prompt only on the GPT and Physical Guidance output pages.

---

## Part 2: Hard Rules (Non-Negotiable Architecture)

These rules are enforced in the prompt system and at the API route level, and must be documented in `CLAUDE.md`.

### Rule 1: Exercise Protocol Informs Body Awareness (Physical)

Body Awareness receives the active Exercise Protocol's priority patterns as input context before generating — same pre-processing logic as GPT L1 receiving L2 trajectory. Read the cached Exercise Protocol, extract the priority tier and top patterns, pass into the Body Awareness system prompt.

**Prompt addition to Body Awareness system prompt:**

```
EXERCISE PROTOCOL ALIGNMENT RULE (CRITICAL):

You have been provided with the rider's current Exercise Protocol (stable for this
30-day cycle). The awareness noticing cues you generate for the 4-week program MUST
connect to and reinforce the exercises prescribed.

For each exercise in the protocol, at least one noticing cue across the 4-week program
should name what that exercise produces in the saddle. A rider doing the flamingo balance
exercise off-horse should encounter a noticing cue in-saddle that names what changed when
it is working.

NEVER generate a Body Awareness noticing cue that contradicts an exercise in the protocol.
NEVER prescribe a new exercise or physical intervention in Body Awareness — that belongs
in the Exercise Protocol only.
```

### Rule 2: Both Outputs Align to Active GPT Trajectory

Both GPT Mental Performance and Physical Guidance Body Awareness receive the active Training Trajectory as input context. This is the existing Trajectory Alignment Rule from the previous GPT brief, now extended to Physical Guidance.

- **GPT Mental Performance:** path selection and framing must support the active trajectory (unchanged)
- **Physical Guidance Body Awareness:** the 4-week awareness progression framing must support the active trajectory
- **Physical Guidance Exercise Protocol:** exercise urgency and framing must match trajectory philosophy (Steady Builder → no urgency language; Ambitious Competitor → competition-readiness framing appropriate)

If no trajectory exists: both outputs default to Ambitious Competitor framing and note in their `aiReasoning` field that trajectory analysis is pending.

### Rule 3: weeklyFocusItems and weeklyAssignments = Extracted, Not Generated

After the monthly API call returns, the pre-processing layer extracts the current week's items server-side:

```javascript
// GPT extraction
const currentWeekAssignments = gptOutput.selectedPath.weeks[currentWeekIndex].assignments;
gptOutput.weeklyAssignments = currentWeekAssignments.map(item => ({
  title:       item.title,
  description: item.description,
  when:        item.when,
  buildToward: item.trajectoryLink
}));

// Physical extraction
const currentWeekPatterns = physicalOutput.weeks[currentWeekIndex].patterns;
physicalOutput.weeklyFocusItems = currentWeekPatterns
  .filter(p => p.feedsWeeklyFocus)
  .map(p => ({
    text:          p.noticingCuePrimary,
    sub:           p.source || null,
    isHorseHealth: p.isHorseHealth
  }));
```

When `currentWeek` advances from 1 to 2, the extraction re-runs server-side and overwrites the `weeklyAssignments` / `weeklyFocusItems` fields. Weekly Focus reads the updated fields automatically — no Weekly Focus code changes required.

**Verification test (both outputs):**
- After any monthly generation, confirm weeklyFocus fields match Week 1 content word-for-word
- After week pointer advances to Week 2, confirm weeklyFocus fields update to Week 2 content
- Navigate from Weekly Focus to output page — confirm linked content matches exactly
- Confirm no content appears on Weekly Focus that does not exist verbatim in the output document

---

## Part 3: Tier System and Regeneration Rules

### 3A. Tier Definitions

| Tier | Regeneration | Cadence | Notes |
|---|---|---|---|
| Standard | On cycle expiration only (30 days) | Monthly | Default for all riders |
| Top | On demand, up to tier token maximum | Any time | Unlocks on upgrade; mid-cycle regen resets week pointer to 1 |

### 3B. Standard Tier Regeneration Flow

A standard-tier rider can only trigger generation when:
1. Cycle is expired (`status = "expired"`) — normal end-of-month refresh
2. First generation ever (no document exists) — initial setup
3. New horse added with sufficient data — see Edge Cases

The "Regenerate early" button is visible to all tiers but shows a blocking modal for standard-tier riders:

> *Early regeneration is available on the Top tier plan. Your current cycle runs until [date]. Your next free refresh will incorporate all rides logged between now and then. Upgrade to Top tier to regenerate any time.*

### 3C. Top Tier Regeneration Flow

- Token budget per regeneration enforced at the API route level via environment config — never hardcoded
- `regenCount` increments on every manual regeneration
- Optional per-period maximum enforced at route level before calling the API
- Regeneration always resets `currentWeek` to 1 and `cycleStartDate` to today — no option to resume mid-week
- Warning modal shown before regen confirming the week reset (see prototype for copy)

**Mid-cycle upgrade:** a rider who upgrades to Top tier mid-cycle can regenerate immediately. Check tier at the time of the regeneration request, not at cycle start.

### 3D. The Outlier Case — Multiple Daily Regenerations

- Consider a minimum cooldown of 2 hours between regenerations for top tier (configurable via env var)
- If a rider regenerates without logging new debriefs since the last generation, show an advisory (not blocking): *"No new rides logged since your last generation. Regenerating now will produce similar results."*
- Collect `regenCount` data across the pilot to inform whether a hard monthly cap is needed before public launch

---

## Part 4: Edge Case Handling

### 4A. Mid-Cycle Start (New Rider at First Data Threshold)

A new rider reaches the minimum data threshold (5 debriefs) for the first time partway through a calendar month. They receive a **truncated 2-week program** — not 4.

| | |
|---|---|
| **Trigger** | First-ever generation AND fewer than 15 days remain in the current calendar month |
| **Program length** | 2 weeks. Full 4-week program at next cycle. |
| **Cycle state** | `status = "truncated"` · `currentWeek = 1` |
| **Cycle bar display** | "Week 1 of 2 · Introductory cycle · Full 4-week program starts [next month date]" |
| **Week chips** | Only chips 1 and 2 rendered. Chips 3 and 4 not shown in truncated mode. |
| **Weekly Focus** | Extracts from `weeks[0]` as normal. Advances to week 2 at day 7. |
| **Next cycle** | Full 4-week generation at expiration. Status resets to `"active"`. |

**Prompt addition for truncated generation:** add a `TRUNCATED CYCLE` note to the system prompt instructing the AI to generate only 2 weeks, acknowledging the rider is new to the platform, using a slightly more introductory tone without condescending to their actual dressage experience.

### 4B. Insufficient New Data (Fewer Than 5 New Debriefs in 30 Days)

| | |
|---|---|
| **Trigger** | Cycle expired AND debrief count since last generation < 5 |
| **Action** | Serve cached document for another 30 days. Do NOT call the API. |
| **Cycle bar display** | "Cycle extended · Log 5+ rides to unlock your next program" |
| **Rider notification** | Soft banner: "Not enough new rides to refresh. Log more rides to get updated guidance." |
| **Status** | `"extended"` — no change to `currentWeek` or `cycleStartDate` |
| **Top tier** | Top-tier riders bypass this check — they can regenerate regardless of debrief count. |

### 4C. New Horse Mid-Cycle

| | |
|---|---|
| **Minimum threshold** | 5 debriefs on the new horse before it is included in output generation |
| **Before threshold** | New horse appears in hero data snapshot as "pending." Output continues to address existing horses only. |
| **At threshold** | "New horse data available" prompt on the output page. Standard tier: wait for next cycle. Top tier: option to regenerate now (truncated, 2-week max — treated as mid-cycle start logic). |
| **Cycle impact** | Adding a horse does not automatically invalidate the current cycle for standard tier. |

### 4D. Significant Health Event (Horse or Rider)

This is the one edge case where regeneration is **not** the right default response. A freshly generated program based on pre-injury data will produce recommendations the rider or horse cannot safely follow.

| | |
|---|---|
| **Trigger** | Health event flagged in Journey Event Log OR Horse Health tracker with `severity = "significant"` |
| **Action** | Do NOT auto-regenerate. Show a health hold notice on the output page. |
| **Cycle state** | `status = "health_hold"`. Cycle bar replaced by hold notice. |
| **Hold notice copy** | "Your current program is paused. We've noted a significant health event for [horse/rider]. Resume your program when cleared by your veterinarian or healthcare provider. Top tier: you may regenerate when you're ready to return." |
| **Standard tier** | Program resumes automatically (`status → "active"`) when the health event is marked resolved in the tracker. Next cycle generates at next normal expiration. |
| **Top tier** | Can manually resume and regenerate at any time after flagging the event resolved. |
| **Weekly Focus** | GPT and Physical cards show simplified hold state: "Program paused · resume when cleared." Show Planner and Coaching cards unaffected. |

> ⚠️ **No AI-generated return-to-work guidance.** YDJ does not generate "return from injury" programming. The platform resumes normal operation when the rider marks the event resolved. Return-to-work guidance must come from the rider's veterinarian or healthcare provider.

---

## Part 5: API Call Specifications

### 5A. GPT — Monthly Generation (Single Call)

GPT L1 (Mental Performance) is a single monthly call that generates the full 4-week program. The slim output + on-demand expansion architecture from the previous brief is superseded.

| Parameter | Value |
|---|---|
| Model | `claude-sonnet-4-5` |
| max_tokens | Standard: 4000 · Top tier: `PHYSICAL_GPT_TOP_TIER_MAX_TOKENS` env var |
| Trigger | Rider-initiated on expired or first-run. Top tier: any time. |
| Pre-processing | 1. Read cached L2 `activePath`. 2. Set `currentWeek = 1`. 3. Check tier and enforce regen rules. |
| Post-processing | 1. Extract `weeklyAssignments` from `weeks[0].assignments`. 2. Write full document to Firestore. 3. Update cycle state document. |
| Staleness | `stale = false` at generation. Set `stale = true` when cycle expires. |

**GPT L2 (Training Trajectory)** cadence is unchanged — monthly, independent of L1. No prompt or schema changes. Only UI change: tab chip badge now reads `MONTHLY`.

### 5B. Physical Guidance — Monthly Generation (Two Sequential Calls)

Physical Guidance generates two outputs on the monthly trigger: **Exercise Protocol first, then Body Awareness.** This ordering is required by Rule 1.

**Call 1: Exercise Protocol**

| Parameter | Value |
|---|---|
| Model | `claude-sonnet-4-5` |
| max_tokens | Standard: 3000 · Top tier: `PHYSICAL_PROTOCOL_TOP_TIER_MAX_TOKENS` env var |
| Input | Physical self-assessment, body mapping results, rider profile, debrief history, active GPT trajectory |
| Output | Priority tier classification, prescribed exercises (all with saddle-outcome links), body awareness profile, pre-ride ritual |
| Post-processing | Cache Exercise Protocol document to Firestore **before** proceeding to Call 2 |

**Call 2: Body Awareness (4-Week Program)**

| Parameter | Value |
|---|---|
| Model | `claude-sonnet-4-5` |
| max_tokens | Standard: 4000 · Top tier: `PHYSICAL_AWARENESS_TOP_TIER_MAX_TOKENS` env var |
| Input | All Call 1 inputs PLUS the cached Exercise Protocol output from Call 1 |
| Output | 4-week program with patterns, per-week noticing cues, debrief prompts, success metrics per week |
| Post-processing | 1. Extract `weeklyFocusItems` from `weeks[0].patterns`. 2. Merge Call 1 and Call 2 outputs into single `physicalGuidance` Firestore document. 3. Update cycle state. |

### 5C. Output JSON Schema Changes

**GPT L1 — changed fields**

`selectedPath.weeks` now contains all 4 weeks. `weekPreviews` field removed. `expanded/{pathId}` subcollection removed. On-demand expansion removed.

```json
"weeks": [
  {
    "number": 1,
    "title": "...",
    "focus": "...",
    "assignments": [
      {
        "title": "...",
        "description": "...",
        "example": "...",
        "when": "Pre-ride | During ride | Post-ride | Daily",
        "trajectoryLink": "..."
      }
    ],
    "successMetric": "...",
    "checkIn": ["...", "..."]
  },
  { "number": 2, "..." },
  { "number": 3, "..." },
  { "number": 4, "..." }
]
```

**Physical Guidance — new top-level schema**

```json
{
  "generatedAt": "timestamp",
  "cycleId": "2026-04-01",
  "dataSnapshot": {
    "debriefCount": 24,
    "assessmentCount": 3,
    "bodyMappingComplete": true,
    "tier": "standard"
  },
  "activeTrajectory": "ambitious_competitor",
  "patternAnalysis": {
    "primaryPatterns": [],
    "secondaryPatterns": [],
    "asymmetries": []
  },
  "weeks": [
    {
      "number": 1,
      "theme": { "title": "Establish", "subtitle": "Name it when you feel it" },
      "patterns": [
        {
          "id": "hand_tension",
          "title": "...",
          "source": "...",
          "isHorseHealth": false,
          "feedsWeeklyFocus": true,
          "badge": "Primary · Rider",
          "description": "...",
          "noticingCuePrimary": "...",
          "noticingCues": ["...", "..."],
          "debriefPrompt": "→ Log in debrief: ..."
        }
      ],
      "successMetric": "...",
      "reflectionNudge": "..."
    }
  ],
  "exerciseProtocol": {
    "priorityTier": "proprioceptive",
    "exercises": [],
    "preRideRitual": []
  },
  "bodyAwarenessProfile": {
    "level": 5,
    "blindSpots": [],
    "strengths": []
  },
  "weeklyFocusItems": [],
  "aiReasoning": {
    "patternCited": "...",
    "trajectoryLink": "..."
  },
  "stale": false
}
```

### 5D. Week Pointer Advancement and weeklyFocus Re-extraction

When `currentWeek` advances, a lightweight server function re-extracts the weeklyFocus fields. This is **not** an API call — it reads from the already-cached document.

```javascript
async function advanceWeekAndExtract(userId, outputType) {
  const cycleDoc = await getCycleState(userId, outputType);
  const computed = computeCurrentWeek(cycleDoc.cycleStartDate);
  if (computed === cycleDoc.currentWeek) return; // no change needed

  const outputDoc = await getOutputDoc(userId, outputType);
  const newItems  = extractWeeklyFocusItems(outputDoc, computed);

  await Promise.all([
    updateCycleState(userId, outputType, { currentWeek: computed }),
    updateOutputDoc(userId, outputType, {
      weeklyFocusItems: newItems   // or weeklyAssignments for GPT
    })
  ]);
}
```

---

## Part 6: Firestore Schema

### New Documents

| Path | Purpose |
|---|---|
| `analysis/grandPrixThinkingCycle/{userId}` | GPT cycle state (week pointer, tier, status) |
| `analysis/physicalGuidanceCycle/{userId}` | Physical cycle state (week pointer, tier, status) |

### Modified Documents

| Path | Change |
|---|---|
| `analysis/grandPrixThinkingL1/{userId}` | `weeks` array now contains all 4 weeks. `weekPreviews` removed. |
| `analysis/physicalGuidance/{userId}` | New schema (see Part 5C). Previously unstructured; now fully typed. |

### Removed

| Path | Reason |
|---|---|
| `analysis/grandPrixThinkingL1/{userId}/expanded/{pathId}` | On-demand expansion removed. All 4 weeks generated upfront. |

---

## Part 7: UI Specifications

The approved prototypes are the definitive references for all visual decisions:

- `physical-guidance-v2.html` — Physical Guidance
- `gpt-v2.html` — Grand Prix Thinking

Do not redesign. The notes below clarify behavior not visible in static HTML.

### 7A. Shared UI Behaviors (Both Outputs)

- **Cycle status bar:** cycle start date / "Week X of 4" (highlighted) / "Next refresh: [date] · [N] days" / "Regenerate early" button
- **Week chips:** only the current week chip is active (filled) on load. All 4 chips are interactive. Tapping a chip does not change `currentWeek` in Firestore — it is navigation only.
- **Default state on load:** current week panel is open. All accordion items (assignments, exercises, patterns) are collapsed by default. **Exception: pre-ride ritual in Physical Guidance is open by default.**
- **Regenerate early button:** standard tier shows upgrade modal. Top tier shows warning modal with week-reset confirmation.
- **Weekly Focus callout:** shown once per tab, below all week content. Shows "View in This Week →" link.

### 7B. GPT-Specific UI Behaviors

- **Training Trajectory tab:** active path card open by default. Alternative cards collapsed. Both alternatives show "Why not selected this cycle" section inside their collapsed body.
- **"Other paths available" chips** in the AI Reasoning card: tapping scrolls to Trajectory tab and opens that path's card. Does NOT trigger regeneration.
- **Check-in questions:** collapsed card at bottom of each week panel. Not required — they exist to prompt reflection and may lead the rider to log a reflection entry.
- **Assignment item checkboxes:** persisted to `weeklyFocus/{weekId}.checkedItems.gpt[]`. Index matches `assignments` array. Independent from Weekly Focus page checkboxes — not synced.

### 7C. Physical Guidance-Specific UI Behaviors

- **Pattern cards:** collapsed by default. "Feeds Weekly Focus" badge and 📌 pin visible on the toggle row in collapsed state — rider knows it's extracted without opening it.
- **"Mark as applied this week" checkbox:** persisted to `weeklyFocus/{weekId}.checkedItems.physical[]`. Not synced to Weekly Focus page.
- **Body Awareness Profile:** collapsed by default in Exercise Protocol tab.
- **Body Awareness Prompts / Trainer Coordination:** collapsed card at bottom of Exercise Protocol tab. Contains PT coordination notes and medical disclaimer.
- **Priority tier display:** shows which tiers are active vs. pending (VOR not completed) vs. not yet applicable. Visual only, not interactive.
- **Horse health pattern cards:** rust/red color treatment (`.horse-health` CSS class). Same collapse/expand behavior as rider patterns. Debrief prompt asks specifically about horse state.
- **Pre-ride checklist:** items are checkboxes; state is **NOT** persisted to Firestore. Resets on every page load — this is a daily-use ritual, not tracked progress state.

---

## Part 8: CLAUDE.md Updates

Add the following section to `CLAUDE.md`, replacing or appending to the existing Grand Prix Thinking section:

```markdown
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
```

---

## Part 9: Implementation Checklist

Designed for parallel implementation. **Phase 1 must complete before Phase 2 begins.** Phases 2A and 2B can run in parallel once Phase 1 is done.

---

### Phase 1: Shared Infrastructure (Complete First)

**Cycle State**
- [ ] Create `analysis/grandPrixThinkingCycle/{userId}` Firestore document with schema from Part 6
- [ ] Create `analysis/physicalGuidanceCycle/{userId}` Firestore document with identical schema
- [ ] Write `computeCurrentWeek(cycleStartDate)` utility function — shared by both outputs and Weekly Focus
- [ ] Write `advanceWeekAndExtract(userId, outputType)` function — handles re-extraction for both
- [ ] Add security rules: users can read own cycle state; writes only via Cloud Functions

**Tier Enforcement**
- [ ] Add `tier` field to user profile document if not present
- [ ] Write `checkRegenPermission(userId, outputType)` function — returns `{ allowed: boolean, reason: string }`
- [ ] Add `PHYSICAL_GPT_TOP_TIER_MAX_TOKENS`, `PHYSICAL_PROTOCOL_TOP_TIER_MAX_TOKENS`, `PHYSICAL_AWARENESS_TOP_TIER_MAX_TOKENS` to environment config
- [ ] Standard tier: block regen if `status !== "expired"` — return upgrade modal payload
- [ ] Top tier: allow regen; increment `regenCount`; enforce optional cooldown

**Weekly Focus Integration**
- [ ] Update `useWeeklyFocus.js` hook to read `currentWeek` from cycle state document
- [ ] Confirm `weeklyAssignments` and `weeklyFocusItems` are read from output documents (verify only — no change expected)
- [ ] Test: advance `currentWeek` manually in Firestore — confirm Weekly Focus cards update on next load

---

### Phase 2A: Grand Prix Thinking (Parallel with 2B)

**API Route**
- [ ] Remove on-demand expansion Cloud Function (`analysis/grandPrixThinkingL1/{userId}/expanded/{pathId}`)
- [ ] Update L1 generation route to generate all 4 weeks in single call
- [ ] Add pre-processing: read cached L2 `activePath`; add to system prompt context block
- [ ] Add post-processing: extract `weeklyAssignments` from `weeks[0].assignments` on generation; re-extraction function handles subsequent weeks
- [ ] Enforce tier and regen rules via `checkRegenPermission`
- [ ] Write `cycleId`, `cycleStartDate`, `currentWeek = 1` to cycle state document on successful generation

**Prompts**
- [ ] Update L1 system prompt: remove `WEEK PREVIEW RULE`; update `WEEK GENERATION RULE` to generate all 4 weeks with escalating progression (Diagnostic Lens → Checkpoint Habit → Under Pressure → Anchoring)
- [ ] Add `TRUNCATED CYCLE` instruction (2-week version) as conditional block in system prompt
- [ ] L2 system prompt: no changes

**UI**
- [ ] Build Grand Prix Thinking page from `gpt-v2.html` prototype
- [ ] Cycle status bar component (build once in Phase 1 if shareable with Physical)
- [ ] Week chip navigation: all 4 rendered; only current chip active on load; tapping does not write to Firestore
- [ ] Assignment accordion: collapsed default; full detail + data callout on expand
- [ ] Check-in questions: collapsed card at bottom of each week panel
- [ ] Assignment item checkboxes: persisted to `weeklyFocus/{weekId}.checkedItems.gpt[]`
- [ ] "Other paths available" chips: navigate to Trajectory tab and open that card; no regen trigger
- [ ] Training Trajectory tab: active path open by default; alternatives collapsed; "Why not selected" in body
- [ ] Regen button: standard → upgrade modal; top → week-reset warning modal
- [ ] Health hold state: replace cycle bar with hold notice
- [ ] Truncated state: render only 2 week chips; cycle bar shows "Week X of 2 · Introductory cycle"
- [ ] Extended state: cycle bar replaced by "Cycle extended · Log 5+ rides" message

---

### Phase 2B: Physical Guidance (Parallel with 2A)

**API Route**
- [ ] Create Physical Guidance Cloud Function with two-call sequence (Exercise Protocol first, Body Awareness second)
- [ ] Pass Exercise Protocol output as context into Body Awareness Call 2
- [ ] Pass active GPT trajectory into both calls
- [ ] Post-processing: extract `weeklyFocusItems` from `weeks[0]`; write merged document to Firestore
- [ ] Enforce tier and regen rules via `checkRegenPermission`
- [ ] Write cycle state on successful generation

**Prompts**
- [ ] Exercise Protocol system prompt: include `TRAJECTORY ALIGNMENT RULE` (physical framing); existing `BODY MAPPING EXERCISE PRIORITY HIERARCHY`
- [ ] Body Awareness system prompt: include `EXERCISE PROTOCOL ALIGNMENT RULE` (new — see Part 2, Rule 1)
- [ ] Body Awareness system prompt: include `TRAJECTORY ALIGNMENT RULE`
- [ ] Body Awareness system prompt: include `4-WEEK PROGRESSION FRAMING` (Establish → Connect → Under Load → Real Time)
- [ ] Body Awareness system prompt: include `DEBRIEF PROMPT REQUIREMENT` — each week's pattern must include a specific `→ Log in debrief:` prompt
- [ ] Body Awareness system prompt: include `HORSE HEALTH PATTERN RULE` — any pattern derived from horse health data must set `isHorseHealth = true` and `feedsWeeklyFocus = true`; debrief prompt must ask specifically about horse state
- [ ] Add `TRUNCATED CYCLE` instruction (2-week version) as conditional block in both prompts

**UI**
- [ ] Build Physical Guidance page from `physical-guidance-v2.html` prototype
- [ ] Body Awareness tab: week nav, week theme, pattern cards (collapse/expand), success block, reflection nudge, Weekly Focus callout
- [ ] Pattern card toggle row: show "Feeds Weekly Focus · expand for full pattern" and 📌 pin when `feedsWeeklyFocus = true`
- [ ] Horse health pattern cards: `.horse-health` CSS class — rust/red color treatment
- [ ] "Mark as applied this week" checkbox: persisted to `weeklyFocus/{weekId}.checkedItems.physical[]`
- [ ] Exercise Protocol tab: cadence card, body awareness profile (collapsed), priority tier display, exercise accordion (all collapsed), pre-ride ritual checklist (open by default), body awareness prompts (collapsed)
- [ ] Pre-ride checklist items: checkbox state NOT persisted to Firestore; resets on every page load
- [ ] Regen warning: show current week and confirm reset
- [ ] Truncated, extended, health hold states: same as GPT — replace cycle bar with appropriate state UI

---

### Phase 3: Verification (Both Outputs)

**Cycle mechanics**
- [ ] Generate both outputs; confirm all 4 weeks present in Firestore document
- [ ] Confirm cycle state documents written with correct `cycleStartDate`, `currentWeek = 1`, `status = "active"`
- [ ] Advance `currentWeek` to 2 manually; confirm weeklyFocus fields update to Week 2 content
- [ ] Navigate to Weekly Focus; confirm GPT card shows Week 2 assignments; Physical card shows Week 2 noticing cues
- [ ] Navigate from Weekly Focus to GPT output; confirm link lands on Mental Performance tab with Week 2 active
- [ ] Expire a cycle manually (set `cycleStartDate` to 30 days ago); confirm expired state on output page
- [ ] Confirm Weekly Focus does NOT show stale warning when cycle is expired

**Edge cases**
- [ ] Truncated generation: set debrief count to 5, first-ever generation; confirm 2-week program and cycle bar copy
- [ ] Cached serve: set cycle expired, debrief count since last regen < 5; confirm no API call, "extended" status shown
- [ ] Health hold: log significant health event; confirm hold notice on output page; simplified state on Weekly Focus
- [ ] Top tier upgrade mid-cycle: upgrade user; confirm regenerate button available immediately

**Weekly Focus contract**
- [ ] Regenerate full output; confirm every item in weeklyFocus fields appears verbatim in the output document
- [ ] Check off a Weekly Focus item; confirm no corresponding state change on output page (state is independent)
- [ ] Check off an assignment/pattern item on the output page; confirm no state change on Weekly Focus page
- [ ] Mobile test at 375px: cycle bar wraps gracefully; week chips scroll horizontally; all accordions function

---

### What NOT to Build

- On-demand week expansion (Cloud Function for `expanded/{pathId}`) — removed
- Auto-regeneration on cycle expiry — rider-triggered only
- Shared checkbox state between output pages and Weekly Focus — these are independent
- Regeneration from the Weekly Focus page — all regen happens from the output pages
- Return-to-work guidance in the health hold state — no AI-generated recovery programming
- Hardcoded tier token budgets — always read from environment config

---

*End of brief. Reference `physical-guidance-v2.html` and `gpt-v2.html` for all UI decisions. Reference `YDJ_WeeklyFocus_Implementation_Brief.md` for Weekly Focus integration — no changes needed to that document.*
