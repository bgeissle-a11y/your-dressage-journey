/**
 * Process Lesson Transcript — AI-powered transcript organization
 *
 * Accepts a raw lesson transcript (pasted text from any transcription service)
 * and uses Claude to organize it into three structured sections:
 * - Movement Instructions
 * - Instructional Cues & Corrections
 * - Coach's Eye (imagery, horse observations, praise, principles)
 *
 * Raw transcripts are NOT stored. Only the structured output is returned
 * to the client for review and editing before the rider saves.
 *
 * Input (onCall):  { transcript, horseName, instructorName }
 * Output:          { movementInstructions, cuesCorrections, coachesEye }
 */

const { HttpsError } = require("firebase-functions/v2/https");
const { validateAuth } = require("../lib/auth");
const { wrapError } = require("../lib/errors");
const { callClaude } = require("../lib/claudeCall");

function buildTranscriptPrompt(transcript, horseName, instructorName) {
  return `You are processing a dressage lesson transcript. The horse's name is ${horseName}. The instructor's name is ${instructorName}.

===============================================================
STEP 1 — FIND WHERE THE LESSON ENDS
===============================================================
Before processing anything, identify where the instructional content ends and non-lesson conversation begins. Signal words that indicate the lesson is over: scheduling talk, travel plans, personal conversation, goodbyes, "bon voyage," "have a great trip," "see you next time," and similar. Everything after the last riding instruction is ignored completely. Do not extract anything from post-lesson conversation.

===============================================================
STEP 2 — IDENTIFY THE INSTRUCTOR'S VOICE
===============================================================
The transcript may have no speaker labels. Identify the instructor's voice by role: the instructor gives directions, corrections, and technical feedback. The rider's voice is brief acknowledgments ("yeah," "okay," "got it"), questions, and self-observations.

SAME-NAME SITUATION: If the instructor and rider share the same name, ignore names entirely and identify speakers by role only. The instructor is always the one directing the work.

RIDER SELF-INSIGHT: Flag any moment where the rider articulates their own understanding of a problem or breakthrough — especially when the instructor confirms it. These exchanges are high-value learning moments and belong in the output.

===============================================================
STEP 3 — CORRECT DRESSAGE TERMINOLOGY SILENTLY
===============================================================
Transcription tools reliably mangle dressage terms. Correct the following silently in all output — do not flag corrections, just use the correct term:

| Transcribed as               | Correct term     | Rule                                              |
|------------------------------|------------------|---------------------------------------------------|
| hunches in / punches in      | haunches-in      | Always correct                                    |
| vault / a vault              | volte            | Always correct                                    |
| half fault                   | half-halt        | Always correct                                    |
| Piaf                         | piaffe           | Always correct                                    |
| massage                      | passage          | Always correct                                    |
| cancer / the cancer          | canter           | Always correct                                    |
| rain / brain                 | rein             | Always correct                                    |
| gate / maintain gate /       | gait             | Always correct                                    |
| break gate                   |                  |                                                   |
| left frame / right frame     | left rein /      | CONTEXTUAL ONLY — "frame" used alone (e.g.        |
|                              | right rein       | "stay in the frame," "rounder frame") is correct  |
|                              |                  | dressage terminology and must NOT be changed.     |
|                              |                  | Only correct when "left" or "right" precedes it.  |

If you encounter other clearly mangled dressage terms not on this list, correct them using your knowledge of correct dressage terminology.

Also ignore and do not include in output:
- Transcription service headers/footers (e.g. "Transcribed by TurboScribe...")
- Rhythm artifacts ("tap, tap, tap," "good, good, good," "yeah, yeah, yeah" as real-time encouragement)
- Rider acknowledgments ("okay," "yep," "got it") unless they introduce a rider self-insight

===============================================================
STEP 4 — BUILD THE OUTPUT
===============================================================
Return ONLY a valid JSON object with exactly three fields: movementInstructions, cuesCorrections, coachesEye. No preamble, no markdown fences, no explanation outside the JSON.

---

FIELD 1: movementInstructions
Structure this field in two tiers, using these exact headers:

THIS SESSION'S FOCUS
Identify 1–3 movements or exercises that were the backbone of the lesson. A movement qualifies for this tier if:
- The instructor returned to it multiple times
- Other exercises were built upon it or used as preparation for it
- The instructor explicitly named it as the day's priority
- The most technically complex work in the lesson traced back to it

For each focus movement, write a short paragraph (3–6 sentences) covering:
- What the movement or exercise was
- What the instructor asked for specifically
- Any progression built within it (e.g. single attempt → repeated sequence → more complex variation)
- The key correction or insight that defined how it was addressed today

ALSO ADDRESSED
A single condensed line listing any other movements or exercises mentioned. No detail. Just names. If nothing else was addressed, omit this section entirely.

---

FIELD 2: cuesCorrections
Structure this field in two tiers, using these exact headers:

TAKE INTO YOUR NEXT RIDE
Select 3–5 cues that the rider should carry forward. A cue qualifies for this tier if it meets one or more of these criteria:
- Repeated by the instructor more than once during the session [mark: PRIORITY]
- Introduced late in the lesson as a key insight or refinement
- Explicitly flagged by the instructor ("remember this," "don't forget," "this is the key thing")
- Confirmed by the rider as a moment of understanding ("I see," "that makes sense" followed by instructor confirmation)
- Has clear transfer value to solo practice — something the rider can apply without the instructor present

Preserve the instructor's exact phrasing where it is distinctive or memorable. Coaching language that "clicks" has specific wording attached to it.

IN-SESSION CORRECTIONS
A condensed list of remaining corrections given during the session. These were contextual — they were made and addressed in the moment. Present as brief single-line entries. Do not repeat anything already in "Take Into Your Next Ride."

---

FIELD 3: coachesEye
Write this field in flowing prose, not a list. Include only content with specific coaching value — no generic praise.

Include:
- Observations about ${horseName}'s way of going, tension, suppleness, asymmetry, or energy today
- Imagery or metaphors the instructor used to describe a movement or feeling
- Moments the instructor specifically identified as improved or well-executed (with enough context to understand why)
- Biomechanical observations about the horse — evasion patterns, which direction is harder, physical tendencies
- Any broader training principle or philosophical point the instructor made

RIDER BREAKTHROUGH (include as a final paragraph if present, with that label):
If the rider articulated their own understanding of a problem or insight during the lesson — and the instructor confirmed it — capture that exchange here in 2–3 sentences. Use the rider's own words where possible. This is the highest-value learning moment in any lesson.

If nothing qualifies for Coach's Eye, return an empty string for this field.

===============================================================
REQUIRED OUTPUT FORMAT
===============================================================
{
  "movementInstructions": "THIS SESSION'S FOCUS\\n\\n[content]\\n\\nALSO ADDRESSED\\n[content]",
  "cuesCorrections": "TAKE INTO YOUR NEXT RIDE\\n\\n[content]\\n\\nIN-SESSION CORRECTIONS\\n[content]",
  "coachesEye": "[content]"
}

TRANSCRIPT:
${transcript}`;
}

/**
 * Cloud Function handler for transcript processing.
 *
 * @param {object} request - Firebase v2 onCall request
 * @returns {Promise<object>} Parsed transcript fields
 */
async function handler(request) {
  try {
    const uid = validateAuth(request);
    const { transcript, horseName, instructorName } = request.data || {};

    if (!transcript || transcript.length < 100) {
      throw new HttpsError("invalid-argument", "Transcript too short or missing.");
    }

    const userMessage = buildTranscriptPrompt(
      transcript,
      horseName || "the horse",
      instructorName || "the instructor"
    );

    const parsed = await callClaude({
      system: "You are a dressage lesson transcript processor. Return only valid JSON with the three requested fields: movementInstructions, cuesCorrections, coachesEye.",
      userMessage,
      model: "claude-sonnet-4-6",
      jsonMode: true,
      maxTokens: 5000,
      context: "processLessonTranscript",
      uid,
    });

    return {
      movementInstructions: parsed.movementInstructions || "",
      cuesCorrections: parsed.cuesCorrections || "",
      coachesEye: parsed.coachesEye || "",
    };
  } catch (error) {
    throw wrapError(error, "processLessonTranscript");
  }
}

module.exports = { handler };
