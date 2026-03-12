# YDJ Implementation Brief: Output Length & Rider Reflection
## Adult Learning Principles — Prompt & UI Changes

**Scope:** Two categories of changes
1. **Prompt changes** — edits to `YDJ_AI_Coaching_Voice_Prompts_v3.md`
2. **UI changes** — new React component elements in the Multi-Voice Coaching output

---

## PART 1: PROMPT CHANGES
### File: `YDJ_AI_Coaching_Voice_Prompts_v3.md`

---

### Change 1A — Shared Base Context
**Action:** INSERT after the line ending `...This should feel personally crafted, never generic.`

Add the following block verbatim:

```
CONVERGENCE BEFORE DIVERGENCE:
Before generating any voice response, identify the 1–2 dominant patterns in this rider's data. All four voices must analyze those same dominant patterns — each through its own distinct lens. Do not introduce secondary or additional patterns within individual voices. Four voices examining the same thing from four angles produces insight. Four voices examining four different things produces overwhelm.

ONE OBSERVATION PER VOICE:
Each voice makes one primary observation about the dominant pattern(s), supports it with 2–3 specific references to this rider's actual data (their own words, dates, specific movements, named horses), and draws one concrete implication. The observation should open with the implication — the "so what for this rider this week" — before the evidence. Do not add secondary observations. If you feel the urge to write "also..." — stop. Depth over breadth.

FRONT-LOAD THE "SO WHAT":
Every voice response must open with the specific, rider-relevant implication before presenting evidence. Wrong: "Over the past six sessions, your shoulder-in attempts have shown a pattern of..." Right: "Your shoulder-in is ready to break through — here's what's blocking it."
```

---

### Change 1B — Each Voice: Word Count Instruction
**Action:** In each of the four voice prompts, find the existing word count instruction. Replace as follows.

**Find (Voice 0 — The Classical Master):**
```
Keep responses to 400-600 words. Be comprehensive but purposeful — every observation should connect to a principle.
```
**Replace with:**
```
Keep responses to 300-400 words. One observation, fully developed. Open with the implication for this rider this week. Ground every sentence in their specific data — named horses, their own phrases, specific movements.
```

**Find (Voice 1 — The Empathetic Coach):** Locate the equivalent word count closing line and replace with:
```
Keep responses to 300-400 words. One observation about the rider's psychological or relational pattern, fully developed. Open with what you see in them — the specific inner dynamic — before naming the evidence.
```

**Find (Voice 2 — The Technical Coach):** Locate the equivalent word count closing line and replace with:
```
Keep responses to 300-400 words. One biomechanical or technical pattern, fully developed. Be precise — name the body part, the movement, the moment in the ride. Open with the technical implication before the evidence.
```

**Find (Voice 3 — The Practical Strategist):** Locate the equivalent word count closing line and replace with:
```
Keep responses to 300-400 words. One priority with a clear action pathway, fully developed. Open with the goal-relevant implication before the supporting data.
```

---

### Change 1E — Classical Master Tone Refinement
**Action:** In the Voice 0 — The Classical Master prompt, find the TONE CALIBRATION section. INSERT the following as a new first line of that section, before the existing "Default:" bullet:

```
PITHINESS AS CRAFT:
At your best, you are pithy. A single well-chosen sentence that names a truth the rider will still be turning over a week from now is worth more than a paragraph of analysis. Reach for that sentence in every response — the one line that makes everything else click. Poetic does not mean ornate. It means precise enough to resonate.
```

---
**Reason:** Pilot testing showed per-voice closing questions felt like homework and were skipped. One focused closing section (see Change 2C below) is more effective than four distributed questions.

### Change 1D — Add Closing Actualization Section Instruction
**Action:** Add the following block to the END of the Multi-Voice Coaching output prompt (after all four voice prompt instructions, as a shared generation instruction).

```
CLOSING SECTION — YOUR PRIORITY THIS WEEK (ACTUALIZED):
After generating all four voice responses, generate a closing section titled "Your Priority This Week."

This section has three parts:

1. PRIORITY RESTATEMENT (2–3 sentences):
Restate the priority from the Quick Insights summary — but now as a direct commitment frame addressed to the rider, in second person. Not "you should focus on..." but "This week, your laboratory is..." Make it feel like the coaching team has converged and handed the rider one thing to carry out the door.

2. ACTUALIZATION PROMPT 1 — Strategy:
One specific open-ended question that asks the rider how they will make this priority real in their specific situation. This is not a generic "what's your plan?" question. It must reference something particular from their data — a horse, a movement, a pattern, a context — that makes the strategy question concrete.
Format: Begin with "→"

3. ACTUALIZATION PROMPT 2 — Evidence:
One specific open-ended question that asks how the rider will know this week whether they actually lived the priority — not whether they got the outcome right, but whether they genuinely made it a focus.
Format: Begin with "→"

Both questions must be generated from this rider's specific priority — never templated. The strategy question asks how they'll keep it front of mind. The evidence question asks what success feels like from the inside, not the outside.

Example structure (do not copy verbatim — generate fresh from this rider's data):
---
Your Priority This Week
[Priority restatement — 2–3 sentences]

→ [Strategy question specific to their data]

→ [Evidence question specific to their priority]
---
```

---

## PART 2: UI CHANGES
### Component: Multi-Voice Coaching output display

---

### Change 2A — Orienting Question (before voices render)

**Location:** In the Multi-Voice Coaching output component, immediately after the Quick Insights summary section and before the first voice tab/section renders.

**Add a styled callout block** with the following text:

> *Before reading further: what pattern do you think defined your riding this week? Hold that thought — then see what the coaching team saw.*

**Styling requirements:**
- Use the existing `.prompt-box` pattern (styled collapsible box, consistent with form guidance boxes)
- Label: **"A moment before you read"**
- Text is italic
- No interaction required — this is read-only, not a form field
- Renders collapsed by default on mobile; expanded on desktop

---

### Change 2B — ~~"Coach's Corner" Reflection Box~~ REMOVED
**Reason:** Depends on per-voice closing questions (Change 1C), which have been removed following pilot testing. Distributing reflection prompts across four voices created friction rather than engagement.

---

### Change 2C — Priority Closer (replaces static micro-action prompt)

**Location:** After all four voices have rendered, at the bottom of the Multi-Voice Coaching output.

**Render the AI-generated "Your Priority This Week" closing section** (generated per Change 1D above).

**Styling requirements:**
- Distinct visual treatment from the four voice sections — use the platform's primary warm gold as the accent/border color
- Label: **"Your Priority This Week"** as a styled section header
- Priority restatement text renders as normal body copy (not italic)
- Each `→` actualization prompt renders on its own line, with slight left indent, in italic
- The two prompts should have visible breathing room between them (generous spacing)
- Read-only display — no input fields, no save action
- On mobile: renders full-width, not collapsed

---

## PART 3: QUICK INSIGHTS — ENFORCE EXISTING SPEC

The Quick Insights summary format is already defined in `formatting-guide-for-chunked-outputs.md`. Confirm it is implemented as specified:

- **Top 3 Patterns** — one sentence each, drawn from dominant patterns identified across all voice analysis
- **Your Priority This Week** — single paragraph, one achievable focus, specific to this rider's data
- **This Week's Celebration** — single paragraph, one genuine win

If not yet implemented, implement per that spec before deploying the voice changes in Part 1. Quick Insights is the first thing a rider reads — it is the safety net that ensures even a rider who reads nothing else leaves with one actionable insight.

---

## IMPLEMENTATION ORDER

1. **Quick Insights** (Part 3) — confirm or implement
2. **Prompt changes** (Part 1) — update `YDJ_AI_Coaching_Voice_Prompts_v3.md`
3. **UI changes** (Part 2) — update Multi-Voice Coaching component

Do not deploy Part 2 UI changes without Part 1 prompt changes in place — the Priority closer (2C) depends on the AI generating the closing actualization section (1D).

---

## WHAT NOT TO CHANGE

- The four voice prompt personalities, intellectual lineage, focus areas, tone calibration, and analytical approach sections — leave all of these intact
- The Shared Base Context data-type list and cross-pattern analysis instruction — leave intact
- All other outputs (Journey Map, Grand Prix Thinking, Physical Guidance, etc.) — these changes apply only to the Multi-Voice Coaching output and its prompts
- API call architecture and model selection — no changes
