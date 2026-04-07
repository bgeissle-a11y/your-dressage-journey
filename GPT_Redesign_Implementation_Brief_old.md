# Grand Prix Thinking — Redesign Implementation Brief
**Version:** 1.0  
**Date:** March 2026  
**Status:** Ready for Claude Code implementation  
**Reference prototype:** `gpt-redesign-mockup.html` (approved by founder)

---

## Overview

This brief covers the redesign of Grand Prix Thinking (GPT) from a single dense output into two complementary outputs with different cadences. The name **Grand Prix Thinking** is preserved everywhere — in the nav, dashboard, output page heading, and FAQ.

**What changes:**
- GPT L1 (Mental Performance) becomes leaner: AI selects the single most relevant path, generates current week only by default, with on-demand 4-week expansion
- GPT L2 (Training Trajectory) separates to a monthly cadence with its own generation trigger
- Both outputs live on the same page under two tabs
- A hard architectural rule establishes cross-layer coherence
- The `weeklyAssignments` feed to Weekly Focus is preserved exactly

**What does NOT change:**
- The name Grand Prix Thinking
- The `weeklyAssignments` field name, structure, or Firestore path
- The Weekly Focus brief or implementation
- The existing Voice Integration additions (voice_annotation, voice_intro fields)
- Any other output's prompt or structure

---

## Part 1: Two Hard Rules (Non-Negotiable Architecture)

These rules must be enforced in the prompt system and documented in `CLAUDE.md`.

### Rule 1: Trajectory-Informed Mental Performance

**GPT L1 must receive the active GPT L2 trajectory as input context before generating.**

The L2 document is generated monthly and cached in Firestore. When L1 generates weekly, the pre-processing layer reads the cached L2 document and passes the `activePath` (the trajectory marked "Best Fit") into the L1 system prompt.

L1 uses this to:
- Frame the selected mental performance path in language that supports the active trajectory direction
- Ensure the success metric for the current week connects to a milestone from that trajectory
- Avoid recommending mental skills that conflict with the trajectory's philosophy (e.g., if trajectory is "Steady Builder," L1 should not create urgency around competition timelines)

**If no L2 document exists yet** (new user, or L2 has never been generated), L1 defaults to "Ambitious Competitor" framing and notes in the `aiReasoning` field that the trajectory analysis is pending.

**Prompt addition to L1 system prompt:**

```
TRAJECTORY ALIGNMENT RULE (CRITICAL):

You have been provided with the rider's active Training Trajectory path 
(from the cached Grand Prix Thinking L2 document). This is the direction 
the rider has self-selected or been recommended for their long-term development.

Your Mental Performance path selection and framing MUST support this trajectory:

- If trajectory = "Ambitious Competitor": Frame mental skills around 
  competition readiness, performance under pressure, and goal execution.
  Reference show preparation where relevant.
  
- If trajectory = "Steady Builder": Frame mental skills around patience, 
  mastery satisfaction, and process orientation. Avoid urgency language. 
  Do not reference competition timelines unless the rider has a current 
  event in the Event Log.
  
- If trajectory = "Curious Explorer": Frame mental skills around curiosity, 
  partnership awareness, and joy. Ensure the weekly assignments include at 
  least one observation-based (not performance-based) task.

The success metric for the current week must connect explicitly to a 
milestone from the active trajectory. State the connection in one sentence 
within the `trajectoryLink` field.

NEVER create a mental performance assignment that conflicts with the 
trajectory's philosophy. A rider cannot be told to "push toward PSG 
competition readiness" in their mental skills work while their trajectory 
says "Steady Builder — no show before July."
```

---

### Rule 2: weeklyAssignments = Extracted, Not Generated Separately

**The `weeklyAssignments` array that feeds Weekly Focus is populated by extracting items from the current week's assignment list in L1. It is NOT a separate generation.**

This guarantees that what the rider sees on the Weekly Focus page is verbatim identical to what they see in the Grand Prix Thinking Mental Performance tab.

**Extraction logic (server-side, post-generation):**

After the L1 API call returns, the pre-processing layer extracts:

```javascript
// After L1 JSON is validated and before Firestore write:

const currentWeekAssignments = gptL1Output.selectedPath.weeks[0].assignments;

gptL1Output.weeklyAssignments = currentWeekAssignments.map(item => ({
  title: item.title,                    // Short title
  description: item.description,        // 2–3 sentence description
  when: item.when,                      // "Pre-ride", "Daily", etc.
  buildToward: item.trajectoryLink      // Connection to active trajectory
}));
```

The `weeklyAssignments` field is written to the same Firestore document as the full L1 output. The Weekly Focus page reads this field exactly as before — no changes to the Weekly Focus implementation.

**Verification test:** After any L1 generation, confirm that every item in `weeklyAssignments` appears word-for-word in the Mental Performance tab's Week 1 assignment list. If they diverge, the extraction is broken.

---

## Part 2: GPT L1 — Slim Mental Performance Redesign

### What the AI Generates

L1 now generates a **single selected path with one week of detail**, plus enough metadata for the 4-week expansion.

The AI no longer generates all 3 paths with all 4 weeks simultaneously.

**New L1 JSON schema:**

```json
{
  "generatedAt": "timestamp",
  "dataSnapshot": {
    "debriefCount": 24,
    "reflectionCount": 18,
    "lastDebriefDate": "2026-03-17",
    "tier": 3
  },
  "activeTrajectory": "ambitious_competitor",
  "selectedPath": {
    "id": "pre_ride",
    "title": "Pre-Ride Preparation Path",
    "subtitle": "Build the ritual that sets your horse up to succeed before you mount",
    "icon": "🌅",
    "aiReasoning": {
      "patternCited": "1.9-point quality gap between 'ready' and 'scattered' arrival states",
      "dataEvidence": "Word 'rushed' in 4 of 6 pre-ride notes; Cindy's March 4 clinic feedback",
      "trajectoryLink": "Pre-ride ritual is the mental foundation for competition readiness under the Ambitious Competitor path"
    },
    "weeks": [
      {
        "number": 1,
        "title": "Foundation: The 10-Minute Arrival Ritual",
        "focus": "Establishing the habit without pressure to get it right",
        "assignments": [
          {
            "title": "The Barn Breath",
            "description": "Before you touch your tack, take one slow breath at the barn door and set a one-sentence intention for the ride. Not a goal — an intention.",
            "example": "\"Today I allow rather than fix.\"",
            "when": "Pre-ride"
          },
          {
            "title": "Rocket Star Check-In",
            "description": "While grooming, notice his tension level (1–5) and your own (1–5). Notice if they match. This is data, not judgment. Write both numbers in your post-ride debrief.",
            "when": "Grooming"
          },
          {
            "title": "Cindy's Mantra, Your Words",
            "description": "Take Cindy's cue 'arrive with intention' and make it yours. Write one sentence on your phone that translates it into your own language. Read it before mounting this week.",
            "when": "Daily"
          }
        ],
        "successMetric": "You complete the ritual on 4 of 5 rides and your debrief notes a difference in your arrival state — even once.",
        "checkIn": [
          "Did completing the ritual change anything about how you started the warm-up?",
          "On the days you skipped it — what got in the way?"
        ]
      }
    ],
    "weekPreviews": [
      { "number": 2, "title": "Deepening — Visualization Before Mounting" },
      { "number": 3, "title": "Connecting — Horse-Specific Activation" },
      { "number": 4, "title": "Anchoring — The Ritual Becomes Automatic" }
    ],
    "otherPaths": [
      { "id": "in_saddle", "title": "In-Saddle Focus", "icon": "🎯" },
      { "id": "resilience", "title": "Resilience & Recovery", "icon": "🌊" }
    ],
    "voice_annotation": {
      "empathetic_coach": "...",
      "technical_coach": "..."
    }
  },
  "weeklyAssignments": [
    /* Extracted from selectedPath.weeks[0].assignments — see Rule 2 */
  ],
  "stale": false,
  "regenerateAfter": "timestamp"
}
```

### What Generates on Demand vs. Default

| Content | When Generated |
|---|---|
| Selected path + Week 1 full detail | Always, on L1 generation |
| Week 2–4 previews (titles only) | Always, on L1 generation |
| Weeks 2–4 full detail | **On-demand only** — user taps "View full 4-week plan" |
| Other paths (2 cards) | Titles and IDs only in L1; full detail on user request |

**On-demand 4-week expansion:** When the user taps "View full 4-week plan," trigger a second lightweight API call to generate weeks 2–4 for the selected path only. This call passes:
- The Week 1 content (so weeks 2–4 build progressively from it)
- The rider's profile and recent debrief data
- The active trajectory context

Cache the result in Firestore under `grandPrixThinking/{userId}/l1Expanded/{pathId}` so it only generates once per cycle.

### Model

L1 generation: **Claude Sonnet** (was Opus — significant cost reduction)  
L1 on-demand 4-week expansion: **Claude Sonnet**

### Staleness & Regeneration (L1)

Regenerate L1 when:
- 5+ new debriefs added since last generation
- Rider self-assessment or physical assessment updated
- Rider manually requests regeneration
- 7 days elapsed since last generation (weekly cycle)

Do NOT regenerate L1 when L2 regenerates, unless the active trajectory path changes.

---

## Part 3: GPT L2 — Separated Training Trajectory

### Cadence

L2 generates **monthly**, independently of L1. It is not part of the weekly cycle.

### Trigger Logic

Regenerate L2 when:
- A new horse profile is added
- Rider self-assessment or physical assessment is updated
- Rider manually requests regeneration
- 30 days elapsed since last generation

### Model

L2 generation: **Claude Opus** (unchanged — trajectory reasoning requires it)

### Firestore Path (unchanged)

L2 continues to write to `analysis/grandPrixThinkingL2/{userId}`. No path changes.

### L2 JSON schema additions

Add one field to L2 output to support the L1 coherence rule:

```json
{
  "activePath": "ambitious_competitor",
  "paths": [ ... ],
  /* existing schema unchanged */
}
```

The `activePath` field contains the id of the trajectory marked "Best Fit." L1 reads this field.

**Best Fit logic:** The AI selects Best Fit based on the rider's self-assessment goals, debrief trend data, and competition history. If the rider has an active event in the Event Log within 60 days, Ambitious Competitor is always weighted as Best Fit unless the rider's debrief data shows significant confidence concerns, in which case the AI may select Steady Builder and note the reason in its reasoning field.

### L2 JSON schema (unchanged from existing spec, with `activePath` addition)

The three trajectory cards (Ambitious Competitor, Steady Builder, Curious Explorer) remain as designed in the approved mockup. Each contains:
- `id`, `title`, `subtitle`, `icon`
- `currentPosition` (where rider is now)
- `milestones` (3–4 items for 3–6 month horizon)
- `timelineProjection` (narrative paragraph)
- `voice_intro` (voice snippet per trajectory — existing Voice Integration field)
- `isBestFit` (boolean)

---

## Part 4: UI Layout

### Reference

All layout, color, typography, and interaction patterns follow `gpt-redesign-mockup.html` exactly. Do not redesign.

### Page Structure

```
/outputs/grand-prix-thinking
  ├── Dark hero (ink gradient, concentric circle watermark)
  │     ├── Eyebrow: "Your Dressage Journey"
  │     ├── Title: "Grand Prix Thinking"
  │     ├── Sub: [Rider name] · [Horse name] · [Level]
  │     └── Tab row: [🧠 Mental Performance — Weekly] [🗺 Training Trajectory — Monthly]
  │
  ├── Tab: Mental Performance (default active)
  │     ├── Generation meta bar (date, debrief count, next refresh)
  │     ├── Section label pill (sky blue — Mental Performance)
  │     ├── AI Path Selection card (why this path was chosen)
  │     │     ├── Pattern cited from data
  │     │     ├── Evidence sentence
  │     │     └── Other paths available chips
  │     └── Path card
  │           ├── Path header (icon, title, subtitle, week badge)
  │           ├── Week 1 body
  │           │     ├── Week title + focus tag
  │           │     ├── Assignment list (3 items, checkable)
  │           │     ├── Success metric block
  │           │     └── [View full 4-week plan ▼] expand button
  │           └── 4-week plan (hidden by default, on-demand generated)
  │                 ├── Week chips (1 / 2 / 3 / 4)
  │                 └── Week panels (title, focus, practices, check-in)
  │
  └── Tab: Training Trajectory
        ├── Monthly cadence notice banner
        ├── Section label pill (gold — Training Trajectory)
        ├── Generation meta bar (last generated date, next update)
        └── Trajectory cards (3 cards, collapsible)
              ├── Ambitious Competitor (Best Fit — open by default)
              ├── Steady Builder
              └── Curious Explorer
```

### Weekly Focus Link

The Weekly Focus page Grand Prix Thinking card links to `/outputs/grand-prix-thinking` and lands on the **Mental Performance tab** (default). The assignment items on Weekly Focus are verbatim matches to the items in the Week 1 assignment list. The rider sees the same language in both places — this is the Rule 2 guarantee.

Add to the Grand Prix Thinking card on Weekly Focus:
- "View full Grand Prix Thinking →" links to `/outputs/grand-prix-thinking`
- This link must open the page with the Mental Performance tab active (default behavior — no query param needed)

### Visual Design Notes (from approved mockup)

**From Show Planner (borrowed):**
- Dark ink gradient hero with concentric circle SVG watermark (right side)
- Eyebrow/title/subtitle hierarchy in hero
- Tab chips (week chip pattern, adapted for path selection)
- Section blocks with colored category dots and label pills
- Collapse/expand with chevron icons
- Done-stripe on checked assignment items

**From First Glimpse (borrowed):**
- Fade-up card animations (`fadeUp` keyframe, `.3s ease`)
- Badge/pill labels with colored dot
- Clean white cards with parchment-off background for items
- Italic evidence text with gold-pale left border

**Colors:**
- Mental Performance: sky blue (`--mental-color: #2e5c82`)
- Training Trajectory: gold (`--gold: #b8862a`)
- Assignment items: parchment background, forest green on completion
- AI reasoning card: sky blue border and tint

---

## Part 5: Prompt Architecture Changes

### L1 System Prompt — Full Structure

```
[Shared Base Context — unchanged]
+
GRAND PRIX THINKING L1 — MENTAL PERFORMANCE

You are generating the weekly Mental Performance output for Grand Prix Thinking.

Your task: Analyze this rider's recent data and select ONE mental performance 
path that will produce the most meaningful change this week. Generate Week 1 
of that path in full detail.

ACTIVE TRAJECTORY CONTEXT:
The rider's Training Trajectory path is: {l2ActivePath}
[TRAJECTORY ALIGNMENT RULE — insert full rule text from Part 1]

PATH SELECTION CRITERIA:
Analyze the last 8 debriefs and most recent self-assessment to identify:
1. The pattern with the highest impact on ride quality scores
2. The pattern with the strongest recent evidence (multiple recent mentions)
3. The pattern most directly named in lesson notes or trainer feedback

Select the path that addresses the highest-priority pattern. Paths:
- Pre-Ride: When data shows arrival state, pre-ride preparation, or intention-setting 
  as a performance variable
- In-Saddle: When data shows focus loss, reactive riding, or mental noise during rides
- Resilience: When data shows setback recovery patterns, confidence dips, or 
  post-difficult-ride emotional carryover

AI REASONING REQUIREMENT:
The `aiReasoning` object must contain:
- patternCited: The specific pattern identified (name it precisely)
- dataEvidence: Quote specific data (debrief count, exact words used, trainer cues)
- trajectoryLink: One sentence connecting this week's work to the active trajectory

WEEK 1 GENERATION RULES:
- Exactly 3 assignments per week (not more, not fewer)
- Each assignment must reference the rider's specific data, horses, or trainer cues
- The `when` field uses: "Pre-ride", "During ride", "Post-ride", "Daily", "Grooming", 
  or "Weekly"
- successMetric is one sentence, observable, connected to debrief logging
- checkIn questions reference things measurable in the debrief form

WEEK PREVIEW RULE:
Provide only titles for weeks 2–4. Do not generate their full content. 
Full content for weeks 2–4 generates on-demand in a separate API call.

[Voice Annotation addition — existing from Voice Integration Update]

Respond with ONLY the JSON object matching the schema. No markdown, no explanation.
```

### L1 User Prompt — Key Additions

Add after existing rider data blocks:

```
=== ACTIVE TRAINING TRAJECTORY ===
Path: {l2Output.activePath}
Trajectory title: {l2Output.paths[activePath].title}
Current position: {l2Output.paths[activePath].currentPosition}
3-month milestones: {l2Output.paths[activePath].milestones}
```

If no L2 exists:
```
=== ACTIVE TRAINING TRAJECTORY ===
No trajectory analysis yet. Default to "Ambitious Competitor" framing.
Note in aiReasoning.trajectoryLink: "Training Trajectory analysis pending — 
defaulting to Ambitious Competitor framing."
```

### L2 System Prompt — Addition Only

Add one instruction to the existing L2 system prompt:

```
BEST FIT SELECTION:
After generating all three trajectory paths, select the one that best matches 
this rider's current data, goals, and timeline. Mark it with `"isBestFit": true`. 
Also populate the top-level `"activePath"` field with that path's id.

Best Fit selection criteria:
- Rider's stated goals from self-assessment
- Competition history and upcoming events from Event Log
- Confidence trend from last 8 debriefs (low confidence = weight toward Steady Builder)
- Level readiness indicators from debrief data
- If a show is in the Event Log within 60 days, weight toward Ambitious Competitor 
  unless confidence trend is declining
```

---

## Part 6: Firestore Document Structure

### L1 Document (updated)

**Path:** `analysis/grandPrixThinkingL1/{userId}`

```
{
  generatedAt: timestamp,
  dataSnapshot: { debriefCount, reflectionCount, lastDebriefDate, tier },
  activeTrajectory: string,          // id from L2 activePath
  selectedPath: { ... },             // full schema from Part 2
  weeklyAssignments: [ ... ],        // extracted from selectedPath.weeks[0].assignments
  stale: boolean,
  regenerateAfter: timestamp
}
```

**Expanded paths cache (on-demand):**

**Path:** `analysis/grandPrixThinkingL1/{userId}/expanded/{pathId}`

```
{
  generatedAt: timestamp,
  pathId: string,
  weeks: [ week1, week2, week3, week4 ],  // all 4 weeks
  expiresAfter: timestamp                  // same as parent document regenerateAfter
}
```

### L2 Document (updated field only)

**Path:** `analysis/grandPrixThinkingL2/{userId}`

Add to existing schema:
```
activePath: string    // id of the Best Fit trajectory
```

All other fields unchanged.

---

## Part 7: What Doesn't Change

The following must not be modified as part of this implementation:

| Item | Status |
|---|---|
| `weeklyAssignments` field name | Unchanged |
| `analysis/grandPrixThinkingL1/{userId}` Firestore path | Unchanged |
| Weekly Focus brief | Unchanged — no edits needed |
| Weekly Focus implementation | Unchanged — reads `weeklyAssignments` exactly as before |
| Voice Integration fields (`voice_annotation`, `voice_intro`) | Unchanged — included in new schema |
| Voice selection matrix (L1: Empathetic + Technical; L2: path-specific) | Unchanged |
| All other output prompts | Unchanged |
| All other Firestore collections | Unchanged |

---

## Part 8: Implementation Checklist

### Phase 1: L1 Redesign
- [ ] Update `functions/api/grandPrixThinking.js` (or equivalent L1 route) to use new slim schema
- [ ] Update L1 system prompt with PATH SELECTION CRITERIA, TRAJECTORY ALIGNMENT RULE, AI REASONING REQUIREMENT, and WEEK PREVIEW RULE
- [ ] Update L1 user prompt to include active trajectory context block
- [ ] Add pre-processing step: read cached L2 `activePath` before L1 call
- [ ] Add post-processing step: extract `weeklyAssignments` from `selectedPath.weeks[0].assignments`
- [ ] Switch L1 model from Opus to Sonnet
- [ ] Update L1 staleness logic to 7-day weekly cycle
- [ ] Write new `expanded/{pathId}` Cloud Function for on-demand 4-week generation
- [ ] Validate that `weeklyAssignments` items are verbatim matches to Week 1 assignments

### Phase 2: L2 Separation
- [ ] Add `activePath` field to L2 system prompt (Best Fit selection criteria)
- [ ] Add `activePath` to L2 Firestore document schema
- [ ] Update L2 staleness logic to 30-day monthly cycle
- [ ] Confirm L2 does NOT regenerate on weekly L1 cycle (separate trigger)

### Phase 3: UI
- [ ] Build Grand Prix Thinking page using `gpt-redesign-mockup.html` as reference
- [ ] Implement tab switching (Mental Performance / Training Trajectory)
- [ ] Implement assignment item checkboxes with Firestore persistence
- [ ] Implement "View full 4-week plan" expand button with on-demand API call
- [ ] Implement week chip navigation (1/2/3/4) within expanded plan
- [ ] Implement trajectory card collapse/expand
- [ ] Implement "Other paths available" chip switching
- [ ] Confirm Weekly Focus "View full Grand Prix Thinking →" lands on Mental Performance tab (default)
- [ ] Confirm assignment items on Weekly Focus match Week 1 items word-for-word

### Phase 4: Verification
- [ ] Generate L2, confirm `activePath` field is populated
- [ ] Generate L1, confirm `activeTrajectory` matches L2 `activePath`
- [ ] Confirm L1 `aiReasoning.trajectoryLink` references the active trajectory by name
- [ ] Confirm L1 successMetric language is consistent with trajectory philosophy
- [ ] Trigger Weekly Focus — confirm GPT card shows same 3 items as Mental Performance Week 1
- [ ] Navigate from Weekly Focus GPT card link — confirm lands on Mental Performance tab
- [ ] Check off a Weekly Focus item — confirm no corresponding change on GPT page (they are read-only extracts, not shared state)
- [ ] Generate L1 with no cached L2 — confirm default Ambitious Competitor framing and note in aiReasoning
- [ ] Test on mobile at 375px (barn use case)

---

## Part 9: CLAUDE.md Updates

Add the following to `CLAUDE.md` under the Grand Prix Thinking section:

```markdown
## Grand Prix Thinking — Two-Output Architecture (Updated March 2026)

GPT is now two separate outputs with different cadences, both displayed on 
the same page under two tabs.

**L1 (Mental Performance):** Weekly cycle. Slim output — one selected path, 
one week of detail by default, on-demand 4-week expansion. Uses Sonnet.

**L2 (Training Trajectory):** Monthly cycle. Three trajectory cards with 
long-term roadmaps. Uses Opus. Generates independently of L1.

### Hard Rule 1: Trajectory-Informed Mental Performance
L1 always receives the cached L2 `activePath` as input context. The selected 
mental performance path must support the active trajectory direction. Never 
create L1 assignments that conflict with L2 trajectory philosophy.
See: TRAJECTORY ALIGNMENT RULE in L1 system prompt.

### Hard Rule 2: weeklyAssignments = Extracted, Not Generated
`weeklyAssignments` is populated by server-side extraction from 
`selectedPath.weeks[0].assignments` AFTER the L1 API call returns. 
It is NOT generated by the AI as a separate field.
This guarantees verbatim identity with Weekly Focus items.

### Weekly Focus Contract
Weekly Focus reads `weeklyAssignments` from the L1 document. 
Items on Weekly Focus are word-for-word identical to Week 1 assignments 
in the Mental Performance tab. This is guaranteed by the extraction logic, 
not by prompt instruction.
```

---

*End of brief. Reference `gpt-redesign-mockup.html` for all UI decisions. Reference `YDJ_WeeklyFocus_Implementation_Brief.md` for Weekly Focus integration — no changes needed to that document.*
