/**
 * lastRegenError — record/clear the most recent regen failure for a user.
 *
 * Lives at `users/{uid}/lastRegenError/{outputType}` (one doc per output).
 * Read-only for the authenticated user (see firestore.rules); writes happen
 * exclusively from Cloud Functions via the admin SDK.
 *
 * Used by the AI coaching panels to render a rider-visible "Your last
 * refresh attempt didn't complete" banner so an Anthropic 500 / budget
 * cap / malformed-JSON failure leaves a signal even after the rider
 * navigates away mid-attempt (B19).
 */

const { db } = require("./firebase");

const MAX_MESSAGE_LENGTH = 200;

/**
 * @param {string} uid
 * @param {string} output - e.g. "coaching", "journeyMap", "grandPrixThinking"
 * @param {Error} err
 */
async function writeLastRegenError(uid, output, err) {
  if (!uid || !output) return;
  const rawMessage = typeof err?.message === "string" && err.message.trim()
    ? err.message.trim()
    : "An unexpected error occurred while refreshing.";
  const message = rawMessage.length > MAX_MESSAGE_LENGTH
    ? rawMessage.slice(0, MAX_MESSAGE_LENGTH - 1) + "…"
    : rawMessage;
  const code = typeof err?.code === "string" ? err.code : null;

  try {
    await db
      .collection("users").doc(uid)
      .collection("lastRegenError").doc(output)
      .set({
        at: new Date().toISOString(),
        output,
        message,
        code,
      });
  } catch (writeErr) {
    // Non-fatal — telemetry only. Don't let an error-recording failure
    // mask the original error we're about to throw.
    console.error(`[lastRegenError] failed to record for ${uid}/${output}:`, writeErr.message);
  }
}

/**
 * Clear the lastRegenError doc for an output after a successful regen.
 */
async function clearLastRegenError(uid, output) {
  if (!uid || !output) return;
  try {
    await db
      .collection("users").doc(uid)
      .collection("lastRegenError").doc(output)
      .delete();
  } catch (clearErr) {
    console.error(`[lastRegenError] failed to clear for ${uid}/${output}:`, clearErr.message);
  }
}

module.exports = { writeLastRegenError, clearLastRegenError };
