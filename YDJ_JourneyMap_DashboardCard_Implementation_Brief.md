# YDJ — Journey Map Dashboard Card & Coach Brief Integration
## Implementation Brief · Claude Code Handoff
### April 2026

---

## Overview

This brief covers two changes:

1. **Journey Snapshot card** — a compact card added to the Current Stats block (Block 1) on the dashboard, surfacing trajectory direction, emerging themes, and a one-sentence excerpt from the Journey Map with a link to the full output.

2. **Weekly Coach Brief update** — adds trajectory direction and emerging themes to the brief, with a 14-day staleness rule.

Both changes read from a new `dashboardSummary` sub-object written to `analysis/journeyMap/{uid}` at Journey Map generation time. See `YDJ_Prompt_Additions_JourneyMap_DashboardSummary.md` for the prompt changes and Firestore write logic.

**No new AI calls.** Both surfaces are pure Firestore reads.

---

## Part 1 — Journey Snapshot Dashboard Card

### 1.1 Placement

The card lives in **Block 1 (Current Stats)** of `Dashboard.jsx`, below the four stat cards and above the viz panel. It spans the full block width — it is not a fifth stat card; it is a distinct band between the stats and the viz.

```
Block 1 — Current Stats
  ├── StatCards row (4 cards)
  ├── ProgressNudge (conditional)
  ├── [NEW] JourneySnapshot card       ← insert here
  └── VizPanel (Movement Coverage + Process Goals)
```

### 1.2 Firestore Source

```
analysis/journeyMap/{uid}
  → dashboardSummary.trajectoryDirection   string
  → dashboardSummary.emergingThemes        string[]
  → dashboardSummary.excerpt               string
  → dashboardSummary.generatedAt           timestamp
```

Read alongside existing dashboard Firestore queries — no additional round trip if journey map data is already fetched.

### 1.3 Visual Spec

**Container**

```css
.journey-snapshot {
  margin: 0 1.25rem 0 1.25rem;   /* matches stat-cards horizontal padding */
  padding: 0.85rem 1rem;
  border-radius: 8px;
  background: var(--parchment);
  border: 1px solid rgba(184, 134, 42, 0.22);   /* gold at 22% opacity */
  border-left: 4px solid var(--trajectory-color);   /* dynamic — see §1.4 */
  display: flex;
  align-items: flex-start;
  gap: 0.9rem;
}
```

**Left column — direction badge**

```css
.journey-snapshot-badge {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.trajectory-icon {
  font-size: 1.1rem;   /* emoji icon — see §1.4 */
}

.trajectory-label {
  font-family: 'Work Sans', sans-serif;
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--trajectory-color);
  white-space: nowrap;
}
```

**Right column — content**

```css
.journey-snapshot-content {
  flex: 1;
  min-width: 0;
}

.journey-snapshot-excerpt {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 0.85rem;
  font-style: italic;
  color: var(--ink);
  line-height: 1.45;
  margin: 0 0 0.55rem 0;
}

.journey-snapshot-themes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-bottom: 0.55rem;
}

.theme-chip {
  font-family: 'Work Sans', sans-serif;
  font-size: 0.68rem;
  font-weight: 500;
  color: var(--ink);
  background: rgba(184, 134, 42, 0.10);   /* gold at 10% */
  border: 1px solid rgba(184, 134, 42, 0.28);
  border-radius: 20px;
  padding: 0.18rem 0.55rem;
}

.journey-snapshot-link {
  font-family: 'Work Sans', sans-serif;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--gold);       /* #B8862A */
  text-decoration: none;
  letter-spacing: 0.01em;
}

.journey-snapshot-link:hover {
  text-decoration: underline;
}
```

### 1.4 Trajectory Direction — Colors and Icons

Apply `--trajectory-color` as a CSS custom property on the `.journey-snapshot` element. The border-left and badge label inherit from it.

| `trajectoryDirection` | `--trajectory-color` | Icon | Badge label |
|---|---|---|---|
| `Ascending` | `#5B9E6B` (forest green) | ↑ | Ascending |
| `Productive Stability` | `#B8862A` (gold) | ◆ | Stable |
| `Stretching` | `#4A9EC4` (sky blue) | ⟳ | Stretching |
| `Plateauing` | `#C4943A` (amber) | — | Plateauing |
| `Struggling` | `#C45252` (rust) | ↓ | Struggling |
| `Recalibrating` | `#8B5EA0` (purple) | ⟲ | Recalibrating |

Apply inline style or a data attribute:

```jsx
<div
  className="journey-snapshot"
  data-trajectory={trajectoryDirection}
  style={{ '--trajectory-color': TRAJECTORY_COLORS[trajectoryDirection] }}
>
```

### 1.5 Card Content Rendering

```jsx
// JourneySnapshot.jsx

const TRAJECTORY_COLORS = {
  'Ascending':            '#5B9E6B',
  'Productive Stability': '#B8862A',
  'Stretching':           '#4A9EC4',
  'Plateauing':           '#C4943A',
  'Struggling':           '#C45252',
  'Recalibrating':        '#8B5EA0',
};

const TRAJECTORY_ICONS = {
  'Ascending':            '↑',
  'Productive Stability': '◆',
  'Stretching':           '⟳',
  'Plateauing':           '—',
  'Struggling':           '↓',
  'Recalibrating':        '⟲',
};

const TRAJECTORY_LABELS = {
  'Ascending':            'Ascending',
  'Productive Stability': 'Stable',
  'Stretching':           'Stretching',
  'Plateauing':           'Plateauing',
  'Struggling':           'Struggling',
  'Recalibrating':        'Recalibrating',
};
```

**Rendered layout:**

```
[↑]                  "Something shifted in your confidence at the
Ascending             canter depart; the data suggests it happened
                      on March 14th."

                     [timing precision] [throughness under pressure]

                     View your Journey Map →
```

### 1.6 Header Row

Above the card, a small section label — consistent with other section headers in the block:

```jsx
<div className="snapshot-section-header">
  <span className="snapshot-label">🗺 Your Journey</span>
</div>
```

```css
.snapshot-section-header {
  padding: 0.5rem 1.25rem 0.3rem;
}

.snapshot-label {
  font-family: 'Work Sans', sans-serif;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ink);
  opacity: 0.55;
}
```

### 1.7 Empty States

**No Journey Map generated yet:**
```jsx
<div className="journey-snapshot journey-snapshot--empty">
  <p className="journey-snapshot-excerpt">
    Generate your Journey Map to see your trajectory here.
  </p>
</div>
```
Apply a neutral border-left: `2px solid var(--gold)` at 30% opacity. No badge, no themes, no link.

**Journey Map exists but no `dashboardSummary` field** (pre-migration data):
Show same empty state. Do not fall back to parsing the Journey Map narrative.

**Loading state:**
Render a skeleton shimmer matching the card dimensions while Firestore data is in flight. Use the existing shimmer pattern from the app (if one exists); otherwise a simple `background: linear-gradient(...)` animation.

### 1.8 Link Destination

```
/outputs/journey-map
```

The link text is: **View your Journey Map →**

---

## Part 2 — Weekly Coach Brief Integration

### 2.1 New Field: Journey Trajectory

Add a **Journey Trajectory** row to the brief, between "Rider Trajectory" (from GPT L2) and "Growth Edge."

| Brief field | Source | Query |
|---|---|---|
| Journey trajectory direction | `analysis/journeyMap/{uid}` | `dashboardSummary.trajectoryDirection` |
| Journey emerging themes | `analysis/journeyMap/{uid}` | `dashboardSummary.emergingThemes` |
| Journey excerpt | `analysis/journeyMap/{uid}` | `dashboardSummary.excerpt` |
| Journey staleness check | `analysis/journeyMap/{uid}` | `dashboardSummary.generatedAt` |

### 2.2 Staleness Rule

**If `dashboardSummary.generatedAt` is more than 14 days before the brief generation date, omit the Journey Trajectory section entirely.** Do not show stale trajectory data to a coach.

```javascript
const JOURNEY_STALE_DAYS = 14;

function isJourneyDataFresh(generatedAt) {
  if (!generatedAt) return false;
  const ageMs = Date.now() - generatedAt.toMillis();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return ageDays <= JOURNEY_STALE_DAYS;
}

// In brief assembly:
if (journeyData?.dashboardSummary && isJourneyDataFresh(journeyData.dashboardSummary.generatedAt)) {
  briefData.journeyTrajectory = {
    direction: journeyData.dashboardSummary.trajectoryDirection,
    themes: journeyData.dashboardSummary.emergingThemes,
    excerpt: journeyData.dashboardSummary.excerpt,
    asOf: journeyData.dashboardSummary.generatedAt
  };
} else {
  briefData.journeyTrajectory = null;   // section omitted from brief
}
```

### 2.3 Brief Template — Journey Trajectory Section

Render when `briefData.journeyTrajectory` is non-null:

```html
<div class="brief-section brief-section--journey">
  <div class="brief-section-label">Journey Snapshot</div>
  <div class="journey-direction-row">
    <span class="direction-chip direction-chip--{{ direction | kebabCase }}">
      {{ direction }}
    </span>
    <span class="brief-themes">
      {{ themes | join(' · ') }}
    </span>
  </div>
  <p class="brief-excerpt">{{ excerpt }}</p>
  <div class="brief-as-of">
    As of {{ asOf | formatDate('MMM D') }}
  </div>
</div>
```

**Direction chip colors** in the brief HTML email:

Use inline styles (email clients do not reliably render CSS classes):

| Direction | Background | Text color |
|---|---|---|
| Ascending | `#e8f5ee` | `#2d7a4f` |
| Productive Stability | `#fdf3e0` | `#8a6010` |
| Stretching | `#e6f3fa` | `#2a6e8c` |
| Plateauing | `#fdf0e0` | `#8a5e10` |
| Struggling | `#faeaea` | `#8a2020` |
| Recalibrating | `#f2edf8` | `#5e3a82` |

### 2.4 Update to Coach Brief Data Sources Table

Add this row to the data sources table in `YDJ_WeeklyCoachBrief_Implementation_Brief.md`:

| Journey Snapshot | `analysis/journeyMap/{uid}` | `dashboardSummary.trajectoryDirection`, `dashboardSummary.emergingThemes`, `dashboardSummary.excerpt`; omit if `dashboardSummary.generatedAt` > 14 days ago |

### 2.5 Update to Conditional Rendering Rules Table

Add this row to the conditional rendering table in `YDJ_WeeklyCoachBrief_Implementation_Brief.md`:

| Journey Snapshot | No Journey Map generated, OR `dashboardSummary` absent, OR `generatedAt` > 14 days ago | Omit section entirely |

---

## Part 3 — Implementation Checklist

### Prompt & Generation (do first)
- [ ] Read `YDJ_Prompt_Additions_JourneyMap_DashboardSummary.md` in full before making any prompt changes
- [ ] Add `DASHBOARD SUMMARY EXTRACTION` block to Journey Map Call 1 system prompt
- [ ] Add `validateDashboardSummary()` function to Journey Map API route
- [ ] Add `dashboardSummary` write to Journey Map Firestore document post-generation
- [ ] Verify: after a test generation, `analysis/journeyMap/{uid}` contains `dashboardSummary` with all four fields
- [ ] Verify: `trajectoryDirection` value matches controlled vocabulary exactly
- [ ] Verify: `emergingThemes` is an array, 1–3 items
- [ ] Verify: `excerpt` is a single non-empty sentence

### Dashboard Card
- [ ] Create `JourneySnapshot.jsx` component (or add inline to `Dashboard.jsx`)
- [ ] Add `TRAJECTORY_COLORS`, `TRAJECTORY_ICONS`, `TRAJECTORY_LABELS` constants
- [ ] Fetch `analysis/journeyMap/{uid}` → `dashboardSummary` (add to existing dashboard Firestore query batch)
- [ ] Insert `JourneySnapshot` into Block 1 between `ProgressNudge` and `VizPanel`
- [ ] Apply `.journey-snapshot` CSS with correct fonts (Playfair Display excerpt, Work Sans labels/chips/link)
- [ ] Apply dynamic `--trajectory-color` CSS custom property from `TRAJECTORY_COLORS[direction]`
- [ ] Render `border-left: 4px solid var(--trajectory-color)`
- [ ] Render direction badge (icon + label) — Work Sans, uppercase, 0.6rem, 700 weight
- [ ] Render excerpt — Playfair Display italic, 0.85rem
- [ ] Render theme chips — Work Sans, 0.68rem, gold tint background
- [ ] Render "View your Journey Map →" link — Work Sans, 0.72rem, 600 weight, `var(--gold)` color
- [ ] Render section header "🗺 Your Journey" — Work Sans, 0.65rem, uppercase, 55% opacity
- [ ] Empty state: no `dashboardSummary` → "Generate your Journey Map to see your trajectory here."
- [ ] Loading state: shimmer skeleton while Firestore data is in flight
- [ ] Dark mode: verify parchment background, gold chip borders, and ink text all render correctly
- [ ] Mobile (375px): verify card does not overflow; themes wrap correctly; link is tappable

### Weekly Coach Brief
- [ ] Add `isJourneyDataFresh()` staleness check function to brief assembly logic
- [ ] Add `journeyTrajectory` field assembly to `briefData` object (null if stale or absent)
- [ ] Add Journey Snapshot section to brief HTML template with inline styles for email
- [ ] Verify: brief renders correctly when journey data is fresh (< 14 days)
- [ ] Verify: Journey Snapshot section is completely absent when data is stale (> 14 days)
- [ ] Verify: Journey Snapshot section is completely absent when no Journey Map exists
- [ ] Update `YDJ_WeeklyCoachBrief_Implementation_Brief.md` data sources table (§2.4 above)
- [ ] Update `YDJ_WeeklyCoachBrief_Implementation_Brief.md` conditional rendering table (§2.5 above)

---

## Part 4 — Files Modified

| File | Change |
|---|---|
| Journey Map API route (Cloud Function) | Add `dashboardSummary` extraction, validation, and Firestore write |
| `src/pages/Dashboard.jsx` | Insert `JourneySnapshot` between `ProgressNudge` and `VizPanel` in Block 1 |
| `src/components/JourneySnapshot.jsx` | New component |
| Global CSS | Add `.journey-snapshot`, `.trajectory-label`, `.theme-chip`, `.journey-snapshot-link`, `.snapshot-section-header` |
| `generateWeeklyCoachBrief` Cloud Function | Add journey trajectory assembly with staleness check |
| Brief HTML template | Add Journey Snapshot section with inline email styles |

**Documents to update after implementation:**
- `YDJ_WeeklyCoachBrief_Implementation_Brief.md` — data sources table and conditional rendering table (see §2.4 and §2.5)
- `CLAUDE.md` — note that `analysis/journeyMap/{uid}` now carries `dashboardSummary` sub-object

---

*Reference files: `YDJ_Prompt_Additions_JourneyMap_DashboardSummary.md` (prompt changes + Firestore write), `YDJ_NavRevision_DashboardViz_Implementation_Brief.md` (Block 1 structure), `YDJ_WeeklyCoachBrief_Implementation_Brief.md` (brief architecture), `ydj-dashboard-v4.html` (visual reference)*
