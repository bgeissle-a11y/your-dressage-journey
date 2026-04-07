# YDJ — Pre-Ride Ritual Builder
# Implementation Brief

**Version:** 1.0
**Date:** April 2026
**Status:** Ready for Claude Code implementation
**Reference prototype:** `pre-ride-ritual.html` (build from this brief + mockup in Claude.ai project)

---

## Overview

Add a **Pre-Ride Ritual Builder** to the Plan group of the nav. Riders drag-and-drop a set of predefined blocks (Physical Check-In, Mental Performance Check-In, Open Practice Card, Visualization, plus custom steps) into their preferred sequence. The saved sequence is their personal pre-ride ritual: a stable checklist they follow the same way before every ride.

This feature has **no AI generation** and **no API calls**. It is a pure Firestore read/write page. The blocks are navigational prompts — each one sends the rider to an existing part of the app. No output content is pulled into this page at launch (that is the explicit v2 scope).

**Research basis:** Wergin, Gröpel & Mesagno (2021) meta-analysis (112 effect sizes) establishes that routine consistency predicts performance more strongly than routine content, with g = 0.70 under pressure conditions. The "build your own sequence" design is intentional — rider-constructed idiosyncratic routines outperform prescribed ones.

---

## Part 1: Files Involved

| File | Action |
|---|---|
| `pre-ride-ritual.html` | **New page.** Build from this brief and the approved mockup. |
| Nav component (e.g., `TopNav.jsx` or equivalent) | **Modify.** Add Pre-Ride Ritual to Plan dropdown. |
| `YDJ_NavRevision_DashboardViz_Implementation_Brief.md` | Reference for current Plan group structure. |

No changes to:
- Practice Card (any version)
- Physical Guidance
- Grand Prix Thinking
- Visualization Script Builder
- Rider's Toolkit
- Any AI output or Cloud Function

---

## Part 2: Nav Placement

Pre-Ride Ritual is added to the **Plan** dropdown group. Current Plan group:

```
— Competitions —
🏟  Show Preparation
📋  Event Planner
🧳  Packing List
```

Updated Plan group:

```
— Every Ride —
🌅  Pre-Ride Ritual      ← NEW (first entry in group)

— Competitions —
🏟  Show Preparation
📋  Event Planner
🧳  Packing List
```

**Route:** `/pre-ride-ritual`
**Nav icon:** 🌅
**Nav label:** Pre-Ride Ritual
**Nav description (dropdown sub-text):** "Your consistent pre-ride sequence"

---

## Part 3: Firestore Schema

### 3A. Document path

```
riders/{userId}/preRideRitual
```

This is a single document per user (not a collection). It is written on "Save" and read on page load.

### 3B. Document fields

| Field | Type | Notes |
|---|---|---|
| `blocks` | array | Ordered array of block objects. See 3C. |
| `researchHidden` | boolean | `false` by default. Set `true` when rider clicks "Hide this — I've got it ✓". Persists across sessions. |
| `lastUpdated` | Firestore Timestamp | `serverTimestamp()` on every save. |
| `version` | number | **Always `1` at launch.** This field enables v2 content-pull upgrade without a migration. Do not omit. |

### 3C. Block object schema

Each block in the `blocks` array:

| Field | Type | Notes |
|---|---|---|
| `id` | string | Unique identifier. Predefined blocks use their type as id (`"physical"`, `"gpt"`, `"practice"`, `"viz"`). Custom blocks use `"custom_[timestamp]"`. |
| `type` | string | One of: `"physical"`, `"gpt"`, `"practice"`, `"viz"`, `"custom"`. |
| `label` | string | Display label. Predefined blocks have fixed defaults (see 3D). Custom blocks store rider-authored text. |
| `active` | boolean | Whether this block is toggled on (`true`) or off (`false`). |
| `order` | number | Zero-based position in the sequence. Must match array index. Store both for v2 compatibility. |

### 3D. Predefined block defaults

These are the initial values written on first save if the rider has not customized:

```javascript
const DEFAULT_BLOCKS = [
  {
    id: "physical",
    type: "physical",
    label: "Physical Check-In",
    active: true,
    order: 0
  },
  {
    id: "gpt",
    type: "gpt",
    label: "Mental Performance Check-In",
    active: true,
    order: 1
  },
  {
    id: "practice",
    type: "practice",
    label: "Open Practice Card",
    active: true,
    order: 2
  },
  {
    id: "viz",
    type: "viz",
    label: "Visualization",
    active: false,
    order: 3
  }
];
```

### 3E. Firestore operations

**On page load:**
1. Read `riders/{userId}/preRideRitual`
2. If document does not exist → render DEFAULT_BLOCKS in memory. Do not write to Firestore yet (write happens on first Save).
3. If document exists → render saved blocks in saved order. Apply `researchHidden` to collapse/hide the research panel.

**On Save:**
Write the full document with `serverTimestamp()` on `lastUpdated`. Use `setDoc` with `{ merge: false }` — the full document is always replaced on save.

**On "Hide this" (research panel):**
Update only `researchHidden: true` using `updateDoc`. Do not replace the full document.

---

## Part 4: Page Structure and UI Behavior

### 4A. Page header

```
Eyebrow (spaced caps, gold):  YOUR DRESSAGE JOURNEY
H1 (Playfair Display):        Pre-Ride Ritual
Subhead (Work Sans):          Build a sequence that's yours. Do it the same way, every time.
```

### 4B. Research panel

Renders immediately below the page header.

**Default state:** Expanded (visible). `researchHidden: false` in Firestore.

**Content (do not alter this text):**

Headline trigger row: *"Why a consistent ritual works — research context"* with ▾ chevron.

Body (shown when expanded):
- Stat badges: `g = 0.70 under pressure` · `d = 0.87 self-efficacy` · `d = 0.48 self-talk`
- Paragraph 1: A pre-performance routine's benefit comes from doing the same sequence consistently — not from what the sequence contains. Riders who build their own routine show larger performance gains than those given a prescribed one. The routine reduces cognitive load at the barn gate: instead of deciding what to focus on, you've already decided.
- Paragraph 2: Even a short, stable routine significantly reduces performance inconsistency under pressure — at shows and in high-stakes schooling sessions.
- Paragraph 3: The steps here reference your active YDJ outputs rather than prescribing content. That's intentional: the sequence should be in your own rhythm, not the platform's.
- Citation: *Wergin, Gröpel & Mesagno (2021) meta-analysis, 112 effect sizes · Kingston & Hardy (1997) on process goals · Hatzigeorgiadis et al. (2011) on self-talk*
- Hide link: "Hide this — I've got it ✓"

**On hide link click:**
- Collapse and visually remove the panel (CSS `display: none` or equivalent)
- Call `updateDoc` to persist `researchHidden: true`
- Panel does not reappear on subsequent page loads

**The chevron ▾ / ▲ toggles the panel open/closed independently of the hide link.** The hide link permanently removes it. The chevron just collapses it for this session (does not persist).

### 4C. Section label

```
YOUR SEQUENCE — DRAG TO REORDER   (spaced caps, tertiary color)
```

### 4D. Block list

Renders the blocks array in order. Each block is a card with:

**Left side:**
- Drag handle (6-dot grid, `cursor: grab`)
- Icon circle (36×36px, rounded-md, type-specific background — see 4E)
- Block content (label + description)

**Right side:**
- Link button (for predefined blocks only): navigates to the relevant page section (see 4F)
- Toggle switch (predefined blocks) or × remove button (custom blocks)

**Inactive blocks** render at 42% opacity. They retain their position in the sequence.

**Drag and drop:**
- Use HTML5 Drag and Drop API (`draggable="true"`)
- Visual feedback: dragging source → `opacity: 0.3`, `border-style: dashed`
- Drop target → highlight border in `--sky-border` color
- On drop: reorder the in-memory blocks array, re-render, do not auto-save (rider saves explicitly)
- Provide ▲ / ▼ reorder buttons as fallback for mobile touch (same behavior as drag-drop, no separate component needed — simple index-swap)

### 4E. Block type styles

| Type | Icon | Icon bg | Icon fg | Description text |
|---|---|---|---|---|
| `physical` | 🌿 | `#e6f3eb` | `#2a5c36` | "Review barn aisle prep and your pre-ride checklist." |
| `gpt` | 🧠 | `#deeaf5` | `#1e5080` | "Review this week's Grand Prix Thinking assignment." |
| `practice` | 📋 | `#fdf3e0` | `#9a6f1a` | "Set your session intention and review your process goals." |
| `viz` | 🎯 | `#f0e8f5` | `#6b3f7a` | "Run your opening movement in your mind before mounting." |
| `custom` | ✎ | `#f0efed` | `#6b6660` | *(no static description — label is editable inline)* |

**Visualization block — conditional note:**
When `active === false` on the viz block (default), show below the description in tertiary italic:
*"No active script — turn on when you have a visualization script"*

This note does not render when `active === true`.

### 4F. Link button destinations

| Block type | Button label | Destination |
|---|---|---|
| `physical` | "Barn Aisle Prep ↗" | `/physical-guidance` with `#barn-aisle-prep` anchor (Exercise Protocol tab, pre-ride ritual/barn aisle section) |
| `gpt` | "This Week in GPT ↗" | `/grand-prix-thinking` (Mental Performance tab, default) |
| `practice` | "Practice Card ↗" | `/practice-card` |
| `viz` | "Open Script ↗" | `/riders-toolkit` filtered to visualization scripts (or `/riders-toolkit/visualization` if that route exists) |

Link buttons use `router.push()` (React) or equivalent. They do not trigger a save.

⚠️ Verify that the Physical Guidance page has an anchor (`id="barn-aisle-prep"` or equivalent) on the pre-ride ritual / barn aisle prep section within the Exercise Protocol tab. If the anchor does not yet exist, add it when implementing this brief. The link should scroll directly to that section.

### 4G. Custom blocks

**"+ Add your own step" button** renders below the block list as a full-width dashed-border button.

On click:
- Append a new custom block to the in-memory blocks array: `{ id: "custom_[Date.now()]", type: "custom", label: "", active: true, order: [next index] }`
- Render immediately
- Focus the inline text input for that block

**Custom block rendering:**
- No static description text
- Label renders as an inline `<input>` (not a `<div>`) — editable in place
- Placeholder: *"Describe your step…"*
- `×` remove button on the right (no toggle)
- No link button

**Label changes** update the in-memory block object's `label` field immediately via `oninput`. Saved to Firestore on the next explicit Save.

### 4H. Footer

```
[N active steps]                    [Save my ritual]
```

- Step count: counts `blocks.filter(b => b.active).length` from current in-memory state. Updates live as toggles change.
- Save button: calls `setDoc` on `riders/{userId}/preRideRitual`. On success: button text changes to "Saved ✓" with success color treatment for 2.2 seconds, then reverts.

---

## Part 5: Empty / First-Time State

On first load (no Firestore document), render DEFAULT_BLOCKS in memory with the research panel expanded. Do not show any "you haven't set up your ritual yet" messaging — the default blocks are immediately usable. The rider customizes from there.

---

## Part 6: Version 2 — Do Not Implement Now

The following is explicitly **out of scope** for this sprint. Document it here so the Firestore schema supports it without migration.

**v2 upgrade path:** When `version` is incremented to `2`, predefined blocks will gain a `sourceContent` field containing a single line of text pulled from the cached output for that block type (e.g., the rider's current week GPT assignment anchor phrase, or the top Physical body awareness cue). This text renders inline in the ritual block as a one-line preview — not a full output display.

**Schema addition for v2 (do not implement now):**
```javascript
// v2 only — not in v1
sourceContent: string | null   // null until v2 is implemented
sourceContentUpdated: Firestore Timestamp | null
```

The `version: 1` field in the current document signals to any future v2 migration script which documents need backfilling. No other v1 changes are needed.

---

## Part 7: Visualization Script Note (Flag for Separate Chat)

The Visualization block in this ritual references the existing Visualization Script Builder. A "warm-up" script type — *"Visualize the Perfect Warm-Up"* — should be considered as a named starter template in the Visualization Script Builder. This is the one script that applies to every rider at every level on every ride and is the ideal onboarding hook for the feature. This is **not in scope for this brief** — flag it for the Visualization Script conversation.

The current valid `movementKey` list in `YDJ_VisualizationSuggestion_WeeklyFocus_Brief.md` does not include a warm-up movement. That list needs updating when the warm-up template is added.

---

## Part 8: Implementation Checklist

### Setup
- [ ] Read `YDJ_NavRevision_DashboardViz_Implementation_Brief.md` — confirm current Plan group structure before editing nav
- [ ] Read `ydj-nav-v2-mockup.html` — visual reference for dropdown panel layout
- [ ] Confirm route `/pre-ride-ritual` is not already in use

### New page
- [ ] Create `pre-ride-ritual.html` (or `PreRideRitual.jsx` if React page)
- [ ] Apply full YDJ design system: Playfair Display + Work Sans, parchment/ink/gold palette, noise texture, CSS custom property tokens
- [ ] Page header: eyebrow + H1 + subhead (exact copy from Part 4A)
- [ ] Research panel: expandable/collapsible, hide-permanently link, correct stat badges and copy (exact copy from Part 4B)
- [ ] Section label above block list
- [ ] Block list with drag-and-drop (HTML5 DnD API)
- [ ] ▲ / ▼ fallback reorder buttons for mobile touch
- [ ] All four predefined blocks rendered in correct default order
- [ ] Block type styles correct (icon, colors, description) per Part 4E
- [ ] Link buttons routed correctly per Part 4F
- [ ] Visualization block shows conditional note when `active === false`
- [ ] Toggle switches on predefined blocks — update `active` state in memory, visual opacity change
- [ ] "Add your own step" button appends custom block, auto-focuses input
- [ ] Custom blocks: inline editable label, × remove button, no link button, no description
- [ ] Footer: live step count + Save button
- [ ] Save button: `setDoc` on `riders/{userId}/preRideRitual`, success feedback 2.2s

### Firestore
- [ ] On load: read `riders/{userId}/preRideRitual`; fall back to DEFAULT_BLOCKS if not found
- [ ] Apply `researchHidden` on load (hide panel if `true`)
- [ ] Save writes complete document with `version: 1`, `lastUpdated: serverTimestamp()`
- [ ] "Hide this" link writes only `researchHidden: true` via `updateDoc`
- [ ] Verify no Firestore write happens before the rider explicitly clicks Save (except the researchHidden `updateDoc`)

### Nav
- [ ] Add "Every Ride" subheading to Plan dropdown
- [ ] Add 🌅 Pre-Ride Ritual entry as first item in Plan dropdown
- [ ] Verify route wires correctly

### Physical Guidance page (separate check)
- [ ] Confirm `id="barn-aisle-prep"` anchor exists on the pre-ride ritual / barn aisle prep section within Exercise Protocol tab
- [ ] If anchor missing: add it. The Pre-Ride Ritual link target depends on it.

### Polish
- [ ] Drag-and-drop visual feedback: dragging source opacity + dashed border; drag target border highlight
- [ ] Inactive blocks render at correct opacity (42%) in all toggle states
- [ ] Custom block input placeholder text correct
- [ ] Mobile: test drag handle usability; confirm ▲/▼ fallback works
- [ ] Confirm Playfair Display + Work Sans load correctly
- [ ] No `alert()` or `confirm()` in production code

---

## Part 9: Out of Scope for This Sprint

Do not implement the following:

- Pulling content from GPT, Physical Guidance, or any other cached output into the ritual blocks (v2)
- Any AI generation or Claude API call
- Completion tracking per session (blocks are prompts, not tasks — no per-session state)
- A "Start Ritual" mode or sequential walk-through UI
- Any change to the Practice Card
- Any change to Physical Guidance except adding the `#barn-aisle-prep` anchor if missing
- Any change to Grand Prix Thinking
- Warm-up visualization template (flag for Visualization Script chat)
- Dashboard quick-link to Pre-Ride Ritual (can be added in a future nav pass)

---

## Part 10: Reference Files

| File | Purpose |
|---|---|
| `ydj-nav-v2-mockup.html` | Visual reference for Plan dropdown layout |
| `YDJ_NavRevision_DashboardViz_Implementation_Brief.md` | Current nav group structure |
| `physical-guidance-v2.html` | Confirm barn aisle prep section anchor target |
| `YDJ_GPT_Physical_30DayCycle_Implementation_Brief.md` | Confirms pre-ride ritual section exists in Exercise Protocol tab |
| Claude.ai project mockup | `pre_ride_ritual_builder` interactive widget — visual and interaction reference |
