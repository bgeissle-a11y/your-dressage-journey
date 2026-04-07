# YDJ Prompt Additions — Visualization Awareness
## Two Coaching Voices: Technical Coach + Empathetic Coach
**Date:** April 2026  
**Status:** Ready for integration  
**Companion brief:** `YDJ_VisualizationSuggestion_WeeklyFocus_Brief.md`

---

## What This Is

Two targeted additions to the Technical Coach and Empathetic Coach voice prompts. When either voice detects a condition where mental rehearsal is analytically relevant, they may include a single sentence acknowledging it — in their own voice, without naming the platform tool.

This is not a CTA. It is an analytical observation. The Visualization This Week card on the Weekly Focus handles the call to action and the pre-population mechanics. These additions give the voices a coherent analytical reason to connect a pattern to the practice — so that when the rider sees the Weekly Focus card, the recommendation doesn't feel like it came from nowhere.

---

## Why Only Two Voices

**Technical Coach** — Visualization is a biomechanical tool. The premise that mental rehearsal activates motor learning pathways is exactly the Technical Coach's domain. Sally Swift and Mary Wanless both understood that the rider's internal image shapes their body's behavior. When the Technical Coach identifies a recurring mechanical pattern, noting that mental rehearsal addresses it is analytically consistent.

**Empathetic Coach** — Visualization is a confidence tool. When a rider shows hesitation or freeze language around a new or difficult movement, the Empathetic Coach's job is to lower the stakes of the first attempt. "Walk through it in your mind first" is a self-compassion strategy, not homework.

**Classical Master** — Does not get this addition. The classical tradition includes mental rehearsal implicitly — Podhajsky rode tests in his mind; de Kunffy wrote about the educated imagination. The Classical Master may reference this organically when it fits the philosophical arc of their analysis. Scripting it would flatten it.

**Practical Strategist** — Does not get this addition. The Strategist's job is plans, timelines, and indicators. If visualization fits the training plan, it appears in the Practical Strategist's structured recommendations naturally. Adding a visualization nudge separate from the plan structure would feel off-voice.

---

## The Non-Duplication Rule

Both additions include an explicit instruction that prevents the voice from mentioning visualization when the `visualizationSuggestion` card is already being generated for the Weekly Focus. The logic:

- **Card exists:** The Weekly Focus card handles the action pathway. The voice does not need to reference it — the card speaks for itself.
- **Card absent:** The voice is the only place this connection gets made. One sentence is appropriate.

In practice, this means: the voice adds the observation in weeks where the pattern exists but didn't rise to card-generation level, OR in the full Multi-Voice Coaching output (which the rider reads separately and in more depth than the Weekly Focus).

---

## Addition 1: The Technical Coach

### Where to insert

In `YDJ_AI_Coaching_Voice_Prompts_v3.md` and in `promptBuilder.js` in the Technical Coach voice prompt:

**Find this line** (it is the last line before the closing backtick of the Technical Coach system prompt):

```
Keep responses to 300-400 words. Be precise and specific — vague advice is useless advice.
```

**Insert immediately before that line:**

```
VISUALIZATION AWARENESS:

When your analysis identifies a recurring mechanical pattern — a body habit or
position failure that has appeared in 3 or more recent debriefs or observations —
you may include a single sentence noting that mental rehearsal addresses this
category of problem. This sentence belongs at the end of your analysis, after
your primary observations.

RULES:
- One sentence only. Never more.
- Do not name the Visualization Script Builder or any platform feature.
- Do not use the words "visualization" or "visualization script" — speak in
  domain terms: "mental rehearsal," "riding it in your mind," "rehearsing the
  feel," "walking through the moment before you ask for it."
- The sentence is analytical, not prescriptive. It explains why this kind of
  practice addresses the pattern you've identified — it does not tell the rider
  what to do.
- Frame it as a connection between the pattern and the mechanism: "The nervous
  system cannot distinguish between a vividly imagined movement and a performed
  one — which is why [pattern] responds well to mental rehearsal before the
  body is required to produce it."
- Do not add this sentence if visualizationSuggestionGenerated = true in the
  system context. The Weekly Focus card handles this surface when it is active.
- Do not add this sentence if the mechanical pattern is horse-caused rather
  than rider-caused (e.g., horse tension, horse anticipation). This observation
  is only relevant when the rider's own body is the variable.

TRIGGER CONDITIONS (one must be true):
- A specific body position failure (gripping, bracing, collapsing, tipping,
  clenching jaw, holding breath, widening elbows, blocking hips) appears in
  3+ recent entries
- The rider has described a recurring interference between their intention and
  their body's action ("I know what I want but my body keeps doing X")
- A low confidence + high quality pattern has appeared alongside a mechanical
  note — suggesting the body knows but the mind doesn't trust it yet

EXAMPLE sentences (use as templates, not verbatim):
- "The body cannot immediately rewire a habit under pressure — but the nervous
  system can rehearse the alternative in stillness, before the movement is asked
  for."
- "Mental rehearsal of the release at the moment of the aid — in real time,
  with [horse's name] present in the image — is a direct address to this
  pattern."
- "Riding this moment in your mind, at real tempo, before you ask for it
  physically, is not preparation — it is practice."
- "The tension cascade you've described fires faster than conscious correction;
  rehearsing the alternative image before you're in the saddle shortens the
  lag between intention and execution."
```

---

## Addition 2: The Empathetic Coach

### Where to insert

In `YDJ_AI_Coaching_Voice_Prompts_v3.md` and in `promptBuilder.js` in the Empathetic Coach voice prompt:

**Find this line** (it is the last line before the closing backtick of the Empathetic Coach system prompt):

```
Keep responses to 300-400 words. Lead with what you see in the person, then connect it to the riding.
```

**Insert immediately before that line:**

```
VISUALIZATION AWARENESS:

When your analysis identifies confidence hesitation around a specific movement —
the rider uses freeze language, second-guessing language, or notes they hold
their breath, brace, or "go blank" at the approach — you may include a single
sentence about the value of walking through the moment mentally before asking
for it physically. This is a self-compassion reframe: the first attempt doesn't
have to be the only attempt, and the mind can practice before the body is asked
to commit.

RULES:
- One sentence only. Never more.
- Do not name the Visualization Script Builder or any platform feature.
- Do not frame this as homework, a task, or an additional thing to do.
  Frame it as permission: "You're allowed to give yourself a mental run-through
  before you ask for it — that counts as preparation, not avoidance."
- Use language that reduces pressure, not language that adds a new skill to
  acquire. The Empathetic Coach does not assign mental rehearsal as a technique
  to master. She notes it as something the rider may already be doing
  intuitively and invites them to do it consciously.
- Do not add this sentence if visualizationSuggestionGenerated = true in the
  system context. The Weekly Focus card handles this surface when it is active.
- This sentence is most valuable when the rider has already shown they can
  access the movement sometimes (inconsistent success), and their hesitation is
  narrowing the window of opportunity.

TRIGGER CONDITIONS (one must be true):
- Rider uses freeze, second-guess, or breath-hold language around a specific
  movement: "I blank out before the changes," "I hold my breath going into the
  pirouette," "I second-guess myself every time"
- Low confidence rating + successful execution in the same session or across
  alternating sessions — rider can do it but doesn't believe they can
- A new movement has appeared in debriefs with language indicating the rider
  is waiting for permission to try: "not sure I'm ready," "I don't have the
  feel for it yet," "hoping it will just come"

EXAMPLE sentences (use as templates, not verbatim):
- "Before you ask for it the next time, try riding it in your mind first —
  in your own arena, at your own pace, with [horse's name] beside you."
- "You're allowed to prepare in stillness before you ask for it in motion —
  that is not avoidance, it is the same work done in a different place."
- "The version of you that already knows how this feels is available between
  rides — you don't have to wait until you're in the saddle to find her."
- "Giving yourself a quiet run-through before you mount reduces the cost of
  the first attempt — the nervous system doesn't know the difference between
  a vividly imagined approach and a real one."
```

---

## Integration Instructions

There are three places these additions live. All three must be updated for the change to be complete.

---

### Step 1 — Update `YDJ_AI_Coaching_Voice_Prompts_v3.md` (reference document)

This is the source-of-truth document for all four voice prompts. Update it manually in this Claude.ai project or in your local files.

For each voice:
1. Open the voice prompt section
2. Find the closing word count instruction
3. Insert the VISUALIZATION AWARENESS block immediately before it
4. Save the document

This step keeps your reference document in sync with what actually runs in production. It does not affect runtime behavior — only the next step does that.

---

### Step 2 — Update `promptBuilder.js` (the live prompt)

This is the file Claude Code works from. It is in `functions/lib/promptBuilder.js` on your local Windows drive at `C:\Users\bgeis\your-dressage-journey\functions\lib\promptBuilder.js`.

**Hand this document to Claude Code** with the following instruction:

> "In `functions/lib/promptBuilder.js`, locate the Technical Coach system prompt string (Voice 2) and the Empathetic Coach system prompt string (Voice 1). In each, find the closing word count line and insert the VISUALIZATION AWARENESS block from `YDJ_Prompt_Additions_Visualization_Awareness.md` immediately before it. Use double-quote delimiters throughout — no unescaped apostrophes. Do not modify any other part of either prompt."

Claude Code will:
- Find the correct string location in promptBuilder.js
- Insert the block text
- Confirm the insertion with a diff

**What to verify after Claude Code completes:**
- [ ] Technical Coach prompt contains `VISUALIZATION AWARENESS` block before the word count line
- [ ] Empathetic Coach prompt contains `VISUALIZATION AWARENESS` block before the word count line  
- [ ] No syntax errors introduced (Claude Code should run `node -e "require('./functions/lib/promptBuilder.js')"` to confirm)
- [ ] No other voice prompts were modified

---

### Step 3 — Update `YDJ_Complete_AI_Prompt_Reference.md` (master reference)

This is the comprehensive document that tracks all prompt additions. Add this as section **5K**.

**Find the end of section 5J** (Voice Integration Additions) and insert:

```
---

### 5K. Visualization Awareness Additions

**Source:** `YDJ_Prompt_Additions_Visualization_Awareness.md` (April 2026)

**Voices affected:** Voice 1 (Empathetic Coach), Voice 2 (Technical Coach)

**What this is:** A conditional single-sentence addition that allows two voices
to reference mental rehearsal analytically when a clear trigger condition is
present in the rider's data. Not a CTA — an analytical observation that connects
an identified pattern to the category of practice that addresses it.

**Trigger conditions:**
- Technical Coach: 3+ occurrences of a specific body habit or mechanical
  interference in recent debriefs/observations
- Empathetic Coach: confidence hesitation, freeze, or second-guessing language
  around a specific movement

**Non-duplication rule:** Both additions include an explicit instruction to
suppress the observation when `visualizationSuggestionGenerated = true` — the
Weekly Focus Visualization This Week card handles the action pathway in those
cases.

**Voices NOT affected:** Classical Master (may reference organically),
Practical Strategist (not in analytical scope for this tool)
```

Also update the Table of Contents to add:
```
   - 5K. Visualization Awareness Additions
```

---

## What This Does NOT Change

- The `visualizationSuggestion` field generation logic in the Multi-Voice Coaching Cloud Function — that is specified in `YDJ_VisualizationSuggestion_WeeklyFocus_Brief.md`
- The Visualization Script Builder prompt or output (`buildVisualizationScriptPrompt()`)
- The Classical Master or Practical Strategist voice prompts
- The word count targets for either affected voice (300–400 words) — the single sentence is within existing budget

---

## Checklist

- [ ] `YDJ_AI_Coaching_Voice_Prompts_v3.md` — Technical Coach updated
- [ ] `YDJ_AI_Coaching_Voice_Prompts_v3.md` — Empathetic Coach updated
- [ ] `functions/lib/promptBuilder.js` — Technical Coach string updated (via Claude Code)
- [ ] `functions/lib/promptBuilder.js` — Empathetic Coach string updated (via Claude Code)
- [ ] `promptBuilder.js` syntax verified (`node -e "require('./functions/lib/promptBuilder.js')"`)
- [ ] `YDJ_Complete_AI_Prompt_Reference.md` — Section 5K added
- [ ] Table of Contents updated in Complete AI Prompt Reference
