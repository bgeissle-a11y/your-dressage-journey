/**
 * Analysis Cache Manager
 *
 * Reads and writes AI analysis results to Firestore's `analysisCache`
 * collection. Supports staleness detection via dataSnapshot hashes
 * so the frontend can prompt for regeneration when new data exists.
 *
 * Collection: analysisCache (top-level, consistent with existing pattern)
 * Document ID: composite key `${uid}_${outputType}` (optionally with voiceIndex)
 */

const { db } = require("./firebase");

const COLLECTION = "analysisCache";

/**
 * Build a deterministic document ID for a cache entry.
 *
 * @param {string} uid - User ID
 * @param {string} outputType - "coaching", "journeyMap", "grandPrixThinking"
 * @param {number} [voiceIndex] - For coaching, 0-3
 * @returns {string} Document ID
 */
function buildDocId(uid, outputType, voiceIndex) {
  if (voiceIndex !== undefined && voiceIndex !== null) {
    return `${uid}_${outputType}_${voiceIndex}`;
  }
  return `${uid}_${outputType}`;
}

/**
 * Retrieve a cached analysis result.
 * Returns null if no cache exists, or if the cached hash doesn't match
 * the current hash (meaning data has changed since generation).
 *
 * @param {string} uid - User ID
 * @param {string} outputType - "coaching", "journeyMap", "grandPrixThinking"
 * @param {object} [options]
 * @param {string} [options.currentHash] - Current dataSnapshot hash to compare
 * @param {number} [options.voiceIndex] - For coaching voice cache
 * @param {number} [options.maxAgeDays] - Maximum age in days before considered stale
 * @returns {Promise<object|null>} Cached result or null
 */
async function getCache(uid, outputType, options = {}) {
  const { currentHash, voiceIndex, maxAgeDays = 30 } = options;
  const docId = buildDocId(uid, outputType, voiceIndex);

  const docRef = db.collection(COLLECTION).doc(docId);
  const docSnap = await docRef.get();

  if (!docSnap.exists) return null;

  const data = docSnap.data();

  // Check hash staleness
  if (currentHash && data.dataSnapshotHash !== currentHash) {
    console.log(
      `[cache] Hash mismatch for ${docId}: cached=${data.dataSnapshotHash}, current=${currentHash}`
    );
    return null;
  }

  // Check age staleness
  if (data.generatedAt) {
    const generatedDate = new Date(data.generatedAt);
    const ageMs = Date.now() - generatedDate.getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    if (ageDays > maxAgeDays) {
      console.log(`[cache] Age exceeded for ${docId}: ${ageDays.toFixed(1)} days old`);
      return null;
    }
  }

  console.log(`[cache] Hit for ${docId}`);
  return data;
}

/**
 * Save an analysis result to cache.
 *
 * @param {string} uid - User ID
 * @param {string} outputType - "coaching", "journeyMap", "grandPrixThinking"
 * @param {object} result - The analysis result to cache
 * @param {object} metadata
 * @param {string} metadata.dataSnapshotHash - Hash from prepareRiderData
 * @param {string} metadata.tierLabel - Rider tier label
 * @param {number} metadata.dataTier - Data tier (0-3)
 * @param {number} [metadata.voiceIndex] - For coaching voice cache
 */
async function setCache(uid, outputType, result, metadata) {
  const { dataSnapshotHash, tierLabel, dataTier, voiceIndex } = metadata;
  const docId = buildDocId(uid, outputType, voiceIndex);

  const cacheDoc = {
    userId: uid,
    outputType,
    generatedAt: new Date().toISOString(),
    dataSnapshotHash,
    tierLabel,
    dataTier,
    result,
    isDeleted: false,
  };

  if (voiceIndex !== undefined && voiceIndex !== null) {
    cacheDoc.voiceIndex = voiceIndex;
  }

  await db.collection(COLLECTION).doc(docId).set(cacheDoc);
  console.log(`[cache] Saved ${docId}`);
}

/**
 * Get cache metadata (without full result) for staleness checking.
 * Useful for the frontend to compare hashes without downloading full results.
 *
 * @param {string} uid - User ID
 * @param {string} outputType - "coaching", "journeyMap", "grandPrixThinking"
 * @returns {Promise<object|null>} Cache metadata or null
 */
async function getCacheMeta(uid, outputType) {
  // For coaching, check voice 0 as representative
  const docId = buildDocId(uid, outputType, outputType === "coaching" ? 0 : undefined);
  const docRef = db.collection(COLLECTION).doc(docId);
  const docSnap = await docRef.get();

  if (!docSnap.exists) return null;

  const data = docSnap.data();
  return {
    generatedAt: data.generatedAt,
    dataSnapshotHash: data.dataSnapshotHash,
    tierLabel: data.tierLabel,
    dataTier: data.dataTier,
  };
}

/**
 * Get cache metadata for all output types for a given user.
 * Returns a map of outputType → metadata (without full results).
 * Used by checkCacheStaleness and warmStaleCache.
 *
 * @param {string} uid - User ID
 * @returns {Promise<object>} { coaching: {...}|null, journeyMap: {...}|null, ... }
 */
async function getAllCacheMetaForUser(uid) {
  const outputTypes = [
    "coaching",
    "journeyMap",
    "grandPrixThinking",
    "dataVisualizations",
    "physicalGuidance",
    "coaching_insights",
  ];

  const results = {};
  // Fetch all in parallel using getAll for efficiency
  const docRefs = outputTypes.map((type) => {
    const docId = buildDocId(uid, type, type === "coaching" ? 0 : undefined);
    return db.collection(COLLECTION).doc(docId);
  });

  const snapshots = await db.getAll(...docRefs);

  for (let i = 0; i < outputTypes.length; i++) {
    const snap = snapshots[i];
    if (!snap.exists) {
      results[outputTypes[i]] = null;
      continue;
    }
    const data = snap.data();
    results[outputTypes[i]] = {
      generatedAt: data.generatedAt,
      dataSnapshotHash: data.dataSnapshotHash,
      tierLabel: data.tierLabel,
      dataTier: data.dataTier,
    };
  }

  return results;
}

/**
 * Retrieve a cached analysis result regardless of hash staleness.
 * Used for stale-while-revalidate: returns old data with a `_stale` flag
 * rather than returning null when the hash doesn't match.
 *
 * Still respects the age limit — data older than maxAgeDays returns null.
 *
 * @param {string} uid - User ID
 * @param {string} outputType - "coaching", "journeyMap", etc.
 * @param {object} [options]
 * @param {string} [options.currentHash] - Current dataSnapshot hash to compare
 * @param {number} [options.voiceIndex] - For coaching voice cache
 * @param {number} [options.maxAgeDays] - Maximum age in days (default 30)
 * @returns {Promise<object|null>} Cached result with _stale flag, or null if too old/missing
 */
async function getStaleCache(uid, outputType, options = {}) {
  const { currentHash, voiceIndex, maxAgeDays = 30 } = options;
  const docId = buildDocId(uid, outputType, voiceIndex);

  const docRef = db.collection(COLLECTION).doc(docId);
  const docSnap = await docRef.get();

  if (!docSnap.exists) return null;

  const data = docSnap.data();

  // Still check age — don't serve ancient data
  if (data.generatedAt) {
    const generatedDate = new Date(data.generatedAt);
    const ageMs = Date.now() - generatedDate.getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    if (ageDays > maxAgeDays) {
      console.log(`[cache] Stale cache too old for ${docId}: ${ageDays.toFixed(1)} days`);
      return null;
    }
  }

  // Determine staleness
  const isStale = currentHash ? data.dataSnapshotHash !== currentHash : false;

  if (isStale) {
    console.log(`[cache] Serving stale cache for ${docId} (hash mismatch)`);
  } else {
    console.log(`[cache] Hit (fresh) for ${docId}`);
  }

  return { ...data, _stale: isStale };
}

module.exports = { getCache, setCache, getStaleCache, getCacheMeta, getAllCacheMetaForUser };
