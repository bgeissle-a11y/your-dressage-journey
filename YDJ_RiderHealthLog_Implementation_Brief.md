# Implementation Brief: Rider Health & Wellness Log
**Your Dressage Journey — Claude Code Handoff**
**Date:** April 2026
**Priority:** Medium (pre-launch feature, no AI integration at launch)

---

## ⚠️ Read This First — Regression Safety

This brief covers **two phases** that must be implemented and tested in sequence:

- **Phase 1 — Form implementation.** New form file plus surgical additions to dashboard, FAQ, quick-start, and security rules. No AI/prompt changes in Phase 1.
- **Phase 2 — Prompt integration.** After Phase 1 is verified, apply prompt additions per the companion document `YDJ_Prompt_Additions_Rider_Health.md`. This phase touches `promptBuilder.js`, `YDJ_AI_Coaching_Voice_Prompts_v3.md`, and `YDJ_Complete_AI_Prompt_Reference.md`.

**Do not interleave the two phases.** Finish and regression-test Phase 1 before starting Phase 2. This keeps form bugs and prompt bugs from compounding.

### Files touched

**Phase 1 (form):**

| File | Change scope |
|---|---|
| `ydj-dashboard-v4.html` | Nav bar: **1 line added**. Your Data block: **1 card added**. Export handler: **1 collection fetch added**. Nothing existing modified. |
| `ydj-tips-and-faq.html` | TOC: **1 anchor added**. Forms-at-a-glance grid: **1 card added**. **1 new `<div class="section">` appended**. Nothing existing modified. |
| `ydj-quickstart-map.html` | Optional node added following the existing `--opt` pattern. Nothing existing modified. |
| `journey-event-log.html` / `journey-event-logV2.html` | **Optional** contextual callout added below intro. No form fields, no save logic, no options changed. |
| Firestore security rules | **1 rule block appended**. No existing rules modified. |
| `CLAUDE.md` | **1 row added** to Input Data Model table. **1 convention note appended**. Nothing existing modified. |

**Phase 2 (prompt integration):**

| File | Change scope |
|---|---|
| `promptBuilder.js` | **1 new fetch added** for rider health log. **Data blob assembly modified** to produce a shared-audience filtered variant. **Prompt string additions** to base context, Physical Guidance, and Multi-Voice shared voice context — all per the companion doc. Nothing existing removed. |
| `YDJ_AI_Coaching_Voice_Prompts_v3.md` | **Appended** new data type bullet, RIDER HEALTH & WELLNESS AWARENESS block, Physical Guidance integration block, Multi-Voice shared voice context addition. Nothing existing modified. |
| `YDJ_Complete_AI_Prompt_Reference.md` | Data type list and awareness rules updated to include rider health. Existing horse health content untouched. |

**Explicit non-goals for this brief (both phases):**
- Do NOT rename, move, or modify the existing `Health` nav button (it points to the Horse Health & Soundness Tracker and stays exactly as-is).
- Do NOT touch `horse-health-soundness-tracker.html` or the `horse_health_entries` collection.
- Do NOT modify `riders-toolkit.html`, `physical-self-assessment_v2.html`, or any debrief/reflection form.
- Do NOT include rider health data in Weekly Coach Brief or Journey Map prompt input — this is a deliberate privacy decision, not an oversight. Strip the data at the assembly layer as specified in the companion doc.
- Do NOT modify ToS or Privacy Policy text. Legal queue item flagged in Section 12.

If any change seems to require touching a file not listed above, **stop and flag it** rather than proceeding.

---

## Overview

Add `rider-health-log.html` as a new form where riders log dated physical health events affecting their riding — appointments, injuries, flare-ups, recovery — parallel to the Horse Health & Soundness Tracker but with rider-specific types, fields, and framing.

The finished HTML prototype is at `rider-health-log.html` in the project root. Use it as the **source of truth** for all UI, copy, and UX. Do not redesign it — implement it as-is with Firebase wired in.

**Key framing (preserved from the prototype — do not change):** This is a training journal, not a medical record. The two top-of-form scope notes and the "what not to log" guidance are deliberate to avoid HIPAA-adjacent data sensitivity. Any field renames from "clinical" language (e.g., "Findings" → "What you're noticing in the saddle") are intentional and must remain.

---

## 1. New File

The source file `rider-health-log.html` is in the project root. Wire it up with Firebase auth and Firestore. No structural changes to the HTML are needed beyond replacing the in-memory `entriesList` DOM with live Firestore reads/writes.

The prototype contains three seeded example entries (recurring hip tightness, monthly massage, thumb sprain). **Remove all three.** The form should render the empty state for new users.

### Empty state to add

The prototype does not currently include an empty state. Add this inside `#entriesList` to render when the user has no documents in Firestore:

```html
<div class="empty-state" id="emptyState">
  <div class="empty-state-icon">🌱</div>
  <p>No entries yet. Log something here only when it's affecting your riding — an appointment, an injury, a flare-up that's changing how you ride.</p>
</div>
```

Use the existing `.empty-state` CSS pattern from `riders-toolkit.html` (same classes are already in the prototype's stylesheet — no new CSS needed).

---

## 2. Firestore Data Model

Each health entry is its own document. Do **not** use an array field on the rider document.

**Collection path:**
```
riders/{userId}/health_log/{entryId}
```

This path follows the newer `riders/` convention used by `toolkit`, **not** the older `users/{userId}/horse_health_entries/` convention used by the horse tracker. This is intentional. Do not "standardize" the horse path to match — leave it alone.

**Document fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `title` | string | Yes | Short rider-written title, e.g. "Right SI flare" |
| `date` | string | Yes | ISO date, e.g. `"2026-04-18"`. Defaults to today on form load. |
| `issueType` | string | Yes | One of: `maintenance`, `concern`, `injury` |
| `status` | string | Yes | One of: `ongoing`, `resolved`. Default: `ongoing` |
| `impact` | string | Yes | One of: `minor`, `moderate`, `significant`, `sidelined`. **"None" is intentionally not an option** — if there's no riding impact, the rider should not log it. |
| `notes` | string | No | "What's going on" free-text |
| `bodyAreas` | array of strings | No | From fixed list: Head / Neck, Shoulders, Arms / Elbows / Wrists / Hands, Upper back, Lower back, Core / Abdomen, Hips, Pelvis / SI joint, Glutes, Thighs / Hamstrings, Knees, Calves / Ankles / Feet, Whole body / Systemic |
| `professionals` | array of strings | No | From fixed list: Physician / Doctor, Physical Therapist, Chiropractor, Massage Therapist, Bodyworker, Acupuncturist, Yoga / Pilates Instructor, Personal Trainer, Other |
| `inSaddleNotes` | string | No | "What you're noticing in the saddle" — renamed from clinical "findings" |
| `workingOnNotes` | string | No | "What you're working on" — renamed from clinical "next steps" |
| `resolvedDate` | string \| null | No | Set when user marks resolved. Null otherwise. |
| `createdAt` | Firestore Timestamp | Auto | `serverTimestamp()` on create |
| `updatedAt` | Firestore Timestamp | Auto | `serverTimestamp()` on every write |

**Index needed:** No compound indexes. Entries are queried as a collection and sorted client-side by `date` descending, `createdAt` descending as tiebreaker.

**Validation (client-side, pre-save):**
- `title` required, non-empty after trim
- `issueType` required (one of the three)
- `impact` required (one of the four — validate on submit since it has no default selection)

If validation fails, flash the relevant field's border (2-second `#C0392B` outline) and focus the first invalid field. Do not use `alert()` or `confirm()` — inline feedback only (same pattern as `riders-toolkit.html`).

---

## 3. Firestore Operations

Follow the exact pattern already in `riders-toolkit.html` — same SDK version, same imports, same auth guard structure. No new patterns.

### Load entries on page init
```javascript
// After auth resolves
const q = query(
  collection(db, 'riders', userId, 'health_log'),
  orderBy('date', 'desc'),
  orderBy('createdAt', 'desc')
);
const snapshot = await getDocs(q);
entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
renderEntries();
```

### Save new entry
```javascript
await addDoc(collection(db, 'riders', userId, 'health_log'), {
  ...entryData,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
});
```

### Update existing entry
```javascript
await updateDoc(doc(db, 'riders', userId, 'health_log', entryId), {
  ...entryData,
  updatedAt: serverTimestamp()
});
```

### Mark resolved (quick action)
```javascript
await updateDoc(doc(db, 'riders', userId, 'health_log', entryId), {
  status: 'resolved',
  resolvedDate: new Date().toISOString().split('T')[0],
  updatedAt: serverTimestamp()
});
```

### Delete entry
```javascript
await deleteDoc(doc(db, 'riders', userId, 'health_log', entryId));
```

Wrap every call in try/catch with inline error messaging. Use the same toast-on-success / inline-on-error pattern as Toolkit.

---

## 4. Auth Guard

Wrap page init in `onAuthStateChanged`, exactly as done in `riders-toolkit.html`. Redirect unauthenticated users to the login page. **Do not invent a new pattern.**

---

## 5. Summary Counts

The prototype shows three summary cards at the top: Total, Ongoing, Resolved. Wire these to counts from the loaded `entries` array:

- `#sumTotal` — `entries.length`
- `#sumOngoing` — count where `status === 'ongoing'`
- `#sumResolved` — count where `status === 'resolved'`

Update these counts whenever entries change (add/edit/delete/resolve).

---

## 6. Navigation — Top Nav (`ydj-dashboard-v4.html`)

### ⚠️ Do NOT rename the existing `Health` button.

The existing `Health` button in the Record group currently refers to the Horse Health & Soundness Tracker. Leaving its label as-is preserves every link, test, and muscle-memory path. Rename is out of scope for this brief and would be a separate parity improvement decision for Barb.

### Addition

Add a **`Rider Health`** button in the Record group, inserted **between `Health` and `Toolkit`**.

**Find:**
```html
  <a href="#" class="nav-btn">Health</a>
  <a href="riders-toolkit.html" class="nav-btn">Toolkit</a>
```

**Replace with:**
```html
  <a href="#" class="nav-btn">Health</a>
  <a href="rider-health-log.html" class="nav-btn">Rider Health</a>
  <a href="riders-toolkit.html" class="nav-btn">Toolkit</a>
```

If the Toolkit brief has not yet been implemented and the `Toolkit` line is not present, insert `Rider Health` between `Health` and `Event` instead.

Set `class="nav-btn active"` when the current page is `rider-health-log.html`, matching existing active-state logic.

**Rationale for placement:** Grouping Health → Rider Health keeps horse-body and rider-body data adjacent. Toolkit (interventions) naturally follows (state → interventions → event log).

---

## 7. Dashboard — Your Data Block (`ydj-dashboard-v4.html`)

Add a `Rider Health` card in the **Record** group of the Your Data block, positioned between the existing Horse Health card and the Toolkit card (or adjacent to the existing rider-data cards, matching the same group arrangement as the top nav).

Style and structure should mirror the existing cards in that group — icon, title, description, frequency badge. Suggested card content:

```
Icon: 🩺  (or whatever icon convention is already in use for Record cards)
Title: Rider Health
Description: Track how your body is showing up in the saddle — appointments, injuries, recurring tightness, anything affecting your riding.
Frequency: As needed
Link: rider-health-log.html
```

Do not modify any existing card in that block.

---

## 8. Download My Data Export

Find the export handler in `ydj-dashboard-v4.html` that fires when "Export as CSV" and "Export as JSON" are clicked. Add a Firestore fetch of `riders/{userId}/health_log` to that handler, parallel to Toolkit and other collections.

### File names
- `rider-health-log-YYYY-MM-DD.csv`
- `rider-health-log-YYYY-MM-DD.json`

### CSV column order
```
id, date, title, issueType, status, impact, bodyAreas, professionals, notes, inSaddleNotes, workingOnNotes, resolvedDate, createdAt, updatedAt
```

### Array serialization
- `bodyAreas` → pipe-delimited, e.g. `Hips|Pelvis / SI joint`
- `professionals` → pipe-delimited, e.g. `Physical Therapist|Massage Therapist`

### JSON
Raw documents as-is, with Firestore Timestamps converted to ISO strings (same pattern as Toolkit).

**Do not modify the export behaviour of any existing collection.** Only add the new fetch.

---

## 9. Firestore Security Rules

**Append** the following rule block to the existing ruleset. Do not modify existing rules.

```
match /riders/{userId}/health_log/{entryId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

This follows the same pattern as the `toolkit` subcollection rule. No additional validation rules at launch.

---

## 10. Quick Start Map (`ydj-quickstart-map.html`)

Add **Rider Health** as an optional node following the existing `--opt` pattern. Position it adjacent to the Toolkit node in the visual flow (both are rider-body adjacent; neither is required for core weekly flow).

Label: `Rider Health`
Description: `Log what's affecting your riding`
Link: `rider-health-log.html`

Do not reorganize existing nodes. If unclear where to place it, defer to Barb.

---

## 11. Tips & FAQ (`ydj-tips-and-faq.html`)

### 11a — Add to "Your Forms at a Glance" card grid

Insert a new card in the forms grid (near the `#your-forms` anchor), positioned after the Horse Health & Soundness card and before the Toolkit card:

```html
<a href="rider-health-log.html" class="form-card">
    <div class="card-icon">🩺</div>
    <div class="card-title">Rider Health</div>
    <div class="card-desc">Log dated health events that are affecting your riding — appointments, injuries, recurring tightness. Training journal, not a medical record.</div>
    <span class="card-freq">As needed</span>
</a>
```

### 11b — Add a new FAQ section

Append a new `<div class="section">` **after** the existing Horse Health & Soundness section (`#health-soundness`). Do not modify that existing section.

```
Anchor ID: #rider-health
Heading: 🩺 Rider Health & Wellness Log

Content to include:
- What it is: A place to track dated health events that are currently affecting your riding — PT appointments, a new injury, a flare-up of an old pattern, a chiro visit.
- What it is NOT: A medical record. This is a training journal. Specific medications, dosages, diagnoses with codes, and mental health treatment detail belong in your doctor's chart, not here.
- How it differs from the Physical Self-Assessment: The Self-Assessment captures your baseline — long-standing asymmetries and patterns. The Health Log captures what's changing. If your right hip has been tight for years, that's the Self-Assessment. If it flared last Tuesday, that's the Health Log.
- How it differs from the Toolkit: The Toolkit catalogs things you're trying (pilates sequences, supplements, books). The Health Log captures events and state in your body.
- The three issue types: Maintenance (routine care like monthly massage), Concern (something to monitor over time), Injury (acute event).
- The Impact field: Only log entries that are actively impacting your riding. If it's not affecting your ride, you don't need to track it here.
- The Status field: Ongoing vs. Resolved. Update entries as they heal or stabilize.
- Privacy note (bold tip box): "Keep entries functional and riding-focused. Describe what you feel in the saddle — not the clinical detail of your medical chart."
```

### 11c — Table of Contents

In the `<nav class="toc">` block, add:
```html
<a href="#rider-health">Rider Health & Wellness Log</a>
```
Position it after the Horse Health & Soundness entry (`#health-soundness`).

Do not reorder existing TOC entries.

---

## 12. Journey Event Log — Contextual Callout (Optional)

The Journey Event Log (`journey-event-log.html` and `journey-event-logV2.html`) may already contain a callout directing riders to the Horse Health & Soundness Tracker. Update the existing callout text, or add a parallel one for rider health, whichever preserves the existing styling cleanly.

### If updating an existing callout

**Find the existing callout** (likely mentions "vet visit, soundness issue, or body work appointment") and extend it:

```
💡 Tracking a vet visit or body work for your horse? Use the Horse Health & Soundness Tracker.
💡 Tracking an injury or appointment for yourself? Use the Rider Health & Wellness Log.
```

### If no existing callout yet

Add a single new `.tip-box` / `.info-callout` block below the form intro:

```
💡 Health events have their own trackers:
- Horse Health & Soundness Tracker — vet visits, body work, soundness
- Rider Health & Wellness Log — your own appointments, injuries, flare-ups
```

Do not modify any form fields, event type options, or save logic in the Journey Event Log. This change is text-only.

**If the exact placement or styling is unclear, skip this task** and flag it for a follow-up brief. The form is functional without the callout.

---

## 13. CLAUDE.md

Add one row to the Input Data Model table:

| Form | Frequency | Purpose |
|---|---|---|
| **Rider Health & Wellness Log** | As needed | Rider's own dated health events affecting riding — appointments, injuries, recurring tightness; tracks issue type (maintenance/concern/injury), impact on riding, body areas, professionals, and resolution status |

Add a new bullet under **Important Conventions** (do not modify existing bullets):

> **Rider health records:** When AI outputs reference rider health patterns (future work), draw from the `riders/{userId}/health_log` subcollection. This is separate from `users/{userId}/horse_health_entries` which tracks horse health. Rider entries use `title` as the primary identifier; there is no `name` field parallel to horse's `horseName`.

---

## 14. AI Integration — Phase 2

Full AI integration is in scope for this implementation. Follow the companion document `YDJ_Prompt_Additions_Rider_Health.md` for exact prompt text, integration points, and guardrails.

**Sequencing requirement:** Phase 1 (form) must be complete, regression-tested, and producing real Firestore data before Phase 2 (prompts) begins. Do not interleave.

**Phase 2 high-level summary** (see companion doc for exact text and structure):

- Add rider health as a new data type in the Shared Base Context of `YDJ_AI_Coaching_Voice_Prompts_v3.md` and mirror in `promptBuilder.js`.
- Add the RIDER HEALTH & WELLNESS AWARENESS rules block to Shared Base Context. This block defines status/impact-based recommendation modulation, temporal correlation with training data, language register (mirror rider voice — anthropomorphic, hedged, functional), professional-type-not-name handling, and a hard guardrail against echoing numeric body data.
- Add rider health integration instructions to the Physical Guidance output — this is the primary consumer.
- Add light-touch rider health awareness to the Multi-Voice Coaching shared voice context, with voice-specific guidance for each of the four voices.
- **Strip rider health data from Weekly Coach Brief and Journey Map prompt input at the assembly layer.** This is a deliberate privacy decision. Rider health is rider-private, and coach-sharing consent does not equal medical-info-sharing consent. See companion doc Section 5 for exact filter logic.
- Defer full GPT (Grand Prix Thinking) integration to a follow-up brief. GPT's data blob may include rider health data (ambient context), but explicit prompt direction is not yet added.

**Privacy guardrails that must be preserved:**
- Never echo numeric body data (weight, body fat %, BMR, muscle mass) back to the rider, even when the rider wrote it in their own notes.
- Never reference professionals by first name; use role type only ("your massage therapist").
- Never diagnose, prescribe, or recommend specific medical treatments.
- Never include rider health data in any output formatted for shared audiences.

**Testing additions for Phase 2** are in Section 8 of the companion doc. Run those tests after Phase 2 implementation, in addition to regression-running the Phase 1 tests to confirm the form still behaves correctly.

---

## 15. Legal / Privacy Note (Tracked for Separate Follow-Up)

The Privacy Policy and ToS drafts do not yet address rider health data as a distinct category. This is tracked in Barb's separate legal review queue and is **out of scope for this brief**. Do not modify policy documents as part of this work.

---

## 16. Testing Checklist

### Smoke tests (must pass before commit)
- [ ] Form loads without console errors when authenticated
- [ ] Form redirects to login when unauthenticated
- [ ] New entry saves to Firestore at `riders/{userId}/health_log/{entryId}`
- [ ] Required validation fires when `title`, `issueType`, or `impact` missing
- [ ] Entries load and render from Firestore on page open
- [ ] Edit pre-populates all fields correctly
- [ ] Mark Resolved updates both `status` and `resolvedDate` in Firestore
- [ ] Delete removes Firestore document
- [ ] Summary counts (total, ongoing, resolved) update correctly after each CRUD action
- [ ] Filter chips (all, ongoing, resolved, maintenance, concern, injury) work correctly
- [ ] Empty state renders when no entries exist
- [ ] Form uses inline error messages only — no `alert()` or `confirm()`
- [ ] Mobile responsive (primary target: iOS Safari)

### Regression tests — Phase 1 (must pass before Phase 2 begins)
- [ ] `riders-toolkit.html` still loads, saves, and exports correctly
- [ ] `horse-health-soundness-tracker.html` still loads, saves, and exports correctly
- [ ] The existing `Health` nav button still links to horse tracker (label and behaviour unchanged)
- [ ] All existing dashboard cards in the Your Data block render unchanged
- [ ] Download My Data for all other collections still produces correct files with correct column orders
- [ ] All existing FAQ sections render unchanged and TOC links still work
- [ ] Journey Event Log form fields, event type options, and save logic unchanged
- [ ] Firestore security rules for all other collections unchanged (run a quick diff)
- [ ] **Phase 1 only:** `promptBuilder.js` is byte-identical to pre-change state. Phase 2 modifies this file — only confirm unchanged at the end of Phase 1.

### Regression tests — Phase 2 (must pass after prompt integration)
- [ ] All Phase 1 form behavior still works after `promptBuilder.js` changes
- [ ] Existing AI outputs (Multi-Voice, Physical Guidance, Weekly Coach Brief, Journey Map, GPT) still generate successfully against test rider profiles with no rider health entries
- [ ] Weekly Coach Brief generated against a rider with active rider health entries contains NO rider health references — not in any section, not in any voice, not in any subheading
- [ ] Journey Map generated against a rider with active rider health entries contains NO rider health references
- [ ] No regression in existing horse health integration (horse health entries still surface correctly in relevant outputs)
- [ ] Token usage per Physical Guidance generation has not materially increased for riders with empty health logs
- [ ] All prompt behavior verification tests in companion doc Section 8 pass

### Data-integrity tests
- [ ] CSV export: `bodyAreas` and `professionals` pipe-delimited correctly
- [ ] CSV export: columns in specified order
- [ ] JSON export: Timestamps converted to ISO strings
- [ ] Resolved entry: `resolvedDate` is set and `status` is `resolved`
- [ ] Re-opening a resolved entry and toggling back to ongoing clears nothing else unexpectedly

### Privacy / scope framing tests
- [ ] Both scope-note blocks at top of form render correctly
- [ ] "What not to log" callout is visible and styled per prototype
- [ ] Field labels are **"What you're noticing in the saddle"** and **"What you're working on"** — NOT "Findings" and "Next steps"
- [ ] Impact group does not contain "None"
- [ ] Type group contains exactly three chips: Maintenance, Concern, Injury (no Illness)
- [ ] Professionals list does not contain "Sport Psychologist"

---

## 17. Implementation Checklist (Developer TODO)

### New form
- [ ] Wire `rider-health-log.html` to Firebase Auth (auth guard, redirect if unauthenticated)
- [ ] Remove the three seeded example entries from `#entriesList`
- [ ] Add empty state with `id="emptyState"` using existing `.empty-state` CSS
- [ ] Implement `addDoc` on save (new entry)
- [ ] Implement `updateDoc` on edit (existing entry)
- [ ] Implement `updateDoc` on Mark Resolved (set `status` and `resolvedDate`)
- [ ] Implement `deleteDoc` on remove
- [ ] Use `serverTimestamp()` for `createdAt` and `updatedAt`
- [ ] Add required-field validation (title, issueType, impact) with inline border-flash feedback
- [ ] Try/catch with inline error handling — no `alert()`/`confirm()`
- [ ] Wire summary counts to live entry data
- [ ] Wire filter chips

### Integration points
- [ ] Add Firestore security rule for `/riders/{userId}/health_log/{entryId}`
- [ ] Add **Rider Health** nav item to Record group in `ydj-dashboard-v4.html` — between Health and Toolkit
- [ ] Add Rider Health card to Record group in Your Data block on dashboard
- [ ] Add Rider Health fetch to "Download My Data" export handler
- [ ] Export as `rider-health-log-YYYY-MM-DD.csv` (bodyAreas, professionals pipe-delimited) and `.json`
- [ ] Add Rider Health as optional node in `ydj-quickstart-map.html` (follow `--opt` pattern)
- [ ] Add Rider Health FAQ section `#rider-health` in `ydj-tips-and-faq.html`
- [ ] Add card to forms-at-a-glance grid
- [ ] Add TOC entry for `#rider-health`
- [ ] Update Journey Event Log contextual callout (if exists) to reference both trackers
- [ ] Add Rider Health row to CLAUDE.md Input Data Model table
- [ ] Add CLAUDE.md convention note for rider health records

### Verify Phase 1 before starting Phase 2
- [ ] Run full Phase 1 regression checklist
- [ ] Diff all modified files — no unintended changes
- [ ] `promptBuilder.js` byte-identical to pre-change state (until Phase 2 begins)
- [ ] Toolkit and Horse Health both still function
- [ ] At least one real rider health entry saved and round-tripped correctly

### Phase 2 — Prompt integration (per companion doc)
- [ ] Add rider health fetch to `promptBuilder.js` data assembly
- [ ] Add full-vs-shared data blob split logic (strip `riderHealthEntries` for Coach Brief and Journey Map paths)
- [ ] Add new data type bullet to Shared Base Context in `YDJ_AI_Coaching_Voice_Prompts_v3.md` and mirror in `promptBuilder.js`
- [ ] Add RIDER HEALTH & WELLNESS AWARENESS block to Shared Base Context, MD and JS
- [ ] Add RIDER HEALTH LOG INTEGRATION block to Physical Guidance prompt, MD and JS
- [ ] Add rider health voice-specific handling to Multi-Voice shared voice context, MD and JS
- [ ] Update `YDJ_Complete_AI_Prompt_Reference.md` data types and awareness rules
- [ ] Do NOT modify GPT or Journey Map prompt instructions (full integration deferred)
- [ ] Run Phase 2 regression checklist
- [ ] Run prompt behavior verification tests (companion doc Section 8)

---

## Summary

Two-phase implementation. Phase 1 is one new form, one new Firestore subcollection, and surgical additions to dashboard nav / Your Data / export / FAQ / CLAUDE.md — zero AI or prompt changes. Phase 2 applies prompt additions per the companion document, with deliberate privacy strips for Weekly Coach Brief and Journey Map.

Stop and flag if any task appears to require edits outside the files listed in the Regression Safety table at top.

**Companion document:** `YDJ_Prompt_Additions_Rider_Health.md` — contains all prompt text, integration points, guardrails, and verification tests for Phase 2.
