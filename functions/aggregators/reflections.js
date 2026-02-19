/**
 * Reflections Aggregator
 *
 * Summarizes reflection entries by category, emotional themes,
 * and recurring patterns. Pure function — no Firestore reads.
 */

const ALL_CATEGORIES = ["personal", "validation", "aha", "obstacle", "connection", "feel"];

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "is", "was", "are", "were", "be",
  "been", "being", "i", "me", "my", "we", "our", "you", "your", "it", "its",
  "he", "she", "they", "them", "his", "her", "to", "of", "in", "for", "on",
  "with", "at", "by", "from", "that", "this", "these", "those", "have", "has",
  "had", "do", "does", "did", "will", "would", "could", "should", "can",
  "not", "no", "so", "if", "than", "then", "very", "really", "just", "about",
  "also", "more", "much", "felt", "feel", "feeling", "am", "as", "like",
]);

/**
 * Extract top word frequencies from an array of text strings.
 */
function extractTopWords(texts, limit) {
  const counts = {};
  for (const text of texts) {
    if (!text) continue;
    const words = text.toLowerCase().replace(/[^a-z\s'-]/g, "").split(/\s+/);
    for (const word of words) {
      if (word.length < 3 || STOP_WORDS.has(word)) continue;
      counts[word] = (counts[word] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([text, count]) => ({ text, count }));
}

/**
 * @param {Object[]} reflections - Array of reflection documents
 * @returns {Object} Aggregated reflection summary
 */
function aggregateReflections(reflections) {
  if (!reflections || !reflections.length) {
    return {
      totalReflections: 0,
      categoryCoverage: {
        covered: [],
        missing: [...ALL_CATEGORIES],
        ratio: "0/6",
      },
      byCategory: {},
      emotionalThemes: { feelings: [] },
      recurringPatterns: { obstacleStrategies: [], influences: [] },
    };
  }

  // Group by category
  const byCategory = {};
  const coveredSet = new Set();

  for (const cat of ALL_CATEGORIES) {
    const entries = reflections
      .filter((r) => r.category === cat)
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

    if (entries.length > 0) coveredSet.add(cat);

    const recentEntries = entries.slice(0, 3).map((r) => {
      const entry = {
        prompt: r.prompt || "",
        reflection: r.mainReflection || "",
        feeling: r.feeling || "",
        influence: r.influence || "",
      };
      if (cat === "obstacle" && r.obstacleStrategy) {
        entry.obstacleStrategy = r.obstacleStrategy;
      }
      return entry;
    });

    byCategory[cat] = {
      count: entries.length,
      recentEntries,
    };
  }

  const covered = ALL_CATEGORIES.filter((c) => coveredSet.has(c));
  const missing = ALL_CATEGORIES.filter((c) => !coveredSet.has(c));

  // Emotional themes from feeling fields
  const allFeelings = reflections.map((r) => r.feeling).filter(Boolean);
  const feelings = extractTopWords(allFeelings, 5);

  // Recurring patterns — collect raw texts for the AI to analyze
  const sortedByDate = [...reflections].sort(
    (a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")
  );

  const obstacleStrategies = sortedByDate
    .filter((r) => r.category === "obstacle" && r.obstacleStrategy)
    .slice(0, 3)
    .map((r) => r.obstacleStrategy);

  const influences = sortedByDate
    .filter((r) => r.influence)
    .slice(0, 3)
    .map((r) => r.influence);

  return {
    totalReflections: reflections.length,
    categoryCoverage: {
      covered,
      missing,
      ratio: `${covered.length}/6`,
    },
    byCategory,
    emotionalThemes: { feelings },
    recurringPatterns: { obstacleStrategies, influences },
  };
}

module.exports = { aggregateReflections };
