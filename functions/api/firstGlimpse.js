/**
 * First Glimpse — Public AI Coaching Insight
 *
 * Unauthenticated onRequest handler that proxies the First Glimpse
 * prompt to the Claude API. This is a marketing/lead-gen feature:
 * 14 questions → personalized coaching insight, no login required.
 *
 * Security:
 * - API key stays server-side (never exposed to browser)
 * - IP-based rate limiting via Firestore (10 requests/hour/IP)
 * - Prompt length capped at 8000 characters
 * - CORS restricted to known origins
 */

const crypto = require("crypto");
const { db } = require("../lib/firebase");
const { callClaude } = require("../lib/claudeCall");
const Sentry = require("@sentry/node");

// Rate limit config
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_COLLECTION = "_rateLimits";

// Input validation
const MAX_PROMPT_LENGTH = 8000;

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
  // Local development
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
 * Check and update rate limit for the given IP.
 * Uses a Firestore transaction for atomic count updates.
 */
async function checkRateLimit(ip) {
  const ipHash = crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16);
  const docRef = db.collection(RATE_LIMIT_COLLECTION).doc(ipHash);
  const now = Date.now();

  try {
    return await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);

      if (!doc.exists) {
        transaction.set(docRef, { count: 1, windowStart: now });
        return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
      }

      const data = doc.data();
      const elapsed = now - data.windowStart;

      if (elapsed > RATE_LIMIT_WINDOW_MS) {
        transaction.update(docRef, { count: 1, windowStart: now });
        return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
      }

      if (data.count >= RATE_LIMIT_MAX) {
        return { allowed: false, remaining: 0 };
      }

      transaction.update(docRef, { count: data.count + 1 });
      return { allowed: true, remaining: RATE_LIMIT_MAX - data.count - 1 };
    });
  } catch (err) {
    // If rate limiting fails, allow the request but log the error
    console.error("[firstGlimpse] Rate limit check failed:", err.message);
    Sentry.captureException(err, { tags: { context: "firstGlimpse-rateLimit" } });
    return { allowed: true, remaining: -1 };
  }
}

/**
 * onRequest handler for the First Glimpse endpoint.
 *
 * POST body: { prompt: string }
 * Response:  { text: string } or { error: string }
 */
async function handler(req, res) {
  // CORS
  if (handleCors(req, res)) return;

  // POST only
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    // Rate limit
    const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim()
      || req.connection?.remoteAddress
      || "unknown";
    const rateResult = await checkRateLimit(ip);

    if (!rateResult.allowed) {
      res.status(429).json({
        error: "You've reached the maximum number of glimpses for now. Please try again in about an hour.",
      });
      return;
    }

    // Parse and validate
    const { prompt } = req.body || {};
    if (!prompt || typeof prompt !== "string") {
      res.status(400).json({ error: "Missing or invalid prompt" });
      return;
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      res.status(400).json({ error: "Prompt too long" });
      return;
    }

    // Call Claude via existing wrapper (text mode, not JSON)
    const text = await callClaude({
      system: "You are an AI coach for \"Your Dressage Journey.\" Follow the instructions in the user message precisely.",
      userMessage: prompt,
      maxTokens: 1000,
      context: "first-glimpse",
    });

    res.status(200).json({ text });
  } catch (err) {
    console.error("[firstGlimpse] Error:", err.message);
    Sentry.captureException(err, { tags: { context: "firstGlimpse" } });
    res.status(500).json({
      error: "We weren't able to generate your insight right now. Please try again in a moment.",
    });
  }
}

module.exports = { handler };
