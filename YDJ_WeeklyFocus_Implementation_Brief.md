# YDJ Weekly Focus — Claude Code Implementation Brief

**Feature:** Weekly Focus Page  
**Reference prototype:** `ydj-weekly-focus-real.html` (use as the definitive source for visual design, layout, and interaction behavior)  
**Priority:** High — implement immediately after or alongside Multi-Voice Coaching and Grand Prix Thinking Cloud Functions

---

## The Single Most Important Principle

> **Weekly Focus is a surface layer, not a separate AI generation.**

The full outputs (Multi-Voice Coaching, Grand Prix Thinking, Physical Guidance) run first and are cached in Firestore. The Weekly Focus page reads from those cached results and surfaces **excerpts** of them — a single key insight, a condensed list, a short summary. It does **not** make its own independent Claude API call.

**Why this matters:** If Weekly Focus ever generates its own content independently, it will drift from the language and conclusions of the full outputs. Riders will see two versions of the same idea phrased differently and lose trust in both. Every sentence on the Weekly Focus page must be traceable to a specific field in a cached full-output document.

---

## What Weekly Focus Is

A single-page dashboard, accessible from the main navigation, that gives the rider a scannable weekly briefing. It answers: *"What should I pay attention to this week?"*

It contains five sections:

| Section | Source |
|---|---|
| **Celebration** | Most recent positive reflection entry (category: `personal`, `validation`, or `aha`) from the Reflections collection |
| **Key Insight** | `weeklyFocusExcerpt` field from the cached Multi-Voice Coaching document |
| **Grand Prix Thinking Assignments** | `weeklyAssignments` array from the cached Grand Prix Thinking L1 document |
| **Physical Awareness** | `weeklyFocusItems` array from the cached Physical Guidance document |
| **Show Planning** | Active event from Journey Event Log (if one exists within 60 days); tasks from Event Planner output |

The page also includes two data visualizations computed directly from raw Firestore ride data (no API call needed):
- Sparkline: ride quality and confidence scores across the last 8 rides
- Bar chart: averaged intention ratings across the last 20 rides

---

## Step 1 — Add `weeklyFocusExcerpt` Fields to Existing Cloud Functions

Each full-output Cloud Function must be updated to write a `weeklyFocus` sub-object into its Firestore document. This is the only change required to the existing AI prompts and output structure.

### 1a. Multi-Voice Coaching Cloud Function

In the system prompt for the Multi-Voice Coaching output, add this instruction at the end of the output format specification:

```
In addition to the full multi-voice analysis, include a field called "weeklyFocusExcerpt" 
containing a single coaching observation (2–4 sentences maximum) that represents the 
single most actionable pattern from this rider's recent data. 

This excerpt must:
- Be written in the voice of the coaching voice most relevant to the pattern identified
- Identify the voice used via a "voice" field (values: "classical_master", "empathetic_coach", "technical_coach", "practical_strategist")
- Quote the rider's own language from their debriefs or reflections where possible
- Be self-contained — readable without seeing the rest of the analysis
- NOT introduce new information not present in the full analysis

Return format (add to existing JSON response):
"weeklyFocusExcerpt": {
  "voice": "technical_coach",
  "text": "..."
}
```

### 1b. Grand Prix Thinking L1 Cloud Function

In the system prompt for GPT L1, add:

```
In addition to the full Grand Prix Thinking analysis, include a field called 
"weeklyAssignments" — an array of exactly 3 objects, each representing one 
actionable exploration for the coming week.

Each assignment must:
- Connect directly to a finding in the full GPT L1 analysis (not new content)
- Be framed as an exploration or observation, not a mandatory task
- Include: title (short), description (2–3 sentences), and buildToward (what larger goal this serves)
- Be appropriate for the rider's current level and horses

Return format (add to existing JSON response):
"weeklyAssignments": [
  {
    "title": "...",
    "description": "...",
    "buildToward": "..."
  }
]
```

### 1c. Physical Guidance Cloud Function

In the system prompt for Physical Guidance, add:

```
In addition to the full physical guidance analysis, include a field called 
"weeklyFocusItems" — an array of 3–4 items representing the most relevant 
physical awareness points for the coming week.

Each item must:
- Connect directly to a finding in the full physical analysis (not new content)
- Be framed as something to notice or feel, not a correction to force
- Include: text (the awareness point), sub (optional supporting note or source), 
  and isHorseHealth (boolean — true if related to horse physical state rather than rider)

Return format (add to existing JSON response):
"weeklyFocusItems": [
  {
    "text": "...",
    "sub": "...",
    "isHorseHealth": false
  }
]
```

---

## Step 2 — Firestore Schema

### Existing collections (no changes to structure, only additions to documents):

**`users/{userId}/outputs/multiVoiceCoaching`** — add field:
```
weeklyFocusExcerpt: {
  voice: string,          // "classical_master" | "empathetic_coach" | "technical_coach" | "practical_strategist"
  text: string,
  generatedAt: timestamp
}
```

**`users/{userId}/outputs/grandPrixThinking`** — add field:
```
weeklyAssignments: [
  {
    title: string,
    description: string,
    buildToward: string
  }
],
weeklyAssignmentsGeneratedAt: timestamp
```

**`users/{userId}/outputs/physicalGuidance`** — add field:
```
weeklyFocusItems: [
  {
    text: string,
    sub: string | null,
    isHorseHealth: boolean
  }
],
weeklyFocusItemsGeneratedAt: timestamp
```

### New collection — Weekly Focus interaction state:

**`users/{userId}/weeklyFocus/{weekId}`**

`weekId` format: `YYYY-WNN` (e.g., `2026-W11`)

```javascript
{
  weekId: string,
  weekStart: timestamp,
  pinnedSections: string[],        // ["coaching", "gpt", "physical"]
  completedSections: string[],     // section-level done state
  checkedItems: {                  // granular item-level state
    gpt: boolean[],                // index matches weeklyAssignments array
    physical: boolean[],           // index matches weeklyFocusItems array
  },
  celebrationId: string,           // Firestore doc ID of the selected reflection
  lastUpdated: timestamp
}
```

**Important:** Do NOT store the content of the Weekly Focus in this collection — only the interaction state. Content always comes from the output documents above. This ensures content stays in sync automatically when outputs are regenerated.

---

## Step 3 — React Component Structure

```
src/
  components/
    WeeklyFocus/
      WeeklyFocus.jsx          ← main page component
      WFCelebration.jsx        ← celebration banner
      WFCoachingCard.jsx       ← key insight card
      WFGPTCard.jsx            ← grand prix thinking card
      WFPhysicalCard.jsx       ← physical awareness card
      WFShowCard.jsx           ← show planning card (conditional)
      WFVizCard.jsx            ← data visualizations card
      WFModeBar.jsx            ← all / my priorities toggle + progress counter
      useWeeklyFocus.js        ← custom hook: data fetching + state management
      weeklyFocusUtils.js      ← helpers: getWeekId(), selectCelebration(), computeSparklineData()
```

### WeeklyFocus.jsx responsibilities:
- Reads from three output documents via `onSnapshot` listeners (multiVoiceCoaching, grandPrixThinking, physicalGuidance)
- Reads active event from Journey Event Log
- Reads last 8 ride debriefs for sparkline data
- Reads last 20 debriefs for intention rating averages
- Reads and writes interaction state to `weeklyFocus/{weekId}`
- Passes all data down as props — no child component fetches its own data

### Loading states:
- If a full output hasn't been generated yet, show a card with a gentle "not yet available" state and a prompt to complete more rides (minimum data thresholds apply — match the thresholds used by the full output Cloud Functions)
- Never show an empty card without explanation
- Show cards in the same order regardless of availability — layout is stable

---

## Step 4 — Data Flow (Critical — Read This Before Building)

```
Firestore outputs/multiVoiceCoaching
  └─ weeklyFocusExcerpt.text        → WFCoachingCard insight text
  └─ weeklyFocusExcerpt.voice       → voice tag label

Firestore outputs/grandPrixThinking
  └─ weeklyAssignments[0..2]        → WFGPTCard assignment list

Firestore outputs/physicalGuidance
  └─ weeklyFocusItems[0..3]         → WFPhysicalCard item list

Firestore journeyEventLog (query: upcoming, within 60 days)
  └─ if found → WFShowCard active
  └─ if not found → WFShowCard "nothing on calendar" state

Firestore debriefs (last 8, orderBy rideDate desc)
  └─ overallQuality, confidenceLevel → sparkline data (computed client-side)

Firestore debriefs (last 20, orderBy rideDate desc)
  └─ intentionRatings               → averaged per-intention (computed client-side)

Firestore reflections (query: category in ["personal","validation","aha"], limit 5, orderBy date desc)
  └─ weeklyFocusUtils.selectCelebration() picks most recent positive entry
  └─ celebrationId stored in weeklyFocus/{weekId} so it doesn't change mid-week
```

**No Weekly Focus content is ever generated independently by the Weekly Focus component.** If a full output document doesn't have its `weeklyFocus*` field yet, that card shows a "pending" state.

---

## Step 5 — The "Full Analysis" Links

Each card on the Weekly Focus page includes a "View full [Output Name] →" link. These must navigate to the **exact same location** as the full output in the app.

| Card | Link destination |
|---|---|
| Key Insight | `/outputs/coaching` (Multi-Voice Coaching page) |
| Grand Prix Thinking | `/outputs/grand-prix-thinking` |
| Physical Awareness | `/outputs/physical` |
| Show Planning | `/outputs/event-planner` or `/journey-events` |

The link is the contract between Weekly Focus and the full output. When a rider reads an insight on the Weekly Focus page and follows the link, the **same language** must appear in the full output. This is guaranteed by the fact that Weekly Focus reads directly from the same Firestore document.

---

## Step 6 — Interaction State Persistence

All interaction state (pinned sections, checked items, completed sections) is persisted to `weeklyFocus/{weekId}` in Firestore on every change. Use debounced writes (300ms) to avoid excessive Firestore writes on rapid toggling.

On page load:
1. Compute current `weekId`
2. Check if `weeklyFocus/{weekId}` exists
3. If yes, restore pinned/checked/completed state
4. If no, create a fresh document with all state empty
5. Select the celebration entry: if `celebrationId` is already stored for this week, use it; otherwise run `selectCelebration()` and store the result

The celebration does not change during the week once selected. This prevents it from disappearing if the rider logs new reflections mid-week.

---

## Step 7 — Routing

Add a route for the Weekly Focus page. Recommend making it the **default landing page after login** (replacing or supplementing any existing dashboard):

```jsx
// In your router config
<Route path="/weekly-focus" element={<WeeklyFocus />} />
<Route path="/" element={<Navigate to="/weekly-focus" />} />
```

Add "This Week" as the first item in the main navigation.

---

## Step 8 — Visual Design

The HTML prototype (`ydj-weekly-focus-real.html`) is the **definitive reference** for:
- Card layout and grid behavior
- Typography hierarchy (Playfair Display headings, Work Sans body)
- Color usage — especially the voice tag colors (technical_coach = sky blue, classical_master = plum, empathetic_coach = forest green, practical_strategist = rust)
- Interaction states: pinned (gold border + shadow), completed (strikethrough + reduced opacity + green stripe), collapsed (card-body hidden)
- The "My Priorities" mode behavior (unpinned cards dim to 30% opacity and become non-interactive)
- Celebration banner styling (gold left-border, parchment gradient, star watermark)
- Item-level checkboxes (circle for physical, square for GPT, square for show tasks)
- Reflection nudge boxes (parchment background, gold-pale left border, italic text)

Do not redesign. Translate the HTML/CSS into React components using the existing YDJ CSS variable system (`--parchment`, `--gold`, `--ink`, etc.).

---

## Step 9 — Show Planning Card Logic

The Show Planning card has two states:

**Active state** — when a Journey Event Log entry exists with `eventDate` within the next 60 days:
- Show event name and days-out callout
- Pull task list from Event Planner output (`weeklyShowTasks` field — add this to the Event Planner Cloud Function following the same pattern as Step 1 above)
- Allow individual task checkboxes, stored in `weeklyFocus/{weekId}.checkedItems.show`

**Empty state** — when no upcoming event exists within 60 days:
- Show the "Nothing on the calendar yet" message from the prototype
- Include a subtle link to add an event in the Journey Event Log
- Do not hide the card entirely — its presence is a gentle reminder that show planning is available

---

## Step 10 — Visualization Notes

Both visualizations are computed client-side from raw Firestore data — no API call.

**Sparkline (ride quality + confidence):**
- Query: last 8 debriefs across all horses, ordered by `rideDate` desc, then reverse for display
- Fields: `overallQuality` and `confidenceLevel` (both 1–10)
- Use SVG polyline. Reference the sparkline drawing code in the prototype exactly — it handles the coordinate math correctly
- Min/max scale: 4–10 (not 0–10) to make variation visible

**Intention rating bar chart:**
- Query: last 20 debriefs
- For each debrief, extract `intentionRatings` object
- Group by intention label, compute mean for each
- Display the 5 most frequently appearing intentions
- Note: intention labels vary across riders (the form allows custom intentions). Do not hardcode labels — read them from the data
- Bar color: use the gold `--track` variable for all bars, or map to voice colors if the intention clearly maps to a coaching domain

---

## Checklist

- [ ] Add `weeklyFocusExcerpt` field to Multi-Voice Coaching Cloud Function prompt and output schema
- [ ] Add `weeklyAssignments` field to Grand Prix Thinking L1 Cloud Function prompt and output schema
- [ ] Add `weeklyFocusItems` field to Physical Guidance Cloud Function prompt and output schema
- [ ] Add `weeklyShowTasks` field to Event Planner Cloud Function prompt and output schema
- [ ] Create `weeklyFocus/{weekId}` Firestore collection with security rules (user-scoped)
- [ ] Build `useWeeklyFocus.js` hook (fetching + state + persistence)
- [ ] Build `weeklyFocusUtils.js` (weekId, celebration selection, sparkline data computation, intention averaging)
- [ ] Build `WFModeBar.jsx`
- [ ] Build `WFCelebration.jsx`
- [ ] Build `WFCoachingCard.jsx` with voice tag logic
- [ ] Build `WFGPTCard.jsx` with item-level checkboxes
- [ ] Build `WFPhysicalCard.jsx` with horse-health item variant (rust color)
- [ ] Build `WFShowCard.jsx` with active/empty state logic
- [ ] Build `WFVizCard.jsx` with sparkline SVG and bar chart
- [ ] Build `WeeklyFocus.jsx` (orchestrator — composes all cards, manages mode state)
- [ ] Add `/weekly-focus` route; set as default post-login destination
- [ ] Add "This Week" to main navigation (first item)
- [ ] Test: regenerate a full output, confirm Weekly Focus card updates automatically
- [ ] Test: verify "View full analysis" links land on the correct page at the correct section
- [ ] Test: pin/check state persists across page refresh and between sessions
- [ ] Test: mobile layout at 375px width (barn use case)

---

## What NOT to Build

- Do not add a "regenerate" button to the Weekly Focus page — riders cannot trigger fresh AI content from here. Regeneration happens from the full output pages.
- Do not add a date picker — Weekly Focus always shows the current week. Historical weeks are not accessible from this page (the full outputs serve that purpose).
- Do not write a separate system prompt for Weekly Focus. All AI content originates from the full output prompts.

---

## Questions to Resolve Before Building

1. **Output generation timing:** Are Multi-Voice Coaching and Grand Prix Thinking Cloud Functions currently writing to Firestore on a schedule, on data thresholds, or manually? The Weekly Focus card loading states depend on knowing when these documents will exist.
2. **Minimum data thresholds:** What is the minimum number of debriefs required before each full output generates? Weekly Focus cards should show "pending" with the same threshold language used elsewhere in the app.
3. **Navigation structure:** What is the current post-login landing page? Confirm it's safe to redirect to `/weekly-focus`.
