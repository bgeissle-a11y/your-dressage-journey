# YDJ Prompt Additions: Groundwork Modality
## Exact Insertions for Existing Prompts — April 2026

**Companion to:** `post-ride-debrief-with-intentions.html` (updated form with session modality field and modality-aware movement checkboxes)

---

## Overview

This document specifies the exact text to add to existing YDJ prompts to ensure all new session modality data is actively used in AI coaching outputs. It follows the same format as all other YDJ Prompt Additions documents.

The Debrief update introduced two new data elements requiring prompt support:
1. **Session modality** — every debrief now records whether the session was "in-saddle," "on-ground," or "combined"
2. **Structured movement tags** — every debrief now records a list of movement and focus tags drawn from a controlled vocabulary, with `gw-` prefix denoting ground-work-specific activities

Each section below identifies:
- **Which prompt** to modify
- **Where** in the prompt to insert the new text
- **The exact addition** (ready to copy-paste)

This document is a peer to `YDJ_Prompt_Additions_Horse_Profile_v2.md` Section 5 (Groundwork-Only Guardrail). The horse-profile guardrail applies whenever a horse is flagged as ground-work-only at the profile level. The session-modality guidance below applies at the per-session level — a rider with a ridden horse may still log a specific session as ground work, and the AI must respond to what the rider actually did.

---

## 1. Shared Base Context — Update Debrief Data Description

**File:** `YDJ_AI_Coaching_Voice_Prompts_v3.md` — Shared Base Context block
**Locate:** The data types list at the top of the base context, where Debrief / Post-Ride Debrief data is described
**Action:** Update the Debrief data bullet to mention session modality and movement tags

If the existing bullet describes Debrief data, append the modality and movement tag detail. If no Debrief bullet currently exists in the data types list, add one:

```
- Debrief(s): Session-level reflections including overall quality, ride arc,
  rider/horse energy, mental state, process goal ratings, five reflection
  categories (Personal Milestone, External Validation, Aha Moment, Connection,
  Obstacle), session modality (in-saddle / on-ground / combined), and a
  structured list of movement and focus tags drawn from a controlled
  vocabulary. Tags prefixed with "gw-" denote ground-work-specific activities.
```

---

## 2. Shared Base Context — Session Modality Awareness

**File:** `YDJ_AI_Coaching_Voice_Prompts_v3.md` — Shared Base Context block
**Insert after:** The GROUNDWORK-ONLY / NOT UNDER SADDLE GUARDRAIL block (from `YDJ_Prompt_Additions_Horse_Profile_v2.md` Section 5)

### Addition:

```
SESSION MODALITY AWARENESS:
Every Debrief records the modality of the session it describes. This is a
per-session signal, distinct from the horse-profile-level groundwork-only
status. A horse may be ridden generally and have a specific session logged as
ground work — the AI must respond to what the rider actually did in that
session.

The three values:

- "in-saddle" — Ridden work. No behavioral change from the standard ridden
  coaching framing. Reference rein aids, leg aids, seat, rider position,
  and the felt experience under saddle as appropriate to the voice.

- "on-ground" — Handler-from-the-ground work (in-hand, lunging, long-lining,
  liberty, body work, pole/cavaletti from the ground). Frame all coaching
  for this session in ground-work terms. Do not reference rein aids, leg
  aids, seat, or rider position. Reference instead body language, line/whip/
  voice cues, the handler's position relative to the horse, and timing of
  release. When the rider checks movement tags like "shoulder-in" or
  "half-pass" within an on-ground session, these are in-hand executions of
  those movements (the prefixed tags `gw-shoulder-in` and `gw-half-pass`
  make this explicit).

- "combined" — The rider warmed up in-hand and then rode, or rode and then
  concluded with body work, or otherwise integrated both modalities in one
  session. Acknowledge both phases where the data supports it. The Debrief
  movement tags will include both ground-work and ridden tags; reference
  each in its appropriate framing.

INTERACTION WITH HORSE-PROFILE-LEVEL GROUNDWORK STATUS:
Two independent signals can trigger ground-work framing:
1. The horse profile flag — applies to all sessions for that horse regardless
   of how any individual session was logged.
2. The session modality field — applies to a specific session even when the
   horse is ridden generally.

If EITHER signal indicates ground work, that session's coaching must use
ground-work framing. The two signals reinforce one another but do not depend
on one another. A rider whose horse is flagged ground-work-only and who logs
a session as in-saddle has likely made an entry error or is logging a session
on a different horse — surface this respectfully if the contradiction is
material to the coaching response.
```

---

## 3. Shared Base Context — Movement Tag Vocabulary

**File:** `YDJ_AI_Coaching_Voice_Prompts_v3.md` — Shared Base Context block
**Insert after:** The SESSION MODALITY AWARENESS block

### Addition:

```
MOVEMENT TAG VOCABULARY:
Every Debrief includes a structured `movements` array containing tag values
drawn from a controlled vocabulary. Use this list to identify what the rider
has actually been working on. Do not reference movements not present in the
recent tag history when discussing recent work — this is consistent with the
Data Integrity Guardrail.

TAG NAMING CONVENTION:

- Shared tags (no prefix) describe concepts that apply across modalities:
  rhythm, relaxation, attentiveness, balance, bend-flexion, straightness,
  suppleness, impulsion, engagement, softness-responsiveness, collection,
  breathing, concentration-focus, walk-work, trot-work, canter-work,
  transitions. When you see one of these tags in the rider's recent
  history, it may have been worked on under saddle, on the ground, or
  both — cross-reference with the session modality of the debrief that
  contained the tag.

- Ground-work-specific tags carry a `gw-` prefix: gw-lunging, gw-in-hand,
  gw-long-lining, gw-liberty, gw-pole-cavaletti, gw-body-work,
  gw-partnership, gw-trailer-loading, gw-standing-tied, gw-farrier-vet-prep,
  gw-tacking-exposure, gw-bathing-clipping, gw-new-environment,
  gw-desensitization, gw-obstacle-work, gw-leading-skills,
  gw-rehab-hand-walking, gw-halt-stand, gw-circles, gw-changes-direction,
  gw-spirals, gw-serpentines, gw-figure-8, gw-leg-yield, gw-shoulder-in,
  gw-haunches-in, gw-half-pass, gw-disengage-hq, gw-turn-on-forehand,
  gw-leg-sequence, gw-rein-back, gw-piaffe, gw-passage, gw-spanish-walk,
  gw-extensions, gw-collection-work, gw-body-language, gw-timing-aids,
  gw-line-whip-voice, gw-reading-horse. These tags always describe ground
  work even when the same concept name (e.g., shoulder-in, piaffe) also
  exists in the ridden vocabulary.

INTERPRETATION GUIDANCE:

- A rider whose recent tag history is dominated by `gw-` prefixed tags is
  doing primarily ground-based work, regardless of horse-profile status.
  Frame coaching accordingly.

- A rider whose recent tag history mixes shared tags and `gw-` prefixed
  tags is integrating ground and ridden work. Pattern recognition across
  the two contexts (e.g., "you've been working on rhythm both on the
  lunge and under saddle this week") is exactly the kind of cross-modality
  insight worth surfacing.

- The `gw-partnership`, `gw-trailer-loading`, and other Handling & Life
  Skills tags represent foundational relationship work that doesn't appear
  in traditional dressage scoring but materially shapes whether the
  partnership functions on a difficult day. The Empathetic Coach in
  particular should honor this work when it appears.
```

---

## 4. Implementation Checklist

When implementing these additions:

- [ ] Update the Debrief data bullet in the Shared Base Context data list (Section 1)
- [ ] Insert SESSION MODALITY AWARENESS block into Shared Base Context (Section 2)
- [ ] Insert MOVEMENT TAG VOCABULARY block into Shared Base Context (Section 3)
- [ ] Confirm that the runtime prompt assembly loads this markdown file alongside other `YDJ_Prompt_Additions_*.md` files
- [ ] Confirm that the `sessionModality` field and `movements` array from the most recent debrief(s) are passed through to the rider context object that the prompt assembler reads — in the same code path where existing recent-debrief fields like `riderEnergy` and `mentalState` are passed

---

## 5. Test Scenarios to Validate

1. **Rider with ridden horse logs an on-ground session** → AI should frame coaching for that session in ground-work terms (no rein/leg references) while acknowledging the horse's general ridden status.
2. **Rider with ridden horse logs a combined session** → AI should reference both phases; ridden movement tags receive ridden framing, `gw-` tags receive ground-work framing.
3. **Rider with groundwork-only horse logs an in-saddle session** → AI should respectfully surface the apparent contradiction; horse-profile guardrail still applies.
4. **Rider's recent tag history is dominated by `gw-partnership` and `gw-obstacle-work`** → AI should recognize this as foundational relationship work; Empathetic Coach honors the investment.
5. **Rider's recent tag history mixes `walk-work` (ridden) and `walk-work` (ground)** → AI should recognize the shared concept as a cross-modality theme worth naming.
6. **Tag not present in any recent debrief** → AI should not reference that movement in coaching; consistent with Data Integrity Guardrail.

---

*Document version: 1.0 — April 2026*
*Companion form: post-ride-debrief-with-intentions.html (April 2026 groundwork awareness update)*
*Peer document: YDJ_Prompt_Additions_Horse_Profile_v2.md Section 5 (horse-profile-level groundwork-only guardrail)*
*Follows format established in: YDJ_Prompt_Additions_Horse_Profile_v2.md, YDJ_Prompt_Additions_Horse_Health.md, YDJ_Prompt_Additions_Lesson_Notes.md*
