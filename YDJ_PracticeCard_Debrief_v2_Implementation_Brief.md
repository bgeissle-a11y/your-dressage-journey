# YDJ Practice Card v2 + Post-Ride Debrief — Implementation Brief
## Revision · April 2026

**Supersedes:**
- `YDJ_PracticeCard_Implementation_Brief.md` (March 2026) — fully replaced
- `YDJ_PostRideDebrief_Form_Changes.md` (March 2026) — Change 2 (Process Goals section)
  replaced; all other changes in that document remain in effect

**Reference prototype:** `ydj-practice-card-v2.html`

**Core design change:** The Practice Card and Post-Ride Debrief now form a single
closed learning loop. The Practice Card is where goals are set (with rider agency
over AI suggestions). The Debrief is where those same goals are rated. No goal
re-entry anywhere.

---

## 1. What Changed and Why

### Practice Card: from 5 sections to 3

The original card had five sections:
1. This ride, focus on (process goals)
2. In the saddle — feel for (external cues)
3. This week's image (analogy)
4. Between rides (mental rehearsal paragraph)
5. Carry this question

**Between Rides removed.** The 2–3 sentence mental rehearsal paragraph was always
undersized for its job. The Visualization Script Builder (Rider's Toolkit) does this
work properly — PETTLEP structure, specific movement, real timing, the horse's name
throughout. The brief mental rehearsal paragraph competed with a better tool and lost.
Where the Visualization Script is surfaced from the Weekly Update is a separate
decision (see Section 9).

**Carry This Question removed.** The pre-ride moment is for narrowing attention, not
opening new inquiry. A question at the mounting block adds cognitive weight exactly
when the rider needs to reduce it. Open curiosity belongs in the post-ride debrief
where there is space for reflection.

**Net result:** The card is shorter and cleaner. Three purposeful sections plus the
Ready to Ride action.

### Process Goals: AI suggests, rider confirms

In v1, the AI generated goals and the rider received them passively. In v2, the
goals are editable before locking. The rider can keep all three, refine the wording
for today's specific horse and conditions, or reduce to two if the session calls
for simplicity.

The card locks with the **confirmed goals** — not the original AI suggestions.
`suggestedGoals[]` and `confirmedGoals[]` are stored separately in Firestore.
The debrief reads `confirmedGoals[]`, not `suggestedGoals[]`.

This matters for two reasons:
- **Rider agency:** The act of reading and deciding to confirm (or refine) a goal
  primes attentional focus better than passive receipt. Even an unchanged goal becomes
  owned.
- **Data integrity:** The AI coaching system the following week sees what the rider
  actually committed to, not what was suggested. When ratings come back, the system
  knows whether it is reading adherence to its own suggestion or the rider's edit.

### Post-Ride Debrief: rate, don't re-enter

The previous debrief brief (Change 2) specified that the rider sets process goals
for their *next* ride in the debrief. That model has been replaced.

Goals are now set on the Practice Card (pre-ride). The debrief surfaces those
confirmed goals and asks the rider to rate them. No re-entry. The goals the AI sees
in next week's coaching context are the confirmed goals plus their ratings —
a complete cycle of intention → execution → assessment.

---

## 2. Firestore Schema — Practice Card

### Updated fields in `/riders/{riderId}/weeklyCoaching/{weekId}/practiceCard`

```
practiceCard: {
  generatedAt:    Timestamp,
  weekOf:         string,           // "April 1, 2026"

  // AI-generated suggestions (immutable after generation)
  suggestedGoals: string[],         // exactly 3 items
  inSaddleCues:   string[],         // exactly 2 items
  analogy:        string,           // 1–2 sentences

  // Rider-confirmed versions (written at Ready to Ride tap)
  confirmedGoals:  string[] | null, // null until rider locks; may differ from suggestedGoals
  goalsEdited:     boolean[] | null, // [false, true, false] — which goals were modified
  confirmedAt:     Timestamp | null, // null until locked
  confirmedDate:   string | null     // "Tue Apr 1" — display use
}
```

**Removed fields** (previously specified in v1 brief):
- `mentalRehearsal` — removed; Between Rides section dropped
- `carryQuestion` — removed; Carry This Question section dropped

**Do not write `processGoal1/2/3` to the debrief document** for the purpose of
goal-setting. Goals live on the Practice Card. The debrief stores ratings only
(see Section 3 below).

---

## 3. Firestore Schema — Debrief Goal Ratings

### Updated fields in `/riders/{riderId}/debriefs/{debriefId}/`

Replace the previous `processGoal1/2/3` fields (goal-setting) with rating fields:

```
// Goal ratings — sourced from Practice Card confirmedGoals
confirmedGoalsSnapshot: {
  goal1: string | null,    // copy of confirmedGoals[0] at time of debrief
  goal2: string | null,    // copy of confirmedGoals[1], null if fewer than 2
  goal3: string | null     // copy of confirmedGoals[2], null if fewer than 3
} | null                   // null when no Practice Card was locked this week

goalRatings: {
  goal1: "not-at-all" | "somewhat" | "mostly" | "fully" | null,
  goal2: "not-at-all" | "somewhat" | "mostly" | "fully" | null,
  goal3: "not-at-all" | "somewhat" | "mostly" | "fully" | null,
  reflection: string | null   // optional: "What got in the way, or what helped?"
} | null                       // null when no Practice Card was locked this week
```

**Why store a snapshot of the goal text:** The debrief document must be self-contained
for export and AI context. Do not assume the Practice Card document will always be
available when the debrief is read. Copy the confirmed goal text at debrief save time.

**All other Firestore schema additions** from `YDJ_PostRideDebrief_Form_Changes.md`
remain in effect (confidenceExecution slider, rideArc enum additions, mentalState
enum additions).

---

## 4. Practice Card Component — `PracticeCard.jsx`

### 4.1 Three states (unchanged from v1)

**State A — UNCONFIRMED** (`confirmedAt === null`)
Full card readable. Goals are editable. Ready to Ride button visible.

**State B — BREATH OVERLAY** (~3.2 seconds, transitional)
Dark overlay. "Breathe" fades in and out. Auto-advances to State C.

**State C — LOCKED** (`confirmedAt` set)
Card read-only. Locked banner replaces button. Post-ride CTA below footer.

### 4.2 Three card sections (v2)

| Section | Label | Color | Content |
|---|---|---|---|
| 1 | This ride, focus on | Gold `#B8862A` / `#F5EAC8` | `confirmedGoals[]` (or `suggestedGoals[]` before lock) — numbered 1–3, editable in State A |
| 2 | In the saddle — feel for | Rust `#8B4A2A` / `#F5E0D5` | `inSaddleCues[]` — `◆` bullets, read-only |
| 3 | This week's image | Forest `#2D6A4F` / `#D0EAE0` | `analogy` — italic serif, read-only |

Sections 4 (Between Rides) and 5 (Carry This Question) are removed. Do not render them.

### 4.2a Card Header

```
[wordmark]  YOUR DRESSAGE JOURNEY     8px serif, gold, tracking 0.2em, uppercase
[title]     Practice Card             18–20px serif
[meta]      Week of {weekOf}          10.5px, ink-light
```

**Do not display the horse name in the card header.** The card is the rider's ride
plan, not a horse-specific document. Horse-specific language lives inside the content
(in-saddle cues name the horse; goals may name the horse when relevant). A rider
heading to the barn to ride a different horse should not see a header that frames the
card as belonging to another horse. Any goal that names a horse gives sufficient signal
that an edit may be warranted before locking. The rider's name or level label may be
added in future iterations; for now, week date only.

### 4.3 Editable goals (State A only)

In State A, the process goals section renders with an edit affordance:

- Below the section label, display: "Tap any goal to refine it for today" — 9px,
  gold color, with a small pencil icon. This hint disappears once any goal is edited
  (or on lock).
- Each goal renders as a tappable text display. On tap, the text becomes a `<textarea>`
  pre-filled with the current value (initially the AI suggestion).
- Save on blur or Enter (Shift+Enter inserts newline). Escape reverts to prior value.
- After saving an edit: if the new text differs from `suggestedGoals[i]`, mark the
  goal row with a small "✎ Edited from suggestion" label (9px, gold, below the text).
- Track which goals have been modified in local state. On lock, write `goalsEdited`
  boolean array alongside `confirmedGoals`.

In State C, goals render as read-only text. Modified goals retain the "✎ Your edit"
label so the rider can see what they changed.

**Modification count:** If any goals were edited, display a count badge above the
Ready to Ride button: "2 goals edited from AI suggestion" — muted gold, 9.5px,
centered. This is informational only; it does not gate the Ready to Ride action.

### 4.4 Ready to Ride — Firestore write

On breath overlay completion, write to Firestore:

```javascript
await updateDoc(
  doc(db, "riders", riderId, "weeklyCoaching", weekId),
  {
    "practiceCard.confirmedGoals":  confirmedGoals,   // string[]
    "practiceCard.goalsEdited":     goalsEdited,      // boolean[]
    "practiceCard.confirmedAt":     serverTimestamp(),
    "practiceCard.confirmedDate":   formattedDateString
  }
);
```

Optimistic UI: transition to State C immediately. If the write fails, log silently —
do not block the rider.

### 4.5 Post-ride CTA (State C)

Unchanged from v1:
- Label: "AFTER YOUR RIDE" (small caps, muted)
- Action: "Log your debrief ↗"
- Navigates to `/debrief/new?date=YYYY-MM-DD`

### 4.6 Breath overlay, locked banner, footer

No changes from v1 spec. See original `YDJ_PracticeCard_Implementation_Brief.md`
sections 5.6, 5.7, and 5.4 for exact styling.

---

## 5. Practice Card — AI Prompt Changes

### 5.1 Remove `mentalRehearsal` and `carryQuestion` from the practiceCard JSON instruction

In `promptBuilder.js`, find the practiceCard JSON instruction block (added per
`YDJ_Prompt_Changes_Learning_Theory.md` Change 8). Update the JSON shape to remove
the two deprecated fields:

**Find this shape in the prompt:**
```
{
  "practiceCard": {
    "processGoals": ["goal 1", "goal 2", "goal 3"],
    "inSaddleCues": ["cue 1", "cue 2"],
    "analogy": "text",
    "mentalRehearsal": "text",
    "carryQuestion": "text"
  }
}
```

**Replace with:**
```
{
  "practiceCard": {
    "processGoals": ["goal 1", "goal 2", "goal 3"],
    "inSaddleCues": ["cue 1", "cue 2"],
    "analogy": "text"
  }
}
```

**Also update the Rules block** in the same prompt addition. Remove the rules for
`mentalRehearsal` and `carryQuestion`. The updated rules block:

```
Rules:
- processGoals: exactly 3 items. Verb-first. Each goal achievable in a single ride,
  max ~15 words. Name relaxation, forwardness, or trust in the hand by name when
  relevant — never refer to them collectively as "the three principles." These are
  suggestions the rider may edit before the ride; write them as starting points that
  invite ownership, not prescriptions.
- inSaddleCues: exactly 2 items. EXTERNAL FOCUS only — describe what the horse's
  movement feels like when the work is correct. Never frame as rider body instructions.
  The rider should be attending to the horse, not monitoring themselves.
- analogy: one vivid image or metaphor, 1–2 sentences. Specific enough to carry into
  the arena. Draw from the week's primary technical theme.
```

### 5.2 Also remove the Between Rides section from the consolidation prompt

The `BETWEEN RIDES THIS WEEK` section added by `YDJ_Prompt_Changes_Learning_Theory.md`
Change 8 should also be removed from the consolidation prompt. The Visualization
Script Builder now owns between-ride practice. Retaining the paragraph creates
confusion about which tool the rider should use.

**Note:** The Between Rides text was part of the Multi-Voice consolidation output —
a prose section that appeared in the coaching output alongside voice content. Remove
it. The Visualization Script integration into Weekly Focus is a separate feature
(see Section 9).

---

## 6. Post-Ride Debrief — Section 2.5 Redesign

This replaces Change 2 of `YDJ_PostRideDebrief_Form_Changes.md` entirely.

### 6.1 Section header

- Old: "Riding Intentions — How well did you meet your intentions for this ride?"
- New: "Process Goals"
- Section description: "How well did you stay focused on your goals for this ride?"

### 6.2 Goal rating block (primary path — Practice Card was used)

On form load, attempt to fetch the most recent locked Practice Card for this
rider + horse combination (`confirmedAt` is not null). This is the same weeklyCoaching
document — read `practiceCard.confirmedGoals` and `practiceCard.confirmedAt`.

**If a locked Practice Card exists for the current week:**

Display each confirmed goal as a read-only row with a 4-option rating:

```
[FROM YOUR PRACTICE CARD — small caps label, muted color]

[goal text, read-only]
How well did you maintain this focus?
○ Not at all   ○ Somewhat   ○ Mostly   ○ Fully

[repeat for each confirmed goal — only render goals that exist]

[Optional text prompt below all ratings:]
What got in the way, or what helped?
[small textarea, id="goalReflection", optional, ~2 rows]
```

Field IDs: `goalRating1`, `goalRating2`, `goalRating3`

Only render rating rows for goals that exist. If `confirmedGoals` has 2 entries,
render 2 rows. If 3, render 3.

Copy the confirmed goal text into `confirmedGoalsSnapshot` in the Firestore save
(see Section 3). Do not store references — store the text itself.

**If the locked Practice Card has `goalsEdited` with any `true` values:**
The goal text shown is the rider's edited version. No special label needed in the
debrief — the snapshot captures what was actually committed to.

### 6.3 Fallback path — no Practice Card locked this week

If no locked Practice Card exists for this week (rider didn't use the card, or
coaching output hasn't run), fall back to a simplified manual entry:

```
[No practice card found for this week.]
[optional, silent — just show the entry slots without explaining why]

What were you focusing on in this ride?
[text input, id="fallbackGoal1", optional]
[text input, id="fallbackGoal2", optional]
[text input, id="fallbackGoal3", optional]

How well did you maintain each focus?
[same 4-option rating per non-empty slot]
```

Save fallback goals + ratings using the same `confirmedGoalsSnapshot` and
`goalRatings` schema. Do not save to a different field — the AI coaching system
treats both paths identically.

**Do not explain the fallback state to the rider.** No "You didn't use your Practice
Card this week" message. Simply show the optional fields without preamble.

### 6.4 Remove the old Manage Intentions panel

Remove the current Manage Intentions panel entirely — the free-form intentions editor
with the 1–5 grid rating system. Do not preserve it as a fallback.

### 6.5 Remove the "What will you focus on in your next ride?" slots

The previous brief (Change 2a) added three text inputs for setting goals for the
*next* ride at the end of the debrief. These are removed. Goals for the next ride
are set on the next week's Practice Card (AI suggests, rider confirms pre-ride).

The debrief is now entirely retrospective — it looks back at this ride, not forward
to the next.

---

## 7. AI Prompt Update — Practical Strategist, process goal context

**File:** `promptBuilder.js` (or wherever the Practical Strategist voice receives
its rider context block)

In the weekly coaching run context assembly, the following data is now available
and should be passed to the coaching prompt:

```javascript
// In the rider context block passed to coaching:
recentGoalData: {
  weekOf: string,
  suggestedGoals: string[],      // what the AI suggested last week
  confirmedGoals: string[],      // what the rider locked with
  goalsEdited: boolean[],        // which goals the rider modified
  goalRatings: {                 // from the most recent debrief
    goal1: string | null,
    goal2: string | null,
    goal3: string | null,
    reflection: string | null
  }
}
```

Add this context block to the Practical Strategist prompt addition in
`YDJ_Prompt_Changes_Learning_Theory.md`. The Practical Strategist should:

1. Note whether the rider modified the AI's suggested goals — this is metacognitive
   data (the rider had a different instinct about what to focus on).
2. Note the rating pattern — a goal rated "not at all" two weeks running is a
   different signal than one rated "fully" that the rider set themselves.
3. Use goal adherence ratings alongside ride quality and arc data when recommending
   what to adjust.

Exact prompt language to add to the Practical Strategist ANALYTICAL APPROACH block:

```
PROCESS GOAL LOOP:
When recentGoalData is present in context, read it as a complete cycle:
- suggestedGoals → what the coaching system recommended last week
- confirmedGoals → what the rider actually committed to (may differ)
- goalsEdited → which goals the rider modified before riding
- goalRatings → how well the rider maintained focus on each

If the rider edited a suggested goal, their version reveals their own coaching
instinct. Reference it: "You adjusted goal 2 from [suggested] to [confirmed] —
what made that feel more right for that ride?"

If a goal was rated "not at all" or "somewhat," investigate root cause before
re-recommending the same goal. A goal that consistently goes unmet may be too
abstract, too demanding, or competing with a more urgent attentional priority.

If the rider maintained "mostly" or "fully" on all goals, escalate the challenge
modestly. This is the progression signal.
```

---

## 8. Dashboard Entry Point

The compact Practice Card entry on the dashboard home screen shows:

**State A (unconfirmed):**
- "Practice Card" label + week label (e.g., "Week of April 1") — no horse name
- First suggested goal (teaser, truncated to ~60 chars)
- "Ready to ride →" opens the full card

**State C (locked):**
- `✓ Have a great ride!` in green
- Lock timestamp
- "Log your debrief →" links to `/debrief/new?date=today`

**No card this week:**
- Do not render the component.

---

## 9. Visualization Script — Deferred (out of scope for this brief)

The Visualization Script link has been removed from the Practice Card. Where it
surfaces is a separate design and implementation decision. The current plan:

- Surfaced in the **Weekly Focus / Weekly Update**, with the AI suggesting a
  specific movement and rationale (e.g., new movement introduced, upcoming show,
  recurring mechanical difficulty).
- The AI recommendation is a new field in the weekly coaching output — not a full
  script, but a structured suggestion that pre-populates the Visualization Script
  Builder intake form.
- This feature will be specified in a separate brief.

**No action required in this implementation.** The Visualization Script Builder
itself (in Rider's Toolkit) is unchanged.

---

## 10. Implementation Checklist

### Practice Card

- [ ] Update `practiceCard` JSON prompt instruction — remove `mentalRehearsal` and
      `carryQuestion` fields, update rules block (Section 5.1)
- [ ] Remove `BETWEEN RIDES THIS WEEK` section from Multi-Voice consolidation prompt
      (Section 5.2)
- [ ] Update Firestore schema — add `suggestedGoals`, `confirmedGoals`, `goalsEdited`
      fields; remove `mentalRehearsal` and `carryQuestion` from schema (Section 2)
- [ ] Update pre-processing: save `suggestedGoals` (and `inSaddleCues`, `analogy`)
      from AI output to Firestore; `confirmedGoals` and `goalsEdited` written by client
- [ ] Build `PracticeCard.jsx` — 3 sections only (no Between Rides, no Carry Question)
- [ ] Implement editable goals in State A: tappable text → textarea → blur to save
- [ ] Track modified goals in local state; show "✎ Edited from suggestion" label
- [ ] Show modification count badge above Ready to Ride button when goals edited
- [ ] On Ready to Ride: write `confirmedGoals`, `goalsEdited`, `confirmedAt`,
      `confirmedDate` to Firestore (Section 4.4)
- [ ] Implement breath overlay (State B) — re-trigger animation via key/DOM replace
- [ ] Implement locked state (State C) — read-only goals, locked banner, post-ride CTA
- [ ] Wire post-ride CTA to `/debrief/new?date=YYYY-MM-DD`
- [ ] Add compact dashboard entry point (Section 8)
- [ ] Test: card renders from Firestore `suggestedGoals` (not hardcoded)
- [ ] Test: goal edit persists in local state across re-renders before lock
- [ ] Test: `confirmedGoals` differs from `suggestedGoals` when goals were edited
- [ ] Test: `goalsEdited` boolean array is accurate
- [ ] Test: `confirmedAt` persists across page reload (State C on return)
- [ ] Test: breath animation re-triggers correctly on repeated testing
- [ ] Test: Between Rides section does NOT render
- [ ] Test: Carry This Question section does NOT render

### Post-Ride Debrief

- [ ] Remove Manage Intentions panel (free-form intentions editor + 1–5 grid)
- [ ] Remove "What will you focus on in your next ride?" goal slots
- [ ] Add Section 2.5 goal rating block (Section 6.2)
- [ ] On form load: fetch locked Practice Card for current week/horse;
      read `confirmedGoals` if `confirmedAt` is not null
- [ ] Render goal rating rows (read-only goal text + 4-option rating) for each
      confirmed goal (only render rows for goals that exist)
- [ ] Add optional reflection textarea below ratings
- [ ] Implement fallback: if no locked Practice Card, show optional manual entry
      slots with same rating structure (Section 6.3)
- [ ] Update Firestore save: write `confirmedGoalsSnapshot` + `goalRatings`
      (include `reflection`); do not write `processGoal1/2/3` for goal-setting
- [ ] Test: ratings section renders correctly when Practice Card was locked
- [ ] Test: correct goal text appears (confirmed, not suggested)
- [ ] Test: only goals that exist appear (no empty rows for 2-goal cards)
- [ ] Test: fallback manual entry works when no Practice Card locked
- [ ] Test: `confirmedGoalsSnapshot` stores goal text, not a reference
- [ ] Test: debrief saves correctly with `goalRatings: null` when no goals exist
- [ ] All other changes from `YDJ_PostRideDebrief_Form_Changes.md` still apply
      (Changes 1, 3, 4, 5 — unchanged)

### Coaching Prompt

- [ ] Add `recentGoalData` block to rider context assembly in `promptBuilder.js`
- [ ] Add PROCESS GOAL LOOP instruction to Practical Strategist prompt (Section 7)
- [ ] Test: coaching output references goal adherence when `goalRatings` is present
- [ ] Test: coaching output notes goal edits when `goalsEdited` contains `true` values

---

## 11. What Is NOT in This Brief

- **Visualization Script suggestion in Weekly Focus** — separate brief, separate
  implementation. Not in scope here.
- **Push notification delivery** — deferred to PWA phase (Q3)
- **"Before I Look" self-assessment** — separate feature
- **Analytics: card confirmation vs. debrief quality correlation** — post-launch
- **Goal escalation logic in AI** — prompt guidance only; no algorithmic difficulty
  scaling in this implementation

---

*April 2026. Supersedes: `YDJ_PracticeCard_Implementation_Brief.md` (March 2026)
and Change 2 of `YDJ_PostRideDebrief_Form_Changes.md` (March 2026).
Reference prototype: `ydj-practice-card-v2.html`.
Research basis: Kingston & Hardy (1997), Cowan (2001), Wulf OPTIMAL theory (2016),
Driskell et al. (1994 — now handled by Visualization Script Builder, not this card).*
