# YDJ Arena Geometry Trainer — Claude Code Implementation Brief

**Feature:** Arena Geometry Trainer (standalone interactive tool)  
**Priority:** Complete before Test Practice Mode (Phase 2 of this feature)  
**Scope:** Two deliverables — (1) new page, (2) navigation hookups in two existing files  
**No Firebase reads or writes required** — this feature is entirely client-side  
**No new API keys required** — uses the same Anthropic API pattern as existing AI calls  

---

## What This Is

An interactive, touch-first arena diagram where riders trace dressage figures with a finger and receive geometry accuracy scoring plus a short Classical Master AI coaching response. It is a standalone learning tool — not connected to rider data, Firestore, or any output pipeline.

**URL/route:** `/arena-trainer` (React router) or `arena-geometry-trainer.html` (current HTML pattern)  
**Access:** Available to all logged-in users regardless of subscription tier — this is a platform-wide learning resource, not a gated coaching output.

---

## Deliverable 1 — Create `arena-geometry-trainer.html`

Create a new file `arena-geometry-trainer.html` in the project root alongside the other HTML form/tool files. This file is complete and self-contained.

### Design requirements
- Use the **exact same design tokens** as `ydj-dashboard-v4.html`: `--parchment`, `--ink`, `--gold`, `--gold-light`, `--parchment-dark`, `--forest-light`, `--rust`
- Use **Playfair Display** (headings) + **Work Sans** (body/UI) from Google Fonts — same import as all other YDJ pages
- Mobile-first. The arena SVG must scale to `min(300px, 80vw)` — riders use this at the barn on phones
- Include a top nav bar matching the YDJ nav style in `ydj-dashboard-v4.html` (dark background, gold brand, same font/spacing). Nav links: `⌂ Home` (links to dashboard), the YDJ brand word mark left-aligned.

### Arena geometry — use these exact values (from `YDJ_Event_Preparation_Guardrails.md`)

**Coordinate system:** Origin top-left of arena interior. X: 0–20m (left wall to right wall). Y: 0–60m (C end at top, A end at bottom).

**Wall letter Y-positions:**
- C: y=0, A: y=60
- H: y=6, M: y=6
- S: y=18, R: y=18
- E: y=30, B: y=30
- V: y=42, P: y=42
- K: y=54, F: y=54

**Wall letter X-positions:** H, S, E, V, K are on x=0 (left wall). M, R, B, P, F are on x=20 (right wall). C and A are on x=10 (short sides, centerline).

**Centerline letters:** G(10,6), I(10,18), X(10,30), L(10,42), D(10,54)

### Nine figures to implement

All ideal paths are mathematically defined. No freehand approximations.

**Group 1 — 20m Circles**

| Figure ID | Title | Center | Radius | Start point | Key contacts |
|---|---|---|---|---|---|
| `20A` | 20m Circle at A | (10, 50) | 10 | A (10,60) | Walls at y=50 (4m past K and F — NOT at K or F); centerline at y=40 |
| `20C` | 20m Circle at C | (10, 10) | 10 | C (10,0) | Walls at y=10 (4m past H and M — NOT at H or M); centerline at y=20 |
| `20X` | 20m Circle at X | (10, 30) | 10 | E (0,30) | Exactly at E (0,30) and B (20,30); centerline at y=20 and y=40 |

**Group 2 — 15m / 10m / 8m**

| Figure ID | Title | Center | Radius | Start point | Key contacts |
|---|---|---|---|---|---|
| `15A` | 15m Circle at A | (10, 52.5) | 7.5 | A (10,60) | Does NOT touch walls — 2.5m gap each side |
| `10E` | 10m Circle at E | (5, 30) | 5 | E (0,30) | E on wall (0,30); X on centerline (10,30) |
| `10B` | 10m Circle at B | (15, 30) | 5 | B (20,30) | B on wall (20,30); X on centerline (10,30) |
| `8E`  | 8m Volte at E   | (4, 30)  | 4 | E (0,30) | E on wall (0,30); right edge at x=8 — 2m short of centerline. CRITICAL: must NOT reach X |

**Group 3 — Lines & Loops**

**One Loop (F–X–M):** A single smooth arc from F (20,54) through X (10,30) to M (20,6). This is a large-radius circular arc — compute the circumscribed circle through those three points. Center ≈ (43.8, 30), radius ≈ 33.8. Start at F (20,54).

**3-Loop Serpentine:** Three consecutive half-circles from A to C.
- Loop 1: center (10,50), half-circle from A (10,60) to (10,40), bulging right (max x=20 at y=50, which is 10m from A on right wall)
- Loop 2: center (10,30), half-circle from (10,40) to (10,20), bulging left (min x=0 at y=30, which is exactly E)  
- Loop 3: center (10,10), half-circle from (10,20) to C (10,0), bulging right (max x=20 at y=10, which is 50m from A on right wall)
- Centerline crossings perpendicular at y=40 and y=20

### Scoring algorithm

After rider lifts finger, evaluate the recorded point array against the ideal path:

```javascript
function evaluate(userPoints, idealPoints) {
  const resampled = resample(userPoints, 100);  // evenly-spaced 100 points
  
  // Average deviation: for each user point, find nearest ideal point
  const devs = resampled.map(p =>
    idealPoints.reduce((min, q) => Math.min(min, dist(p, q)), Infinity)
  );
  const avgDev = mean(devs);
  
  // Coverage: what % of ideal path did the user come within 1.5m of?
  const coverage = idealPoints.filter(q =>
    userPoints.some(p => dist(p, q) < 1.5)
  ).length / idealPoints.length;
  
  // Grade
  const grade =
    avgDev < 0.8 && coverage > 0.8 ? "Excellent" :
    avgDev < 1.4 && coverage > 0.65 ? "Good" :
    avgDev < 2.5 && coverage > 0.45 ? "Fair" : "Needs Work";
  
  return { avgDev, coverage: Math.round(coverage * 100), grade };
}
```

Deviation is measured in arena meters (same unit as the SVG coordinate system where 1 unit = 1 meter).

### Classical Master AI coaching call

After scoring, make one Claude API call. Use the same Anthropic API pattern as existing calls.

```javascript
// System / user prompt
const prompt = `You are The Classical Master from Your Dressage Journey — 
precise, demanding, classically grounded. Never sentimental. Pithy.

A rider traced a ${figure.title} on an interactive arena diagram.
Grade: ${result.grade}. Average deviation: ${result.avgDev.toFixed(1)}m. 
Coverage: ${result.coverage}%.

Geometry context: ${figure.aiHint}

Give exactly 2–3 sentences of coaching. Reference specific landmarks 
(letters, centerline, wall contacts). Never begin with "I". 
Even for Excellent, find something to sharpen.`;

// Call
fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 130,
    messages: [{ role: "user", content: prompt }]
  })
})
```

**`aiHint` values per figure** (pass to the prompt above):

| Figure | aiHint |
|---|---|
| 20A | "Wall contacts are at y=50 — 4m past K and F, NOT at those letters. Most riders touch K and F instead, producing a flattened circle." |
| 20C | "Wall contacts are at y=10 — 4m past H and M, NOT at those letters." |
| 20X | "Must touch E (0,30) and B (20,30) exactly. Centerline contacts at y=20 and y=40." |
| 15A | "The 15m circle does NOT touch the walls — 2.5m open space on each side. Most riders ride this as a 20m circle." |
| 10E | "Must touch E on the wall (0,30) and reach exactly to X on the centerline (10,30). 10m total width." |
| 10B | "Must touch B on the wall (20,30) and reach exactly to X on the centerline (10,30). 10m total width." |
| 8E  | "Right edge of the volte reaches to x=8 — stopping 2m short of the centerline. Reaching X means the volte is too large." |
| loop | "Arc must pass through X at (10,30). The curve must be smooth and symmetrical — equal arc above and below X." |
| serp | "Centerline crossings at y=40 and y=20 must be perpendicular — diagonal drift is the most common error. Loop 2 (center loop) must exactly reach E at (0,30)." |

### UI components and interaction

**Figure selector** — three labeled groups above the arena: "20m Circles", "15m / 10m / 8m", "Lines & Loops". Selected figure uses `--gold` background. Pill-shaped buttons.

**Info card** — below selector, above arena. Shows figure title and one-sentence geometry fact. Uses parchment background with subtle border.

**Arena SVG** — `viewBox="-4 -4 28 68"` (with padding for letter labels outside the border). Touch-action: none. Pointer events for draw.

**Arena visual elements:**
- Outer background rect: `#e8d8c0` (slightly darker than parchment, fills the 4px padding border area)
- Arena surface fill: `#f5e8d0` (warm sand)  
- Arena border: `#5c3d2e`, strokeWidth 0.55
- Centerline (x=10): dashed, `#c9a87c`, opacity 0.5
- Horizontal grid lines at E/B level (y=30): slightly more prominent dashed line
- Horizontal grid lines at H/M, S/R, V/P, K/F levels: faint dashed
- Wall tick marks at all letter positions
- Wall letters: Playfair Display, size 1.85, `#3d2b1f`, positioned 2.2 units outside the wall
- Centerline letter labels: size 1.05, `#b8924e`, opacity 0.6, positioned 1.3 units right of the center dot

**Ideal path:** Dashed line, `#BA7517` (dark gold), strokeWidth 0.65. Reduces to 0.5 opacity when user trace is showing. Toggle button: "Show Ideal" / "Hide Ideal".

**User trace:** Solid line, `#7a3050` (warm plum — the YDJ optional/accent color), strokeWidth 0.75. Subtle drop shadow filter.

**Start indicator:** Green pulsing dot (three concentric circles, `--forest-light` color) at the figure's start point when phase is "ready".

**Controls row** (below arena):
- "Show Ideal" / "Hide Ideal" — amber outline/fill toggle
- "Key Points" / "Hide Key Points" — forest green outline/fill toggle; shows green dots at named geometry contacts
- "↩ Try Again" — appears only after a trace; plain outline button

**Legend** (below controls, above feedback):
- Dashed amber line + "Ideal" label
- Solid plum line + "Your trace" label
- Appears only when relevant

**Feedback panel** (appears after trace completes):
- Grade badge: color-coded pill (`--forest-light` for Excellent, medium green for Good, gold for Fair, rust for Needs Work)
- Score line: "avg Xm off ideal · XX% coverage"
- Classical Master quote: left-bordered in gold (`--gold`), italic, 13px
- Loading state: "The Classical Master considers…" in muted text
- Key geometry pills: small tags showing the named contact points for this figure

### Grade badge colors
- Excellent: `#3d6b46` (forest green — `--forest-light`)
- Good: `#639922`
- Fair: `#b8862a` (gold — `--gold`)  
- Needs Work: `#7a3020` (rust — `--rust`)

---

## Deliverable 2 — Navigation hookups in `ydj-dashboard-v4.html`

Two changes to this file. Do not modify anything else.

### Change 2a — Top nav: add "Learn" group

**File:** `ydj-dashboard-v4.html`  
**Location:** Line 666, after the `Horses` nav-btn and before the closing `</nav>` tag  
**Action:** Append the following HTML

```html
  <div class="nav-sep"></div>

  <!-- Learn -->
  <span class="nav-group-label">Learn</span>
  <a href="arena-geometry-trainer.html" class="nav-btn">Arena Trainer</a>
```

**Result:** The top nav now reads: … Profiles | Rider · Horses | Learn | Arena Trainer

### Change 2b — Dashboard Block 3: add "Learn" group to the data menu

**File:** `ydj-dashboard-v4.html`  
**Location:** Find the `<!-- Export -->` div (approximately line 1149). Insert the following block **immediately before** `<!-- Export -->`.

```html
        <!-- Learn -->
        <div class="dm-group">
          <div class="dm-group-label">Learn</div>
          <div class="dm-cards">
            <a href="arena-geometry-trainer.html" class="dm-card" style="border-left-color:#3d6b46">
              <div class="dm-icon">◎</div>
              <div class="dm-text">
                <div class="dm-label">Arena Geometry Trainer</div>
                <div class="dm-desc">Trace figures · get coaching feedback</div>
              </div>
              <div class="dm-arrow">→</div>
            </a>
          </div>
        </div>
```

**Note:** `border-left-color:#3d6b46` is `--forest-light` — a distinct color from the other groups, appropriate for a learning/reference tool. The `◎` icon matches the visual language of the arena circle concept.

---

## Deliverable 3 — Add to `ydj-quickstart-map.html`

Add the Arena Trainer as a resource item in the footer section. It does not belong in the main flow (it's not a step), but it should be discoverable from the map.

**File:** `ydj-quickstart-map.html`  
**Location:** Find `<!-- FOOTER -->` (approximately line 729). Insert the following block **immediately before** `<!-- FOOTER -->`.

```html
  <!-- Tools -->
  <div style="margin: 24px 0 16px; padding: 16px 18px; background: white; border-radius: 12px; border: 1px solid var(--parchment-dark);">
    <div style="font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--gold); margin-bottom: 10px;">Tools & Resources</div>
    <a href="arena-geometry-trainer.html" style="display:flex; align-items:center; gap: 12px; text-decoration:none; color: var(--ink); padding: 8px 0; border-bottom: 1px solid var(--parchment-dark);">
      <div style="width:32px; height:32px; border-radius:8px; background:rgba(61,107,70,0.1); display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0;">◎</div>
      <div>
        <div style="font-size:13px; font-weight:600; margin-bottom:2px;">Arena Geometry Trainer</div>
        <div style="font-size:12px; color:var(--ink-light); line-height:1.4;">Trace 20m circles, serpentines, voltes, and loops. Get instant geometry feedback and Classical Master coaching.</div>
      </div>
      <div style="margin-left:auto; color:var(--gold); font-size:14px; flex-shrink:0;">→</div>
    </a>
  </div>
```

---

## What is NOT in scope for this brief

The following are planned but belong in a separate implementation brief:

- **Test Practice Mode** (Phase 2) — step-through of full test movements with figure tracing at each applicable movement. Uses `comprehensive_dressage_test_database.json`. 6 tests: Training 3, First 3, Second 3, Third 3, Fourth 3, PSG. Separate brief to follow.
- **Show Preparation output contextual link** — a "Practice this figure" link from the Show Prep output to the Arena Trainer. Defer until Show Prep output is fully implemented.
- **React component conversion** — when the frontend migrates to React, `arena-geometry-trainer.html` becomes `ArenaGeometryTrainer.jsx` with the `/arena-trainer` route. The logic is identical; only the wrapper changes. No separate brief needed — it's a straightforward port.

---

## Testing checklist

Before marking complete, verify:

- [ ] Arena SVG renders correctly at 320px viewport width (iPhone SE)
- [ ] Pointer tracing works on iOS Safari (touch events)
- [ ] All 9 figures produce a visible ideal path
- [ ] Scoring runs after finger lift — grade and deviation displayed
- [ ] Classical Master coaching text appears within 3 seconds of trace completion
- [ ] "Key Points" toggle shows/hides green geometry reference dots
- [ ] "Hide Ideal" toggle removes the dashed gold path
- [ ] "Try Again" resets fully — no residual path or feedback
- [ ] Top nav "Arena Trainer" link opens the page
- [ ] Dashboard "Learn" card navigates to the page
- [ ] Quick Start Map Tools section link navigates to the page
- [ ] Page title is "Arena Geometry Trainer — Your Dressage Journey"

---


