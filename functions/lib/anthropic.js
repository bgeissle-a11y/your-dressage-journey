/**
 * Anthropic SDK client initialization
 *
 * The API key is read from the ANTHROPIC_API_KEY environment variable.
 *
 * For local development:
 *   Set ANTHROPIC_API_KEY in functions/.env
 *   Run with: firebase emulators:start --only functions
 *
 * For production:
 *   Set the secret using Firebase Functions secrets:
 *   firebase functions:secrets:set ANTHROPIC_API_KEY
 *
 *   Then declare it in your function definition:
 *   const { defineSecret } = require("firebase-functions/params");
 *   const anthropicKey = defineSecret("ANTHROPIC_API_KEY");
 *   exports.myFn = onCall({ secrets: [anthropicKey] }, handler);
 */

const Anthropic = require("@anthropic-ai/sdk");

let _client = null;

/**
 * Returns a lazily-initialized Anthropic client.
 * Lazy initialization avoids errors during cold start if the
 * API key is not needed by every function in this deployment.
 *
 * @returns {Anthropic} The Anthropic SDK client
 */
function getAnthropicClient() {
  if (!_client) {
    const apiKey = (process.env.ANTHROPIC_API_KEY || "").trim();
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY environment variable is not set. " +
        "Set it via: firebase functions:secrets:set ANTHROPIC_API_KEY"
      );
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

module.exports = { getAnthropicClient };
