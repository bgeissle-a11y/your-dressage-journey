/**
 * Shared fixture for coaching.js tests.
 *
 * Injects stubs into require.cache for every lib/ dependency that coaching.js
 * pulls in, then requires the handler. Tests mutate the exported `state`
 * object to drive per-test behavior (which voice fails, what stale rows
 * exist, which locks are pre-held, etc.).
 *
 * Production code is never imported with real Firestore/Claude bindings,
 * so these tests stay hermetic and run under plain `node --test`.
 */

const path = require("path");

function installMock(relPath, exportsObj) {
  const abs = require.resolve(relPath, { paths: [path.resolve(__dirname, "../api")] });
  require.cache[abs] = {
    id: abs,
    filename: abs,
    loaded: true,
    exports: exportsObj,
    children: [],
    parent: null,
    paths: [],
  };
}

// Mutable state that tests read/write between runs.
const state = {
  // Per-voice override for callClaude("coaching-voice-N"). Either:
  //   { type: "value", value: {...} }  — voice resolves with this value
  //   { type: "error", error: new Error("...") }  — voice rejects
  voiceBehavior: { 0: null, 1: null, 2: null, 3: null },
  // Sentinel returned by callClaude("coaching-quick-insights"). null → throws.
  quickInsightsValue: { practiceCard: null, visualizationSuggestion: { shouldSuggest: false } },
  // Sentinel returned by callClaude("coaching-precis"). null → throws.
  precisValue: "A short voice-agnostic prose précis used by downstream prompts.",
  // Per-voice stale rows surfaced by getStaleCache when no currentHash is
  // supplied (the partial-failure fallback path). Keyed by voiceIndex.
  staleVoiceRows: { 0: null, 1: null, 2: null, 3: null },

  // Current data hash returned by the prepareRiderData mock. Stale rows whose
  // dataSnapshotHash equals this are "matching" and may be served (Fix 2b).
  currentHash: "hash-current",

  // Observations the tests can assert against.
  callLog: [],            // every callClaude({context}) appended here
  cacheWrites: [],        // every setCache(uid, type, result, meta)
  locksHeld: new Set(),   // current lock keys
  telemetry: [],          // coachingTelemetry events recorded
};

function reset() {
  state.voiceBehavior = { 0: null, 1: null, 2: null, 3: null };
  state.quickInsightsValue = { practiceCard: null, visualizationSuggestion: { shouldSuggest: false } };
  state.precisValue = "A short voice-agnostic prose précis used by downstream prompts.";
  state.staleVoiceRows = { 0: null, 1: null, 2: null, 3: null };
  state.currentHash = "hash-current";
  state.callLog = [];
  state.cacheWrites = [];
  state.locksHeld = new Set();
  state.telemetry = [];
}

// ── lib/ mocks ─────────────────────────────────────────────────────────────

installMock("../lib/auth", {
  validateAuth: (req) => req?.auth?.uid || "uid-test",
});

installMock("../lib/loadSubscription", {
  enforceCapability: async () => ({ tier: "medium", isPilot: false }),
});

installMock("../lib/entitlements", {
  CAPABILITIES: { generateCoaching: "generateCoaching" },
});

installMock("../lib/errors", {
  wrapError: (err) => err,
});

installMock("../lib/prepareRiderData", {
  prepareRiderData: async (uid) => ({
    uid,
    dataTier: 1,
    tier: { label: "medium" },
    dataSnapshot: { hash: state.currentHash },
    horseProfiles: [{ horseName: "Star" }],
  }),
});

installMock("../lib/claudeCall", {
  callClaude: async ({ context }) => {
    state.callLog.push(context);

    if (context && context.startsWith("coaching-voice-")) {
      const idx = Number(context.slice("coaching-voice-".length));
      const beh = state.voiceBehavior[idx];
      if (beh && beh.type === "error") throw beh.error;
      if (beh && beh.type === "value") return beh.value;
      return { analysis: `voice-${idx}-fresh` };
    }

    if (context === "coaching-quick-insights") {
      if (state.quickInsightsValue == null) throw new Error("synthetic quick insights failure");
      return state.quickInsightsValue;
    }

    if (context === "coaching-precis") {
      if (state.precisValue == null) throw new Error("synthetic précis failure");
      return state.precisValue;
    }

    throw new Error(`Unexpected callClaude context: ${context}`);
  },
});

installMock("../lib/promptBuilder", {
  buildCoachingPrompt: () => ({ system: "sys", userMessage: "msg" }),
  buildQuickInsightsPrompt: () => ({ system: "sys", userMessage: "msg" }),
  buildMultiVoicePrecisPrompt: () => ({ system: "sys", userMessage: "msg" }),
  VOICE_META: [
    { id: 0, name: "Classical Master" },
    { id: 1, name: "Empathetic Coach" },
    { id: 2, name: "Technical Coach" },
    { id: 3, name: "Practical Strategist" },
  ],
});

installMock("../lib/cacheManager", {
  // getCache always misses so generateVoice flows through to callClaude.
  getCache: async () => null,
  setCache: async (uid, outputType, result, meta) => {
    state.cacheWrites.push({ uid, outputType, result, meta });
  },
  getStaleCache: async (uid, outputType, opts = {}) => {
    if (outputType !== "coaching") return null;
    const i = opts.voiceIndex;
    if (i == null) return null;
    return state.staleVoiceRows[i];
  },
});

installMock("../lib/generationStatus", {
  getStatus: async () => null,
});

installMock("../lib/inflightLock", {
  tryAcquireLock: async (uid, type) => {
    const key = `${uid}_${type}`;
    if (state.locksHeld.has(key)) return false;
    state.locksHeld.add(key);
    return true;
  },
  releaseLock: async (uid, type) => {
    state.locksHeld.delete(`${uid}_${type}`);
  },
});

installMock("../lib/weeklyFocusSnapshot", {
  refreshWeeklyFocusSnapshotSection: async () => {},
});

installMock("../lib/tokenBudgets", {
  getMaxTokens: () => 2000,
  tierFromLabel: () => "medium",
});

installMock("../lib/budgetExhaustion", {
  isBudgetExceeded: () => false,
  buildGracefulResponse: async () => ({ success: true, graceful: true }),
});

installMock("../lib/lastRegenError", {
  writeLastRegenError: async () => {},
  clearLastRegenError: async () => {},
});

installMock("../lib/coachingTelemetry", {
  reportStaleFallbackServe: (args) => state.telemetry.push({ kind: "stale", ...args }),
  reportJsonExtractionFailure: (args) => state.telemetry.push({ kind: "json", ...args }),
  outputTypeFromContext: (c) => (c || "unknown").split("-")[0] || "unknown",
});

// firebase-functions/v2/https: we only use HttpsError as a thrown sentinel,
// and these tests don't exercise that path.
installMock("firebase-functions/v2/https", {
  HttpsError: class HttpsError extends Error {
    constructor(code, message) { super(message); this.code = code; }
  },
});

// Now load the handler with the mocks in place.
const { handler } = require("../api/coaching");

module.exports = { handler, state, reset };
