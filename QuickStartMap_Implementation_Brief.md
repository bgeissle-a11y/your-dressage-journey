# QuickStart Map — Claude Code Implementation Brief
## Your Dressage Journey (YDJ)

**Purpose:** Implement the Quick Start Map as a live, Firebase-driven React component that automatically marks steps complete based on actual form submissions in Firestore. The visual reference design is `ydj-quickstart-map.html` (in the project root). This brief covers component structure, Firebase data reads, Firestore schema additions, and routing.

---

## 1. Reference File

The complete visual design, layout, color system, and interaction behavior is implemented in:

```
ydj-quickstart-map.html
```

Use this as the definitive reference for all visual decisions. Do not redesign. Translate it faithfully into React, preserving:
- All CSS custom properties (copy the `:root` block as-is into the component's CSS module or styled-components)
- All card layouts, optional clusters, dual track, outputs zone, branch cards
- The Playfair Display + Work Sans font pairing (already in the project design system)
- The warm plum (`#7a3f72`) for optional items — not green
- The progress bar, "You Are Here" bar, and section labels

---

## 2. Component Location

```
src/
  components/
    QuickStartMap/
      QuickStartMap.jsx          ← main component
      QuickStartMap.module.css   ← styles (ported from HTML reference)
      useJourneyProgress.js      ← Firebase data hook (see Section 4)
      index.js                   ← re-export
```

---

## 3. Component Architecture

### 3.1 Props

```jsx
// QuickStartMap.jsx
// No required props — all data comes from Firebase via the hook.
// userId is read from Firebase Auth context.

export default function QuickStartMap() { ... }
```

### 3.2 State Shape

The component has two layers of state:

**A. `liveProgress` — driven by Firebase (read-only, auto-updates)**
```js
{
  riderProfileComplete: false,      // rider profile document exists
  horseProfileComplete: false,      // at least 1 horse profile document exists
  reflectionsByCategory: {          // map of category → at least 1 reflection exists
    personalMilestone: false,
    externalValidation: false,
    ahaMoment: false,
    obstacle: false,
    connection: false,
    feelBodyAwareness: false,
  },
  debriefCount: 0,                  // total debrief documents (need >= 5)
  riderAssessmentComplete: false,   // mental self-assessment submitted
  physicalAssessmentComplete: false,
  techPhilAssessmentComplete: false,
  hasObservations: false,           // at least 1 observation submitted
  hasHealthLog: false,              // at least 1 health log entry
  hasEventLog: false,               // at least 1 journey event log entry
}
```

**B. `manualOverrides` — user can tap to mark done if Firebase hasn't caught up**
```js
// Stored in localStorage as fallback for items that aren't
// directly detectable from Firestore (e.g., outputs reviewed).
// Keys mirror liveProgress keys above, plus:
{
  outputsReviewed: false,           // user taps "I've reviewed my outputs"
}
```

**Derived state (computed, not stored):**
```js
const reflectionsDone = Object.values(reflectionsByCategory).every(Boolean)
const debriefsDone = debriefCount >= 5
const coreDone = reflectionsDone && debriefsDone
const outputsUnlocked = coreDone  // outputs unlock automatically when core is done
```

### 3.3 Merge Logic

```js
// Merge Firebase live data with manual overrides
// Firebase always wins for positive completions (can't un-complete a submission)
const progress = {
  ...manualOverrides,
  ...Object.fromEntries(
    Object.entries(liveProgress).map(([k, v]) => [k, v || manualOverrides[k]])
  )
}
```

---

## 4. Firebase Hook — `useJourneyProgress.js`

This hook subscribes to Firestore with `onSnapshot` listeners so the map updates in real time when a form is submitted in another tab or on another device.

```js
// src/components/QuickStartMap/useJourneyProgress.js

import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'  // adjust to your auth context path
import {
  collection, doc, query, where,
  onSnapshot, getCountFromServer
} from 'firebase/firestore'
import { db } from '../../firebase'  // adjust to your firebase init path

export function useJourneyProgress() {
  const { currentUser } = useAuth()
  const uid = currentUser?.uid

  const [progress, setProgress] = useState({
    riderProfileComplete: false,
    horseProfileComplete: false,
    reflectionsByCategory: {
      personalMilestone: false,
      externalValidation: false,
      ahaMoment: false,
      obstacle: false,
      connection: false,
      feelBodyAwareness: false,
    },
    debriefCount: 0,
    riderAssessmentComplete: false,
    physicalAssessmentComplete: false,
    techPhilAssessmentComplete: false,
    hasObservations: false,
    hasHealthLog: false,
    hasEventLog: false,
  })

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) return

    const unsubs = []

    // ── 1. Rider Profile ────────────────────────────────────────────
    // Single document at users/{uid}/riderProfile/profile
    const riderProfileRef = doc(db, 'users', uid, 'riderProfile', 'profile')
    unsubs.push(
      onSnapshot(riderProfileRef, snap => {
        setProgress(prev => ({ ...prev, riderProfileComplete: snap.exists() }))
        setLoading(false)
      })
    )

    // ── 2. Horse Profiles ────────────────────────────────────────────
    // Collection: users/{uid}/horseProfiles — need at least 1 document
    const horsesRef = collection(db, 'users', uid, 'horseProfiles')
    unsubs.push(
      onSnapshot(horsesRef, snap => {
        setProgress(prev => ({ ...prev, horseProfileComplete: snap.size > 0 }))
      })
    )

    // ── 3. Reflections by category ───────────────────────────────────
    // Collection: users/{uid}/reflections
    // Each document has a `category` field using one of the 6 values below.
    // We need at least 1 document per category.

    const CATEGORY_MAP = {
      personalMilestone:  'Personal Milestone',
      externalValidation: 'External Validation',
      ahaMoment:          'Aha Moment',
      obstacle:           'Obstacle',
      connection:         'Connection',
      feelBodyAwareness:  'Feel/Body Awareness',
    }

    Object.entries(CATEGORY_MAP).forEach(([key, firestoreValue]) => {
      const q = query(
        collection(db, 'users', uid, 'reflections'),
        where('category', '==', firestoreValue)
      )
      unsubs.push(
        onSnapshot(q, snap => {
          setProgress(prev => ({
            ...prev,
            reflectionsByCategory: {
              ...prev.reflectionsByCategory,
              [key]: snap.size > 0,
            },
          }))
        })
      )
    })

    // ── 4. Ride Debriefs ─────────────────────────────────────────────
    // Collection: users/{uid}/debriefs — count all documents
    const debriefsRef = collection(db, 'users', uid, 'debriefs')
    unsubs.push(
      onSnapshot(debriefsRef, snap => {
        setProgress(prev => ({ ...prev, debriefCount: snap.size }))
      })
    )

    // ── 5. Self-Assessments ──────────────────────────────────────────
    // Collection: users/{uid}/selfAssessments
    // Each document has `assessmentType` field:
    //   'mental'       → Rider Self-Assessment (mental)
    //   'physical'     → Physical Self-Assessment
    //   'techPhil'     → Technical & Philosophical Self-Assessment (NEW — see Section 6)
    const assessmentsRef = collection(db, 'users', uid, 'selfAssessments')
    unsubs.push(
      onSnapshot(assessmentsRef, snap => {
        let rider = false, physical = false, techPhil = false
        snap.forEach(d => {
          const t = d.data().assessmentType
          if (t === 'mental')   rider    = true
          if (t === 'physical') physical = true
          if (t === 'techPhil') techPhil = true
        })
        setProgress(prev => ({
          ...prev,
          riderAssessmentComplete:   rider,
          physicalAssessmentComplete: physical,
          techPhilAssessmentComplete: techPhil,
        }))
      })
    )

    // ── 6. Observations ──────────────────────────────────────────────
    // Collection: users/{uid}/observations
    const obsRef = collection(db, 'users', uid, 'observations')
    unsubs.push(
      onSnapshot(obsRef, snap => {
        setProgress(prev => ({ ...prev, hasObservations: snap.size > 0 }))
      })
    )

    // ── 7. Health Log ────────────────────────────────────────────────
    // Collection: users/{uid}/horseHealth
    const healthRef = collection(db, 'users', uid, 'horseHealth')
    unsubs.push(
      onSnapshot(healthRef, snap => {
        setProgress(prev => ({ ...prev, hasHealthLog: snap.size > 0 }))
      })
    )

    // ── 8. Journey Event Log ─────────────────────────────────────────
    // Collection: users/{uid}/journeyEvents
    const eventsRef = collection(db, 'users', uid, 'journeyEvents')
    unsubs.push(
      onSnapshot(eventsRef, snap => {
        setProgress(prev => ({ ...prev, hasEventLog: snap.size > 0 }))
      })
    )

    return () => unsubs.forEach(u => u())
  }, [uid])

  return { progress, loading }
}
```

### 4.1 Performance Note

Eight `onSnapshot` listeners is acceptable for this use case. Each listener is per-user, scoped to small collections, and cleaned up on unmount. Do NOT use `getCountFromServer` here — it does not provide real-time updates. If read costs become a concern at scale, the reflection category queries (6 listeners) can be collapsed into a single listener that reads all reflections and derives category coverage client-side.

---

## 5. Component Implementation Notes

### 5.1 "You Are Here" Logic

Compute `yahText` as a derived string from `progress`:

```js
function getYAHText(progress) {
  const { riderProfileComplete, horseProfileComplete, reflectionsByCategory,
          debriefCount, riderAssessmentComplete, physicalAssessmentComplete } = progress

  const refDone = Object.values(reflectionsByCategory).every(Boolean)
  const debDone = debriefCount >= 5
  const coreDone = refDone && debDone

  if (!riderProfileComplete)  return 'Start your journey — create your Rider Profile'
  if (!horseProfileComplete)  return 'Next: create your Horse Profile(s)'
  if (!coreDone) {
    const refCount = Object.values(reflectionsByCategory).filter(Boolean).length
    return `Core practice in progress: ${refCount}/6 reflections · ${Math.min(debriefCount, 5)}/5 debriefs`
  }
  return 'Outputs unlocked — keep riding and building your data, or explore a new path'
}
```

### 5.2 Progress Bar

Required steps = 14 (rider profile, horse profile, 6 reflection categories, 5 debriefs):

```js
function getProgressPct(progress) {
  let done = 0
  if (progress.riderProfileComplete) done++
  if (progress.horseProfileComplete) done++
  done += Object.values(progress.reflectionsByCategory).filter(Boolean).length
  done += Math.min(progress.debriefCount, 5)
  return Math.round((done / 14) * 100)
}
```

### 5.3 Tick Boxes

The 6 reflection category ticks and 5 debrief ticks should be read-only when Firebase data shows them complete (show a filled gold state), and tappable as manual overrides when not yet complete. Do NOT allow the user to un-check something that Firebase shows as done.

```jsx
// For each tick:
const isFirebaseDone = progress.reflectionsByCategory.personalMilestone  // etc.
const isManualDone   = manualOverrides.reflections?.personalMilestone
const isDone         = isFirebaseDone || isManualDone

<div
  className={`${styles.tick} ${isDone ? styles.checked : ''}`}
  onClick={() => {
    if (!isFirebaseDone) toggleManualTick('personalMilestone')
  }}
  title={isFirebaseDone ? 'Completed — reflection submitted' : 'Personal Milestone'}
>
  PM
</div>
```

### 5.4 Links

All links in the HTML reference file point to the HTML pilot forms. In the React app, replace with React Router `<Link>` components pointing to the equivalent React routes:

| HTML href | React route |
|-----------|-------------|
| `rider-profile.html` | `/profile/rider` |
| `horse-profile.html` | `/profile/horse` |
| `dressage-reflection-form.html` | `/forms/reflection` |
| `post-ride-debrief-with-intentions.html` | `/forms/debrief` |
| `rider-self-assessment.html` | `/forms/assessment/mental` |
| `physical-self-assessment.html` | `/forms/assessment/physical` |
| `technical-philosophical-self-assessment.html` | `/forms/assessment/techphil` |
| `observation-form.html` | `/forms/observation` |
| `journey-event-log.html` | `/forms/event-log` |
| `ydj-outputs-tips-and-faq.html` | `/outputs` |
| `event-preparation-form.html` | `/forms/show-prep` |

Adjust route paths to match whatever routing structure already exists in the app. If routes don't exist yet for some forms, use `href` with the static HTML URL served from Firebase Hosting as a temporary fallback and add a `// TODO: replace with React route` comment.

### 5.5 Loading State

While `loading === true` from the hook, render a skeleton version of the map — same layout, but station nodes show as pulsing grey circles and card content is replaced with grey placeholder bars. This prevents layout shift and signals to the user that data is loading.

```jsx
if (loading) return <QuickStartMapSkeleton />
```

---

## 6. Firestore Schema Addition — Technical & Philosophical Assessment

The Technical & Philosophical Self-Assessment is a new assessment type that does not yet have a defined `assessmentType` value. When implementing the assessment form itself, write the Firestore document with:

```js
// In the form submission handler for technical-philosophical-self-assessment
await addDoc(collection(db, 'users', uid, 'selfAssessments'), {
  assessmentType: 'techPhil',    // ← this exact string
  assessmentDate: new Date(),
  // ... form field values
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
})
```

The hook in Section 4 already listens for `assessmentType === 'techPhil'` and will auto-detect completion once this document is written.

**If the assessment form is not yet implemented in React:** The optional card for this assessment should still render and link to the HTML pilot form (`technical-philosophical-self-assessment.html`) as a fallback. The Firebase completion detection will work automatically once the form writes the correct `assessmentType` field.

---

## 7. Firestore Security Rules

Verify that the following collections are covered by your existing security rules. Each collection must allow reads and writes only for the authenticated user matching `uid`:

```
users/{uid}/riderProfile/{docId}
users/{uid}/horseProfiles/{docId}
users/{uid}/reflections/{docId}
users/{uid}/debriefs/{docId}
users/{uid}/selfAssessments/{docId}
users/{uid}/observations/{docId}
users/{uid}/horseHealth/{docId}
users/{uid}/journeyEvents/{docId}
```

Standard rule pattern (confirm this already exists or add it):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 8. Routing — Where to Surface the Map

The Quick Start Map should appear in two places:

**A. Dedicated route** — accessible at all times from nav:
```
/quickstart   (or /getting-started)
```

**B. Dashboard injection** — render the map as a collapsible panel on the main dashboard for users who have not yet reached `coreDone === true`. Once `coreDone` is true, collapse it by default with a "View your journey map" expand toggle so it doesn't dominate the dashboard for established users.

```jsx
// In Dashboard.jsx
{!coreDone && <QuickStartMap />}
{coreDone && <QuickStartMapCollapsed />}
```

---

## 9. Implementation Order

Work in this sequence to avoid blocked dependencies:

1. **Create `useJourneyProgress.js` hook** — verify all 8 Firestore listeners return data for a test user
2. **Port CSS** from HTML reference into `QuickStartMap.module.css` — verify visual parity with the HTML file in browser
3. **Build static component** with hardcoded `progress` state — confirm all sections render correctly
4. **Wire hook** — replace hardcoded state with `useJourneyProgress()` return value
5. **Implement manual override** for tick boxes — localStorage persistence
6. **Implement loading skeleton**
7. **Add React Router links** — replace `href` attributes
8. **Add to dashboard** with collapse logic
9. **Verify on iOS Safari** — test all tap targets (minimum 44×44px per Apple HIG)

---

## 10. Known Firestore Collection Name Assumptions

The collection names used in the hook (Section 4) are based on the schema documented in `Your_Dressage_Journey_Technical_Implementation_Plan.md`. **Verify these against your actual Firestore before implementing.** If any collection name differs, update the hook accordingly.

| Assumed collection name | Check against |
|------------------------|---------------|
| `users/{uid}/riderProfile` | Rider Profile form submission handler |
| `users/{uid}/horseProfiles` | Horse Profile form submission handler |
| `users/{uid}/reflections` | Reflection form submission handler |
| `users/{uid}/debriefs` | Post-Ride Debrief submission handler |
| `users/{uid}/selfAssessments` | All self-assessment submission handlers |
| `users/{uid}/observations` | Observation form submission handler |
| `users/{uid}/horseHealth` | Horse Health Log submission handler |
| `users/{uid}/journeyEvents` | Journey Event Log submission handler |

Also verify that the `category` field in the reflections collection uses exactly these string values (case-sensitive):
- `'Personal Milestone'`
- `'External Validation'`
- `'Aha Moment'`
- `'Obstacle'`
- `'Connection'`
- `'Feel/Body Awareness'`

If the existing forms write different strings, either update the forms to use these values, or update the `CATEGORY_MAP` in the hook to match whatever strings the forms currently write.

---

## 11. Files to Create or Modify

| File | Action |
|------|--------|
| `src/components/QuickStartMap/QuickStartMap.jsx` | Create |
| `src/components/QuickStartMap/QuickStartMap.module.css` | Create |
| `src/components/QuickStartMap/useJourneyProgress.js` | Create |
| `src/components/QuickStartMap/index.js` | Create |
| `src/pages/QuickStart.jsx` (or equivalent) | Create — renders `<QuickStartMap />` |
| `src/App.jsx` (or router file) | Modify — add `/quickstart` route |
| `src/pages/Dashboard.jsx` | Modify — inject map panel |
| `firestore.rules` | Verify/modify — confirm per-user read/write rules |

---

*Reference: `ydj-quickstart-map.html` — visual design authority for this component*
*Reference: `Your_Dressage_Journey_Technical_Implementation_Plan.md` — Firestore schema*
*Reference: `CLAUDE.md` — project architecture and conventions*
