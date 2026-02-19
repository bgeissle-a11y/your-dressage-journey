# YDJ Level Progression Guardrails
## Dressage Training Timeline & Transition Reference
### For AI Prompt Context — February 2026

---

## Purpose

This document provides the AI with realistic constraints for dressage level progression timelines, critical transition points, and explicit guardrail rules. It prevents the AI from suggesting unrealistic advancement timelines or skipping significant developmental stages when generating Training Trajectory Paths, Multi-Voice Coaching analysis, Event Planner recommendations, or any output that references level progression.

**This document should be included in the prompt context for:**
- Grand Prix Thinking Layer 2 (all 4 calls)
- Multi-Voice Coaching (all 4 voices)
- Event Planner (all 4 calls)
- Any output that references future level goals, competition planning, or training timelines

**Companion document:** For freestyle-specific rules (compulsory elements, forbidden movements, eligibility, scoring), see **YDJ_Freestyle_Guardrails.md**. That document should be included in prompt context whenever a rider's goals or event preparation involves freestyle competition.

---

## 1. Realistic Minimum Timelines Between Levels

These timelines assume an adult amateur rider training 3–5 days per week on a capable horse with regular professional instruction. Timelines are for achieving *competence* at the new level (able to ride through a test with reasonable quality), not merely introducing individual movements.

Timelines should be adjusted upward for riders who:
- Train fewer than 3 days per week
- Are developing a young or green horse simultaneously
- Are working without regular professional instruction
- Are returning from injury, layoff, or setback
- Have a horse with physical limitations or soundness concerns

Timelines should be adjusted slightly (but cautiously) for riders who:
- Train 5–6 days per week with high-quality instruction
- Are riding a well-schooled horse that already knows the work
- Have previous experience at the level on a different horse

### USDF Levels (National)

| Transition | Typical Timeline | Key Factor |
|---|---|---|
| Introductory → Training Level | 6–12 months | Developing consistent rhythm, contact acceptance |
| Training → First Level | 6–12 months | Building thrust, introducing lengthenings and leg yield |
| First → Second Level | 9–18 months | **Collection introduced** — shoulder-in, travers, simple changes; fundamental shift in balance |
| Second → Third Level | 12–18 months | **Flying changes introduced** — entirely new skill; self-carriage and extended gaits |
| Third → Fourth Level | 12–24 months | Tempi changes (4s, 3s), working pirouettes — significant precision demands |

### FEI Levels (International)

| Transition | Typical Timeline | Key Factor |
|---|---|---|
| Fourth Level → Prix St. Georges | 12–24 months | **Major jump to FEI** — half pirouettes in canter, 4-tempis, 3-tempis; substantially higher precision, collection, and overall demand |
| PSG → Intermediate I | 12–18 months | Full pirouettes (360°), 2-tempi changes, zigzag patterns |
| **Inter I → Intermediate II** | **18–36 months** | **THE MOST SIGNIFICANT SINGLE TRANSITION — see Critical Transitions below** |
| Inter II → Grand Prix | 12–24 months | Refinement and extension of P&P work, longer tempi sequences, canter zigzag |
| Grand Prix → Grand Prix Special | 6–12 months (refinement) | More demanding piaffe/passage transitions, higher technical precision |

### Full Journey Context

| Starting Level → Goal | Realistic Range |
|---|---|
| Training Level → Second Level | 1.5–3 years |
| Training Level → Fourth Level | 3–6 years |
| Training Level → PSG | 4–8 years |
| Training Level → Grand Prix | 8–15+ years |
| Second Level → PSG | 3–5 years |
| Second Level → Grand Prix | 6–12+ years |
| PSG → Grand Prix | 3–6 years |
| **Inter I → Grand Prix** | **2.5–5 years** (Inter II is a distinct, mandatory stage) |

---

## 2. Critical Transition Points ("The Big Jumps")

These are transitions where the skill gap is disproportionately large because they introduce fundamentally new categories of movement or demand, not merely harder versions of existing skills. The AI must treat these transitions with extra care in timeline projections.

### CRITICAL TRANSITION 1: First → Second Level
**What changes:** True collection is introduced for the first time. Shoulder-in, travers, simple changes, and rein-back all require the horse to shift weight to the hindquarters in a way not previously demanded.

**Why it's significant:** Everything before Second Level is about forward movement with basic balance. Second Level asks the horse to *carry differently*. This is a gymnastic development that cannot be rushed — it requires the horse to build carrying strength in the hindquarters over months of systematic work.

**Common mistake the AI should avoid:** Suggesting a rider can move from First to Second Level quickly because "they already have good balance." Balance at First Level is fundamentally different from the collected balance at Second Level.

---

### CRITICAL TRANSITION 2: Second → Third Level  
**What changes:** Flying lead changes are introduced — a completely new skill that is not an extension of simple changes. Extended gaits at Third Level require a level of throughness and self-carriage not previously tested.

**Why it's significant:** The flying change is the first movement where the horse must reorganize its entire body (including the sequence of legs in the air) in response to an aid delivered in a fraction of a stride. This is a coordination and timing challenge unlike anything at lower levels. Some horses find changes natural; others require months of patient preparation through counter-canter and simple change work.

**Common mistake the AI should avoid:** Assuming that because a horse does clean simple changes, flying changes will come quickly. The two skills are mechanically different.

---

### CRITICAL TRANSITION 3: Fourth Level → Prix St. Georges
**What changes:** This is the USDF-to-FEI bridge. Half pirouettes in canter, tempi changes in sequence (4s and 3s), and the overall precision/collection demands jump significantly. The test is longer, the movements are closer together, and there is less room for recovery between difficult elements.

**Why it's significant:** FEI-level dressage requires a fundamentally higher degree of collection, precision, and stamina from both horse and rider. The horse must sustain maximum collection for 5+ minutes. The rider's aids must be nearly invisible. Many capable Fourth Level combinations spend 1–2 years consolidating the quality needed for a competitive PSG debut.

**Common mistake the AI should avoid:** Treating PSG as "just the next level after Fourth." The gap between national and international levels is one of the biggest in the entire progression.

---

### CRITICAL TRANSITION 4: Inter I → Intermediate II ⚠️ MOST SIGNIFICANT
**What changes:** Passage and piaffe are introduced for the FIRST TIME. One-tempi changes (every single stride) are also introduced. These are entirely new movement categories.

**Why it's significant — PASSAGE AND PIAFFE:**
- Passage and piaffe are NOT harder versions of collected trot. They are biomechanically distinct gaits that require the horse to develop an entirely different pattern of muscular engagement, suspension, and carrying power.
- **Piaffe** requires the horse to trot essentially on the spot with maximum flexion of the joints and maximum engagement of the hindquarters. The horse must develop the strength to carry 60%+ of its weight on the hindquarters in a rhythmic, elevated trot with minimal forward movement. This strength takes months to years to develop through systematic gymnastic work (half-steps, transitions, collected work).
- **Passage** requires the horse to produce a highly elevated, cadenced trot with significant suspension (time in the air). The horse must develop the elastic strength to push off powerfully from each hind leg while maintaining a slow, measured rhythm.
- **The passage-piaffe transitions** — moving between these two gaits smoothly — are among the most difficult elements in all of dressage. They require precise coordination, immense strength, and a high degree of mutual understanding between horse and rider.
- Most horses need 1–2 years of systematic preparation (half-steps, transitions in-hand, work on the longe) before piaffe and passage can be ridden under saddle with any quality. Some horses never fully develop these gaits.

**Why it's significant — ONE-TEMPI CHANGES:**
- Going from 2-tempi changes (every other stride) to 1-tempi changes (every single stride) is not a small increment. The horse must change leads every single stride while remaining straight, uphill, and rhythmic through 11+ changes. This requires a level of balance, responsiveness, and straightness well beyond what 2-tempis demand.

**Common mistakes the AI MUST avoid:**
- ❌ Never suggest a rider at Inter I is "close to Grand Prix" or could be GP-ready within months
- ❌ Never suggest passage/piaffe work for a rider whose current level is Inter I or below (unless referring to foundational half-steps as long-term preparation)
- ❌ Never skip Inter II when discussing the path from Inter I to Grand Prix
- ❌ Never frame Inter II as a minor stepping stone — it is a distinct, demanding level that tests the introduction of the most difficult movements in dressage

---

### CRITICAL TRANSITION 5: Inter II → Grand Prix
**What changes:** The movements are the same categories as Inter II, but the demands increase substantially:
- Piaffe goes from 8–10 steps to 12–15 steps, performed 3 separate times (not once)
- Passage sections are extensive, woven throughout the test
- Passage-piaffe transitions are tested multiple times and must be seamless
- One-tempi changes go from 11 to 15+
- Walk-to-passage transitions are introduced (extremely difficult)
- Canter zigzag with 5 half-passes (not just half-passes with single changes)

**Why it's significant:** Grand Prix demands that every movement be not just present but *confirmed* — performed with power, ease, and consistency. The horse must sustain peak collection and athleticism for a 6:30 test. This is the marathon of dressage tests.

**Common mistake the AI should avoid:** Treating the Inter II → GP transition as "just more of the same." The quantitative increase (more piaffe steps, more changes, more passage) requires a qualitative leap in the horse's strength, stamina, and the rider's ability to manage energy across a long, demanding test.

---

## 3. Movement Introduction Reference

This table clarifies at which level key movements are **first introduced in competition**. The AI should never recommend competition at a level if the horse and rider haven't confirmed the prerequisite movements.

| Movement | First Appears | Prerequisites |
|---|---|---|
| Leg Yield | First Level | Consistent contact and forward movement |
| Shoulder-In | Second Level | Established collection concept |
| Travers / Renvers | Second Level | Shoulder-in confirmed |
| Simple Changes | Second Level | Balanced canter-walk-canter transitions |
| Flying Changes (single) | Third Level | Clean, balanced simple changes |
| Half-Pass (trot) | Third Level | Confirmed shoulder-in and travers |
| Tempi Changes (4s, 3s) | Fourth Level / PSG | Reliable single changes on straight lines |
| Half Pirouettes (canter) | PSG | Strong collected canter, working turn on haunches |
| Tempi Changes (2s) | Intermediate I | Confirmed 3-tempi changes |
| Full Pirouettes (360°) | Intermediate I | Quality half pirouettes |
| **Piaffe** | **Intermediate II** | **Months–years of half-step preparation, strong collection** |
| **Passage** | **Intermediate II** | **Months–years of systematic development, elastic power** |
| **One-Tempi Changes** | **Intermediate II** | **Confirmed, straight 2-tempi changes** |
| Passage-Piaffe Transitions | Intermediate II / GP | Confirmed piaffe and passage individually |
| Walk-Passage Transitions | Grand Prix | Confirmed passage and collected walk |
| Extended One-Tempis (15+) | Grand Prix | Confirmed shorter sequences |
| Canter Zigzag (5 half-passes) | Grand Prix | Half-pass with changes confirmed |

---

## 4. Horse Development Considerations

The AI should factor in horse-specific variables when projecting timelines:

**Horse Age & Physical Maturity:**
- Horses are not fully physically mature until age 6–7. FEI minimum age is 7 for PSG/Inter I, 8 for Inter II and above.
- A horse that starts FEI work at age 7 may need more time to develop the carrying strength for upper-level work than a horse starting at age 10.
- Horses over 15 may have physical limitations that affect the timeline for learning demanding new movements like piaffe and passage.

**Talent vs. Training:**
- Some horses have natural aptitude for certain movements (e.g., natural passage tendency, natural change ability). This can shorten timelines slightly for those specific movements but does NOT eliminate the need for systematic gymnastic development.
- A horse with natural talent for passage still needs months of strengthening work before passage can be performed consistently and correctly under saddle.

**Soundness:**
- Any soundness issue (even mild) should trigger conservative timeline adjustments. Pushing a horse with a physical limitation through demanding upper-level work risks injury and setback.
- The AI should flag when debriefs mention soundness concerns alongside ambitious timeline goals.

---

## 5. Explicit AI Guardrail Rules

### TIMELINE RULES
1. **Never suggest moving up more than one competition level in a single season** (a competition season is approximately April–November in most US regions).
2. **When a rider's current level and goal level span 3+ levels, always frame the timeline in years, not months.**
3. **When projecting timelines, always include a range** (e.g., "12–24 months") rather than a single number. The range should account for realistic setbacks, plateaus, and consolidation time.
4. **Always include consolidation time** at each level before projecting advancement. Competing successfully at a level once does not mean the rider is ready to move up.

### PASSAGE & PIAFFE RULES
5. **Never include passage or piaffe in training recommendations for riders at Inter I or below**, unless specifically referencing foundational half-steps or in-hand work as long-term preparation. Frame half-steps as "building blocks for future collected work" — not as "piaffe preparation" for riders below Fourth Level.
6. **Never suggest passage-piaffe transitions are achievable within the same season they are introduced.** These transitions typically take 6–12+ months to develop from initial introduction to competition readiness.
7. **When discussing passage and piaffe, always acknowledge these are movements that develop over months to years**, not weeks. Phrases like "ready for P&P work by summer" are almost always unrealistic.

### LEVEL-SKIPPING RULES
8. **Never skip Intermediate II when discussing the path from Inter I to Grand Prix.** Inter II is a distinct, critical level — not an optional stepping stone.
9. **Never suggest a rider could compete at Grand Prix without confirmed passage and piaffe** at Inter II level first.
10. **Never suggest jumping from any USDF level directly to an FEI level above PSG.** The progression is: Fourth Level → PSG → Inter I → Inter II → GP. Each step matters.

### FRAMING RULES
11. **When a rider expresses ambitious timeline goals, validate the ambition while providing realistic context.** Say "That's a wonderful goal — here's what the realistic path looks like" rather than either crushing the dream or enabling unrealistic expectations.
12. **Frame all timeline projections as dependent on multiple factors:** training frequency, horse's physical development, soundness, quality of instruction, and the rider's own physical and mental development. No timeline is guaranteed.
13. **Use the three trajectory paths to show different paces** — The Steady Builder path should show the most conservative (and often most correct) timeline. The Ambitious Competitor path can show a faster pace but must still respect the critical transition minimums. The Curious Explorer path may not focus on level advancement at all.

### COMPETITION PLANNING RULES
14. **Never recommend entering a competition at a level the rider hasn't confirmed in training.** "Confirmed" means the rider can ride through the full test at home with reasonable quality, not just perform individual movements.
15. **Schooling shows should precede rated shows** at any new level. Always recommend 1–2 schooling shows before a rated debut.
16. **When planning competition timelines, always include preparation time:** a minimum of 2–3 months of confirmed work at a level before the first schooling show, and 1–2 successful schooling shows before a rated debut.

### FREESTYLE RULES (see also: YDJ_Freestyle_Guardrails.md)
17. **Never recommend freestyle choreography that includes movements forbidden at the declared level.** A forbidden movement incurs a 4-point deduction from total Technical Execution — a significant penalty. Always verify every movement against the compulsory/forbidden/additionally allowed lists for the declared level.
18. **Never suggest entering a freestyle without a qualifying score.** The 63% minimum in a standard test at the declared level (or higher) from a prior competition is a competition rule, not a guideline.
19. **When a rider expresses freestyle goals, always verify their declared level is appropriate** by checking their debrief data against the compulsory elements. If any compulsory element is inconsistent, recommend either focused preparation or riding one level below.
20. **The USDF recommends riding freestyle one level below schooling level.** Present this as a strategic option — it often yields higher scores through confidence and quality. Do not mandate it, but always mention it.

---

## 6. Phrases to Use and Avoid

### ✅ USE these framings:
- "The transition from Inter I to Inter II is one of the most significant in dressage because it introduces passage and piaffe — entirely new movement categories."
- "At your current training pace, a realistic timeline for [goal] would be approximately [X–Y years]."
- "Before targeting [next level], the priority is confirming consistent quality at [current level]."
- "Half-steps are an excellent long-term foundation that will serve you well when the time comes for collected work at the upper levels."
- "This is a journey that unfolds over seasons and years. Each level develops the strength and understanding needed for the next."
- "The Steady Builder path would suggest [longer timeline], while a more ambitious pace — assuming consistent training and a sound horse — might look like [shorter but still realistic timeline]."

### ❌ AVOID these framings:
- "You could be ready for Grand Prix by [date within 12 months of Inter I]"
- "Passage and piaffe shouldn't be too difficult since you already have strong collected trot"
- "With focused work, you could skip Inter II and go straight to GP elements"
- "A few months of P&P preparation should have you ready"
- "You're close to Grand Prix level" (for any rider below confirmed Inter II)
- "Tempi changes at [1s/2s/3s/4s] and passage-piaffe transitions ready for [show within a few months]" (when the rider hasn't confirmed these individually)

---

*Version 1.0 — February 2026*
*Review annually or when USEF/FEI test requirements change*
