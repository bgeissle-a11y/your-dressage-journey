# Implementation Brief Amendment: Visualization Script Builder — Warm-Up Movement Type
**Your Dressage Journey — Claude Code Handoff**
**Date:** March 2026 (Updated April 2026)
**Amends:** `YDJ_VisualizationScript_Implementation_Brief.md`
**Priority:** Implement alongside the main brief — not a follow-on

> **IMPORTANT — React Integration (April 2026):** All form-side changes in this
> amendment target the React components in `src/components/Visualization/`, not the
> standalone HTML prototype. The warm-up chip, problem cards, context hiding, and
> validation logic are implemented in `VisualizationForm.jsx` and
> `visualizationConstants.js`. Server-side changes (promptBuilder, Cloud Function)
> apply as written.

---

## Overview

Add `warm-up` as a movement type in the Visualization Script Builder. Unlike every other entry in the movement list, warm-up is not a discrete movement — it is a *phase of riding* with its own arc, its own set of challenges, and its own measure of success. This requires three targeted adaptations beyond simply adding a chip to the picker:

1. **Section 2 (Problem Focus) swaps entirely** when warm-up is selected — the standard movement-problem vocabulary doesn't apply
2. **Section 4 (Context) disables one option** when warm-up is selected — "Competition test" is contradictory for a warm-up script
3. **The system prompt receives warm-up-specific generation instructions** — the script structure is different; the warm-up IS the work, so there is no separate "The Work" block

Everything else in the main brief applies unchanged. The Firestore schema, session logging, Toolkit rendering, and export logic all handle `warm-up` identically to any other movement value — no special cases needed there.

---

## 1. `ydj-visualization-form.html` — Movement Picker

### 1a. Add warm-up chip to Foundation & Balance group

Place it **first** in the group — before sitting trot. Warm-up is the lowest-barrier entry to the feature and should be the first thing a rider's eye lands on.

**Find:**
```html
<div class="movement-group">
    <div class="movement-group-label">Foundation & Balance</div>
    <div class="movement-grid">
        <button class="movement-chip" data-movement="sitting-trot" onclick="selectMovement(this)">Sitting trot</button>
```

**Replace with:**
```html
<div class="movement-group">
    <div class="movement-group-label">Foundation & Balance</div>
    <div class="movement-grid">
        <button class="movement-chip" data-movement="warm-up" onclick="selectMovement(this)">Warm-up</button>
        <button class="movement-chip" data-movement="sitting-trot" onclick="selectMovement(this)">Sitting trot</button>
```

No sub-panel needed for warm-up. The context section (Section 4) already distinguishes training from show warm-up — that's the only dimension of specificity that matters for script generation.

---

## 2. `ydj-visualization-form.html` — Section 2 (Problem Focus)

Section 2 must swap its content when warm-up is selected. The standard problem options (timing of the aid, position breaks down, horse anticipates, etc.) do not describe warm-up challenges and would generate a worse script.

### 2a. Wrap the existing problem cards in an id

The existing `<div class="radio-cards" id="problem-cards">` already has the right id. No change needed to the container.

### 2b. Add a warm-up problem cards set (hidden by default)

Insert the following immediately **after** the closing `</div>` of `id="problem-cards"` and **before** `<div class="validation-hint" id="hint-problem">`:

```html
<!-- Warm-up specific problem options — shown only when warm-up is selected -->
<div class="radio-cards" id="warmup-problem-cards" style="display:none;">

    <label class="radio-card" onclick="selectCard(this, 'warmup-problem-cards')">
        <input type="radio" name="problem" value="warmup-presence">
        <div>
            <div class="radio-card-label">🧘 Getting present — transitioning into riding mode</div>
            <div class="radio-card-desc">My mind is still in my day. I want to rehearse the mental shift from person to rider before I ever mount.</div>
        </div>
    </label>

    <label class="radio-card" onclick="selectCard(this, 'warmup-problem-cards')">
        <input type="radio" name="problem" value="warmup-horse">
        <div>
            <div class="radio-card-label">🐴 Meeting the horse where he is</div>
            <div class="radio-card-desc">Some days he's fresh, stiff, or tense. I want to rehearse reading him and adapting rather than pushing past what he's offering.</div>
        </div>
    </label>

    <label class="radio-card" onclick="selectCard(this, 'warmup-problem-cards')">
        <input type="radio" name="problem" value="warmup-rushing">
        <div>
            <div class="radio-card-label">⏩ I rush through it</div>
            <div class="radio-card-desc">I get to business too quickly. The warm-up becomes a formality rather than a conversation. I want to rehearse patience and listening.</div>
        </div>
    </label>

    <label class="radio-card" onclick="selectCard(this, 'warmup-problem-cards')">
        <input type="radio" name="problem" value="warmup-throughness">
        <div>
            <div class="radio-card-label">🌊 Finding the swing and throughness</div>
            <div class="radio-card-desc">I want to feel and rehearse the moment when his back comes up, the contact goes alive, and the horse is genuinely with me — not just going around.</div>
        </div>
    </label>

    <label class="radio-card" onclick="selectCard(this, 'warmup-problem-cards')">
        <input type="radio" name="problem" value="warmup-show">
        <div>
            <div class="radio-card-label">🏟 Managing show warm-up chaos</div>
            <div class="radio-card-desc">Other horses, noise, ring traffic, time pressure. I tighten up or get reactive instead of staying focused and soft.</div>
        </div>
    </label>

</div>
```

### 2c. Also update the section header copy dynamically

The section header currently reads "What specifically needs work?" This is fine for both contexts, so **no change needed** to the header text. The sub-description ("The problem you're solving shapes the heart of your script.") is equally valid for warm-up. Leave both as-is.

### 2d. Update `validate()` to check the active problem set

**Find in the JavaScript:**
```javascript
if (!document.querySelector('#problem-cards .radio-card.selected')) {
```

**Replace with:**
```javascript
const activeProblemCards = selectedMovement === 'warm-up' ? '#warmup-problem-cards' : '#problem-cards';
if (!document.querySelector(`${activeProblemCards} .radio-card.selected`)) {
```

---

## 3. `ydj-visualization-form.html` — Section 4 (Context)

"Competition test" is contradictory for a warm-up script — a warm-up visualization cannot be set in a competition test. When warm-up is selected, hide that option and clear any existing selection of it.

### 3a. Add a data attribute to the test context card

**Find:**
```html
<label class="context-card" onclick="selectContext(this)">
    <input type="radio" name="context" value="test">
    <div class="context-icon">🏟</div>
    <div class="context-label">Competition test</div>
```

**Replace with:**
```html
<label class="context-card" id="context-test-card" onclick="selectContext(this)">
    <input type="radio" name="context" value="test">
    <div class="context-icon">🏟</div>
    <div class="context-label">Competition test</div>
```

### 3b. Add CSS for the hidden context state

Add to the `<style>` block:
```css
.context-card.hidden-for-movement {
    display: none;
}
```

---

## 4. `ydj-visualization-form.html` — `selectMovement()` JavaScript

The existing `selectMovement()` function handles sub-panel visibility, aspiration note, and deselects chips. Extend it to also manage the warm-up-specific Section 2 swap and the Section 4 context card hiding.

**Find the end of `selectMovement()` — after the aspiration note toggle:**
```javascript
        // Aspiration note
        const aspNote = document.getElementById('aspiration-note');
        aspNote.classList.toggle('visible', aspirationalMovements.includes(selectedMovement));
    }
```

**Replace with:**
```javascript
        // Aspiration note — not shown for warm-up
        const aspNote = document.getElementById('aspiration-note');
        aspNote.classList.toggle('visible',
            aspirationalMovements.includes(selectedMovement) && selectedMovement !== 'warm-up');

        // Warm-up: swap problem cards, hide test context option
        const isWarmup = selectedMovement === 'warm-up';

        document.getElementById('problem-cards').style.display = isWarmup ? 'none' : 'flex';
        document.getElementById('warmup-problem-cards').style.display = isWarmup ? 'flex' : 'none';

        // Clear any selected problem card in the set being hidden
        if (isWarmup) {
            document.querySelectorAll('#problem-cards .radio-card').forEach(c => c.classList.remove('selected'));
        } else {
            document.querySelectorAll('#warmup-problem-cards .radio-card').forEach(c => c.classList.remove('selected'));
        }

        // Hide/show the competition test context card
        const testCard = document.getElementById('context-test-card');
        if (isWarmup) {
            testCard.classList.add('hidden-for-movement');
            // If test was previously selected, deselect it
            if (testCard.classList.contains('selected')) {
                testCard.classList.remove('selected');
                testCard.querySelector('input').checked = false;
            }
        } else {
            testCard.classList.remove('hidden-for-movement');
        }
    }
```

Note: `radio-cards` uses `display: flex` in the existing CSS (the flex gap/wrap layout). When restoring the standard problem cards, set `display: 'flex'` not `display: 'block'`. Confirm against actual CSS — if it uses a different display value, match it.

---

## 5. `buildMovementLabel()` — Add warm-up entry

**Find in `promptBuilder.js`:**
```javascript
const labels = {
    'sitting-trot': 'Sitting Trot',
```

**Replace with:**
```javascript
const labels = {
    'warm-up': 'Warm-Up',
    'sitting-trot': 'Sitting Trot',
```

---

## 6. `formatProblem()` — Add warm-up problem values

**Find the `formatProblem()` map in `promptBuilder.js`:**
```javascript
function formatProblem(problemFocus) {
  const map = {
    'timing': 'Timing of the aid — the aid is inconsistent or off the beat',
```

**Add the following five entries to the map** (alongside the existing entries, order doesn't matter):
```javascript
    'warmup-presence': 'Getting present — rider mind is still in daily life; needs to rehearse the mental transition into riding mode before mounting',
    'warmup-horse':    'Meeting the horse where he is — rehearsing how to read, adapt to, and work with whatever state the horse presents that day',
    'warmup-rushing':  'Rushing through it — rider moves to work too quickly; needs to rehearse patience, listening, and conversation before asking',
    'warmup-throughness': 'Finding swing and throughness — rehearsing the felt moment when the horse\'s back comes up and the contact becomes alive',
    'warmup-show':     'Show warm-up management — rehearsing focus and softness under the distraction of ring traffic, noise, time pressure, and competition nerves',
```

---

## 7. `buildVisualizationScriptSystemPrompt()` — Warm-Up Structure Instructions

The standard script structure (Settle → Arrive → Warm-Up → The Work → Close → Reflect) does not apply when the movement is `warm-up`. The warm-up IS the work. The system prompt must know this.

### 7a. In the Cloud Function, detect warm-up before calling the prompt builder

**In `visualizationScript.js`**, when assembling the API call, pass an `isWarmupScript` flag:

```javascript
const isWarmupScript = formData.movement === 'warm-up';
const prompt = buildVisualizationScriptPrompt(formData, riderContext, isWarmupScript);
```

### 7b. Update `buildVisualizationScriptPrompt()` signature

```javascript
export function buildVisualizationScriptPrompt(formData, riderContext, isWarmupScript = false) {
  return {
    system: buildVisualizationScriptSystemPrompt(isWarmupScript),
    messages: [
      {
        role: 'user',
        content: buildVisualizationScriptUserMessage(formData, riderContext)
      }
    ]
  };
}
```

### 7c. Update `buildVisualizationScriptSystemPrompt()` signature and add warm-up block

**Find:**
```javascript
function buildVisualizationScriptSystemPrompt() {
  return `You are generating a personalized mental rehearsal (visualization) script...
```

**Replace with:**
```javascript
function buildVisualizationScriptSystemPrompt(isWarmupScript = false) {
  const basePrompt = `You are generating a personalized mental rehearsal (visualization) script...
[existing full prompt text — do not change any of it]`;

  if (!isWarmupScript) return basePrompt;

  return basePrompt + `

WARM-UP SCRIPT — SPECIAL GENERATION RULES:
The rider has selected "Warm-Up" as their movement. This is not a discrete movement — it is a phase of riding with its own arc. Apply all of the following instead of the standard script structure.

STRUCTURE FOR WARM-UP SCRIPTS:
Do NOT generate a "Warm-Up" block followed by a "The Work" block. The warm-up IS the work. Use this block structure:

1. settle — "Arriving in your body" (2 min, standard — no changes)
2. arrive — "Coming to the barn" (2 min, standard — no changes)
3. mount — "The first moment in the saddle" (2 min)
   - The moment of contact between rider and horse — seat bones landing, reins taken up, the first breath together
   - Establish the emotional and physical baseline: what does the horse feel like right now? What does the rider feel like?
   - Rider scans for their own tension without fixing it — just noticing
4. warmup-arc — "The arc of the warm-up" (5–8 min depending on script length)
   - This is the central and longest block
   - Move through the full warm-up arc: walk on a loose rein → rhythmic working walk → first trot → establishing rhythm → suppleness work → the moment throughness arrives
   - The arc ends at the felt threshold: the moment the horse's back comes up, the contact becomes alive, and both athlete feel ready to work
   - Tailor this block to the rider's stated problem focus (see problem focus below)
   - Use the horse's name throughout — the horse is an active participant in every sentence
5. threshold — "The moment of readiness" (2 min)
   - The transition from warm-up into work — not a movement, but a feeling state
   - What does "ready" feel like in this horse? What does the rider's body feel like when the warm-up has done its job?
   - This is the goal state the script is training the rider to recognize and recreate
6. reflect — standard, but with a warm-up-specific reflection prompt

PROBLEM FOCUS SHAPING:
The rider's stated problem focus determines the emphasis of block 4 (warmup-arc):
- warmup-presence: weight the settle and mount blocks heavily; the arc begins with the rider's own nervous system regulation before asking anything of the horse
- warmup-horse: the arc centers on reading and responding — the imagery includes multiple "what is he telling me right now?" check-ins
- warmup-rushing: the arc is deliberately slow; include explicit imagery of the rider choosing to do less, wait longer, listen before asking
- warmup-throughness: the arc builds explicitly toward the moment of throughness — describe the felt sequence: rhythm first, then relaxation, then the back swings, then the contact softens, then connection
- warmup-show: the arrive block becomes the show grounds; the arc includes external distractions the rider practices staying soft through

CONTEXT SHAPING:
- training: quiet home arena, no audience, full time available — the focus is quality of conversation
- warmup (show warm-up): busy ring, other horses, limited time, judge nearby — the focus is maintaining softness under pressure; the threshold moment includes imagery of the transition from warm-up ring to arena entrance

REFLECTION PROMPT FOR WARM-UP:
Do not use the standard "What did my body want to do?" prompt. Use instead:
"What does 'ready' feel like — in your body and in his — on a good day?"
This builds the rider's internal reference for readiness, which is more useful for a warm-up script than a pattern-interruption prompt.

TIMING (for max_tokens and block structure):
- short (~8 min): settle 2 + arrive 1.5 + mount 1.5 + warmup-arc 3 = no threshold block
- standard (~12 min): settle 2 + arrive 2 + mount 2 + warmup-arc 4 + threshold 2
- extended (~18 min): settle 2 + arrive 2 + mount 2 + warmup-arc 8 + threshold 2 + extended reflect 2`;
}
```

**Important implementation note:** The `basePrompt` above represents the full existing system prompt text verbatim — do not summarize or truncate it. Only the warm-up addendum is new. The `if (!isWarmupScript) return basePrompt` path returns exactly the existing prompt unchanged.

---

## 8. Firestore — No Schema Changes

The `warm-up` movement value stores cleanly in the existing schema:
- `movement: 'warm-up'` — valid string, no sub-selection
- `movementSub: null` — no sub-selection for warm-up
- `problemFocus: 'warmup-presence'` (or other warmup-* value) — valid string
- All other fields unchanged

No new Firestore rules, indexes, or collection paths needed.

---

## 9. `buildVisualizationScriptUserMessage()` — No Changes

The user message template already passes `formData.movement`, `formatProblem(formData.problemFocus)`, and `formatContext(formData.context)` into the prompt. With the additions to `formatProblem()` in Section 6 of this brief, warm-up problem values will be formatted correctly. No other changes to the user message needed.

---

## 10. Warm-Up as a Weekly Focus Suggestion (future-state flag)

The main brief includes a TODO comment in the weekly coaching context assembly for future visualization session integration. When that integration is eventually built, warm-up scripts should surface differently than movement scripts in coaching outputs:

- A rider with 5+ warm-up sessions and a recurring "warmup-rushing" problem focus should see that pattern named in the Empathetic Coach or Technical Coach outputs
- The "threshold" reflection response ("What does 'ready' feel like?") is qualitatively different data from movement pattern observations — it's a self-efficacy reference point, not a pattern-to-interrupt

Add the following to the TODO comment in `promptBuilder.js` when it's written:

```javascript
// TODO: Visualization session integration
// When adding visualization session data to weekly coaching context:
// - Movement scripts: surface recurring reflection patterns as body-awareness observations
// - Warm-up scripts: surface 'threshold' reflections as self-efficacy reference points
//   ("What does ready feel like?" answers inform GPT Mental Performance path language)
// - Keep warm-up and movement session data semantically separate in the context bundle
```

---

## Summary Checklist — Additions to Main Brief Checklist

Add these items to the main brief's Summary Checklist under a new heading:

**Warm-Up Movement Type (Amendment)**
- [ ] Add `warm-up` chip first in Foundation & Balance group in `ydj-visualization-form.html`
- [ ] Add `id="warmup-problem-cards"` set with 5 warm-up-specific problem options (hidden by default)
- [ ] Add `.hidden-for-movement { display: none }` CSS rule
- [ ] Add `id="context-test-card"` to the competition test context card
- [ ] Update `selectMovement()` to swap problem cards and hide test context card when warm-up is selected
- [ ] Update `validate()` to check `#warmup-problem-cards` when warm-up is selected
- [ ] Add `'warm-up': 'Warm-Up'` to `buildMovementLabel()` labels map
- [ ] Add 5 `warmup-*` values to `formatProblem()` map in `promptBuilder.js`
- [ ] Update `buildVisualizationScriptSystemPrompt()` signature to accept `isWarmupScript` param
- [ ] Add warm-up structure addendum to system prompt (appended only when `isWarmupScript === true`)
- [ ] Update `buildVisualizationScriptPrompt()` signature to accept and pass `isWarmupScript`
- [ ] Detect `formData.movement === 'warm-up'` in Cloud Function before calling prompt builder
- [ ] Add warm-up TODO note to coaching context assembly TODO comment
- [ ] Confirm `radio-cards` display value in CSS before setting it in `selectMovement()` toggle
