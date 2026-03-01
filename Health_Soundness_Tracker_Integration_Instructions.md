# Horse Health & Soundness Tracker — Integration Instructions
**For Claude Code | YDJ Webapp**

---

## Overview

Add the Horse Health & Soundness Tracker to the YDJ webapp as a new form under the **Record** section of the dashboard. This tracker is horse-specific (not rider-specific) and replaces the need to log horse health/soundness events in the Journey Event Log. The Journey Event Log remains for all other significant events.

**Source file:** `horse-health-soundness-tracker.html` (already built and tested)

---

## Task 1 — Add the File to the Webapp

1. Copy `horse-health-soundness-tracker.html` into the webapp's root forms directory alongside the other HTML forms (`post-ride-debrief-with-intentions.html`, `observation-form.html`, etc.).

2. Rename it to match the project's naming convention:
   ```
   horse-health-soundness-tracker.html
   ```

3. Add it to `netlify.toml` (or equivalent routing config) if the project uses explicit route declarations.

---

## Task 2 — Replace localStorage with Firebase Firestore

The current form uses `localStorage` for persistence. **This must be replaced with Firestore** to match all other YDJ forms and resolve iOS Safari persistence issues.

### Firestore Collection Structure

Add a new subcollection under each user document:

```
users/{userId}/horse_health_entries/{entryId}
  - id: string (auto-generated)
  - createdAt: timestamp
  - updatedAt: timestamp
  - horseName: string (required)
  - date: string (ISO date, e.g. "2026-02-28")
  - issueType: "maintenance" | "concern" | "emergency"
  - title: string
  - notes: string
  - professionals: string[]
  - results: string
  - nextSteps: string
  - status: "ongoing" | "resolved"
  - resolvedDate: string | null
```

### What to Change in the HTML/JS

Find the following functions and update them to use Firestore instead of localStorage:

**`saveEntry()`** — Replace:
```js
localStorage.setItem('ydj-health-entries', JSON.stringify(entries));
```
With a Firestore `addDoc()` or `setDoc()` call to `users/{userId}/horse_health_entries`, following the same pattern used in `journey-event-log.html` or `observation-form.html`.

**`loadEntries()` / `DOMContentLoaded` init** — Replace:
```js
JSON.parse(localStorage.getItem('ydj-health-entries') || '[]')
```
With a Firestore `getDocs()` query on `users/{userId}/horse_health_entries`, ordered by `date` descending.

**`markResolved()` and `editEntry()` save path** — Replace the localStorage write with a Firestore `updateDoc()` call using the entry's document ID.

**`deleteEntry()`** — Replace the localStorage write with a Firestore `deleteDoc()` call.

### Auth Guard

Wrap the page initialization in an `onAuthStateChanged` check, exactly as done in other forms. Redirect to login if no authenticated user.

---

## Task 3 — Add to Dashboard Navigation Under "Record"

The dashboard has (or will have) a **Record** section grouping all data-entry forms. Add the Health & Soundness Tracker to this section.

### Dashboard Card

Add a card in the same style as the other Record section cards:

```
Icon:  🐴  (or a stethoscope emoji — your call)
Title: Health & Soundness
Description: Track vet visits, body work, maintenance, soundness concerns, and emergencies for each horse.
Frequency badge: As needed
Link: horse-health-soundness-tracker.html
```

### Nav Bar

If the webapp has a persistent navigation bar or sidebar that links to forms, add:
- Label: **Health & Soundness**
- Href: `horse-health-soundness-tracker.html`
- Position: Under the Record group, after Journey Event Log

---

## Task 4 — Update the Tips & FAQ (`ydj-tips-and-faq.html`)

### 4a — Add Health & Soundness to "Your Forms at a Glance" card grid

In the form cards section (around the `#your-forms` anchor), add a new card after the Journey Event Log card:

```html
<a href="horse-health-soundness-tracker.html" class="form-card">
    <div class="card-icon">🐴</div>
    <div class="card-title">Health & Soundness</div>
    <div class="card-desc">Track vet visits, body work, saddle fittings, soundness concerns, and emergencies — with full history per horse.</div>
    <span class="card-freq">As they happen</span>
</a>
```

### 4b — Add a new section: "Horse Health & Soundness Tracker"

Add this as a new `<div class="section">` after the Events section (`#events`). Use the existing section structure:

```
Anchor ID: #health-soundness
Heading: 🐴 Horse Health & Soundness Tracker

Content to include:
- What it is: A dedicated log for tracking everything related to your horse's physical wellbeing — from routine maintenance (chiro, massage, farrier) to concerns worth monitoring to emergencies.
- How it differs from the Journey Event Log: The Event Log captures life events affecting your training context. The Health & Soundness Tracker is horse-specific and clinical — it's a medical/care record, not a narrative log.
- The three issue types: Maintenance (routine, planned care), Concern (something to monitor), Emergency (acute or serious).
- The Status field: Mark entries Ongoing or Resolved — and update them over time. This creates a longitudinal health picture the AI can use.
- Tip box: "Log every professional visit, not just problems. Chiro, massage, saddle fitter, and farrier visits are data. When the AI sees that your horse had bodywork two days before a breakthrough ride, it can flag that connection."
- Note about horse name: Entries are tied by horse name, so if you ride multiple horses, each builds its own health record.
```

### 4c — Update the Journey Event Log section (`#events`)

In the existing Events section, find the description of the Journey Event Log and revise it to reflect the new division of responsibility. Update this paragraph:

**Current text (approximate):**
> "Log shows, clinics, vet visits, rider or horse health issues, environmental changes (new barn, footing changes, seasonal shifts), farrier visits, new equipment, or training milestones."

**Replace with:**
> "Log shows, clinics, rider health issues, environmental changes (new barn, footing changes, seasonal shifts), new equipment, or training milestones. **Horse health, vet visits, body work, and soundness concerns now have their own dedicated tracker** — use the Health & Soundness Tracker for those."

Also update the form card description for Journey Event Log in the card grid:

**Current:**
> "Record shows, clinics, vet visits, rider or horse health issues, environmental changes, and their impact and significance."

**Replace with:**
> "Record shows, clinics, rider health, environmental changes, and other significant moments and their impact on your journey."

### 4d — Add Health & Soundness to the Table of Contents

In the `<nav class="toc">` block, add:
```html
<a href="#health-soundness">Horse Health & Soundness Tracker</a>
```
Position it after the Events entry.

---

## Task 5 — Update the Journey Event Log (`journey-event-log.html`)

### 5a — Remove "Horse Health" event type option (or retitle it)

In the Event Type `<select>` dropdown, find:
```html
<option value="horse">Horse Health/Horse Change</option>
```

Update to:
```html
<option value="horse">Horse Change (barn move, new horse, retirement)</option>
```

This signals that horse *health* now lives in the dedicated tracker, while other horse-context events (new horse, retirement, change in turnout) still belong here.

### 5b — Add a contextual note near the top of the form

Below the form's introductory description (before the first form section), add a small informational callout:

```
💡 Tracking a vet visit, soundness issue, or body work appointment?
Use the Health & Soundness Tracker — it gives you a full medical history per horse.
[Link to horse-health-soundness-tracker.html]
```

Style this as a `.tip-box` or `.info-callout` using the existing CSS class.

---

## Task 6 — Firestore Security Rules

Add a rule for the new subcollection following the same pattern as existing rules:

```
match /users/{userId}/horse_health_entries/{entryId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

---

## Task 7 — Update CLAUDE.md

Add the new form to the Input Data Model table in `CLAUDE.md`:

| Form | Frequency | Purpose |
|---|---|---|
| **Horse Health & Soundness Tracker** | As needed | Per-horse log of vet visits, body work, soundness concerns, and emergencies; tracks issue type, professionals seen, results, next steps, and resolution status |

Also add a note under "Important Conventions":
> **Horse health records:** When AI outputs reference horse health patterns, draw from `horse_health_entries` subcollection. Entries are identified by `horseName` field — use the horse's actual name, never "your horse."

---

## Testing Checklist

Before marking complete, verify:

- [ ] Form loads without auth redirect errors
- [ ] New entry saves to Firestore with correct user ID
- [ ] Entries load from Firestore on page open (not from localStorage)
- [ ] Edit mode pre-populates all fields correctly from Firestore data
- [ ] Mark Resolved updates Firestore document (not just local state)
- [ ] Delete removes Firestore document
- [ ] Summary counts (total, ongoing, resolved, emergency) are accurate
- [ ] Filter chips correctly filter Firestore-loaded entries
- [ ] Horse name appears in both card header and detail view
- [ ] Form works on iOS Safari (primary mobile target)
- [ ] Dashboard card links to correct URL
- [ ] FAQ links to `#health-soundness` anchor correctly
- [ ] Journey Event Log contextual note links correctly

---

## Notes for Claude Code

- Follow the existing auth pattern from `observation-form.html` or `journey-event-log.html` — don't invent a new auth flow.
- Use the same Firestore SDK version already in the project.
- The form's visual design is complete — do not modify CSS or layout.
- The `switchTabByName()` function replaces the original `switchTab()` — both exist in the file; the old one now delegates to the new one. This is intentional.
- Horse name is a required field. The validation in `saveEntry()` already enforces this.
