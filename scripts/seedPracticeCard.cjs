/**
 * One-time seed script: writes a sample practiceCard to analysisCache
 * so the PracticeCard component can be tested before the next coaching run.
 *
 * Usage: node scripts/seedPracticeCard.cjs
 *
 * Uses the Firebase CLI's stored refresh token to authenticate via the
 * Firestore REST API — no service account key file needed.
 */

const https = require("https");
const fs = require("fs");
const os = require("os");
const path = require("path");

const PROJECT_ID = "your-dressage-journey";
const ADMIN_UID = "HwwKk5C7qZh1Bn0KYalPYIZWHmj2";

const practiceCard = {
  processGoals: [
    "Establish relaxation in the trot before asking for collection",
    "Wait for Rocket Star to seek the contact through each transition",
    "Breathe through the half-pass and let forwardness carry the movement",
  ],
  inSaddleCues: [
    "A softening through Rocket Star's back that makes the saddle feel like it floats — the swing arrives before the frame",
    "The reins feel alive with a gentle, elastic weight — not heavy, not empty",
  ],
  analogy:
    "Imagine pouring water from a pitcher into a glass: the collection you are seeking is not compression — it is the moment the stream narrows and rises naturally because the flow is uninterrupted. Let Rocket Star's energy pour forward and up.",
  mentalRehearsal:
    "You are tracking left at B, preparing the half-pass toward G. You feel Rocket Star's outside hind step under as you shift your weight, and instead of pushing, you wait — the swing through his back tells you he is carrying, not bracing. The half-pass unfolds like a door opening.",
  carryQuestion:
    "What does it feel like in your body when Rocket Star is truly through, versus when he is just compliant?",
};

// --- helpers ---

function httpPost(url, body, headers) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const parsed = new URL(url);
    const req = https.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) },
      },
      (res) => {
        let chunks = "";
        res.on("data", (c) => (chunks += c));
        res.on("end", () => {
          if (res.statusCode >= 400) reject(new Error(`HTTP ${res.statusCode}: ${chunks}`));
          else resolve(JSON.parse(chunks));
        });
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

function httpPostForm(url, params) {
  return new Promise((resolve, reject) => {
    const data = new URLSearchParams(params).toString();
    const parsed = new URL(url);
    const req = https.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname,
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": Buffer.byteLength(data) },
      },
      (res) => {
        let chunks = "";
        res.on("data", (c) => (chunks += c));
        res.on("end", () => {
          if (res.statusCode >= 400) reject(new Error(`HTTP ${res.statusCode}: ${chunks}`));
          else resolve(JSON.parse(chunks));
        });
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

/** Convert a JS value to Firestore REST "Value" format */
function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === "string") return { stringValue: val };
  if (typeof val === "number") return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  if (typeof val === "boolean") return { booleanValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestoreValue) } };
  if (typeof val === "object") {
    const fields = {};
    for (const [k, v] of Object.entries(val)) fields[k] = toFirestoreValue(v);
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

async function seed() {
  // 1. Read Firebase CLI refresh token
  const configPath = path.join(os.homedir(), ".config", "configstore", "firebase-tools.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const refreshToken = config.tokens?.refresh_token;
  if (!refreshToken) throw new Error("No refresh_token found in Firebase CLI config. Run: firebase login");

  // 2. Exchange refresh token for access token
  const clientId = config.tokens?.client_id || "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com";
  const clientSecret = config.tokens?.client_secret || "j9iVZfS8kkCEFUPaAeJV0sAi";
  const tokenRes = await httpPostForm("https://oauth2.googleapis.com/token", {
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });
  const accessToken = tokenRes.access_token;
  console.log("Got access token from Firebase CLI credentials");

  // 3. Build the Firestore document
  const now = new Date();
  const doc = {
    userId: ADMIN_UID,
    outputType: "coaching_practiceCard",
    generatedAt: now.toISOString(),
    dataSnapshotHash: "seed-test",
    tierLabel: "Tier 3",
    dataTier: 3,
    isDeleted: false,
    result: {
      ...practiceCard,
      generatedAt: now.toISOString(),
      weekOf: now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
      horseName: "Rocket Star",
      confirmedAt: null,
      confirmedDate: null,
    },
  };

  // 4. Convert to Firestore REST format and write
  const fields = {};
  for (const [k, v] of Object.entries(doc)) fields[k] = toFirestoreValue(v);

  const docId = `${ADMIN_UID}_coaching_practiceCard`;
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/analysisCache/${docId}`;

  await httpPost(url, { fields }, { Authorization: `Bearer ${accessToken}` });
  console.log(`Seeded practiceCard for UID ${ADMIN_UID} at analysisCache/${docId}`);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
