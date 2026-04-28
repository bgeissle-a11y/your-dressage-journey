# YDJ First Light — Implementation Brief (v3)

**Status:** Ready for Claude Code handoff
**Target launch:** Before subscriber go-live, June 1, 2026
**Tier availability:** All tiers (Working / Medium / Extended)
**Estimated cost per generation:** ~$0.020–0.035 (Sonnet)
**Replaces:** First Light Implementation Brief v1, v2

---

## 1. Purpose

First Light is the inaugural AI coaching artifact every new YDJ subscriber receives. It is generated on rider request from rider profile + horse profile data + **six structured reflection entries** (one per category) the rider completes during First Light entry. Its purpose is to bridge the gap between subscription start and the point at which Multi-Voice Coaching unlocks.

First Light replaces the dead zone in onboarding with a substantive, personal, multi-voice introduction to the platform. It establishes trust, demonstrates value early, and introduces the four coaching voices the rider will hear from throughout their journey.

**Critical design property:** the six reflection entries the rider completes for First Light are **saved to the rider's reflection record** and count toward the Multi-Voice Coaching threshold. The rider exits First Light entry having logged all 6 reflection categories — meaning they need only 5 debriefs to unlock Multi-Voice. This is the engine of the early-engagement strategy: meaningful AI value on day one, threshold acceleration baked into the experience.

**First Light is distinct from First Glimpse.** First Glimpse is the prospect-funnel single-voice teaser outside the authenticated app. First Light lives inside the app, is rider-requested, draws on richer data (profile + horse profile + 6 fresh reflections), and presents all four voices.

---

## 2. Quick Reference

| Item | Value |
|---|---|
| Output name (UI, all surfaces) | First Light |
| Output name (Firestore key) | `firstLight` |
| Generation eligibility | Rider Profile complete AND ≥1 Horse Profile complete |
| Entry mechanism | Six-reflection wizard, one per category, pre-selected prompts |
| Reflections saved to rider record | Yes — count toward Multi-Voice threshold |
| Generation method | Rider-requested (callable Cloud Function) after all 6 reflections complete |
| Regenerate trigger | Rider-requested, one-time, available until graduation |
| Graduation trigger | Rider crosses Multi-Voice Coaching threshold (5 debriefs + all 6 reflection categories) |
| Tier availability | All tiers |
| Length target | 350–550 words across all sections |
| Voices represented | All four (one primary, three brief intros) |
| Storage | `riders/{userId}/firstLight/current` |
| Primary placement (pre-graduation) | Quick Start page |
| Secondary placement (post-graduation) | Dashboard archive — "Your Journey So Far" |

---

## 3. The Entry Flow — Six Pre-Selected Reflections

First Light entry is a wizard that guides the rider through six reflections, one per category, in a fixed order. The reflections use pre-selected prompts (the rider does not choose from a pool — these specific prompts are designed to elicit the signal the four-voice mechanic needs). Each reflection is saved as a real reflection in the rider's record at the moment of "next" / submit.

### 3.1 The six prompts

These prompts are slightly simplified from the First Glimpse versions and are direct rather than coaxing. They are hard-coded in the First Light entry flow.

| # | Category | Prompt |
|---|---|---|
| 1 | personal | Describe a recent moment in your riding that felt like a personal breakthrough — big or small. |
| 2 | validation | Tell us about an achievement in your riding that you're particularly proud of. |
| 3 | aha | Describe a dressage insight you've recently rediscovered — something that clicked in a new way. |
| 4 | obstacle | Describe a challenge you're currently facing in your riding — the one that keeps showing up. |
| 5 | connection | Describe a moment when you felt a genuine connection to your horse. |
| 6 | feel | Describe something about your position or body that you regularly work to improve — and why it matters. |

### 3.2 What each reflection captures

Each reflection captures the same fields as a regular reflection — schema parity is mandatory so these reflections behave correctly throughout the platform:

| Field | Type | Required? | Notes |
|---|---|---|---|
| `userId` | string | yes | rider's UID |
| `category` | string | yes | one of: personal \| validation \| aha \| obstacle \| connection \| feel |
| `prompt` | string | yes | the exact prompt text from §3.1 |
| `mainReflection` | string | yes | rider's written response (textarea) |
| `feeling` | string | yes | required select per regular reflection schema |
| `influence` | string | yes | required select per regular reflection schema |
| `obstacleStrategy` | string | required only when `category === "obstacle"` | textarea |
| `source` | string | yes | hard-coded `"first-light-entry"` for analytics & traceability |
| `createdAt` | Timestamp | yes | server timestamp on save |

**`weeklyContext` (Step 0 fields)** — confidenceTrend, themeWord, scoreTakeaway — is **skipped** during First Light entry. These are weekly-frame fields and the rider has no week to reflect on yet. They surface naturally on the rider's first regular reflection after First Light.

### 3.3 Wizard structure

One reflection per screen, six screens total, with a persistent progress indicator at top: `Reflection 3 of 6 · Aha Moment`.

**Per-screen layout:**

```
[Progress: ●●●○○○  Reflection 3 of 6 · Aha Moment]

────────────────────────────────────────────────

Aha Moment
Describe a dressage insight you've recently rediscovered —
something that clicked in a new way.

[ Large textarea for mainReflection ]

How does this make you feel?
[ feeling select — same options as regular reflection form ]

How is this likely to influence your riding?
[ influence select — same options as regular reflection form ]

[If category === "obstacle":]
What strategy might help you navigate this?
[ obstacleStrategy textarea ]

────────────────────────────────────────────────

[ ← Back ]                    [ Save & Continue → ]
```

**Save-as-you-go behavior:**

- "Save & Continue" writes the reflection to Firestore via the standard reflection-save path (so it triggers the same aggregator pipeline as a regular reflection)
- "← Back" returns to the previous screen but does not delete already-saved reflections; if the rider edits a previously-saved reflection, the save replaces the prior document rather than creating a duplicate (track via `source === "first-light-entry"` + `category`)
- The rider can exit the wizard at any time; their progress persists; returning to Quick Start shows "Continue your First Light — N of 6 complete"
- The 6th reflection's "Save & Continue" button label changes to "Save & Finish" and routes back to Quick Start, where the "Generate My First Light" button now appears

### 3.4 Resumability

A rider who completes 3 reflections and walks away returns to find:

- Those 3 reflections in their reflection record
- Quick Start's First Light card showing "Continue your First Light — 3 of 6 complete · [ Continue → ]"
- Resuming opens the wizard at reflection 4
- The 3 already-saved reflections also count toward their Multi-Voice threshold *immediately* — they don't have to finish First Light to benefit from the reflections they've already done

This last property matters: the rider is rewarded for partial completion even if they never come back. We never lose data and never hold reflections hostage to First Light generation.

### 3.5 What if the rider abandons permanently?

- Their partial reflections remain in their record, contributing to threshold progress
- First Light is not generated until all 6 are complete
- The Quick Start card persists in "Continue" state indefinitely
- Optional light-touch email at day 7 of incomplete state: "Your First Light is waiting — three more reflections to go." (One email only.)

---

## 4. Generation Eligibility & Lifecycle

### 4.1 Eligibility for entering the wizard

The rider can begin First Light entry when:

1. `riders/{userId}/riderProfile/profile` exists and is marked complete
2. At least one document in `riders/{userId}/horses` is marked complete

Until both are true, the Quick Start card shows the "Not Yet Eligible" state with the missing items called out (see §6.1, State A).

### 4.2 Eligibility for generation

The "Generate My First Light" button on the Quick Start card appears only when:

1. Eligibility for entry is met (per §4.1), AND
2. All six First Light reflections exist (six reflections with `source === "first-light-entry"`, one in each category), AND
3. `firstLight/current` does not yet exist

### 4.3 Regenerate

After First Light is generated, a single regenerate is available. The regenerate uses **all current data at the time of the click** — the original 6 reflections plus any debriefs, additional reflections, self-assessments, or other inputs the rider has logged since.

**Regenerate availability:**

- Available the moment First Light is first generated
- Available until the rider crosses the Multi-Voice threshold (graduation)
- One regenerate per rider, ever
- After regenerate is used, the button is removed from the UI

**Why this design (vs. a 14-day window):** Simpler. The rider isn't watching a clock. They use it when they want a sharper read after they've added more material. The graduation event closes the regenerate window naturally because at that point Multi-Voice Coaching takes over.

### 4.4 Graduation

When the rider crosses the Multi-Voice Coaching threshold:

- `firstLight/current.graduatedAt` is set to current timestamp
- The rider graduates from Quick Start (per Quick Start design)
- Multi-Voice Coaching is generated and becomes the rider's active coaching artifact
- First Light moves to the dashboard's "Your Journey So Far" archive section
- First Light remains accessible after graduation as the rider's preserved starting point

---

## 5. Output Structure

First Light has exactly four sections. Output is structured JSON consumed by the frontend.

### 5.1 Section: `riderRead` (4–7 sentences, primary voice)

Synthesizes what the AI understands about the rider. Names them by first name. References specifics from rider profile: stated why, learning style, long-term goals, current level, training context, trainer relationship if shared. Weaves in language from the six reflections. Identifies one meaningful through-line — not a "pattern" claim, but a single observation that connects two specific things the rider said. Uses the rider's own words back to them where possible.

### 5.2 Section: `partnershipRead` (3–5 sentences, same primary voice)

Specific to the partnership with their primary horse. Names the horse. References what's special, what's challenging, history, partnership dynamics from horse profile and from any reflection that mentions the horse. If multiple horses are present, primary horse leads; one sentence acknowledges others by name.

### 5.3 Section: `otherVoices` (array of 3 entries, ~2 sentences each)

The three voices not selected as primary each introduce themselves with what *they* will be watching for in this rider's data. Each entry is grounded in something specific the rider shared. Each voice speaks in its established tone — voices demonstrate their character; they do not announce it.

Array order: voices 0, 1, 2, 3 minus the primary, in voice number order.

### 5.4 Section: `whereWeBegin` (1–2 sentences, primary voice)

Not homework. A frame for what the rider could carry into their next ride or first regular reflection. Often the most powerful place to draw a line between two of the rider's reflections — a Connection moment that answers an Obstacle, an Aha that resolves a Body Awareness theme. Gentle, specific, grounded.

### 5.5 Sentence ceiling

`riderRead` is 4–7 sentences (lifted from prior 4–6). `partnershipRead` is 3–5 sentences (lifted from prior 3–4). The Classical Master in particular benefits from room to develop an arc; tighter voices can still operate at the lower end of the range. Total output target: 350–550 words.

---

## 6. Quick Start Page Integration (PRIMARY PLACEMENT)

The Quick Start page (`ydj-quickstart-map.html`) is the new rider's home. First Light lives here as the centerpiece AI moment of the new-rider experience. It is not in the dashboard's AI Coaching block until after graduation.

### 6.1 Card states on Quick Start

The First Light card has seven possible states. The page renders the appropriate card based on Firestore state.

#### State A: Not Yet Eligible

Shown when rider profile is incomplete OR no horse profile is complete.

```
✦ Your First Light

Your first reading from your coaches — generated from
everything you share. To unlock First Light, complete:

  ○ Your Rider Profile
  ○ At least one Horse Profile

The richer your input, the richer your First Light.
```

Items with ✓ are complete; items with ○ are not yet complete. Updates live as profiles complete.

#### State B: Eligible, No Reflections Started

Both eligibility conditions met. No `first-light-entry` reflections exist yet.

```
✦ Your First Light awaits

A first read of you and [Horse Name] from your coaches.

To get there, you'll write six short reflections — one for
each category. They'll be saved to your reflection record
and count toward your first six reflection categories. Plan
on 10–15 minutes.

  [ Begin My First Light → ]

The richer your reflections, the richer your First Light.
```

Click routes to the wizard.

#### State C: Wizard In Progress

Some but not all 6 First Light reflections exist.

```
✦ Your First Light — [N] of 6 reflections complete

  ●●●○○○

You're [N] of 6 reflections in. When you're done, your
First Light will be ready to generate.

  [ Continue My First Light → ]
```

Click resumes the wizard at the next incomplete reflection.

#### State D: All 6 Reflections Complete, Not Yet Generated

Six First Light reflections exist; `firstLight/current` does not.

```
✦ Your First Light is ready to generate

Your six reflections are complete. Your First Light will
draw on:

  ✓ Your Rider Profile
  ✓ [Horse Name] (Horse Profile)
  ✓ 6 of 6 reflection categories
  ○ Post-Ride Debriefs — [N] logged
  ○ Self-Assessments — [N] of 3 completed

  [ Generate My First Light → ]

Adding debriefs or self-assessments before generating
gives your coaches more to work with — but you can also
generate now and regenerate once after adding more.
```

The button calls `generateFirstLight`. Loading state with phase messages: "Reading your journey…" then "Hearing from your coaches…" — minimum 2.5s display time.

#### State E: Generating (and Regenerating)

Use the **YDJ horse-and-rider loading animation** (the project's standard loader). Claude Code should reference the canonical YDJ loading CSS — not the placeholder emoji loader from `ydj-first-glimpse.html`.

**Required structural elements** around the YDJ loader:

```html
<div class="loading-screen" id="firstLightLoadingScreen">
  <!-- YDJ horse-and-rider loader markup goes here -->
  <h2 class="loading-title">[phase title]</h2>
  <p class="loading-sub">[phase subtitle]</p>
  <div class="loading-messages">
    <p class="loading-msg" id="firstLightLoadingMsg">[rotating message]</p>
  </div>
</div>
```

Typography: Playfair Display for `.loading-title`, Work Sans for `.loading-sub` and `.loading-msg`. Match parchment background and ink text color to the rest of First Light.

**Phase content (generate):**

| Phase | Title | Subtitle | Rotating messages (cycle every 1.8s) |
|---|---|---|---|
| 0–2.5s | Reading your journey… | Your six reflections, your profile, and your horse are being woven together. | "Listening to what you've shared…" → "Choosing the voice that will serve you…" |
| 2.5s–end | Hearing from your coaches… | They have been waiting for this moment. | "Drafting your First Light…" → "Almost there…" |

**Phase content (regenerate):**

| Phase | Title | Subtitle | Rotating messages |
|---|---|---|---|
| 0–2.5s | Re-reading your journey… | Your coaches are picking up everything you've added since. | "Listening for what's new…" → "Weighing the new alongside the old…" |
| 2.5s–end | Hearing from your coaches again… | A sharper read is coming. | "Drafting your refreshed First Light…" → "Almost there…" |

**Minimum display time:** 2.5s for generate, 2.0s for regenerate, even if the API returns faster. The moment matters; do not flash past it.

**Failure state:** if API returns an error or parse fails, replace the loading screen with a soft error: "Something didn't quite come through. Try again?" + retry button. Do not surface raw API error messages to the rider.

#### State F: Generated, Regenerate Available

`firstLight/current` exists; `regeneratedAt` is null; rider has not graduated.

```
✦ Your First Light
   Generated [date] · Voice: [Primary Voice Name]

  [ View My First Light → ]

  ─────────────────────────────────────────

  Adding more data — debriefs, additional reflections, or
  self-assessments — sharpens your First Light. You have
  one regenerate available.

  [ Regenerate My First Light → ]
```

Regenerate is always shown if available — there is no time window or "qualifying entry" gate. The encouragement to add more data is the pedagogy.

#### State G: Generated, Regenerate Used

`firstLight/current` exists; `regeneratedAt` is not null.

```
✦ Your First Light
   Generated [date] · Voice: [Primary Voice Name]

  [ View My First Light → ]
```

After graduation, this card moves to the dashboard archive (per §7).

### 6.2 Placement on Quick Start

Place the First Light card **at the top of the Quick Start page**, above the journey map visualization. First Light is the destination toward which the early steps build — surfacing it as the headline orients the rider. The journey map sits below as the navigation aid.

Visual treatment uses the existing Quick Start design tokens: parchment background, gold (#b8862a) for the ✦ symbol and primary buttons, ink for body text. Render at a larger, more prominent scale than journey map nodes — this is the headline.

### 6.3 Quick Start map node

Add First Light as a **terminus node** in the journey map visualization. Mark it visually distinct from data-entry nodes — gold accent, larger size — to signal "this is what you're building toward." Position it before the Multi-Voice Coaching threshold marker.

### 6.4 Graduation transition

When `firstLight/current.graduatedAt` is set:

- The rider graduates from Quick Start (per `QuickStartMap_Implementation_Brief.md`)
- The First Light card relocates to the dashboard's "Your Journey So Far" archive section
- The Quick Start page either redirects to dashboard or shows a celebratory "You've graduated" view

---

## 7. Dashboard Integration (POST-GRADUATION)

First Light does **not** appear in the dashboard's primary AI Coaching block during the pre-graduation period. Pre-graduation it lives on Quick Start. Post-graduation it moves to a "Your Journey So Far" archive.

### 7.1 Archive section

Add a "Your Journey So Far" section to `ydj-dashboard-v4.html`, positioned below the active AI Coaching block.

```html
<section class="dm-block journey-archive">
  <h3 class="dm-block-title">Your Journey So Far</h3>
  <div class="dm-cards">
    <a href="first-light.html" class="dm-card archived"
       style="border-left-color: var(--c-firstlight, #D4A017)">
      <div class="dm-icon">✦</div>
      <div class="dm-text">
        <div class="dm-label">First Light</div>
        <div class="dm-desc">Your starting point — [date]</div>
      </div>
      <div class="dm-arrow">→</div>
    </a>
  </div>
</section>
```

### 7.2 Navigation entry

In the navigation revision (per `YDJ_NavRevision_DashboardViz_Implementation_Brief.md`), add First Light to the AI Coaching dropdown as a "Beginnings" subsection, post-graduation only:

```
**AI Coaching ▾**
— Your Insights —
✦   Weekly Focus
🗺  Journey Map
🎯  Multi-Voice Coaching
🧠  Grand Prix Thinking
🌿  Physical Guidance
— Beginnings —
✦   First Light
```

Pre-graduation, omit "Beginnings" entirely; First Light is reached only via Quick Start.

### 7.3 First Light viewer page

Create `first-light.html`. Layout:

- Header: "Your First Light" + subtitle "Generated [date]" + voice badge for primary voice
- Section 1: `riderRead` rendered as paragraph, primary voice attribution
- Section 2: `partnershipRead` rendered as paragraph, primary voice attribution
- Section 3: "Your other coaches are listening too" — three small cards, one per voice in `otherVoices`
- Section 4: `whereWeBegin` styled as a soft pull-quote
- Footer (pre-graduation, regenerate available): Encouragement message: "Your First Light reflects what you've shared so far. As you log debriefs, more reflections, and self-assessments, your full coaching arc unfolds. You have one regenerate available — use it when you've added enough new material that you want to hear from your coaches again." + [ Regenerate ] button
- Footer (pre-graduation, regenerate used): "Your First Light reflects what you've shared so far. Your full coaching arc unlocks at 5 debriefs and reflections in all six categories. You're [N]/5 debriefs and [M]/6 categories so far."
- Footer (post-graduation): "Multi-Voice Coaching has unfolded from this beginning. View your current Multi-Voice →"

Design tokens: Playfair Display for headings, Work Sans for body, Parchment background, voice-specific accent colors for the badge.

Color token: `--c-firstlight: #D4A017` (gold, matching Quick Start gold and the brand's illumination theme).

---

## 8. The Prompt

The prompt below is the complete template. Variables in `[brackets]` are injected at API call time. Sections marked "if present" are conditionally included.

````
You are an AI coach for Your Dressage Journey (YDJ), an AI-powered learning acceleration platform for serious adult amateur dressage riders. The platform's tagline is "Illuminate Your Journey."

This rider has just completed their First Light entry — their rider profile, at least one horse profile, and six reflections, one for each category. They are about to receive their First Light, the inaugural coaching artifact. This is the first time they hear from any of the four coaching voices in the platform. This moment matters enormously for trust and engagement.

═══ EARLY-JOURNEY MODE — ACTIVE ═══

This rider has logged [N] debriefs and 6 First Light reflections, plus [M] additional reflections logged after First Light entry. They are within their first [X] days on the platform.

DO NOT:
- Reference patterns, trends, or recurring themes across multiple entries — you do not have enough data to claim them
- Make claims about the rider's tendencies, habits, or what they "usually" do
- Suggest connections across multiple rides as established truth
- Reference horses, people, movements, trainers, or events not explicitly named in the rider's submitted data
- Generate full coaching arcs designed for accumulated pattern data
- Hallucinate movement names, exercises, or examples not grounded in the rider's stated level

DO:
- Reference exactly what the rider shared, naming specifics: horse name, why they ride, stated goals, learning style
- Quote or echo the rider's own language from reflections where it fits naturally
- Identify ONE meaningful through-line that connects two specific things the rider said — not a pattern claim, a single observation drawing a line between two reflections
- Speak to the present moment of beginning
- Acknowledge that you are just beginning to know them — this is a feature, not a deficit
- Stay grounded in the rider's actual words

═══ THE FOUR COACHING VOICES ═══

Voice 0 — The Classical Master: "Why not the first time?" Wise, patient, occasionally poetic. Speaks in long arcs. Roots advice in classical principles. Poetic does not mean ornate — it means precise enough to resonate.

Voice 1 — The Empathetic Coach: "You've got this." Warm, validating, perceptive. Honors the emotional reality of riding and the courage required.

Voice 2 — The Technical Coach: "Did you feel that?" Clear, specific, biomechanical. Cause-and-effect oriented. Position and feel.

Voice 3 — The Practical Strategist: "Be accurate!" Forward-looking, structured, goal-oriented. Maps the path.

═══ VOICE SELECTION — CHOOSE ONE PRIMARY ═══

Read the rider's stated goals, learning style, why they ride, and especially their six reflections. Choose the primary voice using these signals:

- Strong competition focus, structured timeline goals, explicit qualifying targets, planning language → The Practical Strategist
- Classical principles language, "the why," "training scale," "foundations," mastery orientation, references to classical concepts (the box, throughness, the training scale, allowing, schwung, durchlässigkeit) → The Classical Master
- Confidence/trust/emotional language, partnership-centric goals, characteristic self-talk patterns, connection-category dominance → The Empathetic Coach
- Cause-and-effect language, biomechanical curiosity, position-focused growth areas, "feel" curiosity, body-awareness framing → The Technical Coach

Default to The Empathetic Coach if signals are mixed or weak — a warmer on-ramp serves a brand-new rider better than the Classical Master's gravitas.

═══ RIDER DATA ═══

Name: [riderProfile.firstName] [riderProfile.lastName]
Why they ride dressage: [riderProfile.whyDressage]
Long-term goals: [riderProfile.longTermGoals]
Current riding level: [riderProfile.currentLevel]
Training time per week: [riderProfile.trainingTime]
Learning style: [riderProfile.learningStyle]
Competition history: [riderProfile.competitionHistory]
Training context: [riderProfile.trainingContext]
Trainer information: [riderProfile.trainerInfo if present, else "Not shared"]

═══ HORSE DATA ═══

Primary horse: [horse.name], [horse.breed], age [horse.age], [horse.level]
What is special about this horse: [horse.special]
History with rider: [horse.history if present, else "Not shared"]
Current partnership focus or challenges: [horse.challenges if present, else "Not shared"]

[If multiple horses: "The rider also rides: [otherHorse1.name], [otherHorse2.name]."]

═══ FIRST LIGHT REFLECTIONS ═══

Personal Milestone:
  Prompt: [prompt text]
  Rider wrote: [mainReflection]
  Feeling: [feeling] · Influence: [influence]

External Validation:
  Prompt: [prompt text]
  Rider wrote: [mainReflection]
  Feeling: [feeling] · Influence: [influence]

Aha Moment:
  Prompt: [prompt text]
  Rider wrote: [mainReflection]
  Feeling: [feeling] · Influence: [influence]

Obstacle:
  Prompt: [prompt text]
  Rider wrote: [mainReflection]
  Strategy: [obstacleStrategy]
  Feeling: [feeling] · Influence: [influence]

Connection:
  Prompt: [prompt text]
  Rider wrote: [mainReflection]
  Feeling: [feeling] · Influence: [influence]

Feel & Body Awareness:
  Prompt: [prompt text]
  Rider wrote: [mainReflection]
  Feeling: [feeling] · Influence: [influence]

═══ ADDITIONAL DATA (if present from regenerate) ═══

[If regenerate context: include any debriefs logged since First Light entry, with date and key fields]
[If regenerate context: include any additional reflections logged since First Light entry]
[If regenerate context: include any self-assessments completed since First Light entry]
[If first generation: omit this section entirely]

═══ YOUR TASK ═══

Write the rider's First Light. Output as valid JSON with EXACTLY this structure:

{
  "primaryVoice": "classical" | "empathetic" | "technical" | "strategic",
  "riderRead": "...",
  "partnershipRead": "...",
  "otherVoices": [
    { "voice": "...", "message": "..." },
    { "voice": "...", "message": "..." },
    { "voice": "...", "message": "..." }
  ],
  "whereWeBegin": "..."
}

SECTION SPECIFICATIONS:

riderRead: 4–7 sentences in the primary voice. Address the rider by first name. Synthesize across rider profile and the six reflections. Reference specifics, not generalities. Identify ONE meaningful through-line that connects two specific things the rider said. Weave the rider's own language in where it fits.

partnershipRead: 3–5 sentences in the same primary voice. Reference the horse by name. If multiple horses, lead with primary, briefly acknowledge others by name in one sentence.

otherVoices: An array of three objects. Each is one of the three voices NOT chosen as primary, in voice-number order (0, 1, 2, 3 minus the primary). Each `message` is approximately 2 sentences. Each voice introduces what they will be watching for in this rider's data, grounded in something specific the rider shared.

whereWeBegin: 1–2 sentences in the primary voice. Not homework. A frame for what the rider could carry into their next ride or first regular reflection. Often the most powerful place to draw a line between two of the rider's reflections.

OUTPUT CONSTRAINTS:

- Total length across all sections: 350–550 words
- No markdown formatting in the output text — no headers, no bullets, no bold, no italics
- No coaching voice catchphrases recited verbatim — voices demonstrate character, they do not announce it
- Reference horse name(s) accurately — fabricating a horse name is catastrophic and breaks rider trust
- Reference movements only at the rider's stated level
- For PSG riders: 8m voltes (not 10m circles), half-pirouettes (not full), 3-tempi and 4-tempi changes only
- Do not skip Inter II when discussing progression beyond Inter I
- Approved trainer/author references (use only if naturally fitting): Mary Wanless, Alois Podhajsky, Charles de Kunffy, Kyra Kyrklund, Jane Savoie, Beth Baumert, Sally Swift, Susanne von Dietze, Reiner Klimke, Ingrid Klimke

Output ONLY the JSON object. No preamble, no markdown code fences, no explanation before or after.
````

---

## 9. Firestore Schema

### 9.1 First Light document

**Path:** `riders/{userId}/firstLight/current`

```
{
  generatedAt: Timestamp,
  primaryVoice: "classical" | "empathetic" | "technical" | "strategic",
  sections: {
    riderRead: string,
    partnershipRead: string,
    otherVoices: [
      { voice: string, message: string },
      { voice: string, message: string },
      { voice: string, message: string }
    ],
    whereWeBegin: string
  },
  inputs: {
    riderProfileSnapshotAt: Timestamp,
    horseIds: [string],
    firstLightReflectionIds: [string],  // the original 6 — set on first generation, immutable
    additionalReflectionIdsIncluded: [string],  // populated only on regenerate
    debriefIdsIncluded: [string],  // populated only on regenerate
    assessmentsIncluded: {
      technical: boolean,
      physical: boolean,
      riderSelf: boolean
    }
  },
  regeneratedAt: Timestamp | null,
  graduatedAt: Timestamp | null,
  tokenUsage: {
    inputTokens: number,
    outputTokens: number,
    estimatedCostUSD: number
  },
  modelVersion: string,
  generationCount: number  // 1 on first generation, 2 after regenerate
}
```

### 9.2 Reflection documents (existing schema, no changes)

First Light reflections write to the existing reflections collection at:

`riders/{userId}/reflections/{reflectionId}`

with the standard reflection schema plus `source: "first-light-entry"` to distinguish them. No new collection, no schema changes — these are just reflections that happen to come from a structured wizard.

### 9.3 History (regenerate archive)

**Path:** `riders/{userId}/firstLight/history/{autoId}`

When regenerated, the prior `current` document is copied to history with `archivedAt: Timestamp`. Schema otherwise identical.

### 9.4 Firestore rules

```
match /riders/{userId}/firstLight/{docId} {
  allow read: if request.auth.uid == userId;
  allow write: if false;  // Cloud Function only
}

match /riders/{userId}/firstLight/history/{historyId} {
  allow read: if request.auth.uid == userId;
  allow write: if false;
}
```

Reflection rules unchanged — First Light reflections inherit existing reflection security.

### 9.5 Onboarding flags (new collection)

**Path:** `riders/{userId}/onboardingFlags/state`

```
{
  firstReflectionIntroShownAt: Timestamp | null
  // future onboarding flags can be added here as additional fields
}
```

A single document holds all onboarding flags rather than separate documents per flag — keeps onboarding state in one place and avoids Firestore read-cost scaling with flag count.

**Firestore rules:**

```
match /riders/{userId}/onboardingFlags/{docId} {
  allow read, write: if request.auth.uid == userId;
}
```

Client write is allowed (unlike the firstLight collection) because flag-setting is a UI side-effect of the rider clicking through the intro — no AI cost or sensitive write involved.

---

## 10. Cloud Functions

### 10.1 `generateFirstLight` (callable)

**Invocation:** Client calls when rider clicks "Generate My First Light" on Quick Start.

**Logic:**

```
1. Authenticate rider; reject if not authenticated
2. If firstLight/current already exists → return existing document (idempotent)
3. Verify riderProfile exists and is complete; reject if not
4. Verify ≥1 horse profile exists and is complete; reject if not
5. Query reflections collection for source === "first-light-entry"
   - Verify exactly 6 exist
   - Verify all 6 categories represented
   - Reject with specific error if any missing
6. Build prompt from:
   - rider profile
   - all horse profiles (primary first)
   - the six First Light reflections (full text + feeling + influence + obstacleStrategy if present)
7. Call Anthropic API (Sonnet, max_tokens 1500)
8. Parse JSON response; validate structure
   - All four sections present
   - primaryVoice ∈ {classical, empathetic, technical, strategic}
   - otherVoices length === 3
9. Write to firstLight/current with:
   - generationCount: 1
   - inputs.firstLightReflectionIds: [the 6 IDs]
   - all other inputs fields populated
10. Return generated document to client
11. On API error: surface error to client; allow retry; do not write partial state
12. On parse failure: log to error tracking with response text; surface generic error; allow retry
```

### 10.2 `regenerateFirstLight` (callable)

**Invocation:** Client calls when rider clicks "Regenerate My First Light."

**Logic:**

```
1. Authenticate rider
2. Read firstLight/current; reject if does not exist
3. Reject if regeneratedAt is not null (already regenerated)
4. Reject if graduatedAt is not null (graduated, regenerate unavailable)
5. Copy current document to history/{autoId} with archivedAt
6. Build prompt with current data:
   - rider profile (current state)
   - horse profiles (current state, all)
   - the original 6 First Light reflections (preserved IDs from inputs.firstLightReflectionIds)
   - any reflections added since First Light entry (new IDs, populate additionalReflectionIdsIncluded)
   - any debriefs logged (populate debriefIdsIncluded)
   - any self-assessments completed (populate assessmentsIncluded)
7. Call Anthropic API
8. Parse, validate, write to current with:
   - generationCount: 2
   - regeneratedAt: server timestamp
   - inputs.firstLightReflectionIds: unchanged from generation 1
   - other inputs fields updated to reflect current state
9. Return regenerated document to client
```

### 10.3 `graduateFirstLightOnThresholdCross` (Firestore trigger)

**Trigger:** Firestore `onWrite` on `riders/{userId}/debriefs/{debriefId}` and `riders/{userId}/reflections/{reflectionId}`

**Logic:**

```
1. Read firstLight/current
2. If does not exist or graduatedAt is not null → exit
3. Count debriefs (≥5) and reflections by category (all 6 categories present)
4. If both thresholds met:
   a. Set firstLight/current.graduatedAt to current timestamp
   b. Trigger Multi-Voice Coaching generation (existing pipeline)
   c. Trigger UI notification: "Your journey has unfolded — Multi-Voice Coaching is ready"
   d. Quick Start page transitions rider to graduated state
```

### 10.4 First Light reflection saves (use existing reflection-save infrastructure)

The wizard's "Save & Continue" calls the existing reflection-save path used by the regular reflection form. The only difference is the `source: "first-light-entry"` flag and the fact that the prompt is hard-coded rather than rider-selected. No new Cloud Function needed — the existing `aggregateReflections()` aggregator runs automatically on save and treats these reflections the same as any other reflection.

---

## 11. The First Regular Reflection — One-Time Intro

After First Light is generated, the next time the rider opens the regular reflection form, a one-time intro overlay frames the transition from structured onboarding to weekly rhythm. This single moment explains the three new fields the rider will encounter (Step 0: confidenceTrend, themeWord, scoreTakeaway) and sets expectation that the weekly reflection becomes routine.

### 11.1 Trigger

Show the intro when **all three** are true:

1. `firstLight/current` exists (any state — generated, regenerated, or graduated)
2. No reflections exist where `source !== "first-light-entry"` — the rider has not yet logged a regular reflection
3. `riders/{userId}/onboardingFlags/firstReflectionIntroShownAt` does not exist

After the rider clicks through, write `firstReflectionIntroShownAt: serverTimestamp()` to that document. The intro never shows again.

### 11.2 Where it lives

The intro overlay is rendered by the regular reflection form (current reflection form file) — **not** by Quick Start, **not** by First Light viewer. It appears when the rider opens the regular reflection form for the first time post-First-Light.

### 11.3 Content

Soft modal overlay above the reflection form, using the same parchment / Playfair Display / Work Sans treatment as First Light. Skippable only by clicking the button — no X close, no click-outside-to-dismiss. The rider should encounter the framing once.

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│                       ✦                              │
│                                                      │
│   Welcome to your weekly reflection rhythm           │
│                                                      │
│   Your First Light is done. From here, your          │
│   reflections become weekly — one at a time, in      │
│   the category that's calling you.                   │
│                                                      │
│   You'll notice three new questions before each      │
│   reflection:                                        │
│                                                      │
│     · How is your confidence trending this week?     │
│     · What word captures the week so far?            │
│     · A score or takeaway from a recent ride         │
│                                                      │
│   These take a minute to answer and only appear      │
│   once per week — your second reflection in the      │
│   same week picks them up automatically. They give   │
│   your coaches the weekly frame they need to read    │
│   what you write.                                    │
│                                                      │
│         [ Begin my first weekly reflection → ]       │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 11.4 Implementation

- On regular reflection form load, check the trigger conditions per §11.1
- If all three true: render the modal overlay above the reflection form
- On button click:
  - Write `firstReflectionIntroShownAt: serverTimestamp()` to `riders/{userId}/onboardingFlags`
  - Dismiss the overlay
  - The reflection form continues normally — Step 0 (weeklyContext) appears as designed for the first reflection of the week

### 11.5 Out of scope

- Re-showing the intro under any condition. The intro fires at most once, period.
- A similar intro for the rider's first debrief. Debriefs do not have a Step 0 equivalent.
- Coupling the intro to graduation. The intro is about the transition from First Light entry to weekly rhythm — independent of when Multi-Voice Coaching unlocks.
- Showing the intro on Quick Start. The intro is contextual to the reflection form moment.

---

## 12. Pilot-to-Paid Bonus Generation

When pilots convert to paid subscribers on June 1, generate First Light for each using their accumulated profile + horse + reflection + debrief + self-assessment data. Pilots will not have done the First Light entry wizard — their existing reflections substitute.

**Implementation:**

- Admin-triggered batch job (not automatic on conversion)
- For each pilot: select their 6 most recent reflections covering the most categories possible (one per category preferred; if a category is empty, the AI works without it)
- Build prompt with those 6 reflections labeled as "the rider's reflections so far" (not "First Light reflections")
- Pilot First Light has `inputs.pilotConversion: true` flag
- These pilots' First Lights will be richer than new-subscriber First Lights — they have weeks of data
- Estimated total cost: ~$0.40 across all 12 pilots

This is a one-time event. Do not build infrastructure to repeat it.

---

## 13. Token Budget & Cost

| Metric | Estimate |
|---|---|
| Input tokens per generation (profile + horse + 6 reflections) | 2,500–4,000 |
| Input tokens per regenerate (profile + horse + 6 reflections + accumulated data) | 4,000–7,000 |
| Output tokens per call | 800–1,000 |
| Estimated cost per generation (Sonnet) | $0.020–0.030 |
| Estimated cost per regenerate (Sonnet) | $0.030–0.050 |
| Maximum cost per rider lifetime | ~$0.08 (one generate + one regenerate) |
| Pilot conversion batch (12 riders) | ~$0.40 total |
| Projected monthly cost at 100 new subscribers (avg generate + 50% regenerate) | ~$4–5 |

**Tier accounting:** First Light cost is allocated outside the per-user monthly token budget cap. Document this carve-out in the cost-tracking spreadsheet.

---

## 14. Validated Design Decisions (from prototyping)

These choices were tested via real-data prototype (Apr 2026) and are confirmed:

1. **Six reflections is the right input size.** Voice signals from rider profile + horse profile alone are not strong enough for confident voice selection. The reflections do the heavy lifting on voice. Without them, default-to-Empathetic would fire too often and Classical Master / Strategist riders would get lukewarm output. Six reflections is also the natural alignment with the Multi-Voice threshold's six-category requirement.

2. **The pre-selected prompts work.** Direct phrasing (vs. coaxing) produces substantive responses. Riders who care enough to subscribe care enough to write substantive answers.

3. **The four-section output structure holds.** riderRead, partnershipRead, otherVoices (3), whereWeBegin produced a coherent, emotionally-resonant artifact that demonstrated the platform's voice and value.

4. **The "one through-line" rule (not pattern claims) is the right guardrail.** Drawing a single line between two specific reflections lands as insight, not over-reach. Multi-pattern claims would require longitudinal data the AI doesn't have.

5. **The whereWeBegin section benefits from connecting reflections.** The strongest closes draw a line between two reflections — typically Connection × Obstacle, or Aha × Body. The prompt now codifies this as a preference.

6. **Sentence ceiling of 7 (riderRead) and 5 (partnershipRead) is correct.** Particularly for the Classical Master, whose voice opens up with a bit more breath. Tighter voices still operate at the lower end.

7. **No catchphrases verbatim.** "Why not the first time?" should not appear in output text — voices demonstrate character through phrasing, not by quoting their own taglines.

---

## 15. Implementation Checklist

### Backend

- [ ] Create callable Cloud Function `generateFirstLight` per §10.1
- [ ] Create callable Cloud Function `regenerateFirstLight` per §10.2
- [ ] Create Firestore-trigger Cloud Function `graduateFirstLightOnThresholdCross` per §10.3
- [ ] Implement prompt builder helper that injects rider/horse/reflection/debrief/assessment data per §8
- [ ] Implement JSON response parser with validation
- [ ] Add Firestore security rules per §9.4 (firstLight) and §9.5 (onboardingFlags)
- [ ] Add `firstLight/current` and `firstLight/history` to Download My Data export
- [ ] Verify First Light reflections export correctly via existing reflection export path

### Quick Start page

- [ ] Build First Light card with seven states per §6.1
- [ ] Wire eligibility detection: live updates from rider profile + horse profile completion
- [ ] Wire reflection-count detection: live updates from `source === "first-light-entry"` reflection count
- [ ] Build the six-reflection wizard per §3.3 (one screen per category, pre-selected prompts)
- [ ] Wire wizard "Save & Continue" to existing reflection-save path with `source: "first-light-entry"` flag
- [ ] Implement wizard resumability — opens at next incomplete reflection
- [ ] Implement wizard edit behavior — re-saving an existing First Light reflection updates rather than duplicates
- [ ] Wire generate button to `generateFirstLight` callable
- [ ] Wire regenerate button to `regenerateFirstLight` callable
- [ ] **Implement loading state per §6.1 State E** — use the canonical YDJ horse-and-rider loading animation (Claude Code: confirm the correct asset path with Barb)
- [ ] **Implement loading phase content per §6.1 State E** — separate copy for generate vs. regenerate; minimum display 2.5s / 2.0s respectively
- [ ] **Implement loading failure state** — soft retry message, no raw API errors surfaced
- [ ] Add First Light terminus node to journey map visualization per §6.3
- [ ] Verify graduation transition behavior per §6.4

### Reflection form (one-time intro)

- [ ] **Add intro overlay logic to the regular reflection form per §11**
- [ ] **Implement trigger check on form load** — three conditions per §11.1
- [ ] **Render modal overlay with content per §11.3** — same parchment / typography treatment as First Light
- [ ] **Wire button click** — write `firstReflectionIntroShownAt` to onboardingFlags, dismiss overlay, continue to reflection form normally
- [ ] **Verify the intro never re-shows** even if the rider deletes their first regular reflection

### Dashboard

- [ ] Add "Your Journey So Far" archive section to `ydj-dashboard-v4.html` per §7.1
- [ ] Add First Light card to archive (renders only when `graduatedAt` is set)
- [ ] Update nav per §7.2 (Beginnings subsection appears post-graduation only)
- [ ] Create `first-light.html` viewer page per §7.3, including three footer states

### Email / notification

- [ ] Configure email: "Your First Light is waiting — three more reflections to go" — fires at day 7 of incomplete-wizard state, once
- [ ] Configure email: "Your First Light is ready to generate" — fires when all 6 reflections complete but generate button untouched for 3 days, once
- [ ] No email at generation time (the in-app moment is the moment)

### Admin

- [ ] Add admin console view: list First Light generations with token usage and cost per rider
- [ ] Add admin manual-trigger button for pilot conversion batch (per §11)
- [ ] Add cost spot-check to month-3 pilot review

### Testing

- [ ] Test wizard: complete all 6 reflections in one sitting
- [ ] Test wizard: complete 3, exit, return next day, complete remaining 3
- [ ] Test wizard: edit an already-saved First Light reflection — verify update not duplicate
- [ ] Test wizard: 6 reflections appear in rider's reflection record with correct schema and `source` flag
- [ ] Test wizard: 6 reflections count toward Multi-Voice threshold
- [ ] **Test loading state: loading horse animates, phase messages cycle, minimum display time honored on fast API responses**
- [ ] **Test loading failure: soft retry message appears, button retries cleanly**
- [ ] Test generation: all 6 reflections required (reject if missing one)
- [ ] Test generation: voice selection across 5 distinct rider profile types
- [ ] Test generation: PSG-level rider output for level-correct movement references
- [ ] Test generation: horse name accuracy across 5 sample profiles (Data Integrity Guardrail)
- [ ] Test regenerate: includes new debriefs and reflections logged after First Light
- [ ] Test regenerate: blocked after first regenerate
- [ ] Test regenerate: blocked after graduation
- [ ] Test graduation: triggers when 5 debriefs + all 6 categories met
- [ ] Test graduation: First Light moves to dashboard archive
- [ ] Test JSON parse validation: malformed response, missing section, wrong primaryVoice value
- [ ] Test threshold acceleration: rider who completes wizard has 6/6 categories immediately
- [ ] **Test intro overlay: appears on first regular reflection form open after First Light**
- [ ] **Test intro overlay: does not appear on second regular reflection (flag set)**
- [ ] **Test intro overlay: does not appear before First Light is generated**
- [ ] **Test intro overlay: does not re-appear if rider deletes their first regular reflection**
- [ ] Verify the pre-graduation footer counter on `first-light.html` updates as debriefs accumulate

---

## 16. Out of Scope

- Auto-generation on profile completion. Generation is rider-requested.
- Manual user-triggered generation beyond the one allowed regenerate.
- Email delivery of First Light content. The artifact lives in the app.
- Voice-by-voice "Tell me more" expansion within First Light. That is Multi-Voice Coaching territory.
- PDF export of First Light.
- Multilingual output. English only at launch.
- Sharing First Light externally.
- Integration with Weekly Coach Brief.
- Adjusting voice selection logic post-launch. Defer until at least 50 First Lights have been generated and reviewed.
- Allowing the rider to choose alternate prompts during First Light entry. Pre-selected prompts are intentional design; the four-voice mechanic depends on the specific signal these prompts elicit.
- Including weeklyContext (Step 0) fields during First Light entry. Surfaces naturally on the rider's first regular reflection.

---

## 17. Reference Files

- `ydj-quickstart-map.html` — primary placement target; design tokens and card patterns
- `QuickStartMap_Implementation_Brief.md` — Quick Start architecture and graduation behavior
- `ydj-first-glimpse.html` — source of the 6 reflection prompts (simplified for First Light) and JSON parsing approach
- `YDJ_ReflectionForm_Changes.md` — current reflection schema (`mainReflection`, `feeling`, `influence`, `obstacleStrategy`, prompt structure)
- `ydj-dashboard-v4.html` — post-graduation archive section target
- `rider-profilev2.html` — source field names for rider data injection
- `horse-profileV2.html` — source field names for horse data injection
- `technical-philosophical-self-assessment.html` — assessment field names (used in regenerate)
- `physical-self-assessment_v2.html` — assessment field names (used in regenerate)
- `YDJ_NavRevision_DashboardViz_Implementation_Brief.md` — nav structure post-graduation
- `YDJ_AI_Coaching_Voice_Prompts_v3.md` — authoritative voice descriptions
- `YDJ_Level_Progression_Guardrails.md` — required guardrails (PSG, Inter I/II, etc.)
- `YDJ_Complete_AI_Prompt_Reference.md` — broader prompt conventions
- `CLAUDE.md` — project conventions

---

## 18. Summary of Changes from v2

- **Entry mechanism is now a six-reflection wizard** with pre-selected prompts (was: generate from existing data alone)
- **The six wizard reflections save to the rider's reflection record** with `source: "first-light-entry"` — they count toward Multi-Voice threshold
- **Refresh model replaced with regenerate model** — one regenerate, available until graduation, no time window, no qualifying-entry rule
- **Sentence ceilings lifted** — riderRead 4–7 (was 4–6), partnershipRead 3–5 (was 3–4), word target 350–550 (was 350–500)
- **Encourage-data-accumulation messaging codified** in three places: Quick Start eligibility card, Quick Start "ready to generate" card, First Light viewer footer
- **New section §14: Validated Design Decisions** from real-data prototyping
- **Quick Start card states expanded to 7** (was 5) to cover wizard-in-progress
- **Pilot conversion handling clarified** — pilots use existing reflections, not the wizard
- **`weeklyContext` (Step 0) explicitly skipped** during First Light entry
- **Email cadence revised** — wizard-incomplete email at day 7; ready-to-generate email at day 3 of inactivity; no generation-celebration email
- **Loading state spec'd in detail** (§6.1 State E) — uses the canonical YDJ horse-and-rider loading animation; separate phase content for generate vs. regenerate; minimum display times; soft failure handling
- **New §11: First Regular Reflection one-time intro** — modal overlay that appears the first time the rider opens the regular reflection form post-First-Light, framing the transition to weekly rhythm and explaining Step 0 fields
- **New §9.5: onboardingFlags collection** — single document holding flags including `firstReflectionIntroShownAt`; client-writable since flags are UI side-effects without AI cost

---

*Implementation brief v3 prepared for Claude Code handoff — April 2026, validated via real-data prototype*
