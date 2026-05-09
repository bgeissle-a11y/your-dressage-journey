/**
 * Fresh Start Empathetic Coach Response — Firestore-triggered Cloud Function.
 *
 * Trigger: onDocumentCreated for `freshStarts/{docId}`.
 *
 * Flow:
 *   1. Read the just-created Fresh Start document. State (A or B) is set
 *      by the form's explicit toggle, not inferred.
 *   2. Fetch cached coaching context if it exists. Fresh Start works for
 *      both established and pre-established riders; absent cache is
 *      handled by the prompt.
 *   3. Build the Fresh Start Empathetic prompt (state-aware).
 *   4. Call Sonnet (text mode, ~250 output tokens — Fresh Start runs
 *      longer than the micro: 60–110 word budget).
 *   5. Update the same document with empatheticResponse,
 *      empatheticResponseGeneratedAt, and the analytics fields.
 *   6. On any failure, write a fallback canned response.
 *
 * Source of truth:
 *   YDJ_FreshStart_EmpatheticResponse_PromptSpec_v1_1.md
 *   YDJ_HabitLoop_Implementation_Brief.md §3.2
 */

const { db } = require("../lib/firebase");
const { callClaude } = require("../lib/claudeCall");
const { buildFreshStartEmpatheticPrompt } = require("../lib/promptBuilder");
const { getCoachingContext } = require("../lib/empatheticContext");

const MAX_OUTPUT_TOKENS = 400; // ~150 words plus buffer for State B
const FALLBACK_RESPONSE =
  "Welcome back. The dataset picks up from your next entry. No catch-up required.";

async function onSubmit(event) {
  const docId = event.params?.docId;
  const snap = event.data;

  if (!snap) {
    console.warn(`[freshStart] trigger fired without snapshot for ${docId}`);
    return;
  }
  const data = snap.data();
  if (!data) {
    console.warn(`[freshStart] trigger fired with empty data for ${docId}`);
    return;
  }

  const uid = data.userId;
  if (!uid) {
    console.warn(`[freshStart] doc ${docId} missing userId — skipping`);
    return;
  }
  if (data.empatheticResponse) {
    console.log(`[freshStart] doc ${docId} already has a response — skipping`);
    return;
  }

  // Per the spec's safety net: if state somehow missing, default to A.
  const state = data.state === "B" ? "B" : "A";

  const docRef = db.collection("freshStarts").doc(docId);

  try {
    // 1. Fetch coaching context (may be null for a brand-new rider whose
    //    Fresh Start fires before any MVC has generated).
    const coaching = await getCoachingContext(uid);
    const context = coaching ? { coaching } : {};

    // 2. Build prompt
    const { system, userMessage } = buildFreshStartEmpatheticPrompt(
      {
        state,
        confidence: data.confidence,
        confidenceExplanation: data.confidenceExplanation,
        workingOn: data.workingOn,
        goingWell: data.goingWell,
        difficult: data.difficult,
        anythingElse: data.anythingElse,
      },
      context
    );

    // 3. Sonnet call (text mode)
    const text = await callClaude({
      system,
      userMessage,
      jsonMode: false,
      maxTokens: MAX_OUTPUT_TOKENS,
      context: "fresh-start-empathetic",
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
      cacheAgeAtSubmission: coaching?.cacheAgeDays ?? null,
      cacheBandAtSubmission: coaching?.cacheBand ?? null,
    });

    console.log(
      `[freshStart] ${docId} response generated for ${uid} (state=${state}, cacheBand=${coaching?.cacheBand ?? "none"})`
    );
  } catch (err) {
    console.error(
      `[freshStart] response generation failed for doc ${docId}, uid ${uid}:`,
      err.message || err
    );
    try {
      await docRef.update({
        empatheticResponse: FALLBACK_RESPONSE,
        empatheticResponseGeneratedAt: new Date().toISOString(),
        empatheticResponseError: err.message || String(err),
      });
    } catch (writeErr) {
      console.error(
        `[freshStart] fallback write also failed for doc ${docId}:`,
        writeErr.message || writeErr
      );
    }
  }
}

module.exports = { onSubmit };
