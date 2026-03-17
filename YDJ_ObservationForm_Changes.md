# YDJ Observation Form — Form Changes Brief
## Changes to `observation-form.html`
### March 2026

**Reference file:** `observation-form.html`

---

## Current Form Structure (for reference)

```
Event Information
  Date (required)
  Context type: clinic | trainer-riding | schooling | show | video
  Conditional fields by context:
    clinic:          Clinician Name, Pair Observed
    trainer-riding:  Horse Name
    schooling:       Describe the Session (textarea)
    show:            Describe the Show (textarea)
    video:           Video Details (textarea)

Observations (dynamic — "+ Add Observation" adds items)
  Each observation item contains:
    Milestone      (textarea)
    Aha Moment     (textarea)
    Connection     (textarea)
    Validation     (textarea)
    Obstacle       (textarea)
    Additional Notes (textarea)
```

---

## Research Basis for Changes

The observation form supports **vicarious learning** — Bandura's second-highest
source of self-efficacy after mastery experiences. Watching a peer rider slightly
ahead in development succeed at a movement produces larger confidence gains than
watching an expert, because the self-similar model triggers "if they can do it, I
can do it" (Bandura, 1997). Observation data also serves as **knowledge of
performance** (KP) — watching correct technique provides the external reference
point that proprioception alone cannot supply.

Two research mechanisms are currently underserved by the form:

**1. The observation-to-self bridge** (Bandura; mirror neuron research; Theureau's
self-confrontation methodology): converting passive observation into personal
learning requires explicitly connecting what was seen to the rider's own riding.
Watching without that bridge is enriching but doesn't produce the self-efficacy
gains that motivated observation can.

**2. The transfer intention** (Kolb's experiential learning cycle; After-Action
Review methodology): observation completes its learning loop only when it produces
a specific intention to try something differently. Without an explicit transfer
field, observation stays at the reflective stage and doesn't connect to action.

---

## CHANGE 1 — Rename "Milestone" Category

**Problem:** In the debrief and reflection forms, "Personal Milestone" means
something the rider themselves achieved. In the observation form, the "Milestone"
field asks about instructional cues or riding techniques that made an observable
difference in another rider or horse. The label is borrowed from the wrong context
and creates conceptual confusion, particularly for riders who use both forms.

**Fix:** Rename the Milestone field in each observation item.

**Old label:** Milestone
**New label:** Technical Insight

**Old placeholder:**
```
What instructional cues or riding techniques made an observable difference,
how and why?
```

**New placeholder:**
```
What instructional cue, correction, or technique produced a visible change?
What happened in the horse or rider when it worked?
```

**No data schema change required.** The stored field key can remain `milestone`
for backward compatibility — this is a display-only label change.

---

## CHANGE 2 — Add Observation-to-Self Bridge Field

**Research basis:** The gap analysis (Gap 3.2) identifies this as the critical
missing element: "The form should prompt: 'What movement did you observe?' /
'What did it feel like, based on what you saw?' / 'What does your own struggle
with this movement look like in comparison?' / 'What would it look like if you
succeeded at this?' This is Bandura's vicarious learning mechanism formalized into
a reflection practice."

Kinesthetic simulation research (Jeannerod, 1994; mirror neuron studies) confirms
that mentally "feeling" a movement while watching it produces stronger neural
encoding than passive visual observation. A prompt explicitly inviting this
simulation activates the mechanism.

**Location:** Each observation item, immediately after the Connection field and
before the Validation field.

**Add a new field to every observation item:**

```
Label: In your own riding

Prompt box (persistent, .prompt-box pattern — not placeholder):
  As you watched, what did you sense in your own body?
  How does this movement compare to your experience of it?

Textarea placeholder:
  What did this look like or feel like in relation to your own riding?
  Where do you recognize this pattern — either a struggle you share or a
  quality you're working toward?
```

**Field ID pattern:** `self-bridge-{observationCounter}`
**Field name in saved data:** `selfBridge`
**Required:** No

**Ordering within each observation item after this change:**
1. Technical Insight (renamed Milestone)
2. Aha Moment
3. Connection
4. In your own riding ← new
5. Validation
6. Obstacle
7. Additional Notes

---

## CHANGE 3 — Add Transfer Intention Field

**Research basis:** Kolb's experiential learning cycle requires moving from
reflective observation through abstract conceptualization to **active
experimentation** — a specific intention to try something in the next ride.
The After-Action Review framework (Keiser & Arthur, 2020, d = 0.79) identifies
action planning as the element that produces measurable performance improvement
over reflection alone. Without it, observation stays at the insight stage.

**Location:** Each observation item, as the final field, replacing "Additional
Notes."

**Replace "Additional Notes" with two fields:**

```
Field 1 — Transfer Intention

Label: What I'll try next ride

Prompt box (persistent):
  What specific thing will you attempt in your next ride because of
  this observation? Be as concrete as you can.

Textarea placeholder:
  e.g. "Ask for the half-halt earlier in the corner and wait — stop
  adding leg once he's responded" / "Try releasing the inside rein
  for one stride during shoulder-in to test if he's truly through"

Field ID: transfer-{observationCounter}
Field name: transferIntention
Required: No
```

```
Field 2 — Additional Notes (retained, now truly optional)

Label: Additional notes
Textarea placeholder: Any other observations or takeaways?
Field ID: notes-{observationCounter}
Field name: notes
Required: No
```

**Ordering within each observation item after this change:**
1. Technical Insight
2. Aha Moment
3. Connection
4. In your own riding
5. Validation
6. Obstacle
7. What I'll try next ride ← new
8. Additional Notes (retained)

---

## CHANGE 4 — Add "My Own Video" Context Type

**Research basis:** Watching footage of yourself is fundamentally different from
watching others. Theureau's self-confrontation methodology (1992) explicitly
combines personal video with structured reflective interviewing: "What were you
sensing at that moment? What do you see on the video?" This targets the
proprioceptive illusion directly — the systematic gap between what riders feel
they are doing and what the video shows. The current "Video" context type
conflates these two distinct learning experiences.

**The felt-vs-actual gap question** ("What surprised you about what you saw?")
is the most diagnostically valuable field the observation form could capture for
personal video, and it has no equivalent for video of other riders.

**Location:** Context type dropdown, and a new conditional field block.

### 4a — Add new context option

In the `contextType` select element, add after the existing `video` option:

```html
<option value="own-video">My Own Video / Footage</option>
```

### 4b — Add conditional field block for own-video context

Add a new `id="ownVideoFields"` conditional block (hidden by default, shown when
`contextType === "own-video"`):

```
Label: Video Details
Textarea placeholder:
  What footage? (date ridden, event, who filmed it, link if applicable)
Field ID: ownVideoDetails

---

Label: What surprised you?
Prompt box:
  The proprioceptive gap — what you feel vs. what you actually do —
  is widest when you first watch yourself ride. This is useful data.
Textarea placeholder:
  What looked different from what you expected? What felt correct
  but looked incorrect? What looked better than it felt?
Field ID: ownVideoSurprise

---

Label: Most useful moment in the footage
Textarea placeholder:
  Which specific moment, movement, or transition gave you the most
  to work with — and what did you see?
Field ID: ownVideoMoment
```

### 4c — Update handleContextChange() JavaScript

Add `document.getElementById('ownVideoFields').style.display = 'none';` to the
hide-all block, and add a new case to the switch:

```javascript
case 'own-video':
    document.getElementById('ownVideoFields').style.display = 'block';
    break;
```

### 4d — Update form submission data collection

Add to the switch in the form submit handler:

```javascript
case 'own-video':
    formData.ownVideoDetails = document.getElementById('ownVideoDetails').value;
    formData.ownVideoSurprise = document.getElementById('ownVideoSurprise').value;
    formData.ownVideoMoment = document.getElementById('ownVideoMoment').value;
    break;
```

**AI prompt note:** The self-confrontation fields (`ownVideoSurprise`,
`ownVideoMoment`) are high-value proprioceptive calibration data. They should be
read by the Technical Coach alongside the Feel/Body Awareness reflection category.
Add a note to the CLAUDE.md observation data description:
```
own-video context: ownVideoSurprise field captures the felt-vs-actual gap
directly — treat as high-value proprioceptive calibration data alongside
Feel/Body Awareness reflections.
```

---

## CHANGE 5 — Enrich Trainer-Riding-Your-Horse Context Fields

**Research basis:** When a trainer rides your horse, three distinct learning
opportunities converge simultaneously: (1) seeing what correct movement looks
like in your specific horse, (2) observing which aids actually produce the
response, and (3) comparing your felt experience of the horse to the visual
reference of the trainer's execution. The current form captures only `horseName`
for this context — the richest observation context in the form.

**Location:** The `trainerFields` conditional block. Replace the single
`horseName` field with enriched fields.

**Replace the current trainerFields block:**

```
Old:
  Horse Name (text input)
```

**With:**

```
Horse Name (text input, id="trainerHorseName")
  placeholder: Which horse did your trainer ride?

Trainer Name (text input, id="trainerName", optional)
  placeholder: Who rode? (leave blank if obvious)

Focus of the session (textarea, id="trainerSessionFocus")
  placeholder: What was your trainer working on? What did they
  tell you they were focusing on?

What the horse did differently (textarea, id="trainerHorseDiff")
  Prompt box: Your horse may move differently under your trainer
  than under you. This is information, not criticism.
  placeholder: Did the horse respond differently? What changed —
  in the gaits, the contact, the throughness, the expression?

What cues or aids produced the change (textarea, id="trainerAids")
  placeholder: What specifically did you see the trainer do that
  produced a change in the horse? Timing, position, rein, leg,
  seat — what was the sequence?
```

**All new fields are optional.** The existing observation items (Technical
Insight, Aha Moment, etc.) still follow and capture the broader learning.

---

## CHANGE 6 — Add Self-Similarity Field to Clinic and Show Contexts

**Research basis:** Bandura's vicarious self-efficacy research shows that
watching a self-similar model (someone at your own level) succeed produces
stronger confidence gains than watching an expert. The AI can use this field to
contextualize observation data: observations of riders at the same level carry
different coaching weight than observations of Grand Prix riders. Currently the
form has no way to capture this.

**Location:** Clinic and Show conditional field blocks. Add one radio field to
each.

**Add to clinicFields block:**

```
Label: Relative level of the pair you observed

Radio options (id="clinicRiderLevel"):
  ○ similar-to-me    — Similar level to me
  ○ above-me         — Above my current level
  ○ significantly-above — Significantly more advanced
  ○ not-sure         — Not sure / mixed

Help text: This helps the AI understand the coaching context of
what you observed.
```

**Add to showFields block:**

```
Label: Level(s) you watched (text input, id="showLevel")
  placeholder: e.g. "Third Level and Fourth Level" / "PSG"
```

*(Show context uses a text field rather than radio because riders often
watch multiple levels at a show.)*

---

## Firestore Schema Additions

```
/riders/{riderId}/observations/{observationId}/

  // Existing fields unchanged
  date: string
  contextType: string   // now includes "own-video"
  timestamp: string

  // Change 4 — own-video context (new fields)
  ownVideoDetails: string | null
  ownVideoSurprise: string | null
  ownVideoMoment: string | null

  // Change 5 — enriched trainer-riding context (new fields)
  trainerHorseName: string | null   // replaces horseName for this context
  trainerName: string | null
  trainerSessionFocus: string | null
  trainerHorseDiff: string | null
  trainerAids: string | null

  // Change 6 — self-similarity (new fields)
  clinicRiderLevel: string | null   // "similar-to-me" | "above-me" |
                                    // "significantly-above" | "not-sure"
  showLevel: string | null

  // Observations array — each item gains new fields:
  observations: [
    {
      // Existing fields
      milestone: string | null      // still stored as 'milestone' (Change 1
                                    // is display-only)
      aha: string | null
      connection: string | null
      validation: string | null
      obstacle: string | null
      notes: string | null

      // New fields (Changes 2 and 3)
      selfBridge: string | null     // "In your own riding"
      transferIntention: string | null  // "What I'll try next ride"
    }
  ]
```

---

## Implementation Checklist

- [ ] Rename "Milestone" label to "Technical Insight" in observation item template
      (display change only — field key remains `milestone` in storage)
- [ ] Update Milestone placeholder text
- [ ] Add "In your own riding" field to observation item template (after Connection)
      with persistent prompt box above textarea
- [ ] Add "What I'll try next ride" field to observation item template (before
      Additional Notes)
- [ ] Add "My Own Video / Footage" option to contextType dropdown
- [ ] Add `ownVideoFields` conditional block with three fields
- [ ] Update `handleContextChange()` to show/hide `ownVideoFields`
- [ ] Update form submit handler to collect own-video fields
- [ ] Replace `trainerFields` single horse name input with five enriched fields
- [ ] Update form submit handler to collect new trainer-riding fields
- [ ] Add `clinicRiderLevel` radio group to `clinicFields` block
- [ ] Add `showLevel` text input to `showFields` block
- [ ] Update Firestore save logic for all new fields
- [ ] Add CLAUDE.md note about `ownVideoSurprise` as proprioceptive calibration data
- [ ] Update observation item ordering: Technical Insight → Aha Moment → Connection
      → In your own riding → Validation → Obstacle → What I'll try next ride →
      Additional Notes
- [ ] Test: all six context types show correct conditional fields
- [ ] Test: own-video fields save correctly
- [ ] Test: trainer-riding enriched fields save correctly
- [ ] Test: new per-observation fields (selfBridge, transferIntention) save for
      each observation item independently
- [ ] Test: form initializes correctly with one observation pre-added (existing
      behavior preserved)

---

## What Is NOT Changing

- The dynamic "+ Add Observation" multi-item structure — unchanged
- The five existing observation category fields (Aha Moment, Connection,
  Validation, Obstacle, Additional Notes) — unchanged except ordering
- The overall form save/list-view/export architecture — unchanged
- The date auto-fill to today on load — unchanged
- The clinic and show conditional fields (clinicianName, pairObserved,
  showDescription) — unchanged except showLevel addition
- Voice input is not currently implemented on this form — not added here

---

## What Is NOT in This Brief

- **Vicarious self-modeling video** (watching your own best-ride footage,
  Ste-Marie et al., 2011): platform-level video storage feature, post-launch scope
- **Video timestamp linking**: attaching observations to specific moments in
  footage — requires video hosting infrastructure
- **Barn Bulletin Board / anonymized community observations**: community feature,
  post-launch scope (Gap 3.2 in gap analysis)

---

*March 2026. References: `YDJ_Learning_Theory_Gap_Analysis.md` (Gap 3.2 —
Social Learning and Relatedness, observation form structured prompt; also
Bandura vicarious experience, Theureau self-confrontation, Kolb cycle, AAR
methodology). No prompt file changes required — observation data is already
read by the Shared Base Context. CLAUDE.md addition for own-video context noted.*
