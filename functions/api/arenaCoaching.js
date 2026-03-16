/**
 * Arena Geometry Trainer — Classical Master Coaching
 *
 * Lightweight endpoint for the standalone Arena Geometry Trainer page.
 * Accepts figure tracing results and returns a short Classical Master response.
 * No auth required — this is a platform-wide learning resource.
 *
 * Input (POST JSON):  { figure, grade, avgDev, coverage, aiHint }
 * Output (JSON):      { coaching: "..." }
 */

const { callClaude } = require("../lib/claudeCall");

async function handler(req, res) {
  // CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { figure, grade, avgDev, coverage, aiHint } = req.body || {};

  if (!figure || !grade || avgDev == null || coverage == null) {
    return res.status(400).json({ error: "Missing required fields: figure, grade, avgDev, coverage" });
  }

  const prompt =
    `You are The Classical Master from Your Dressage Journey — ` +
    `precise, demanding, classically grounded. Never sentimental. Pithy.\n\n` +
    `A rider traced a ${figure} on an interactive arena diagram.\n` +
    `Grade: ${grade}. Average deviation: ${Number(avgDev).toFixed(1)}m.\n` +
    `Coverage: ${coverage}%.\n\n` +
    `GEOMETRY CONTEXT (authoritative — follow exactly, do not contradict):\n` +
    `${aiHint || "N/A"}\n\n` +
    `Give exactly 2–3 sentences of coaching. Reference ONLY the specific landmarks ` +
    `and measurements described in the geometry context above. Do NOT assume standard ` +
    `geometry from memory — the context above is the sole source of truth for this figure. ` +
    `Never begin with "I". Even for Excellent, find something to sharpen.`;

  try {
    const text = await callClaude({
      system: "You are a concise dressage coaching voice. Respond with plain text only.",
      userMessage: prompt,
      maxTokens: 130,
      context: "arena-coaching",
    });

    return res.status(200).json({ coaching: text.trim() });
  } catch (err) {
    console.error("[arena-coaching] Error:", err.message);
    return res.status(500).json({ error: "Coaching generation failed" });
  }
}

module.exports = { handler };
