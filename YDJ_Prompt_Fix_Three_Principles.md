# YDJ Prompt Fix — Eliminate "Three Principles" Shorthand
## Corrections to `YDJ_Prompt_Additions_Dressage_Principles.md` and `YDJ_Core_Dressage_Principles.md`
### March 2026

**Problem:** AI coaching voices refer to "the Three Basic Principles" and "the Three
Non-Negotiable Principles" as a collective shorthand in both their internal
instructions and — as a consequence — in output to riders. This assumes the rider
knows what "the three principles" means without it being stated.

**Fix:** Every instance of the collective shorthand is replaced with the specific
named principles: relaxation, forwardness, and trust in the hand (or the specific
one(s) at issue in context-dependent cases). Where a bullet label or section heading
used the shorthand, it is renamed accordingly.

**Scope:**
- `YDJ_Prompt_Additions_Dressage_Principles.md` — 11 changes (this is the primary
  file that shapes AI output behavior)
- `YDJ_Core_Dressage_Principles.md` — 2 changes (the non-heading instances where
  the shorthand appears without the names)

**Not changed:** Section headings in `YDJ_Core_Dressage_Principles.md` (e.g.,
"## 1. The Three Non-Negotiable Principles") are document-structure headings, not
AI instructions. They do not need to change. Instances in that file where the names
already appear in parentheses immediately after the shorthand are also left as-is
because the names are present.

---

## FILE 1: `YDJ_Prompt_Additions_Dressage_Principles.md`

---

### FIX 1 of 11 — Shared Base Context (line ~43)

**FIND:**
```
- The Three Basic Principles (Relaxation, Forwardness, Trust in Hand) must be present at every level. If any is compromised, recommend restoring basics before advancing.
```

**REPLACE WITH:**
```
- Relaxation, forwardness, and trust in the rider's hand must be present at every level — these are not goals but prerequisites. If any is compromised, name the specific principle at issue and recommend restoring it before advancing. Do not refer to them collectively as "the three principles" — always name the specific one(s) relevant to the rider's situation.
```

---

### FIX 2 of 11 — Voice 0: Classical Master, YOUR FOCUS AREAS bullet label and body (line ~60)

**FIND:**
```
- Three Basic Principles enforcement: Every analysis must check whether relaxation, forwardness, and trust in the hand are intact. These are your litmus test. A rider achieving a beautiful half-pass means nothing if the horse is tense. When debrief data shows any of these principles compromised, this becomes your primary observation — not the movement being worked on, but the foundation beneath it. This is where "Why not the first time?" becomes most powerful: riders who maintain these principles from the start avoid the painful backtracking of correcting ingrained tension or resistance.
```

**REPLACE WITH:**
```
- Foundational principles enforcement: Every analysis must check whether relaxation, forwardness, and trust in the rider's hand are intact. These are your litmus test. A rider achieving a beautiful half-pass means nothing if the horse is tense. When debrief data shows any of these is compromised, name the specific principle — relaxation, forwardness, or trust in the hand — and make it your primary observation, not the movement being worked on. Do not refer to them as "the three principles" in your response; name the one(s) at issue. This is where "Why not the first time?" becomes most powerful: riders who maintain relaxation, forwardness, and a seeking contact from the start avoid the painful backtracking of correcting ingrained tension or resistance.
```

---

### FIX 3 of 11 — Voice 2: Technical Coach, YOUR FOCUS AREAS (line ~94)

**FIND:**
```
When a rider describes a movement that contradicts the execution standard, address the root cause (often one of the Three Basic Principles) rather than just the symptom.
```

**REPLACE WITH:**
```
When a rider describes a movement that contradicts the execution standard, address the root cause rather than just the symptom — and name it specifically: is it a loss of relaxation, a forwardness deficit, or a breakdown in trust and acceptance of the contact?
```

---

### FIX 4 of 11 — Voice 3: Practical Strategist, YOUR FOCUS AREAS (line ~115)

**FIND:**
```
- Training plan alignment with principles: When building training plans, exercise recommendations, or weekly focus areas, ensure every recommendation is consistent with the Core Dressage Principles. Specifically: never plan sessions that skip warm-up and establishment of the Three Basic Principles. Structure training plans so that foundation work is not just a warm-up afterthought but an integral, tracked component. When a rider's training pattern shows they're spending most of their time on upper-level movements without sufficient basics work, flag the imbalance and recommend a rebalanced plan — with specific time allocations.
```

**REPLACE WITH:**
```
- Training plan alignment with principles: When building training plans, exercise recommendations, or weekly focus areas, ensure every recommendation is consistent with the Core Dressage Principles. Specifically: never plan sessions that skip warm-up and establishment of relaxation, forwardness, and a seeking contact. Structure training plans so that this foundation work is not just a warm-up afterthought but an integral, tracked component. When a rider's training pattern shows they're spending most of their time on upper-level movements without sufficient basics work, flag the imbalance by naming what is being neglected — "your recent debriefs suggest relaxation is being skipped in favor of collection work" — and recommend a rebalanced plan with specific time allocations.
```

---

### FIX 5 of 11 — Grand Prix Thinking Layer 2, Call 1: section heading and body (line ~138)

**FIND:**
```
PRINCIPLES ASSESSMENT:
When analyzing the rider's current state, include an assessment of the Three Basic Principles health. Based on debrief language patterns, determine:
- Relaxation: Are there recurring mentions of tension, resistance, stiffness, or "fighting"?
- Forwardness: Are there patterns of sluggishness, needing excessive leg, or loss of energy?
- Trust in Hand: Are there contact issues, head position concerns, or descriptions of pulling?

If any principle shows chronic compromise (appearing in 30%+ of debriefs), this should be flagged as a primary training focus regardless of the rider's stated goals. Include a "foundations_health" assessment in your output.
```

**REPLACE WITH:**
```
FOUNDATIONAL PRINCIPLES ASSESSMENT:
When analyzing the rider's current state, assess the health of each foundational
principle individually. Based on debrief language patterns, determine:
- Relaxation: Are there recurring mentions of tension, resistance, stiffness, or "fighting"?
- Forwardness: Are there patterns of sluggishness, needing excessive leg, or loss of energy?
- Trust in the rider's hand: Are there contact issues, head position concerns, or descriptions of pulling or leaning?

If any of these shows chronic compromise (appearing in 30%+ of debriefs), flag it by
name as a primary training focus regardless of the rider's stated goals — e.g.,
"relaxation is showing as a recurring theme across your recent training." Do not
group them as "the three principles" in output. Include a "foundations_health"
assessment in your output with each principle assessed individually.
```

---

### FIX 6 of 11 — Grand Prix Thinking Layer 2, Call 2: Steady Builder trajectory (line ~155)

**FIND:**
```
- The Steady Builder path should emphasize deepening the Three Basic Principles at the current level
```

**REPLACE WITH:**
```
- The Steady Builder path should emphasize deepening relaxation, forwardness, and genuine acceptance of the contact at the current level — name these specifically in the trajectory description, not as "the three principles"
```

---

### FIX 7 of 11 — Grand Prix Thinking Layer 2, Call 2: Curious Explorer trajectory (line ~157)

**FIND:**
```
- The Curious Explorer path should explore how the Three Basic Principles manifest differently in different contexts (different horses, different exercises, different environments)
```

**REPLACE WITH:**
```
- The Curious Explorer path should explore how relaxation, forwardness, and trust in the hand manifest differently in different contexts — different horses, different exercises, different environments — naming each specifically as it becomes relevant
```

---

### FIX 8 of 11 — Event Planner, Call 1: section heading and criteria (lines ~193–196)

**FIND:**
```
PRINCIPLES-BASED READINESS:
When assessing readiness for competition, evaluate the Three Basic Principles health from recent debrief data. A rider who is technically capable of riding the movements in a test but whose horse is showing chronic tension, resistance, or loss of forwardness is NOT ready to compete at that level — regardless of movement competency. Competition readiness requires:
1. Movements can be performed (technical readiness)
2. Three Basic Principles are maintained throughout the test movements (quality readiness)
3. The rider can recover the basics when they are temporarily lost during challenging sequences (resilience readiness)

If debrief data shows the rider meeting criterion 1 but not 2 or 3, recommend competing at a lower level or at a schooling show where the focus can be on maintaining quality rather than just completing movements.
```

**REPLACE WITH:**
```
PRINCIPLES-BASED READINESS:
When assessing readiness for competition, evaluate the health of each foundational
principle from recent debrief data. A rider who is technically capable of riding the
movements in a test but whose horse is showing chronic tension, resistance, or loss of
forwardness is NOT ready to compete at that level — regardless of movement competency.
Competition readiness requires:
1. Movements can be performed (technical readiness)
2. Relaxation, forwardness, and a seeking contact are maintained throughout the test
   movements (quality readiness) — name whichever is at risk when discussing readiness
   gaps with the rider
3. The rider can recover relaxation, forwardness, or contact when temporarily lost
   during challenging sequences (resilience readiness)

If debrief data shows the rider meeting criterion 1 but not 2 or 3, name which
principle is at risk — e.g., "your horse's tension patterns in recent debriefs suggest
relaxation may not hold through the collected work" — and recommend competing at a
lower level or at a schooling show accordingly.
```

---

### FIX 9 of 11 — Journey Map, section heading and first bullet (lines ~211–212)

**FIND:**
```
PRINCIPLES THREAD IN NARRATIVE:
When generating the rider's journey narrative, weave the Three Basic Principles as a through-line. Look for:
- Moments where the rider's understanding of relaxation, forwardness, or contact deepened (often captured as "Aha Moments" in reflections)
```

**REPLACE WITH:**
```
FOUNDATIONAL PRINCIPLES THREAD IN NARRATIVE:
When generating the rider's journey narrative, weave the development of relaxation,
forwardness, and trust in the hand as a through-line — naming each by its specific
name as it becomes relevant. Look for:
- Moments where the rider's understanding of relaxation, forwardness, or trust in the
  hand deepened (often captured as "Aha Moments" in reflections) — name which
  principle the insight concerned
```

---

### FIX 10 of 11 — Journey Map, closing sentence (line ~217)

**FIND:**
```
The journey narrative should show that the rider's understanding of these principles IS their dressage journey — not just the movements they've learned.
```

**REPLACE WITH:**
```
The journey narrative should show that the rider's deepening understanding of
relaxation, forwardness, and trust in the hand IS their dressage journey — not just
the movements they've learned. These words should appear in the narrative, named,
not referenced as a collective concept.
```

---

### FIX 11 of 11 — Test Scenario 5 in Implementation Checklist (line ~241)

**FIND:**
```
5. **Rider's debriefs show 40%+ mentions of contact struggles** → Grand Prix Thinking should flag this as a primary focus area and trace it to the hind legs, not the hands
```

**REPLACE WITH:**
```
5. **Rider's debriefs show 40%+ mentions of contact struggles** → Grand Prix Thinking should flag trust in the hand (specifically: the horse's willingness to seek a pleasant contact) as a primary focus area, name it as such, and trace the root cause to the hind legs, not the hands
```

---

## FILE 2: `YDJ_Core_Dressage_Principles.md`

Only the instances where the shorthand appears as an instruction *without* the names
immediately present. Section headings are left unchanged.

---

### FIX 12 of 13 — Section 1 closing paragraph (line ~45)

**FIND:**
```
When the AI encounters training data where any of these three principles is compromised, it should prioritize restoring them over pursuing more advanced work. A rider at Fourth Level who has lost relaxation needs relaxation work, not flying change practice. The AI should never recommend advancing technical difficulty when the foundations are showing cracks.
```

**REPLACE WITH:**
```
When the AI encounters training data where relaxation, forwardness, or trust in the
hand is compromised, it should prioritize restoring the specific affected principle
before pursuing more advanced work — and name it explicitly in coaching output. A
rider at Fourth Level who has lost relaxation needs relaxation work, not flying change
practice. A rider whose horse is leaning on the contact needs work toward a seeking,
pleasant contact, not more collection. The AI should never recommend advancing
technical difficulty when the foundations are showing cracks, and should always name
which foundation is at issue rather than referring to "the basics" or "the three
principles" generically.
```

---

### FIX 13 of 13 — Section 6, Guardrail Rule P1 (line ~145)

**FIND:**
```
**Rule P1:** Never recommend advancing to a more complex movement or exercise when debrief data shows the three basic principles (relaxation, forwardness, trust in hand) are compromised. Always recommend restoring basics first.
```

**REPLACE WITH:**
```
**Rule P1:** Never recommend advancing to a more complex movement or exercise when
debrief data shows relaxation, forwardness, or trust in the rider's hand is
compromised. Always name the specific principle at issue and recommend restoring it
before advancing — do not refer to "the basics" or "the three principles" generically.
```

---

## SUMMARY

| Fix # | File | Location | Change Type |
|---|---|---|---|
| 1 | Prompt Additions | Shared Base Context | Replace shorthand with named principles + explicit instruction to name specifically |
| 2 | Prompt Additions | Classical Master focus area bullet | Rename bullet; add instruction to name specific principles in output |
| 3 | Prompt Additions | Technical Coach focus area | Replace shorthand with named options |
| 4 | Prompt Additions | Practical Strategist focus area | Replace shorthand; add example of named-principle output |
| 5 | Prompt Additions | GP Thinking Layer 2 Call 1 | Replace heading and body; add instruction to assess each principle individually |
| 6 | Prompt Additions | GP Thinking Layer 2 Call 2 — Steady Builder | Replace shorthand with names |
| 7 | Prompt Additions | GP Thinking Layer 2 Call 2 — Curious Explorer | Replace shorthand with names |
| 8 | Prompt Additions | Event Planner Call 1 | Replace heading and criteria; add naming instruction |
| 9 | Prompt Additions | Journey Map — heading and first bullet | Replace heading; reinforce naming |
| 10 | Prompt Additions | Journey Map — closing sentence | Replace "these principles" with named principles + instruction |
| 11 | Prompt Additions | Implementation Checklist scenario 5 | Name the specific principle in the test scenario |
| 12 | Core Principles | Section 1 closing paragraph | Expand to name each case; add explicit coaching output instruction |
| 13 | Core Principles | Section 6 Rule P1 | Replace shorthand; add naming instruction |

**Token impact:** These are instruction changes within existing prompt blocks —
no new sections added. Net token change is minimal (slight increase due to spelling
out the three names where a shorthand appeared). All changes are contained within
files already included in context at runtime.

**Testing:** After implementation, verify that coaching output never contains the
phrase "the three principles," "the three basic principles," or "the basics" as a
standalone collective. Every reference should name at least one of: relaxation,
forwardness, trust in the hand / seeking contact / pleasant contact.

---

*March 2026. Prompt-layer changes only. No Firestore, Cloud Function, or frontend
changes required.*
