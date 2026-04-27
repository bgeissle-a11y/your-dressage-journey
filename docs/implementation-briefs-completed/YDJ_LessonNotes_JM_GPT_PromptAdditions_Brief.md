# YDJ Lesson Notes — Journey Map & Grand Prix Thinking Prompt Additions
## Implementation Brief — April 2026

**File:** `functions/lib/promptBuilder.js`
**Scope:** Five surgical insertions across four prompt functions. No schema changes.
No new API calls. No Firestore changes.
**Rule:** Do not modify any existing prompt text. Add only.

---

## Background

`BASE_CONTEXT` now includes the full LESSON NOTES AWARENESS block and all four
voice bullets (from `YDJ_LessonNotes_PromptBuilder_Gap_Fix.md`, implemented and
verified). The Journey Map and Grand Prix Thinking prompts inherit `BASE_CONTEXT`
but have no output-specific instruction on how to apply lesson notes in their
distinct analytical contexts. These five insertions complete the integration.

---

## Fix 1 — Journey Map Call 1: Add LESSON NOTES as a Pattern Source

**Function:** `buildJourneyMapPrompt` — `callIndex === 1` branch
**Purpose:** Call 1 builds the data synthesis layer — themes, milestones, patterns,
goal progress. Lesson notes are the only externally-validated data source in the
platform. They belong here as a distinct pattern source tier, above self-report.

**Find (exact — this is the closing text of the Call 1 system prompt, just before
the closing backtick):**
```
Classical Master voice: precise, grounded, occasionally poetic`;
```

**Replace with:**
```
Classical Master voice: precise, grounded, occasionally poetic

LESSON NOTES AS PATTERN SOURCES:
When lesson notes data is present in the rider context, integrate it into the
chronological synthesis as follows:

EXTERNAL VALIDATION TIER:
Lesson notes represent externally-validated data — observations from a trained
instructor who sees what the rider cannot feel. Treat recurring instructor
observations as a higher-confidence pattern tier than self-report from debriefs
alone. When the same challenge appears in both rider debriefs AND instructor
cues, name that convergence explicitly: this is the strongest pattern evidence
the platform holds.

PATTERN EXTRACTION FROM LESSON NOTES:
- "This Session's Focus" movements across multiple lesson entries reveal what the
  instructor consistently prioritizes — this is longitudinal training emphasis,
  not a one-off. When the same movement appears in Session Focus across 3+ entries,
  include it as a confirmed training pattern in the themes array.
- [PRIORITY]-flagged cues within a single lesson note indicate the instructor
  repeated this correction multiple times in one session. Across entries, [PRIORITY]
  flags build the strongest externally-validated pattern signal available.
- "Take Into Your Next Ride" entries across multiple lessons reveal the instructor's
  persistent carry-forward priorities. When these align with recurring debrief
  challenges, cross-reference both layers explicitly.

COACH'S EYE ACROSS ENTRIES:
- Horse-state observations in coachesEye across multiple entries (tension patterns,
  asymmetry observations, evasion tendencies, willingness notes) build a longitudinal
  picture of the horse's physical development. Include this in the horse-specific
  section of the themes array when patterns are consistent.
- Instructor imagery and metaphors appearing across multiple lessons reveal the
  conceptual through-line of the training relationship. These are worth surfacing
  as a milestone-type observation — the moment a coaching metaphor becomes a rider's
  working model is a genuine breakthrough.

RIDER BREAKTHROUGH — MILESTONE CLASSIFICATION:
The "RIDER BREAKTHROUGH" sub-section of coachesEye records moments where the
rider articulated their own understanding and the instructor confirmed it. These
are milestone-grade events. Classify them in the milestones array as category
"insight" and give them significance 4-5. The rider's own words, confirmed by
the instructor, are the most meaningful self-development event the platform can
record.

WHEN LESSON NOTES ARE ABSENT:
Do not reference lessons, instructor guidance, or the absence of lesson data
in the output. Do not prompt the rider to submit lesson notes.`;
```

---

## Fix 2 — Journey Map Call 2: Add Lesson Notes Integration to Narrative

**Function:** `buildJourneyMapPrompt` — `callIndex === 2` branch
**Purpose:** Call 2 writes the coaching narrative. When lesson notes contain Rider
Breakthroughs or consistent instructor imagery, these belong in the narrative as
milestone callouts or through-line observations.

**Find (exact — this is in the Call 2 system prompt, the end of the health events
section just before the closing backtick):**
```
Training progress and the rider's development remain the primary storyline.`;
```

**Replace with:**
```
Training progress and the rider's development remain the primary storyline.

LESSON NOTES IN THE JOURNEY NARRATIVE:
When lesson notes data was synthesized in Call 1, weave it into the narrative
using these guidelines:

RIDER BREAKTHROUGH MOMENTS — NARRATIVE TREATMENT:
When a Rider Breakthrough was identified in Call 1's synthesis (from the
coachesEye field), give it a milestone callout in the narrative. This is the
moment the rider articulated something true about their own riding and had it
confirmed by a trained observer. Frame it as a genuine milestone:

"Something significant happened in your lesson on [date] — you articulated
[the insight] before [instructor] could say it. That moment of self-knowing
is not incidental. It's the whole point."

Use 2-3 voices at Rider Breakthrough milestones:
- Empathetic Coach (always): names what it means that the rider found this
  insight themselves
- Classical Master (when the insight connects to a training principle): connects
  it to the tradition
- Practical Strategist (when the insight has clear application): operationalizes
  the insight forward

INSTRUCTOR IMAGERY AS NARRATIVE THREAD:
When the same metaphor or image appears across multiple lesson notes in the
coachesEye field, surface it as a narrative through-line. Instructor imagery
that recurs is the working language of the training relationship — it's worth
naming: "The recurring image of [metaphor] in your lessons isn't coincidence —
it's [instructor's] way of pointing at [the underlying principle]."

CONVERGENCE AS EVIDENCE:
When a pattern appears in both rider debriefs AND instructor lesson notes,
use the convergence to add weight to the observation in the narrative. "You've
been feeling this — and [instructor] has been seeing it from the ground. When
both perspectives arrive at the same place, that's not a pattern. That's a fact."

ABSENCE: If no lesson notes were present in Call 1 synthesis, make no reference
to lessons or instructor guidance in this narrative.`;
```

---

## Fix 3 — Grand Prix Thinking L2 Call 1: Add Lesson Notes to Current State Analysis

**Function:** `buildTrajectoryCall1Prompt`
**Purpose:** Call 1 (Opus) generates the current state analysis — confirmed level,
training level, strengths, gaps, trajectory. Lesson notes are the ground-truth
signal for what the instructor is actively working on, which may differ from the
rider's stated level or debrief descriptions. This is the most important fix in
this brief — it directly affects trajectory accuracy.

**Find (exact — the closing section before the JSON schema in this function's
system prompt):**
```
  \\\"training_frequency_assessment\\\": \\\"string \\u2014 cite rides/week from debrief data, consistency patterns\\\"
}`;
```

**Replace with:**
```
  "training_frequency_assessment": "string — cite rides/week from debrief data, consistency patterns"
}

LESSON NOTES IN CURRENT STATE ANALYSIS:
When lesson notes data is present in the rider context, integrate it into
the current state analysis as follows:

FUNCTIONAL LEVEL CALIBRATION:
What an instructor is actively working on in lessons is the most reliable
signal of where the horse-rider pair actually is in training — often more
accurate than the rider's stated level or debrief descriptions. Cross-reference
the "This Session's Focus" movements across lesson entries against the rider's
stated current level and confirmed competition level.

If the Session Focus movements are:
- At or below the stated level: confirms the rider is working solidly at
  their stated level, appropriate
- One level above the stated level: normal schooling — note as "training
  level exceeds competition level by approximately one level"
- Two or more levels above, or movements inconsistent with level:
  investigate — either the stated level is outdated, the work is aspirational
  schooling with a trainer, or the data has a discrepancy. Flag in
  timeline_reality_check.

TRAJECTORY CONSTRAINT IDENTIFICATION:
[PRIORITY]-flagged cues across multiple lesson note entries are the most
reliable external signal of what is currently limiting the rider's
progression. When the same cue recurs across 3+ lesson entries with
[PRIORITY] flags, include it in the gaps array as a high-priority item
with source attributed to "recurring instructor correction."

Example: If "left hand physically right" appears as [PRIORITY] across
four lesson entries, this is not a training tip — it is a confirmed,
externally-validated asymmetry pattern. It belongs in gaps with
impact_on_advancement explaining what it blocks at the next level.

COACH'S EYE AS HORSE STATE ASSESSMENT:
Instructor observations about the horse in coachesEye (tension, asymmetry,
evasion patterns, willingness) provide an external observer's lens on the
horse that complements the rider's own debrief observations. When horse-state
observations in coachesEye are consistent across entries, include them in
horse_factors with the note that these are instructor observations, not
rider self-report — this distinguishes them as higher-confidence data.

RIDER BREAKTHROUGH — METACOGNITIVE SIGNAL:
The presence of Rider Breakthrough sub-sections across multiple lesson notes
indicates a rider who is developing metacognitive awareness — the ability to
observe and articulate their own learning in real time. This is a significant
strength for trajectory planning. Include it as a strength in the strengths
array: "Demonstrated metacognitive awareness — rider has shown ability to
articulate training insights before instructor prompt on [number] occasions."
This accelerates learning across all three trajectory paths.

ABSENCE: If no lesson notes are present, make no reference to instructor
guidance in this output.`;
```

---

## Fix 4 — Grand Prix Thinking L2 Call 2: Add Lesson Notes to Trajectory Paths

**Function:** `buildTrajectoryCall2Prompt`
**Purpose:** Call 2 (Opus) generates the three trajectory paths — Steady Builder,
Ambitious Competitor, Curious Explorer. Lesson notes inform what constraints
exist for each path and what carry-forward work is already underway.

**Find (exact — near the end of the Call 2 system prompt, in the COMPETITION
PREPARATION section just before the final `${crossLayerContext}` block and the
JSON schema):**
```
COMPETITION PREPARATION IN TRAJECTORY PLANNING:
```

**Insert before it:**
```
LESSON NOTES IN TRAJECTORY PATH GENERATION:
When lesson notes data was included in the Call 1 current state analysis,
apply it to trajectory path generation as follows:

BUILDING BLOCKS — WHAT IS ALREADY UNDERWAY:
The "This Session's Focus" movements from recent lesson entries represent
work the rider and horse are already doing with instructor guidance. When
generating the "Building Blocks This Month" section of each trajectory path,
ground it in what is actually being worked on in lessons — not abstract
preparation. If haunches-in is a session focus in three recent lessons, the
Building Blocks section should reference that work as the current foundation,
not prescribe it as a new task.

WATCH OUT FOR — INSTRUCTOR-FLAGGED PATTERNS:
[PRIORITY]-flagged recurring cues from lesson notes are the most reliable
"watch out for" signals available. When generating the "Watch Out For"
section of each path, draw from [PRIORITY] cue patterns in lesson notes
first, before inferring from debrief data.

PATH-SPECIFIC LESSON NOTES APPLICATION:

Steady Builder path:
- Recurring [PRIORITY] cues define the foundation work that needs to be
  solidified at current level before progression. These are the instructor's
  view of what needs depth, not speed. Name them explicitly.
- Coach's Eye horse-state observations inform the maintenance and care
  components of the Steady Builder's long arc. A horse the instructor
  consistently notes as "bracing to the left" needs asymmetry management
  built into a multi-year plan, not just a single training cycle.

Ambitious Competitor path:
- Session Focus movements reveal current competitive-level readiness. If the
  instructor is regularly focusing on movements that appear in the next level's
  test, include this as a positive timeline signal.
- [PRIORITY] cue patterns that persist across many lessons despite instructor
  attention represent real trajectory risk — name them in the path's
  "Watch Out For" section as items that could delay competition readiness if
  not resolved.

Curious Explorer path:
- Instructor imagery from coachesEye entries are this path's richest resource.
  The Curious Explorer follows the conceptual thread of the training relationship,
  not just the technical checklist. When instructor metaphors recur, they point
  to the deep principle the horse-rider pair is exploring — name that principle.
- Rider Breakthrough moments are particularly significant for this path. A rider
  who has demonstrated metacognitive self-knowing is already living the Curious
  Explorer's values — the path should build on this explicitly.

ABSENCE: If no lesson notes were present in Call 1 analysis, make no reference
to instructor guidance or lesson content in this output.

```

---

## Fix 5 — Grand Prix Thinking L1: Add Rider Breakthrough Signal to Path Selection

**Function:** `buildGPTL1Prompt`
**Purpose:** L1 selects ONE mental performance path and generates the weekly
assignments. The Rider Breakthrough field from coachesEye is directly relevant
to path selection — a rider demonstrating real-time self-knowing has a different
Resilience path need than a rider who hasn't yet developed that capacity.

**Find (exact — in the PATH SELECTION CRITERIA section):**
```
Select the path that addresses the highest-priority pattern. Paths:
- pre_ride: When data shows arrival state, pre-ride preparation, or intention-setting
  as a performance variable
- in_saddle: When data shows focus loss, reactive riding, or mental noise during rides
- resilience: When data shows setback recovery patterns, confidence dips, or
  post-difficult-ride emotional carryover
```

**Replace with:**
```
Select the path that addresses the highest-priority pattern. Paths:
- pre_ride: When data shows arrival state, pre-ride preparation, or intention-setting
  as a performance variable
- in_saddle: When data shows focus loss, reactive riding, or mental noise during rides
- resilience: When data shows setback recovery patterns, confidence dips, or
  post-difficult-ride emotional carryover

LESSON NOTES SIGNAL FOR PATH SELECTION:
When lesson notes data is present, it provides two additional path selection signals:

1. If [PRIORITY]-flagged cues recur across multiple lessons AND the rider's debriefs
   show they forget or don't apply these cues when riding alone: this is an in_saddle
   signal — the rider has the knowledge but loses access to it during the ride.
   The in_saddle path addresses exactly this gap between knowing and doing under pressure.

2. If Rider Breakthrough sub-sections appear in coachesEye across multiple lesson notes:
   the rider is already operating with metacognitive self-awareness. For this rider,
   the resilience path should NOT frame itself as building self-awareness from scratch.
   Instead, build on the demonstrated breakthrough capacity: "You've already shown you
   can find the insight in real time — this path helps you trust that capacity when
   the pressure is highest."

   Include this signal in the aiReasoning.patternCited field when it applies:
   "Rider has demonstrated metacognitive awareness in [N] lesson breakthrough moments —
   resilience path builds on existing self-knowing capacity rather than introducing it."
```

---

## Implementation Checklist

**`functions/lib/promptBuilder.js`:**
- [ ] Fix 1: Insert LESSON NOTES AS PATTERN SOURCES block at end of Call 1 system
  prompt (before closing backtick, after "Classical Master voice: precise, grounded,
  occasionally poetic")
- [ ] Fix 2: Insert LESSON NOTES IN THE JOURNEY NARRATIVE block at end of Call 2
  system prompt (after "Training progress and the rider's development remain the
  primary storyline.")
- [ ] Fix 3: Insert LESSON NOTES IN CURRENT STATE ANALYSIS block after the
  JSON schema closing brace in `buildTrajectoryCall1Prompt`
- [ ] Fix 4: Insert LESSON NOTES IN TRAJECTORY PATH GENERATION block before
  the COMPETITION PREPARATION IN TRAJECTORY PLANNING section in
  `buildTrajectoryCall2Prompt`
- [ ] Fix 5: Replace PATH SELECTION CRITERIA paths list in `buildGPTL1Prompt`
  with expanded version including LESSON NOTES SIGNAL FOR PATH SELECTION

**Verification — string searches after implementation:**
- [ ] Search `buildJourneyMapPrompt` for "RIDER BREAKTHROUGH — MILESTONE
  CLASSIFICATION" — must appear once in callIndex === 1 branch
- [ ] Search `buildJourneyMapPrompt` for "RIDER BREAKTHROUGH MOMENTS — NARRATIVE
  TREATMENT" — must appear once in callIndex === 2 branch
- [ ] Search `buildTrajectoryCall1Prompt` for "FUNCTIONAL LEVEL CALIBRATION"
  — must appear once
- [ ] Search `buildTrajectoryCall2Prompt` for "BUILDING BLOCKS — WHAT IS ALREADY
  UNDERWAY" — must appear once
- [ ] Search `buildGPTL1Prompt` for "LESSON NOTES SIGNAL FOR PATH SELECTION"
  — must appear once
- [ ] Confirm no existing prompt text was modified — additions only

**Out of scope:**
- Journey Map Call 3 (visualization data structure — no lesson notes content
  needed in the JSON schema for timeline rendering)
- Grand Prix Thinking L2 Calls 3 and 4 (movement mapping and narrative — both
  inherit from Call 1 and 2 analysis; no direct lesson notes integration needed)
- Any changes to form files, Firestore schema, or API routes
- `YDJ_Prompt_Additions_Lesson_Notes.md` sections 7 and 8 — these are now
  superseded by this brief and can be marked COMPLETE in that document
