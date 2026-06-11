# Batch B — Staged copy for `/outputs-tips-and-faq` (DO NOT DEPLOY YET)

Status: **HELD**. This copy describes the upgraded coaching engine and must go
live only when **all** users are on the upgraded engine (Phase 5 general
rollout / flag flip), not while it is pilot-only. Source brief: "YDJ Tips & FAQ —
Nav Fix and Content Update Brief" (June 2026), Batch B.

The guide page (`src/pages/OutputsTipsAndFaq.jsx`) is static JSX with no
per-user flag hook, so this content is being held in the repo rather than
rendered behind a flag. When the rollout lands, paste these blocks into the
live page and run the gate below.

---

## Blockers that must clear before this deploys

1. **Phase 5 flag flip for all users.** No Batch B copy renders on production
   until every account is on the upgraded engine.
2. **B1 label verification.** Before finalizing the Journey Map copy, open the
   deployed *upgraded* Journey Map output and quote the exact on-screen labels.
   Do not invent label names. The bracketed `[VERIFY: ...]` markers below flag
   every place where the live label must be confirmed or substituted.
3. **B3 verification gate.** Confirm against the **live app** (not the spec
   docs) that each described behavior is visible to a standard non-pilot
   account post-rollout: per-horse Journey Map with rider-selected focal horse,
   baseline-contrast "change signal," consolidation framing, tiered source
   weighting, and baseline-contrast coaching. Any mismatch is a
   stop-and-report, not a copy adjustment.

Voice/style: plain prose, no em dashes (matches the brief's Batch A additions).

---

## B1 — Journey Map section updates (`#journey-map`)

### Add to the Journey Map intro / "At a Glance" area

> **One map per horse.** The Journey Map is generated for a single horse at a
> time. You pick the focal horse; if you do not, it defaults to your most
> active horse. Switch the focal horse to regenerate the map for a different
> partnership. [VERIFY: exact focal-horse selector label on the live page.]

### Add a "What's changing now" subsection (or fold into "Progress Snapshot")

> **The map names what is moving right now.** Your Journey Map is built from
> your whole history, and then it contrasts your recent state against your own
> established baseline. Instead of averaging recent gains into the long arc, it
> explicitly calls out what has shifted lately, so a real change in the last
> few weeks shows up as a change rather than disappearing into the overall
> trend. [VERIFY: exact label of the change/baseline section as it appears in
> the upgraded output.]

### New FAQ entry (Journey Map) — exact phrasing from the brief

> **Why does my Journey Map call my plateau "consolidation"?** Because that is
> usually what it is. Periods where the data looks flat are often where skills
> settle into the body. The map names these periods as consolidation rather
> than treating them as missing progress, and it watches for the change that
> typically follows.

---

## B2 — Coaching voices section updates (`#multi-voice` / `#faq`)

### New FAQ entry (source weighting) — exact phrasing from the brief

> **Does the AI treat my instructor's notes differently from my own notes?**
> Yes. What your instructor said in a lesson carries the highest authority,
> your own write-up of the lesson comes next, and your self-reported
> impressions come after that. This mirrors how a human coaching team would
> weigh the same information, and it is why recording lesson notes pays off so
> strongly in your coaching outputs.

### Add to the Multi-Voice Coaching section (baseline contrast in coaching)

> **The voices speak to what has changed.** Beyond reading your overall
> pattern, the coaching voices now speak to what has shifted against your own
> baseline, so the guidance tracks your recent movement and not just the
> long-run average.

---

## On This Page index

When these blocks are pasted in, add any newly titled subsections to the
`#faq` list and the "On This Page" nav so the index stays complete.
