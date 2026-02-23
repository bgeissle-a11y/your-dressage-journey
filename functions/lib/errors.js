/**
 * Error handling utilities for Cloud Functions
 *
 * Provides consistent error wrapping so that:
 * - Known validation errors use appropriate HttpsError codes
 * - Unexpected errors are logged and wrapped as 'internal'
 * - Zod validation errors are formatted into user-friendly messages
 * - Errors are classified by category for frontend display
 */

const { HttpsError } = require("firebase-functions/v2/https");
const { ZodError } = require("zod");
const Sentry = require("@sentry/node");

/**
 * Classify an error into a category for frontend error display.
 *
 * Categories:
 *   transient   — rate limits, server overload, network issues (retryable)
 *   data_issue  — JSON parsing failures, truncated responses (retry once)
 *   permanent   — bad API key, bad request, invalid model (don't retry)
 *   unknown     — everything else (may retry once)
 *
 * @param {Error} error
 * @returns {{ category: string, retryable: boolean, userMessage: string }}
 */
function classifyError(error) {
  const status = error.status || error.statusCode;
  const code = error.code;
  const msg = (error.message || "").toLowerCase();

  // Transient: rate limits, server overload, network issues
  if (status === 429 || msg.includes("rate_limit") || msg.includes("rate limit")) {
    return {
      category: "transient",
      retryable: true,
      userMessage: "Our AI service is temporarily busy. Please try again in a moment.",
    };
  }
  if (status === 529 || (status >= 500 && status < 600)) {
    return {
      category: "transient",
      retryable: true,
      userMessage: "Our AI service is temporarily unavailable. Please try again shortly.",
    };
  }
  if (code === "ETIMEDOUT" || code === "ECONNRESET" || code === "ECONNREFUSED" ||
      code === "ENOTFOUND" || msg.includes("timeout") || msg.includes("network")) {
    return {
      category: "transient",
      retryable: true,
      userMessage: "A network issue occurred. Please check your connection and try again.",
    };
  }

  // Data issue: JSON parsing failures, truncated responses
  if (msg.includes("failed to extract valid json") || msg.includes("truncated")) {
    return {
      category: "data_issue",
      retryable: true,
      userMessage: "We received an unusual response from our AI. A retry usually fixes this.",
    };
  }

  // Permanent: authentication, bad request
  if (status === 401 || status === 403 || msg.includes("api key")) {
    return {
      category: "permanent",
      retryable: false,
      userMessage: "There is an AI service configuration issue. Please contact support if this persists.",
    };
  }
  if (status === 400) {
    return {
      category: "permanent",
      retryable: false,
      userMessage: "Something went wrong with this request. Please try again, or contact support if the problem persists.",
    };
  }

  // Unknown
  return {
    category: "unknown",
    retryable: true,
    userMessage: "An unexpected error occurred. Please try again.",
  };
}

/**
 * Check whether an error is transient (worth retrying automatically).
 *
 * @param {Error} error
 * @returns {boolean}
 */
function isTransientError(error) {
  return classifyError(error).category === "transient";
}

/**
 * Wraps a Zod validation error into an HttpsError with code 'invalid-argument'.
 * Formats the Zod issues into a readable message.
 *
 * @param {ZodError} zodError
 * @returns {HttpsError}
 */
function fromZodError(zodError) {
  const messages = zodError.issues.map(
    (issue) => `${issue.path.join(".")}: ${issue.message}`
  );
  return new HttpsError(
    "invalid-argument",
    `Validation failed: ${messages.join("; ")}`
  );
}

/**
 * Wraps an unknown error into an HttpsError with categorized details.
 * If it's already an HttpsError, passes it through.
 * Otherwise logs the full error and returns a user-friendly error
 * with category/retryable details for the frontend.
 *
 * @param {Error} error - The caught error
 * @param {string} [context] - Optional context string for logging
 * @returns {HttpsError}
 */
function wrapError(error, context = "Cloud Function") {
  if (error instanceof HttpsError) {
    return error;
  }
  if (error instanceof ZodError) {
    return fromZodError(error);
  }

  const { category, retryable, userMessage } = classifyError(error);
  console.error(`[${context}] ${category} error:`, error);

  Sentry.captureException(error, { tags: { context, category } });

  return new HttpsError("internal", userMessage, { category, retryable });
}

module.exports = { fromZodError, wrapError, classifyError, isTransientError };
