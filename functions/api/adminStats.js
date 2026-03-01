/**
 * Admin Stats — cross-user activity summary
 *
 * Returns per-user document counts for all data collections,
 * sorted by total activity (most active first).
 *
 * Requires the caller to have the Firebase Auth custom claim { admin: true }.
 * Set it once via Firebase Admin SDK or the Cloud Shell:
 *   admin.auth().setCustomUserClaims(uid, { admin: true })
 */

const { HttpsError } = require("firebase-functions/v2/https");
const { db, auth } = require("../lib/firebase");
const { validateAuth } = require("../lib/auth");
const { wrapError } = require("../lib/errors");

/**
 * Collections to count, keyed by the label used in the response.
 * Each value is the Firestore collection name.
 */
const COLLECTIONS = {
  debriefs: "debriefs",
  reflections: "reflections",
  observations: "observations",
  journeyEvents: "journeyEvents",
  eventPrepPlans: "eventPrepPlans",
  physicalAssessments: "physicalAssessments",
  riderAssessments: "riderAssessments",
  horseHealthEntries: "horseHealthEntries",
};

/**
 * Fetch all non-deleted docs from a collection and group counts by userId.
 * Also tracks the most recent createdAt per user.
 */
async function countByUser(collectionName) {
  const snapshot = await db
    .collection(collectionName)
    .where("isDeleted", "==", false)
    .get();

  const counts = {}; // userId → { count, lastDate }

  snapshot.forEach((doc) => {
    const data = doc.data();
    const uid = data.userId;
    if (!uid) return;

    if (!counts[uid]) {
      counts[uid] = { count: 0, lastDate: null };
    }
    counts[uid].count++;

    // Track most recent activity (createdAt may be a Firestore Timestamp or ISO string)
    const createdAt = data.createdAt;
    if (createdAt) {
      const dateStr =
        typeof createdAt.toDate === "function"
          ? createdAt.toDate().toISOString()
          : String(createdAt);
      if (!counts[uid].lastDate || dateStr > counts[uid].lastDate) {
        counts[uid].lastDate = dateStr;
      }
    }
  });

  return counts;
}

async function handler(request) {
  try {
    const uid = validateAuth(request);

    // Check admin custom claim
    const userRecord = await auth.getUser(uid);
    if (!userRecord.customClaims || !userRecord.customClaims.admin) {
      throw new HttpsError(
        "permission-denied",
        "This function requires admin privileges."
      );
    }

    // Fetch counts from all collections in parallel
    const entries = Object.entries(COLLECTIONS);
    const results = await Promise.all(
      entries.map(([, colName]) => countByUser(colName))
    );

    // Merge into a single per-user summary
    const userMap = {}; // uid → { debriefs, reflections, ..., total, lastActivity }

    entries.forEach(([label], i) => {
      const countsForCollection = results[i];
      for (const [userId, { count, lastDate }] of Object.entries(countsForCollection)) {
        if (!userMap[userId]) {
          userMap[userId] = { uid: userId, total: 0, lastActivity: null };
        }
        userMap[userId][label] = count;
        userMap[userId].total += count;

        if (lastDate && (!userMap[userId].lastActivity || lastDate > userMap[userId].lastActivity)) {
          userMap[userId].lastActivity = lastDate;
        }
      }
    });

    // Fill in zeroes for collections with no docs
    for (const user of Object.values(userMap)) {
      for (const [label] of entries) {
        if (user[label] === undefined) user[label] = 0;
      }
    }

    // Fetch display names and emails from Firebase Auth
    const uids = Object.keys(userMap);
    if (uids.length > 0) {
      // getUsers accepts up to 100 identifiers at a time
      const batchSize = 100;
      for (let i = 0; i < uids.length; i += batchSize) {
        const batch = uids.slice(i, i + batchSize).map((id) => ({ uid: id }));
        const { users } = await auth.getUsers(batch);
        for (const u of users) {
          if (userMap[u.uid]) {
            userMap[u.uid].displayName = u.displayName || null;
            userMap[u.uid].email = u.email || null;
          }
        }
      }
    }

    // Sort: most active first, then by most recent activity
    const sorted = Object.values(userMap).sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return (b.lastActivity || "").localeCompare(a.lastActivity || "");
    });

    return {
      success: true,
      userCount: sorted.length,
      users: sorted,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    throw wrapError(error, "getAdminStats");
  }
}

module.exports = { handler };
