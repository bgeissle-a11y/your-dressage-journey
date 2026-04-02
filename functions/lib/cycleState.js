/**
 * 30-Day Cycle State Manager
 *
 * Shared infrastructure for GPT and Physical Guidance 30-day program cycles.
 * Manages cycle state documents (week pointer, tier, status) and handles
 * week advancement with weeklyFocus re-extraction.
 *
 * Firestore paths:
 *   analysis/grandPrixThinkingCycle/{userId}
 *   analysis/physicalGuidanceCycle/{userId}
 *
 * Cycle state schema:
 *   cycleStartDate, currentWeek (1-4), cycleId (YYYY-MM-DD),
 *   tier (standard|top), lastRegenAt, regenCount, status
 */

const { db } = require("./firebase");

const CYCLE_PATHS = {
  gpt: "grandPrixThinkingCycle",
  physical: "physicalGuidanceCycle",
};

const OUTPUT_PATHS = {
  gpt: "analysisCache",
  physical: "analysisCache",
};

const OUTPUT_KEYS = {
  gpt: "grandPrixThinking",
  physical: "physicalGuidance",
};

/**
 * Compute the current week number (1-4) based on cycle start date.
 * Client-side and server-side compatible.
 *
 * @param {string|Date} cycleStartDate
 * @returns {number} 1-4
 */
function computeCurrentWeek(cycleStartDate) {
  if (!cycleStartDate) return 1;
  const start = new Date(cycleStartDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.min(4, Math.floor(diffDays / 7) + 1);
}

/**
 * Check if a cycle has expired (> 30 days from start).
 *
 * @param {string|Date} cycleStartDate
 * @returns {boolean}
 */
function isCycleExpired(cycleStartDate) {
  if (!cycleStartDate) return true;
  const start = new Date(cycleStartDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays > 30;
}

/**
 * Get cycle state document for a user and output type.
 *
 * @param {string} userId
 * @param {string} outputType - "gpt" | "physical"
 * @returns {Promise<object|null>}
 */
async function getCycleState(userId, outputType) {
  const path = CYCLE_PATHS[outputType];
  if (!path) throw new Error(`Unknown output type: ${outputType}`);

  const docRef = db.collection(path).doc(userId);
  const snap = await docRef.get();
  if (!snap.exists) return null;
  return snap.data();
}

/**
 * Create or update cycle state document.
 *
 * @param {string} userId
 * @param {string} outputType - "gpt" | "physical"
 * @param {object} data - Fields to set/merge
 * @returns {Promise<void>}
 */
async function setCycleState(userId, outputType, data) {
  const path = CYCLE_PATHS[outputType];
  if (!path) throw new Error(`Unknown output type: ${outputType}`);

  const docRef = db.collection(path).doc(userId);
  await docRef.set(data, { merge: true });
  console.log(`[cycle] Updated ${outputType} cycle state for ${userId}`);
}

/**
 * Initialize a new cycle after successful generation.
 *
 * @param {string} userId
 * @param {string} outputType - "gpt" | "physical"
 * @param {object} options
 * @param {string} options.tier - "standard" | "top"
 * @param {boolean} [options.truncated] - If true, creates a 2-week truncated cycle
 * @returns {Promise<object>} The created cycle state
 */
async function initCycle(userId, outputType, options = {}) {
  const { tier = "standard", truncated = false } = options;
  const now = new Date();
  const cycleId = now.toISOString().split("T")[0];

  const cycleState = {
    cycleStartDate: now.toISOString(),
    currentWeek: 1,
    cycleId,
    tier,
    lastRegenAt: null,
    regenCount: 0,
    status: truncated ? "truncated" : "active",
  };

  await setCycleState(userId, outputType, cycleState);
  console.log(`[cycle] Initialized ${truncated ? "truncated " : ""}${outputType} cycle for ${userId}: ${cycleId}`);
  return cycleState;
}

/**
 * Check if a user is permitted to regenerate.
 * Enforces tier rules at the API route level.
 *
 * @param {string} userId
 * @param {string} outputType - "gpt" | "physical"
 * @param {object} [options]
 * @param {string} [options.tier] - Override tier (reads from cycle state if not provided)
 * @returns {Promise<{allowed: boolean, reason: string, cycleState: object|null}>}
 */
async function checkRegenPermission(userId, outputType, options = {}) {
  const cycleState = await getCycleState(userId, outputType);

  // First generation ever — always allowed
  if (!cycleState) {
    return { allowed: true, reason: "first_generation", cycleState: null };
  }

  const tier = options.tier || cycleState.tier || "standard";
  const status = cycleState.status;

  // Health hold — block all regen
  if (status === "health_hold") {
    return {
      allowed: false,
      reason: "health_hold",
      cycleState,
    };
  }

  // Expired cycle — allowed for all tiers
  if (status === "expired" || isCycleExpired(cycleState.cycleStartDate)) {
    return { allowed: true, reason: "cycle_expired", cycleState };
  }

  // Top tier — always allowed (with optional cooldown check)
  if (tier === "top") {
    // Check cooldown (2 hours between regens)
    if (cycleState.lastRegenAt) {
      const cooldownMs = (parseInt(process.env.REGEN_COOLDOWN_HOURS, 10) || 2) * 60 * 60 * 1000;
      const sinceLastRegen = Date.now() - new Date(cycleState.lastRegenAt).getTime();
      if (sinceLastRegen < cooldownMs) {
        const minutesLeft = Math.ceil((cooldownMs - sinceLastRegen) / 60000);
        return {
          allowed: false,
          reason: "cooldown",
          cooldownMinutesRemaining: minutesLeft,
          cycleState,
        };
      }
    }
    return { allowed: true, reason: "top_tier", cycleState };
  }

  // Standard tier — only on expiry or first gen
  return {
    allowed: false,
    reason: "standard_tier_active_cycle",
    cycleExpiresAt: new Date(
      new Date(cycleState.cycleStartDate).getTime() + 30 * 24 * 60 * 60 * 1000
    ).toISOString(),
    cycleState,
  };
}

/**
 * Record a regeneration event (for top tier tracking).
 *
 * @param {string} userId
 * @param {string} outputType
 * @returns {Promise<void>}
 */
async function recordRegen(userId, outputType) {
  const cycleState = await getCycleState(userId, outputType);
  const regenCount = (cycleState?.regenCount || 0) + 1;
  await setCycleState(userId, outputType, {
    lastRegenAt: new Date().toISOString(),
    regenCount,
  });
}

/**
 * Extract weeklyFocus items from a cached output document based on the current week.
 * Works for both GPT (weeklyAssignments) and Physical (weeklyFocusItems).
 *
 * @param {object} outputDoc - The cached output document result
 * @param {number} weekIndex - 0-based week index
 * @param {string} outputType - "gpt" | "physical"
 * @returns {object} Extracted items
 */
function extractWeeklyFocusItems(outputDoc, weekIndex, outputType) {
  if (outputType === "gpt") {
    const weeks = outputDoc?.selectedPath?.weeks || outputDoc?.weeks || [];
    const weekData = weeks[weekIndex];
    if (!weekData?.assignments) return [];
    return weekData.assignments.map((item) => ({
      title: item.title,
      description: item.description,
      when: item.when,
      buildToward: item.trajectoryLink || "",
    }));
  }

  if (outputType === "physical") {
    const weeks = outputDoc?.weeks || [];
    const weekData = weeks[weekIndex];
    if (!weekData?.patterns) return [];
    return weekData.patterns
      .filter((p) => p.feedsWeeklyFocus)
      .map((p) => ({
        text: p.noticingCuePrimary,
        sub: p.source || null,
        isHorseHealth: p.isHorseHealth || false,
      }));
  }

  return [];
}

/**
 * Advance the week pointer and re-extract weeklyFocus items if needed.
 * Called on page load and on Weekly Focus load.
 *
 * @param {string} userId
 * @param {string} outputType - "gpt" | "physical"
 * @returns {Promise<{advanced: boolean, currentWeek: number}>}
 */
async function advanceWeekAndExtract(userId, outputType) {
  const cycleState = await getCycleState(userId, outputType);
  if (!cycleState) return { advanced: false, currentWeek: 1 };

  // Don't advance if not active
  if (!["active", "truncated"].includes(cycleState.status)) {
    return { advanced: false, currentWeek: cycleState.currentWeek };
  }

  const computed = computeCurrentWeek(cycleState.cycleStartDate);

  // For truncated cycles, cap at 2
  const maxWeek = cycleState.status === "truncated" ? 2 : 4;
  const newWeek = Math.min(computed, maxWeek);

  if (newWeek === cycleState.currentWeek) {
    return { advanced: false, currentWeek: newWeek };
  }

  // Week has advanced — update cycle state and re-extract
  const outputKey = OUTPUT_KEYS[outputType];
  const cacheDocId = `${userId}_${outputKey}`;
  const cacheSnap = await db.collection("analysisCache").doc(cacheDocId).get();

  if (!cacheSnap.exists) {
    // No cached output — just update the week pointer
    await setCycleState(userId, outputType, { currentWeek: newWeek });
    return { advanced: true, currentWeek: newWeek };
  }

  const outputDoc = cacheSnap.data()?.result;
  const newItems = extractWeeklyFocusItems(outputDoc, newWeek - 1, outputType);

  // Update cycle state and output doc in parallel
  const weeklyFieldName = outputType === "gpt" ? "weeklyAssignments" : "weeklyFocusItems";

  await Promise.all([
    setCycleState(userId, outputType, { currentWeek: newWeek }),
    db.collection("analysisCache").doc(cacheDocId).update({
      [`result.${weeklyFieldName}`]: newItems,
    }),
  ]);

  console.log(`[cycle] Advanced ${outputType} week ${cycleState.currentWeek} → ${newWeek} for ${userId}`);
  return { advanced: true, currentWeek: newWeek };
}

/**
 * Check if a cycle should be extended (insufficient new data).
 * Returns true if fewer than 5 new debriefs since last generation.
 *
 * @param {string} userId
 * @param {string} generatedAt - ISO timestamp of last generation
 * @returns {Promise<boolean>} true if should extend (not enough data)
 */
async function shouldExtendCycle(userId, generatedAt) {
  if (!generatedAt) return false;

  const generatedDate = new Date(generatedAt);
  const debriefSnap = await db
    .collection("debriefs")
    .where("userId", "==", userId)
    .where("createdAt", ">", generatedDate.toISOString())
    .get();

  const newDebriefCount = debriefSnap.docs.filter((d) => !d.data().isDeleted).length;
  console.log(`[cycle] New debriefs since last gen: ${newDebriefCount}`);
  return newDebriefCount < 5;
}

/**
 * Determine if a first-ever generation should be truncated (mid-cycle start).
 * Truncated = fewer than 15 days remain in the current calendar month.
 *
 * @returns {boolean}
 */
function shouldTruncateFirstCycle() {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemaining = lastDay - now.getDate();
  return daysRemaining < 15;
}

/**
 * Get user tier from profile or default to "standard".
 *
 * @param {string} userId
 * @returns {Promise<string>} "standard" | "top"
 */
async function getUserTier(userId) {
  const userSnap = await db.collection("users").doc(userId).get();
  if (!userSnap.exists) return "standard";
  return userSnap.data()?.tier || "standard";
}

module.exports = {
  computeCurrentWeek,
  isCycleExpired,
  getCycleState,
  setCycleState,
  initCycle,
  checkRegenPermission,
  recordRegen,
  extractWeeklyFocusItems,
  advanceWeekAndExtract,
  shouldExtendCycle,
  shouldTruncateFirstCycle,
  getUserTier,
  CYCLE_PATHS,
};
