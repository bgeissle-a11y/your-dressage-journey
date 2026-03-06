# Claude Code Instructions: Add Technical & Philosophical Self-Assessment to the Web App

## Overview

Add the **Technical & Philosophical Self-Assessment** form to the YDJ React web app, placing it in the **Profile tab** alongside the existing assessments (Rider Self-Assessment and Physical Self-Assessment). Like those assessments, this form is **updatable** — riders are not static, and their understanding of geometry, gait mechanics, the Training Scale, and their own riding mechanics will deepen over time. The form should behave exactly like the Rider and Physical Self-Assessments: always accessible, pre-populated with the most recently saved data so riders can update specific areas without starting from scratch, and overwriting the existing saved document on each save.

The completed form data should be saved to **Firebase Firestore** under the current user's document, consistent with how the other assessments are stored.

The source HTML file for reference is:
`technical-philosophical-self-assessment.html`

---

## What This Form Covers

Six sections of slider-based ratings and open-ended reflections:

1. **The Arena as Your Canvas** — Arena geometry confidence, quarterlines concept check, geometry usage, geometry gap
2. **Reading the Movement Beneath You** — Gait mechanics ratings (walk/trot/canter), timing concept check, gait insight
3. **Understanding the Movements** — Canter haunches-in vs. pirouette, lateral movements (shoulder-in/travers/renvers), current movement quality, hardest concept
4. **The Training Scale** — Dual sliders (Understanding + Application) for all 6 pillars (Rhythm, Suppleness, Contact, Impulsion, Straightness, Collection), plus one open-ended gap question
5. **The Rider as an Instrument** — Sliders for Independent Seat, Unilateral Aids, Timing of the Aid, plus one synthesis open-ended question
6. **The Bigger Picture** *(all optional)* — Four open-ended philosophical reflection questions

---

## Step-by-Step Instructions

### Step 1 — Create the Component File

Create a new file:
```
src/components/assessments/TechnicalPhilosophicalAssessment.jsx
```

Port the HTML form into a React functional component. Key conventions to follow:

- Use **React `useState`** for all form field values (no `localStorage` — that's the HTML prototype pattern only)
- Use the **existing YDJ CSS variable palette** and class conventions consistent with `RiderSelfAssessment` and `PhysicalSelfAssessment` components
- Do **not** use `<form>` tags — use `<div>` with `onClick` handlers on buttons
- All slider inputs use `onChange` (not `oninput`)
- The six Training Scale pillar cards should render from a data array to keep the JSX clean
- **Pre-populate from saved data:** On component mount, check Firestore for an existing `technicalPhilosophical` document. If found, initialize form state from that saved data so the rider sees their previous responses and can update specific fields rather than starting from scratch. Match exactly how `RiderSelfAssessment` and `PhysicalSelfAssessment` handle pre-population.

**Component state shape** (mirrors the Firebase save structure):
```javascript
const [formData, setFormData] = useState({
  arenaGeometry: {
    confidenceRating: 5,
    quarterlines: '',
    geometryUsage: '',
    geometryGap: ''
  },
  gaitMechanics: {
    walkUnderstanding: 5,
    trotUnderstanding: 5,
    canterUnderstanding: 5,
    timingConcept: '',
    gaitInsight: ''
  },
  movements: {
    pirouetteDiff: '',
    lateralMovements: '',
    currentMovement: '',
    movementQuality: '',
    hardestConcept: ''
  },
  trainingScale: {
    rhythm:       { understanding: 5, application: 5 },
    suppleness:   { understanding: 5, application: 5 },
    contact:      { understanding: 5, application: 5 },
    impulsion:    { understanding: 5, application: 5 },
    straightness: { understanding: 5, application: 5 },
    collection:   { understanding: 5, application: 5 },
    biggestGap: ''
  },
  riderSkills: {
    independentSeat:  { rating: 5 },
    unilateralAids:   { rating: 5 },
    timingOfAid:      { rating: 5 },
    prioritySkill: ''
  },
  synthesis: {
    dressagePhilosophy:  '',
    knowledgeBodyGap:    '',
    formativeInfluences: '',
    burningQuestion:     ''
  }
});
```

---

### Step 2 — Firebase Save Function

On form submission, save to Firestore under the authenticated user's document. Follow the **exact same pattern** used by the existing assessment components. The Firestore path should be:

```
users/{userId}/assessments/technicalPhilosophical
```

Or, if the existing assessments use a different collection/document structure (e.g., a single `profile` document with sub-fields), match that pattern exactly — **check how `riderSelfAssessment` and `physicalSelfAssessment` are stored and mirror it**.

The save call should include:
```javascript
{
  ...formData,
  timestamp: new Date().toISOString(),
  completedAt: serverTimestamp()
}
```

Show a **success state** after saving (either a completion screen or a toast notification — match whatever pattern the other assessments use).

---

### Step 3 — Add to the Profile Tab

Locate the **Profile tab** in the app (likely in `src/components/ProfileTab.jsx` or similar). The existing assessments are displayed there — find where `RiderSelfAssessment` and `PhysicalSelfAssessment` are rendered.

Add the new assessment in the same pattern. It should appear as a **third assessment card or section** in the Profile tab, labeled:

> **Technical & Philosophical Self-Assessment**
> *Understanding the "why" and "how" beneath every movement*

Match the existing card/button style used to launch the other assessments. If the assessments open as modals, use the same modal pattern. If they route to a separate page, add a route.

---

### Step 4 — Routing (if applicable)

If the app uses React Router and the assessments are separate pages, add a route:

```javascript
<Route path="/assessment/technical-philosophical" element={<TechnicalPhilosophicalAssessment />} />
```

And link to it from the Profile tab card.

---

### Step 5 — Make Assessment Data Available to the AI Analyzer

The existing AI analyzer reads from the user's Firestore profile data to generate coaching outputs. Once this assessment is saved, its data should be included in the data bundle passed to the analyzer.

Find where the analyzer aggregates user data (likely a `getUserData()` or `buildAnalysisPayload()` function) and add `technicalPhilosophical` assessment data to that bundle alongside the existing assessments.

The key fields for AI analysis are:
- All Training Scale understanding vs. application gap ratings
- The three rider skill ratings (seat, unilateral, timing)
- All open-ended text responses
- Arena geometry and gait mechanics confidence ratings

---

### Step 6 — Display Status in the Profile Tab

If the Profile tab shows a completion status indicator for each assessment, add logic to check whether `technicalPhilosophical` exists in the user's Firestore document. Match the exact pattern used by the Rider and Physical Self-Assessments — including any "last updated" date display, since this assessment is intended to be revisited as the rider's knowledge and feel develop over time.

---

## Design Notes

- **Training Scale pillars** should render as a 2-column card grid on desktop, 1-column on mobile
- Each pillar card has **two sliders** (Understanding and Application) — these are the `input[type="range"].mini` elements in the HTML
- The **"Optional" badge** on Bigger Picture questions is a small pill label — implement as an inline `<span>` with light styling
- **Concept Check boxes** use a distinct amber-tinted background (`rgba(212,165,116,0.08)`) with an amber border — these are the `🔍 Concept Check` callout boxes in the HTML
- **Scenario boxes** (used for movement comparisons and rider skill descriptions) use the left-border accent style

---

## Files to Create or Modify

| Action | File |
|--------|------|
| **Create** | `src/components/assessments/TechnicalPhilosophicalAssessment.jsx` |
| **Modify** | Profile tab component — add assessment card/entry point |
| **Modify** | Router config — add route if app uses page-based navigation |
| **Modify** | AI analyzer data aggregation — include new assessment data |
| **Modify** | Profile tab completion status logic — check for this assessment |

---

## Reference

The complete source HTML (with all content, labels, placeholder text, and structure) is in:
```
technical-philosophical-self-assessment.html
```

Use this as the content source of truth. All question text, slider labels, anchor labels, help text, placeholder text, and section descriptions should be ported exactly as written.
