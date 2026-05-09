# YDJ — Habit Loop Implementation Brief
# Micro-Debrief, Fresh Start, and Multi-Voice Coaching Précis

**Version:** 1.0
**Date:** May 2026
**Status:** Ready for Claude Code implementation
**Build target:** Pre-launch, post-pilot. Land before NDPC booth (July 2-5, 2026).

---

## Reference documents (read these first)

This brief is the Claude Code-ready packaging of three specs that must be read in full before implementation begins:

1. **`YDJ_MicroDebrief_EmpatheticResponse_PromptSpec.md` (v1.0)** — defines the Empathetic Coach response prompt for micro-debrief submissions.
2. **`YDJ_FreshStart_EmpatheticResponse_PromptSpec_v1_1.md`** — defines the Empathetic Coach response prompt for Fresh Start submissions, including how Fresh Start data feeds forward into other AI outputs.
3. **`YDJ_MultiVoicePrecis_Spec.md` (v1.0)** — defines the ≤200-word précis added to Multi-Voice Coaching, which is the cached coaching context both above prompts depend on.

This brief assumes those specs are authoritative for prompt content, response architecture, and AI behavior. It covers everything else: data layer, forms, UI integration, build order, and tests.

**Working prototypes for visual reference:**
- `micro-debrief-prototype-v3.html` — definitive source for micro-debrief form design and interaction
- `fresh-start-debrief-prototype-v3.html` — definitive source for Fresh Start form design and interaction

These prototypes' simulated responses are NOT the source of truth — the prompt specs are. But the form structure, field layouts, design tokens, and interaction patterns in the prototypes ARE the source of truth for the UI build.

---

## Why this work exists

A pilot user reported feeling guilty about not using the app, anxious about catching up, and worried about the time investment to re-engage. This is the exact failure mode that drove churn in adjacent products like WHOOP — when a reflection or tracking app makes the rider feel surveilled or behind, they quit.

YDJ's positioning explicitly says it sustains riders for the long haul. The rider who uses YDJ for ten years, with quiet weeks and busy weeks, is the success case. The rider who burns out at month four because they felt guilty for missing rides is a failure case. Designing for the rider who returns after a three-week vacation is the right design center.

This brief delivers two new entry surfaces — micro-debrief and Fresh Start — that together implement a habit loop (trigger → action → reward) explicitly designed to onboard, sustain, and re-engage riders without producing guilt. The architectural underpinning that makes both feel intelligent rather than perfunctory is the Multi-Voice Coaching précis, which gives the AI compressed rider context for state-aware responses.

The three pieces ship together. They are interdependent enough that incremental delivery doesn't make sense; cohesive enough that one brief is the right packaging.

---

## What ships in this brief

| Artifact | Type | Purpose |
|---|---|---|
| Multi-Voice Coaching précis | Cloud Function update | Adds ≤200-word précis field to existing Multi-Voice output. Precursor to everything else. |
| `microDebriefs` Firestore collection | Data layer | New collection for micro-debrief entries (NOT shared with debriefs collection). |
| `freshStarts` Firestore collection | Data layer | New collection for Fresh Start entries. |
| Micro-debrief form | New page | Lightweight 4-field + 1-optional debrief alternative. |
| Fresh Start form | New page | 5-field re-onboarding form with State A / State B branching. |
| Micro-debrief Empathetic Coach Cloud Function | New AI surface | Generates per-action reward response after micro-debrief submission. |
| Fresh Start Empathetic Coach Cloud Function | New AI surface | Generates re-onboarding response after Fresh Start submission. |
| Dashboard surface — micro-debrief CTA | UI integration | Discovery path for micro-debrief from the main dashboard. |
| Dashboard surface — Fresh Start prompt | UI integration | Soft offer to riders who have been inactive. |
| FAQ updates | Content | Adds the new entries to the existing Outputs Tips & FAQ surface. |

What does NOT ship in this brief:
- **Smart reminder system** (per-rider notification logic) — separate brief, follow-on work.
- **Re-engagement email content** ("we're here when you're ready") — separate brief.
- **Downstream prompt addendums** for Multi-Voice, Journey Map, GPT, etc. — see "Downstream Coordination" section below.

---

## Build order

The pieces ship in dependency order. Each phase is independently testable and shippable to staging; the user-facing rollout happens at Phase 5.

**Phase 1 — Multi-Voice Coaching précis (precursor change).**
Update the Multi-Voice Cloud Function. Backfill happens organically as riders' Multi-Voice generations re-run on cadence. Land first because both Empathetic Coach response Cloud Functions read from this field.

**Phase 2 — New Firestore collections and security rules.**
Create `microDebriefs` and `freshStarts` collections under each user. Add security rules. Add backups to existing backup pipeline.

**Phase 3 — Cloud Functions for the two Empathetic Coach responses.**
Implement the two new functions per the prompt specs. Each function reads the micro/Fresh Start submission, reads the relevant rider context (First Light, Multi-Voice précis, Journey Map trajectory), runs the Sonnet call, writes the response to the submission document. Functions are triggered on Firestore document creation.

**Phase 4 — Forms.**
Implement micro-debrief and Fresh Start forms in React per the prototype designs. Wire form submission to write to the new collections. Display Empathetic Coach response from the document once written.

**Phase 5 — Dashboard surfaces and FAQ.**
Add the discovery paths from the dashboard. Add the FAQ entries. This is the user-facing flip.

Each phase has its own checklist in Part 6.

---

## Part 1 — Multi-Voice Coaching précis (Phase 1)

Per `YDJ_MultiVoicePrecis_Spec.md`. This phase has no UI surface; it's a Cloud Function and schema change only.

### 1.1 Cloud Function update

Locate the existing Multi-Voice Coaching Cloud Function. After the four voice analysis calls complete and before the final document is written to Firestore, add a fifth call: the précis generation.

Use the prompt specified in the précis spec, Section "Précis generation prompt." Pass the four voice JSONs as input. Capture the string output.

Run on Sonnet (not Opus). The précis spec calls this out explicitly — it's a summarization task, not analysis, and Sonnet handles it at much lower cost.

### 1.2 Document schema

Add two new fields to the Multi-Voice Coaching document (existing path: `users/{uid}/analysis/coachingVoices/{generationId}` per the technical plan, OR `analysis/multiVoiceCoaching/{userId}` per other documents — confirm the actual current path before implementing):

```
{
  // ... existing fields unchanged ...

  precis: string,                    // ≤200 words, plain prose
  precisGeneratedAt: timestamp       // matches generatedAt, included for clarity
}
```

### 1.3 Failure handling

If précis generation fails (API error, rate limit, Sonnet timeout), the Multi-Voice generation should **still succeed** and write to Firestore with the précis field absent or null. The full output is the more important artifact; the précis is supporting infrastructure. Better to have the full output without the précis than to fail both.

Log précis generation failures separately. A persistent failure rate above 1-2% indicates a prompt or input problem worth investigating.

### 1.4 No migration

Riders whose Multi-Voice document predates this change will not have a précis field. They backfill naturally as their Multi-Voice regenerates per the standard cadence. No migration job is needed. Consumers (Phase 3) handle missing précis as "no cached coaching context."

### 1.5 Pilot validation before proceeding to Phase 2

After deploying the Cloud Function update, force-regenerate Multi-Voice for 3-5 pilot riders with varied data profiles (sparse, rich, plateau, ascending, in-difficulty). Inspect the resulting précis against the quality benchmarks in the précis spec:

- Faithfulness — every observation traces to source analyses
- Compression quality — conveys enough for downstream context
- Voice neutrality — doesn't sound like any of the four voices
- Hedging preservation — matches the source's hedging level
- Word count — under 200, target 150-180

If quality is acceptable, proceed to Phase 2. If quality issues surface, iterate on the précis prompt before proceeding. The micro-debrief and Fresh Start responses will only be as good as the précis they read; Phase 1 is the gate.

---

## Part 2 — Firestore collections and schemas (Phase 2)

Two new collections, each scoped under the user document. Both collections sit at the same level as `debriefs`, `reflections`, and similar — they are NOT subcollections of those.

### 2.1 microDebriefs collection

```
users/{userId}/microDebriefs/{entryId}: {
  // Core fields (form inputs)
  date: string (ISO date),                    // ride date
  horseId: string (ref),                      // horse the rider was on
  horseName: string,                          // denormalized for read efficiency
  quality: number (1-10),                     // overall ride quality
  mentalState: string (enum),                 // chip value — see enum below
  momentText: string,                         // optional, may be empty

  // System fields
  submittedAt: timestamp,
  riderState: string,                         // computed at submit-time:
                                              //   "new_no_first_light"
                                              //   "new_with_first_light"
                                              //   "established"
  cacheAgeAtSubmission: number | null,        // days; null if no cache
  cacheBandAtSubmission: string | null,       // "fresh" | "aging" | "stale" | null

  // AI response (populated by Cloud Function after submit)
  empatheticResponse: string,                 // the response text shown to rider
  empatheticResponseGeneratedAt: timestamp,

  // Backwards-compat / future
  voiceUsed: string                           // always "empathetic" for v1; field
                                              //   reserved for possible future use
}
```

**Mental state enum (matches existing debrief mentalState options):**
```
calm, focused, frustrated, uncertain, joyful, anxious, scattered, mixed
```
Source: `YDJ_PostRideDebrief_Form_Changes.md`. Confirm against the actual current debrief schema before locking — if the debrief uses different values, the micro should match for downstream-prompt compatibility.

### 2.2 freshStarts collection

```
users/{userId}/freshStarts/{entryId}: {
  // Core fields
  submittedAt: timestamp,
  state: string,                              // "A" | "B"
  confidence: number (1-10),
  confidenceExplanation: string,              // optional

  // State B fields (may be empty in State A)
  workingOn: string,                          // optional
  goingWell: string,                          // optional
  difficult: string,                          // optional

  // Always-visible field
  anythingElse: string,                       // optional

  // System fields
  cacheAgeAtSubmission: number | null,
  cacheBandAtSubmission: string | null,

  // AI response
  empatheticResponse: string,                 // multi-paragraph HTML or plain text
                                              //   (Fresh Start response is longer
                                              //   than micro and may have multiple
                                              //   paragraphs)
  empatheticResponseGeneratedAt: timestamp
}
```

### 2.3 Security rules

Both collections are user-scoped, same pattern as `debriefs` and `reflections`:

```
match /users/{userId}/microDebriefs/{entryId} {
  allow read: if request.auth != null && request.auth.uid == userId;
  allow create: if request.auth != null && request.auth.uid == userId;
  allow update: if request.auth != null && request.auth.uid == userId;
  allow delete: if request.auth != null && request.auth.uid == userId;
}

match /users/{userId}/freshStarts/{entryId} {
  // identical pattern
}
```

The `empatheticResponse` field is written by the Cloud Function, not by the client. Cloud Function writes use admin SDK and bypass these rules — but the rules above are still correct for client read access.

### 2.4 Indexes

For both collections, create a composite index on `submittedAt DESC` (descending) at minimum. The frontend will sort by recency in any list view; downstream prompts will query for "most recent N entries." Other indexes may be needed as queries are written; add as required.

### 2.5 Backups

Add both new collections to the existing Firestore backup pipeline. No special handling required — they follow the same pattern as `debriefs` and `reflections`.

---

## Part 3 — Empathetic Coach response Cloud Functions (Phase 3)

Two new Cloud Functions, one per submission type. Both follow the same architectural pattern: triggered on document creation, read context, call Sonnet, write response back.

### 3.1 Function: `onMicroDebriefSubmit`

**Trigger:** Firestore document creation in `users/{userId}/microDebriefs/{entryId}`.

**Steps:**

1. Read the just-created micro-debrief document.
2. Determine `riderState` for this rider:
   - Query `users/{userId}/reflections` — if fewer than 6 OR no First Light document exists, state = `new_no_first_light`.
   - If First Light exists but rider has fewer than 5 debriefs, state = `new_with_first_light`.
   - Otherwise state = `established`.
3. Determine cache freshness:
   - Query `users/{userId}/analysis/multiVoiceCoaching/{*}` for the most recent document.
   - If exists, compute `cacheAgeAtSubmission` (days since `generatedAt`) and `cacheBandAtSubmission` (fresh ≤14, aging 15-30, stale 31+).
   - If absent, both are null.
4. Read context for the prompt:
   - For State 1: nothing additional.
   - For State 2: First Light themes (3-5) and identified intentions (1-3).
   - For State 3: Multi-Voice précis, Journey Map trajectory direction, current focus statement.
5. Assemble the prompt per `YDJ_MicroDebrief_EmpatheticResponse_PromptSpec.md` Section "Skeleton Prompt." Substitute all bracketed values with the actual data.
6. Call Sonnet with the assembled prompt.
7. Update the just-created micro-debrief document with the response:
   - `empatheticResponse: <text>`
   - `empatheticResponseGeneratedAt: <now>`
   - Also write back the computed `riderState`, `cacheAgeAtSubmission`, `cacheBandAtSubmission` for analytics.

**Token budget:** ~300 input tokens (state flag + micro data + précis + trajectory) + ~80 output tokens. ~$0.002 per call on Sonnet.

**Error handling:**
- If Sonnet call fails, write a fallback response to the document so the rider sees something:
  ```
  empatheticResponse: "Captured. Thanks for logging this one — we'll take it from here."
  empatheticResponseGeneratedAt: <now>
  empatheticResponseError: <error details>
  ```
  Log the error. Don't fail the document write.
- If précis is missing for an established rider, fall back to State 2 behavior (use First Light themes if available, otherwise State 1 behavior).

### 3.2 Function: `onFreshStartSubmit`

**Trigger:** Firestore document creation in `users/{userId}/freshStarts/{entryId}`.

**Steps:**

1. Read the just-created Fresh Start document.
2. State is already on the document (`state: "A"` or `"B"`) — set by the form.
3. Determine cache freshness same as micro-debrief.
4. Read context for the prompt:
   - All five Fresh Start fields from the document.
   - If cache exists: Multi-Voice précis, Journey Map trajectory, current focus statement.
5. Assemble the prompt per `YDJ_FreshStart_EmpatheticResponse_PromptSpec_v1_1.md` Section "Skeleton Prompt."
6. Call Sonnet with the assembled prompt.
7. Update the document with the response.

**Token budget:** ~400 input tokens + ~150 output tokens. ~$0.005 per call on Sonnet.

**Error handling:** same pattern as micro. Fallback response:
```
empatheticResponse: "Welcome back. The dataset picks up from your next entry. No catch-up required."
```

### 3.3 Both functions: latency considerations

The rider experiences the AI response as the reward for completing the form. From the rider's POV: tap submit → response appears. If the function takes more than ~3 seconds to write the response, the rider sees an awkward "loading" state.

**Frontend behavior (Part 4 details this):** show a brief loading state (~1-3 seconds expected, max 8 seconds) while waiting for the response document to update with `empatheticResponse`. If response doesn't arrive in 8 seconds, show the fallback response inline. Don't block the rider on a hung function.

**Function performance target:** p50 under 2 seconds, p95 under 5 seconds. Sonnet itself can vary; this is the budget for everything around the model call.

### 3.4 Voice context inclusion

Per both prompt specs: every prompt run must include the Empathetic Coach voice block from `YDJ_AI_Coaching_Voice_Prompts_v3.md` and the PROPER NAMES REFERENCE from `promptBuilder.js` lines 101-112 (Jane Savoie is the Empathetic Coach lineage).

These should be loaded at function cold-start and cached, not loaded per-call. The voice definitions don't change per submission.

---

## Part 4 — Forms (Phase 4)

Two new React pages, designed per the v3 prototypes. The prototypes are the source of truth for form structure, design tokens, fields, and interaction.

### 4.1 Micro-debrief form (`/forms/micro-debrief`)

**Reference:** `micro-debrief-prototype-v3.html`.

**Required:** date, horse selector (dropdown of rider's horses from `users/{uid}/horses`), quality (1-10 buttons, no default), mental state (chip selection).

**Optional:** moment text (textarea + voice input button).

**Interaction:**
- Quality buttons: tap selects, only one can be selected, no default.
- Mental state chips: tap selects, only one can be selected, no default.
- Voice input on the moment field uses whatever voice transcription path the existing debrief form uses. (If no voice path exists yet, render the button as a placeholder that links to the future enhancement; this is acceptable for v1.)

**On submit:**
1. Validate required fields client-side.
2. Write document to `users/{uid}/microDebriefs`. The Cloud Function picks it up.
3. Show loading state ("Capturing your reflection...").
4. Listen on the document for `empatheticResponse` field to populate (Firestore real-time listener).
5. When populated (or after 8s timeout with fallback), display the response card below the form.
6. Show "Try different inputs" / "Back to dashboard" actions.

**The form stays visible after submit.** The response card appears below it. (This is per the v3 prototype — distinct from the v2 behavior where the form was hidden.)

**Routing:** `/forms/micro-debrief`. From the dashboard CTA. Direct linking is fine — the form has no special prerequisite.

### 4.2 Fresh Start form (`/forms/fresh-start`)

**Reference:** `fresh-start-debrief-prototype-v3.html`.

**Required:** confidence (1-10 buttons, no default), riding-toggle (Yes/No, no default).

**State A** (rider tapped "No"): only fields 1 and 5 are visible. Fields 2, 3, 4 hidden.

**State B** (rider tapped "Yes"): all fields visible.

**Optional fields (all of fields 2-5):** plain textareas, no rotating prompt chips. The prototype removed those — see `YDJ_FreshStart_EmpatheticResponse_PromptSpec_v1_1.md` v1.1 changelog. The Fresh Start spec also explicitly notes this: clean field labels and brief helpers only, no exposure of internal reflection-category mapping.

**On submit:**
1. Validate required fields client-side.
2. Write document to `users/{uid}/freshStarts`, including the `state` field set by the toggle.
3. Loading state ("Settling in...").
4. Listen for `empatheticResponse` to populate (longer timeout — 12s — since Fresh Start prompts are longer to generate).
5. Display response below form. Show "Try different inputs" / "Log today's ride →" / "Back to dashboard."

The "Log today's ride →" CTA links to `/forms/micro-debrief` (per the spec's invitation forward, which surfaces the micro as the on-ramp for first-ride-back).

**Routing:** `/forms/fresh-start`.

### 4.3 Design tokens — must use canonical values

Both forms use:
- Empathetic Coach color: `#C67B5C` (canonical from `aiService.js` VOICE_META)
- Existing parchment palette (matches existing debrief form CSS)
- Playfair Display + Work Sans fonts
- The card-style frame and field-group separator pattern from the existing debrief form

The prototypes embed these correctly; copy directly from the prototype CSS rather than reinventing.

### 4.4 Mobile-first

Both forms are designed mobile-first per the prototypes. The button rows for quality (1-10) collapse to a 5-column grid below 540px. The riding-toggle stays as a stacked option set. Test all forms at 375px width — the barn use case is real.

### 4.5 No HTML5 `required` attributes; JS validation only

Per the v3 prototype lessons. HTML5 native validation can interact weirdly with custom submit handlers. JS-side validation with friendly alert messages is the pattern.

### 4.6 Voice input

Both forms include voice input buttons on textareas. Use the existing voice transcription path (whatever the lesson notes feature uses). If no path exists yet for these specific forms, render the button as a future placeholder; acceptable for v1.

---

## Part 5 — Dashboard surfaces and FAQ (Phase 5)

User-facing rollout. The Cloud Functions and forms exist by this phase; this is the discovery path.

### 5.1 Dashboard — micro-debrief CTA

The micro-debrief should be reachable from the main dashboard, near (but distinct from) the existing post-ride debrief CTA. Suggested copy:

> **Quick capture** — When you don't have time for the full debrief. *(60 seconds)*

Route to `/forms/micro-debrief`.

Placement: below or alongside the existing "Submit a debrief" call-to-action. Don't make the micro the *primary* path — the full debrief remains primary. The micro is a fallback.

### 5.2 Dashboard — Fresh Start prompt (conditional)

The Fresh Start surface appears on the dashboard only when triggered. Trigger logic:

- Rider has not submitted a debrief OR a micro-debrief in the last **14 days**, AND
- Rider has at least one prior debrief (i.e., not a brand-new rider — for those, the Quick Start Map handles onboarding).

When the trigger fires, display a soft prompt at the top of the dashboard, above the Patterns block:

> **Welcome back.** *Have a few minutes to settle in? A Fresh Start helps the AI catch up to where you are now — no catch-up logging required.* **[Take the Fresh Start →]**

**Dismissal:** the rider can dismiss the prompt; it doesn't reappear in the same session. It WILL reappear in the next session if the trigger conditions still hold. Track dismissal in user preferences.

**Once Fresh Start is completed:** the prompt no longer appears (regardless of subsequent inactivity). A second Fresh Start would only be offered after another meaningful gap from the platform — track via `lastFreshStartAt` on the user document.

### 5.3 FAQ updates

Update `ydj-outputs-tips-and-faq.html` (and the React equivalent if the FAQ has been migrated) with two new entries.

**New FAQ entry — "What's the micro-debrief?"**
> *The micro-debrief is for moments when you don't have time for the full post-ride debrief — at the trailer, between work calls, after a quick hack. It captures the headline of the ride in about 90 seconds.*
>
> *Both micro and full debriefs go into your dataset. The difference: the deeper coaching analysis (Multi-Voice Coaching, pattern recognition, Grand Prix Thinking, Physical Guidance) runs on your full debriefs. The micro gets a brief acknowledgment from the Empathetic Coach — not a full coaching response.*
>
> *The micro is a real entry, not a lesser one. But if a ride genuinely wants unpacking — a breakthrough, a hard day, a confusing session — the full debrief is the tool that earns its keep.*

**New FAQ entry — "What's the Fresh Start?"**
> *The Fresh Start is for moments when you've been away from the platform — whether life got busy, you took a vacation, or you've been riding without logging. It's the on-ramp back, designed to take five minutes and help you feel met without making you reconstruct everything you missed.*
>
> *You'll get a single response from the Empathetic Coach — not a full coaching report. The deeper analysis comes back online once you start logging rides again, full or micro.*
>
> *There's no "catching up" to do. The dataset picks up from your next entry.*

These entries are pulled directly from the prompt specs' "Tooltip and FAQ Supporting Copy" sections. They are the canonical user-facing copy.

### 5.4 Quick Start Map and Outputs Tips coordination

The Quick Start Map (existing) shows the rider's progression toward unlocking outputs. The micro-debrief is a *new entry type* that rides alongside the existing debrief. The Quick Start Map should:

- Continue to count progression based on **full debriefs only**. Micros do NOT count toward the 5-debrief unlock threshold for Multi-Voice Coaching.
- Display a small footnote or tooltip explaining why: micros are real entries but not weighted the same for unlock thresholds.

This is consistent with the prompt spec architecture (micros are signal but not substitute for full debriefs). It's also fair: a rider who only does micros won't unlock coaching outputs as quickly, which is the right incentive.

---

## Part 6 — Implementation Checklist

### Phase 1 — Multi-Voice Coaching précis

- [ ] Identify the existing Multi-Voice Coaching Cloud Function file
- [ ] Confirm the Firestore document path (`users/{uid}/analysis/coachingVoices/{generationId}` vs `analysis/multiVoiceCoaching/{userId}` — sources differ)
- [ ] Add fifth call to the Cloud Function: précis generation per spec
- [ ] Use Sonnet, not Opus, for the précis call
- [ ] Pass the four voice JSONs as input
- [ ] Cap output at 200 words; aim for 150-180
- [ ] Add `precis` and `precisGeneratedAt` fields to the document schema
- [ ] Wrap précis generation in try/catch — if it fails, write the document without the précis, log the failure, don't fail the full output
- [ ] Force-regenerate Multi-Voice for 3-5 pilot riders with varied data profiles
- [ ] Inspect each précis against quality benchmarks: faithfulness, compression, voice neutrality, hedging preservation, word count
- [ ] If quality is acceptable, proceed to Phase 2; if not, iterate on the précis prompt and re-test

### Phase 2 — Firestore collections and security rules

- [ ] Define `users/{uid}/microDebriefs/{entryId}` collection schema
- [ ] Define `users/{uid}/freshStarts/{entryId}` collection schema
- [ ] Confirm `mentalState` enum values match the existing debrief form
- [ ] Add security rules for both collections (user-scoped read/create/update/delete)
- [ ] Create composite indexes on `submittedAt DESC` for both collections
- [ ] Add both collections to the existing Firestore backup pipeline
- [ ] Test: a write to either collection from a different user's auth context fails as expected

### Phase 3 — Cloud Functions

- [ ] Create `onMicroDebriefSubmit` Firestore-triggered Cloud Function
- [ ] Implement rider-state detection (new_no_first_light / new_with_first_light / established)
- [ ] Implement cache-freshness detection (fresh / aging / stale / null)
- [ ] Load Empathetic Coach voice block + PROPER NAMES REFERENCE at function cold-start
- [ ] Assemble prompt per `YDJ_MicroDebrief_EmpatheticResponse_PromptSpec.md` skeleton
- [ ] Call Sonnet, capture output
- [ ] Write `empatheticResponse`, `empatheticResponseGeneratedAt`, computed state fields back to the document
- [ ] Implement fallback response on Sonnet error (don't block the document write)
- [ ] Performance test: p50 under 2s, p95 under 5s
- [ ] Repeat all of the above for `onFreshStartSubmit` per `YDJ_FreshStart_EmpatheticResponse_PromptSpec_v1_1.md`
- [ ] Token budget tracking: separate cost line for both functions in the cost monitoring dashboard

### Phase 4 — Forms

- [ ] Build `/forms/micro-debrief` React page per prototype `micro-debrief-prototype-v3.html`
  - [ ] Date input (default today)
  - [ ] Horse dropdown (from rider's horses)
  - [ ] Quality 1-10 button row (no default selected)
  - [ ] Mental state chip row (8 chips, no default selected)
  - [ ] Moment textarea + voice input button
  - [ ] Form-level `action="javascript:void(0);"` and `onsubmit="return false;"` (defensive)
  - [ ] JS-only validation with friendly alert messages
  - [ ] Submit writes to `users/{uid}/microDebriefs`
  - [ ] Real-time listener on the new document for `empatheticResponse`
  - [ ] Loading state shown while waiting for response
  - [ ] 8-second timeout fallback to canned response
  - [ ] Form stays visible after submit; response card appears below
  - [ ] "Try different inputs" / "Back to dashboard" actions
  - [ ] Mobile responsive at 375px
- [ ] Build `/forms/fresh-start` React page per prototype `fresh-start-debrief-prototype-v3.html`
  - [ ] Confidence 1-10 button row (no default)
  - [ ] Confidence-explanation textarea (optional)
  - [ ] Riding toggle (Yes/No, no default)
  - [ ] Fields 2, 3, 4 hidden in State A; visible in State B
  - [ ] Field 5 always visible
  - [ ] No prompt-rotation chips (per spec v1.1)
  - [ ] Field helpers do NOT reference internal reflection categories
  - [ ] Submit writes to `users/{uid}/freshStarts` with `state` field
  - [ ] Real-time listener on the new document for `empatheticResponse`
  - [ ] 12-second timeout fallback to canned response
  - [ ] "Try different inputs" / "Log today's ride →" (links to micro-debrief) / "Back to dashboard"
  - [ ] Mobile responsive at 375px

### Phase 5 — Dashboard surfaces and FAQ

- [ ] Add micro-debrief CTA to dashboard (near full-debrief CTA, secondary placement)
- [ ] Implement Fresh Start trigger logic: 14+ days since last debrief OR micro, AND has prior debrief
- [ ] Display soft Fresh Start prompt at top of dashboard when trigger fires
- [ ] Track session-level dismissal in user preferences
- [ ] Track `lastFreshStartAt` on the user document; suppress prompt for some period after completion
- [ ] Add "What's the micro-debrief?" FAQ entry
- [ ] Add "What's the Fresh Start?" FAQ entry
- [ ] Update Quick Start Map to NOT count micros toward the 5-debrief unlock threshold
- [ ] Add tooltip/footnote explaining why micros don't count toward unlock

### Verification

- [ ] End-to-end test: new rider, no First Light, submits micro → receives generic-encouragement Empathetic response
- [ ] End-to-end test: rider with First Light, no Multi-Voice, submits micro → response anchors to First Light themes
- [ ] End-to-end test: established rider, fresh cache, submits unremarkable micro → light continuity response
- [ ] End-to-end test: established rider, fresh cache, submits contradictory micro → hedged divergence response
- [ ] End-to-end test: established rider, stale cache (>30 days), submits micro → cache-age-aware response
- [ ] End-to-end test: rider in State A submits Fresh Start with confidence 3 + ascending pre-gap → "returning at lower confidence" response
- [ ] End-to-end test: rider in State B submits Fresh Start with rich content across all fields → synthesizing observation
- [ ] End-to-end test: rider in State B submits Fresh Start with thin content → "not enough to synthesize" fallback
- [ ] Cloud Function failure test: trigger Sonnet timeout, confirm fallback response is written
- [ ] Cost test: verify token budget for 100 micros + 20 Fresh Starts is within projection (~$1)

### Regression checks

- [ ] Existing Multi-Voice Coaching outputs continue to generate correctly
- [ ] Existing Weekly Focus excerpt continues to populate (Multi-Voice CF still produces `weeklyFocusExcerpt`)
- [ ] Existing debrief form unchanged
- [ ] Existing reflection form unchanged
- [ ] Quick Start Map unchanged except for the micro-debrief footnote
- [ ] Existing Outputs Tips & FAQ entries unchanged except for the two new entries
- [ ] No new data leakage: micros and Fresh Starts visible only to the rider who submitted them

---

## Part 7 — Downstream Coordination

This brief delivers two new entry surfaces. Existing AI outputs (Multi-Voice Coaching, Journey Map, Grand Prix Thinking, Physical Guidance, etc.) need to know how to handle these new entries when they read rider data.

Per `YDJ_FreshStart_EmpatheticResponse_PromptSpec_v1_1.md` Section "How Fresh Start Data Feeds Forward into Other AI Outputs," each downstream output that ingests rider data needs a small spec addendum. These are NOT in scope for THIS brief, but they are tracked here so the work isn't lost.

### Downstream prompt addendums needed (separate work, post-launch)

| Output | Addendum scope |
|---|---|
| Multi-Voice Coaching | Acknowledge gap and Fresh Start as bridge in opening; weight post-Fresh-Start debriefs as "re-entry chapter" for first 5 debriefs after; reference Fresh Start confidence number as context |
| Journey Map | Display Fresh Start as visible chapter break on timeline; show pre/post-gap trajectory as connected but distinct phases |
| Grand Prix Thinking | Briefly acknowledge re-entry in next regular generation; do NOT trigger new 30-day cycle on Fresh Start alone |
| Physical Guidance | Same as GPT — acknowledge re-entry, no new cycle trigger |
| Practice Card | Continue normally; no Fresh Start awareness needed |
| Pre-Lesson Summary | Continue normally |
| Show Planner | Continue normally |

Each of the first four outputs above should get a prompt-addendum spec drafted before the next refresh of that output's full prompt spec. Scope is small — each is roughly a paragraph of new prompt instruction plus the trigger logic.

### How micros feed forward

Micros do NOT feed into the Multi-Voice Coaching, GPT, Physical Guidance, etc. with the same weight as full debriefs. Per the micro-debrief prompt spec architectural principle: micros are *signal but not substitute* for full debriefs.

Practically, this means downstream prompts should:
- See micros as supporting context (e.g., "the rider has been logging — here's the recent shape") not as primary data for pattern claims
- Not count micros toward the 5-debrief unlock threshold (handled in Quick Start Map per Phase 5)
- Reference micro content when it's directly relevant to a pattern surfaced by full debriefs, but never originate a pattern claim from micros alone

This is documented here so the future downstream prompt addendums work get this right.

---

## Part 8 — Pilot Validation Strategy

This work changes the rider's lived experience meaningfully. Validate with pilot users before full launch.

### What to test with pilot users

**Micro-debrief:**
- Does the form feel as light as advertised? Time-to-completion target: 60-90 seconds on mobile.
- Does the Empathetic Coach response feel like being met, or like a chatbot?
- Does the rider understand it's a real entry but lighter than a full debrief? FAQ comprehension test.
- Does the response language feel native to the YDJ Empathetic Coach voice, or generic?
- For the established-rider state: does the response correctly reference their actual coaching picture? (Quality test — not whether they like it, but whether the AI got it right.)

**Fresh Start:**
- State A rider: does the response feel met without feeling fragile?
- State B rider: does the synthesizing observation feel genuinely insightful, or canned?
- Does the response language feel native to the YDJ Empathetic Coach voice?
- Does the rider feel less guilty about the gap after submitting? (Direct ask in feedback.)

### Pilot rollout sequence

1. Phase 1 ships to all riders silently (no UI surface). Précis generates on next Multi-Voice cadence.
2. Phase 2-4 ship to a small subset (3-5 pilot riders) with the dashboard surfaces hidden — they access the forms via direct link.
3. Pilot feedback for 1-2 weeks. Iterate on prompt quality (this is where Phase 1's quality benchmarks pay off — if the précis is right, the responses tend to be right).
4. Phase 5 ships to all riders — the dashboard surfaces appear and the feature is generally available.
5. Monitor: Fresh Start trigger fire rate, micro vs full debrief mix, Cloud Function error rates, token costs vs projections.

### Key signals to watch post-launch

- **Adoption ratio:** What percentage of total entries (micros + full debriefs) are micros? Healthy range: 20-40%. Above 50% suggests the full debrief is being avoided; below 10% suggests the micro isn't being surfaced clearly.
- **Fresh Start completion rate:** Of riders who see the prompt, what percentage complete it? Target: 40%+.
- **Re-engagement after Fresh Start:** Do riders who complete a Fresh Start log a debrief or micro within 14 days afterward? Target: 60%+.
- **Empathetic response quality complaints:** Manual review of riders who report a response felt off. Use the IC + early-adopter communication policy (per memory): invite riders to flag responses, reward real prompt-improvement feedback with subscription discounts or YDJ shirts.

---

## Part 9 — What's Out of Scope

- **Smart reminder system.** Push notifications based on riding schedule. Separate brief.
- **Re-engagement email content.** "We're here when you're ready" emails to inactive riders. Separate brief.
- **Voice routing for the Empathetic responses.** Confirmed permanent: Empathetic Coach only on both surfaces, no future addition of other voices.
- **Pattern surfacing across multiple micros.** "After 10 micros, surface a pattern" — was in early prototypes, not in this brief. Separate post-launch consideration.
- **Multi-language support.** v1 is English only.
- **Voice transcription quality handling.** Treat transcribed text as-is. Cleaning is upstream.
- **Downstream prompt addendums.** Tracked in Part 7. Not built in this brief.
- **Quick Debrief mode for the existing debrief form.** The micro-debrief is the lighter-weight path; the existing debrief stays as it is.

---

## Part 10 — One Small Note on Naming

Through the design conversation, several names were considered for these features:

- "Micro-debrief" / "Quick Debrief" / "Quick Capture" — settled on **Micro-debrief** in the spec, but **"Quick capture"** is the dashboard surface label per Part 5.1. The internal name (engineering, Firestore collection) is `microDebriefs`. The user-facing name on the dashboard CTA is "Quick capture." On the form page itself the title is "Micro Debrief." This split is acceptable but worth flagging — pick one consistent user-facing name before launch if desired.

- "Fresh Start" — consistent across spec, prototype, and this brief. The form page title is "Fresh Start" and the dashboard CTA reads "Take the Fresh Start." Good.

- The Empathetic Coach response on the Fresh Start screen has the label "The Empathetic Coach — A Note for Your Return" per the prototype. This is fine but could be tightened to just "The Empathetic Coach" — match the micro-debrief pattern. Designer's call.

---

*End of brief. Reference the three prompt specs and the two prototypes for any detail not covered here. Implementation should not require additional design decisions; if Claude Code finds an undefined edge case, surface it to the founder before improvising.*
