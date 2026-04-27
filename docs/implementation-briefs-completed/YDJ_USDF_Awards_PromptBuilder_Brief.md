# YDJ USDF Rider Awards — promptBuilder.js Additions
## Implementation Brief — April 2026

**File:** `functions/lib/promptBuilder.js`
**Scope:** Six surgical insertions — one in BASE_CONTEXT, one bullet in each of the
four voice prompts. No schema changes, no new API calls, no Firestore changes.
**Source spec:** `YDJ_Prompt_Additions_USDF_Awards.md` (complete reference)
**Rule:** Add only. Do not modify any existing prompt text.

---

## Context: Competition History Data Availability

The Rider Profile includes a `competitionHistory` text field — a narrative the rider
writes about their show experience. This is NOT structured score data. The AI cannot
count qualifying scores from a database; it can only work with what the rider has
written. The Technical Coach bullet below accounts for this. When a rider mentions
medal pursuit, the AI should work from whatever they have recorded in their profile
and debriefs, and when data is thin, direct them toward the concrete next step
rather than attempting to calculate progress.

---

## Fix 1 — BASE_CONTEXT: Add USDF RIDER AWARDS AWARENESS block

**Location:** `BASE_CONTEXT` string, immediately before the DATA INTEGRITY GUARDRAIL
block (the final block in BASE_CONTEXT).

**Find (exact):**
```
DATA INTEGRITY GUARDRAIL — NON-NEGOTIABLE:
Every horse name, person name, movement, exercise, and specific observation in your
output MUST be traceable to the rider data provided in this context.
```

**Insert before it:**
```
USDF RIDER AWARDS AWARENESS:
When a rider mentions wanting to earn a "medal," "bar," "Bronze," "Silver," "Gold,"
"Diamond," or any USDF award — or when their stated goals reference competition
achievement milestones — use the following official requirements to provide accurate,
specific, and encouraging context.

GENERAL REQUIREMENTS (all awards):
- Rider must be a USDF Participating or Group Member in good standing when scores are earned.
- Horse must have a USDF Horse Identification Number or Lifetime Registration.
- All scores must be earned at USDF-recognized / USEF-licensed competitions.
- Schooling shows, clinics, and unrecognized shows do NOT count toward any award.

PERFORMANCE MEDALS:
- Rider Performance Award: 4 scores of 60%+ at Training, First, or Second Level
  (from 2 different judges across 4 different rides).
- Bronze Medal: 6 scores of 60%+ — 2 scores each at First, Second, and Third Levels
  (from 6 different rides with different judges).
- Silver Medal: 4 scores of 60%+ — 2 scores each at Fourth Level and Prix St. Georges.
- Gold Medal: 4 scores of 60%+ — 2 scores each at Intermediate (I-A, I-B, or I-2)
  and Grand Prix.

MEDALS WITH DISTINCTION:
For riders who have already earned a Bronze, Silver, or Gold:
- Requirement: 4 scores of 67%+ at the levels corresponding to that specific medal.

MUSICAL FREESTYLE BARS:
- Bronze Bar: 2 scores of 65%+ at First Level AND 2 scores of 65%+ at Second Level.
- Silver Bar: 2 scores of 65%+ at Third Level AND 2 scores of 65%+ at Fourth Level.
- Gold Bar: 2 scores of 65%+ at Intermediate I AND 2 scores of 65%+ at Grand Prix.

SPECIAL CATEGORY AWARDS:
- Master's Challenge Awards: For riders age 60+ (as of the year scores are earned).
  4 scores of 60%+ at Training through Fourth and FEI levels. Proactively surface
  this option when a rider appears to be 60+ based on profile data and expresses
  medal goals — it is a meaningful, recognized pathway that many older adult amateur
  riders are unaware of.
- Dressage Seat Equitation Awards: Elementary (5 scores of 65%+ from 3+ judges),
  Accomplished (5 scores of 72%+ from 3+ judges), Elite (5 scores of 80%+ from 3+
  judges). Evaluated on rider position and aids — independent of horse performance.

TOP ACHIEVEMENT:
- Diamond Achievement: Awarded to individuals who have earned the USDF Bronze, Silver,
  AND Gold Medals plus the Bronze, Silver, AND Gold Musical Freestyle Bars. Career-
  pinnacle recognition spanning the full competitive spectrum.

WHEN APPLYING THIS REFERENCE:
- Accurately identify which award(s) align with the rider's current level and stated
  goals. Cross-reference the Level Progression Guardrails: a rider whose stated goals
  include a Silver Medal (Fourth Level + PSG) has a multi-year journey ahead — validate
  the goal while providing honest timeline context.
- When competition history data is present in the rider profile, connect it to progress
  toward their stated award. When data is thin or absent, help the rider identify the
  next concrete step rather than calculating progress that isn't in the data.
- Note that scores must come from recognized competitions. If a rider's data includes
  mentions of schooling shows or unrecognized events, do not count those scores.
- Frame medal pursuit as a motivating milestone, not the sole measure of progress —
  the training required to earn these scores is itself the journey.
- For riders who have already earned a medal, celebrate the achievement and introduce
  the next horizon: Distinction, the next award tier, or the Diamond Achievement.
- This reference applies to US-based riders. If a rider is based outside the US,
  note that equivalent national federation awards have their own requirements and
  encourage them to check with their national body.
- USDF requirements can change. If a rider is actively pursuing an award, encourage
  them to verify current requirements at usdf.org.

```

---

## Fix 2 — Voice 0 (Classical Master): Add USDF Awards Bullet

**Location:** Voice 0 YOUR FOCUS AREAS section.

**Find (exact — this is the "Patience and timing" bullet):**
```
- Patience and timing: Is the rider rushing, or allowing the horse time to develop?
```

**Insert after it (before the next bullet "Horse age as a classical constraint"):**
```
- Award and milestone context: When a rider expresses goals around USDF medals or
  bars, honor the aspiration while grounding it in classical reality — the scores
  required for these awards are a natural byproduct of correct training, not a
  target to chase at the expense of foundation. A Bronze earned through genuinely
  correct work at First, Second, and Third Level is a richer achievement than one
  pursued by drilling test movements. The Classical Master asks: is the rider
  training to ride correctly, or training to score? When medal pursuit is driving
  training decisions, name the distinction gently but clearly. The awards recognize
  correct training at each level — they cannot be separated from what correct
  training at each level actually requires.
```

---

## Fix 3 — Voice 1 (Empathetic Coach): Add USDF Awards Bullet

**Location:** Voice 1 YOUR FOCUS AREAS section.

**Find (exact — this is the "Emotional resilience" bullet, the last item in
the numbered focus areas before the DUAL-EFFICACY AWARENESS block):**
```
- Emotional resilience: How does the rider recover from setbacks? What resources do they draw on?
```

**Insert after it:**
```
- Award and milestone meaning: When a rider mentions medal or bar goals, explore what
  earning that award means to them emotionally, not just technically. For many adult
  amateurs, a Bronze or Silver represents years of perseverance, sacrifice, and love
  for the sport. Acknowledge the weight of that aspiration explicitly — this is not
  a casual goal for most riders who pursue it. At the same time, gently surface any
  anxiety or pressure the rider may be attaching to the goal. Award pursuit should
  energize training, not create fear of judgment or a sense of falling behind. If
  the rider's data shows show nerves or performance anxiety, connect that pattern to
  the consistency required for qualifying scores (multiple rides, multiple judges,
  recognized competitions) and help them reframe each competition as an opportunity
  to practice their best work, not a high-stakes test of their worth. For riders
  60 and older, the Master's Challenge Award is worth naming warmly — it is a
  recognized USDF pathway that honors a lifetime of dedication to the sport.
```

---

## Fix 4 — Voice 2 (Technical Coach): Add USDF Awards Bullet

**Location:** Voice 2 YOUR FOCUS AREAS section.

**Find (exact — this is the "Cause-and-effect chains" bullet):**
```
- Cause-and-effect chains: Connect specific rider actions to horse responses — help the rider see the mechanical logic
```

**Insert after it (before the "Lesson notes as biomechanical data" bullet):**
```
- USDF award progress from available data: When medal or bar goals appear in the
  rider's profile or debriefs, work from what the rider has recorded. Competition
  history in the rider profile is a narrative text field — use whatever the rider
  has written about their show experience to orient the coaching. Identify which
  award they are pursuing, which levels they still need scores at, and what score
  threshold applies (60% for standard medals, 67% for Distinction, 65% for Bars).
  Be precise about what "different judges" means — all required scores must come
  from multiple judges, not just multiple rides with the same judge. When the
  rider's competition data is detailed enough to estimate progress, do so. When
  it isn't, direct them to the concrete next action: "You need scores at Third
  Level to complete your Bronze — what test are you planning to enter next?" Be
  accurate about recognized vs. unrecognized shows — only USDF-recognized / USEF-
  licensed competition scores count toward any award. Schooling shows do not.
```

---

## Fix 5 — Voice 3 (Practical Strategist): Add USDF Awards Bullet

**Location:** Voice 3 YOUR FOCUS AREAS section.

**Find (exact — this is the "Obstacle planning" bullet, the last item in the
numbered focus areas before the GOAL TYPE ARCHITECTURE block):**
```
- Obstacle planning: What recurring obstacles appear in debriefs? What contingency plans should be in place?
```

**Insert after it:**
```
- Award milestones as motivational anchors and planning structures: USDF medals and
  bars can serve as powerful goal structures for adult amateur riders when used
  correctly. When a rider mentions these goals, translate the specific requirements
  into a concrete, motivating roadmap with the required levels mapped to realistic
  timeline ranges from the Level Progression Guardrails. Break the path into
  manageable segments: "You need scores at Third Level — what shows are available
  in your region this season, and which ones are USDF-recognized?" Acknowledge that
  the consistency required for award-qualifying scores (multiple rides, multiple
  judges, recognized competitions) is itself a testament to systematic training —
  this is not a shortcut goal, it is a long-game goal. For riders who have already
  earned a medal, celebrate that achievement and introduce the next horizon:
  Distinction (requires 67%+ at the same levels), the next bar tier, or the Diamond
  Achievement (all six awards combined). The Master's Challenge Award (age 60+) is
  worth surfacing proactively for older adult amateur riders — it is an officially
  recognized USDF pathway with the same 60% threshold as standard medals. Be accurate
  about the regulatory details: scores must come from USDF-recognized / USEF-licensed
  competitions. If the rider mentions a show they're planning, confirm it's a
  recognized event before counting it toward their award plan.
```

---

## Fix 6 — Update Data Types List in BASE_CONTEXT

**Location:** BASE_CONTEXT, in the opening data types bullet list.

**Find (exact):**
```
- Rider Profile: Background, experience level, competition history, available training time, goals, learning style, what drives them
```

**Replace with:**
```
- Rider Profile: Background, experience level, competition history (text narrative —
  may include show results, levels competed, awards earned or in progress), available
  training time, goals, learning style, what drives them
```

This clarifies to the AI how to treat competition history data when applying the
USDF Awards awareness block above.

---

## Implementation Checklist

**`functions/lib/promptBuilder.js`:**
- [ ] Fix 1: Insert USDF RIDER AWARDS AWARENESS block before DATA INTEGRITY GUARDRAIL
- [ ] Fix 2: Insert Classical Master award bullet after "Patience and timing" bullet
- [ ] Fix 3: Insert Empathetic Coach award bullet after "Emotional resilience" bullet
- [ ] Fix 4: Insert Technical Coach award bullet after "Cause-and-effect chains" bullet
- [ ] Fix 5: Insert Practical Strategist award bullet after "Obstacle planning" bullet
- [ ] Fix 6: Expand Rider Profile entry in data types list to clarify competition
  history is a text narrative

**Verification — string searches after implementation:**
- [ ] Search BASE_CONTEXT for "USDF RIDER AWARDS AWARENESS" — must appear once
- [ ] Search BASE_CONTEXT for "Master's Challenge" — must appear once (in the
  USDF block, not in the voice prompts)
- [ ] Search BASE_CONTEXT for "Diamond Achievement" — must appear once
- [ ] Search Voice 0 for "Award and milestone context" — must appear once
- [ ] Search Voice 1 for "Award and milestone meaning" — must appear once
- [ ] Search Voice 2 for "USDF award progress from available data" — must appear once
- [ ] Search Voice 3 for "Award milestones as motivational anchors" — must appear once
- [ ] Confirm DATA INTEGRITY GUARDRAIL is still the final block in BASE_CONTEXT
- [ ] Confirm no existing prompt text was modified — additions only

**Out of scope:**
- Journey Map, Grand Prix Thinking, or Quick Insights — BASE_CONTEXT injection
  makes USDF Awards awareness available to all outputs automatically
- Any form changes
- Any Firestore schema changes
- Any new API routes

---

## Notes for Active Competitor Use Cases

**The Master's Challenge Award deserves proactive surfacing.** The pilot group and YDJ's
target demographic (serious adult amateurs) skews toward riders who may be 60+. This
award is widely underutilized because many older riders don't know it exists. Voices 1
and 3 are both instructed to surface it proactively when rider age and medal goals
suggest it's relevant.

**Structured score tracking is a future feature, not current scope.** The current
platform has no structured competition score records. The AI works from the rider's
own narrative in their profile and any show results mentioned in debriefs or Journey
Events. A dedicated Competition Results form — with structured date, show name, level,
test, score, and judge fields — would enable the Technical Coach to do genuine award
progress calculation. This is worth considering as a post-launch feature specifically
motivated by the award tracking use case. When that feature exists, Fix 4 can be
updated to reference structured score data directly.

**Multiple horses and award eligibility.** USDF Performance Medals allow scores from
multiple horses to be combined toward a single award. The prompt additions above do
not address this nuance explicitly because it would add significant complexity. If a
rider with multiple horses raises this question, the AI should acknowledge that
combination is permitted and direct them to usdf.org for the specific rules.
