/**
 * Micro-Debrief Empathetic Coach Response — Firestore-triggered Cloud Function.
 *
 * Trigger: onDocumentCreated for `microDebriefs/{docId}`.
 *
 * Flow:
 *   1. Read the just-created document.
 *   2. Detect rider state (new_no_first_light / new_with_first_light /
 *      established) via empatheticContext.detectRiderState.
 *   3. Fetch state-specific context:
 *        - established: cached coaching context (précis + trajectory +
 *          freshness band).
 *        - new_with_first_light: First Light themes + intentions.
 *        - new_no_first_light: nothing extra.
 *   4. Build the micro-debrief Empathetic prompt.
 *   5. Call Sonnet (text mode, ~80 output tokens).
 *   6. Update the same document with empatheticResponse, generatedAt, and
 *      the system fields the spec captures for analytics (riderState,
 *      cacheAgeAtSubmission, cacheBandAtSubmission).
 *   7. On any failure, write a fallback canned response so the rider sees
 *      something. Triggers must not throw — log and swallow.
 *
 * Source of truth:
 *   YDJ_MicroDebrief_EmpatheticResponse_PromptSpec.md
 *   YDJ_HabitLoop_Implementation_Brief.md §3.1
 */

const { db } = require("../lib/firebase");
const { callClaude } = require("../lib/claudeCall");
const { buildMicroDebriefEmpatheticPrompt } = require("../lib/promptBuilder");
const {
  detectRiderState,
  getCoachingContext,
  getFirstLightContext,
} = require("../lib/empatheticContext");

const MAX_OUTPUT_TOKENS = 200; // ~80 words plus buffer
const FALLBACK_RESPONSE =
  "Captured. Thanks for logging this one — we'll take it from here.";

async function onSubmit(event) {
  const docId = event.params?.docId;
  const snap = event.data;

  // Guard: trigger may fire without a snapshot (rare, but documented)
  if (!snap) {
    console.warn(`[microDebrief] trigger fired without snapshot for ${docId}`);
    return;
  }

  const data = snap.data();
  if (!data) {
    console.warn(`[microDebrief] trigger fired with empty data for ${docId}`);
    return;
  }

  const uid = data.userId;
  if (!uid) {
    console.warn(`[microDebrief] doc ${docId} missing userId — skipping`);
    return;
  }

  // Skip if the doc was created with a response already populated (e.g.
  // backfill or an admin-side restore). Avoids paying for a regen we
  // don't need.
  if (data.empatheticResponse) {
    console.log(`[microDebrief] doc ${docId} already has a response — skipping`);
    return;
  }

  const docRef = db.collection("microDebriefs").doc(docId);

  try {
    // 1. Detect rider state and fetch context in parallel where possible.
    const riderState = await detectRiderState(uid);
    let context = {};
    if (riderState === "established") {
      const coaching = await getCoachingContext(uid);
      if (coaching) context.coaching = coaching;
    } else if (riderState === "new_with_first_light") {
      const firstLight = await getFirstLightContext(uid);
      if (firstLight) context.firstLight = firstLight;
    }

    // 2. Build prompt
    const { system, userMessage } = buildMicroDebriefEmpatheticPrompt(
      {
        date: data.date,
        horseName: data.horseName,
        quality: data.quality,
        mentalState: data.mentalState,
        momentText: data.momentText,
      },
      riderState,
      context
    );

    // 3. Sonnet call (text mode)
    const text = await callClaude({
      system,
      userMessage,
      jsonMode: false,
      maxTokens: MAX_OUTPUT_TOKENS,
      context: "micro-debrief-empathetic",
      uid,
    });

    const responseText = (typeof text === "string" ? text : String(text ?? "")).trim();
    if (!responseText) {
      throw new Error("Sonnet returned empty response");
    }

    // 4. Persist response + analytics fields
    await docRef.update({
      empatheticResponse: responseText,
      empatheticResponseGeneratedAt: new Date().toISOString(),
      riderState,
      cacheAgeAtSubmission: context.coaching?.cacheAgeDays ?? null,
      cacheBandAtSubmission: context.coaching?.cacheBand ?? null,
      voiceUsed: "empathetic",
    });

    console.log(
      `[microDebrief] ${docId} response generated for ${uid} (state=${riderState}, cacheBand=${context.coaching?.cacheBand ?? "n/a"})`
    );
  } catch (err) {
    console.error(
      `[microDebrief] response generation failed for doc ${docId}, uid ${uid}:`,
      err.message || err
    );
    // Always write SOMETHING so the rider sees a response.
    try {
      await docRef.update({
        empatheticResponse: FALLBACK_RESPONSE,
        empatheticResponseGeneratedAt: new Date().toISOString(),
        empatheticResponseError: err.message || String(err),
        voiceUsed: "empathetic",
      });
    } catch (writeErr) {
      console.error(
        `[microDebrief] fallback write also failed for doc ${docId}:`,
        writeErr.message || writeErr
      );
    }
  }
}

module.exports = { onSubmit };
