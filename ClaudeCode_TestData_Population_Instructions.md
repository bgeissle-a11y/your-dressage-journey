# Claude Code Task — Populate Complete Test Data Across Three Files

## What This Task Does

Read the dressage test database files from the local project filesystem, build a complete `TEST_DATA` object from them covering all FEI tests (and USDF tests if the detail files are present), then update three HTML prototype files with that data in place of the currently hardcoded partial data.

**Nothing else changes.** All CSS, layout, interaction logic, AI prompt structure, and non-test-data JavaScript stays exactly as written.

---

## Step 1 — Read the Source Data Files

Use the Filesystem tool to read these two files:

```
C:\Users\bgeis\your-dressage-journey\fei_test_database_complete.json
C:\Users\bgeis\your-dressage-journey\comprehensive_dressage_test_database_with_coefficients.json
```

Also check for the following USDF detail files and read any that exist:

```
C:\Users\bgeis\your-dressage-journey\usdf_intro_training_tests.json
C:\Users\bgeis\your-dressage-journey\usdf_first_level_tests.json
C:\Users\bgeis\your-dressage-journey\usdf_second_third_fourth_tests.json
C:\Users\bgeis\your-dressage-journey\usdf_freestyle_tests.json
```

---

## Step 2 — Read the Three Target Files

```
C:\Users\bgeis\your-dressage-journey\ydj-test-explorer.html
C:\Users\bgeis\your-dressage-journey\show-preparation-form-v2.html
C:\Users\bgeis\your-dressage-journey\ydj-show-planner-v3.html
```

---

## Step 3 — Understand the Source Data Structure

### `fei_test_database_complete.json`

Top-level shape: `{ metadata, tests: [ ...] }` where `tests` is an array. Each test object has:

```
test_id           string   e.g. 'prix_st_georges'
name              string   e.g. 'Prix St. Georges'
organization      string   'FEI'
duration          string   e.g. '5:50'
min_horse_age     number   e.g. 7
arena_size        string   e.g. 'Standard (20m x 60m)'
max_points        number
required_movements object  keys: trot, walk, canter, other — each an array of strings
key_differences   string   plain text description of what's new at this level
```

### `comprehensive_dressage_test_database_with_coefficients.json`

The relevant section is `coefficients_by_test`. Each key maps to a test object:

```
{
  test_name: string,
  organization: string,
  year: string,
  coefficients: [
    { movement: string, coefficient: number, type: 'movement' | 'collective' }
  ]
}
```

**Key mapping between the two files:**

| `fei_test_database_complete.json` test_id | `coefficients_by_test` key |
|---|---|
| `prix_st_georges` | `prix_st_georges` |
| `intermediate_1` | `intermediate_1` |
| `intermediate_2` | `intermediate_2` |
| `grand_prix` | `grand_prix` |
| `grand_prix_special` | `grand_prix_special` |

---

## Step 4 — Build the TEST_DATA Object

For each FEI test, construct an entry using this exact shape. Build `TEST_DATA` as a JavaScript object keyed by `test_id`.

```js
const TEST_DATA = {
  prix_st_georges: {
    label: string,        // test name from JSON
    shortLabel: string,   // abbreviation: PSG / Inter I / Inter II / GP / GPS
    org: 'FEI',
    year: string,         // from coefficients_by_test year field
    duration: string,     // from JSON
    minAge: string,       // min_horse_age + '+' e.g. '7+'
    arena: '20×60',
    maxPoints: number,
    keyDiff: string,      // key_differences from JSON

    movementGroups: [     // grouped by gait
      {
        label: string,    // 'Trot' | 'Canter' | 'Walk' | 'Other'
        color: string,    // see color map below
        movements: [
          {
            text: string,    // movement label
            coeff: boolean,  // true if this movement appears in coefficients array
            newAt: boolean,  // true if new at this level (see notes below)
          }
        ]
      }
    ],

    coefficients: [       // sourced from coefficients_by_test
      {
        movement: string,
        badge: '×2',
        type: 'movement' | 'collective',
        why: string,      // author a brief explanation of why it matters
      }
    ],

    assessItems: [        // flat list for checkboxes — coeff items first
      {
        id: string,       // short kebab-case unique per test e.g. 'hp-tr'
        text: string,     // display label
        note: string,     // coaching note shown below the label
        coeff: boolean,
        gaitGroup: string // 'trot' | 'canter' | 'walk' | 'other' | 'collective'
      }
    ],

    directives: [         // training scale directives — author these
      { title: string, body: string }
    ],

    hasFullData: true,
  },
  // ... repeat for all 5 FEI tests
};
```

### Gait group colors

```js
trot:       '#2e5c82'   // mental-color blue
canter:     '#3d6b46'   // forest green
walk:       '#b8862a'   // gold
other:      '#6b4f38'   // ink-light brown
collective: '#6b4f38'   // same as other — only used for Harmony
```

### How to determine `coeff: true` on a movement

A movement chip gets `coeff: true` if its text matches (or closely corresponds to) any entry in the `coefficients_by_test` array for that test. The movement text in the two files is not always identical — use judgment to match them. For example:

- `required_movements` has `"Half-pass"` — if `coefficients` has `"Half-pass to the right (trot)"` and `"Half-pass to the left (trot)"`, split the chip into two separate entries each with `coeff: true`
- `required_movements` has `"Half pirouettes in canter (3-4 strides, left and right)"` — split into left and right chips, both with `coeff: true` if they appear in coefficients

### How to determine `newAt: true` on a movement

Use the `key_differences` field plus level knowledge to flag movements that appear for the first time at this level. See the verified data below for FEI tests.

### The Harmony collective

Every FEI test has a Harmony collective `×2`. Always include it last in `assessItems` with:

```js
{
  id: 'harmony',
  text: 'Harmony (collective ×2)',
  note: 'Cooperation, lightness, sensitivity of aids, training scale adherence — the judge\'s overall read of the partnership',
  coeff: true,
  gaitGroup: 'collective',
}
```

And in `coefficients`:

```js
{
  movement: 'Harmony',
  badge: '×2',
  type: 'collective',
  why: 'Cooperation, lightness, effectiveness, sensitivity of aids, and adherence to the training scale. The judge\'s holistic read of the partnership across the entire test.',
}
```

---

## Step 5 — Verified FEI Test Data

Use the following as the authoritative source. This data has been verified against the database files.

### Prix St. Georges (`prix_st_georges`)

**Coefficients** (from `coefficients_by_test → prix_st_georges`):
- Trot half-pass right ×2 (movement)
- Trot half-pass left ×2 (movement)
- Collected walk ×2 (movement)
- Extended walk ×2 (movement)
- Half-pirouette left in canter ×2 (movement)
- Half-pirouette right in canter ×2 (movement)
- Harmony ×2 (collective)

**`newAt: true`** movements at PSG:
- 8m volte
- Half-pirouette in walk left
- Half-pirouette in walk right
- 4-tempi changes × 5
- 3-tempi changes × 5
- Half-pirouette left in canter (3–4 strides)
- Half-pirouette right in canter (3–4 strides)

**Critical PSG terminology rules** — enforce exactly:
- `8m volte` — never `10m circle`
- `half-pirouette` — never `pirouette` or `full pirouette`
- `3-tempi` and `4-tempi` only — never `1-tempi` or `2-tempi`
- `Counter canter` is a training movement. The zig-zag half-pass movement in PSG is `counter change of hand` — these are completely different things. Label it correctly.

---

### Intermediate I (`intermediate_1`)

**Coefficients** (from `coefficients_by_test → intermediate_1`):
- Half-pass to the right (trot) ×2 (movement)
- Half-pass to the left (trot) ×2 (movement)
- Collected walk ×2 (movement)
- Extended walk ×2 (movement)
- Canter zigzag (3 half-passes with flying changes) ×2 (movement)
- Pirouette to the left (canter) ×2 (movement)
- Pirouette to the right (canter) ×2 (movement)
- Harmony ×2 (collective)

**`newAt: true`** movements at Inter I:
- 2-tempi changes × 7
- Full pirouette left (6–8 strides)
- Full pirouette right (6–8 strides)
- Rein back (5 steps)
- Canter zigzag (3 half-passes with flying changes) — new pattern at this level

**Key differences from PSG:**
- Full pirouettes (6–8 strides) replace half-pirouettes in canter
- 2-tempi changes appear for the first time
- Zigzag (canter) becomes a coefficient
- Half-pirouettes in walk disappear
- Rein back added

---

### Intermediate II (`intermediate_2`)

**Coefficients** (from `coefficients_by_test → intermediate_2`):
- Trot zigzag (3 half-passes) ×2 (movement)
- Extended walk ×2 (movement)
- Collected walk ×2 (movement)
- Pirouette to the left (canter) ×2 (movement)
- Pirouette to the right (canter) ×2 (movement)
- Harmony ×2 (collective)

**`newAt: true`** movements at Inter II:
- Passage (multiple sections)
- Piaffe (8–10 steps, 1m forward permitted)
- Transitions passage–piaffe–passage
- 1-tempi changes × 11
- Medium canter
- Trot zigzag (3 half-passes, 5m each side) — different from the canter zigzag at Inter I

**Key differences from Inter I:**
- Passage and piaffe introduced — these are entirely new movement categories, not harder versions of existing movements. This is the most significant transition in all of dressage. Flag accordingly.
- 1-tempi changes (11) appear
- Medium canter added
- Trot zigzag pattern

---

### Grand Prix (`grand_prix`)

**Coefficients** (from `coefficients_by_test → grand_prix`):
- Half-pass to the right (trot) ×2 (movement)
- Half-pass to the left (trot) ×2 (movement)
- Piaffe 12–15 steps at D ×2 (movement)
- Extended walk ×2 (movement)
- Collected walk ×2 (movement)
- Piaffe 12–15 steps at I ×2 (movement)
- Canter zigzag (5 half-passes with flying changes) ×2 (movement)
- 15 flying changes every stride (1-tempis) ×2 (movement)
- Pirouette to the left (canter) ×2 (movement)
- Pirouette to the right (canter) ×2 (movement)
- Piaffe 12–15 steps at X ×2 (movement)
- Harmony ×2 (collective)

**Important:** Grand Prix has three separate piaffe sections scored independently — at D, at I, and at X. All three are coefficients. Represent them as three distinct `assessItems` entries, each with their arena letter noted.

**`newAt: true`** movements at Grand Prix:
- Piaffe 12–15 steps at D (longer than Inter II)
- Piaffe 12–15 steps at I
- Piaffe 12–15 steps at X
- Canter zigzag (5 half-passes — larger than Inter I's 3-half-pass zigzag)
- 1-tempi changes × 15
- Transitions walk–passage
- Rein back (carried from Inter I, not new, `newAt: false`)

**Key differences from Inter II:**
- Three piaffe sections of 12–15 steps (Inter II has one section of 8–10 steps)
- Extensive passage work across multiple sections
- Larger canter zigzag (5 half-passes vs. 3)
- 15 consecutive 1-tempi changes
- Transitions from walk directly to passage

---

### Grand Prix Special (`grand_prix_special`)

**Coefficients** (from `coefficients_by_test → grand_prix_special`):
- Half-pass to the left (trot) ×2 (movement)
- Half-pass to the right (trot) ×2 (movement)
- Extended walk ×2 (movement)
- Collected walk ×2 (movement)
- Piaffe 12–15 steps at G ×2 (movement)
- Piaffe 12–15 steps at I ×2 (movement)
- Pirouette to the left (canter) ×2 (movement)
- Pirouette to the right (canter) ×2 (movement)
- Piaffe 12–15 steps at X ×2 (movement)
- Harmony ×2 (collective)

**`newAt: true`** movements at GP Special:
- 24 total 1-tempi changes (15 on one diagonal, 9 on center line)
- Pirouettes on the centerline (different geometry from GP)
- Transitions walk–piaffe–passage (more direct than GP)
- Transitions passage–extended trot–passage

**Key differences from Grand Prix:**
- Most extensive passage work of any test
- 24 total 1-tempi changes (vs. 15 in GP)
- Walk transitions directly to piaffe (not passage first)
- Pirouettes performed on the centerline
- No rein back

---

## Step 6 — USDF Tests

If any USDF JSON files are found in Step 1, read them and build `TEST_DATA` entries following the same pattern. If files are not found, include stub entries for all USDF tests with `hasFullData: false`:

```js
training_1: { label: 'Training Level — Test 1', shortLabel: 'TL 1', hasFullData: false },
training_2: { label: 'Training Level — Test 2', shortLabel: 'TL 2', hasFullData: false },
training_3: { label: 'Training Level — Test 3', shortLabel: 'TL 3', hasFullData: false },
// ... first, second, third, fourth levels
// ... intro tests
// ... freestyle tests
```

The UI already handles `hasFullData: false` by showing a graceful "Full data coming soon" placeholder in all tabs rather than an empty state.

---

## Step 7 — Update the Three Files

### File 1: `ydj-test-explorer.html`

**Find:** The block beginning `const TEST_DATA = {` and ending with the closing `};` (currently contains only `psg` and `inter_1` entries).

**Replace with:** The complete `TEST_DATA` object covering all tests.

**Also update:** The `ALL_TESTS` array used for the dropdown — ensure `value` keys match `TEST_DATA` keys exactly:

```js
{ value: 'prix_st_georges',   label: 'FEI — Prix St. Georges' },
{ value: 'intermediate_1',    label: 'FEI — Intermediate I' },
{ value: 'intermediate_2',    label: 'FEI — Intermediate II' },
{ value: 'grand_prix',        label: 'FEI — Grand Prix' },
{ value: 'grand_prix_special',label: 'FEI — Grand Prix Special' },
```

---

### File 2: `show-preparation-form-v2.html`

**Find:** The block beginning `// Source: fei_test_database_complete.json` and the `const TEST_DATA = {` block that follows (currently contains only `psg`).

**Replace with:** The complete `TEST_DATA` object.

**Also update:** The `standardTests` array used for the test slot dropdowns — same key corrections as above.

---

### File 3: `ydj-show-planner-v3.html`

This file has a different structure. Make these three targeted replacements:

**Replace 1 — The `PSG` object:**

Find the block: `const PSG = {` through its closing `};`

Replace with the `prix_st_georges` entry from `TEST_DATA` — assign it as `const PSG = TEST_DATA.prix_st_georges;` after the `TEST_DATA` declaration, or inline the data directly.

**Replace 2 — The `CONCERN_ITEMS` array:**

Find: `const CONCERN_ITEMS = [` through its closing `];`

Replace with: `const CONCERN_ITEMS = TEST_DATA.prix_st_georges.assessItems;`

This ensures the concern checklist is driven by the same verified data as the other two files.

**Replace 3 — The `standardTests` array:**

Find the test dropdown data and update the FEI test value keys to match the rest:

```js
{ value: 'prix_st_georges',   label: 'FEI — Prix St. Georges' },
{ value: 'intermediate_1',    label: 'FEI — Intermediate I' },
{ value: 'intermediate_2',    label: 'FEI — Intermediate II' },
{ value: 'grand_prix',        label: 'FEI — Grand Prix' },
{ value: 'grand_prix_special',label: 'FEI — Grand Prix Special' },
```

---

## Step 8 — Write the Updated Files

Write each file back to its original path. Confirm each write succeeds before moving to the next file.

Do not modify anything other than what is specified in Step 7. All CSS, HTML structure, non-test JavaScript functions, AI prompt logic, interaction handlers, and comments stay exactly as written.

---

## Step 9 — Verify

After writing all three files, do a quick sanity check by searching each file for:

- `prix_st_georges` — should appear as a key in `TEST_DATA`
- `grand_prix_special` — should appear as a key in `TEST_DATA`
- `Extended trot` as a coefficient — should NOT appear (PSG coefficients are half-passes, walks, half-pirouettes, and Harmony only)
- `10m circle` — should NOT appear anywhere
- `full pirouette` (lowercase) in any PSG entry — should NOT appear
- `counter canter` as a PSG test movement label — should NOT appear (it's `counter change of hand`)

---

## Critical Domain Rules Summary

These rules are non-negotiable. Enforce them in every test entry.

| Rule | Correct | Never use |
|---|---|---|
| PSG circle geometry | `8m volte` | `10m circle` |
| PSG pirouette type | `half-pirouette (3–4 strides)` | `pirouette`, `full pirouette` |
| PSG tempi changes | `3-tempi`, `4-tempi` | `1-tempi`, `2-tempi` |
| PSG zig-zag label | `counter change of hand` | `counter canter` |
| Inter II introduction | passage and piaffe are **entirely new movement categories** | "harder versions" of existing movements |
| Grand Prix piaffe | three independent sections at D, I, and X | a single piaffe entry |
| Harmony collective | last in every FEI test's `assessItems` | omitted or reordered |
