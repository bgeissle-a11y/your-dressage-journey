# YDJ Prompt Additions: Temporal Accuracy
## Exact Insertions for Existing Prompts and promptBuilder.js — May 2026

**Companion to:** `YDJ_AI_Coaching_Voice_Prompts_v3.md` (Shared Base Context),
`promptBuilder.js` (context assembly), and `functions/aggregators/reflections.js`
(reflection pre-processing).

---

## Overview

This document specifies all changes required to fix two related temporal-accuracy
bugs observed in pilot output:

1. **Floating "recent" without anchoring.** Coaching voices use "recent,"
   "recently," or "lately" with no comparison to the current date and, in the case
   of reflections, no reliable date for the experience being described.
2. **Calendar-order errors.** Coaching voices have described a May 1 ride as
   "subsequent to" a May 2 clinic. The AI is inferring chronological order from
   list position, narrative flow, or guesswork instead of comparing ISO dates.

A third, subtler issue is addressed proactively: **reflections have no event
date.** A reflection's `createdAt` records only when the rider wrote it, not when
the experience inside happened. Treating `createdAt` as a temporal anchor for
reflection content is a hallucination waiting to happen.

The fix is three-part:
- **Part 1:** Wire today's date into every API call as an explicit anchor
  (`promptBuilder.js`).
- **Part 2:** Add a TEMPORAL ACCURACY block to the Shared Base Context that
  governs how all four voices and all seven outputs reason about time.
- **Part 3:** Strip `createdAt` from the reflection payload sent to voices that
  shouldn't see it (`functions/aggregators/reflections.js`).

All three parts must land together. Each one alone is insufficient.

---

## 1. promptBuilder.js — Inject ANALYSIS DATE into every API call

**File:** `promptBuilder.js`

**Locate:** The function or section where the rider context block is assembled
before being prepended to a coaching prompt.

**Action:** Compute today's date in ISO format at runtime and prepend an
`ANALYSIS DATE` line to the assembled context block. This applies to every API
call across all seven outputs (Journey Map, Multi-Voice Coaching, Data
Visualizations, Grand Prix Thinking L1/L2, Physical Guidance, Event Planner,
Self-Assessment Analysis).

### Code addition:

```javascript
// At the top of the context assembly function:
const analysisDate = new Date().toISOString().split('T')[0]; // "2026-05-04"
const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });

// Prepend to the assembled context block (before any rider data):
const temporalAnchor =
`ANALYSIS DATE: ${analysisDate} (${dayOfWeek})
Use this date as the anchor for any relative time language in your output.
All dated rider entries below are in ISO format (YYYY-MM-DD).

`;

// Then concatenate temporalAnchor + (existing assembled context).
```

### Date format normalization

Confirm every dated field passed downstream uses ISO `YYYY-MM-DD` format. Audit
the following aggregators and normalize at the aggregator layer if any are
passing JS `Date` objects, Firestore `Timestamp` objects, locale-formatted
strings (`"March 15"`), or US-format dates (`"3/15/2026"`):

- Post-Ride Debrief → `rideDate`
- Lesson Notes → `lessonDate`
- Observation → `date`
- Journey Event → `eventDate`
- Health & Soundness Entry → `entryDate`
- Show Preparation → `showDate`
- Reflection → `createdAt` (see Part 3 — visibility-restricted)
- Self-Assessment → `completedAt`

The AI cannot reason temporally on inconsistent date formats. This is the same
class of bug that hid debriefs from the app last month — date type drift between
the storage layer and the consumer layer.

---

## 2. Shared Base Context — Add TEMPORAL ACCURACY block

**File:** `YDJ_AI_Coaching_Voice_Prompts_v3.md` — Shared Base Context block

**Insert after:** The PROPRIOCEPTIVE CALIBRATION AWARENESS block (added by
`YDJ_Prompt_Changes_Learning_Theory.md`)

**Before:** The closing ``` of the base context block

### Addition:

```
TEMPORAL ACCURACY — NON-NEGOTIABLE:
Every API call includes an ANALYSIS DATE at the top of the context block. This is
"today" for the purposes of this output. All dated rider entries (debriefs,
lesson notes, observations, journey events, health entries, show preparations)
include an ISO-format date (YYYY-MM-DD). Use these dates as the only authority
on time. Never infer chronological order from list position, prose context, or
narrative flow.

RULE 1 — RELATIVE TIME LANGUAGE:
Do not use "recent," "recently," "lately," "this week," "last week," "a while
ago," "some time back," or any other relative time phrase unless BOTH of the
following are true:
  (a) The entry you are referring to has an explicit date in the data, AND
  (b) You have compared that date to the ANALYSIS DATE above.

When both conditions are met, prefer specific anchors over vague ones:
  - "your May 2 clinic" rather than "your recent clinic"
  - "three weeks ago" rather than "recently"
  - "in your January 14 lesson" rather than "in a recent lesson"

If you cannot identify the date of an entry, do not describe it temporally at
all. Refer to the entry by its content ("the lesson where you worked on
shoulder-in") rather than by its supposed timing.

NEVER write "recent debrief," "recent ride," "recent lesson," or "recent
observation" as a generic phrase. Either name the date or name the content.

RULE 2 — CHRONOLOGICAL ORDER:
When describing two or more events in relation to each other ("before," "after,"
"prior to," "subsequent to," "leading up to," "in the wake of," "following"):
  - Identify the ISO date of each event.
  - Compare them digit by digit: year, then month, then day.
  - The earlier date is BEFORE / PRIOR TO.
  - The later date is AFTER / SUBSEQUENT TO / FOLLOWING.

Example: A debrief dated 2026-05-01 is BEFORE a clinic dated 2026-05-02.
The clinic is SUBSEQUENT to the debrief. The debrief is PRIOR to the clinic.
This holds regardless of which entry was submitted, edited, or appeared first
in the data passed to you.

If you find yourself uncertain which of two events came first, do not write a
sentence that asserts an order. Describe each event independently.

RULE 3 — NEVER INVENT TEMPORAL CONTEXT:
Do not say "this builds on your work from earlier in the week" or "this echoes
something from last month" unless the data actually contains an entry from that
window AND you have verified its date against the ANALYSIS DATE.
Pattern-matching narrative phrases without dated evidence is a hallucination.

RULE 4 — REFLECTIONS HAVE NO RELIABLE EVENT DATE:
Reflections are written about whatever experience the rider chooses to reflect
on, which may have occurred yesterday, last year, or decades ago. The entry
timestamp on a reflection records only WHEN THE RIDER WROTE IT — not when the
event being reflected on happened.

For reflections specifically, do NOT use the entry date as a temporal anchor.
Do not say "in your recent reflection" based on when it was submitted. Do not
say "last week you reflected on..." because the writing date tells you nothing
about the experience inside.

A reflection acquires temporal context ONLY when the rider's own prose contains
a date, year, season, or explicit relative time marker. Examples of valid
temporal markers from within the reflection text:
  - "Back in 2019, I had a clinic where..."
  - "When I was a junior rider..."
  - "Yesterday, after my lesson..."
  - "Last summer at Lamplight..."
  - "Two years ago, when I first got [horse]..."

When such markers are present, you may use them — and where the rider provides
a specific date, compare to the ANALYSIS DATE. When NO temporal marker is
present in the rider's prose, refer to the reflection by its category and
content only, never by when it was written:
  - GOOD: "Your Aha Moment reflection about lateral suppleness..."
  - GOOD: "In the Connection reflection where you wrote about [horse]'s left
    lead..."
  - BAD: "Your recent reflection about lateral suppleness..."
  - BAD: "Last week's reflection on connection..."
  - BAD: "A reflection from earlier this month suggested..."

If a reflection contains no temporal marker and no date in the prose, treat it
as TIMELESS rider data — a piece of self-knowledge with no fixed point on the
calendar.

DATE FIELDS BY DATA TYPE — REFERENCE TABLE:
For each data type, this is the dated field you may use as a temporal anchor
and what it represents:

  - Post-Ride Debrief: rideDate = when the ride occurred. Use as anchor.
  - Lesson Notes: lessonDate = when the lesson occurred. Use as anchor.
  - Observation: date = when the rider watched. Use as anchor.
  - Journey Event: eventDate = when the event happened. Use as anchor.
  - Health & Soundness Entry: entryDate = when the maintenance/concern
    occurred. Use as anchor.
  - Show Preparation: showDate = when the show is/was. Use as anchor.
  - REFLECTION: createdAt = when the rider WROTE it. DO NOT use as anchor for
    the experience being reflected on. Use only the rider's own prose for
    temporal context, if any exists.
  - Self-Assessment: completedAt = when the snapshot was taken. Treat with
    similar caution to reflections — a self-assessment describes an ongoing
    state, not an event. Use the timestamp only to locate the snapshot
    relative to other snapshots, not to assign timing to the rider's
    self-description.
```

---

## 3. Reflection aggregator — Strip createdAt from voice payloads

**File:** `functions/aggregators/reflections.js` (or wherever reflections are
pre-processed for the AI pipeline)

**Action:** Restrict visibility of the reflection `createdAt` field. The
`createdAt` timestamp is metadata about the rider's reflection practice — useful
for analyzing whether the rider reflects consistently — but it has no
legitimate use for the voices that analyze reflection *content*. Removing it
from those payloads prevents the AI from pattern-matching on it.

### Visibility rules:

| Consumer | createdAt visible? | Rationale |
|---|---|---|
| Classical Master | NO | Analyzes content; timestamp is irrelevant and confusing. |
| Empathetic Coach | NO | Analyzes content; timestamp is irrelevant and confusing. |
| Technical Coach | NO | Analyzes content; timestamp is irrelevant and confusing. |
| Practical Strategist | YES | Legitimately analyzes reflection cadence and consistency. |
| Journey Map | YES | Uses cadence as part of pattern recognition. |
| Grand Prix Thinking L1/L2 | NO | Analyzes content for trajectory; timestamp is misleading. |
| Physical Guidance | NO | No legitimate use. |
| Event Planner | NO | No legitimate use. |
| Self-Assessment Analysis | NO | No legitimate use. |

### Additional aggregator-layer cleanup:

Audit the assembled prompt text for any of these patterns and remove or rename:
- Field labels like `"most recent reflection"` or `"latest reflection"`
- Section headers like `"This Week's Reflections"` or `"Recent Reflections"`
- Implicit ordering language anywhere in the assembled context

Replace with neutral framing: `"reflections in this analysis window"` or simply
`"reflections."` Do not pre-sort reflections by `createdAt` in a way that the AI
will interpret as chronological narrative.

When the Practical Strategist or Journey Map sees `createdAt`, label it
explicitly as `reflectionWritten` (not `date` or `recentDate`) so the field
name itself signals what the timestamp does and does not represent:

```javascript
// For voices that should see createdAt:
{
  category: "aha",
  prompt: "...",
  mainReflection: "...",
  feeling: "...",
  influence: "...",
  reflectionWritten: "2026-04-28"  // labeled to signal: this is when the rider wrote it
}

// For voices that should NOT see createdAt:
{
  category: "aha",
  prompt: "...",
  mainReflection: "...",
  feeling: "...",
  influence: "..."
  // createdAt omitted entirely
}
```

---

## 4. Implementation Checklist

When implementing these additions:

- [ ] **Part 1:** Add `analysisDate` and `dayOfWeek` computation at the top of
  the context assembly function in `promptBuilder.js`.
- [ ] **Part 1:** Prepend the `temporalAnchor` block to every assembled context
  before it is sent to the API.
- [ ] **Part 1:** Audit each aggregator (debrief, lesson, observation, journey
  event, health, show prep, self-assessment) and confirm dated fields are
  emitted in ISO `YYYY-MM-DD` format. Normalize at the aggregator layer for
  any that are not.
- [ ] **Part 2:** Insert TEMPORAL ACCURACY block (with Rules 1–4 and the date
  fields reference table) into the Shared Base Context in
  `YDJ_AI_Coaching_Voice_Prompts_v3.md`, after the PROPRIOCEPTIVE
  CALIBRATION AWARENESS block.
- [ ] **Part 2:** Confirm the updated Shared Base Context is read into the
  prompt assembly in `promptBuilder.js` (a documentation-only change to the
  v3 file is insufficient — the runtime must pick it up).
- [ ] **Part 3:** Update the reflection aggregator to omit `createdAt` from
  payloads for Classical Master, Empathetic Coach, Technical Coach, GPT L1,
  GPT L2, Physical Guidance, Event Planner, and Self-Assessment Analysis.
- [ ] **Part 3:** For Practical Strategist and Journey Map, rename the field
  `createdAt` to `reflectionWritten` in the emitted payload.
- [ ] **Part 3:** Audit assembled context for stale labels (`"recent
  reflection,"` `"latest reflection,"` `"this week's reflections"`) and
  replace with neutral framing.
- [ ] Run all six test scenarios below against real or fixture data before
  shipping.
- [ ] Add the temporal-language grep check (Section 5) to the monthly data
  spot-check protocol.

---

## 5. Test Scenarios to Validate

Run these against the updated prompts using real or fixture pilot data. Each
scenario specifies the expected behavior — any deviation is a fail.

### Scenario A: Two events, calendar order
**Setup:** Debrief dated 2026-05-01, clinic (journey event) dated 2026-05-02.
Output references both.
**Expected:** Clinic is described as subsequent to / following the debrief. The
debrief is described as prior to / before the clinic. Order respects ISO
comparison regardless of which entry appears first in the data array.

### Scenario B: Old reflection referenced today
**Setup:** Reflection from 2025-11-12 (six months before ANALYSIS DATE
2026-05-04) referenced in a Multi-Voice Coaching output today.
**Expected:** Output refers to the reflection by category and content. May say
"the reflection where you wrote about..." or, if the rider's prose contains a
date marker, "the November breakthrough you wrote about." Never says "your
recent reflection."

### Scenario C: Missing date
**Setup:** Output references a debrief but the prompt is missing the `rideDate`
field for that entry (data integrity edge case).
**Expected:** Output refers to the debrief by content, not by timing. No
"recent." No inferred ordering relative to other entries.

### Scenario D: Adjacent debriefs, correct order
**Setup:** Two debriefs dated 2026-04-28 and 2026-04-30 referenced together.
**Expected:** Order respects ISO comparison. April 28 is before April 30. No
inference from data array position.

### Scenario E: Reflection with internal temporal marker
**Setup:** Reflection written 2026-04-28 about a breakthrough that the rider's
prose describes as happening "in my late 30s" (rider is now 52).
**Expected:** Output references the breakthrough by content and may use the
rider's own anchor ("the breakthrough you described from your late 30s"). Does
NOT say "your recent reflection" or "last week you reflected." The writing
date is invisible to the analyzing voices.

### Scenario F: Reflection with no internal temporal marker
**Setup:** Reflection written 2026-05-02 with no date, year, or relative time
marker in the prose.
**Expected:** Output references the reflection by category and content only —
no temporal language at all. No "recent," no "earlier," no implied
chronological position relative to other reflections.

### Spot-check protocol (post-launch)
Add to monthly data spot checks: pull three random outputs and grep for the
following words. Each hit must have a verifiable date anchor immediately
adjacent (a specific date, a calculated "X weeks/months/years ago," or a
rider's own prose marker) — otherwise it is a fail and the prompt needs review.

```
recent | recently | lately | this week | last week | a while ago
| earlier this month | earlier this year
```

---

## 6. Why This Lives in Shared Base Context, Not a Voice-Specific Addition

The May 1 / May 2 error came from the coaching voices, but the same bug
surfaces anywhere the AI describes time — Journey Map narrative, Pre-Lesson
Summary, Weekly Focus excerpts, Grand Prix Thinking trajectory, Event Planner
timeline reasoning, Self-Assessment longitudinal framing.

Putting this in a single voice fixes one surface. Putting it in Shared Base
Context fixes all seven outputs and any future ones.

---

## 7. Token Impact

- TEMPORAL ACCURACY block (Rules 1–4 + reference table): ~450 tokens, prepended
  to every API call (all calls affected).
- ANALYSIS DATE temporal anchor: ~30 tokens, prepended to every API call.
- Total additional runtime tokens per call: ~480 tokens.

Across the weekly per-rider recurring load (~10 API calls for Journey Map +
Multi-Voice + Data Viz), this is ~4,800 additional input tokens per rider per
week. Well within cost-management parameters and worth the accuracy gain.

---

*Companion to `YDJ_AI_Coaching_Voice_Prompts_v3.md`, `promptBuilder.js`, and
`functions/aggregators/reflections.js`*
*Version 1.0 — May 2026*
