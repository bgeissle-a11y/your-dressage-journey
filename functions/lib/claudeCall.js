/**
 * Claude API Call Wrapper
 *
 * Thin wrapper around the Anthropic SDK that provides:
 * - Consistent message formatting (system + user)
 * - JSON mode: extracts and parses JSON from response
 * - Text mode: returns raw text content
 * - Token usage logging for cost tracking
 * - Configurable model and max tokens
 */

const { getAnthropicClient } = require("./anthropic");
const { isTransientError } = require("./errors");

const DEFAULT_MODEL = "claude-sonnet-4-5-20250929";
const DEFAULT_MAX_TOKENS = 4096;
const DEFAULT_MAX_RETRIES = 1;
const RETRY_BASE_DELAY_MS = 2000;

/**
 * Make a call to the Claude API with automatic retry for transient failures.
 *
 * @param {object} options
 * @param {string} options.system - System prompt
 * @param {string} options.userMessage - User message content
 * @param {string} [options.model] - Model ID (default: claude-sonnet-4-5-20250929)
 * @param {boolean} [options.jsonMode] - If true, parse response as JSON
 * @param {number} [options.maxTokens] - Max output tokens (default: 4096)
 * @param {string} [options.context] - Label for logging (e.g. "coaching-voice-0")
 * @param {number} [options.maxRetries] - Max retries for transient failures (default: 1)
 * @returns {Promise<object|string>} Parsed JSON object or text string
 */
async function callClaude({
  system,
  userMessage,
  model = DEFAULT_MODEL,
  jsonMode = false,
  maxTokens = DEFAULT_MAX_TOKENS,
  context = "claude-call",
  maxRetries = DEFAULT_MAX_RETRIES,
}) {
  const client = getAnthropicClient();
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await _callClaudeOnce(client, {
        system, userMessage, model, jsonMode, maxTokens, context,
      });
    } catch (err) {
      lastError = err;

      if (attempt < maxRetries && isTransientError(err)) {
        const delay = Math.min(RETRY_BASE_DELAY_MS * Math.pow(2, attempt), 10000);
        console.warn(
          `[${context}] Transient error on attempt ${attempt + 1}, retrying in ${delay}ms: ${err.message}`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw err;
    }
  }

  // Should not reach here, but safety net
  throw lastError;
}

/**
 * Single attempt to call the Claude API (no retries).
 * @private
 */
async function _callClaudeOnce(client, { system, userMessage, model, jsonMode, maxTokens, context }) {
  // Use streaming to avoid SDK timeout on large max_tokens requests
  const response = await client.messages
    .stream({ model, max_tokens: maxTokens, system, messages: [{ role: "user", content: userMessage }] })
    .finalMessage();

  // Log token usage and stop reason for debugging
  const usage = response.usage || {};
  const stopReason = response.stop_reason || "unknown";
  console.log(
    `[${context}] Tokens — input: ${usage.input_tokens || "?"}, output: ${usage.output_tokens || "?"}, model: ${model}, stop: ${stopReason}`
  );

  if (stopReason === "max_tokens") {
    console.warn(
      `[${context}] ⚠ Response truncated (hit max_tokens: ${maxTokens}). Output used ${usage.output_tokens} tokens.`
    );
  }

  // Extract text content from response
  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock) {
    throw new Error(`[${context}] No text content in Claude response`);
  }

  const text = textBlock.text;

  if (!jsonMode) {
    return text;
  }

  // JSON mode: extract and parse JSON from response
  return extractJSON(text, context, stopReason === "max_tokens");
}

/**
 * Extract JSON from a Claude response that may contain markdown fences
 * or other text surrounding the JSON.
 *
 * @param {string} text - Raw response text
 * @param {string} context - Label for error messages
 * @param {boolean} wasTruncated - Whether the response hit max_tokens
 * @returns {object} Parsed JSON object
 */
function extractJSON(text, context, wasTruncated = false) {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // Not pure JSON, try to extract from markdown code fences
  }

  // Try extracting from ```json ... ``` or ``` ... ```
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1]);
    } catch {
      // Fence content wasn't valid JSON either
    }
  }

  // Try finding JSON object/array boundaries
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  if (jsonStart !== -1 && jsonEnd > jsonStart) {
    try {
      return JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    } catch {
      // Still not valid JSON
    }
  }

  // Try wrapping bare JSON content in braces (model omitted outer {})
  // Detect by checking if text starts with a JSON key pattern like "some_key":
  const trimmed = text.trim();
  if (trimmed.startsWith('"') && !trimmed.startsWith('{')) {
    try {
      return JSON.parse("{" + trimmed + "}");
    } catch {
      // Bare JSON wrapping didn't work either
    }
  }

  // If truncated, attempt to repair the JSON by closing unclosed brackets
  if (wasTruncated) {
    const textToRepair = jsonStart !== -1
      ? text.slice(jsonStart)
      : (trimmed.startsWith('"') ? "{" + trimmed : null);

    if (textToRepair) {
      console.warn(`[${context}] Attempting to repair truncated JSON...`);
      const repaired = repairTruncatedJSON(textToRepair);
      if (repaired) {
        console.log(`[${context}] ✓ Truncated JSON repaired successfully.`);
        return repaired;
      }
    }
    throw new Error(
      `[${context}] Response was TRUNCATED (hit max_tokens) and JSON could not be repaired. ` +
        `The output is too large for the current token limit. ` +
        `Response starts with: "${text.slice(0, 200)}..."`
    );
  }

  throw new Error(
    `[${context}] Failed to extract valid JSON from Claude response. ` +
      `Response starts with: "${text.slice(0, 200)}..."`
  );
}

/**
 * Attempt to repair truncated JSON by closing unclosed brackets, braces,
 * and strings. This handles the common case where a response is cut off
 * mid-stream due to max_tokens.
 *
 * @param {string} text - Raw JSON text (starting from first '{')
 * @returns {object|null} Parsed JSON object, or null if repair failed
 */
function repairTruncatedJSON(text) {
  // Trim any trailing incomplete values (e.g., cut-off strings or numbers)
  let repaired = text;

  // Remove any trailing incomplete string value (text ending mid-string)
  // Look for the last complete key-value or array element
  // Strategy: progressively trim from the end and try closing brackets

  // First, check if we're inside an unclosed string — remove everything
  // back to the last unescaped quote that opened it
  let inString = false;
  let lastStringStart = -1;
  for (let i = 0; i < repaired.length; i++) {
    if (repaired[i] === '"' && (i === 0 || repaired[i - 1] !== "\\")) {
      if (!inString) {
        lastStringStart = i;
        inString = true;
      } else {
        inString = false;
      }
    }
  }

  if (inString && lastStringStart !== -1) {
    // We're inside an unclosed string — truncate back to before the key or value
    // Find the colon or comma before this string to determine context
    const beforeString = repaired.slice(0, lastStringStart).trimEnd();
    if (beforeString.endsWith(":")) {
      // This was a value string — remove the key:value pair
      const lastCommaOrBrace = Math.max(
        beforeString.lastIndexOf(","),
        beforeString.lastIndexOf("{"),
        beforeString.lastIndexOf("[")
      );
      if (lastCommaOrBrace !== -1) {
        const ch = beforeString[lastCommaOrBrace];
        repaired = beforeString.slice(0, lastCommaOrBrace + (ch === "," ? 0 : 1));
      }
    } else if (beforeString.endsWith(",") || beforeString.endsWith("[")) {
      // This was an array element — remove it
      repaired = beforeString.slice(0, -1);
    } else {
      // Close the string and hope for the best
      repaired = repaired.slice(0, lastStringStart) + '""';
    }
  }

  // Now close any unclosed brackets/braces
  const stack = [];
  let inStr = false;
  for (let i = 0; i < repaired.length; i++) {
    const ch = repaired[i];
    if (ch === '"' && (i === 0 || repaired[i - 1] !== "\\")) {
      inStr = !inStr;
      continue;
    }
    if (inStr) continue;
    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") {
      if (stack.length > 0 && stack[stack.length - 1] === ch) {
        stack.pop();
      }
    }
  }

  // Close all open brackets in reverse order
  repaired += stack.reverse().join("");

  try {
    return JSON.parse(repaired);
  } catch {
    // Repair attempt failed — try a more aggressive approach:
    // Find the last valid comma-separated element and close from there
  }

  // Aggressive approach: trim back to last complete element
  // Remove trailing partial content after last complete JSON value
  const lastGoodClose = Math.max(repaired.lastIndexOf("},"), repaired.lastIndexOf("],"), repaired.lastIndexOf('",'));
  if (lastGoodClose !== -1) {
    let trimmed = repaired.slice(0, lastGoodClose + 1); // keep the } ] or "
    // Re-count and close brackets
    const stack2 = [];
    let inStr2 = false;
    for (let i = 0; i < trimmed.length; i++) {
      const ch = trimmed[i];
      if (ch === '"' && (i === 0 || trimmed[i - 1] !== "\\")) {
        inStr2 = !inStr2;
        continue;
      }
      if (inStr2) continue;
      if (ch === "{") stack2.push("}");
      else if (ch === "[") stack2.push("]");
      else if (ch === "}" || ch === "]") {
        if (stack2.length > 0 && stack2[stack2.length - 1] === ch) {
          stack2.pop();
        }
      }
    }
    trimmed += stack2.reverse().join("");
    try {
      return JSON.parse(trimmed);
    } catch {
      // Still couldn't repair
    }
  }

  return null;
}

module.exports = { callClaude, extractJSON };
