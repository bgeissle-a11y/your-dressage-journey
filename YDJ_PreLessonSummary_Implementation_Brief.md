# YDJ Pre-Lesson Summary — Implementation Brief
## Replaces: Weekly Coach Brief
### April 2026

---

## Overview & Reframe

The Weekly Coach Brief has been reconceived as the **Pre-Lesson Summary** based on
trainer feedback. The insight: coaches don't want more in their inbox, but they
*do* want students who arrive prepared. The Pre-Lesson Summary travels through the
rider's mouth, not the coach's email. The rider reads it in the car or at the barn,
and arrives at the mounting block with a specific, confident answer to "how's it
been going?"

Coach sharing remains available as an opt-in secondary action from the summary
page itself — but it is no longer the primary purpose or the primary delivery
mechanism.

**Route:** `/lesson-prep`
**Nav label:** `Lesson Prep`
**Reference prototype:** `ydj-pre-lesson-summary.html`

---

## Part 1 — Lesson Notes Form: Add Purpose Field

### 1.1 What and Why

Martin Kuhn (GP trainer, Barb's trainer) identified that the most valuable thing a
trainer wants to hear from a student isn't what was worked on — it's whether the
student understood *why* it was worked on. Recall ("we did shoulder-in") is easy.
Understanding ("the purpose was to develop bend before the half-pass direction
change") is what separates a student who attended from a student who learned.

A new optional field is added to `lesson-notes.html` between Bucket 1 (Movement
Instructions) and Bucket 2 (Instructional Cues & Corrections).

### 1.2 Form Change — `lesson-notes.html`

**Location:** After the `movementInstructions` textarea and its char counter,
before the `cuesCorrections` question block.

**Add the following question block:**

```html
<!-- Bucket 1b: Purpose (optional) -->
<div class="question" style="margin-bottom:0; margin-top: 24px;">
  <label for="movementPurpose">
    In your own words — what do you think was the purpose?
    <span class="optional-label">Optional</span>
  </label>

  <div class="prompt-box" id="purposePromptBox">
    <div class="prompt-box-toggle" onclick="togglePromptBox('purposePromptBox')">
      <span>✦ What this means</span>
      <span class="prompt-box-chevron">▼</span>
    </div>
    <div class="prompt-box-body">
      <p>Not what you did — why you did it. One sentence is enough.</p>
      <ul>
        <li>What training problem was the exercise trying to solve?</li>
        <li>What quality in the horse (or you) was it building toward?</li>
        <li>If you're not sure, write your best guess — that's useful data too.</li>
      </ul>
      <p style="margin-top:8px; font-style:italic;">
        Example: "I think the shoulder-in to renvers sequence was about teaching
        me to maintain bend through a direction change, not just set it once and
        hope for the best."
      </p>
    </div>
  </div>

  <div class="voice-input-container">
    <textarea
      id="movementPurpose"
      placeholder="e.g. I think the purpose of the leg yield sequence was to teach him to move away from my leg without getting tense — it's preparation for half-pass..."
      style="min-height: 80px;"
    ></textarea>
    <button type="button" class="voice-btn"
      data-target="movementPurpose" title="Voice input">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
      </svg>
    </button>
    <div class="voice-status" id="movementPurpose-status">Listening...</div>
  </div>
  <div class="char-counter">
    <span id="movementPurposeCount">0</span> characters
  </div>
</div>
```

### 1.3 Firestore Schema Addition

Add `movementPurpose` to the lesson notes Firestore document alongside the
existing fields:

```js
// In the submitForm() save object, add:
movementPurpose: document.getElementById('movementPurpose').value.trim() || null,
```

Field is nullable — if the rider leaves it blank, store `null`, never an empty string.

### 1.4 Char Counter Wiring

Add `movementPurpose` to the existing char counter setup alongside
`movementInstructions` and `cuesCorrections`. Follow the existing pattern in
`setupCharCounter()`.

### 1.5 Prompt Addition — `YDJ_AI_Coaching_Voice_Prompts_v3.md` and `promptBuilder.js`

In the LESSON NOTES AWARENESS block, append after the TAKEAWAYS AS RIDER
PRIORITIES section:

```
MOVEMENT PURPOSE — UNDERSTANDING VS. RECALL:
The lesson notes form includes an optional field where the rider articulates what
she believes the purpose of the lesson's exercises was. This field is the most
diagnostically rich data point in the form. When present:

- A rider who can state the purpose accurately has integrated the lesson at a
  conceptual level — coaching can build on that foundation.
- A rider whose stated purpose diverges from the apparent classical purpose of
  the exercise has a knowledge gap worth addressing gently. The Technical Coach
  and Classical Master are the appropriate voices for this.
- A rider who writes "I'm not sure but I think..." is demonstrating intellectual
  honesty and curiosity — the Empathetic Coach should affirm this as a strength
  of self-awareness, not a deficiency.
- When no purpose is stated, do not infer or supply one. The absence simply
  means the rider hasn't yet articulated it.
```

In `promptBuilder.js`, include `movementPurpose` in the lesson notes context
block passed to the API, alongside `movementInstructions`, `cuesCorrections`,
and `takeaways`. Label it clearly in the assembled prompt:

```
Rider's understanding of purpose: [movementPurpose or "Not provided"]
```

---

## Part 2 — Opening Line: Generation in Multi-Voice Coaching Pass

### 2.1 Why This Pass

The Opening Line is generated during the Multi-Voice Coaching API call as a
fourth field in the Quick Insights block. This is the only correct approach:

- It has full access to all rider data in one context window
- It caches to Firestore alongside Priority This Week, which the Pre-Lesson
  Summary already pulls
- It cannot contradict the coaching outputs because it is generated in the
  same call from the same data
- Zero additional API cost

### 2.2 Prompt Addition — Quick Insights Block

**File:** `YDJ_AI_Coaching_Voice_Prompts_v3.md`
**Location:** In the Quick Insights formatting instruction, after field 3
(THIS WEEK'S CELEBRATION), add field 4:

```
4. OPENING LINE (one sentence, first person, spoken register)

   Write one sentence the rider can say aloud as she walks to warm up.
   It is her answer to "how's it been going?"

   The sentence must be in FIRST PERSON — the rider will speak it, not
   read it. Write as natural speech, not a summary.

   Priority hierarchy for what to include (work down until the sentence
   is specific enough to be useful):
   1. If movementPurpose is present in recent lesson notes: lead with the
      rider's articulated understanding of why the exercise matters.
      This is the highest-value thing a trainer wants to hear.
   2. The current focus area (from Priority This Week) framed as something
      the rider has been working on, not something she needs to do.
   3. The most specific actionable obstacle from recent debriefs — one that
      references a named movement or a lesson exercise.
   4. If a show is within 30 days: one movement or concern she wants to
      discuss, especially any double-coefficient movements flagged in show prep.

   The sentence should demonstrate UNDERSTANDING, not just RECALL.
   Recall: "We worked on the half-halt timing last week."
   Understanding: "We've been working on the half-halt — I think the point
   is that I need to ask and then wait before he responds, instead of
   releasing early, and I want to know if that's what you're seeing."

   Understanding sentences contain: a named exercise or movement, the rider's
   interpretation of its purpose or the challenge within it, and optionally
   an invitation for the trainer's perspective ("and I want to ask you about...").

   The sentence must be confident, not hedged. No "I think maybe..." or
   "I've been kind of...". Specific and direct.

   If show prep data is absent, synthesize from focus + obstacle only.
   If lesson notes are absent, synthesize from debrief data only.
   Never produce a generic sentence. If data is insufficient for a specific
   sentence, omit this field rather than producing a vague one.

   Good examples:
   - "We've been working on the half-halt timing — I think I need to ask
     and actually wait before Benedikt rebalances, instead of releasing
     early, and with Meadowbrook twelve days out I want to talk about
     the submission movements."
   - "The leg yield exercise from last week made him tense when I tried
     it on my own — I think it's because I'm not maintaining the bend
     the way you showed me, and I want to figure out what I'm missing."
   - "I've been focusing on releasing the neck in the extended trot —
     I understand the purpose is to show self-carriage, but I keep
     bracing right before the corner and I don't know why yet."

   Bad examples (do not produce):
   - "I've been working on various things this week including lateral work."
   - "Training has been going well with some challenges to discuss."
   - "I've been thinking a lot about my riding lately."
```

### 2.3 Firestore Field

The Opening Line writes to `quickInsights.openingLine` in the cached Multi-Voice
Coaching document. Verify the actual Quick Insights object field names in the
existing Firestore document before implementing — the field name used in the
prompt must match the field name extracted during brief assembly.

### 2.4 Pre-Lesson Summary Extraction

```js
const openingLine = coachingDoc.data()?.quickInsights?.openingLine || null;
// If null: omit the Opening Line section entirely.
// Do not generate a fallback. A missing Opening Line is better than a
// generic one — it defeats the purpose of the feature.
```

### 2.5 Display in `ydj-pre-lesson-summary.html`

The Opening Line renders in the dark `.opening-line-section` block at the bottom
of the card, in Playfair Display italic. The sub-label reads:
**"Your opening line"** with the note *"— say this as you walk to warm up."*

The disclaimer below the quote reads:
*"Synthesized from your week's entries. Use your own words — this is a
starting point."*

If `openingLine` is null, the entire `.opening-line-section` block is hidden.
Do not show an empty dark block.

---

## Part 3 — Pre-Lesson Summary: Data Sources

All data assembles from existing Firestore collections and cached AI outputs.
No new API call is made for brief assembly.

| Field | Source | Field / Query |
|---|---|---|
| Rider first name | `users/{uid}/riderProfile/profile` | `displayName` (first name only) |
| Horse name(s) | `users/{uid}/horseProfiles` | `name`, active horses |
| Last ride date | `users/{uid}/debriefs` | Latest `timestamp` |
| Rides this month | `users/{uid}/debriefs` | Count where `timestamp >= now - 14d` (label in UI: "Rides (14 days)") |
| Week of | Server-generated | Current Mon–Sun |
| Level + working toward | `users/{uid}/riderProfile/profile` | `currentLevel`, `targetLevel` |
| Trajectory | `analysis/grandPrixThinkingL2/{uid}` | `activePath` → first sentence of `timelineProjection` |
| This week's focus | `analysis/multiVoiceCoaching/{uid}` | `quickInsights.priorityThisWeek` |
| AI coaching insight | `analysis/multiVoiceCoaching/{uid}` | Dominant voice name + 2–3 sentence snippet (second person, rider-facing — no pronoun conversion needed) |
| Opening Line | `analysis/multiVoiceCoaching/{uid}` | `quickInsights.openingLine` |
| Lesson insights (14 days) | `users/{uid}/lessonNotes` | Filter `timestamp >= now - 14d`; extract `takeaways[]` arrays, deduplicated |
| Rider-identified insights — AHAs | `users/{uid}/debriefs` | Filter `timestamp >= now - 14d`; apply relevance filter (see §3.1); field: `ahaRealization` — NOT from reflections |
| Rider-identified insights — Obstacles | `users/{uid}/debriefs` | Filter `timestamp >= now - 14d`; apply relevance filter (see §3.1); field: `challenges` — NOT from reflections |
| Flagged movements | `users/{uid}/showPrepEntries` | Most recent entry; `concerns.flaggedByTest[].flaggedItems[]`; `coeff` boolean for ×2 badge |
| Show name + days out | `users/{uid}/showPrepEntries` | Most recent entry; `showDetails.name`, `showDetails.dateStart` |

### 3.0 Global Data Currency Rule

**All time-windowed data uses a 14-day lookback.** If a data field has no
entries within 14 days, omit that section entirely — do not extend the window
or substitute older data. A summary built on stale data is worse than a shorter
summary built on current data. The Pre-Lesson Summary is a *current state*
document, not a retrospective.

The 14-day rule applies to: lesson insights, AHA moments, obstacles, and debrief
relevance scoring. It does not apply to cached AI outputs (coaching insight,
Opening Line, trajectory) — those are consumed as-is from their most recent
generation regardless of age, since they represent synthesized outputs, not
timestamped events.

### 3.1 AHA and Obstacle Relevance Filter

**Source:** `users/{uid}/debriefs` — the `ahaRealization` and `challenges`
fields. These are NOT from the Reflections collection. Reflections are
backward-looking by design. Debriefs capture immediate post-ride observations —
current, specific, and directly relevant to what the rider will discuss in her
next lesson.

See §2.4 of `YDJ_WeeklyCoachBrief_Implementation_Brief.md` for full scoring
logic. Summary: score each entry by specificity, lesson reference, movement
name, and cause-effect language. Select top 1–2 entries scoring ≥ 2. Entries
scoring below threshold are excluded entirely. When in doubt, omit.

**Special priority for Pre-Lesson Summary:** Entries that reference a lesson
exercise by name score +2 (not +1 as in the coach brief). These are the most
valuable items for a pre-lesson conversation.

---

## Part 4 — Navigation & Access

### 4.1 Primary: Plan Section of Nav

Add `Lesson Prep` to the **Plan** group in the navigation — the same group that
contains Pre-Ride Ritual. Position it immediately above or below Pre-Ride Ritual
(either order is acceptable; confirm with `ydj-dashboard-v4.html` and the nav
revision mockup for the current Plan group structure before committing to order).

Route: `/lesson-prep`
Nav label: `Lesson Prep`
Nav icon: consult existing icon set for a fitting option.

**Weekly Focus is not in the nav.** It is integrated directly into the dashboard.
Do not add Lesson Prep to the top-level nav. Do not place it at the same level
as dashboard-integrated features.

### 4.2 Secondary: Dashboard Card

Add a Lesson Prep card to the dashboard in the Weekly Focus section — alongside
or immediately below the existing Weekly Focus integration. The card displays:

- Section label: **"Lesson Prep"**
- The Opening Line in Playfair Display italic, truncated to 2 lines with ellipsis
- A "Read full summary →" link to `/lesson-prep`

If `openingLine` is null, show a pending state:
*"Complete a few more rides and your lesson prep summary will appear here."*

### 4.3 Weekly Focus Cross-Link

In the Weekly Focus dashboard section, add one text line below the existing
Weekly Focus content:

```
Heading into a lesson? → Prepare for your lesson
```

Styled as a plain text link, not a button or card. This is the natural handoff
point: a rider reviewing her week on the dashboard flows into lesson prep from
there.

### 4.4 Coach Sharing — On-Page, Not in Settings

The coach sharing action lives on `/lesson-prep` itself as the small hint line
below the card (matching the prototype). The Settings page holds the consent
toggle and coach email management, but the *act of sharing* initiates from the
summary. The rider reads the summary, decides to share, taps once.

Rider Settings page must be built before sharing can be activated. Until then,
the share hint link is visible but routes to a "coming soon" modal explaining
the feature.

---

## Part 5 — Conditional Rendering

All sections are conditional. The summary renders gracefully with fewer sections.

| Section | If data absent | Action |
|---|---|---|
| This week's focus | No multi-voice cache | Omit section |
| AI coaching insight | No multi-voice cache or missing fields | Omit section |
| Opening Line block | `openingLine` is null | Hide entire dark block |
| Rider trajectory | No L2 GPT cache | Omit trajectory pill from level strip |
| Lesson insights | No lesson notes in 14 days | Omit section |
| AHAs | No qualifying `ahaRealization` entries in debriefs within 14 days | Omit sub-section |
| Obstacles | No qualifying `challenges` entries in debriefs within 14 days | Omit sub-section |
| AHA + Obstacles two-col | Both absent within 14 days or all entries below quality threshold | Omit two-col entirely |
| Show prep / flagged movements | No show prep entry | Omit section |

**Minimum viable summary:** Rider name, horses, last ride date, rides this month,
level. The Opening Line is the crown of the summary — if it cannot be specific,
it should not appear.

---

## Part 6 — Data Integrity

The Pre-Lesson Summary inherits all guardrails from the Weekly Coach Brief:

- **Verbatim language rule:** Rider-entered text (AHAs, obstacles, lesson
  takeaways) uses the rider's exact words. Truncation at a sentence boundary
  is permitted. Paraphrasing is not.
- **Cached-only AI content rule:** The AI coaching insight and Opening Line
  are extracted from cached outputs only. Never regenerated for this page.
- **Parallel Truth Principle:** Nothing on this page contradicts what the
  rider has seen in her own platform outputs. All content is traceable to
  a specific cached field.

---

## Part 7 — Implementation Order

1. **Lesson Notes form** — add `movementPurpose` field (`lesson-notes.html`)
2. **Firestore schema** — add `movementPurpose` to lesson notes save object
3. **Prompt additions** — update `YDJ_AI_Coaching_Voice_Prompts_v3.md` and
   `promptBuilder.js` with purpose field awareness and Opening Line instruction
4. **Pre-Lesson Summary page** — build `/lesson-prep` from `ydj-pre-lesson-summary.html`
5. **Dashboard card** — add Lesson Prep card to dashboard
6. **Nav entry** — add `Lesson Prep` to nav
7. **Weekly Focus cross-link** — add one-line link at bottom of Weekly Focus
8. **Coach sharing UI** — build after Rider Settings consent toggle is live

---

## Part 8 — What Replaces the Weekly Coach Brief

The Weekly Coach Brief (`ydj-weekly-coach-brief.html`) and its implementation
brief (`YDJ_WeeklyCoachBrief_Implementation_Brief.md`) are superseded by this
document. The coach-facing HTML file may be retained for the optional coach
sharing feature, with the following adjustments when that feature is built:

- Remove the orientation sentence from inside the card (it now lives on the
  rider-facing Pre-Lesson Summary page)
- The coach-facing version uses third-person register throughout (the pronoun
  conversion described in the previous brief applies only to the coach-sharing
  variant, not to the primary rider-facing summary)
- Coach sharing sends the rider-facing summary as-is in v1 — trainers like
  Martin's feedback confirms they want the rider's own voice, not a translated
  version

---

*Reference files: `ydj-pre-lesson-summary.html` (prototype), `lesson-notes.html`
(form to update), `YDJ_AI_Coaching_Voice_Prompts_v3.md` (prompt to update),
`promptBuilder.js` (runtime to update in parallel).*
