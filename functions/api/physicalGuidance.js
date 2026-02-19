/**
 * Physical Guidance API
 *
 * Generates personalized physical fitness and body awareness guidance
 * through 2 sequential API calls:
 *
 * PG-1 (Physical Pattern Analysis): Identify recurring physical themes
 *       from cross-referencing assessment + debrief narratives
 * PG-2 (Exercise Prescription): Personalized exercises, warm-up routines,
 *       and body awareness cues calibrated to kinesthetic level
 *
 * PG-1 runs first. PG-2 depends on PG-1 output.
 *
 * Input:  { forceRefresh?: boolean }
 * Output: { patternAnalysis, exercisePrescription, tier, dataTier, generatedAt }
 */

const { validateAuth } = require("../lib/auth");
const { wrapError } = require("../lib/errors");
const { prepareRiderData } = require("../lib/prepareRiderData");
const { callClaude } = require("../lib/claudeCall");
const { buildPhysicalGuidancePrompt } = require("../lib/promptBuilder");
const { getCache, setCache } = require("../lib/cacheManager");

const OUTPUT_TYPE = "physicalGuidance";

/**
 * Cloud Function handler for Physical Guidance generation.
 *
 * @param {object} request - Firebase v2 onCall request
 * @returns {Promise<object>} Physical Guidance result
 */
async function handler(request) {
  try {
    const uid = validateAuth(request);
    const { forceRefresh = false } = request.data || {};

    // Prepare rider data
    const riderData = await prepareRiderData(uid);
    const hash = riderData.dataSnapshot?.hash;

    // Check data tier — need Tier 1+ (rider profile + horse + 3 debriefs)
    if (riderData.dataTier < 1) {
      return {
        success: false,
        error: "insufficient_data",
        message:
          "We need a bit more data to generate your Physical Guidance. " +
          "Please complete your rider profile, add at least one horse profile, " +
          "and submit at least 3 post-ride debriefs.",
        dataTier: riderData.dataTier,
        tier: riderData.tier,
      };
    }

    // Check for physical self-assessment (primary gating for this output)
    if (!riderData.selfAssessments?.physical?.hasAssessment) {
      return {
        success: false,
        error: "missing_assessment",
        message:
          "Physical Guidance requires a completed Physical Self-Assessment. " +
          "This gives us the body awareness data needed to create personalized " +
          "exercises and in-ride cues for you.",
        dataTier: riderData.dataTier,
        tier: riderData.tier,
      };
    }

    // Check cache (14-day max age for bi-weekly cadence)
    if (!forceRefresh) {
      const cached = await getCache(uid, OUTPUT_TYPE, {
        currentHash: hash,
        maxAgeDays: 14,
      });
      if (cached) {
        return {
          success: true,
          ...cached.result,
          fromCache: true,
          tier: riderData.tier,
          dataTier: riderData.dataTier,
          dataSnapshot: riderData.dataSnapshot,
          generatedAt: cached.generatedAt,
        };
      }
    }

    // --- PG-1: Physical Pattern Analysis ---
    const { system: sys1, userMessage: msg1 } = buildPhysicalGuidancePrompt(
      1,
      riderData
    );

    const patternAnalysis = await callClaude({
      system: sys1,
      userMessage: msg1,
      jsonMode: true,
      maxTokens: 4096,
      context: "pg-1-pattern-analysis",
    });

    // --- PG-2: Exercise Prescription (depends on PG-1) ---
    const { system: sys2, userMessage: msg2 } = buildPhysicalGuidancePrompt(
      2,
      riderData,
      { patternAnalysis }
    );

    const exercisePrescription = await callClaude({
      system: sys2,
      userMessage: msg2,
      jsonMode: true,
      maxTokens: 8192,
      context: "pg-2-exercise-prescription",
    });

    // Assemble complete result
    const result = { patternAnalysis, exercisePrescription };

    // Cache
    await setCache(uid, OUTPUT_TYPE, result, {
      dataSnapshotHash: hash,
      tierLabel: riderData.tier?.label || "unknown",
      dataTier: riderData.dataTier,
    });

    return {
      success: true,
      ...result,
      fromCache: false,
      tier: riderData.tier,
      dataTier: riderData.dataTier,
      dataSnapshot: riderData.dataSnapshot,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    throw wrapError(error, "getPhysicalGuidance");
  }
}

module.exports = { handler };
