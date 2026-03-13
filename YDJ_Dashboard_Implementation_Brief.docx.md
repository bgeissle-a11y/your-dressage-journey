**YDJ Dashboard — React Implementation Brief**

*Claude Code Handoff Document*

March 2026 · Your Dressage Journey

# **Overview**

This brief describes how to replace the current YDJ dashboard with the new three-block design. The definitive reference for all visual design and behaviour is the prototype file:

| ydj-dashboard-v4.html |
| :---- |

Open that file in a browser before starting. Everything in this brief refers to it.

## **What the new dashboard has**

* Three independently reorderable blocks, each in a white card with a shared block-header style

* Block 1 — Current Stats: four stat cards \+ conditional progress nudge \+ data viz panel (sparklines \+ intention bars)

* Block 2 — Weekly Focus: the full ydj-weekly-focus page embedded inline (celebration card, mode bar, four insight cards)

* Block 3 — Your Data: Record · Plan · Assess · Review · Export — all input and review links in one place

* Sticky top nav with grouped labels and a fixed utility trio (Quick Start, Insights, Help) always visible without scrolling

* Arrange mode: an "Arrange" button puts the dashboard into drag-and-drop reorder mode; order persists to localStorage (upgrade to Firestore later)

# **Files to Create or Modify**

## **New file**

* src/pages/Dashboard.jsx — the main dashboard component (replaces whatever currently exists)

## **Files to reference (do not modify)**

* src/pages/WeeklyFocus.jsx  — already exists as "ydj-weekly-focus". Import its inner content as a component, not the whole page route.

*⚠  Do not re-implement the Weekly Focus content inside Dashboard.jsx. Import it from WeeklyFocus or extract its inner JSX into a shared WeeklyFocusContent component. This keeps the two in sync.*

# **Component Architecture**

## **Top-level structure**

Dashboard

  ├── TopNav

  ├── WelcomeStrip  (includes Arrange button)

  ├── OrderToast

  └── BlockContainer  (flex-col, drag-and-drop target)

        ├── StatsBlock       data-block="stats"

        ├── WeeklyFocusBlock data-block="focus"

        └── YourDataBlock    data-block="data"

## **StatsBlock sub-components**

* StatCards — four cards, receives live Firestore counts as props

* ProgressNudge — conditional; hidden when all thresholds met

* VizPanel — sparklines SVG \+ intention bar chart; receives ride data as props

## **WeeklyFocusBlock**

Render the Weekly Focus content directly inside the block body. Two options:

1. If WeeklyFocus.jsx already has its content separated from page chrome (nav, etc.), import and render just the content portion.

2. If not, extract the inner content into src/components/WeeklyFocusContent.jsx, used by both the dashboard block and the standalone /weekly-focus route.

*ℹ  The block-header (title "Weekly Focus", date, progress counter) is provided by the dashboard block wrapper — do not duplicate it inside WeeklyFocusContent.*

## **YourDataBlock sub-components**

* DmGroup — reusable; takes a label and renders a grid of DmCards

* DmCard — takes icon, label, desc, href, variant (default | review | assess)

* ExportStrip — CSV and JSON download buttons

# **Top Navigation**

The nav is sticky (position: sticky, top: 0, z-index: 100\) and scrolls horizontally on mobile. Its structure left-to-right:

YDJ brand  |  ⌂ Home  |  ◈ Quick Start  ✦ Insights  ? Help  |

Record: Debrief Reflection Observation Lesson Health Event  |

Plan: Show Prep  |

AI Coaching: Weekly Focus Journey Map Multi-Voice Grand Prix  |

Profiles: Rider Horses

## **Key styling rules (copy from prototype)**

* Brand: Playfair Display, gold-light colour, right-border separator

* nav-special class: gold-light colour, font-weight 600 — applied to Quick Start, Insights

* nav-help class: lower opacity — applied to ? Help

* nav-group-label: tiny caps, very low opacity — section dividers within the scroll area

* Active page gets white text \+ gold-light bottom border (margin-bottom: \-2px to overlap nav border)

# **Block 1 — Current Stats**

## **Stat cards — live Firestore data**

Each stat card reads from Firestore. Use onSnapshot listeners or a single aggregated query. Required counts:

ridesLogged       — count of postRideDebriefs documents for this user

reflectionsCount  — count of reflections documents

categoriesCovered — count of distinct reflection category values used

ridingStreak      — computed: consecutive weeks with ≥1 debrief

## **Stat card variants**

* Default: gold border accent, gold stat value

* ok: green-tinted border (rgba(61,107,70,0.3)) — threshold met

* warn: rust-tinted border \+ background, rust stat value, small dot indicator top-right, stat-hint text below label — threshold not met

## **Thresholds (warn → ok transition)**

ridesLogged:       warn if \< 5,   ok if ≥ 5

reflectionsCount:  warn if \< 3,   ok if ≥ 3

categoriesCovered: warn if \< 6,   ok if \= 6  (show "N categories not yet tried")

ridingStreak:      no warn state (informational only)

## **Progress nudge**

Show the nudge div only when at least one threshold is unmet. Hide it completely (do not render) once all thresholds pass. The nudge text should name the specific missing reflection categories — query which of the 6 category values have never been submitted by this user.

The six category values (match exactly against Firestore field values):

"Personal Milestone"

"External Validation"

"Aha Moment"

"Obstacle"

"Connection"

"Feel/Body Awareness"

## **Viz panel — sparklines and bar chart**

The viz panel sits outside block-body, flush at the base of the card (see prototype — it has a top border and a slightly tinted background). It is two columns.

**Left column — Ride Quality & Confidence (sparklines)**

Pull the 8 most recent postRideDebriefs for this user, sorted by timestamp descending. Extract:

* overallQuality — integer 1–10

* confidenceScore — integer 1–10

Render as two SVG polyline sparklines using the same gradient \+ dot pattern from the prototype. The SVG is purely presentational — no charting library needed.

**Right column — Intention Ratings (bar chart)**

Pull the most recent 30 days of postRideDebriefs. For each intention field that has a rating (1–5), compute the average. Render as a simple div bar chart (no library). Bar width \= (avg / 5\) \* 100%.

*ℹ  If fewer than 5 debriefs exist, show a placeholder message inside the viz panel: "Your patterns will appear here after a few more rides." Do not render empty charts.*

# **Block 2 — Weekly Focus**

The block header (title, date range, progress counter) is part of the dashboard block wrapper. The Weekly Focus content renders inside block-body.

## **Embedding strategy**

3. Open src/pages/WeeklyFocus.jsx (the ydj-weekly-focus file).

4. Identify the page-level chrome (nav, page wrapper div, header with "Weekly Focus" title and date). These are already handled by the dashboard block wrapper — do not render them again.

5. Extract everything from the celebration card through the footer note into a new component: src/components/WeeklyFocusContent.jsx

6. WeeklyFocus.jsx (the standalone route) renders WeeklyFocusContent inside its own page chrome.

7. Dashboard WeeklyFocusBlock renders WeeklyFocusContent directly inside block-body.

## **State and interactivity**

WeeklyFocusContent manages its own local state (pinned cards, completed cards, mode). No changes to that logic. The progress counter (done-count / total-count) should be lifted to a callback prop so the block header can display it:

\<WeeklyFocusContent onProgressChange={(done, total) \=\> setProgress({done, total})} /\>

*ℹ  The Weekly Focus data (celebration moment, insight cards, GPT assignments, physical items) is currently static/mock in the prototype. Leave it as static for now — it will be wired to Firestore/Claude API in a later sprint.*

# **Block 3 — Your Data**

Five labeled groups, each with a horizontal rule label and a card grid. See prototype for exact visual treatment of each group.

## **Groups and routes**

RECORD (＋ arrow, default card style)

  Post-Ride Debrief  →  /debrief/new

  Reflection          →  /reflection/new

  Observation         →  /observation/new

  Lesson Notes        →  /lesson/new

  Health & Soundness  →  /health/new

  Journey Event       →  /event/new

PLAN (＋ arrow, default card style)

  Show Preparation    →  /show-prep/new

ASSESS (→ arrow, gold left-border, assess variant)

  Rider Self-Assessment        →  /assess/rider

  Technical & Philosophical    →  /assess/technical

  Physical Self-Assessment     →  /assess/physical

REVIEW (→ arrow, blue tint, review variant)

  All Debriefs         →  /debrief

  All Reflections      →  /reflection

  Observations         →  /observation

  Lesson Notes         →  /lesson

  Health Log           →  /health

  Journey Events       →  /event

  Show Preparations    →  /show-prep

EXPORT (no cards — renders ExportStrip component)

*ℹ  Use your existing route paths. If a path above does not match what is already in the router, use the existing path and note the discrepancy for Barb to confirm.*

## **Export strip**

Two buttons: "⬇ Export as CSV" and "⬇ Export as JSON". For now these can be placeholders (console.log or alert). Full export logic — querying all Firestore collections for the user and serialising — is a separate sprint.

# **Arrange Mode (Block Reordering)**

## **How it works**

* An "⠿ Arrange" button sits in the welcome strip, right of the tagline.

* Clicking it toggles body class arrange-mode and changes button text to "✓ Done".

* In arrange mode: each block gets a dashed gold outline and a "⠿⠿ Drag" pill appears in its block-header.

* Blocks are draggable. Drop before or after the midpoint of the target to insert before or after.

* Clicking "✓ Done" saves the order and shows a toast: "Layout saved ✓".

## **Persistence**

Phase 1 (implement now): localStorage key ydj-block-order, value: JSON array of block IDs, e.g. \["focus","stats","data"\]. Apply saved order on mount.

Phase 2 (later): Move the save/load to a dashboardLayout field on the user's Firestore document. The drag logic does not change — only the read/write calls.

## **Implementation approach in React**

The prototype uses native HTML5 drag-and-drop (dragstart, dragover, drop events). In React you can use the same native API with refs, or use a lightweight library such as @dnd-kit/core. Either approach is acceptable. The prototype JS is the reference for the exact drag behaviour (insert before/after based on midpoint of target).

*ℹ  The drag handle element (.drag-handle) must call e.stopPropagation() to prevent the block-header click handler from firing during drag.*

# **CSS / Design Tokens**

All CSS variables, block styles, card styles, and component-level styles are in ydj-dashboard-v4.html. Copy them directly into your stylesheet or CSS-in-JS solution. Do not re-derive colours from scratch.

## **Critical tokens**

\--parchment:      \#f5ede0   (page background)

\--parchment-dark: \#e8d9c4   (borders, panel backgrounds)

\--ink:            \#2c1f14   (primary text)

\--ink-light:      \#6b4f38   (secondary text, labels)

\--gold:           \#b8862a   (primary accent)

\--gold-light:     \#d4a84b   (hover states, nav active)

\--rust:           \#7a3020   (warn state, nudge)

\--forest-light:   \#3d6b46   (ok/done state)

\--sky:            \#2e5c82   (review cards, gpt voice)

\--opt:            \#7a3f72   (coaching voice, insight links)

## **Fonts**

Playfair Display (headings, stat values, blockquotes) and Work Sans (all body text, UI labels, buttons). Already in the project — confirm Google Fonts import is present.

## **Block shared styles**

Every block uses the same .block wrapper: white background, 1.5px border in \--parchment-dark, 16px border-radius, overflow hidden, margin-bottom 1.5rem. The .block-header uses \--parchment-off background with a bottom border. Copy exactly from prototype.

# **Firestore Queries**

The dashboard needs four queries. All should use onSnapshot for live updates.

1\. Aggregate counts

   collection: postRideDebriefs

   filter: userId \== currentUser.uid

   output: count for ridesLogged

2\. Reflection counts \+ categories

   collection: reflections

   filter: userId \== currentUser.uid

   output: count for reflectionsCount

           distinct values of "category" field for categoriesCovered

3\. Recent debriefs (viz panel)

   collection: postRideDebriefs

   filter: userId \== currentUser.uid

   order: timestamp desc

   limit: 8

   output: overallQuality, confidenceScore per doc

4\. Intention ratings (viz panel)

   collection: postRideDebriefs

   filter: userId \== currentUser.uid, timestamp \>= 30 days ago

   output: all intention rating fields — average each across results

*ℹ  Verify the exact Firestore collection names and field names against the existing form submission handlers before writing these queries. Do not assume field names match the labels in this brief.*

*⚠  The riding streak (consecutive weeks with ≥1 debrief) requires client-side computation over the full debrief history sorted by date. Compute it from query \#3 extended to the full history, or add it as a separate query. Do not add a Cloud Function for this — it is lightweight enough to compute client-side.*

# **Implementation Checklist**

## **Setup**

* Open ydj-dashboard-v4.html in a browser — this is the reference throughout

* Identify the existing dashboard file/component and note its current route

* Identify WeeklyFocus.jsx (ydj-weekly-focus) and review its structure

## **Component scaffolding**

* Create src/pages/Dashboard.jsx

* Extract WeeklyFocusContent from WeeklyFocus.jsx into src/components/WeeklyFocusContent.jsx

* Update WeeklyFocus.jsx to use WeeklyFocusContent

* Add TopNav, WelcomeStrip, BlockContainer to Dashboard.jsx

## **Block 1 — Current Stats**

* Wire Firestore queries for counts and recent rides

* Implement stat card ok/warn states with correct thresholds

* Implement ProgressNudge with dynamic missing-category text

* Implement sparkline SVGs (use the prototype SVG generation pattern)

* Implement intention bar chart

* Confirm viz panel renders correctly with \< 5 debriefs (placeholder state)

## **Block 2 — Weekly Focus**

* Render WeeklyFocusContent inside WeeklyFocusBlock body

* Lift progress counter to block-header via onProgressChange prop

* Confirm all interactivity works (pin, done, collapse, mode toggle)

## **Block 3 — Your Data**

* Implement five DmGroups with correct routes

* Verify all routes exist in the router — note any mismatches

* Add ExportStrip as placeholder

## **Arrange mode**

* Implement Arrange toggle button in WelcomeStrip

* Implement drag-and-drop reorder (native HTML5 or @dnd-kit/core)

* Save order to localStorage on "Done"

* Apply saved order on mount

* Implement toast notification

## **Polish**

* Confirm sticky nav scrolls horizontally on mobile without showing scrollbar

* Test on iOS Safari (known iOS quirks: localStorage, sticky positioning)

* Confirm Playfair Display \+ Work Sans fonts load correctly

* Confirm all CSS variables are applied — compare visually to prototype

* Confirm arrange mode does not interfere with existing card click/interactive targets

# **Out of Scope for This Sprint**

Do not implement the following in this pass — they are separate work items:

* Wiring Weekly Focus cards to live Claude API / Firestore data

* Export functionality (CSV/JSON download)

* Moving block order from localStorage to Firestore

* Quick Start Map onSnapshot completion tracking (already built separately)

* Stripe gating / subscription tier checks on dashboard elements