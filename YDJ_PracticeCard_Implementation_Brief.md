# YDJ Practice Card — Implementation Brief
## New Feature · March 2026

**Reference prototype:** `ydj-practice-card.html` (open in browser to see the full
interaction including breath overlay and locked state before reading this brief)

**Priority:** High — bridges the gap between weekly coaching output and the rider's
next ride. No new API call required; generated within the existing Multi-Voice
Coaching output assembly.

---

## 1. What This Feature Is

The Practice Card is a weekly, mobile-first card distilled from the coaching output
and surfaced at the moment the rider needs it: when they are about to mount. It
contains exactly five sections — no more — and is designed to be glanceable in
under 60 seconds. It is not a coaching report. It is a ride-ready artifact.

The rider taps **Ready to ride** when they are at the barn and about to get on. This
triggers a 3-second breath prompt (a pre-performance routine anchor), then locks the
card with a timestamp and surfaces a **Log your debrief** CTA for after the ride.

**Research basis (from YDJ Learning Theory Gap Analysis):**
- Process goals: Kingston & Hardy (d = 0.87 self-efficacy, d = 0.68 anxiety control)
- External focus cues: Wulf meta-analysis (g = 0.83 neuromuscular efficiency)
- Mental rehearsal: Driskell et al. (d = 0.527) — between-ride practice
- Pre-performance routine: Wergin et al. (g = 0.70 under pressure conditions)
- Working memory cap: max 3 process focus points (Cowan, 2001)

---

## 2. Architecture — No New API Call

The Practice Card content is generated **within the existing Multi-Voice Coaching
consolidation call** by appending a new output section to that call's system prompt.
See `YDJ_Prompt_Changes_Learning_Theory.md` Change 8 for the exact prompt addition.

The prompt addition instructs the coaching consolidation call to return an additional
JSON field `practiceCard` alongside the existing voice outputs.

**Data flow:**
```
Weekly coaching run (existing)
  → Multi-Voice consolidation call (existing)
    → returns voiceOutputs (existing)
    → ALSO returns practiceCard JSON (new field, same call)
  → Pre-processing saves practiceCard to Firestore (new)
  → Frontend reads practiceCard from Firestore (new)
  → PracticeCard component renders (new)
```

---

## 3. Firestore Schema Addition

Add to the existing weekly coaching document for each rider:

```
/riders/{riderId}/weeklyCoaching/{weekId}/
  ...existing fields...
  practiceCard: {
    generatedAt: Timestamp,
    weekOf: string,              // "March 17, 2026"
    horseName: string,           // from rider's active horse profile
    processGoals: string[],      // exactly 3 items
    inSaddleCues: string[],      // exactly 2 items
    analogy: string,             // 1–2 sentences
    mentalRehearsal: string,     // 2–3 sentences
    carryQuestion: string,       // 1 sentence
    confirmedAt: Timestamp|null, // null until rider taps Ready to ride
    confirmedDate: string|null   // "Mon Mar 17" — for display in locked state
  }
```

`confirmedAt` is written by the client when the rider taps Ready to ride. It is
never written by the server. A null value means the card has not yet been confirmed
this week.

---

## 4. AI Output — Prompt Addition

This is already specified in `YDJ_Prompt_Changes_Learning_Theory.md` as Change 8.
That change appends a `BETWEEN RIDES SECTION` instruction to the Multi-Voice
consolidation prompt.

**Extend that prompt addition** to also request the full practiceCard JSON:

Append the following to the Change 8 prompt block, after the Between Rides section
instruction:

```
PRACTICE CARD JSON:
In addition to the Between Rides section above, return a practiceCard JSON object
as a separate field in your response. This will be stored and displayed to the rider
as a standalone barn-ready card.

Return the practiceCard field with exactly this shape:
{
  "practiceCard": {
    "processGoals": ["goal 1", "goal 2", "goal 3"],
    "inSaddleCues": ["cue 1", "cue 2"],
    "analogy": "text",
    "mentalRehearsal": "text",
    "carryQuestion": "text"
  }
}

Rules (same as the Between Rides section):
- processGoals: 3 items, verb-first, achievable in one ride, max ~12 words each.
  Name relaxation, forwardness, or trust in the hand by name when relevant. Never
  refer to them collectively as "the three principles."
- inSaddleCues: 2 items. EXTERNAL FOCUS only — what does the horse's movement feel
  like when the work is correct? Never frame as rider body instructions.
- analogy: one vivid image or metaphor, 1–2 sentences.
- mentalRehearsal: 2–3 sentences. Start mid-ride at a specific arena moment.
- carryQuestion: one sentence. Opens curiosity, not anxiety.
```

**Parsing:** The consolidation call response will contain both prose voice content
and the `practiceCard` JSON object. Extract the JSON field from the response and
save it to Firestore separately. If the `practiceCard` field is absent or malformed,
log the error and skip — do not fail the entire coaching run.

---

## 5. React Component Spec

**File:** `src/components/PracticeCard/PracticeCard.jsx`
(plus `PracticeCard.css` or CSS module — use the existing design token system)

**Placement:** Dashboard home screen, below the Weekly Focus block. Also accessible
as a standalone route: `/practice-card` (or `/card`). The dashboard version is a
compact entry point that expands or links to the full card view.

### 5.1 Component States

The component has three distinct states driven by `practiceCard.confirmedAt`:

**State A — UNCONFIRMED** (`confirmedAt === null`)
Full card is readable. Ready to ride button is visible at the bottom.

**State B — BREATH OVERLAY** (transitional, ~3.2 seconds)
Dark overlay fills the card area. Single word "Breathe" fades in, holds, fades out.
Subtitle: "one breath before you mount". No interaction — auto-advances to State C.

**State C — LOCKED** (`confirmedAt` has been written)
Card content is still visible (read-only). Ready to ride button is replaced by:
- Green locked banner: `✓ Have a great ride!` + timestamp
- Post-ride CTA below the footer: `After your ride / Log your debrief ↗`

### 5.2 Five Card Sections

Render in this order, with these exact labels and colors:

| Section | Label | Left border + bg color | Content field |
|---|---|---|---|
| 1 | This ride, focus on | Gold `#B8862A` / `#F5EAC8` | `processGoals[]` — numbered 1, 2, 3 |
| 2 | In the saddle — feel for | Rust `#8B4A2A` / `#F5E0D5` | `inSaddleCues[]` — diamond bullet `◆` |
| 3 | This week's image | Forest `#2D6A4F` / `#D0EAE0` | `analogy` — italic serif |
| 4 | Between rides | Sky `#3D6E8A` / `#D5E8F2` | `mentalRehearsal` |
| 5 | Carry this question | Parchment `#F7F2E8` / border `#E8DFC8` | `carryQuestion` — italic serif |

Section styling: `border-left: 3px solid {color}; border-radius: 0 7px 7px 0;`
Section label: Playfair Display, 7.5px, uppercase, letter-spacing 0.16em, color matches border.

### 5.3 Card Header

```
[wordmark]  YOUR DRESSAGE JOURNEY        8px serif, gold, tracking 0.2em, uppercase
[title]     Practice Card                18px serif
[meta]      {horseName} · {weekOf}       10.5px, ink-light
```

Bottom border: `1px solid #E8DFC8`

### 5.4 Card Footer

```
Illuminate Your Journey    9px italic serif, ink-light, tracking 0.1em
```

### 5.5 Ready to Ride Button (State A only)

```
Background: --ink (#2C1810)
Text:       "Ready to ride ↗"   13px Playfair Display, parchment color
Width:      calc(100% - 28px), centered, margin 0 14px 14px
Border-radius: 8px
```

On tap: hide button immediately → show breath overlay (State B).

### 5.6 Breath Overlay (State B)

Absolutely positioned over the card, same border-radius as the card container.
Background: `--ink (#2C1810)`. Centered flex column.

```
[word]     "Breathe"              28px Playfair Display, parchment, tracking 0.08em
[subtitle] "one breath before     11px, ink-light, tracking 0.06em
            you mount"
```

Animation on the word element:
```css
@keyframes breathe {
  0%   { opacity: 0; transform: scale(0.92); }
  20%  { opacity: 1; transform: scale(1);    }
  80%  { opacity: 1; transform: scale(1);    }
  100% { opacity: 0; transform: scale(1.04); }
}
animation: breathe 3s ease-in-out forwards;
```

After 3200ms: hide overlay, write `confirmedAt` to Firestore, transition to State C.

**Important:** Re-trigger the animation each time by replacing the DOM node (or
using a React key change). Do not rely on CSS animation restart — it will not
re-fire on a component that has already animated.

### 5.7 Locked Banner (State C)

Inserted between the last card section and the card footer.

```
Background: #D0EAE0   (forest-faint)
Border:     1px solid #A8D4C0
Border-radius: 7px
Padding:    8px 12px
Display:    flex, gap 8px, align-items center
```

Contents:
- Green dot: `width: 7px; height: 7px; background: #2D6A4F; border-radius: 50%`
- Text block:
  - Line 1: `✓ Have a great ride!` — 11px, color `#2D6A4F`
  - Line 2: `Locked {HH:MM} · {Www Mon D}` — 10px, color `#6B9E86`

Timestamp format: `toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })`
and `toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })`.

After inserting the banner, scroll the card to bring the locked state into view.

### 5.8 Post-Ride CTA (State C, below footer)

Inserted immediately after the card footer.

```
Background: cream (#FDFAF3), border: 1px solid #E8DFC8
Border-radius: 7px, padding: 10px 12px, text-align: center
Cursor: pointer. Hover: background #F7F2E8
```

Contents (stacked, centered):
- `AFTER YOUR RIDE` — 9px, uppercase, letter-spacing 0.12em, ink-light
- `Log your debrief` — 12px Playfair Display, ink
- `↗` — 10px, gold (#B8862A)

**On tap:** Navigate to the Post-Ride Debrief form (`/debrief/new`) with today's
date pre-filled via route param or query string: `/debrief/new?date=2026-03-17`

The Post-Ride Debrief form should already handle a `?date=` param — if it doesn't,
add that handling as part of this implementation. The param pre-fills the ride date
field and nothing else.

---

## 6. Typography

Use the existing YDJ design tokens:
- **Serif:** Playfair Display (already loaded globally) — card title, wordmark,
  section labels, goal numbers, italic text sections, footer, button
- **Sans:** Work Sans (already loaded globally) — meta text, rehearsal text, CTA labels
- All string literals in JS/JSX: **use double-quote delimiters** so apostrophes
  inside strings never need escaping. This is the convention to adopt throughout
  this component.

---

## 7. Colors Reference

All colors match the existing YDJ palette:

```
--ink:          #2C1810   (dark brown — headings, button bg)
--ink-mid:      #6B4A3A   (italic text)
--ink-light:    #9A7A6A   (meta, labels)
--gold:         #B8862A   (wordmark, process goals, CTA arrow)
--gold-faint:   #F5EAC8   (process goals bg)
--rust:         #8B4A2A   (in-saddle cues)
--rust-faint:   #F5E0D5   (in-saddle cues bg)
--forest:       #2D6A4F   (analogy, locked banner)
--forest-faint: #D0EAE0   (analogy bg, locked banner bg)
--sky:          #3D6E8A   (mental rehearsal)
--sky-faint:    #D5E8F2   (mental rehearsal bg)
--parchment:    #F7F2E8   (carry question bg, hover states)
--parchment-dark:#E8DFC8  (borders, carry question border)
--cream:        #FDFAF3   (card background)
```

---

## 8. Firestore Write — confirmedAt

When the rider taps Ready to ride, write to Firestore before the locked state
renders (optimistic UI is fine — the write is low-stakes):

```javascript
await updateDoc(
  doc(db, 'riders', riderId, 'weeklyCoaching', weekId),
  {
    'practiceCard.confirmedAt': serverTimestamp(),
    'practiceCard.confirmedDate': formattedDateString
  }
);
```

If the write fails, still transition to State C locally — do not block the UX on
a failed timestamp write. Log the error silently.

---

## 9. Dashboard Entry Point

On the dashboard home screen, the Practice Card appears as a compact card below
Weekly Focus. It shows:

**When unconfirmed (State A):**
- Card title + horse name
- First process goal only (teaser)
- "Ready to ride →" link/button that opens the full card

**When confirmed (State C):**
- `✓ Have a great ride!` in green
- Timestamp
- `Log your debrief →` link to `/debrief/new?date=today`

**When no card exists for the current week:**
- Do not render the component. Coaching output hasn't run yet.

---

## 10. Implementation Checklist

- [ ] Extend Multi-Voice consolidation prompt with `practiceCard` JSON instruction
      (per `YDJ_Prompt_Changes_Learning_Theory.md` Change 8 extension above)
- [ ] Update pre-processing to extract and save `practiceCard` field to Firestore
- [ ] Add `practiceCard` fields to Firestore weekly coaching document schema
- [ ] Build `PracticeCard.jsx` component with all three states
- [ ] Implement breath overlay animation (re-trigger via key or DOM replace)
- [ ] Write `confirmedAt` to Firestore on Ready to ride tap
- [ ] Wire post-ride CTA to `/debrief/new?date={today}`
- [ ] Add `?date=` param handling to Post-Ride Debrief form if not already present
- [ ] Add compact dashboard entry point below Weekly Focus
- [ ] Test: card renders from Firestore data (not hardcoded)
- [ ] Test: confirmedAt persists across page reload (State C shows on return)
- [ ] Test: breath animation re-triggers correctly if prototype is tested multiple times
- [ ] Test: post-ride CTA date param pre-fills correctly in debrief form
- [ ] Test: component does not render when no practiceCard exists for the week

---

## 11. What Is NOT in This Brief

These are planned but not part of this implementation:

- **Push notification delivery** on non-riding days — deferred to PWA phase (Q3)
- **"Before I Look" self-assessment** before coaching output loads — separate feature
- **Post-ride check-in keyed to process goals** — next iteration of the card
- **Tracking whether card confirmation correlates with debrief quality** — analytics
  layer, post-launch

---

*March 2026. References: `ydj-practice-card.html` (prototype), `YDJ_Prompt_Changes_Learning_Theory.md` (Change 8), `YDJ_Learning_Theory_Gap_Analysis.md` (Feature B specification).*
