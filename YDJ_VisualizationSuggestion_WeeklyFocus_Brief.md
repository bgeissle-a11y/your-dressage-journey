# Implementation Brief: Visualization Suggestion in Weekly Focus
**Your Dressage Journey — Claude Code Handoff**
**Date:** April 2026
**Priority:** Medium — implement after Visualization Script Builder is live
**Depends on:** `ydj-visualization-form.html` wired and live; Multi-Voice Coaching Cloud Function active

---

## Overview

Add an AI-generated **Visualization Suggestion** to the Weekly Focus page. When the rider's data shows a clear trigger condition — a new struggling movement, an upcoming show, or a recurring mechanical pattern — the Weekly Focus surfaces a targeted suggestion with a single CTA that pre-populates the Visualization Script Builder.

This feature was explicitly anticipated in `YDJ_PracticeCard_Debrief_v2_Implementation_Brief.md` (Section 9) and deferred to this brief.

---

## Architectural Rule (Non-Negotiable)

> **The visualization suggestion is NOT a new independent AI generation on the Weekly Focus page.**

It follows the same architecture as every other Weekly Focus card. The suggestion is generated inside the **Multi-Voice Coaching Cloud Function** and cached in Firestore as a new field on the coaching output document. The Weekly Focus page reads that cached field and renders the card. No new API call is made at Weekly Focus load time.

This is required by the Parallel Truth Principle: every sentence on the Weekly Focus page must be traceable to a specific field in a full-output document.

---

## Part 1 — Trigger Logic

The AI evaluates the following conditions in priority order. It uses the **first matching trigger**. If none match, it returns `shouldSuggest: false` and no card is rendered.

### Trigger 1 — Show within 14 days (highest priority)
**Condition:** An active event exists in the Journey Event Log within 14 days.  
**What to suggest:** Visualize the full test in the competition arena.  
**Pre-fill logic:**
- `movement`: the most technically demanding movement in the planned test (use rider's level/test from Rider Profile; if unknown, use the movement most recently mentioned with difficulty signals)
- `problem`: `mental` ("I freeze mentally / lose confidence going in")
- `context`: `test`
- `suggestedLength`: `extended`
- `rationale`: 1–2 sentences noting the show proximity and the value of pre-competition imagery at test level

**Example rationale:**
> "Your show is 8 days out. Riding the test in your mind — in that specific arena — before you're on Rocket reduces first-movement tension and shortens warm-up time. Extended session recommended."

---

### Trigger 2 — New movement introduced with low or absent quality scores
**Condition:** A movement appears in debrief `movements` array for the first time in the last 3 rides AND average quality or confidence rating for that movement is ≤ 6.0, OR the rider has noted it with struggle language (no felt sense established).  
**What to suggest:** Visualization to develop internal felt reference before the next ride.  
**Pre-fill logic:**
- `movement`: the new movement key (see valid values below)
- `problem`: `unfamiliar` ("I'm building from scratch — no physical reference yet")
- `referenceType`: `none`
- `context`: `training`
- `suggestedLength`: `standard`
- `rationale`: 1–2 sentences noting the movement is new and that visualization before physical repetition builds felt-sense faster

---

### Trigger 3 — Recurring mechanical pattern
**Condition:** A specific body habit, position error, or mechanical interference (e.g., elbows, collapsed hip, tipping forward, bracing, holding breath) appears in 3 or more of the last 10 debriefs or observation notes.  
**What to suggest:** Visualization of the moment where the mechanic typically fires, with a felt alternative.  
**Pre-fill logic:**
- `movement`: the movement where the mechanic appears most frequently (from debrief movement arrays); if not movement-specific, use the movement the rider is currently working on most
- `problem`: `position` ("My position breaks down / My body interferes with what I want")
- `context`: `training`
- `suggestedLength`: `standard`
- `mechanicSummary`: a 1-sentence description of the specific mechanic (e.g., "elbows widening at the moment of the flying change aid") — surfaced on the card and passed as a URL param for context
- `rationale`: 1–2 sentences connecting the pattern to the visualization tool

---

### Trigger 4 — Consistent movement struggle (no new movement)
**Condition:** A specific movement has appeared in 4 or more debriefs over the last 8 rides with quality scores consistently ≤ 6.5 AND the rider has not generated a visualization script for this movement in the last 30 days (check toolkit entries).  
**What to suggest:** Targeted visualization to address the repeated difficulty.  
**Pre-fill logic:**
- `movement`: the struggling movement
- `problem`: infer from pattern — use `timing` if scores suggest execution inconsistency; use `mental` if reflection language includes hesitation, second-guessing, or holding breath; default to `timing` if unclear
- `context`: `training`
- `suggestedLength`: `standard`

---

### No trigger — suppress card
**Condition:** None of the above match.  
Return `shouldSuggest: false`.  
**Do not render the card.** The Weekly Focus should not have a visualization card in weeks where no clear trigger exists. Forcing a suggestion every week dilutes its meaning.

---

## Part 2 — New Firestore Field on Multi-Voice Coaching Document

Add `visualizationSuggestion` to the Multi-Voice Coaching output document. It is a sibling to `weeklyFocusExcerpt` and `voices`.

**Firestore path:** Same as Multi-Voice Coaching output document (user-scoped)

**Schema:**

```json
"visualizationSuggestion": {
  "shouldSuggest": true,
  "triggerType": "new_movement",
  "movementKey": "flying-change",
  "movementLabel": "Flying change",
  "problemFocus": "unfamiliar",
  "referenceType": "none",
  "context": "training",
  "suggestedLength": "standard",
  "mechanicSummary": null,
  "rationale": "Flying changes appeared in your last two rides with no felt reference established. Building internal imagery before your next session activates motor memory before physical repetition.",
  "cardTeaser": "Flying changes — build the felt sense before the next ride"
}
```

**Field definitions:**

| Field | Type | Notes |
|---|---|---|
| `shouldSuggest` | boolean | Required. If `false`, all other fields are omitted. |
| `triggerType` | string | One of: `upcoming_show`, `new_movement`, `recurring_mechanic`, `persistent_struggle` |
| `movementKey` | string | Must match a valid `data-movement` value from the picker (see valid values below) |
| `movementLabel` | string | Human-readable label for display (e.g., "Flying change", "Half-pass") |
| `problemFocus` | string | One of: `timing`, `position`, `collection`, `anticipation`, `mental`, `unfamiliar` |
| `referenceType` | string | One of: `recent`, `old`, `partial`, `none`. Use `none` for `unfamiliar`; `recent` for show prep if they've ridden the test. |
| `context` | string | One of: `training`, `warmup`, `test` |
| `suggestedLength` | string | One of: `short`, `standard`, `extended` |
| `mechanicSummary` | string \| null | One sentence describing the specific mechanic (Trigger 3 only). Null for all other triggers. |
| `rationale` | string | 1–2 sentences. Explains why this is the right moment for visualization. Written for the rider, not as a system note. May quote rider's own language from debriefs. |
| `cardTeaser` | string | ~8 words. Used as the sub-headline on the card. E.g., "Flying changes — build the felt sense before the next ride" |

---

## Part 3 — Valid `movementKey` Values

The AI must use only the following values, which correspond exactly to `data-movement` attributes in `ydj-visualization-form.html`:

```
sitting-trot     stretchy-circle
leg-yield        shoulder-in      travers      renvers      half-pass
transition       simple-change    flying-change   tempi-changes
pirouette        piaffe           passage
```

Sub-movement selection (for `half-pass`, `pirouette`, `tempi-changes`, `transition`) is handled by the rider on the form after navigation — do **not** attempt to pass sub-movement as a URL param. The suggestion sets the parent movement only.

---

## Part 4 — Prompt Addition to Multi-Voice Coaching Cloud Function

Add the following block to the Multi-Voice Coaching system prompt, alongside the existing `weeklyFocusExcerpt` instruction. Insert it immediately after the `weeklyFocusExcerpt` section.

```
VISUALIZATION SUGGESTION (add to JSON output as "visualizationSuggestion"):

Evaluate the rider's data for the following trigger conditions, in priority order. 
Use the FIRST matching trigger. Return shouldSuggest: false if none match.

TRIGGER PRIORITY:

1. UPCOMING SHOW (highest priority)
   - Condition: An active event exists in the Journey Event Log within 14 days.
   - movementKey: Most technically demanding movement in their test at current level.
     If uncertain, use the movement most recently mentioned with difficulty signals.
   - problemFocus: "mental"
   - context: "test"
   - suggestedLength: "extended"
   - referenceType: "recent" if they have ridden the test before; "none" if test is new.

2. NEW MOVEMENT — NO FELT REFERENCE
   - Condition: A movement appears in debriefs for the first time in the last 3 rides
     AND avg quality/confidence for it is ≤ 6.0, OR rider uses language indicating
     no felt sense (e.g., "not sure what I'm asking," "no feel for it yet").
   - problemFocus: "unfamiliar"
   - referenceType: "none"
   - context: "training"
   - suggestedLength: "standard"

3. RECURRING MECHANICAL PATTERN
   - Condition: A specific body habit or position error appears in 3+ of the last
     10 debriefs or observations (elbows, collapsed hip, tipping, gripping, bracing,
     holding breath, collapsing through transitions, etc.)
   - movementKey: Movement where the mechanic appears most frequently. If not
     movement-specific, use the movement the rider is working on most.
   - problemFocus: "position"
   - context: "training"
   - suggestedLength: "standard"
   - mechanicSummary: One sentence describing the specific habit and when it fires.
     Quote rider's own language if available.
     Example: "Your elbows widen at the moment of the flying change aid."

4. PERSISTENT MOVEMENT STRUGGLE
   - Condition: A movement has appeared in 4+ debriefs in the last 8 rides with
     quality scores ≤ 6.5 consistently AND no visualization script has been recorded
     for this movement in the last 30 days.
   - problemFocus: infer — "timing" for execution inconsistency; "mental" if 
     rider uses hesitation/second-guessing language; default "timing" if unclear.
   - context: "training"
   - suggestedLength: "standard"

If none of the above conditions are met:
Return: { "shouldSuggest": false }

RATIONALE WRITING RULES:
- 1–2 sentences only
- Written for the rider — not a system note or explanation
- May quote the rider's own language from debriefs (in quotation marks)
- Must explain why this specific moment is right for visualization
- Must NOT instruct, evaluate, or use directive language ("you should," "you need to")
- Framing: why the tool fits this moment, not what the rider is doing wrong

CARDTEASER RULES:
- ~8 words
- Movement or topic + brief purpose
- Examples: "Flying changes — build the felt sense before the next ride"
  "Tempi changes — quiet the body at the moment of the aid"
  "Test ride — preview the arena before you're in it"
  "Elbows — reprogram the habit before it fires again"

VALID movementKey VALUES (use exact strings only):
sitting-trot, stretchy-circle, leg-yield, shoulder-in, travers, renvers, half-pass,
transition, simple-change, flying-change, tempi-changes, pirouette, piaffe, passage

VALID problemFocus VALUES: timing, position, collection, anticipation, mental, unfamiliar
VALID referenceType VALUES: recent, old, partial, none
VALID context VALUES: training, warmup, test
VALID suggestedLength VALUES: short, standard, extended
VALID triggerType VALUES: upcoming_show, new_movement, recurring_mechanic, persistent_struggle
```

---

## Part 5 — New Weekly Focus Card: `WFVisualizationCard.jsx`

### When to render
Render only when `visualizationSuggestion.shouldSuggest === true`.  
If `shouldSuggest: false` or the field is absent, render nothing — no placeholder, no empty state.

### Card content

```
┌─────────────────────────────────────────────────────┐
│ 🧠  Visualization This Week              [mental blue]│
│                                                       │
│  [movementLabel badge]  [triggerType badge]           │
│                                                       │
│  [cardTeaser — italic, ~8 words]                      │
│                                                       │
│  [rationale — 1–2 sentences, body text]               │
│                                                       │
│  [If mechanicSummary exists:]                         │
│  ┌─ Pattern noted ──────────────────────────────┐     │
│  │  "[mechanicSummary]"                          │     │
│  └───────────────────────────────────────────────┘    │
│                                                       │
│  [  Build Visualization Script →  ]  (CTA button)    │
└─────────────────────────────────────────────────────┘
```

### Visual treatment
- **Header accent color:** `--color-mental` (`#5C8BA8`) — same as Visualization Script Builder header accent
- **triggerType badge labels:**
  - `upcoming_show` → "Show prep"
  - `new_movement` → "New movement"
  - `recurring_mechanic` → "Body pattern"
  - `persistent_struggle` → "Recurring struggle"
- **Pattern noted box** (mechanicSummary only): parchment background, `--color-mental` left border, italic quote text. Only render if `mechanicSummary !== null`.
- **CTA button:** Primary style, `--color-mental` background on hover. Label: "Build Visualization Script →"
- **No check/pin interaction:** This card does not have pin, complete, or check states. It is a navigational suggestion, not a task list.

### Card placement in Weekly Focus
Insert between **Physical Awareness** and **Show Planning** (if Show Planning card is present). If no Show Planning card, insert after Physical Awareness.

Updated card order:
1. Celebration
2. Key Insight (Multi-Voice Coaching)
3. Grand Prix Thinking Assignments
4. Physical Awareness
5. **Visualization This Week** ← new, conditional
6. Show Planning (conditional — only when active event within 60 days)

---

## Part 6 — CTA Navigation: Pre-Populating the Visualization Script Builder

The CTA button navigates to:

```
/riders-toolkit/visualization?movement={movementKey}&problem={problemFocus}&context={context}&length={suggestedLength}
```

Or if using the HTML prototype path:

```
ydj-visualization-form.html?movement={movementKey}&problem={problemFocus}&context={context}&length={suggestedLength}
```

### URL param handling in `ydj-visualization-form.html`

Add URL param reading on page load. If params are present, **pre-select** the corresponding form elements and **skip** directly to the form body (do not show a blank form — show the pre-selected state as if the rider had made those choices).

```javascript
// Add to DOMContentLoaded or equivalent init function
function applyUrlParams() {
  const params = new URLSearchParams(window.location.search);
  
  const movement = params.get('movement');
  const problem  = params.get('problem');
  const context  = params.get('context');
  const length   = params.get('length');

  if (movement) {
    const chip = document.querySelector(`.movement-chip[data-movement="${movement}"]`);
    if (chip) selectMovement(chip);
  }
  if (problem) {
    const card = document.querySelector(`input[name="problem"][value="${problem}"]`);
    if (card) card.closest('.radio-card').click();
  }
  if (context) {
    const ctx = document.querySelector(`input[name="context"][value="${context}"]`);
    if (ctx) ctx.closest('label').click();
  }
  if (length) {
    const len = document.querySelector(`input[name="length"][value="${length}"]`);
    if (len) len.closest('label').click();
  }
}
```

**Behavior when params are present:**
- Form loads with the pre-selected values visually highlighted (same state as if rider had tapped them)
- A "From Weekly Focus" banner appears at the top of the form (parchment background, gold border): "Pre-filled from your Weekly Focus suggestion. Review and adjust before generating."
- The Generate button is not automatically triggered — the rider still reviews and submits
- Section 3 (Reference Moment) is never pre-filled — the rider must select this themselves, as it requires personal memory recall
- If `problem=unfamiliar`, auto-select `referenceType=none` as the Reference Moment selection and visually check it

### "From Weekly Focus" banner

```html
<div class="prefill-banner" id="prefill-banner" style="display:none;">
  <span>✦</span>
  <span>Pre-filled from your Weekly Focus suggestion. Review and adjust before generating.</span>
</div>
```

Show if any URL param is present. Render immediately below the page `<header>`, before Section 1.

---

## Part 7 — Files to Modify

| File | Change |
|---|---|
| `functions/lib/promptBuilder.js` | Add visualization suggestion block to `buildMultiVoiceCoachingPrompt()` output format spec |
| `functions/api/multiVoiceCoaching.js` | Update output schema to write `visualizationSuggestion` field to Firestore document |
| `src/components/WFVisualizationCard.jsx` | **New file.** Card component per spec above |
| `src/pages/WeeklyFocus.jsx` (or `WeeklyFocusContent.jsx`) | Import and conditionally render `WFVisualizationCard` |
| `ydj-visualization-form.html` | Add URL param reading + pre-fill logic + "From Weekly Focus" banner |
| `YDJ_WeeklyFocus_Implementation_Brief.md` | Add row to the sections table; update checklist |

**No changes to:**
- `functions/api/visualizationScript.js` — the script generation prompt and output are unchanged
- `promptBuilder.js` `buildVisualizationScriptPrompt()` — unchanged
- Firestore Toolkit collection — visualization suggestion is on the coaching document, not the toolkit

---

## Part 8 — Firestore: Updated Multi-Voice Coaching Document Schema

The `visualizationSuggestion` field is a top-level field on the Multi-Voice Coaching document, written at the same time as `weeklyFocusExcerpt`.

```javascript
// In multiVoiceCoaching.js, add to the Firestore write:
await db.collection('riders').doc(userId)
  .collection('coachingOutputs').doc(weekId)
  .set({
    // ... existing fields ...
    weeklyFocusExcerpt: parsed.weeklyFocusExcerpt,
    visualizationSuggestion: parsed.visualizationSuggestion ?? { shouldSuggest: false },
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });
```

If `parsed.visualizationSuggestion` is absent or fails to parse, default to `{ shouldSuggest: false }` — never write a partial object to Firestore.

---

## Part 9 — Weekly Focus Checklist Additions

Add to the existing `YDJ_WeeklyFocus_Implementation_Brief.md` checklist:

```
Visualization Suggestion Card
- [ ] Add visualizationSuggestion field to Multi-Voice Coaching prompt (output format spec)
- [ ] Update multiVoiceCoaching.js to write visualizationSuggestion to Firestore
- [ ] Default to { shouldSuggest: false } if field is absent or parse fails
- [ ] Build WFVisualizationCard.jsx per spec
- [ ] Conditionally render WFVisualizationCard in WeeklyFocus between Physical and Show cards
- [ ] Card renders nothing (no empty state) when shouldSuggest: false
- [ ] CTA navigates to visualization form with correct URL params
- [ ] Add URL param reader to ydj-visualization-form.html
- [ ] Test: params pre-select correct form elements on load
- [ ] Test: Section 3 (Reference) is never pre-filled (rider selects manually)
- [ ] Test: problem=unfamiliar auto-selects referenceType=none
- [ ] Test: "From Weekly Focus" banner shows when params present
- [ ] Test: triggerType=upcoming_show only fires when show ≤ 14 days (not 15)
- [ ] Test: shouldSuggest=false renders no card, no placeholder
```

---

## Design Notes

**Why Multi-Voice Coaching owns this field, not a standalone output:**  
The visualization suggestion is entirely pattern-based — it requires reading ride quality scores, movement history, debrief language, and show proximity. Multi-Voice Coaching already assembles all of this context. Adding the suggestion there costs ~50 extra output tokens and requires no additional Firestore reads.

**Why the card is conditional (not always present):**  
A visualization card that appears every week becomes invisible. It earns rider attention by appearing only when it's earned. This is consistent with the YDJ design principle: the app notices patterns and responds, it does not push tasks.

**Why the rider pre-populates Section 3 (Reference Moment) manually:**  
The reference moment is a personal memory. The system does not know which specific moment the rider would use as an anchor. Pre-filling it with a guess would undermine the specificity that makes visualization effective. The pre-fill covers the structural choices (what, why, where, how long); the memory anchor is always the rider's own.

**Why no Weekly Coach Brief inclusion (for now):**  
The visualization suggestion is a call to action, not an analysis. The Weekly Coach Brief surfaces analytical insights for the trainer. A "do this between rides" prompt belongs on the rider's Weekly Focus, not the coach's brief. If coaches want to see what mental rehearsal their riders are doing, that surfaces through the Practice Card and session reflections.

---

*Ready for Claude Code implementation once Visualization Script Builder is live.*
