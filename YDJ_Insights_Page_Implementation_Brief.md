# YDJ Insights Page — Implementation Brief

**Date:** April 2026  
**Prototype:** `ydj-insights-page.jsx` (read from filesystem — this is the source of truth for all component structure, data shape, and styling)  
**Scope:** Build a new Insights page at `/insights` and add it to the global nav. The route does not currently exist in the nav and must be added. The data visualizations tab (currently within an existing page) is removed and replaced by this new dedicated page.

---

## 1. What This Brief Does

1. Creates a new `/insights` route and `InsightsPage.jsx` component
2. Adds "Insights" to the global nav (see Section 3a)
3. Removes the old data visualizations tab and all its chart components
4. Fixes the Quality vs. Confidence chart diagonal calibration line (recharts `Customized` approach — see Section 5)
5. Wires all charts to live Firestore data (replacing prototype mock data)

## 2. What This Brief Does NOT Change

- Any other page, output, or form
- All other tabs in the app (coaching, journey map, etc.) are untouched
- Global nav structure beyond adding the Insights entry

---

## 3. Files to Create or Modify

| Action | File | Notes |
|---|---|---|
| **Create** | `src/components/insights/InsightsPage.jsx` | Port from `ydj-insights-page.jsx` |
| **Create** | `src/components/insights/Section1Quality.jsx` | Ride Quality Indicators section |
| **Create** | `src/components/insights/Section2Outcomes.jsx` | Ride Outcomes section |
| **Create** | `src/components/insights/Section3Journey.jsx` | The Journey section |
| **Create** | `src/hooks/useInsightsData.js` | Data aggregation hook — see Section 4 |
| **Modify** | Router config | Add `/insights` route pointing to `InsightsPage.jsx` |
| **Modify** | Global nav component | Add Insights nav entry — see Section 3a |
| **Delete** | Existing data visualization tab component | Remove entirely — do not archive inline |
| **Delete** | Any chart sub-components belonging to old viz tab | Remove entirely |

**Component split is recommended** (not required if Claude Code prefers a single file). If split, `InsightsPage.jsx` is the shell with the section nav; the three section files contain their respective charts.

### 3a. Global Nav — Adding Insights

Add "Insights" to the global nav immediately after "Quick Start", before the Help link. Apply the `nav-special` class (gold-light color, font-weight 600) consistent with Quick Start styling. Use the ✦ prefix character.

```
YDJ brand  |  ⌂ Home  |  ◈ Quick Start  ✦ Insights  ? Help  |  ...
```

Nav entry:
```jsx
<NavLink to="/insights" className="nav-special">✦ Insights</NavLink>
```

Match the exact className, styling, and placement pattern used by the Quick Start nav entry. Do not add any additional styling beyond what `nav-special` already provides.

---

## 4. Firestore Data Wiring

All charts consume pre-processed data. Build a `useInsightsData(riderId)` hook that fetches and aggregates the following. Do **not** pass raw debrief documents to chart components — compute these summaries in the hook.

### 4.1 Fields required per debrief document

From `/riders/{riderId}/debriefs/{debriefId}`:

| Field | Used by chart(s) |
|---|---|
| `overallQuality` | All Section 1 charts |
| `confidenceLevel` | Quality vs. Confidence |
| `riderEffort` | Quality vs. Effort |
| `sessionType` | Quality by Session Type |
| `rideArc` | Quality by Ride Arc |
| `mentalState` | Quality by Mental State |
| `horseName` | Per-horse color coding (Pony = gold `#B8862A`, Rocket Star = blue `#4A7DC4`) |
| `goalRatings` | Process Goal Adherence |

### 4.2 Computed summaries the hook should return

```js
{
  // Section 1 — one object per debrief, for scatter charts
  perRideQC: [{ x: quality, y: confidence, horse, note? }],
  perRideEffort: [{ x: riderEffort, y: quality, horse }],

  // Section 1 — aggregated for bar/combo charts
  qualityBySessionType: [{ type, pony, rs }],  // avg quality per type per horse
  qualityByArc: [{ arc, label, avgQ, count, color }],  // avg + total count per arc type

  // Section 1 — mental state bubble data
  mentalStateBubbles: [{ name, pct, avgQ, color }],

  // Section 2 — themes (from pre-processed coaching output, not computed here)
  themes: [],  // read from weeklyCoaching Firestore doc if available; else []

  // Section 2 — goal adherence
  adherenceByWeek: [{ week, fully, mostly, somewhat, notAtAll }],

  // Section 3 — goals from rider profile
  goals: [],  // read from /riders/{riderId}/profile goals field

  // Section 3 — reflection heatmap
  reflectionHeatmap: {
    categories: [...],  // 6 canonical categories in canonical order
    weeks: [...],       // week labels oldest→newest (up to 8 most recent)
    counts: { [category]: [count per week] }
  }
}
```

### 4.3 Horse color mapping

Do **not** hardcode horse names to colors. Each rider has their own horses, and a rider may have more than two. Colors must be assigned dynamically at runtime based on the horses present in that rider's debrief data.

Define a fixed ordered palette of distinguishable colors:

```js
const HORSE_COLOR_PALETTE = [
  '#B8862A', // gold
  '#4A7DC4', // blue
  '#5B9E6B', // green
  '#C45252', // rust
  '#8B5EA0', // purple
  '#D4722A', // orange
  '#8B7355', // tan
];
```

At data load time, extract the unique horse names from the rider's debrief documents (sorted alphabetically for consistency across sessions) and assign palette colors by index:

```js
const buildHorseColorMap = (debriefs) => {
  const names = [...new Set(debriefs.map(d => d.horseName).filter(Boolean))].sort();
  return Object.fromEntries(
    names.map((name, i) => [name, HORSE_COLOR_PALETTE[i % HORSE_COLOR_PALETTE.length]])
  );
};
// Returns e.g. { 'Apollo': '#B8862A', 'Bella': '#4A7DC4', 'Star': '#5B9E6B' }
```

Pass the resulting `horseColorMap` object down to all chart components that need per-horse color coding. No chart component should reference a horse name directly — all color lookups go through `horseColorMap[horseName]`.

The legend in each chart that shows per-horse colors must be built dynamically from `Object.entries(horseColorMap)` — never hardcoded to two entries.

### 4.4 Reflection category colors

These are canonical across the entire app. Use these exact hex values in all heatmap cells, legend items, and inline narrative spans:

```js
const RC = {
  'Personal Milestone':  '#4A7DC4',
  'External Validation': '#5B9E6B',
  'Aha Moment':          '#D4A017',
  'Obstacle':            '#C45252',
  'Connection':          '#8B5EA0',
  'Feel/Body Awareness': '#D4722A',
};
```

These colors must appear on:
- Heatmap row labels (text color = category color)
- Heatmap cells (fill = category color at varying opacity: 1 entry = 0.28 alpha, 2 = 0.62, 3+ = 0.88)
- Inline references to category names within narrative paragraphs (wrap in `<span style={{ color: RC[cat] }}>`)
- Voice callout references to category names

---

## 5. Diagonal Line Fix — Quality vs. Confidence Chart

**Problem:** The previous approach used a `<Scatter>` component with `line` prop to draw the calibration diagonal. This renders unreliably in the React app environment.

**Fix:** Use recharts `<Customized>` which receives the chart's internal axis map and can draw a native SVG line at precisely the correct coordinates.

```jsx
import { Customized } from 'recharts';

// Place this outside your component (stable reference)
const DiagonalLineDraw = (props) => {
  const { xAxisMap, yAxisMap } = props;
  if (!xAxisMap || !yAxisMap) return null;
  const xAxis = Object.values(xAxisMap)[0];
  const yAxis = Object.values(yAxisMap)[0];
  if (!xAxis?.scale || !yAxis?.scale) return null;
  return (
    <line
      x1={xAxis.scale(1)}  y1={yAxis.scale(1)}
      x2={xAxis.scale(10)} y2={yAxis.scale(10)}
      stroke="#E0D5BE" strokeWidth={1.5} strokeDasharray="7,4"
    />
  );
};

// Inside the ScatterChart, after CartesianGrid:
<Customized component={DiagonalLineDraw} />
```

Do **not** use a Scatter component with invisible dots and a line prop anywhere in this page. Use `<Customized>` for any diagonal reference line needed.

The diagonal represents perfect calibration: where confidence rating equals quality rating. Label it as such in the axis annotation:

```
↙ Below diagonal: underestimating yourself    Above diagonal: confidence exceeds quality ↗
```

---

## 6. Page Structure

### 6.1 Page header (sticky)

```
[page background: var(--parchment-off)]
[header: white bg, bottom border]
  "Insights"                        ← Playfair Display, 22px, ink
  "Your Dressage Journey · [name] · [month year]"  ← 12.5px, light

[section tab nav — three tabs with chart counts]
  Ride Quality Indicators  (5)
  Ride Outcomes            (2)
  The Journey              (3)
```

Section tab styling:
- Active tab: ink color, font-weight 600, 2px solid gold bottom border
- Inactive: light gray, no border
- Chart count badge: small pill, `var(--border)` background, lighter text

### 6.2 Section intros

Each section opens with a title + one-sentence description framing what the section answers. These are in the prototype — port them exactly. They set context before the first chart renders.

### 6.3 Chart card structure (every chart)

```
Card (white bg, 1px border, 10px radius, 20px/24px padding)
  ChartTitle (icon + title + subtitle)
  [optional] Legend or color key
  Chart component (ResponsiveContainer)
  [optional] axis annotation (small italic text)
  Narrative paragraph (13.5px, 1.75 line height, light color)
  VoiceCallout (gold left-border blockquote)
```

The narrative and voice callout are **required on every chart**. They are not optional. The narrative explains what the pattern means. The voice callout makes it personal to this rider. In the live app, both should be generated by the data pre-processing layer and stored alongside the visualization data — they should not be hardcoded. For this implementation, port the prototype narratives as static defaults and flag them for dynamic generation in the next sprint.

---

## 7. Section 1 — Ride Quality Indicators (5 charts)

The `HorseLegend` component that appears above each per-horse chart must be built dynamically from `horseColorMap`. It should render one legend entry per horse — however many that rider has — not a fixed two-item list. Pass `horseColorMap` as a prop:

```jsx
const HorseLegend = ({ horseColorMap }) => (
  <div style={{ display:'flex', gap:18, marginBottom:10, flexWrap:'wrap' }}>
    {Object.entries(horseColorMap).map(([name, color]) => (
      <div key={name} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:P.light }}>
        <div style={{ width:10, height:10, borderRadius:'50%', background:color }} /> {name}
      </div>
    ))}
  </div>
);
```

1. **Quality vs. Confidence** — ScatterChart, per-ride dots, horse color-coded, diagonal via `<Customized>` (see Section 5)
2. **Quality vs. Rider Effort** — ScatterChart, per-ride dots, horse color-coded, green `ReferenceArea` at x=5–7.5 marking optimal zone
3. **Quality by Session Type** — BarChart, grouped bars (Pony gold, RS blue), `ReferenceLine` at overall average
4. **Quality by Ride Arc** — ComposedChart: colored bars for avg quality (left Y axis) + dashed line for ride count (right Y axis)
5. **Quality by Mental State** — ScatterChart with custom bubble `shape`, bubble size encodes % of rides, position encodes avg quality

For chart 4 (Ride Arc), the bar color must be applied per-bar using the arc color map:

```js
const ARC_COLORS = {
  built: '#5B9E6B', consistent: '#4A7DC4', peak: '#B8862A',
  variable: '#8B7355', faded: '#D4722A', valley: '#C45252',
};
```

Use a custom `shape` function on the Bar that reads `arcCombined[props.index].color` for fill. The dashed count line uses `--ink` at 1.5px width.

---

## 8. Section 2 — Ride Outcomes (2 charts)

Charts in this order:

1. **Theme Frequency Map** — horizontal bar chart, bars color-coded by theme category (partnership = blue, rider = green, horse-specific = rust, training focus = gold). Category color key above chart.
2. **Process Goal Adherence** — stacked BarChart by week, stack order bottom-to-top: Not at all (rust) → Somewhat (amber `#D4A017`) → Mostly (light green `#8CC49B`) → Fully (green). Fully is the top segment with rounded top corners so the green growth trend reads upward visually.

For the Theme Frequency Map: theme data comes from the pre-processed weekly coaching document stored in Firestore, not recomputed from raw debriefs. If no processed theme data exists yet for a rider, render an empty state: "Theme patterns will appear here after your first AI coaching output."

---

## 9. Section 3 — The Journey (3 items)

Items in this order:

1. **Goal 1 progress card** — milestone path SVG + milestone list + next steps block + voice callout
2. **Goal 2 progress card** — same structure
3. **Reflection Category Balance** — heatmap table (8 most recent weeks × 6 categories)

### Milestone path SVG

The `MilestonePath` SVG component from the prototype should be ported exactly. Key elements:
- Thin track line (base): `var(--border)` at 4px
- Progress fill (colored): goal color at 5px, from left edge to progress marker
- Progress marker: vertical dashed line + small colored rectangle badge showing `{n}%`
- Milestone markers: ★ star shape for breakthroughs, circle for incremental, tan circle for foundation
- Goal endpoint: outlined circle labeled "GOAL"
- SVG legend at bottom: star = Breakthrough, circle = Incremental, tan circle = Foundation

### Reflection heatmap

- Row labels use `RC[category]` as text color — no exceptions
- Cell fill: `hexToRgba(RC[category], alpha)` where alpha is 0.28 / 0.62 / 0.88 for 1 / 2 / 3+ entries
- Empty cells: `var(--border)` at 0.33 alpha, no number rendered
- Total column at right: category color, font-weight 700
- Absence pattern (e.g. Obstacle going 4 weeks with 0) must be surfaced in the narrative text with the category name styled in its canonical color

---

## 10. Removing Old Data Visualizations

The existing data visualizations tab contained these charts (port names may vary):
- Ride Quality Over Time (line chart)
- Confidence Trajectory (line chart)
- Mental State Distribution (donut chart)
- Quality by Mental State (bar chart)
- Training Focus Distribution (donut chart)
- Theme Frequency Map (bar chart — this one carries forward to Section 2 in new form)
- Goal Progress (progress bars)

**Delete all of these components** except the Theme Frequency Map which is being redesigned and carried forward. Do not leave any imports, references, or dead code from the old visualization tab in the codebase.

If the old visualizations tab had its own Firestore query or data hook, remove that query. The `useInsightsData` hook in Section 4 replaces it.

---

## 11. Loading States

Each chart card should show a skeleton loading state while `useInsightsData` is fetching. Use the existing shimmer pattern from the app (same as used on Weekly Focus and Journey Map cards). Do not show partial data — show shimmer until the full `useInsightsData` result is available.

If a rider has fewer than 5 debriefs, show an empty state on Section 1 charts:

> "Quality patterns will appear here after a few more rides. Keep logging your debriefs."

Threshold: 5 debriefs minimum to render Section 1 charts. Section 2 and Section 3 can render with fewer (goal progress renders from profile data; reflection heatmap renders from whatever weeks exist).

---

## 12. Nav Entry Point — Dashboard

The existing `YourDataBlock` on the dashboard contains a `DmCard` entry for Data Visualizations. Update this card:

- **Label:** Change from "Data Visualizations" to "Insights"
- **Icon:** Keep existing chart icon or use `📊`
- **Description:** "Quality patterns, training themes, goal progress, and your journey over time."
- **href:** `/insights` (unchanged)

No other dashboard changes.

---

## 13. Implementation Checklist

### Data
- [ ] `useInsightsData(riderId)` hook built and tested with real Firestore data
- [ ] `buildHorseColorMap()` assigns colors dynamically from rider's actual horse names — no names hardcoded
- [ ] `horseColorMap` passed as prop to all chart components that use per-horse colors
- [ ] `HorseLegend` renders dynamically from `horseColorMap` — works correctly for 1, 2, 3, or more horses
- [ ] Arc averages and counts computed correctly (arc type from `rideArc` field)
- [ ] Session type averages computed per horse per type
- [ ] Mental state bubbles compute pct and avgQ correctly
- [ ] Goal adherence weekly aggregation correct
- [ ] Reflection heatmap limited to 8 most recent weeks
- [ ] Theme data reads from weekly coaching document, not recomputed
- [ ] Loading state triggers correctly; no flash of empty charts

### Components
- [ ] `InsightsPage.jsx` created with sticky header and section tab nav
- [ ] Section 1 all 5 charts render with live data
- [ ] Quality vs. Confidence diagonal renders via `<Customized>` — verify visually
- [ ] Ride Arc combo chart: left Y axis = quality, right Y axis = count, bars correctly colored per arc
- [ ] Mental state bubbles: size proportional to pct, labeled with pct and abbreviated name
- [ ] Section 2 both charts render with live data
- [ ] Theme bars color-coded by category (not uniform color)
- [ ] Goal adherence stacked bars: green (Fully) grows upward visually
- [ ] Section 3 goal cards render from profile data
- [ ] Milestone path SVG renders correctly at responsive widths
- [ ] Reflection heatmap category colors applied to row labels, cells, and narrative spans
- [ ] Obstacle absence pattern detected and surfaced in narrative if ≥3 consecutive zero weeks

### Cleanup
- [ ] Old data visualization tab component deleted
- [ ] Old chart sub-components deleted
- [ ] Old data hook or Firestore queries from old viz tab removed
- [ ] No dead imports remaining
- [ ] Dashboard DmCard label updated to "Insights"
- [ ] `/insights` route added to router config
- [ ] Insights nav entry added after Quick Start with `nav-special` styling

### QA
- [ ] All 5 Section 1 charts render correctly with real rider data
- [ ] Diagonal line visible on Quality vs. Confidence chart at all viewport widths
- [ ] Horse color mapping consistent across all charts (Pony = gold, RS = blue)
- [ ] Reflection category colors consistent: row labels, cells, narrative, voice callouts
- [ ] Charts are responsive: test at 375px, 768px, 1024px
- [ ] Empty state renders correctly for riders with < 5 debriefs
- [ ] No console errors

---

## 14. Reference Files

| File | Purpose |
|---|---|
| `ydj-insights-page.jsx` | **Primary reference** — complete component structure, styling, chart configuration, narrative copy |
| `YDJ_NavRevision_DashboardViz_Implementation_Brief.md` | Nav structure reference |
| `YDJ_Dashboard_Implementation_Brief.md` | Dashboard DmCard structure |
| `YDJ_AI_Coaching_Voice_Prompts_v3.md` | Voice callout tone and voice identities |
| `promptBuilder.js` | Theme data structure (how themes are stored in weekly coaching doc) |

---

*April 2026. Prototype: `ydj-insights-page.jsx`. Supersedes all previous data visualization tab implementation references.*
