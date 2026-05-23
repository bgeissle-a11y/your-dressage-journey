/**
 * H4 — Daily Claude call limit gating, tier-aware.
 *
 * Verifies callClaude() throws "rate-limit-exceeded" when the per-user
 * UTC-day counter has hit the tier's cap (Working 30, Medium 60,
 * Extended 100). Below the cap, the call proceeds through to the mocked
 * Anthropic client.
 *
 * Run with:  node --test functions/test/claudeCall.dailyLimit.test.js
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

function installMock(relPath, exportsObj) {
  const abs = require.resolve(relPath, { paths: [path.resolve(__dirname, "../lib")] });
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

// Mutable state controlling what the mocked Firestore transaction sees.
const state = {
  // Subscription tier returned by the users/{uid} doc.
  tier: "medium",
  // What the usageBudgets/{uid} doc looks like at start of the transaction.
  // Set to null to simulate "no doc yet today".
  budgetDoc: null,
  // Records the final result of the transaction (after the handler resolves).
  txWrites: [],
};

function reset() {
  state.tier = "medium";
  state.budgetDoc = null;
  state.txWrites = [];
}

// Mock the firebase db. The real claudeCall reads:
//   db.collection(BUDGET_COLLECTION).doc(uid)   → budget row
//   db.collection("users").doc(uid)             → tier
// then runs db.runTransaction(async (tx) => { ... }).
installMock("../lib/firebase", {
  db: {
    collection: (name) => ({
      doc: (uid) => ({ __coll: name, __uid: uid }),
      // _logUsage does usageLogs.add(...) — fire-and-forget, swallow errors.
      add: async () => ({ id: "log-mock" }),
    }),
    runTransaction: async (fn) => {
      const tx = {
        get: async (ref) => {
          if (ref.__coll === "usageBudgets") {
            return state.budgetDoc
              ? { exists: true, data: () => state.budgetDoc }
              : { exists: false, data: () => null };
          }
          if (ref.__coll === "users") {
            return { exists: true, data: () => ({ subscriptionTier: state.tier }) };
          }
          return { exists: false, data: () => null };
        },
        set: (ref, data, opts) => state.txWrites.push({ kind: "set", ref, data, opts }),
        update: (ref, data) => state.txWrites.push({ kind: "update", ref, data }),
      };
      return await fn(tx);
    },
  },
});

// Mock the Anthropic client so an "allowed" call doesn't hit the network.
installMock("../lib/anthropic", {
  getAnthropicClient: () => ({
    messages: {
      stream: () => ({
        finalMessage: async () => ({
          content: [{ type: "text", text: "ok" }],
          usage: { input_tokens: 10, output_tokens: 5 },
          stop_reason: "end_turn",
        }),
      }),
    },
  }),
});

installMock("../lib/errors", {
  isTransientError: () => false,
});

const { callClaude } = require("../lib/claudeCall");

const todayIso = new Date().toISOString().slice(0, 10);

function callOpts() {
  return {
    system: "sys",
    userMessage: "msg",
    uid: "uid-test",
    context: "test-context",
    maxRetries: 0,
  };
}

test("Working-tier user at count=30 throws rate-limit-exceeded with capExceeded shape", async () => {
  reset();
  state.tier = "working";
  state.budgetDoc = { date: todayIso, count: 30 };

  await assert.rejects(
    () => callClaude(callOpts()),
    (err) => {
      assert.equal(err.code, "rate-limit-exceeded");
      assert.ok(err.capExceeded, "err.capExceeded should be set");
      assert.equal(err.capExceeded.kind, "daily");
      assert.equal(err.capExceeded.limit, 30);
      assert.equal(err.capExceeded.tier, "working");
      assert.match(err.message, /Daily API call limit reached for your plan/);
      return true;
    },
  );
});

test("Medium-tier user at count=30 is allowed (under their 60 cap)", async () => {
  reset();
  state.tier = "medium";
  state.budgetDoc = { date: todayIso, count: 30 };

  const result = await callClaude(callOpts());
  assert.equal(result, "ok");
  // Verify the transaction incremented the counter (update with count: 31)
  const updates = state.txWrites.filter((w) => w.kind === "update");
  assert.ok(updates.find((w) => w.data.count === 31), "counter must increment to 31");
});

test("Medium-tier user at count=60 throws rate-limit-exceeded with tier=medium", async () => {
  reset();
  state.tier = "medium";
  state.budgetDoc = { date: todayIso, count: 60 };

  await assert.rejects(
    () => callClaude(callOpts()),
    (err) => {
      assert.equal(err.code, "rate-limit-exceeded");
      assert.equal(err.capExceeded.limit, 60);
      assert.equal(err.capExceeded.tier, "medium");
      return true;
    },
  );
});

test("Extended-tier user at count=99 is allowed; at count=100 throws with limit=100", async () => {
  reset();
  state.tier = "extended";

  // 99 → allowed
  state.budgetDoc = { date: todayIso, count: 99 };
  state.txWrites = [];
  const ok = await callClaude(callOpts());
  assert.equal(ok, "ok");

  // 100 → throws
  state.budgetDoc = { date: todayIso, count: 100 };
  state.txWrites = [];
  await assert.rejects(
    () => callClaude(callOpts()),
    (err) => {
      assert.equal(err.code, "rate-limit-exceeded");
      assert.equal(err.capExceeded.limit, 100);
      assert.equal(err.capExceeded.tier, "extended");
      return true;
    },
  );
});
