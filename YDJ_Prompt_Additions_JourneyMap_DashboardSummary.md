# YDJ Prompt Additions — Journey Map Dashboard Summary
## Feature: `dashboardSummary` extraction at Journey Map generation
### April 2026

---

## Overview

This document adds a structured `dashboardSummary` field to the Journey Map output. The field is extracted from **Call 1: Data Synthesis** and written to Firestore at generation time. It powers the Journey Snapshot compact card in the Current Stats dashboard block and the trajectory field in the Weekly Coach Brief.

No new API call is added. No changes are made to Call 2 (Journey Narrative) or Call 3 (Visualization Data).

---

## Controlled Vocabulary — Trajectory Direction

The `trajectoryDirection` value must be one of these six strings exactly. No variants, synonyms, or free-form values are permitted.

| Value | When to apply |
|---|---|
| `Ascending` | Consistent forward movement. Scores, feel, or skill markers trending upward across recent data. |
| `Productive Stability` | Gains are holding but not yet deepening. The work is settling into the body before the next step forward. Consistency at current level — not a plateau. |
| `Stretching` | Actively working at the edge of current capability. High effort, some inconsistency, but the direction is clear. Often precedes Ascending. |
| `Plateauing` | Pattern repetition without progression. Data is flat; same challenges recurring without resolution. No new themes emerging. |
| `Struggling` | Recurring obstacles without resolution, declining confidence, or both. Negative trend in confidence or feel scores AND/OR the same obstacle appearing repeatedly across multiple entries without any session where it resolved. |
| `Recalibrating` | A meaningful shift in conditions: new horse, new trainer, injury return, level change, extended break. The baseline is resetting; progress metrics are temporarily less meaningful. |

**Distinguishing Plateauing from Struggling:** Plateauing = flat data, neutral affect. Struggling = negative trend in confidence or feel scores, OR the same obstacle appearing in 3+ consecutive entries without resolution. When in doubt, favor Plateauing unless confidence decline is explicit in the data.

**Distinguishing Productive Stability from Plateauing:** Productive Stability = the rider is executing current-level work consistently, with recent gains holding. Plateauing = the same challenge keeps appearing and the rider is not breaking through. If recent data shows obstacles repeating, choose Plateauing. If recent data shows current-level work landing cleanly, choose Productive Stability.

---

## Prompt Addition — Call 1: Data Synthesis

**Target call:** Call 1 (Data Synthesis), Journey Map  
**Append to:** End of Call 1 system prompt, before the data payload  
**Estimated token increase:** ~3–5% on Call 1 output (~80–120 additional output tokens)

```
DASHBOARD SUMMARY EXTRACTION

After completing your standard analysis (themes, milestones, patterns, goal_progress),
add a "dashboardSummary" object to your JSON output:

{
  "dashboardSummary": {
    "trajectoryDirection": "[one value from the controlled vocabulary below]",
    "emergingThemes": ["[theme 1]", "[theme 2]", "[theme 3]"],
    "excerpt": "[one sentence — the single most meaningful observation about where this rider is right now]"
  }
}

TRAJECTORY DIRECTION — controlled vocabulary (use exactly one):
  "Ascending"            — consistent forward movement, scores/feel trending upward
  "Productive Stability" — gains holding, not yet deepening; consistency before the next step
  "Stretching"           — working at the edge of capability; high effort, some inconsistency
  "Plateauing"           — flat data, same challenges recurring without resolution
  "Struggling"           — declining confidence or feel, OR same obstacle repeating 3+ sessions without resolution
  "Recalibrating"        — meaningful context shift (new horse, trainer, level, injury return, extended break)

EMERGING THEMES — rules:
  - Maximum 3 themes
  - Each theme is a short noun phrase, 2–5 words (e.g., "timing precision", "throughness under pressure", "left-lead tension")
  - Themes must emerge from the data in this generation — do not carry forward themes from prior outputs
  - Order by salience (most prominent first)

EXCERPT — rules:
  - Exactly one sentence
  - Must be specific to this rider's data — never generic
  - Should feel like the opening line of a coaching conversation, not a report summary
  - Do not begin with "You" or "Your" — vary the construction
  - Do not state the trajectory direction explicitly (the direction label already appears in the UI)
  - Classical Master voice: precise, grounded, occasionally poetic

Examples of well-formed excerpts:
  "The consistency you've built in the medium trot is starting to transfer — the canter is next."
  "Throughness is the thread that connects every obstacle in the last six weeks."
  "Something shifted in your confidence at the canter depart; the data suggests it happened on March 14th."
```

---

## Firestore Write — Post-Generation

After Call 1 returns and is validated, extract `dashboardSummary` and write it to the Journey Map Firestore document alongside the full output.

**Document path:** `analysis/journeyMap/{uid}`

**Fields to add/update at generation time:**

```javascript
// After Call 1 JSON is validated:
const { dashboardSummary } = call1Output;

// Write to Firestore alongside full output:
journeyMapDoc.dashboardSummary = {
  trajectoryDirection: dashboardSummary.trajectoryDirection,   // string (controlled vocab)
  emergingThemes: dashboardSummary.emergingThemes,             // string[] (max 3)
  excerpt: dashboardSummary.excerpt,                           // string (one sentence)
  generatedAt: serverTimestamp()                               // timestamp — used for staleness checks
};
```

The `generatedAt` timestamp is written at the `dashboardSummary` level, not at the document level, so staleness can be evaluated independently of the full Journey Map document's own timestamp.

---

## Validation Rules (Pre-Write)

Before writing `dashboardSummary` to Firestore, validate:

```javascript
const VALID_DIRECTIONS = [
  'Ascending',
  'Productive Stability',
  'Stretching',
  'Plateauing',
  'Struggling',
  'Recalibrating'
];

function validateDashboardSummary(summary) {
  if (!VALID_DIRECTIONS.includes(summary.trajectoryDirection)) {
    throw new Error(`Invalid trajectoryDirection: ${summary.trajectoryDirection}`);
  }
  if (!Array.isArray(summary.emergingThemes) || summary.emergingThemes.length > 3) {
    throw new Error('emergingThemes must be an array of 1–3 items');
  }
  if (typeof summary.excerpt !== 'string' || summary.excerpt.trim() === '') {
    throw new Error('excerpt must be a non-empty string');
  }
}
```

If validation fails, log the error and write the full Journey Map output without `dashboardSummary`. The dashboard card shows its empty state. Do not block the Journey Map generation on a `dashboardSummary` validation failure.

---

## Schema Summary

**No changes to existing fields.** `dashboardSummary` is additive.

| Field | Type | Notes |
|---|---|---|
| `dashboardSummary.trajectoryDirection` | `string` | Controlled vocabulary — 6 valid values |
| `dashboardSummary.emergingThemes` | `string[]` | 1–3 items; noun phrases, 2–5 words each |
| `dashboardSummary.excerpt` | `string` | One sentence; Classical Master voice |
| `dashboardSummary.generatedAt` | `timestamp` | Written at generation; used for staleness checks |

---

*Reference files: `YDJ_JourneyMap_DashboardCard_Implementation_Brief.md` (dashboard card UI + coach brief integration), `YDJ_Complete_AI_Prompt_Reference.md` (full Journey Map call specifications)*
