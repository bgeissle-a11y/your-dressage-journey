# YDJ Event Preparation Guardrails
## Competition & Show Preparation Philosophy Reference
### For AI Prompt Context — February 2026

---

## Purpose

This document provides the AI with the platform founder's authoritative rules and philosophy for dressage event preparation. It prevents the AI from generating advice that is technically incorrect for dressage (e.g., using showjumping terminology), unrealistic about preparation timelines, or counterproductive to horse and rider performance at competition.

**Companion documents:**
- `YDJ_Level_Progression_Guardrails.md` — competition level selection rules
- `YDJ_Freestyle_Guardrails.md` — freestyle-specific rules and eligibility
- `YDJ_Core_Dressage_Principles.md` — training philosophy underlying all preparation guidance

**This document should be included in the prompt context for:**
- Event Planner (all calls)
- Multi-Voice Coaching (when competition preparation is a stated goal)
- Grand Prix Thinking Layer 2 (when event goals are mentioned)

---

## 1. Language Standards: Dressage-Specific Terminology

### 1.1 Prohibited Terms
The AI must never use the following terminology, which belongs to other equestrian disciplines and is incorrect in dressage contexts:

| Prohibited Term | Correct Dressage Term |
|---|---|
| "Course walk" | "Test review," "arena walk," "familiarization with the test," or "reviewing the test pattern" |
| "Course" | "Test," "test pattern," or "dressage test" |
| "Fences" or "jumps" | (Not applicable to dressage — omit entirely) |
| "Combination" (jumping sense) | (Not applicable — use "movement combination" or name the specific movements) |

**AI Guardrail Rule:** Before finalizing any Event Planner output, verify that no showjumping or eventing terminology has been used. The dressage community will immediately notice and lose confidence in the platform's credibility.

### 1.2 Preferred Dressage Vocabulary
Use precise dressage terminology consistently:
- "School" or "ride" a movement (not "practice a jump")
- "Warm-up arena" or "warm-up ring" (not "schooling area")  
- "Test pattern" or "test movements" (not "course")
- "Salute" (not "halt")
- "The judge at C," "the judge's booth," or "judging booth" (not "judge's box" which connotes showjumping)
- "Familiarize with the arena" or "hack around the venue" (not "course walk")

---

## 2. Test Ride Management: The Anticipation Risk

### 2.1 The Core Problem
Horses are pattern-learners. When a test is ridden repeatedly in sequence — especially in the same arena — the horse begins to anticipate movements and executes them before being asked. This creates a horse that is "behind the rider's leg" mentally: reactive to place and pattern rather than responsive to aids. The problem tends to surface at competition exactly when precision matters most.

**Signs a horse is beginning to anticipate:**
- Offers the next movement before the aid is given
- Loses relaxation or "gets tense" at certain letters where transitions occur repeatedly
- Becomes reluctant to work in one area of the arena (especially C/centerline where tests often begin and end)
- Starts to rush or hollow through a movement as if trying to "get it over with"

### 2.2 The Three-Ride Rule

**The AI must not recommend riding through a test in sequence more than three times total in the preparation period leading up to an event.** This three-ride limit is cumulative across all contexts:
- At home in the rider's own arena
- At a schooling show
- At an away visit to another venue specifically to ride the test

**AI Guardrail Rule:** Never suggest a preparation plan that includes more than 3 full sequential test rides before the event. If a preparation plan would naturally include more, substitute targeted movement work instead (see Section 2.3).

### 2.3 What to Do Instead: Targeted Movement Schooling

The AI should actively promote schooling difficult or problematic portions of the test rather than running through the whole test. Key principles:

- **School movements, not sequences.** Work on the half-pass without riding the preceding movements. Practice the free walk without doing the full medium walk approach.
- **Vary location within the arena.** If the test calls for a transition at K, school that transition at F or H as well. Vary the starting and ending points.
- **Mix in counter-order work.** Ride movements in reverse order or skip around. The horse should respond to aids, not locations.
- **Isolate problem areas.** If extended trot is the weak point, spend a full session on just the trot work — entries, quality, transitions — without the context of the full test.

**AI Application:** When a rider's debrief data or stated concerns identify a challenging movement or section, the AI should prescribe targeted schooling of that segment specifically, not additional full test rides.

### 2.4 Schooling Shows: Appropriate Role and Realistic Availability
Schooling shows serve a valuable purpose — exposure to a show environment with lower stakes. However:

- **Schooling shows are not widely available in all regions** and should not be presented as a given or a primary preparation strategy. Many riders will have limited or no access to them.
- **Do not emphasize schooling shows as a required preparation step.** Treat them as a valuable option when available, not an expectation.
- **When schooling show attendance is mentioned or planned**, it counts toward the three-ride limit if the rider intends to ride through the test in sequence.
- A schooling show is most valuable for environmental exposure (new arena, other horses, judge's booth, PA system, etc.) — this value exists even if the rider doesn't ride the full test in sequence.

**Preferred framing:** "If a schooling show is available and accessible before your event, it can be a great opportunity for environmental exposure. If not, the preparation strategies below will serve you equally well."

---

## 3. Dressage Scoring System

### 3.1 The Official Scoring Scale

Each movement in a dressage test is scored on the following official scale. The AI must use these precise definitions — not approximations or invented language — when discussing scores with riders.

| Score | Performance Level |
|---|---|
| 10 | Excellent |
| 9 | Very good |
| 8 | Good |
| 7 | Fairly good |
| 6 | Satisfactory |
| 5 | Marginal |
| 4 | Insufficient |
| 3 | Fairly bad |
| 2 | Bad |
| 1 | Very bad |
| 0 | Not performed |

### 3.2 How Test Scores Are Calculated

Each movement score contributes to a total point sum for the test. That sum is expressed as a percentage of the total possible points for that test. **Some movements carry a coefficient of 2**, meaning they are worth double — these are typically the movements the test designers consider most critical to the level. The AI should be aware that coefficient movements have an outsized impact on the final score in both directions.

**The 65% threshold:** A score of 65% or higher is generally considered sufficient to indicate readiness to move up a level. Many riders and trainers use 65% as a meaningful benchmark, though some aim for higher consistency before advancing.

### 3.3 Coaching Implications: How the AI Should Use Scoring

**Encourage aiming for 8s in areas of competence.**
When a rider's debrief data or self-assessment indicates they are genuinely strong at a particular movement, the AI should encourage them to aim for an 8 ("Good") rather than being satisfied with 7s. A 7 is "Fairly good" — respectable but not the ceiling for a well-schooled movement. Riders who consistently execute a movement well in training should be coached to expect and ride for 8s in that movement at competition.

**Normalize the impact of single movement errors.**
One poor score on a single movement is unlikely to significantly damage an otherwise solid test — and the AI should say so explicitly when relevant. A rough illustration: in a test with approximately 24 scored items, 23 scores of 7 and one score of 3 still yields roughly 68% — a strong result by any standard. The AI should use this framing to reduce catastrophizing around mistakes and help riders understand that recovery and consistency across the whole test matters more than any single movement.

**Important nuance:** The impact of a single low score does vary depending on whether that movement carries a coefficient. A coefficient-2 movement scored 3 has twice the negative impact of a non-coefficient movement scored 3. The AI should not alarm riders about this unnecessarily, but should accurately reflect it when discussing specific movements that carry coefficients.

**Do not conflate "satisfactory" with "good enough."**
A 6 ("Satisfactory") should be treated as a signal that the movement needs attention, not as an acceptable steady state. The AI should gently reframe a pattern of 6s as a preparation opportunity — not a crisis, but a clear target for schooling focus.

**When discussing scores from past tests:**
- A pattern of 7s across a test = solid, consistent work; focus on moving specific competent movements to 8
- A cluster of 5s or 6s in one section = that section is the preparation priority
- Isolated 3s or 4s = identify whether this is a training gap, an anticipation issue, or a one-time error; address accordingly
- A 0 = the movement was not performed; this is a significant score and the AI should treat it as a distinct category requiring specific preparation attention (understanding the movement requirements, not just executing the movement)

### 3.4 AI Guardrail Rules for Scoring

1. **Always use the official scale language** — "Good" for an 8, "Fairly good" for a 7, etc. Do not invent synonyms or paraphrase the official definitions
2. **Never describe a 6 as a good score** — it is "Satisfactory," which in dressage means there is clear room for improvement
3. **Encourage 8s in strong movements** — a rider who scores consistent 7s on shoulder-in should be coached to ride for 8
4. **Normalize single-movement errors** — one poor score rarely tanks a test; frame this explicitly when riders express anxiety about making mistakes
5. **Flag coefficient movements** when relevant — a score on a coefficient-2 movement carries double weight
6. **Use 65% as the level-readiness benchmark** — not lower

---

## 4. Arena Familiarity and Test Accuracy

### 4.1 The Geometry Problem for Newer Competitors
Riders new to showing often underestimate how much accuracy contributes to scores. Many arrive at their first competitions having schooled movements well but having never thought carefully about:

- **Exact letter placement** — Where A, K, E, H, C, M, B, F are and why it matters that transitions and movements happen precisely at those letters
- **Arena dimensions** — Standard arenas are 20m x 60m (large) or 20m x 40m (small). Many home arenas are not standard size, which affects geometry
- **Diagonal accuracy** — Across-the-diagonal movements should genuinely track from letter to letter
- **Circle geometry** — See Section 3.3 for correct reference geometry
- **Corner depth** — Corners should be ridden with appropriate bend, not cut or over-ridden

### 4.2 Correct Circle Geometry Reference

**The AI must use these correct reference points.** Circle geometry is commonly misunderstood — even by experienced riders — and incorrect geometry generates low scores and judge comments about "loss of shape."

**Standard large arena: 20m x 60m**

Letter positions along the long side (measured from A):
- K/F: 6m from A
- E/B: 30m from A (true midpoint of the long sides)
- H/M: 6m from C (54m from A)
- X: center of the arena, 30m from A and 10m from each long side

**20m circles (radius = 10m):**

| Circle location | Center point | Touches the track at |
|---|---|---|
| At A | 10m from A on centerline | A on the short side; 10m from A on each long side (4m past K toward V, and 4m past F toward P) |
| At C | 10m from C on centerline | C on the short side; 10m from C on each long side (4m past H and 4m past M toward E/B) |
| At B or E (centered at X) | X (center of arena) | B and E on the long sides; 10m from X in each direction on the centerline (20m from A and 40m from A) |

*Key clarification: a 20m circle at A or C does NOT touch K, F, H, or M — it passes 4m beyond those letters toward the center of the arena.*

**10m circles (radius = 5m):**

A 10m circle at B: center is 5m from B toward the centerline. The circle touches B on the track and touches the centerline at X. It extends 5m in each direction along the arena length from B.

A 10m circle at E: mirror image — touches E on the track and the centerline at X.

**The key reference point for 10m circles from the long side:** the other contact is the centerline. For circles at B and E, that centerline contact is X itself.

**8m voltes (radius = 4m):**

An 8m volte at B: center is 4m from B toward the centerline. The volte touches B on the track and reaches to 4m from the centerline — stopping 2m short of the centerline. It does not touch the centerline.

An 8m volte at E: mirror image.

*The 2m gap between an 8m volte and the centerline is a useful calibration point for riders — if you are touching the centerline, your volte is too large.*

### 4.3 Three-Loop Serpentine Geometry Reference

A three-loop serpentine in the large arena (20x60m) divides the arena into three equal 20m sections. Each loop is a 20m-diameter half-circle. The key geometry:

**Centerline crossings:** at 20m from A and at 40m from A. The horse crosses the centerline *straight* (perpendicular to the centerline) at these two points. This is a common error — riders drift rather than crossing cleanly.

**Where each loop touches the long side:**
- Loop 1 (from A): touches the long side at the 10m mark — between K/F and B/E, not at a letter
- Loop 2 (middle loop): touches the long side at the 30m mark — exactly at B (or E, depending on direction)
- Loop 3 (to C): touches the long side at the 50m mark — between B/E and H/M, not at a letter

**Direction:** The serpentine begins by leaving the centerline toward the side matching the direction of travel (tracking left → first loop goes left). The first and third loops curve to the same side; the middle loop curves to the opposite side.

**The counter-canter moment:** At the higher levels where serpentines are ridden in canter without simple changes, the horse will be in counter-canter for a portion of each loop crossing. The geometry must remain accurate — the arc does not flatten to reduce counter-canter.

**Common serpentine errors the AI should recognize in debrief data:**
- Loops of unequal size (first loop too large, last loop compressed)
- Drifting across the centerline instead of clean perpendicular crossing
- Losing rhythm or straightness at the centerline crossing
- Second loop not reaching B or E (undershooting the long side)

**20m x 40m small arena:** A three-loop serpentine is not typically ridden in a small arena at competition, as the loops would only be ~13m wide. If referenced in a debrief, it is likely schooling work.

### 4.4 AI Application for Newer Competitors
When a rider's profile or debrief data indicates they are:
- Preparing for their first or second competition
- Moving up to a new level for the first time
- Returning to competition after a long absence
- Regularly mentioning accuracy, geometry, or letter placement as a concern

**The AI should include in its preparation guidance:**
- A recommendation to learn the arena letters and their placement (both 20x60 and 20x40 if applicable to their tests)
- Encouragement to practice geometry at home with cones, poles, or ground markers at the correct measurements
- An explanation that accuracy and geometry affect collective marks (Gaits, Impulsion, Submission, Rider) in addition to individual movement scores
- The specific suggestion to walk the actual competition arena on foot before their test time if allowed, to visualize the geometry and movement execution in that space

---

## 5. Pre-Competition Timeline and Environment

### 5.1 Venue Familiarization
Unlike showjumping where competitors "walk the course" to plan striding, dressage riders familiarize themselves with:
- Arena footing and size
- Judge's booth position and visual distractions
- Warm-up ring access and traffic patterns
- Stabling proximity to arenas
- General environment (loudspeakers, flower boxes, flags, spectator areas)

**AI Application:** Preparation plans should include "walk the arena and venue on foot before your ride time" — not "course walk." Encourage mental rehearsal of the test patterns in the actual space.

### 5.2 Warm-Up Arena Etiquette: Full Protocol Reference

The warm-up ring is one of the highest-anxiety elements of a competition for many adult amateurs. Knowing and following the conventions removes cognitive load, reduces conflict, and allows the rider to focus on their horse. The AI should present these as practical, learnable rules — not an intimidating social minefield.

---

#### 5.2.1 The Foundational Rule: Left to Left

The universal warm-up passing convention in dressage is **left to left** — when two riders are approaching each other from opposite directions, each passes with their left shoulder toward the other (each rider moves to their right). This applies regardless of which rein either rider is currently working on.

**Practical implications:**
- When tracking left (counterclockwise), you are on the rail in head-on encounters and effectively have right of way
- When tracking right (clockwise), you move off the rail to the inside when meeting a rider coming toward you on the rail
- When working on the centerline, diagonal, or across the arena, you bear responsibility for anticipating and yielding to riders on the rail
- In a crowded ring, default to tracking left when in doubt — it places you in the conventional flow

---

#### 5.2.2 Right of Way by Gait

When riders are traveling in the same general direction but at different gaits, the conventional hierarchy is:

**Canter > trot > walk**

A horse cantering has right of way over a horse trotting, which has right of way over a horse walking. The slower rider should move to the inside (off the rail) to allow the faster gait to pass on the outside.

**Practical implications:**
- If you are walking on the rail and hear or see a canter approaching from behind, move inside before they reach you — do not wait for them to navigate around you
- If you are trotting and need to walk, briefly move off the rail before making the downward transition, so you are not abruptly slowing directly in front of a trotting or cantering horse
- If you are cantering and approaching a slower horse from behind, it is courteous to give a brief verbal call — **"heads up"** or **"rail please"** are the standard conventions

---

#### 5.2.3 Entering and Exiting the Warm-Up Ring

**Entering:**
- Wait for a gap in traffic before entering — do not walk straight onto the rail from the gate
- Enter at a walk and merge smoothly into the flow
- Calling "door" when entering is generally not necessary in a standard warm-up ring. It can be appropriate in close or tight quarters, or if there is a blind spot at the entry point where incoming horses would not be visible to those already in the ring
- Some venues have a designated entry/exit gate; if so, be alert to horses exiting as you enter

**Exiting:**
- Move off the rail and toward the gate/exit before halting or stopping
- Do not halt on the rail to speak with a trainer, adjust equipment, or wait — this creates a hazard
- If you need to stop suddenly (equipment issue, horse problem), move to the center of the ring or the least-trafficked area as quickly as safely possible

---

#### 5.2.4 Halting and Resting

- **Never halt on the rail.** If you need to stand still, move to the center of the ring or a corner away from traffic.
- Brief walk breaks should also be taken off the rail when the ring is busy, or well to the inside so cantering horses have room to pass
- If your trainer is giving you instruction while you are stationary, position yourself in the center or along the short end away from the main traffic flow

---

#### 5.2.5 Centerline Use

- The centerline is shared space — riders may use it traveling in both directions, making it a place of particular collision risk
- Apply the left-to-left rule on the centerline just as on the rail: if you are tracking left and meet someone tracking right on the centerline, you hold your line and they yield to you
- Avoid lingering or making abrupt direction changes on the centerline without looking both ways first
- If practicing a centerline entry (as you might before a test), do so during a less congested moment and be prepared to abort if another horse appears

---

#### 5.2.6 Schooling Movements in the Warm-Up Ring

The warm-up ring is not an individual training arena — it is a shared space with an implicit social contract. Certain considerations apply:

- **Advanced movements require extra spatial awareness.** Lateral work (leg yield, shoulder-in, half-pass) expands your horse's track width unpredictably. Check that you have adequate clearance before beginning, especially if tracking across the arena
- **Rein-backs and abrupt halts** are particularly hazardous in a busy ring — only execute these well off the rail with clear space behind you
- **Kicking out horses and spooky or green horses** — if your horse is known to kick, tie a red ribbon in the tail as a courtesy warning to other riders. If your horse spooks at other horses in close proximity, stay to the inside and keep distance
- **Extended gaits** that increase speed significantly: alert to others when making large extensions on the long side, particularly in canter — the increase in ground coverage can catch other riders by surprise
- **Circles and loops** in a busy ring: circles pull you across the path of rail traffic. Make them in the center or short ends of the ring where possible, or during a clear moment. Communicate with eye contact and predictable lines

---

#### 5.2.7 Trainer/Coach Positioning

- Trainers and coaches almost always stand **outside the arena on the rail** — they are not in the ring with the riders
- The rider navigates toward the rail to receive instruction and moves back into traffic flow afterward
- Brief pauses near the rail for trainer feedback should happen between horses when possible, not blocking another horse's path
- Conversations with coaches should not cause the rider to halt on the rail (see Section 4.2.4) — bring the horse down to walk and drift toward the rail, receive the instruction, then move off again

---

#### 5.2.8 General Courtesy and Conflict Avoidance

- **Be predictable.** Use consistent track lines and make direction changes gradually so other riders can anticipate your path
- **Make eye contact** with approaching riders when paths are uncertain — a brief nod can communicate who is yielding
- **Verbal communication** is acceptable and expected in a busy warm-up ring. Brief calls ("inside," "rail," "heads up") are courteous and effective
- **Assume positive intent.** Warm-up collisions and near-misses are almost always the result of inexperience or distraction, not malice. Do not escalate; move on
- If another rider makes an error in etiquette that affects you, the appropriate response in the moment is to manage your horse safely — not to educate the other rider in the ring

**AI Application:** For riders who identify warm-up anxiety as a concern, frame these conventions explicitly as *skills to learn and practice* rather than social rules that can be violated. Knowing these rules is part of competition preparation, just like knowing the test.

---

### 5.3 Warm-Up Strategy
Warm-up guidance should always:
- Be tailored to what the rider's debrief data shows about their horse's tendencies (spooky, sluggish, over-fresh, anxious, stiff, etc.)
- Include an estimate of appropriate warm-up length based on known patterns
- Provide a "what if" scenario (what if the horse is more tense/flat/fresh than expected)
- Acknowledge that warm-up rings at competitions are chaotic and include a strategy for managing that (left-to-left protocol, right of way, avoiding confrontation, adapting if planned work isn't possible)
- **Not** recommend schooling through the full test in the warm-up

---

## 6. Summary: Event Preparation Guardrail Rules

Quick reference for AI compliance:

1. **Never use "course walk"** — use "arena walk," "venue walk," or "test review"
2. **Never recommend more than 3 full sequential test rides** before an event (cumulative across all venues)
3. **Actively promote targeted movement schooling** as the primary preparation tool, not full test repetition
4. **Vary movement practice locations** within the arena to prevent pattern anticipation
5. **Present schooling shows as optional, not required** — acknowledge limited availability
6. **Schooling show test rides count toward the 3-ride limit**
7. **Include arena letter and geometry guidance** for newer competitors or those where accuracy is a concern — use correct geometry from Section 4.2
8. **Use precision dressage language** throughout all event preparation content
9. **Use correct circle geometry** — a 20m circle at A or C does NOT touch K, F, H, or M; consult Section 4.2 for all reference geometry
10. **Include warm-up arena etiquette** in event day strategy for newer competitors or those with warm-up anxiety — covering left-to-left passing, gait right of way, halting off the rail, centerline use, and general courtesy (see Section 5.2)
11. **Use the official scoring scale language** — 10=Excellent through 0=Not performed; never describe a 6 as a good score
12. **Encourage 8s in movements where the rider is genuinely competent** — a 7 is "Fairly good," not the ceiling
13. **Normalize single-movement errors** — one low score rarely tanks a test; use this framing explicitly when riders express anxiety about mistakes
14. **Flag coefficient movements** when discussing score impact — they carry double weight in the final percentage
15. **Use 65% as the level-readiness benchmark**

---

*Companion documents: YDJ_Prompt_Additions_Event_Preparation.md, YDJ_Level_Progression_Guardrails.md, YDJ_Freestyle_Guardrails.md, YDJ_Core_Dressage_Principles.md*
*Version 1.1 — February 2026*
