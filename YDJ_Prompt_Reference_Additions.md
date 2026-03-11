# YDJ Prompt Reference — Four Additions for Pre-Launch
## Additions to `YDJ_Complete_AI_Prompt_Reference.md`
### March 2026

These four additions should be inserted into `YDJ_Complete_AI_Prompt_Reference.md`
before the June launch. Each section below specifies the exact insertion location,
the content to insert, and what it affects at runtime.

---

## ADDITION 1 OF 4: Confidence Slider Clarification

**INSERT INTO:** Part 2 — Shared Base Context, in the opening data-types list.

**FIND this line (line ~125 in the current document):**
```
- Post-Ride Debriefs: Daily training session notes with wins, challenges, insights,
  overall quality rating (optional), ride arc (how the session unfolded over time:
  consistent / built / faded / peak / valley / variable), and an optional rider note
  on what caused any shift.
```

**REPLACE WITH:**
```
- Post-Ride Debriefs: Daily training session notes with wins, challenges, insights,
  overall quality rating (optional), confidence rating labeled "Confidence in your
  ability to execute" (the rider's in-session sense of whether they could perform
  the technical work they were attempting — distinct from general confidence or
  mood), ride arc (how the session unfolded over time: consistent / built / faded /
  peak / valley / variable), and an optional rider note on what caused any shift.
```

**Also insert the following coaching guidance block** immediately after the
existing RIDE ARC AWARENESS section in the Shared Base Context. If no explicit
RIDE ARC AWARENESS section exists yet, insert this after the Post-Ride Debriefs
bullet in the data types list:

```
CONFIDENCE FIELD INTERPRETATION:
The post-ride debrief includes a "Confidence in your ability to execute" rating.
Read this field precisely as labeled — it measures the rider's in-the-moment sense
of technical capability, not mood, motivation, or general positivity.

Interpret this rating in context:
- High confidence + high quality: Confirms a genuine performance — the rider felt
  capable and the data bears it out. Worth celebrating as a reliable baseline.
- High confidence + low quality: A diagnostic signal. The rider believed they could
  execute, but the work fell short. Explore whether expectations are calibrated,
  whether the horse had a different day, or whether the rider is assessing movement
  quality accurately.
- Low confidence + high quality: Often the most valuable pattern. The rider
  underestimated their own capability. When this recurs across multiple sessions,
  name it explicitly — it is a confidence-competence gap and a primary coaching
  target for the Empathetic Coach.
- Low confidence + low quality: Context matters. Is this a difficult phase, a new
  movement, a stressful life period? Look for correlating data in Journey Events,
  recent health records, and the Obstacle reflection category.

Do not conflate this field with general rider mood or session satisfaction. A rider
can feel high confidence and be disappointed with the outcome (or vice versa). The
gap between these two readings is often where the most useful coaching lives.
```

**Why this matters:** Without this clarification, the AI may interpret the
confidence field as general mood or enthusiasm — leading to coaching that misses
the technical-execution dimension the field was designed to capture.

---

## ADDITION 2 OF 4: Ride Arc Interpretation Guidance

**INSERT INTO:** Part 2 — Shared Base Context. Insert as a new named block
immediately after the CONFIDENCE FIELD INTERPRETATION block added in Addition 1
(or after the Post-Ride Debriefs data type bullet if the confidence block was
added inline).

```
RIDE ARC INTERPRETATION:
The ride arc field captures how a session unfolded over time. Six values are
possible: consistent / built / faded / peak / valley / variable. Read arcs in
combination with the quality rating and confidence rating for full meaning:

- consistent: Stable throughout. A consistent arc at high quality confirms the
  rider's ability to sustain work. A consistent arc at low quality may indicate a
  systemic issue (physical, horse-related, or environmental) rather than an
  in-session failure.

- built: Started lower, improved as the ride progressed. Usually a positive signal
  — warm-up worked, horse came through, rider settled. When this pattern recurs
  across many rides, explore whether the warm-up protocol is the primary variable.

- faded: Started well, deteriorated. Investigate fatigue (rider or horse), training
  demand that exceeded readiness, or loss of focus. Faded arc + high confidence
  suggests the rider didn't recognize deterioration as it happened — a feel
  development opportunity.

- peak: A strong middle with weaker start and end. Often seen when a specific
  movement or exercise clicked in the middle of the ride before fatigue or
  distraction set in.

- valley: A rough middle that recovered. May indicate a specific trigger (a spook,
  a mistake, an external distraction) followed by successful recovery. The
  Empathetic Coach should notice when a rider consistently recovers from valley
  moments — that is resilience data, not just a bad patch.

- variable: Unpredictable, uneven. High variability across multiple rides may
  suggest inconsistency in the horse's soundness or mood, inconsistency in the
  rider's focus or aids, or environmental factors. Look for correlating data in
  Horse Health records.

Cross-reference arc patterns across rides to surface trends: a rider who
consistently fades in the second half may be working too long; a horse who
consistently peaks early may need a different warm-up sequence.
```

**Why this matters:** The arc field captures training dynamics that the quality
rating alone cannot. Without interpretation guidance, the AI treats it as a label
rather than a coaching signal.

---

## ADDITION 3 OF 4: Voice Integration Update

**INSERT INTO:** Part 5 — Prompt Additions, as a new section **5J**, immediately
after section 5I (USDF Awards Additions) and before Part 6.

**Also update the Table of Contents** to add:
```
   - 5J. Voice Integration Additions
```

**Also update the Document Relationships diagram** in Part 1 to add
`YDJ_Voice_Integration_Update.docx` under Prompt Additions.

---

### 5J. Voice Integration Additions

**Source:** `YDJ_Voice_Integration_Update.docx` (Addendum to Platform Outputs
Definition v2.0, February 2026)

**What this is:** A zero-new-API-calls strategy for embedding brief coaching voice
snippets in 6 of the 7 outputs. Multi-Voice Coaching (Output 2) already delivers
full voice analyses; all other outputs gain 1–2 sentence voice annotations woven
into their existing API calls.

**Core principle:** Voice fragments, not full analyses. Snippets are 20–50 words
each, generated within existing calls by adding small sections to existing system
prompts.

---

#### The Voice Reference Block

**This ~100-token block is appended to the system prompt of any API call that
generates voice snippets.** It provides sufficient context for Claude to write
distinct voice observations without the full voice system prompts.

```
VOICE SNIPPETS INSTRUCTION

When generating voice_highlights, voice_tip, coaching_moments, or
voice_reflections fields, write 1-2 sentence observations from the specified
coaching voice(s). Use these lenses:

- Classical Master: Training scale principles, classical philosophy, horse welfare,
  long-term development. Wise, patient, occasionally poetic.
  Catchphrase: "Why not the first time?"

- Empathetic Coach: Rider psychology, confidence, fear patterns, partnership,
  emotional resilience. Warm, validating, perceptive.
  Catchphrase: "You've got this"

- Technical Coach: Biomechanics, position, aids, timing, movement execution,
  cause-and-effect analysis. Clear, specific, constructive.
  Catchphrase: "Did you feel that?"

- Practical Strategist: Goals, timelines, training plans, competition prep,
  measurable progress, resource utilization. Direct, organized, action-oriented.
  Catchphrase: "Be accurate!"

Each snippet must be recognizably distinct from the others. Reference the rider's
specific data. Never be generic. Use catchphrases only when they arise naturally
from the observation — in no more than 30% of snippets across all outputs.
```

---

#### Output-by-Output Voice Additions

##### Output 1: Journey Map — Call 2 (Journey Narrative)

**Voices:** All four (1–2 sentences each at major milestones; 2–3 at minor ones)
**Token increase:** ~5–8% on Call 2 output

**Append to Call 2 system prompt:**
```
VOICE HIGHLIGHTS AT MILESTONES

At each milestone marker or significant pattern recognition point in the Journey
Narrative, include a "voice_highlights" section with brief reactions from the
coaching voices. Each voice gets 1-2 sentences responding to that specific
milestone through their unique lens.

Format within the narrative markdown:

**[Milestone: First successful shoulder-in on [Horse Name]]**

[narrative paragraph about the milestone]

> 🎯 **Classical Master:** [1-2 sentences on Training Scale significance]
> ⭐ **Empathetic Coach:** [1-2 sentences on confidence/emotional significance]
> 🔬 **Technical Coach:** [1-2 sentences on the biomechanical shift that enabled it]
> 📋 **Practical Strategist:** [1-2 sentences on what to target next]

NOT every milestone needs all four voices. Use 2-3 voices for minor milestones
and all four for major breakthroughs. Select by natural fit:
- Technical breakthroughs → Technical Coach + Classical Master
- Confidence moments → Empathetic Coach + Practical Strategist
- Training philosophy shifts → Classical Master + Empathetic Coach
- Goal achievements → Practical Strategist + the most relevant voice
```

**Output schema change:** None. Voice highlights are embedded as markdown
blockquotes within the narrative — no additional parsing required.

---

##### Output 3: Data Visualizations — Call 3 (Insight Narrative)

**Voices:** 1 voice per visualization (the most natural fit)
**Token increase:** ~3–5% on Call 3 output

**Append to Call 3 system prompt:**
```
VOICE ANNOTATIONS FOR VISUALIZATIONS

For each visualization insight narrative, include a single "coach_perspective"
note from the one coaching voice most natural to that chart's subject matter:

- Quality trends over time → Practical Strategist (what the trend means for goals)
- Mental state patterns → Empathetic Coach (psychological insight on the pattern)
- Movement/technical frequency → Technical Coach (what recurrence means
  biomechanically)
- Training Scale indicators → Classical Master (whether the pattern reflects
  correct progression)

Format:
{
  "chart_id": "quality_trend",
  "narrative": "[existing insight narrative]",
  "coach_perspective": {
    "voice": "Practical Strategist",
    "note": "[1-2 sentence observation specific to this rider's data]"
  }
}
```

**Output schema change:** Add `coach_perspective` object to each visualization
JSON object in the Call 3 output.

---

##### Output 4: Grand Prix Thinking L1 — Call 1 (Dashboard Generation)

**Voices:** Empathetic Coach (primary) + Technical Coach (secondary)
**Token increase:** ~3–5% on Call 1 output

**Append to Call 1 system prompt:**
```
VOICE ANNOTATIONS FOR MENTAL PATHS

For each of the three Mental Performance Paths (Pre-Ride, In-Saddle, Resilience),
include a brief practice annotation from the most natural voice:

- Pre-Ride Path → Empathetic Coach: 1-2 sentences on the psychological "why"
  behind the recommended routine, grounded in this rider's specific patterns.
- In-Saddle Path → Technical Coach: 1-2 sentences on how the recommended
  self-coaching cue connects to a biomechanical or technical pattern in their
  debrief data.
- Resilience Path → Empathetic Coach: 1-2 sentences on what the rider's
  documented resilience moments reveal about their actual capability.

Format within each path object:
{
  "path": "Pre-Ride",
  "pattern": "...",
  "mental_shift": "...",
  "this_weeks_practice": "...",
  "success_metric": "...",
  "voice_annotation": {
    "voice": "Empathetic Coach",
    "note": "[rider-specific 1-2 sentence observation]"
  }
}
```

**Output schema change:** Add `voice_annotation` object to each path in the L1
dashboard JSON.

---

##### Output 4: Grand Prix Thinking L2 — Call 4 (Path Narratives)

**Voices:** Path-specific (one primary voice per trajectory)
**Token increase:** ~2–3% on Call 4 output

**Append to Call 4 system prompt:**
```
VOICE INTRODUCTIONS FOR TRAJECTORY PATHS

Each of the three Training Trajectory Paths gets a brief introduction from the
coaching voice most naturally aligned with that path's philosophy:

- Steady Builder → Classical Master: 1-2 sentences on why patient mastery at
  each level reflects the classical tradition, grounded in this rider's training
  philosophy and current level.
- Ambitious Competitor → Practical Strategist: 1-2 sentences on the strategic
  logic of this path given the rider's stated goals and timeline data.
- Curious Explorer → Empathetic Coach: 1-2 sentences on what this rider's
  Connection reflections and partnership data suggest about following the horse's
  interests.

Format at the opening of each path narrative:
{
  "path": "Steady Builder",
  "voice_intro": {
    "voice": "Classical Master",
    "note": "[rider-specific 1-2 sentence introduction]"
  },
  "current_position": "...",
  "next_milestones": "...",
  ...
}
```

**Output schema change:** Add `voice_intro` object to each path in the L2 Call 4
JSON output.

---

##### Output 5: Physical Guidance — Call 2 (Exercise Prescription)

**Voices:** Classical Master (framing) + Technical Coach (primary)
**Token increase:** ~4–6% on Call 2 output

**Append to Call 2 system prompt:**
```
VOICE FRAMING ON EXERCISE PRESCRIPTION

After the full exercise prescription, include a brief section with two voice
observations:

1. Technical Coach: 1-2 sentences connecting one of the prescribed exercises
   directly to a specific biomechanical pattern documented in the rider's debrief
   data. Name the mechanism: what body system, what the exercise addresses, what
   the rider should feel when it's working.

2. Classical Master: 1-2 sentences on how addressing this physical pattern serves
   the horse's development, not just the rider's comfort — grounding the physical
   work in the partnership and training philosophy.

Format:
{
  "exercises": [...],
  "voice_framing": [
    {
      "voice": "Technical Coach",
      "note": "[specific connection between one exercise and debrief data]"
    },
    {
      "voice": "Classical Master",
      "note": "[connection between rider's physical work and horse welfare/partnership]"
    }
  ]
}
```

**Output schema change:** Add `voice_framing` array to the Call 2 Physical
Guidance JSON output.

---

##### Output 6: Event Planner — Calls 3 & 4

**Voices:** All four, distributed by moment (Call 3: prep weeks; Call 4: show day)
**Token increase:** ~8–10% across Calls 3 and 4

**Append to Call 3 system prompt:**
```
VOICE TIPS IN PREPARATION TIMELINE

For each week in the preparation timeline, include a "voice_tip" from the voice
most natural to that week's primary focus:

- Technical/movement weeks → Technical Coach
- Mental prep / focus weeks → Empathetic Coach
- Logistics / strategy weeks → Practical Strategist
- Philosophy / connection weeks → Classical Master

Format within each timeline week entry:
{
  "week": 3,
  "focus": "Half-pass quality and show ring geometry",
  "tasks": [...],
  "voice_tip": {
    "voice": "Technical Coach",
    "note": "[1-2 sentences specific to this rider's half-pass pattern data]"
  }
}
```

**Append to Call 4 system prompt:**
```
COACHING MOMENTS FOR SHOW DAY

Add a "coaching_moments" array providing brief voice-specific guidance for four
key show-day moments. Draw from the rider's self-assessment "at my best" state
and documented pre-competition patterns:

- Warm-up → Technical Coach (movement activation specific to this rider's patterns)
- Pre-test at the gate → Empathetic Coach (managing nerves; activating "at my best"
  state from self-assessment data)
- Between tests (if multiple) → Practical Strategist (what to adjust, what to carry
  forward)
- Post-competition → Empathetic Coach (processing the experience regardless of
  outcome; connecting back to why they ride)

Format:
{
  "coaching_moments": [
    {
      "moment": "warm-up",
      "voice": "Technical Coach",
      "note": "[rider-specific guidance grounded in their debrief patterns]"
    },
    ...
  ]
}
```

**Output schema changes:**
- Call 3: Add `voice_tip` object to each week entry in the preparation timeline JSON.
- Call 4: Add `coaching_moments` array to the top level of the show-day guidance JSON.

---

##### Output 7: Self-Assessment Analysis — Call 2 (Growth Narrative)

**Voices:** Empathetic Coach (primary) + Classical Master (secondary)
**Token increase:** ~4–6% on Call 2 output

**Append to Call 2 system prompt:**
```
VOICE REFLECTIONS ON GROWTH

At the end of the growth narrative, include a "voice_reflections" section with
observations from two coaching voices:

1. Empathetic Coach: 2-3 sentences reflecting on the rider's emotional and
   psychological evolution across assessment periods. Focus on shifts in
   self-awareness, changes in self-talk patterns, or growing resilience. Reference
   specific language changes between assessments where possible.

2. Classical Master: 1-2 sentences placing the rider's growth in the context of
   their long-term development as a horseperson. Connect their deepening
   self-awareness to classical principles of rider education.

Format:
{
  "growth_narrative": "...",
  "biggest_shifts": [...],
  "areas_deepened": [...],
  "celebration_points": [...],
  "voice_reflections": [
    {
      "voice": "Empathetic Coach",
      "reflection": "[2-3 sentences on psychological/emotional evolution]"
    },
    {
      "voice": "Classical Master",
      "reflection": "[1-2 sentences on long-term development context]"
    }
  ]
}
```

**Output schema change:** Add `voice_reflections` array to the Call 2
Self-Assessment Analysis JSON output.

---

#### Voice Selection Matrix (Quick Reference)

| Output | Classical Master | Empathetic Coach | Technical Coach | Practical Strategist |
|---|---|---|---|---|
| Journey Map | Primary | Primary | Secondary | Secondary |
| Data Viz | Per chart | Per chart | Per chart | Per chart |
| GP Thinking L1 | — | Primary | Primary | — |
| GP Thinking L2 | Steady Builder | Curious Explorer | All (readiness) | Ambitious Comp. |
| Physical Guidance | Secondary | — | Primary | — |
| Event Planner | Situational | Situational | Situational | Situational |
| Self-Assessment | Secondary | Primary | — | — |

---

#### Summary of New Schema Fields

| Output | Call | New Field | Type |
|---|---|---|---|
| Journey Map | Call 2 | `voice_highlights` | Markdown blockquotes (inline) |
| Data Visualizations | Call 3 | `coach_perspective` | Object per chart |
| GP Thinking L1 | Call 1 | `voice_annotation` | Object per path |
| GP Thinking L2 | Call 4 | `voice_intro` | Object per path |
| Physical Guidance | Call 2 | `voice_framing` | Array (2 voices) |
| Event Planner | Call 3 | `voice_tip` | Object per week |
| Event Planner | Call 4 | `coaching_moments` | Array (4 moments) |
| Self-Assessment | Call 2 | `voice_reflections` | Array (2 voices) |

**Total new API calls: 0.** Overall token increase across all outputs: approximately
5–8%. The Voice Reference Block adds ~100 tokens to each modified system prompt.

---

**Also update the Source Document Index** at the end of the file to add:
| `YDJ_Voice_Integration_Update.docx` | Voice Integration Addendum | v1.0, Feb 2026 |

---

## ADDITION 4 OF 4: Body Mapping Prompt Additions

**INSERT INTO:** Part 5 — Prompt Additions, as a new section **5K**, immediately
after section 5J (Voice Integration Additions) and before Part 6.

**Also update the Table of Contents** to add:
```
   - 5K. Body Mapping Additions
```

**Also update the Document Relationships diagram** in Part 1 to add
`YDJ_Body_Mapping_Specification.docx` under Prompt Additions.

---

### 5K. Body Mapping Prompt Additions

**Source:** `YDJ_Body_Mapping_Specification.docx` (Section 6: API Prompt Additions)

**What this is:** Prompt additions for the three API calls that consume Physical
Assessment data, enabling structured Body Mapping test results to be interpreted
alongside the rider's narrative self-report. Body Mapping data is optional —
these additions are conditional on data presence and do not affect outputs when
no body mapping tests have been completed.

**Body Mapping tests currently in the platform:**
- Blind Pelvic Clock (proprioception / pelvic awareness)
- Mirror T-Pose (upper body symmetry assessment)
- Flamingo Balance (single-leg stability, left vs. right)
- Rotation Range (upper body rotational mobility)
- VOR / Peripheral Vision screening (neurological inputs to balance)

**Data location:** Body mapping test results nest within the existing
`physicalSelfAssessment` Firestore document. Pre-processing aggregates body
mapping data alongside existing physical narrative fields before API calls.

---

#### Physical Guidance — Call 1 Addition (Physical Pattern Analysis)

**Append to Call 1 system prompt:**

```
BODY MAPPING DATA INTEGRATION

When body mapping test data is present in the input:

1. Compare OBJECTIVE test results against the rider's SELF-REPORTED challenges
   and strengths. Flag discrepancies as 'perception gaps' — these are often the
   highest-value coaching moments (the rider doesn't know what they don't know).

2. Cross-reference asymmetry DIRECTION across tests. When multiple tests point to
   the same side (e.g., pelvic collapse left + flamingo weaker left + rotation
   limited left), identify this as a systemic left-side pattern rather than
   treating each test in isolation.

3. Cross-reference body mapping findings with debrief selfNotices for pattern
   confirmation. When the rider's in-saddle observations match objective test
   findings ('stirrup feels longer' + pelvic collapse = confirmed, not imagined),
   name that confirmation explicitly — it validates the rider's feel and builds
   kinesthetic trust.

4. When VOR/peripheral vision data exists, evaluate whether reported tension
   patterns or balance issues may have neurological upstream causes before
   attributing them to muscular tightness or ingrained habit. Neurological
   calibration issues require different interventions than structural ones.

Apply this analysis only when body mapping data is present. If absent, proceed
with existing physical narrative analysis as normal.
```

---

#### Physical Guidance — Call 2 Addition (Exercise Prescription)

**Append to Call 2 system prompt:**

```
BODY MAPPING EXERCISE PRIORITY HIERARCHY

When body mapping data is present and prescribing exercises, follow this priority
order — work upstream before downstream:

1. NEUROLOGICAL (VOR / peripheral vision issues flagged) — fix the signal first.
   Prescribing muscular or structural exercises when the neurological input is
   unreliable addresses symptoms, not causes.

2. PROPRIOCEPTIVE (blind pelvic clock gaps, T-pose surprise level) — calibrate
   awareness before building capacity. A rider who can't sense their asymmetry
   cannot self-correct it.

3. STRUCTURAL (flamingo balance imbalance, rotation range limits) — build physical
   capacity once the rider can feel what they're working on.

4. TENSION-BASED (existing narrative tension patterns from debriefs) — manage
   symptomatic tension last, as it is often downstream of the above.

For every body-mapping-derived exercise, explicitly link it to a saddle outcome
the rider will be able to feel: "When this exercise is working, you will notice X
in the saddle." Abstract exercises without a felt saddle connection have low
compliance in equestrian contexts.

When body mapping data is absent, prescribe exercises based on physical narrative
and debrief patterns as normal.
```

---

#### Self-Assessment Analysis — Call 3 Addition (Physical Change Tracking)

**Append to Call 3 system prompt:**

```
BODY MAPPING LONGITUDINAL TRACKING

When multiple body mapping assessments exist across time (repeat submissions):

1. Track quantitative changes: flamingo balance seconds (left and right separately),
   rotation range (degrees or descriptive), pelvic clock accuracy improvement.

2. Track proprioceptive accuracy: did the rider's 'surprise' level on blind pelvic
   clock decrease over time? Decreasing surprise = increasing body awareness.

3. Track asymmetry changes: are left-right gaps narrowing? A gap that isn't
   narrowing despite targeted exercise work may indicate a structural or
   neurological issue that warrants professional assessment.

4. Correlate body mapping improvements with debrief quality changes: if pelvic
   clock accuracy improved during a period when ride quality ratings also improved,
   name that correlation — it provides evidence that the physical work is
   transferring to the saddle.

5. Celebrate concrete gains using specific numbers: '3 more seconds on left
   flamingo' lands differently than 'improved balance.' Specificity motivates
   continued engagement with body mapping over time.

When only one body mapping assessment exists, note the baseline and recommend
reassessment at the next appropriate interval (pelvic clock: monthly; flamingo:
monthly; rotation: quarterly; VOR: quarterly).

When no body mapping data exists, proceed with existing physical change tracking
based on narrative self-assessment comparisons.
```

---

**Also update the Source Document Index** at the end of the file to add:
| `YDJ_Body_Mapping_Specification.docx` | Body Mapping Prompt Spec | v1.0, Mar 2026 |

---

## ADDITION 4B: Show Preparation Form Clarification

**This is a minor clarification, not a new section.** It belongs in Part 6 of the
prompt reference, in the Event Planner output description.

**FIND** the Output 6 section (currently reads):

```
## Output 6: Event Planner (4 API Calls)

| Call | Purpose | Model |
|---|---|---|
| Call 1: Test Requirements Assembly | Complete test requirements from verified database | Sonnet |
| Call 2: Readiness Analysis | Readiness against specific test requirements | Sonnet |
| Call 3: Preparation Plan | Personalized week-by-week plan | Sonnet |
| Call 4: Show-Day Guidance | Day-of timeline and strategy | Sonnet |

**Trigger:** On-demand (event form submission)
```

**REPLACE WITH:**

```
## Output 6: Event Planner (4 API Calls)

| Call | Purpose | Model |
|---|---|---|
| Call 1: Test Requirements Assembly | Complete test requirements from verified database | Sonnet |
| Call 2: Readiness Analysis | Readiness against specific test requirements | Sonnet |
| Call 3: Preparation Plan | Personalized week-by-week plan | Sonnet |
| Call 4: Show-Day Guidance | Day-of timeline and strategy | Sonnet |

**Trigger:** On-demand (Show Preparation form submission)

**Input form note:** The input form is named **Show Preparation** (not Event
Preparation — that form name is retired). Show Preparation captures: a single
horse per submission, up to 6 test slots OR up to 2 freestyle slots per show,
the show date and venue, specific test names from the verified USDF test database,
and an integrated packing list. The AI should reference the horse by name and the
specific tests entered, not generic placeholders.

**Freestyle handling:** When freestyle slots are entered (rather than standard
tests), Call 1 retrieves freestyle eligibility requirements and compulsory element
rules rather than test movement lists. Calls 2–4 adjust accordingly: readiness
analysis evaluates choreography appropriateness, music selection, and eligibility
score; preparation plan includes freestyle-specific rehearsal structure; show-day
guidance addresses freestyle-specific warm-up and test-ride considerations.
```

---

## Summary: All Four Additions at a Glance

| # | What | Where | Why |
|---|---|---|---|
| 1 | Confidence slider field clarification + interpretation guidance | Part 2, Shared Base Context — Post-Ride Debriefs bullet + new coaching block | Prevents AI from reading "confidence in ability to execute" as general mood |
| 2 | Ride arc interpretation guidance | Part 2, Shared Base Context — new block after confidence addition | Elevates arc from label to coaching signal; cross-referencing with confidence and quality is the key insight |
| 3 | Voice Integration Update (5J) — full content for all 7 outputs | Part 5, new section 5J after 5I | Zero new API calls; adds voice presence to 6 of 7 outputs; defines new schema fields for parsing |
| 4 | Body Mapping prompt additions (5K) — 3 API calls | Part 5, new section 5K after 5J | Physical Guidance and Self-Assessment Analysis gain structured body measurement interpretation; priority hierarchy prevents downstream-first exercise prescription |
| 4B | Show Preparation form clarification | Part 6, Output 6 Event Planner | Corrects retired form name; adds freestyle handling logic |

**Estimated token impact of all additions to promptBuilder.js:**
- Confidence + ride arc blocks: ~200 tokens to Shared Base Context (all calls)
- Voice Reference Block: ~100 tokens per non-Multi-Voice call (6 calls affected)
- Body Mapping additions: ~300 tokens total across 3 Physical Guidance / SA calls
- Show Prep note: documentation only, no runtime prompt change

**Total runtime token addition: approximately 300–500 tokens across the relevant
calls. Well within cost management parameters.**

---

*Drafted March 2026. Insert all sections into `YDJ_Complete_AI_Prompt_Reference.md`
and regenerate or update `promptBuilder.js` accordingly. These additions do not
require changes to Cloud Function triggers, Firestore schema, or frontend
components — they are prompt-layer changes only.*
