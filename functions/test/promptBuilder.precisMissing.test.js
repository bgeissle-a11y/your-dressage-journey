/**
 * Tests for buildMultiVoicePrecisPrompt — H3 hardening: when one of the
 * four voices is missing (null/undefined), the prompt must:
 *  1) substitute a sentinel string in the user message instead of "null"
 *  2) instruct the model to omit that voice's perspective via the
 *     MISSING ANALYSES section in the system prompt
 *
 * Run with:  node --test functions/test/promptBuilder.precisMissing.test.js
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildMultiVoicePrecisPrompt } = require("../lib/promptBuilder");

const SENTINEL = "[ANALYSIS UNAVAILABLE THIS RUN]";

test("system prompt includes the MISSING ANALYSES section", () => {
  const { system } = buildMultiVoicePrecisPrompt({
    0: { analysis: "classical" },
    1: { analysis: "empathetic" },
    2: { analysis: "technical" },
    3: { analysis: "strategist" },
  });
  assert.match(system, /MISSING ANALYSES/);
  assert.match(system, new RegExp(SENTINEL.replace(/[[\]]/g, "\\$&")));
  assert.match(system, /omit\s+that voice's perspective/);
});

test("userMessage substitutes the sentinel for a missing voice", () => {
  const { userMessage } = buildMultiVoicePrecisPrompt({
    0: { analysis: "classical" },
    1: null,
    2: { analysis: "technical" },
    3: { analysis: "strategist" },
  });

  // Sentinel appears exactly once (only voice 1 is missing).
  const matches = userMessage.match(/\[ANALYSIS UNAVAILABLE THIS RUN\]/g) || [];
  assert.equal(matches.length, 1, "sentinel should appear exactly once");

  // Sentinel sits under the Empathetic Coach header.
  assert.match(
    userMessage,
    /Empathetic Coach analysis:\s*"\[ANALYSIS UNAVAILABLE THIS RUN\]"/
  );

  // The other three voices serialize their real content.
  assert.match(userMessage, /"analysis": "classical"/);
  assert.match(userMessage, /"analysis": "technical"/);
  assert.match(userMessage, /"analysis": "strategist"/);

  // No literal "null" tokens leak through.
  assert.doesNotMatch(userMessage, /^null$/m);
});

test("userMessage with all four voices present contains no sentinel", () => {
  const { userMessage } = buildMultiVoicePrecisPrompt({
    0: { analysis: "classical" },
    1: { analysis: "empathetic" },
    2: { analysis: "technical" },
    3: { analysis: "strategist" },
  });
  assert.doesNotMatch(userMessage, /\[ANALYSIS UNAVAILABLE THIS RUN\]/);
});

test("undefined voice entry is treated the same as null (sentinel substituted)", () => {
  const { userMessage } = buildMultiVoicePrecisPrompt({
    0: { analysis: "classical" },
    // 1 missing entirely
    2: { analysis: "technical" },
    3: { analysis: "strategist" },
  });
  assert.match(
    userMessage,
    /Empathetic Coach analysis:\s*"\[ANALYSIS UNAVAILABLE THIS RUN\]"/
  );
});
