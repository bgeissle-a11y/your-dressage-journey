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

CONTEXT: This is a raw audio transcript of a dressage lesson. It may contain:
- No speaker labels (unlabeled running text is the most common format)
- Transcription service headers/footers — ignore these completely
- Repeated real-time rhythm words ("tap, tap, tap," "good, good, good," "yeah, yeah") — these are coaching rhythms, not instructions; filter them out or condense to a single instance
- Mangled dressage terminology — common errors: "hunches in" = haunches-in, "vault" = volte, "half fault" = half-halt, "punches in" = haunches-in, "Piaf" = piaffe, "massage" = passage. Correct these silently in the output.
- Rider acknowledgments ("yeah," "okay," "got it") mixed in — these are the rider speaking, not the instructor; ignore them

IDENTIFYING THE INSTRUCTOR'S VOICE: When there are no speaker labels, the instructor's voice is the one giving directions, corrections, and feedback. The rider's voice is brief acknowledgments. Focus only on what the instructor said.

Your task is to organize this transcript into three structured sections. Return ONLY a JSON object with exactly three fields: movementInstructions, cuesCorrections, coachesEye. No preamble, no markdown fences, no explanation — only valid JSON.

MOVEMENT INSTRUCTIONS
Extract each movement or exercise the instructor addressed. For each:
- Name the movement using correct dressage terminology (correct any transcription errors)
- Describe what the instructor asked for, including how the exercise was to be ridden
- Note if it was returned to or emphasized multiple times — mark these with [PRIORITY]
- Note any progressions built within the exercise (e.g. single quarter pirouette → two consecutive quarters)
Format as a plain text list, one movement per paragraph. Do not use bullet symbols.

INSTRUCTIONAL CUES & CORRECTIONS
Extract the specific verbal cues, corrections, and instructions the instructor gave.
- Preserve the instructor's exact phrasing where distinctive or memorable — these phrasings have coaching value
- Mark any cue that appeared more than once with [PRIORITY]
- Include brief positive feedback when it accompanied a specific correction or movement ("nice," "yes," "that's it") — mark these as [PRAISE]
- Do NOT include filler affirmations ("good, good, good") that were real-time encouragement without specific content
Format as a plain text list, one cue per line. Do not use bullet symbols.

COACH'S EYE
Extract anything the instructor said about:
- The horse's way of going, tension, suppleness, energy, or physical state
- Imagery or metaphors used to describe a movement or feeling
- Moments where the instructor specifically noted improvement or quality ("that was lovely," "nice, on the money")
- Any biomechanical observation about the horse (e.g. which direction the horse evades, asymmetry, willingness)
- Any broader training principle or philosophical comment
Do not include generic praise. Only observations with specific content.
If nothing fits this category, return an empty string for this field.

JSON format required:
{
  "movementInstructions": "...",
  "cuesCorrections": "...",
  "coachesEye": "..."
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
