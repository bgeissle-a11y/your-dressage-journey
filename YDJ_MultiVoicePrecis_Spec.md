# YDJ — Multi-Voice Coaching Précis
# Specification

**Version:** 1.0
**Date:** May 2026
**Status:** Final — ready for implementation
**Output type:** A compressed (~200 word) summary of the most recent Multi-Voice Coaching generation. Generated and cached alongside the full Multi-Voice output. Read by downstream prompts that need rider context but cannot afford to ingest the full output.
**Reference files:**
- `YDJ_Platform_Outputs_Definition_v2_docx.md` (Multi-Voice Coaching definition — four voice API calls)
- `YDJ_Voice_Integration_Update.docx` (voice characteristics)
- `YDJ_AI_Coaching_Voice_Prompts_v3.md` (voice voice definitions)
- `YDJ_WeeklyFocus_Implementation_Brief.md` Section 1a (precedent for "add a field to the existing Cloud Function" pattern)
- `YDJ_MicroDebrief_EmpatheticResponse_PromptSpec.md` (consumer)
- `YDJ_FreshStart_EmpatheticResponse_PromptSpec_v1_1.md` (consumer)

---

## What This Spec Defines

The Multi-Voice Coaching Cloud Function currently produces four full voice analyses (Technical, Empathetic, Classical Master, Practical Strategist) — typically 400-600 words per voice, ~2000 words total. Two new prompts in the YDJ system — the Micro-Debrief Empathetic Response and the Fresh Start Empathetic Response — need rider coaching context to produce state-aware responses, but cannot afford to ingest the full Multi-Voice output. Sending 2000 words of context for a 50-word reward response is wasteful (token cost) and harmful (the AI tends to engage with the volume of context it's given, producing over-engaged responses).

The précis is the bridge: a ≤200-word compressed summary of the current Multi-Voice picture, generated as an additional field on the Multi-Voice Cloud Function output and cached in Firestore alongside the full output. Downstream prompts read the précis instead of the full analyses.

This spec defines:
- What the précis must contain
- What the précis must NOT contain
- How it integrates into the existing Multi-Voice Cloud Function
- The Firestore field structure
- Token budget and cost impact
- Migration strategy for existing riders

This spec does NOT change the four voice analyses themselves. The Multi-Voice Coaching output continues to produce its four full voice JSONs exactly as it does today. The précis is purely additive.

---

## Architectural Principles

These principles govern every choice in the spec.

**1. The précis is a faithful summary, not new analysis.** Every observation in the précis must be traceable to content in the four full voice analyses generated in the same run. The précis adds no new claims, no new patterns, no new advice. It is compression, not synthesis-of-fresh-thought.

**2. The précis covers the gestalt across all four voices, not any single voice.** It is not "the Empathetic Coach précis" or "the Technical Coach précis." It is the unified picture that emerges when all four voice analyses are read together. This is critical because downstream consumers (the micro-debrief and Fresh Start prompts) need rider context, not voice-specific perspective — they have their own voice (always Empathetic Coach) and don't need another voice imposed on the context.

**3. Bias toward what's currently true, not what's been historically true.** The précis describes where this rider is *now* — the current focus, the current trajectory, the current open questions. Historical context is in the Journey Map (already a separate field). The précis is point-in-time.

**4. Faithful to the data; honest about its limits.** If the four voice analyses themselves hedge (e.g., "early signs suggest..." rather than "the rider has..."), the précis preserves the hedging. If the analyses identify a tension or open question, the précis names it as a tension or open question, not as a resolved finding.

**5. Token budget is a real ceiling, not a guideline.** The précis is read by prompts that themselves have tight token budgets. A précis that drifts to 300 or 400 words defeats the architecture's purpose. 200 words is the hard cap.

---

## What the Précis Must Contain

The précis covers four distinct slices of the rider's current picture. Together they give a downstream prompt enough context to know "where this rider is" without needing the full Multi-Voice output.

### 1. Current focus (1-2 sentences)

What the rider is actively working on right now, in the saddle, across recent debriefs. This is the answer to the question: *"If a coach were briefing a substitute trainer about this rider for one ride, what would they say the rider is currently working on?"*

Drawn from: Practical Strategist's `priorities` field, Technical Coach's `technical_priorities` field, and the most recurring themes across recent debriefs as reflected in the Empathetic Coach analysis.

**Example:** *"Currently consolidating the falling-down neck with Rocket Star, with one-tempi changes coming online and right-side asymmetry showing up as the connection deepens."*

### 2. Trajectory direction and qualifier (1 short sentence)

A brief characterization of where the rider is on their arc — ascending, plateauing, in a hard stretch, in a breakthrough phase, etc. The précis does NOT use the same one-word trajectory label that the Journey Map produces (those are categorical: ascending/plateau/descending/mixed). Instead, it gives a sentence-level texture: not just direction, but direction *qualified by what's happening.*

Drawn from: the synthesis of all four voice analyses; particularly the Empathetic Coach's `confidence_trajectory` and the Classical Master's `classical_assessment`.

**Example:** *"On a steady ascending arc — the technical work is consolidating faster than the rider's confidence in it."*

### 3. Open questions or tensions (1-2 sentences)

Things the four voices identified as unresolved, contradictory, or worth watching. This is the most important slice for downstream context, because the micro-debrief and Fresh Start prompts use it to determine whether a new entry "fits" the picture or "diverges from" the picture. If the picture has open questions, divergence is less surprising.

Drawn from: any voice's identification of tensions, plateaus, or contradictions; the Practical Strategist's `priorities` (often where unresolved themes live); the Empathetic Coach's `mindset_suggestions` (often where confidence/competence gaps live).

**Example:** *"Open question whether the right-side asymmetry is a worsening pattern or simply becoming visible as connection improves. The rider's self-perception remains more conservative than the data warrants."*

### 4. What would constitute a meaningful shift (1-2 sentences)

A brief statement of what kinds of changes in the rider's data would represent a meaningful update to the current picture. This is the hedging clause that lets downstream prompts respond appropriately when a new entry contradicts the picture — they need to know what kind of contradiction would be meaningful versus what kind would be noise.

Drawn from: the synthesis across voices — particularly any voice's identification of "watch for X" or "the test will be Y."

**Example:** *"A meaningful shift would be sustained low confidence across multiple debriefs (not just one rough day), or technical regressions in movements that have been reliable. A single hard ride is weather, not climate."*

### Combined word budget

All four slices together: 150-200 words. Not all slices need to be the same length; some riders' current pictures will lean heavily on tensions (slice 3), others on focus (slice 1). The AI should write naturally, prioritizing accuracy over balance.

---

## What the Précis Must NOT Contain

These prohibitions are absolute.

**1. No voice attribution.** The précis is written in plain coaching language, not in any of the four voice characters. It does NOT say "the Technical Coach observed..." or open with the Empathetic Coach's catchphrase. Voice attribution is for the full output; the précis is voice-agnostic context.

**2. No new claims.** Every observation must trace to content in the four voice analyses produced in the same run. If the précis says "right-side asymmetry is becoming visible," that observation must exist somewhere in the four full analyses. The précis compresses; it does not extend.

**3. No advice or prescription.** The précis is descriptive, not prescriptive. It does not say "the rider should..." or "next, the rider needs to..." It describes the picture; downstream prompts decide what to do with the picture.

**4. No quoted rider language.** The full Multi-Voice analyses may quote the rider's debriefs and reflections. The précis does not. Quoting requires word budget the précis cannot afford and creates fragility (the same quote appearing in multiple downstream surfaces feels mechanical).

**5. No reference to specific dates or specific rides.** The précis describes a current state, not a chronology. "Currently consolidating the falling-down neck" not "April 28's debrief showed the falling-down neck for the third consecutive ride." Specifics belong to the full output.

**6. No mention of the rider by name.** Use neutral subject construction ("currently consolidating," "open question") rather than naming. This keeps the précis usable across different downstream surfaces without awkward grammatical work.

**7. No reference to horses, trainers, or other named entities unless essential.** Generally avoid. If the rider works exclusively with one horse and the picture is meaningfully horse-specific (e.g., "with the new horse, the connection work is starting from earlier in the training scale"), naming the horse is acceptable. Default is no names.

**8. No headers, bullet points, or markdown.** The précis is read by an LLM that does not benefit from formatting cues. Plain prose, three to five sentences total. Period.

---

## Cloud Function Integration

The précis is generated as part of the existing Multi-Voice Coaching Cloud Function, NOT as a separate function. This follows the precedent established in `YDJ_WeeklyFocus_Implementation_Brief.md` Section 1a (Weekly Focus Excerpt field).

### What changes in the Cloud Function

**Current flow:**
```
1. Pre-process rider data
2. Call 1: Technical Coach → JSON
3. Call 2: Empathetic Coach → JSON
4. Call 3: Classical Master → JSON
5. Call 4: Practical Strategist → JSON
6. Combine into single document
7. Write to Firestore
```

**New flow:**
```
1. Pre-process rider data
2. Call 1: Technical Coach → JSON
3. Call 2: Empathetic Coach → JSON
4. Call 3: Classical Master → JSON
5. Call 4: Practical Strategist → JSON
6. NEW Call 5: Précis generation → string
   Input: the four voice JSONs from steps 2-5
   Output: a 150-200 word précis string
7. Combine into single document including new precis field
8. Write to Firestore
```

### Précis generation prompt

This is a separate, compact prompt. It runs on Sonnet (not Opus) — the task is summarization, not analysis, and Sonnet handles it well at much lower cost.

```
SYSTEM PROMPT (Multi-Voice Précis)

You are summarizing a rider's current coaching picture. Below are
four coaching analyses, one from each voice on the YDJ coaching
team. Your job is to produce a single ≤200-word summary that
captures the gestalt across all four voices — the unified picture
of where this rider is right now.

This summary is read by other AI prompts that need rider context
but cannot afford to ingest the full analyses. It must be faithful
to the analyses, point-in-time (where the rider is now, not their
history), and voice-agnostic (no voice attribution, no
catchphrases).

INPUT

Technical Coach analysis: [JSON]
Empathetic Coach analysis: [JSON]
Classical Master analysis: [JSON]
Practical Strategist analysis: [JSON]

YOUR TASK

Produce a précis (3-5 sentences, 150-200 words total) covering
four slices in order:

1. CURRENT FOCUS (1-2 sentences)
What the rider is actively working on right now, in the saddle.

2. TRAJECTORY (1 short sentence)
A sentence-level characterization of where the rider is on their
arc — direction qualified by what's happening. Not a one-word
label.

3. OPEN QUESTIONS OR TENSIONS (1-2 sentences)
Things the analyses identified as unresolved, contradictory, or
worth watching. This slice is the most important for downstream
prompts; it tells them what kinds of new entries should and
shouldn't surprise them.

4. WHAT A MEANINGFUL SHIFT WOULD LOOK LIKE (1-2 sentences)
What kinds of changes in this rider's data would constitute a
real update to this picture, versus noise. Use hedging language
that respects single-entry limits.

RULES

Always:
- Stay under 200 words
- Trace every observation to content in the four analyses
- Write in plain coaching language, no voice attribution
- Use point-in-time framing ("currently...", "open question is...")
- Preserve hedging if the source analyses hedge

Never:
- Introduce new observations not in the source analyses
- Use voice catchphrases ("you've got this," "why not the first
  time?", etc.)
- Quote the rider's words from debriefs
- Give advice or prescription
- Reference specific dates or specific rides
- Use the rider's name
- Use markdown, headers, or bullet points
- Use horse or trainer names unless essential to the picture

OUTPUT FORMAT

Plain prose. Three to five sentences. 150-200 words.
```

### Firestore document schema

The précis is added to the existing Multi-Voice Coaching document as a new top-level field. No new collection is created.

```
analysis/multiVoiceCoaching/{userId}: {
  // EXISTING FIELDS (unchanged)
  technicalCoach: { ... },
  empatheticCoach: { ... },
  classicalMaster: { ... },
  practicalStrategist: { ... },
  weeklyFocusExcerpt: { voice, text },     // from Weekly Focus brief
  generatedAt: timestamp,

  // NEW FIELD
  precis: string,                          // ≤200 words, plain prose
  precisGeneratedAt: timestamp             // matches generatedAt; included for clarity
}
```

The précis is regenerated every time the full Multi-Voice Coaching regenerates. There is no separate cadence for the précis — it always reflects the most recent full output.

### Backwards compatibility

Riders whose Multi-Voice document predates this change will not have a `precis` field. Downstream consumers (micro-debrief, Fresh Start) must handle this gracefully:

- If `precis` is absent OR is null/empty, the consumer falls back to operating without cached coaching context — same behavior as a rider whose Multi-Voice has not yet generated.
- The next regeneration of Multi-Voice (whenever the rider's activity triggers it per the standard cadence) populates the field.

No migration job is needed. Riders backfill naturally as their Multi-Voice generates over normal cadence. For riders who haven't crossed the regeneration trigger in a long time, the absence of a précis is acceptable — they'll backfill when they re-engage.

---

## Token Budget and Cost Impact

The précis adds one additional API call per Multi-Voice generation.

**Per-generation cost addition:**
- Input: ~2000 tokens (the four voice JSONs)
- Output: ~280 tokens (200 words plus structural overhead)
- Model: Sonnet
- Cost per call: ~$0.012 at current Sonnet pricing

**Per-rider monthly addition:**
- Working tier (max 1 Multi-Voice/month): ~$0.012/month
- Medium tier (typical 2-4 Multi-Voice/month): ~$0.024–$0.048/month
- Extended tier (typical 4-8 Multi-Voice/month): ~$0.048–$0.096/month

**At pilot scale (12 riders):** ~$0.50/month total. Negligible.

**At launch scale (~100 IC riders):** ~$3-5/month total. Negligible.

**At growth scale (~1,000 active riders, mixed tier):** ~$30-50/month total. Still well within token budget noise.

The précis cost is tracked in the Multi-Voice Coaching cost line, not as a separate line item, since it shares the same trigger as the full output.

---

## Quality Benchmarks

The précis is evaluated against these criteria. Manual sampling of 20 généré précis during pilot calibration is recommended.

**Faithfulness.** Every observation in the précis must be traceable to content in the four source analyses. Sample test: pick a précis, pick a sentence, find the supporting observation in the four full analyses. If you can't find it, the précis hallucinated.

**Compression quality.** A 200-word précis should reduce 2000 words of analysis without losing what a downstream prompt needs to know. Sample test: read a précis cold (without reading the full analyses); does it convey enough about where the rider is to inform a thoughtful response to a new debrief? If not, compression failed.

**Voice neutrality.** The précis should NOT sound like any of the four voices. Sample test: ask a reader familiar with the four voices to identify which voice wrote the précis. The correct answer is "none — it's voice-agnostic." If the reader thinks it sounds like the Empathetic Coach (most common drift), the précis has voice contamination.

**Hedging preservation.** If the source analyses hedge, the précis hedges. Sample test: count hedge phrases ("appears to," "early signs of," "open question," etc.) in the précis vs the source analyses. Roughly proportional.

**Word count.** Hard cap 200; aim for 150-180. Anything over 200 is a quality failure.

---

## Edge Cases

**Sparse rider data (early in journey):**
A rider whose Multi-Voice was generated with thin data (just over the 5-debrief threshold) will produce sparse voice analyses. The précis should reflect that sparsity — short observations, more hedging, more "open questions" than "current focus." If the four voices themselves say "early to draw conclusions," the précis says the same.

**Voice analysis with very different conclusions:**
Sometimes the four voices land on meaningfully different framings of the rider's state. The précis should preserve this — naming it explicitly as an open tension. Example: *"The technical view sees consolidation; the psychological view sees a confidence gap that the technical work hasn't yet closed. Open question whether the next month's data resolves this tension or deepens it."*

**One voice contradicts the others:**
This is unusual but possible. The précis should flag the divergence. The downstream consumer needs to know the picture has internal tensions; smoothing them over would produce a misleading précis.

**Rider on a major plateau or in a difficult phase:**
The précis should not be artificially upbeat. If the analyses describe stagnation, frustration, or a rough patch, the précis describes the same — without judgment. Example: *"In a difficult stretch — the consolidation work has stalled and confidence is below recent baseline. The picture is one of a rider in a real plateau, not a passing rough day."*

---

## Implementation Notes

**Précis is generated synchronously after the four voice calls.**
The Cloud Function should not return until the précis is generated. Downstream consumers expect both the full output and the précis to exist in the same document; eventual-consistency between them creates race conditions in the micro-debrief response path.

**Précis is regenerated, not patched.**
On every Multi-Voice regeneration, the précis is fully regenerated from the new four voice analyses. There is no incremental update. This keeps the précis trivially in sync with the full output.

**Failure modes:**
- If précis generation fails (API error, rate limit), the Multi-Voice generation should still succeed and write to Firestore with the précis field absent or null. The full output is the more important artifact; the précis is a supporting artifact. Better to have the full output without the précis than to fail both.
- The Cloud Function should log précis generation failures separately so they can be monitored. A persistent failure rate above 1-2% indicates a prompt or input problem worth investigating.

**Précis is NOT visible to the rider.**
The précis is internal infrastructure — it is read by other AI prompts but never displayed in the UI. Riders see the full Multi-Voice output, the Weekly Focus excerpt, and other surfaces that draw from the full output. They do not see the précis. This means the précis can be optimized for AI consumption (compact, dense, voice-neutral) without UX considerations.

**No tier gating on the précis itself.**
The précis exists for every rider who has a Multi-Voice generation, regardless of tier. Tier-based access controls the *full* Multi-Voice output, not the précis. (In practice this means Working-tier riders have a précis from their monthly Multi-Voice, Medium-tier riders have a précis from their more frequent Multi-Voice, and Extended-tier riders have a précis that updates with manual regenerations.)

**Coordination with Weekly Focus Excerpt:**
The Multi-Voice Cloud Function already produces a `weeklyFocusExcerpt` field per the Weekly Focus brief. The précis is a separate, additional field. They are NOT redundant: the Weekly Focus Excerpt is a single voice-attributed coaching observation for rider-facing display; the précis is a multi-voice synthesized summary for AI-internal context. Both are generated in the same run, both are cached on the same document.

---

## What's Out of Scope for This Spec

- **Précis access from non-AI surfaces.** The précis is for AI consumption only. No UI surface displays it. If a future feature needs a "summary of where the rider is" for the rider's eyes, that's a different artifact with different requirements (rider-facing language, voice attribution probably appropriate, longer length budget).
- **Précis regeneration outside Multi-Voice cadence.** The précis is fully tied to the Multi-Voice cadence. No separate trigger.
- **Précis for First Light.** First Light has its own thin-data handling already specified in the micro-debrief and Fresh Start specs (`riderState: new_with_first_light`). It does not need a précis.
- **Précis for Journey Map, GPT, or other outputs.** Each of these outputs has its own structure and its own consumers. If a future need arises (e.g., a downstream prompt needing GPT context), a separate précis spec would be drafted then. This spec covers the Multi-Voice case only.
- **Multi-language précis.** Out of scope for v1.

---

## What This Spec Connects To

**Inputs to:**
- `YDJ_MicroDebrief_EmpatheticResponse_PromptSpec.md` (Section: Cached Coaching Context — précis is the field this spec references)
- `YDJ_FreshStart_EmpatheticResponse_PromptSpec_v1_1.md` (Section: Cached Coaching Context — same)

**Builds on:**
- `YDJ_WeeklyFocus_Implementation_Brief.md` Section 1a (precedent for "add a field to the existing Cloud Function" pattern)

**Will be referenced by:**
- The forthcoming Habit Loop Implementation Brief (which packages the micro-debrief and Fresh Start work for Claude Code)

---

## Implementation Checklist

Build order:

1. Update Multi-Voice Coaching Cloud Function to add Call 5 (précis generation) after the four voice calls.
2. Add `precis` and `precisGeneratedAt` fields to the Multi-Voice Coaching document schema.
3. Test précis generation against 5-10 existing riders with varied data profiles (sparse, rich, plateau, ascending). Manually evaluate against the quality benchmarks above.
4. Update Multi-Voice Coaching cost monitoring to track the additional Sonnet call.
5. Document the précis field in the engineering reference for the Cloud Function.

This work can ship independently of the micro-debrief and Fresh Start implementations. In fact, it should ship first — both consumer prompts depend on the précis existing, and the natural backfill cadence means it's worth landing the producer change before the consumer changes are deployed.

**Recommended pilot validation:**
- After deploying, force-regenerate Multi-Voice for 3-5 pilot riders and inspect the resulting précis.
- Confirm faithfulness, compression, voice neutrality, hedging preservation, and word count for each.
- If quality is acceptable, proceed to micro-debrief and Fresh Start implementations.
- If quality issues surface, iterate on the précis prompt before proceeding.

---

*End of spec. Ready for implementation. The précis is the precursor change that unblocks the micro-debrief and Fresh Start implementations; landing it cleanly is the gate for those features.*
