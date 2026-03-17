# YDJ — Test Features Implementation Brief
**For Claude Code · VS Code**
**Date:** March 2026
**Scope:** Three new/revised features sharing a common test database backend

---

## Overview

This brief covers the simultaneous implementation of three interconnected features:

1. **Test Explorer** — new component under the Learn tab; lets riders explore one or two tests without show pressure, flag developing movements, and get an AI coaching read on readiness
2. **Show Prep Form v2** — replaces `show-preparation-form.html`; adds two-column sticky layout with test reference sidebar, per-test Flag for Prep checklist, and flags-to-concerns integration
3. **Show Planner v2** — revises `ydj-show-planner-v3.html`; connects to show data from the prep form submission and uses the shared test panel component in place of the hardcoded PSG accordion

All three share a **Test Database Service** and a **Test Reference Panel** component. Build those first; the three features consume them.

---

## Source Files

These HTML prototypes are the design and logic reference. Do not port them line-by-line — extract the logic and data, rebuild in React with Firebase integration.

| Prototype | Location | Status |
|---|---|---|
| Test Explorer | `outputs/ydj-test-explorer.html` | New |
| Show Prep Form v2 | `outputs/show-preparation-form-v2.html` | Replaces `show-preparation-form.html` |
| Show Planner | `ydj-show-planner-v3.html` | Revise in place |

**Database source files (read-only reference):**

- `fei_test_database_complete.json` — movements for all 5 FEI tests
- `comprehensive_dressage_test_database_with_coefficients.json` → `coefficients_by_test` — coefficient data for all tests including FEI

---

## Part 1 — Shared Infrastructure

Build these before any of the three features.

---

### 1A. Test Database Service

**File:** `src/services/testDatabase.js`

This service is the single source of truth for all test data across the three features. It normalizes data from the two JSON source files into a consistent shape consumed by all test panel components.

#### Data Shape (per test)

```js
{
  testId: 'prix_st_georges',         // matches key in Firestore and JSON
  label: 'Prix St. Georges',
  shortLabel: 'PSG',
  org: 'FEI',
  year: '2022/2026',
  duration: '5:50',
  minAge: '7+',
  arena: '20×60',
  maxPoints: 340,
  keyDifferences: 'Introduction of half-pirouettes...',

  // From fei_test_database_complete.json → required_movements
  movementGroups: [
    {
      label: 'Trot',
      color: '#2e5c82',
      movements: [
        { text: 'Collected trot', coeff: false, newAtLevel: false },
        { text: 'Half-pass right', coeff: true, newAtLevel: false },
        // ...
      ]
    },
    // canter, walk, other
  ],

  // From comprehensive_dressage_test_database_with_coefficients.json
  coefficients: [
    {
      movement: 'Trot half-pass right',
      badge: '×2',
      type: 'movement',    // 'movement' | 'collective'
      why: 'Each rein scored independently...'
    },
    // ...
  ],

  // Derived from coefficients + movement list
  // Used for Flag for Prep and Assessment checklists
  assessItems: [
    {
      id: 'hp-tr',
      text: 'Trot half-pass right',
      note: 'Double coefficient · each rein scored independently',
      coeff: true,
      gaitGroup: 'trot'
    },
    // ...
  ],

  // Training Scale directives (hardcoded per level — not in JSON files)
  directives: [
    { title: 'Regularity & Freedom', body: '...' },
    // ...
  ]
}
```

#### PSG Data (complete — sourced from databases)

The following is accurate and verified. Use exactly as specified.

**Coefficients (source: `comprehensive_dressage_test_database_with_coefficients.json → prix_st_georges`):**
- Trot half-pass right ×2 (movement)
- Trot half-pass left ×2 (movement)
- Collected walk ×2 (movement)
- Extended walk ×2 (movement)
- Half-pirouette left in canter ×2 (movement)
- Half-pirouette right in canter ×2 (movement)
- Harmony ×2 (collective) — full text: "harmony, cooperation, lightness, effectiveness, and sensitivity of aids as well as adherence to the training scale"

**Required movements (source: `fei_test_database_complete.json → prix_st_georges → required_movements`):**
- Trot: Collected trot, Medium trot, Extended trot, Shoulder-in, Half-pass, 8m volte
- Walk: Collected walk, Extended walk, Half pirouette in walk (left and right)
- Canter: Collected canter, Extended canter, Half-pass in canter with flying changes, Single flying changes, Flying changes every 4th stride (4-tempis) × 5, Flying changes every 3rd stride (3-tempis) × 5, Half pirouettes in canter (3–4 strides, left and right), Counter canter
- Other: Halt — immobility

**Key differences at PSG:** Introduction of half-pirouettes in canter (3–4 strides), 3-tempis and 4-tempis, half-pirouettes in walk.

**Movement annotation rules for PSG:**
- `newAtLevel: true` → 8m volte, Half-pirouette in walk left, Half-pirouette in walk right, 4-tempi changes, 3-tempi changes, Half-pirouette left in canter, Half-pirouette right in canter
- `coeff: true` → Half-pass right (trot), Half-pass left (trot), Collected walk, Extended walk, Half-pirouette left (canter), Half-pirouette right (canter)

#### Inter I Data (complete — sourced from databases)

**Coefficients (source: `comprehensive_dressage_test_database_with_coefficients.json → intermediate_1`):**
- Half-pass to the right (trot) ×2
- Half-pass to the left (trot) ×2
- Collected walk ×2
- Extended walk ×2
- Canter zigzag (3 half-passes with flying changes) ×2
- Pirouette to the left (canter) ×2
- Pirouette to the right (canter) ×2
- Harmony ×2 (collective)

**Required movements (source: `fei_test_database_complete.json → intermediate_1`):**
- Trot: Collected trot, Medium trot, Extended trot, Shoulder-in, Half-pass, 8m volte
- Walk: Collected walk, Extended walk
- Canter: Collected canter, Extended canter, Zigzag (3 half-passes 5m each side with flying changes), Single flying changes, Flying changes every 3rd stride (3-tempis) × 5, Flying changes every 2nd stride (2-tempis) × 7, Pirouettes (6–8 strides, left and right)
- Other: Halt — immobility, Rein back 5 steps

**Key differences at Inter I:** Full pirouettes (6–8 strides) replace half-pirouettes. 2-tempis appear. Zigzag becomes a coefficient. Half-pirouettes in walk disappear. Rein back added.

**`newAtLevel: true`** for Inter I → 2-tempi changes, Full pirouette left, Full pirouette right, Rein back, Canter zigzag (as a coefficient movement)

#### Inter II, Grand Prix, GP Special

These three tests have full coefficient data in the database. Their `required_movements` from the JSON include passage and piaffe (Inter II+). Implement them using the same pattern — the service reads from both JSON files and assembles the standard shape. The `directives` array for these tests should be manually authored (not in JSON) following the same pattern as PSG and Inter I above.

USDF tests (Training through Fourth Level) can be added in a future sprint from the other JSON files. For now, non-FEI test selections should show a graceful "data coming soon" state in the test panel.

#### Service API

```js
// src/services/testDatabase.js

export function getTestData(testId) // returns full test object or null
export function getTestList()       // returns [{value, label, shortLabel, hasFullData}]
export function getAssessItems(testId) // returns assessItems array for a test
export function getCoefficients(testId) // returns coefficients array
export function isFullDataAvailable(testId) // boolean
```

Load the JSON files at build time (import directly) rather than fetching at runtime. These are static reference data, not user data.

---

### 1B. Test Reference Panel Component

**File:** `src/components/TestReferencePanel.jsx`

This is the tabbed sidebar component shared between Show Prep Form and Show Planner. It is **not** used in Test Explorer (which has its own full-width panel layout).

#### Props

```js
{
  testId: string,           // currently displayed test key
  onFlagChange: fn,         // (testId, itemId, isFlagged) => void
  flagState: object,        // { [testId]: { [itemId]: boolean } }
  defaultTab: string,       // 'flag' | 'overview' | 'movements' | 'coefficients'
  compact: boolean          // true = sidebar mode; false = full width
}
```

#### Tab structure

1. **Overview** — meta grid (duration, min age, arena, max points) + directives list + "What's new at this level" callout
2. **Movements** — grouped by gait, chips styled by coefficient/new-at-level status
3. **Coefficients** — table with movement, ×2 badge, why-it-matters explanation
4. **Flag for Prep** — checklist of `assessItems`; coeff items first; flagged items show ✓ in rust; flag summary chips at bottom

When `testId` has no full data (`isFullDataAvailable` returns false), all tabs show a graceful placeholder instead of empty state.

#### Chip styling

```css
/* default movement chip */
.chip { background: var(--parchment); border: 1.5px solid var(--parchment-dark); color: var(--ink-mid); }

/* double-coefficient */
.chip.coeff { background: var(--tech-bg); border-color: var(--tech-border); color: var(--tech-color); }
.chip.coeff::after { content: '×2'; font-size: 9px; font-weight: 700; margin-left: 3px; opacity: 0.75; }

/* new at this level */
.chip.new-at { background: var(--mental-bg); border-color: var(--mental-border); color: var(--mental-color); }
```

---

### 1C. Firestore — Flag State

Flag state is stored per-user, per-show-entry for the show prep form, and per-user for the test explorer (ephemeral — no show context).

**Show prep flags:**
```
/users/{uid}/showPrepEntries/{entryId}/testFlags/{testId}
  flaggedItems: string[]   // array of itemIds that are flagged
  updatedAt: timestamp
```

**Test Explorer assessment (per-user, not per-show):**
```
/users/{uid}/testAssessments/{testId}
  developingItems: string[]  // array of itemIds marked as developing
  updatedAt: timestamp
```

Flag state is loaded on component mount and written on every toggle (debounced 500ms). Do not batch-write — riders may close the page mid-session and expect state to persist.

---

## Part 2 — Show Prep Form v2

**Route:** `/show-prep` (or existing route — replaces current form)
**Replaces:** `show-preparation-form.html`

---

### 2A. Layout

Two-column layout at ≥820px:

```
[ TestReferencePanel 310px ] [ Form fields (flex: 1) ]
```

The test panel is `position: sticky; top: 20px; max-height: calc(100vh - 40px); overflow-y: auto`.

Below 820px: panel collapses to a toggleable banner at top of form with flag count badge. Banner expanded = full panel rendered inline above the form. The toggle bar shows "Test Reference · tap to open" with a flag count chip when flags > 0.

### 2B. Test Selector → Sidebar Connection

The sidebar starts empty (shows directional message) until tests are selected in Section 3. When the rider selects a test from any slot dropdown, the sidebar:

1. Reveals the test panel UI (hides the empty state)
2. Auto-switches to that test if it's the first selection
3. Shows a pill switcher in the sidebar header when 2+ tests are selected
4. Pulses the sidebar border gold briefly (CSS animation, 1.4s) on first activation

**One-test mode:** Pill switcher hidden. Panel shows selected test.
**Multi-test mode:** Pill switcher appears. Each pill = one selected test (short label). Active pill = currently displayed test. Flag state is stored and displayed independently per test.

When a test that had flags is deselected from the form, its flags are retained in Firestore but the pills update to reflect only the currently-selected tests.

### 2C. Form Sections

Retain all sections from `show-preparation-form.html` **except**:
- ~~Current Technical or Physical Challenges~~ — removed (redundant with debrief data)
- ~~Recent Progress or Breakthroughs~~ — removed (redundant with debrief data)
- ~~Preferred Coaching Voice~~ — removed (lives in rider profile, applies globally)

**Section order:**
1. Show Details (name, date, duration, type, location)
2. Your Horse (horse select from profile, current training level, show experience with this horse)
3. Tests You're Riding (test type toggle standard/freestyle, up to 6 slots for standard / 2 for freestyle)
4. Your Goals (up to 3, process-goal framing)
5. Your Concerns (flags callout from sidebar + 3 free-text for non-movement concerns)
6. Resources & Preparation Time (riding frequency, coach access, available resources, constraints)
7. Anything Else (open textarea with char count)
8. Show Packing List (panel linking to `horse-show-packing-list.html`)
9. After the Show (panel linking to `journey-event-log.html`)
10. Submit / Save Draft

### 2D. Concerns Section Integration

The Concerns section has two distinct parts:

**Part 1 — Flags callout (read-only in form, written from sidebar):**

```jsx
<FlagsCallout
  flagState={flagState}          // all flags across all selected tests
  selectedTests={selectedTests}  // to label flags with test names when >1 test
  testData={testDatabase}
/>
```

Callout shows:
- Empty state with sidebar instruction when no flags set
- Chip per flagged movement when flags exist; chips include test label badge when >1 test selected
- Double-coefficient note when any coeff movement is flagged
- Count badge in header

**Part 2 — Other concerns (free text):**
Three numbered inputs for non-movement concerns (nerves, logistics, venue history, horse behavior patterns, etc.). Label explicitly: "Other concerns — things that aren't specific test movements."

### 2E. Data Collection

```js
const showPrepData = {
  timestamp: serverTimestamp(),
  showDetails: {
    name, duration, dateStart, dateEnd, type, typeOther, location
  },
  tests: {
    type: 'standard' | 'freestyle',
    selected: string[],    // test value keys in order
  },
  horse: {
    name, currentLevel, showExperience
  },
  goals: string[],         // up to 3, filtered of empty
  concerns: {
    flaggedByTest: [
      {
        testId: string,
        testLabel: string,
        flaggedItems: [
          { id: string, text: string, coeff: boolean }
        ],
        doubleCoeffFlags: string[]   // text labels of coeff items only
      }
    ],
    additionalConcerns: string[]     // free-text inputs, filtered of empty
  },
  resources: {
    ridingFrequency, coachAccess, available: string[], constraints
  },
  additionalInfo: string
}
```

### 2F. Firestore Write

On submit:
```
/users/{uid}/showPrepEntries/{auto-id}
  [showPrepData object above]
```

On draft save:
```
/users/{uid}/showPrepDraft
  [same structure, overwritten on each save]
```

Draft is loaded silently on mount (no confirm dialog). If a draft exists, populate form fields and restore flag state from `flaggedByTest`. Show an inline dismissible banner: "Continuing from your saved draft."

### 2G. Passing Flag Data to the Event Planner AI Prompt

The `concerns.flaggedByTest` array is the primary new signal for the Event Planner output. When the Event Planner Cloud Function runs for a show prep entry, it receives:

```js
// in the pre-processing layer (promptBuilder.js)
const flagContext = showPrepData.concerns.flaggedByTest.map(t => ({
  test: t.testLabel,
  flaggedMovements: t.flaggedItems.map(i => i.text),
  doubleCoeffMovements: t.doubleCoeffFlags
}));
```

Add this to the Event Planner system prompt as a new context block:

```
FLAGGED PREP PRIORITIES (rider-identified, from test reference tool):
${flagContext.map(t =>
  `${t.test}: ${t.flaggedMovements.join(', ')}` +
  (t.doubleCoeffMovements.length
    ? ` [DOUBLE COEFFICIENT — prioritize in Technical section: ${t.doubleCoeffMovements.join(', ')}]`
    : '')
).join('\n')}
```

**Guardrail:** Double-coefficient flagged movements must appear in the Technical prep output. If the rider has flagged coeff movements, the Technical section should address them first, before non-coeff movements. This is an absolute priority signal, not a suggestion.

---

## Part 3 — Show Planner v2

**Route:** `/show-planner` (existing route)
**Source:** `ydj-show-planner-v3.html`

---

### 3A. What Changes

The show planner is largely working. The changes are:

1. **Dynamic show data** — currently hardcoded (`SHOW_DAYS_OUT = 60`, rider data in `RIDER` object). In production, the planner loads from the most recent `showPrepEntries` document for the selected horse. If no entry exists, show an onboarding state prompting the rider to complete the show prep form.

2. **Test reference panel** — currently a hardcoded PSG accordion. Replace with the shared `<TestReferencePanel>` component. The test(s) come from `showPrepEntry.tests.selected`. If multiple tests were selected in the prep form, the panel shows a pill switcher. Flag state for the planner reads from `/users/{uid}/showPrepEntries/{entryId}/testFlags/{testId}` — the same flags set in the prep form carry into the planner automatically. The rider can add/modify flags from the planner panel as well (writes back to the same Firestore path).

3. **AI prompt** — the `fetchWeekPlan` prompt currently has hardcoded `RIDER` and `PSG` objects. In production, these come from:
   - Rider data: pre-processed from the show prep entry + the rider's recent debrief data (same pattern as existing Event Planner pre-processing)
   - Test data: from `testDatabase.getTestData(testId)` for the primary test (first selected test)
   - Flagged movements: from the entry's `testFlags`, passed as a priority signal to the technical section of the plan

4. **`alert()` calls** — all uses of `alert()` and `confirm()` in the prototype must be replaced with inline feedback patterns. The prototype comments note these locations.

### 3B. Show Planner → Prep Form Connection

The planner needs to know which show prep entry to load. Options:
- Auto-load the most recently submitted entry
- Show a selector if multiple entries exist (e.g., rider has two upcoming shows)

For the initial implementation, auto-load the most recent entry. The rider's horse name and show name should appear in the planner hero block (replacing the hardcoded "Rocket Star / PSG" display).

### 3C. AI Prompt Adaptation

The `fetchWeekPlan` system prompt in the prototype is well-structured. The key changes:

**Replace hardcoded rider data block:**
```js
// current (hardcoded):
const RIDER = { horse_challenge: "Rocket Star jaw tightness...", ... }

// production (from pre-processing):
const riderContext = await preProcessShowPlannerData(uid, showPrepEntryId);
// riderContext contains:
// - horse: { name, currentLevel, experience }
// - challengesSummary: derived from currentChallenges field + recent debrief patterns
// - goals: from showPrepEntry.goals
// - flaggedMovements: from testFlags (for technical section)
// - recentPatterns: last 5 debriefs aggregated (same pre-processing as Event Planner)
```

**Replace hardcoded PSG facts block:**
```js
// current: hardcoded PSG object
// production:
const testInfo = testDatabase.getTestData(primaryTestId);
// pass testInfo.movementGroups, testInfo.coefficients, testInfo.directives
// to the prompt as test-specific context
```

**Terminology guardrails in prompt** — the prototype prompt has excellent terminology rules. Retain all of them and make them dynamic (generated from test data) rather than hardcoded PSG-specific rules.

---

## Part 4 — Test Explorer

**Route:** `/learn/test-explorer` (new route under Learn tab)

---

### 4A. Component Structure

```
TestExplorer
├── TestSelectorBar        (mode toggle + 1-2 test dropdowns)
├── ExplorerPanels
│   ├── TestExplorerPanel  (one per selected test, full-width tabbed)
│   │   ├── Tab: Directives
│   │   ├── Tab: Movements
│   │   ├── Tab: Coefficients
│   │   └── Tab: Assessment (flag developing movements)
│   └── [second panel if compare mode]
└── ReadinessAnalysis
    ├── ReadinessStats     (numeric summary cards)
    ├── CoachingOutput     (AI text, Classical Master voice)
    └── ComparisionChart   (only in compare mode)
```

### 4B. Assessment Tab

The Assessment tab uses the same `assessItems` from the test database but with different framing than the show prep form:

- **Show prep:** "Flag for Prep" — movements you want the AI to prioritize (prep-oriented)
- **Test Explorer:** "Still Developing" — movements that aren't solid in training yet (learning-oriented)

Same checkbox interaction, different copy. Same Firestore path: `/users/{uid}/testAssessments/{testId}`.

Assessment state persists across sessions so riders can return and refine their self-assessment over time. This also creates useful longitudinal data (the self-assessment ratings trend over time as movements solidify).

**Readiness bar:**
```
solidMovements / totalMovements = readiness %
```
Updates live as checkboxes are toggled. Displayed per panel in single mode; displayed as two stat cards side-by-side in compare mode.

### 4C. AI Coaching Analysis

**Trigger:** "Get Coaching Read" button (not automatic). Button is enabled as soon as at least one test is selected. It does not require any assessments to be flagged (though the analysis is more useful with them).

**Model:** `claude-sonnet-4-20250514`
**Max tokens:** 600 (generous for compare mode; Classical Master voice is naturally concise)
**Temperature:** default

**System prompt:**

```
You are the Classical Master coaching voice for Your Dressage Journey, an AI dressage coaching platform for adult amateur riders. Your voice is precise, pithy, and honest — "Why not the first time?" is your ethos. You respect the rider's intelligence.

Rules:
- Never use bullet points or headers
- Speak in complete paragraphs
- Be direct about gaps without being discouraging
- Lead with double-coefficient movements when any are flagged developing — those are the highest-leverage areas
- Do not mention that you are an AI
- Do not use the rider's name (you don't have it)
- Keep total response under 400 words (single test) or 500 words (compare mode)
- In compare mode: one paragraph per test, then one comparative paragraph
```

**User message assembled from:**
```js
function buildExplorerPrompt(t1Key, t2Key, devState) {
  // For each test:
  // - test name and level
  // - total assessed movements
  // - count and names of developing movements (flagged)
  // - count and names of developing COEFFICIENT movements (flagged + coeff:true)
  // - solid count
  //
  // In compare mode, also note:
  // - what's new in t2 vs t1 (key_differences from test data)
  // - which developing items overlap between tests
}
```

**Output rendering:** Plain text, rendered as prose in the coaching block. No markdown parsing needed — Classical Master voice doesn't use formatting. Add the attribution line below: "— The Classical Master, Your Dressage Journey."

### 4D. Comparison Chart

Rendered in-component (no Chart.js needed — plain CSS bar chart). Only shown in compare mode after analysis runs.

**Categories:** Trot, Canter, Walk, Other
**Per category, per test:** % of `assessItems` in that `gaitGroup` that are NOT flagged as developing

```js
// category readiness
const categoryPct = (testId, gaitGroup) => {
  const items = assessItems.filter(i => i.gaitGroup === gaitGroup);
  const developing = items.filter(i => devState[testId]?.[i.id]);
  return Math.round(((items.length - developing.length) / items.length) * 100);
};
```

Note: `gaitGroup` must be added as an explicit field on each `assessItem` in the test database service (don't derive it by text matching as in the prototype).

Bar colors:
- Test 1: `var(--forest)` / `var(--forest-light)` gradient
- Test 2: `var(--mental-color)` / `#4a7fa8` gradient

Chart footer: "Based on self-assessment only. Bar length = % of movements the rider considers solid in training for that category."

---

## Part 5 — Design System Tokens

All three features use the existing YDJ CSS variable set. No new tokens needed. Confirm these are available globally:

```css
--parchment: #f5ede0
--parchment-dark: #e8d9c4
--parchment-mid: #ede1ce
--parchment-off: #faf6f0
--ink: #2c1f14
--ink-mid: #4a3220
--ink-light: #6b4f38
--gold: #b8862a
--gold-light: #d4a84b
--gold-pale: #f0d89a
--rust: #7a3020
--forest: #2a4a30
--forest-light: #3d6b46
--tech-color: #7a3020          /* rust/red — Technical category */
--tech-bg: rgba(122,48,32,0.07)
--tech-border: rgba(122,48,32,0.22)
--mental-color: #2e5c82        /* sky blue — Mental category */
--mental-bg: rgba(46,92,130,0.06)
--mental-border: rgba(46,92,130,0.22)
--body-color: #2a4a30          /* forest green — Physical/Body category */
--body-bg: rgba(42,74,48,0.06)
--body-border: rgba(42,74,48,0.22)
```

**Typography:** Playfair Display (headings, labels, display numbers), Work Sans (body, form fields, buttons)

**Prompt boxes:** Use `.prompt-box` class pattern per CLAUDE.md — prompt copy persists above textareas, not as placeholder text.

---

## Part 6 — Navigation / Routing

Add Test Explorer to the Learn tab navigation. Confirm exact route with Barb before wiring — suggested: `/learn/test-explorer`.

The Show Prep Form and Show Planner are existing routes; no routing changes needed unless the prep form URL changes (it should retain its existing path for any bookmarks/links pilot users may have).

---

## Part 7 — Implementation Order

Build in this sequence to avoid blocking dependencies:

1. **Test Database Service** (`testDatabase.js`) — everything depends on this
2. **Test Reference Panel component** — used by Show Prep Form and Show Planner
3. **Show Prep Form v2** — most complex; test panel + flag state + Firestore write
4. **Show Planner v2** — reads from show prep entry; simpler once prep form is done
5. **Test Explorer** — independent from the other two; can be built in parallel with Show Planner

---

## Part 8 — What Not to Change

These existing systems must not be modified:

- `promptBuilder.js` — only add the new flag context block to the Event Planner section (see 2G above); do not touch other outputs
- All existing output components (Journey Map, Multi-Voice Coaching, Grand Prix Thinking, Physical Guidance, Self-Assessment Analysis) — no changes
- The dashboard (`ydj-dashboard-v4.html` / dashboard component) — no changes
- Existing form components (post-ride debrief, lesson notes, rider self-assessment, etc.) — no changes
- The voice system — coaching voices are defined in `YDJ_AI_Coaching_Voice_Prompts_v3.md`; Test Explorer uses the Classical Master voice per spec; do not modify voice definitions

---

## Part 9 — Key Guardrails (Dressage Domain)

These are non-negotiable rules that must be reflected correctly in any test data, prompt copy, or UI text:

- PSG uses **8m voltes**, not 10m circles
- PSG flying changes are **3-tempi and 4-tempi only** — not 1-tempi or 2-tempi
- PSG has **half-pirouettes** (3–4 strides) — not full pirouettes
- **Counter change of hand** (zig-zag half-pass) is a PSG canter movement. **Counter canter** is a separate training tool. Never conflate them in labels or AI prompt copy.
- Inter I → Inter II is the most significant single transition in dressage — passage and piaffe are **entirely new movement categories**, not harder versions of existing movements. If the AI coaching analysis touches on level progression, it must never skip or minimize this transition.
- The 65% benchmark = level readiness. An honest readiness read in Test Explorer should reference this when the rider's developing movements include coefficient items.

---

## Part 10 — Testing Checklist

Before handoff, verify:

- [ ] PSG test panel shows correct coefficients (half-passes, collected/extended walk, canter half-pirouettes, Harmony collective) — NOT extended trot, extended canter, or Submission
- [ ] Selecting PSG in Show Prep Form slot 1 activates the sidebar and defaults to Flag for Prep tab
- [ ] Selecting a second test shows the pill switcher; switching pills changes the panel content without losing flag state for the first test
- [ ] Flags from the prep form sidebar appear as chips in the Concerns section callout
- [ ] `collectFormData()` returns `flaggedByTest` array with correct structure including `doubleCoeffFlags`
- [ ] Draft save/load restores both form field values and flag state
- [ ] Show Planner loads horse name and show name from the most recent prep form entry
- [ ] Test Explorer readiness bar updates live on checkbox toggle
- [ ] Test Explorer compare mode renders two panels side-by-side and two-column coaching output
- [ ] Test Explorer AI call uses Classical Master system prompt and stays under 500 words
- [ ] `alert()` and `confirm()` appear nowhere in production code
- [ ] All test panels show graceful placeholder for tests without full data (non-FEI tests initially)

---

## Appendix — Prototype Reference Mapping

| Prototype element | Production implementation |
|---|---|
| `TEST_DATA` object in HTML | `testDatabase.js` service, sourced from JSON files |
| `flagState` in-memory object | Firestore `/users/{uid}/showPrepEntries/{id}/testFlags` |
| `devState` in Test Explorer | Firestore `/users/{uid}/testAssessments/{testId}` |
| `fetchWeekPlan()` hardcoded prompt | Cloud Function with pre-processed rider data |
| `RIDER` hardcoded object | Pre-processed from show prep entry + recent debriefs |
| `PSG` hardcoded object | `testDatabase.getTestData('prix_st_georges')` |
| `alert('Draft saved!')` | Inline button feedback (text + color change, 2.2s timeout) |
| `confirm('Load draft?')` | Silent auto-load with dismissible banner |
| `localStorage` draft storage | Firestore `/users/{uid}/showPrepDraft` |
| `pillsContainer.parentElement.style.display` bug | Fixed: use `pillsContainer.style.display` directly |
