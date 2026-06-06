/**
 * Coaching reliability telemetry.
 *
 * Reports two failure classes the coaching pipeline previously swallowed
 * silently (diagnosed 2026-06-04, scripts/repetition-diagnostic/):
 *   1. JSON-extraction failures on a voice/insights response.
 *   2. Stale-cache fallback serves — and, post-fix, any *suppressed*
 *      non-matching stale serve (which must never reach a rider).
 *
 * Goal: know the production rate of these before/after the fix. Pre-fix the
 * wrong-horse serve returned success:true with no signal at all.
 *
 * PII DISCIPLINE: never log debrief/reflection text, rider names, or horse
 * names. Only identifiers (outputType, voiceIndex), booleans, and — for
 * extraction failures — a short structural prefix of the offending response
 * (the JSON scaffold opening, which carries no rider prose). Cap at 40 chars.
 */

const Sentry = require("./sentry");

/** Derive a coarse outputType from a context label like "coaching-voice-0". */
function outputTypeFromContext(context) {
  return (context || "unknown").split("-")[0] || "unknown";
}

/**
 * Report a JSON-extraction failure.
 *
 * @param {object} args
 * @param {string} args.context   - call label, e.g. "coaching-voice-0"
 * @param {number} [args.voiceIndex]
 * @param {boolean} args.recovered - whether a retry/repair produced valid JSON
 * @param {string} [args.responsePrefix] - first chars of the offending response
 *   (structural JSON opening only; truncated to 40 chars here defensively)
 */
function reportJsonExtractionFailure({ context, voiceIndex, recovered, responsePrefix }) {
  const outputType = outputTypeFromContext(context);
  const safePrefix = String(responsePrefix || "").slice(0, 40);
  console.warn(
    `[telemetry] json-extract-failure context=${context} recovered=${!!recovered}`
  );
  try {
    Sentry.captureMessage("coaching.json_extraction_failure", {
      level: recovered ? "warning" : "error",
      tags: {
        coaching_event: "json_extraction_failure",
        outputType,
        voiceIndex: voiceIndex === undefined || voiceIndex === null ? "n/a" : String(voiceIndex),
        recovered: String(!!recovered),
      },
      extra: { context, responsePrefix: safePrefix },
    });
  } catch (_) {
    /* never let telemetry throw into the call path */
  }
}

/**
 * Report a stale-cache fallback serve.
 *
 * @param {object} args
 * @param {string} args.outputType - e.g. "coaching"
 * @param {number} [args.voiceIndex]
 * @param {boolean} args.hashMatched - whether the cached content hash matched
 *   the current data. Post-fix this must always be true when served; a false
 *   here means a non-matching serve was SUPPRESSED (logged as error) — or, if
 *   it ever reaches a rider, a contract violation.
 * @param {boolean} [args.served] - whether the stale content was actually
 *   returned to the rider (true) or suppressed in favor of an error placeholder.
 */
function reportStaleFallbackServe({ outputType, voiceIndex, hashMatched, served = true }) {
  // A non-matching serve reaching a rider is the bug we are eliminating.
  const isViolation = served && hashMatched === false;
  console.warn(
    `[telemetry] stale-fallback outputType=${outputType} voice=${voiceIndex} hashMatched=${hashMatched} served=${served}`
  );
  try {
    Sentry.captureMessage("coaching.stale_fallback_serve", {
      level: isViolation ? "error" : "info",
      tags: {
        coaching_event: "stale_fallback_serve",
        outputType: outputType || "unknown",
        voiceIndex: voiceIndex === undefined || voiceIndex === null ? "n/a" : String(voiceIndex),
        hashMatched: String(hashMatched),
        served: String(served),
        contractViolation: String(isViolation),
      },
    });
  } catch (_) {
    /* never let telemetry throw into the call path */
  }
}

module.exports = { reportJsonExtractionFailure, reportStaleFallbackServe, outputTypeFromContext };
