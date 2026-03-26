/**
 * Visualization Script API
 *
 * Generates a personalized PETTLEP mental rehearsal script for a dressage
 * movement. Fetches rider context (profile, horse, debriefs, observations,
 * physical assessment), builds a focused prompt, and returns a structured
 * JSON script with timed blocks.
 *
 * Input:  { formData: { movement, movementSub?, movementSub2?, problemFocus,
 *           referenceType, referenceText?, context, sensoryPreference?,
 *           scriptLength } }
 * Output: { success, script: { title, totalMinutes, blocks[], reflectionPrompt,
 *           recordingTip } }
 */

const { HttpsError } = require("firebase-functions/v2/https");
const { validateAuth } = require("../lib/auth");
const { wrapError } = require("../lib/errors");
const { callClaude } = require("../lib/claudeCall");
const { buildVisualizationScriptPrompt } = require("../lib/promptBuilder");
const { db } = require("../lib/firebase");

/**
 * Fetch focused rider context for the visualization script prompt.
 * Lighter than prepareRiderData — only the fields the script needs.
 */
async function fetchVisualizationContext(uid, formData) {
  // Fetch rider profile, horse profile, recent debriefs, lesson notes, physical assessment
  const [
    riderSnap,
    horseSnap,
    debriefSnap,
    lessonSnap,
    physicalSnap,
  ] = await Promise.all([
    db.collection("riderProfiles")
      .where("userId", "==", uid)
      .get(),
    db.collection("horseProfiles")
      .where("userId", "==", uid)
      .get(),
    db.collection("debriefs")
      .where("userId", "==", uid)
      .get(),
    db.collection("lessonNotes")
      .where("userId", "==", uid)
      .get(),
    db.collection("physicalAssessments")
      .where("userId", "==", uid)
      .get(),
  ]);

  // Filter out soft-deleted docs (no composite index needed)
  const filterActive = (snap) => snap.docs.filter(d => !d.data().isDeleted);

  const activeRiders = filterActive(riderSnap);
  const activeHorses = filterActive(horseSnap);

  // Require rider + horse profiles
  if (activeRiders.length === 0 || activeHorses.length === 0) {
    throw new HttpsError(
      "failed-precondition",
      "Please complete your Rider Profile and Horse Profile before generating a visualization script."
    );
  }

  const riderProfile = activeRiders[0].data();
  const horseProfile = activeHorses[0].data();

  // Process debriefs — filter soft-deleted, sort by date descending, limit to 10
  const debriefs = filterActive(debriefSnap)
    .map(d => d.data())
    .sort((a, b) => (b.rideDate || b.date || "").localeCompare(a.rideDate || a.date || ""))
    .slice(0, 10);

  const movementSpecificDebriefs = debriefs.filter(d => {
    const movements = d.movements || d.movementTags || [];
    return movements.some(m => {
      const tag = typeof m === "string" ? m : m.value || m.tag || "";
      return tag.toLowerCase().includes(formData.movement.replace(/-/g, " "))
        || tag.toLowerCase().includes(formData.movement.replace(/-/g, ""));
    });
  });

  // Process lesson notes — filter soft-deleted, sort by date descending, limit to 5
  const lessonNotes = filterActive(lessonSnap)
    .map(d => d.data())
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .slice(0, 5);

  // Physical assessment
  const activePhysical = filterActive(physicalSnap);
  const physicalAssessment = activePhysical.length > 0 ? activePhysical[0].data() : null;

  return {
    riderProfile,
    horseProfile,
    movementSpecificDebriefs,
    lessonNotes,
    physicalAssessment,
  };
}

/**
 * Determine max tokens based on script length.
 */
function getMaxTokens(scriptLength) {
  return { short: 1400, standard: 2000, extended: 2800 }[scriptLength] || 2000;
}

/**
 * Cloud Function handler for Visualization Script generation.
 */
async function handler(request) {
  try {
    const uid = validateAuth(request);
    const { formData } = request.data || {};

    if (!formData || !formData.movement || !formData.problemFocus ||
        !formData.referenceType || !formData.context) {
      throw new HttpsError(
        "invalid-argument",
        "Missing required form fields: movement, problemFocus, referenceType, context."
      );
    }

    // Fetch rider context
    const riderContext = await fetchVisualizationContext(uid, formData);

    // Build prompt
    const { system, userMessage } = buildVisualizationScriptPrompt(formData, riderContext);

    // Call Claude
    const scriptLength = formData.scriptLength || "standard";
    console.log(`[visualizationScript] Generating ${scriptLength} script for movement: ${formData.movement}`);

    const script = await callClaude({
      system,
      userMessage,
      maxTokens: getMaxTokens(scriptLength),
      jsonMode: true,
      context: "visualization-script",
      uid,
    });

    if (!script || !script.blocks || !Array.isArray(script.blocks)) {
      throw new HttpsError(
        "internal",
        "We couldn't generate your script right now. Please try again."
      );
    }

    console.log(`[visualizationScript] Generated successfully: ${script.blocks.length} blocks, ~${script.totalMinutes} min`);

    return {
      success: true,
      script,
      generatedAt: new Date().toISOString(),
    };

  } catch (err) {
    if (err instanceof HttpsError) throw err;
    console.error("[visualizationScript] Error:", err);
    throw wrapError(err, "visualizationScript");
  }
}

module.exports = { handler };
