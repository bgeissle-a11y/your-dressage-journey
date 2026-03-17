# YDJ Post-Ride Debrief — Form Changes Brief
## Changes to `post-ride-debrief-with-intentions.html`
### March 2026

**Reference file:** `post-ride-debrief-with-intentions.html`

This brief covers four categories of changes:
- Research-derived improvements from the YDJ Learning Theory Gap Analysis
- Practice Card integration (wiring from `YDJ_PracticeCard_Implementation_Brief.md`)
- Ride arc and emotional state field updates (below)
- Ride arc and emotional state field updates (Changes 4 and 5)

All changes are form-layer only unless noted. No prompt changes in this file —
those are handled separately in `YDJ_Prompt_Changes_Learning_Theory.md`.

---

## Current Form Structure (for reference)

```
Section 1 — Ride Basics
  Date of Ride, Horse, Session Type

Section 2 — Quick Ratings
  Overall ride quality (slider 1–10)
  Your energy level (radio)
  Horse's energy level (radio)
  Your mental/emotional state (radio)
  [Confidence-in-execution slider — exists in production, verify present]
  [Ride arc picker — exists in production, verify present]

Section 2.5 — Riding Intentions
  Manage Intentions panel (add/edit intentions)
  Intentions grid (rate each intention 1–5)

Section 3 — What Happened
  Personal Milestones and External Validation (wins textarea)
  Aha Moment (textarea)
  Connection and Feel (textarea)
  Obstacle (textarea)
  Additional Context — What did you work on? (textarea)

Button group — Save Draft / Complete Debrief
```

---

## CHANGE 1 — Estimation Prompt Before Confidence Rating

**Research basis:** Schmidt & White (1972) demonstrated that error estimation before
checking feedback accelerates the development of proprioceptive accuracy. The act of
forming a prediction — then comparing it against an external measure — builds the
internal perceptual trace that enables independent self-correction. This is the most
direct mechanism available for closing the gap between what riders feel and what is
actually happening.

**Location:** Section 2 — Quick Ratings, immediately before the confidence-in-execution
slider.

**What to add:** A prompt box (using the existing `.prompt-box` pattern — persists
above the field, never disappears as placeholder text) immediately above the
confidence-in-execution slider.

The prompt box text:
```
Before you rate: if someone had filmed this ride, what would they have seen?
```

**Implementation notes:**
- This is a static text prompt, not an input field. The rider reads it, reflects,
  then sets the slider. No additional data is captured from the prompt itself.
- Use the existing `.prompt-box` CSS class so the prompt persists visibly above the
  slider. Do not implement as placeholder text — it must remain visible while the
  slider is being set.
- The prompt is placed immediately above the confidence-in-execution slider label,
  not above the overall quality slider. These are different questions serving
  different purposes (overall quality = session assessment; confidence in execution =
  technical self-assessment of capability).
- If the confidence-in-execution slider does not yet exist in the form, add it to
  Section 2 below the overall ride quality slider, with this label and help text:

  **Label:** Confidence in your ability to execute
  **Help text:** Your in-session sense of whether you could perform the technical
  work you were attempting — distinct from how good the ride felt overall.
  **Slider:** 1–10, same styling as the overall quality slider.
  **Field ID:** `confidenceExecution`

---

## CHANGE 2 — Process Goal 3-Slot Template (Intentions Section Redesign)

**Research basis:** Kingston & Hardy (1997; 37 golfers, 54 weeks) found process goals
uniquely improve self-efficacy (d = 0.87) and anxiety control (d = 0.68) compared
to performance and outcome goals. Working memory research (Cowan, 2001) establishes
~4 chunks as the upper limit of simultaneous attention — three process goals is the
correct maximum for in-session focus. The current open-ended intentions system
captures intentions without helping riders distinguish process goals (what to DO)
from outcome goals (what to ACHIEVE), which are cognitively different and serve
different learning functions.

**Location:** Section 2.5 — Riding Intentions. Redesign this section.

**What to replace:**

Remove the current Manage Intentions panel (the free-form intentions editor with
the 1–5 grid rating system).

**What to add:**

Replace with a fixed three-slot structure — three labeled text inputs — plus a
process goal completion check-in that references the previous session's goals.

### 2a — Process Goal Slots (for the upcoming ride)

Section header text change:
- Old: "Riding Intentions — How well did you meet your intentions for this ride?"
- New: "Process Goals — What will you focus on in your next ride?"
- Section description: "Name up to three specific things you will DO — not achieve.
  Process goals direct your attention during the ride. Keep each one short and
  action-focused."

Three fixed input slots:

```
Process Goal 1 *
[text input, id="processGoal1"]
placeholder: "e.g. 'Wait for Rocket Star to seek the contact before asking for collection'"

Process Goal 2
[text input, id="processGoal2"]
placeholder: "e.g. 'Breathe through every downward transition'"

Process Goal 3
[text input, id="processGoal3"]
placeholder: "e.g. 'Soften my lower back at the moment of canter strike-off'"
```

Only Goal 1 is required. Goals 2 and 3 are optional.

Below the three slots, a collapsible help block (collapsed by default, "What's a
process goal?" link to expand):

```
A process goal describes an action within your control during the ride — what you
will attend to or do, not what you hope results from it.

Outcome goal (avoid for in-session focus): "Get a good canter transition"
Process goal (use this): "Establish outside rein contact before asking"

Three is the maximum. More than three splits your attention below useful threshold.
```

### 2b — Previous Ride Process Goal Check-in

This sub-section appears at the TOP of Section 2.5, above the new goal slots.
It is only displayed when the rider has process goals saved from their previous
debrief (check Firestore for the most recent debrief with non-empty processGoal
fields for this horse).

When previous goals exist, show:

```
[Section label — small caps, muted]  FROM YOUR LAST RIDE

[For each goal that was set, display as a read-only row:]
  [goal text]     How well did you maintain this focus?
                  ○ Not at all  ○ Somewhat  ○ Mostly  ○ Fully

[Optional — text prompt below the ratings]
  What got in the way, or what helped?
  [small textarea, id="goalReflection", optional]
```

Field IDs for the ratings: `prevGoal1Rating`, `prevGoal2Rating`, `prevGoal3Rating`
(only render the rows for goals that were actually set — if only 1 goal was set,
only 1 row appears).

**When no previous goals exist:** Show nothing for this sub-section. Do not show an
empty state or explanation — just omit the block silently.

**Firestore read:** On form load, fetch the most recent submitted debrief document
for the current rider + horse combination that has at least one non-empty processGoal
field. Extract processGoal1/2/3 from that document and pre-populate the check-in
rows. If the fetch fails or returns nothing, silently omit the check-in block.

**Data to save:** The previous goal ratings and optional reflection are saved as
part of the current debrief submission:
```
prevGoalRatings: {
  goal1: { text: string, rating: string },  // rating: "not-at-all" | "somewhat" | "mostly" | "fully"
  goal2: { text: string, rating: string } | null,
  goal3: { text: string, rating: string } | null,
  reflection: string | null
}
```

---

## CHANGE 3 — Practice Card Date Pre-fill

**Research basis:** This is a wiring change from `YDJ_PracticeCard_Implementation_Brief.md`.
When the rider taps "Log your debrief" on the Practice Card after a ride, they should
arrive at a new debrief form with today's date pre-filled.

**Location:** Form initialization JavaScript (on page load).

**What to add:**

On page load, check for a `?date=` query parameter in the URL. If present and valid
(parseable as a date), pre-fill the ride date field with that value.

```javascript
// On DOMContentLoaded, before other initialization:
const params = new URLSearchParams(window.location.search);
const dateParam = params.get('date');
if (dateParam) {
  const parsed = new Date(dateParam);
  if (!isNaN(parsed.getTime())) {
    document.getElementById('rideDate').value = dateParam; // expects YYYY-MM-DD
  }
}
```

The Practice Card CTA passes today's date in ISO format (YYYY-MM-DD). No other
fields are pre-filled from the URL.

---

## CHANGE 4 — Ride Arc Options (Two Additions)

**Decision:** Keep all existing arcs and add two new ones. Total: 8 arcs.

**Research basis:** The AI coaching system uses arc + confidence + quality as a
three-way diagnostic combination. The starting baseline of a ride is diagnostically
as important as its direction — a ride that starts already strong and keeps improving
has a different root cause than one that starts mediocre and builds. After-Action
Review research (Keiser & Arthur, 2020, d = 0.79) confirms that specificity in
performance review produces measurably better learning outcomes. The sparklines carry
most of the cognitive load, making 8 options visually fast to select.

The two additions are genuinely distinct from existing options, not redundant:

| New arc | Starts at | Moves | Why distinct from existing |
|---|---|---|---|
| strengthened | already good | ↗ keeps building | "built" starts mediocre/neutral and improves — a different baseline and different coaching diagnosis |
| deteriorated | already struggling | ↘ keeps declining | "faded" starts well and declines — a different baseline; "deteriorated" signals pre-ride compromise (horse off, rider depleted before mounting) |

**Location:** Section 2 — Quick Ratings, ride arc picker. Add two new sparkline
options to the existing six.

**New sparkline shapes:**

- **strengthened** — line starts at approximately 70% height and rises to ~95% by
  the end. Visually distinct from "built" (which starts at ~20–30% and rises).
  Label: "strengthened"

- **deteriorated** — line starts at approximately 30% height and drops to ~5–10%.
  Visually distinct from "faded" (which starts at ~80–90% and drops). 
  Label: "deteriorated"

**Values to add to the `rideArc` field enum:**
```
existing: consistent | built | faded | peak | valley | variable
add:      strengthened | deteriorated
```

**AI prompt update required:** The RIDE ARC INTERPRETATION block in the Shared Base
Context (added by `YDJ_Prompt_Reference_Additions.md` Addition 2) must be updated
to include the two new arc interpretations. Add these two bullets to the existing
six-item list:

```
- strengthened: Started from an already good place and continued to build. Distinct
  from "built" — the warm-up was not the variable here. Investigate what conditions
  allowed the rider and horse to begin at a high level: environment, preparation,
  rest, prior session. This is worth naming explicitly — it is evidence of something
  the rider can intentionally recreate.

- deteriorated: Started from an already poor place and kept declining. Distinct from
  "faded" — the ride did not begin well. Likely indicates a pre-ride compromise:
  horse off or sore, rider arrived depleted or anxious, environmental factors. Do not
  interpret as a training failure. Investigate whether Horse Health Tracker entries
  correlate, and whether Journey Events explain the rider's state before mounting.
```

---

## CHANGE 5 — Rider Mental/Emotional State (Three Additions)

**Current options:** calm/centered, focused/determined, frustrated/tense,
uncertain/confused, joyful/flowing, mixed/complex

**Add these three options:**

### 5a — worried/concerned

**Research basis:** Sports psychology distinguishes *cognitive anxiety* (worry,
rumination, anticipatory dread) from *somatic anxiety* (physical tension, racing
heart). "Frustrated/tense" captures reactive somatic tension after something goes
wrong. "Worried/concerned" captures the cognitive anticipatory state — mental chatter
about whether the ride will go well, whether the horse will be manageable, whether
the upcoming show is too soon. This is the state most directly linked to the
anxiety-horse feedback loop (Keeling et al., 2009) and to the dual-efficacy dynamic
(Beauchamp & Whinton, 2005). Without it, the AI cannot distinguish between a rider
who was tense because things went wrong versus one who arrived worried and the worry
shaped the session from the start.

**Label:** worried/concerned
**Value:** `worried`
**Place after:** frustrated/tense

### 5b — tired/drained

**Research basis:** Adult amateurs frequently ride at the end of work days. Physical
and cognitive fatigue are reliable predictors of learning readiness, proprioceptive
accuracy, and error tolerance — all of which the coaching system needs to
contextualize the session data. Fatigue is meaningfully distinct from emotional
states like frustrated or mixed: a tired rider is not necessarily having a negative
emotional experience, but their capacity for skill acquisition and error detection is
measurably reduced. The spacing/recovery research supports treating fatigue as a
primary variable, not a footnote.

**Label:** tired/drained
**Value:** `tired`
**Place after:** worried/concerned

### 5c — distracted/scattered

**Research basis:** Wulf's attentional focus research and Eysenck's Attentional
Control Theory (2007) identify a specific cognitive state where attention is divided
by external concerns — not because the rider doesn't know what to do (uncertain/
confused), not because they're emotionally activated (frustrated/worried), but because
thoughts about work, family, or life are actively competing for attentional resources.
Adult amateurs are particularly prone to this: they arrive at the barn carrying the
day. A distracted rider fails to form clear process goal intentions, produces lower
quality Feel/Body Awareness reflection, and is less likely to notice or remember
diagnostic moments in the ride. This is a distinct, high-value coaching signal.

**Label:** distracted/scattered
**Value:** `distracted`
**Place after:** tired/drained

**Final ordered list — 10 options, grouped by valence:**

The radio group is divided into three labeled sub-groups with a light visual
separator between each. Each sub-group label is rendered in small caps, muted color,
non-interactive — a display label only, not a selectable option.

```
── POSITIVE ─────────────────────────────
  ○ calm/centered
  ○ focused/determined
  ○ joyful/flowing
  ○ confident/optimistic        ← new

── MIXED ────────────────────────────────
  ○ mixed/complex
  ○ uncertain/confused

── DIFFICULT ────────────────────────────
  ○ worried/concerned           ← new
  ○ frustrated/tense
  ○ tired/drained               ← new
  ○ distracted/scattered        ← new
```

**Why "difficult" rather than "negative":** The framing matters for adult learners.
"Negative" carries judgment; "difficult" names the state without shaming it. Riders
arriving frustrated or tired should feel the form expects them — not that they are
reporting a failure. This aligns with the Empathetic Coach's approach to obstacles
as information.

**confident/optimistic — why included:**
Bandura's pre-event self-efficacy research identifies this as the state most
predictive of performance. "Focused/determined" is the closest existing option but
distinct: focused is task-orientation, confident is self-belief in capability — two
different things that often coexist but can diverge, especially before shows. The
confidence-in-execution slider captures technical execution confidence mid-ride;
this option captures the pre-ride state of self-belief. Not redundant.
Value: `confident`

**AI prompt update required:** The Empathetic Coach voice's DUAL-EFFICACY AWARENESS
block (added by `YDJ_Prompt_Changes_Learning_Theory.md` Change 6) already handles
worried/concerned implicitly. No additional prompt changes are required for the four
new states — the Shared Base Context already instructs the AI to read mental state in
combination with other fields. The valence grouping is a form UX change only and does
not affect data values or AI interpretation.

---

## Firestore Schema Additions

The following new fields are added to the debrief document in Firestore:

```
/riders/{riderId}/debriefs/{debriefId}/

  // Existing fields unchanged

  // Change 1 — if confidence slider not yet in schema:
  confidenceExecution: number,   // 1–10

  // Change 2a — process goals for next ride
  processGoal1: string,          // required
  processGoal2: string | null,
  processGoal3: string | null,

  // Change 2b — previous goal check-in
  prevGoalRatings: {
    goal1: { text: string, rating: string } | null,
    goal2: { text: string, rating: string } | null,
    goal3: { text: string, rating: string } | null,
    reflection: string | null
  } | null                        // null when no previous goals existed

  // Change 4 — ride arc enum update
  // rideArc field already exists; update enum to include new values:
  // rideArc: "consistent" | "built" | "faded" | "peak" | "valley" | "variable"
  //          | "strengthened" | "deteriorated"

  // Change 5 — mental state enum update
  // mentalState field already exists; update enum to include new values:
  // mentalState: "calm" | "focused" | "frustrated" | "uncertain" | "joyful"
  //              | "mixed" | "worried" | "tired" | "distracted"
```

---

## Implementation Checklist

- [ ] Verify confidence-in-execution slider exists in current production form;
      add it if missing (with estimation prompt above it)
- [ ] Add estimation prompt box above confidence slider (`.prompt-box` pattern,
      persistent — not placeholder text)
- [ ] Redesign Section 2.5: replace free-form intentions with 3-slot process goal
      template (Goal 1 required, 2–3 optional)
- [ ] Add collapsible "What's a process goal?" help block below goal slots
- [ ] Add previous ride check-in sub-section above goal slots (conditional on
      previous goals existing in Firestore)
- [ ] On form load: fetch most recent debrief with process goals for this
      horse and populate check-in rows
- [ ] Add `?date=` URL param handling for Practice Card CTA pre-fill
- [ ] Update Firestore save logic to include processGoal1/2/3 and prevGoalRatings
- [ ] Test: estimation prompt is visible and persists while slider is in use
- [ ] Test: goal slots save and appear in next session's check-in
- [ ] Test: only goals that were set appear in the check-in (no empty rows)
- [ ] Test: `?date=2026-03-17` pre-fills date field correctly
- [ ] Test: form still works correctly when no previous goals exist (no check-in shown)
- [ ] Add "strengthened" sparkline option to ride arc picker (starts ~70%, rises to ~95%)
- [ ] Add "deteriorated" sparkline option to ride arc picker (starts ~30%, falls to ~5–10%)
- [ ] Add `strengthened` and `deteriorated` to `rideArc` field enum in Firestore schema
- [ ] Update RIDE ARC INTERPRETATION block in AI Shared Base Context with two new arc descriptions
- [ ] Add "confident/optimistic" radio option (value: `confident`)
- [ ] Add "worried/concerned" radio option (value: `worried`)
- [ ] Add "tired/drained" radio option (value: `tired`)
- [ ] Add "distracted/scattered" radio option (value: `distracted`)
- [ ] Divide mental state radio group into three labeled sub-groups: Positive / Mixed / Difficult
- [ ] Sub-group labels: small caps, muted color, non-interactive display only
- [ ] Positive: calm/centered, focused/determined, joyful/flowing, confident/optimistic
- [ ] Mixed: mixed/complex, uncertain/confused
- [ ] Difficult: worried/concerned, frustrated/tense, tired/drained, distracted/scattered
- [ ] Test: all 8 arc sparklines render correctly at mobile width
- [ ] Test: all 10 mental state values save correctly to Firestore
- [ ] Test: sub-group labels do not appear as selectable radio options

---

## What Is NOT Changing

- The six reflection category fields (Personal Milestones, Aha Moment, Connection
  and Feel, Obstacle, Additional Context) — no changes to these fields or their order
- The overall ride quality slider — unchanged
- Rider/horse energy radio groups — unchanged
- Rider mental/emotional state radio group — four options added, valence grouping applied (see Change 5)
- The ride arc picker interaction pattern and sparkline drawing code — unchanged; only two new options added
- Voice input on all textarea fields — unchanged
- Save as Draft / Complete Debrief button behavior — unchanged
- The debrief library / history view — unchanged

---

*March 2026. References: `YDJ_Learning_Theory_Gap_Analysis.md` (Gaps 1.2, 2.1, 2.2),
`YDJ_Prompt_Changes_Learning_Theory.md` (Changes 4, 6), `YDJ_PracticeCard_Implementation_Brief.md`
(Change 3 date pre-fill), `YDJ_Prompt_Reference_Additions.md` (Addition 2 — ride arc interpretation).*
