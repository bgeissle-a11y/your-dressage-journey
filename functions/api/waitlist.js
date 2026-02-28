/**
 * Waitlist — Email Capture for First Glimpse
 *
 * Unauthenticated onRequest handler that collects emails from
 * prospective riders after they complete their First Glimpse.
 * Temporary pre-launch feature — swap for Stripe signup when ready.
 *
 * Stores to Firestore `waitlist` collection.
 * Deduplicates by email address.
 */

const { db } = require("../lib/firebase");
const Sentry = require("@sentry/node");

const WAITLIST_COLLECTION = "waitlist";

// Basic email validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Build allowed CORS origins dynamically from the GCP project ID.
 */
function getAllowedOrigins() {
  const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  const origins = [];
  if (projectId) {
    origins.push(`https://${projectId}.web.app`);
    origins.push(`https://${projectId}.firebaseapp.com`);
  }
  origins.push("http://localhost:3000");
  origins.push("http://localhost:5000");
  return origins;
}

/**
 * Set CORS headers. Returns true if this was a preflight (response sent).
 */
function handleCors(req, res) {
  const origin = req.headers.origin;
  const allowed = getAllowedOrigins();

  if (origin && allowed.includes(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
  }

  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  res.set("Access-Control-Max-Age", "3600");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return true;
  }
  return false;
}

/**
 * onRequest handler for waitlist email capture.
 *
 * POST body: { email: string, name?: string }
 * Response:  { success: true } or { error: string }
 */
async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { email, name } = req.body || {};

    if (!email || typeof email !== "string") {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      res.status(400).json({ error: "Please enter a valid email address" });
      return;
    }

    // Check for duplicate
    const existing = await db
      .collection(WAITLIST_COLLECTION)
      .where("email", "==", normalizedEmail)
      .limit(1)
      .get();

    if (!existing.empty) {
      // Not an error — just acknowledge they're already on the list
      res.status(200).json({ success: true, alreadyExists: true });
      return;
    }

    // Write to Firestore
    await db.collection(WAITLIST_COLLECTION).add({
      email: normalizedEmail,
      name: (name && typeof name === "string") ? name.trim() : "",
      source: "first-glimpse",
      createdAt: new Date().toISOString(),
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("[waitlist] Error:", err.message);
    Sentry.captureException(err, { tags: { context: "waitlist" } });
    res.status(500).json({
      error: "Something went wrong. Please try again.",
    });
  }
}

module.exports = { handler };
