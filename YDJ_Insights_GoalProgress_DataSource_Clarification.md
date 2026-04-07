# Clarification: Goal Progress Card — Data Sources and Rendering

**Addendum to:** `YDJ_Insights_Page_Implementation_Brief.md`  
**Date:** April 2026  
**Issue:** Claude Code is unable to locate milestones, narrative text, and voice callouts for the Goal Progress cards. This document maps every data element in the card to its exact Firestore source.

---

## Why This Card Is Complex

The Goal Progress card is built from **three separate Firestore sources** that must be combined at render time. None of them alone contains everything the card needs. Claude Code must read from all three.

| Card element | Firestore source |
|---|---|
| Goal title text | `users/{uid}/riderProfile/profile` → `longTermGoals` |
| Progress percentage | `users/{uid}/journeyMap/{latestId}` → `goal_progress[n].progress_pct` |
| Milestone list (breakthroughs, incremental, foundation) | `users/{uid}/journeyMap/{latestId}` → `goal_progress[n].milestones[]` |
| Narrative paragraph below the SVG | `users/{uid}/journeyMap/{latestId}` → `goal_progress[n].narrative` |
| Voice callout (coach + text) | `users/{uid}/journeyMap/{latestId}` → `goal_progress[n].voice_callout` |
| "Next" steps block | `users/{uid}/journeyMap/{latestId}` → `goal_progress[n].next_steps` |

---

## Source 1 — Goal Titles: Rider Profile

Goal titles come from the rider's profile, not the Journey Map.

```
Firestore path: users/{uid}/riderProfile/profile
Field: longTermGoals   (string — free text entered by the rider)
```

This is a single free-text field. The Journey Map AI parses it to identify individual goals and maps them to `goal_progress` items by index. When rendering, use the `goal_progress[n].goal` field from the Journey Map (the AI's interpretation of each goal as a clean title) rather than the raw `longTermGoals` string. If `goal_progress[n].goal` is absent, fall back to splitting `longTermGoals` by newline.

---

## Source 2 — All Visualization Data: Journey Map Document

The Journey Map is the primary data source for everything the card displays visually.

```
Firestore path: users/{uid}/journeyMap/{latestDocId}
```

To get the latest Journey Map document, query the collection ordered by `generatedAt` descending, limit 1:

```js
const q = query(
  collection(db, 'users', uid, 'journeyMap'),
  orderBy('generatedAt', 'desc'),
  limit(1)
);
```

Within that document, the `goal_progress` field is an array. Each item in the array corresponds to one of the rider's goals:

```js
goal_progress: [
  {
    goal:         string,      // Goal title (AI-interpreted)
    progress_pct: number,      // 0–100, used for both progress bar and SVG marker
    narrative:    string,      // Paragraph shown below the milestone path SVG
    next_steps:   string,      // Content for the "NEXT" block
    voice_callout: {
      voice: string,           // e.g. "Classical Master", "Practical Strategist"
      text:  string,           // The callout paragraph
    },
    milestones: [
      {
        label: string,         // Milestone description text
        type:  string,         // "breakthrough" | "incremental" | "foundation"
        date:  string,         // Display date string e.g. "Mar 20" (may be empty string)
      },
      // ... more milestones
    ],
  },
  // ... more goals
]
```

---

## Rendering the Milestone Path SVG

The `MilestonePath` SVG component takes the full goal object as its prop. It reads:

- `goal.progress_pct` → position of the "You Are Here" marker along the track
- `goal.milestones` → array of milestone objects to render as stars/circles

**Milestone marker shapes by type:**

| `type` value | Shape | Color |
|---|---|---|
| `"breakthrough"` | ★ Star (5-point) | Goal color (green or gold per goal index) |
| `"incremental"` | ● Circle | Goal color at 75% opacity |
| `"foundation"` | ● Circle | Tan `#8B7355` |

**SVG layout rules:**
- Milestones are distributed along the track from left to right in array order
- Alternate above/below the track line (index 0 = above, index 1 = below, etc.) to prevent label crowding
- Date label appears offset from the marker in the same direction (above if marker is above track, below if below)
- If `milestone.date` is an empty string, render no date label for that marker
- If `goal.milestones` is an empty array or undefined, render the track and progress marker only — no milestone shapes. Do **not** throw an error or skip the SVG entirely.

**"You Are Here" marker:**
- Vertical dashed line at the progress position
- Small colored rectangle badge above it showing `{progress_pct}%`
- This must always render as long as `progress_pct` is a number, even if milestones array is empty

---

## Rendering the Full Card — Element Order

Each goal renders as a single card. Elements appear in this exact order:

```
1. Goal title (Playfair Display, 16px) + progress % (26px, goal color) — flex row, space-between
2. Thin progress bar (5px height, goal color fill at progress_pct width)
3. MilestonePath SVG (full width, overflow: visible)
4. Milestone list (badge + label + date for each milestone)
5. "NEXT" block (colored left-border box, small "NEXT" label, next_steps text)
6. VoiceCallout (gold left-border blockquote, voice name bold gold, text)
```

**The narrative paragraph does NOT render as a standalone paragraph between the SVG and milestone list.** In the final card structure, the narrative is the content of the VoiceCallout's surrounding paragraph — it is the text that appears in the `voice_callout.text` field. There is no separate `narrative` paragraph element in the card. The card goes: SVG → milestone list → NEXT block → voice callout.

---

## Empty States

### No Journey Map document exists yet

If the `journeyMap` collection has no documents for this rider, render this empty state for the entire Section 3 Goal Progress area:

```
[Goal title from rider profile]
"Progress tracking will appear here after your first Journey Map is generated.
 Complete your reflections and debriefs, then generate your Journey Map."
```

Show the goal title if it can be read from the rider profile. Do not show an SVG, milestone list, or voice callout.

### Journey Map exists but goal_progress is empty or missing

```
"Goal progress data is being calculated. 
 Regenerate your Journey Map to update this view."
```

### goal_progress item exists but milestones array is empty

Render the SVG with just the progress track and "You Are Here" marker. Omit the milestone list section entirely (do not render an empty list). The NEXT block and voice callout still render normally.

---

## Goal Color Assignment

Goals are assigned colors by index — do not hardcode colors to specific goal text.

```js
const GOAL_COLORS = ['#5B9E6B', '#B8862A', '#4A7DC4', '#C45252', '#8B5EA0'];

const goalColor = (index) => GOAL_COLORS[index % GOAL_COLORS.length];
```

Pass `goalColor(index)` as the `color` prop to each goal card and milestone path SVG.

---

## VoiceCallout Component

The VoiceCallout renders from `goal_progress[n].voice_callout`:

```jsx
<VoiceCallout voice={goal.voice_callout.voice}>
  {goal.voice_callout.text}
</VoiceCallout>
```

Styling (matches prototype and rest of Insights page):

```jsx
<blockquote style={{
  margin: '12px 0 0',
  padding: '10px 16px',
  borderLeft: '3px solid #B8862A',
  background: 'rgba(184,134,42,0.08)',
  borderRadius: '0 6px 6px 0',
  fontSize: 13,
  lineHeight: 1.65,
  color: '#2C2C2C',
}}>
  <strong style={{ color: '#B8862A' }}>{voice}:</strong> {text}
</blockquote>
```

If `voice_callout` is null or missing from the Journey Map document, omit the VoiceCallout entirely — do not render an empty blockquote or placeholder text.

---

## Implementation Checklist — Goal Progress Specific

- [ ] Rider profile read for goal title fallback
- [ ] Journey Map queried as latest document by `generatedAt` desc
- [ ] `goal_progress` array iterated — one card rendered per item
- [ ] `progress_pct` drives both progress bar width and SVG "You Are Here" marker
- [ ] `milestones` array renders correct shapes: star = breakthrough, circle = incremental, tan circle = foundation
- [ ] Empty `milestones` array renders SVG track + marker only, no error
- [ ] Milestone date label omitted when `date` is empty string
- [ ] Alternate above/below positioning for milestone markers
- [ ] `voice_callout.voice` and `voice_callout.text` render in gold-border blockquote
- [ ] Missing `voice_callout` field renders nothing (no empty blockquote)
- [ ] Goal colors assigned by index from `GOAL_COLORS` palette — not hardcoded
- [ ] Empty state renders correctly when no Journey Map document exists

---

*April 2026. Addendum to `YDJ_Insights_Page_Implementation_Brief.md`.*
