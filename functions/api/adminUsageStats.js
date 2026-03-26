/**
 * Admin Usage Stats — API token consumption tracking
 *
 * Queries the `usageLogs` collection to provide per-user, per-output,
 * and per-model token consumption summaries. Supports date range filtering.
 *
 * Requires the caller to have the Firebase Auth custom claim { admin: true }.
 *
 * Input:  { days?: number (default 30), uid?: string (filter to single user) }
 * Output: { totals, byUser, byOutput, byModel, dailyTrend, topCalls, generatedAt }
 */

const { HttpsError } = require("firebase-functions/v2/https");
const { db, auth } = require("../lib/firebase");
const { validateAuth } = require("../lib/auth");
const { wrapError } = require("../lib/errors");

/**
 * Cloud Function handler for Admin Usage Stats.
 */
async function handler(request) {
  try {
    const callerUid = validateAuth(request);

    // Check admin custom claim
    const userRecord = await auth.getUser(callerUid);
    if (!userRecord.customClaims || !userRecord.customClaims.admin) {
      throw new HttpsError(
        "permission-denied",
        "This function requires admin privileges."
      );
    }

    const { days = 30, uid: filterUid = null } = request.data || {};
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Query usage logs within date range
    // Avoid composite indexes by using equality-only filters + client-side sort
    // (matches the project's Firestore pattern)
    let query = db.collection("usageLogs")
      .where("timestamp", ">=", cutoff);

    if (filterUid) {
      // uid + timestamp range needs a composite index; filter client-side instead
      query = db.collection("usageLogs")
        .where("uid", "==", filterUid);
    }

    const snapshot = await query.get();
    let logs = [];
    snapshot.forEach((doc) => logs.push(doc.data()));

    // Client-side date filter for uid-filtered queries (no composite index)
    if (filterUid) {
      logs = logs.filter((l) => l.timestamp >= cutoff);
    }

    // Sort by timestamp descending (client-side to avoid composite index)
    logs.sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));

    // --- Aggregate totals ---
    const totals = {
      callCount: logs.length,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      estimatedCostCents: 0,
    };

    // --- Per-user breakdown ---
    const byUser = {};     // uid → { callCount, inputTokens, outputTokens, totalTokens, costCents, outputs: {} }
    // --- Per-output breakdown ---
    const byOutput = {};   // outputType → { callCount, inputTokens, outputTokens, totalTokens, costCents }
    // --- Per-model breakdown ---
    const byModel = {};    // model → { callCount, inputTokens, outputTokens, totalTokens, costCents }
    // --- Daily trend ---
    const dailyMap = {};   // "YYYY-MM-DD" → { callCount, inputTokens, outputTokens, costCents }

    for (const log of logs) {
      const costCents = (log.estimatedCostMillicents || 0) / 1000;
      const input = log.inputTokens || 0;
      const output = log.outputTokens || 0;
      const total = input + output;

      // Totals
      totals.inputTokens += input;
      totals.outputTokens += output;
      totals.totalTokens += total;
      totals.estimatedCostCents += costCents;

      // By user
      const uid = log.uid || "unauthenticated";
      if (!byUser[uid]) {
        byUser[uid] = { uid, callCount: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, costCents: 0, outputs: {} };
      }
      byUser[uid].callCount++;
      byUser[uid].inputTokens += input;
      byUser[uid].outputTokens += output;
      byUser[uid].totalTokens += total;
      byUser[uid].costCents += costCents;

      // Per-user per-output
      const ot = log.outputType || log.context || "unknown";
      if (!byUser[uid].outputs[ot]) {
        byUser[uid].outputs[ot] = { callCount: 0, inputTokens: 0, outputTokens: 0, costCents: 0 };
      }
      byUser[uid].outputs[ot].callCount++;
      byUser[uid].outputs[ot].inputTokens += input;
      byUser[uid].outputs[ot].outputTokens += output;
      byUser[uid].outputs[ot].costCents += costCents;

      // By output type
      if (!byOutput[ot]) {
        byOutput[ot] = { callCount: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, costCents: 0 };
      }
      byOutput[ot].callCount++;
      byOutput[ot].inputTokens += input;
      byOutput[ot].outputTokens += output;
      byOutput[ot].totalTokens += total;
      byOutput[ot].costCents += costCents;

      // By model
      const model = log.model || "unknown";
      if (!byModel[model]) {
        byModel[model] = { callCount: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, costCents: 0 };
      }
      byModel[model].callCount++;
      byModel[model].inputTokens += input;
      byModel[model].outputTokens += output;
      byModel[model].totalTokens += total;
      byModel[model].costCents += costCents;

      // Daily trend
      const day = (log.timestamp || "").slice(0, 10);
      if (day) {
        if (!dailyMap[day]) {
          dailyMap[day] = { date: day, callCount: 0, inputTokens: 0, outputTokens: 0, costCents: 0 };
        }
        dailyMap[day].callCount++;
        dailyMap[day].inputTokens += input;
        dailyMap[day].outputTokens += output;
        dailyMap[day].costCents += costCents;
      }
    }

    // Round cost figures
    totals.estimatedCostCents = Math.round(totals.estimatedCostCents * 100) / 100;
    for (const u of Object.values(byUser)) {
      u.costCents = Math.round(u.costCents * 100) / 100;
      for (const o of Object.values(u.outputs)) {
        o.costCents = Math.round(o.costCents * 100) / 100;
      }
    }
    for (const o of Object.values(byOutput)) {
      o.costCents = Math.round(o.costCents * 100) / 100;
    }
    for (const m of Object.values(byModel)) {
      m.costCents = Math.round(m.costCents * 100) / 100;
    }

    // Resolve display names for user UIDs
    const uids = Object.keys(byUser).filter((u) => u !== "unauthenticated");
    if (uids.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < uids.length; i += batchSize) {
        const batch = uids.slice(i, i + batchSize).map((id) => ({ uid: id }));
        try {
          const { users } = await auth.getUsers(batch);
          for (const u of users) {
            if (byUser[u.uid]) {
              byUser[u.uid].displayName = u.displayName || null;
              byUser[u.uid].email = u.email || null;
            }
          }
        } catch {
          // Non-critical — proceed without names
        }
      }
    }

    // Sort users by cost (highest first)
    const sortedUsers = Object.values(byUser).sort((a, b) => b.costCents - a.costCents);

    // Sort outputs by cost (highest first)
    const sortedOutputs = Object.entries(byOutput)
      .sort(([, a], [, b]) => b.costCents - a.costCents)
      .map(([name, data]) => ({ outputType: name, ...data }));

    // Sort models by cost
    const sortedModels = Object.entries(byModel)
      .sort(([, a], [, b]) => b.costCents - a.costCents)
      .map(([name, data]) => ({ model: name, ...data }));

    // Daily trend sorted chronologically
    const dailyTrend = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    // Top 10 most expensive individual calls
    const topCalls = logs
      .map((l) => ({
        uid: l.uid,
        context: l.context,
        model: l.model,
        inputTokens: l.inputTokens,
        outputTokens: l.outputTokens,
        costCents: Math.round((l.estimatedCostMillicents || 0) / 10) / 100,
        timestamp: l.timestamp,
      }))
      .sort((a, b) => b.costCents - a.costCents)
      .slice(0, 10);

    return {
      success: true,
      days,
      totals,
      byUser: sortedUsers,
      byOutput: sortedOutputs,
      byModel: sortedModels,
      dailyTrend,
      topCalls,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    throw wrapError(error, "getAdminUsageStats");
  }
}

module.exports = { handler };
