/**
 * Common Zod validation schemas
 *
 * Reusable schemas for input validation across Cloud Functions.
 * Function-specific schemas should be defined in their own files
 * within this directory (e.g., schemas/coaching.js).
 */

const { z } = require("zod");

/** Firebase document ID - non-empty string */
const docId = z.string().min(1, "Document ID is required").max(128);

/** ISO date string (YYYY-MM-DD format) */
const isoDate = z.string().regex(
  /^\d{4}-\d{2}-\d{2}$/,
  "Date must be in YYYY-MM-DD format"
);

/** Pagination options */
const paginationSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(50),
  orderField: z.string().optional().default("createdAt"),
  orderDirection: z.enum(["asc", "desc"]).optional().default("desc"),
});

/** User-scoped collection names (for runtime validation) */
const COLLECTION_NAMES = [
  "riderProfiles",
  "horseProfiles",
  "reflections",
  "debriefs",
  "journeyEvents",
  "observations",
  "eventPrepPlans",
  "physicalAssessments",
  "riderAssessments",
];

const collectionName = z.enum(COLLECTION_NAMES);

module.exports = {
  docId,
  isoDate,
  paginationSchema,
  collectionName,
  COLLECTION_NAMES,
};
