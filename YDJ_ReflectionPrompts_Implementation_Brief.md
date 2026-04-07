# YDJ Reflection Prompt Bank — Claude Code Implementation Brief
## March 2026

---

## What This Is

A content-only update to the reflection prompt bank in `ReflectionForm.jsx`.
The existing pool of 15 prompts per category is being replaced with a new pool
of 30 prompts per category (180 total). Each prompt now carries a `voice`
attribute indicating which of the four coaching voices it was written in.

**No structural changes to the form.** The three-step wizard, reroll mechanic,
Firestore schema, and AI pipeline are unchanged — with one small exception: the
`voice` attribute on each prompt object should travel with the prompt when it is
saved to Firestore.

---

## Files to Change

| File | Change |
|---|---|
| `src/components/Reflection/ReflectionForm.jsx` | Replace prompt arrays; update Firestore save object |
| `functions/aggregators/reflections.js` | Pass through `promptVoice` field in aggregated output |

---

## What Is NOT Changing

- Three-step wizard flow (Category → Prompt → Write)
- All six category values, colors, display strings
- Reroll mechanic (1 random shown, up to 3 passes)
- All Firestore fields: `mainReflection`, `feeling`, `influence`,
  `obstacleStrategy`, `prompt`, `userId`, `category`, `isDeleted`,
  `createdAt`, `updatedAt`
- `ReflectionList.jsx` — no changes
- `aggregateReflections()` existing logic — extend only (see below)
- All existing AI pipeline integration
- Category coverage tracking and radar chart (Chart 9)

---

## Change 1 — Replace Prompt Arrays in `ReflectionForm.jsx`

### Current structure (to be replaced)

Locate the prompt arrays in `ReflectionForm.jsx`. They currently look like:

```javascript
const PROMPTS = {
  personal: [
    "A lifestyle change that gave you more productive time in the saddle",
    "A skill you once avoided that you now attempt",
    // ... 13 more strings
  ],
  // ... 5 more categories
};
```

### New structure (replace with this exactly)

Each prompt is now an object with two keys:
- `text` — the prompt string shown to the rider (unchanged UX)
- `voice` — one of `"classical"` | `"empathetic"` | `"technical"` | `"strategist"`

The random selection and reroll logic selects from the array as before — just
use `prompt.text` wherever the prompt string was previously used directly.

```javascript
const PROMPTS = {

  personal: [
    { text: "A lifestyle change that gave you more productive time in the saddle", voice: "strategist" },
    { text: "A skill you once avoided that you now attempt", voice: "empathetic" },
    { text: "A change you made that improved your horse's comfort or confidence", voice: "classical" },
    { text: "A time you rode in an intimidating situation — when the arena, the audience, or the stakes were bigger than you felt, and you rode anyway", voice: "empathetic" },
    { text: "A time you rode a new horse", voice: "empathetic" },
    { text: "A time you rode at a new, higher level", voice: "strategist" },
    { text: "A time you got back in the saddle after a break and found your footing again", voice: "empathetic" },
    { text: "The ride where something you'd been working toward for months suddenly stopped being work", voice: "empathetic" },
    { text: "A physical change — strength, flexibility, stamina — that showed up in the saddle before you expected it", voice: "strategist" },
    { text: "A time when you felt proud after a difficult lesson or moment in the saddle", voice: "empathetic" },
    { text: "A goal you wrote down, trained toward deliberately, and then actually crossed off", voice: "strategist" },
    { text: "A breakthrough in rhythm, connection, or harmony during a ride", voice: "classical" },
    { text: "A milestone you didn't recognize at the time", voice: "classical" },
    { text: "A lesson that left you feeling invincible", voice: "empathetic" },
    { text: "A time you handled frustration better than before", voice: "empathetic" },
    { text: "A ride that felt like true partnership", voice: "classical" },
    { text: "A specific moment when you asked for something harder than usual — and you were right to", voice: "empathetic" },
    { text: "A setback that led to long-term growth", voice: "classical" },
    { text: "A time you exceeded your own expectations", voice: "empathetic" },
    { text: "Earning your first medal, certification, or score milestone", voice: "strategist" },
    { text: "The first time you rode a particular movement or test", voice: "technical" },
    { text: "A moment when the accumulated hours — the early mornings, the hard lessons, the ordinary rides — suddenly became visible in your work", voice: "classical" },
    { text: "A ride or moment whose significance you only fully understood later", voice: "classical" },
    { text: "Mastering a movement you'd watched others do for years", voice: "technical" },
    { text: "Your first time helping another rider", voice: "empathetic" },
    { text: "The ride where you let go of a result and simply honored the work itself", voice: "classical" },
    { text: "A moment when riding gave you something you needed beyond the sport", voice: "empathetic" },
    { text: "A position change that finally unlocked a movement you had been chasing", voice: "technical" },
    { text: "A goal you set, tracked, and reached — and what the plan actually looked like", voice: "strategist" },
    { text: "A time your patience with yourself changed the outcome", voice: "empathetic" },
  ],

  validation: [
    { text: "Encouragement from a coach when you needed it most", voice: "empathetic" },
    { text: "A correction that stung at first — and later turned out to be the most useful thing anyone said to you", voice: "technical" },
    { text: "A compliment that surprised you", voice: "empathetic" },
    { text: "Someone noticing progress you hadn't seen yet", voice: "empathetic" },
    { text: "A judge's comment that changed your perspective", voice: "classical" },
    { text: "Positive feedback after a difficult ride", voice: "empathetic" },
    { text: "A trainer believing in you before you did", voice: "empathetic" },
    { text: "Recognition that arrived after a period of quiet, unglamorous work no one else had witnessed", voice: "classical" },
    { text: "A ribbon, score, or result that boosted confidence", voice: "strategist" },
    { text: "A judge's or coach's comment that made you feel proud", voice: "classical" },
    { text: "Support from a barn mate or peer", voice: "empathetic" },
    { text: "Someone acknowledging your effort, not just results", voice: "empathetic" },
    { text: "A time someone treated you like a real rider, not just a beginner", voice: "empathetic" },
    { text: "A moment when someone else's belief in you outlasted your own", voice: "empathetic" },
    { text: "A comment that told you the thing you'd been quietly prioritizing was the right thing to prioritize", voice: "strategist" },
    { text: "Feedback that reframed what you thought was failure as something the data didn't support", voice: "strategist" },
    { text: "Being trusted with more responsibility", voice: "strategist" },
    { text: "Feeling seen for your consistency", voice: "strategist" },
    { text: "A time someone interrupted a spiral of discouragement with a single observation that reoriented you", voice: "empathetic" },
    { text: "Feedback that reframed a mistake", voice: "technical" },
    { text: "A time you were seen for how you ride — not just what you rode — and it mattered more than the score", voice: "classical" },
    { text: "Acknowledgement from an unexpected source", voice: "empathetic" },
    { text: "A quiet nod or small comment that stuck with you", voice: "classical" },
    { text: "Being asked to demonstrate for other riders", voice: "strategist" },
    { text: "A photograph that captured something you'd been working toward", voice: "empathetic" },
    { text: "Feedback that identified a specific physical pattern you hadn't recognized in yourself", voice: "technical" },
    { text: "Validation that arrived at the exact moment your confidence was at its lowest", voice: "empathetic" },
    { text: "A comment from a trainer or judge that reflected a classical principle back to you", voice: "classical" },
    { text: "A score or result that confirmed your training plan was working", voice: "strategist" },
    { text: "A time a peer's words helped you trust the partnership you were building", voice: "empathetic" },
  ],

  aha: [
    { text: "The moment a concept you'd heard dozens of times finally landed in your body instead of your head", voice: "technical" },
    { text: "A ride that sent you back to the beginning of the Training Scale — and showed you how much was still being built there", voice: "classical" },
    { text: "A time when you realized less effort brought better results", voice: "technical" },
    { text: "A time when the why behind an exercise became clear", voice: "classical" },
    { text: "A time when you figured out the correct timing to give the aid", voice: "technical" },
    { text: "A time when you realized that tension is an obstacle", voice: "empathetic" },
    { text: "A moment you connected theory to feeling", voice: "technical" },
    { text: "A moment you realized that your own asymmetry was asking your horse to compensate — and what changed when you stopped", voice: "technical" },
    { text: "A time when you realized your horse was giving feedback all along", voice: "classical" },
    { text: "The ride where you noticed tension had become your default response — and chose something different", voice: "empathetic" },
    { text: "A time you felt the perfect half-halt, transition, or moment of collection", voice: "technical" },
    { text: "A time when your instructor said something that struck a chord", voice: "empathetic" },
    { text: "A time when you realized how to be even more effective", voice: "technical" },
    { text: "A mistake that, once you stopped fighting it, told you exactly what you needed to know", voice: "empathetic" },
    { text: "A moment you stopped trying to fix the symptom and addressed what was actually underneath it", voice: "technical" },
    { text: "A time when you shifted your perspective from 'doing' to 'allowing'", voice: "classical" },
    { text: "A time when you realized your confidence was impacting your communication with the horse", voice: "empathetic" },
    { text: "An insight that gave you momentum or took you out of a slump", voice: "empathetic" },
    { text: "A time you realized that progress isn't linear", voice: "empathetic" },
    { text: "A time when you recognized mental focus as a skill", voice: "empathetic" },
    { text: "A realization about partnership vs control", voice: "classical" },
    { text: "A realization about your own learning style", voice: "empathetic" },
    { text: "A moment when you realized you needed to put patience and empathy over getting something done", voice: "classical" },
    { text: "Realizing your seat influences everything", voice: "technical" },
    { text: "Understanding that 'soft' doesn't mean 'weak'", voice: "classical" },
    { text: "The moment a cause-and-effect between your body and your horse's response became impossible to unsee", voice: "technical" },
    { text: "A realization that connected your work in the saddle to a classical principle you'd only understood in theory", voice: "classical" },
    { text: "A moment when you understood that your emotional state and your horse's tension were the same thing", voice: "empathetic" },
    { text: "An insight that immediately changed how you structure your warm-up or ride plan", voice: "strategist" },
    { text: "A time you discovered that a recurring mistake had a completely different root cause than you assumed", voice: "technical" },
  ],

  obstacle: [
    { text: "A plateau that lasted longer than expected", voice: "empathetic" },
    { text: "A lesson that left you discouraged", voice: "empathetic" },
    { text: "A time you received conflicting advice", voice: "strategist" },
    { text: "A time you felt stuck despite effort", voice: "empathetic" },
    { text: "A confidence setback", voice: "empathetic" },
    { text: "A physical issue or physical setback", voice: "technical" },
    { text: "A horse health or soundness issue", voice: "classical" },
    { text: "A period when the distance between where you were and where you expected to be felt impossible to close", voice: "classical" },
    { text: "A misunderstanding with your horse", voice: "classical" },
    { text: "An injury or fall that shook your confidence", voice: "empathetic" },
    { text: "A time someone else's progress made your own feel invisible — and what that cost you", voice: "empathetic" },
    { text: "A stretch of time when your internal voice became your hardest opponent in the arena", voice: "empathetic" },
    { text: "A time you prepared well, arrived ready, and the ride still fell apart — and what you made of that", voice: "strategist" },
    { text: "Feeling pressure to advance too quickly", voice: "classical" },
    { text: "A period when the work stopped feeling like yours — and what it took to find your way back to it", voice: "empathetic" },
    { text: "A missed opportunity", voice: "empathetic" },
    { text: "Lack of resources (money, time, or access)", voice: "strategist" },
    { text: "A season when the rest of your life and the demands of serious training pulled in opposite directions", voice: "strategist" },
    { text: "A pattern you corrected in lessons that kept returning the moment you rode alone — and what it finally took to break it", voice: "technical" },
    { text: "Fear of failure or judgement", voice: "empathetic" },
    { text: "A loss of trust — in yourself or your horse", voice: "empathetic" },
    { text: "A stretch when you couldn't replicate what you'd done the ride before — and the toll that unpredictability took", voice: "technical" },
    { text: "Outgrowing your trainer or barn", voice: "strategist" },
    { text: "Financial strain limiting lessons or showing", voice: "strategist" },
    { text: "Loss of your primary horse (sale, retirement, death)", voice: "classical" },
    { text: "A period when the gap between how hard you worked and how little seemed to change tested your love of the sport", voice: "empathetic" },
    { text: "A time when chasing a result put you in direct conflict with your horse's needs", voice: "classical" },
    { text: "An obstacle that forced you to redesign your training plan from the ground up", voice: "strategist" },
    { text: "A recurring technical issue whose true root cause turned out to be something entirely different than you thought", voice: "technical" },
    { text: "A time when outside pressure — a show, a timeline, or someone else's opinion — made the work harder than it needed to be", voice: "empathetic" },
  ],

  connection: [
    { text: "A time your horse tried their heart out for you", voice: "empathetic" },
    { text: "Recognizing when your horse was teaching you", voice: "classical" },
    { text: "A moment when your horse responded to something you hadn't yet consciously asked — and you both knew it", voice: "classical" },
    { text: "Your horse forgiving a mistake", voice: "empathetic" },
    { text: "Building trust with a difficult or traumatized horse", voice: "empathetic" },
    { text: "The day your horse chose to be with you", voice: "empathetic" },
    { text: "A specific ride or moment when your horse's character showed up so clearly it stopped you mid-stride", voice: "empathetic" },
    { text: "A time your horse showed you what they needed", voice: "classical" },
    { text: "Your horse taking care of you when you were unbalanced", voice: "empathetic" },
    { text: "The moment you stopped seeing your horse as a tool", voice: "classical" },
    { text: "A ride where you and your horse were completely in sync", voice: "classical" },
    { text: "A time your horse met you halfway when you were struggling", voice: "empathetic" },
    { text: "Recognizing your horse's effort even when the result wasn't perfect", voice: "classical" },
    { text: "A moment your horse clearly communicated something to you", voice: "classical" },
    { text: "A time you prioritized your horse's needs over your riding agenda", voice: "classical" },
    { text: "The first time you truly felt your horse relax under you", voice: "empathetic" },
    { text: "A time your horse showed confidence because of your partnership", voice: "empathetic" },
    { text: "Recognizing when your horse was having an off day and adjusting accordingly", voice: "strategist" },
    { text: "A moment of play or joy with your horse outside of work", voice: "empathetic" },
    { text: "A time your horse's expression changed when they saw you", voice: "empathetic" },
    { text: "A time your horse's preference for something — or strong objection to it — changed how you train together", voice: "classical" },
    { text: "A time you advocated for your horse's wellbeing", voice: "classical" },
    { text: "The moment you realized your horse knows you as well as you know them", voice: "empathetic" },
    { text: "A time your horse gave more than you asked for", voice: "classical" },
    { text: "The moment you realized you had been saying the same thing louder instead of saying something different — and what changed", voice: "technical" },
    { text: "A moment when you understood that your horse's willingness was a gift, not a given", voice: "classical" },
    { text: "A time your horse's steadiness held you together when you were struggling emotionally", voice: "empathetic" },
    { text: "A ride where your aids became clearer and your horse's response changed in kind", voice: "technical" },
    { text: "A deliberate change to your warm-up or groundwork routine that improved the quality of your partnership", voice: "strategist" },
    { text: "A moment that reminded you why dressage was originally developed in service of the horse", voice: "classical" },
  ],

  feel: [
    { text: "The first time you truly felt your seat bones", voice: "technical" },
    { text: "Discovering where tension lives in your body while riding", voice: "technical" },
    { text: "Feeling the moment of suspension in the trot", voice: "technical" },
    { text: "Being physically aware of where your horse's energy is leaking out", voice: "technical" },
    { text: "The first time you felt your core engage independently", voice: "technical" },
    { text: "Recognizing the difference between gripping and wrapping your leg", voice: "technical" },
    { text: "Feeling when your shoulders creep up (and learning to drop them)", voice: "technical" },
    { text: "The moment you felt the hind legs push", voice: "technical" },
    { text: "Discovering you were holding your breath", voice: "empathetic" },
    { text: "Learning to feel diagonal pairs in the trot", voice: "technical" },
    { text: "The first time you felt collection as an upward energy", voice: "classical" },
    { text: "A ride where you caught your weight shifting in the direction of a movement before you'd consciously asked for it", voice: "technical" },
    { text: "Feeling the horse's back come up beneath you", voice: "technical" },
    { text: "Learning to soften a locked joint (elbow, knee, ankle, jaw)", voice: "technical" },
    { text: "The sensation of your horse stepping into the contact", voice: "classical" },
    { text: "Feeling the difference between pulling and half-halting", voice: "technical" },
    { text: "A ride where the asymmetry between your two sides became impossible to ignore — and what your horse was doing in response", voice: "technical" },
    { text: "Learning to feel when you're ahead of or behind the motion", voice: "technical" },
    { text: "The first time you felt your hip follow the canter", voice: "technical" },
    { text: "Recognizing when you brace against movement", voice: "technical" },
    { text: "Feeling throughness travel from back to front", voice: "classical" },
    { text: "A time when your horse's balance improved because of a change in your balance", voice: "technical" },
    { text: "The moment you felt rhythmic breathing sync with the gait", voice: "classical" },
    { text: "The moment you looked up, or looked ahead, or softened your gaze — and felt your horse reorganize beneath you", voice: "classical" },
    { text: "Feeling the difference between passive and active sitting", voice: "technical" },
    { text: "Discovering how a change in one part of your body created a chain reaction through your entire position", voice: "technical" },
    { text: "A moment when your horse's rhythm entered your body and you stopped counting and started feeling", voice: "classical" },
    { text: "A time you noticed that anxiety had taken up residence somewhere specific in your body during a ride", voice: "empathetic" },
    { text: "Feeling the difference between a movement your horse offered freely and one you had to manufacture", voice: "technical" },
    { text: "An off-horse practice — yoga, pilates, body work, stretching — that changed what you felt in the saddle", voice: "strategist" },
  ],

};
```

---

## Change 2 — Update Prompt Selection Logic in `ReflectionForm.jsx`

The reroll mechanic currently draws a random item from the array and stores it
as a string. Update it to draw the full object and reference `.text` for
display. The `voice` value is passed to the save function.

### Find and update (3 locations)

**1. Initial random selection** — wherever a random prompt is drawn on category
selection, change from:

```javascript
// BEFORE
const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
setSelectedPrompt(randomPrompt);
```

```javascript
// AFTER
const randomPromptObj = prompts[Math.floor(Math.random() * prompts.length)];
setSelectedPrompt(randomPromptObj);
```

**2. Reroll / pass logic** — same pattern; ensure the reroll also sets the full
object, not just text.

**3. Prompt display** — wherever `selectedPrompt` is rendered to the rider,
change from:

```javascript
// BEFORE
<p>{selectedPrompt}</p>
```

```javascript
// AFTER
<p>{selectedPrompt.text}</p>
```

No visual change to the rider. The `voice` value is invisible in the UI.

---

## Change 3 — Add `promptVoice` to the Firestore Save Object

In the Firestore write call inside `ReflectionForm.jsx`, add one field:

```javascript
// BEFORE (partial, showing only relevant fields)
{
  userId: currentUser.uid,
  category: selectedCategory,
  prompt: selectedPrompt,
  mainReflection: formData.mainReflection,
  // ...
}

// AFTER
{
  userId: currentUser.uid,
  category: selectedCategory,
  prompt: selectedPrompt.text,       // was: selectedPrompt
  promptVoice: selectedPrompt.voice, // NEW — "classical"|"empathetic"|"technical"|"strategist"
  mainReflection: formData.mainReflection,
  // ...
}
```

No Firestore schema migration required — this is an additive field. Existing
reflection documents without `promptVoice` will read as `undefined`; handle
gracefully as shown in Change 4.

---

## Change 4 — Extend `aggregateReflections()` in `functions/aggregators/reflections.js`

The aggregator currently includes recent reflection entries in `byCategory[cat].recentEntries`.
Add `promptVoice` to the fields passed through for each entry.

### Find the section that maps recent entries and add `promptVoice`:

```javascript
// BEFORE (partial — find the recentEntries mapping)
recentEntries: recentDocs.map(doc => ({
  prompt: doc.prompt,
  mainReflection: doc.mainReflection,
  feeling: doc.feeling,
  influence: doc.influence,
  createdAt: doc.createdAt,
}))

// AFTER
recentEntries: recentDocs.map(doc => ({
  prompt: doc.prompt,
  promptVoice: doc.promptVoice || null,  // null-safe for legacy entries
  mainReflection: doc.mainReflection,
  feeling: doc.feeling,
  influence: doc.influence,
  createdAt: doc.createdAt,
}))
```

No changes to `promptBuilder.js` are required at this time. The `promptVoice`
field is available in the aggregated data for future prompt use but is not
injected into coaching context in this release.

---

## Implementation Checklist

- [ ] Read `src/components/Reflection/ReflectionForm.jsx` in full before editing
- [ ] Replace `PROMPTS` constant with the new 30-per-category object structure (Change 1)
- [ ] Update random selection logic to draw full object, not string (Change 2 — 3 locations)
- [ ] Update prompt display to use `selectedPrompt.text` (Change 2)
- [ ] Update Firestore save: `prompt: selectedPrompt.text`, add `promptVoice: selectedPrompt.voice` (Change 3)
- [ ] Update `aggregateReflections()` to pass through `promptVoice` with null-safe fallback (Change 4)
- [ ] Smoke test: open reflection form, select each category, confirm prompts display correctly
- [ ] Smoke test: complete a full reflection, confirm Firestore document contains `promptVoice` field
- [ ] Smoke test: reroll works and still sets full object (not string)
- [ ] Confirm no regressions in `ReflectionList.jsx` display or export

---

## Out of Scope for This Brief

- Voice display in the UI — `promptVoice` is stored but not shown to riders
- Using `promptVoice` in `promptBuilder.js` AI context — deferred to a future brief
- Any changes to `feeling`, `influence`, `obstacleStrategy` field behavior
- Any changes to the Step 0 weekly context feature (separate brief)
- Any changes to category colors, icons, or display labels
