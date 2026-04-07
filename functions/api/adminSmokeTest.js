/**
 * Admin Smoke Test — automated health checks for go-live readiness
 *
 * Checks every active user for:
 *   1. GPT cache format validity (selectedPath present)
 *   2. Collection counts at suspicious limits
 *   3. prepareRiderData runs without error; dataTier classification
 *   4. Show planner cache validity (preparationPlan.weeks present)
 *   5. Recent truncation count from usageLogs
 *
 * Requires the caller to have { admin: true } custom claim.
 *
 * Returns { healthy: boolean, issues: [...], userReports: [...] }
 */

const { HttpsError } = require("firebase-functions/v2/https");
const { db, auth } = require("../lib/firebase");
const { validateAuth } = require("../lib/auth");
const { prepareRiderData } = require("../lib/prepareRiderData");

const CACHE_COLLECTION = "analysisCache";

/**
 * Schema validators for cached output formats.
 * Each key is an outputType; the function returns true if the cache is valid.
 */
const CACHE_VALIDATORS = {
  grandPrixThinking: (result) => !!result?.selectedPath,
  physicalGuidance: (result) => !!result?.exerciseProtocol || !!result?.weeks,
  journeyMap: (result) => !!result?.synthesis || !!result?.narrative,
  dataVisualizations: (result) => !!result?.patternExtraction || !!result?.insightNarratives,
};

/** Check if a show planner cache has valid weeks. */
function isValidShowPlannerCache(result) {
  return result?.preparationPlan?.weeks?.length > 0;
}

async function handler(request) {
  try {
    const uid = validateAuth(request);

    // Verify admin
    const caller = await auth.getUser(uid);
    if (!caller.customClaims?.admin) {
      throw new HttpsError("permission-denied", "Admin access required.");
    }

    const issues = [];
    const userReports = [];

    // 1. Get all users
    const listResult = await auth.listUsers(100);
    const users = listResult.users;

    // 2. Check each user
    for (const user of users) {
      const userIssues = [];
      const userUid = user.uid;
      const displayName = user.displayName || user.email || userUid;

      // 2a. Check data tier
      try {
        const riderData = await prepareRiderData(userUid);
        const dataTier = riderData.dataTier;

        if (dataTier < 1) {
          userIssues.push(`dataTier=${dataTier} (insufficient for AI outputs)`);
        }

        // 2b. Check collection counts for suspicious limits
        const collections = ["debriefs", "reflections", "observations", "journeyEvents"];
        for (const col of collections) {
          const snap = await db.collection(col)
            .where("userId", "==", userUid)
            .where("isDeleted", "==", false)
            .count()
            .get();
          const count = snap.data().count;
          if (count >= 48 && count <= 52) {
            userIssues.push(`${col} count=${count} (near old 50-doc limit — verify all data visible)`);
          }
        }
      } catch (err) {
        userIssues.push(`prepareRiderData failed: ${err.message}`);
      }

      // 2c. Check cache format validity
      const cacheSnap = await db.collection(CACHE_COLLECTION)
        .where("userId", "==", userUid)
        .get();

      for (const doc of cacheSnap.docs) {
        const data = doc.data();
        const outputType = data.outputType;
        const result = data.result;
        const schemaVersion = data.schemaVersion;

        // Check schema version
        if (!schemaVersion) {
          userIssues.push(`cache ${outputType}: missing schemaVersion (pre-versioning entry)`);
        }

        // Check format validators
        const validator = CACHE_VALIDATORS[outputType];
        if (validator && !validator(result)) {
          userIssues.push(`cache ${outputType}: INVALID FORMAT (generated ${data.generatedAt || "unknown"})`);
        }

        // Check show planner caches
        if (outputType?.startsWith("showPlanner_") || outputType?.startsWith("eventPlanner_")) {
          if (!isValidShowPlannerCache(result)) {
            userIssues.push(`cache ${outputType}: missing preparationPlan.weeks`);
          }
        }
      }

      // Build user report
      const report = {
        uid: userUid,
        name: displayName,
        issues: userIssues,
        healthy: userIssues.length === 0,
      };
      userReports.push(report);

      if (userIssues.length > 0) {
        issues.push(...userIssues.map((i) => `[${displayName}] ${i}`));
      }
    }

    // 3. Check global truncation count (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const truncSnap = await db.collection("usageLogs")
      .where("stopReason", "==", "max_tokens")
      .where("timestamp", ">=", weekAgo)
      .get();

    const truncCount = truncSnap.size;
    if (truncCount > 0) {
      // Group by context
      const byContext = {};
      truncSnap.forEach((doc) => {
        const ctx = doc.data().context || "unknown";
        byContext[ctx] = (byContext[ctx] || 0) + 1;
      });
      const truncSummary = Object.entries(byContext)
        .sort((a, b) => b[1] - a[1])
        .map(([ctx, count]) => `${ctx}: ${count}`)
        .join(", ");
      issues.push(`${truncCount} token truncations in last 7 days: ${truncSummary}`);
    }

    const healthy = issues.length === 0;

    return {
      success: true,
      healthy,
      timestamp: new Date().toISOString(),
      userCount: users.length,
      issueCount: issues.length,
      issues,
      userReports,
      truncations: { count: truncCount },
    };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    console.error("[adminSmokeTest] Error:", error);
    throw new HttpsError("internal", "Smoke test failed: " + error.message);
  }
}

module.exports = { handler };
