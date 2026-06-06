/**
 * Coaching-repetition diagnostic harness.
 *
 * For each synthetic session (Set A varied, Set B near-identical):
 *   1. Hard-delete prior horseProfiles + debriefs for the test user.
 *   2. Seed this session's horse + 3 debriefs (rider profile + assessment seeded once).
 *   3. Capture the ASSEMBLED prompt (system + user) for voice 0 — quantifies how
 *      much of the input is fixed (BASE_CONTEXT / voice prompt) vs variable.
 *   4. Run the LIVE coaching handler with forceRefresh:true (bypasses the
 *      count-based cache) and save the full output.
 *
 * Writes everything to scripts/repetition-diagnostic/out/.
 *
 * Usage:  node scripts/repetition-diagnostic/run.cjs [sessionId ...]
 *   (no args = all 8 sessions)
 */

const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

const UID = "REW2H4Q9MGW3Qbs1WiJOmyPo7Yx2"; // barb@yourdressagejourney.com (test account)
const OUT_DIR = path.join(__dirname, "out");

// ── credentials ─────────────────────────────────────────────────────────────
if (!process.env.ANTHROPIC_API_KEY) {
  const key = execSync("npx firebase functions:secrets:access ANTHROPIC_API_KEY", {
    cwd: path.join(__dirname, "..", ".."),
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
  process.env.ANTHROPIC_API_KEY = key;
}
const saPath = path.join(__dirname, "..", "serviceAccountKey.json");
process.env.GOOGLE_APPLICATION_CREDENTIALS = saPath;
const sa = require(saPath);
process.env.GCLOUD_PROJECT = sa.project_id;
process.env.GCP_PROJECT = sa.project_id;

// Require AFTER creds are set — firebase.js initializes admin at import time.
const { db } = require("../../functions/lib/firebase");
const { handler } = require("../../functions/api/coaching");
const { prepareRiderData } = require("../../functions/lib/prepareRiderData");
const { buildCoachingPrompt } = require("../../functions/lib/promptBuilder");
const { RIDER_PROFILE, RIDER_ASSESSMENT, SESSIONS } = require("./sessions.cjs");

const NOW_ISO = new Date().toISOString();

function log(m) { console.log(m); }

async function deleteWhereUser(collection) {
  const snap = await db.collection(collection).where("userId", "==", UID).get();
  const batchDeletes = snap.docs.map((d) => d.ref.delete());
  await Promise.all(batchDeletes);
  return snap.size;
}

async function wipeVariableData() {
  const d = await deleteWhereUser("debriefs");
  const h = await deleteWhereUser("horseProfiles");
  return { debriefs: d, horses: h };
}

async function wipeAll() {
  for (const c of ["debriefs", "horseProfiles", "riderProfiles", "riderAssessments"]) {
    await deleteWhereUser(c);
  }
}

async function seedConstantRider() {
  await deleteWhereUser("riderProfiles");
  await deleteWhereUser("riderAssessments");
  await db.collection("riderProfiles").add({
    userId: UID, isDeleted: false, createdAt: NOW_ISO, ...RIDER_PROFILE,
  });
  await db.collection("riderAssessments").add({
    userId: UID, isDeleted: false, isDraft: false, createdAt: NOW_ISO, ...RIDER_ASSESSMENT,
  });
}

async function seedSession(session) {
  await db.collection("horseProfiles").add({
    userId: UID, isDeleted: false, createdAt: NOW_ISO, ...session.horse,
  });
  for (const d of session.debriefs) {
    await db.collection("debriefs").add({
      userId: UID, isDeleted: false, isDraft: false, createdAt: NOW_ISO, ...d,
    });
  }
}

async function runSession(session) {
  log(`\n━━━ Session ${session.id} (${session.set}) — ${session.label} ━━━`);
  await wipeVariableData();
  await seedSession(session);

  // Capture the assembled prompt (voice 0) — fixed vs variable input breakdown.
  const riderData = await prepareRiderData(UID, "coaching");
  const { system, userMessage } = buildCoachingPrompt(0, riderData);
  const promptCapture = {
    dataTier: riderData.dataTier,
    tier: riderData.tier,
    dataSnapshotHash: riderData.dataSnapshot?.hash,
    counts: riderData.dataSnapshot?.counts,
    systemChars: system.length,
    userChars: userMessage.length,
    userMessage,
  };
  fs.writeFileSync(
    path.join(OUT_DIR, `${session.id}_prompt.json`),
    JSON.stringify(promptCapture, null, 2)
  );
  const dataTierNum = riderData.dataTier?.dataTier ?? riderData.dataTier;
  log(`  dataTier=${dataTierNum} hash=${riderData.dataSnapshot?.hash} systemChars=${system.length} userChars=${userMessage.length}`);

  // Run the live engine (all 4 voices + quick insights + précis), cache bypassed.
  const startedAt = Date.now();
  const result = await handler({
    auth: { uid: UID },
    data: { forceRefresh: true },
  });
  const elapsedS = ((Date.now() - startedAt) / 1000).toFixed(1);

  fs.writeFileSync(
    path.join(OUT_DIR, `${session.id}_coaching.json`),
    JSON.stringify({ session: { id: session.id, set: session.set, label: session.label }, result }, null, 2)
  );

  const voicesOk = result?.voices ? Object.keys(result.voices).length : 0;
  log(`  ✓ coaching done in ${elapsedS}s — success=${result?.success} voices=${voicesOk} qi=${!!result?.quickInsights}`);
  return { id: session.id, set: session.set, dataTier: riderData.dataTier, hash: riderData.dataSnapshot?.hash, elapsedS, success: result?.success, voicesOk };
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const wanted = process.argv.slice(2);
  const sessions = wanted.length ? SESSIONS.filter((s) => wanted.includes(s.id)) : SESSIONS;

  log(`Diagnostic run — ${sessions.length} session(s): ${sessions.map((s) => s.id).join(", ")}`);
  log(`Test user: ${UID}`);

  await seedConstantRider();
  log("Seeded constant rider profile + self-assessment.");

  const summary = [];
  for (const s of sessions) {
    try {
      summary.push(await runSession(s));
    } catch (err) {
      log(`  ✗ Session ${s.id} FAILED: ${err.message}`);
      summary.push({ id: s.id, set: s.set, error: err.message });
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, "_summary.json"), JSON.stringify(summary, null, 2));
  log("\n━━━ SUMMARY ━━━");
  for (const r of summary) log(`  ${r.id} (${r.set}): ${r.error ? "ERROR " + r.error : `tier=${r.dataTier} hash=${r.hash} ${r.elapsedS}s voices=${r.voicesOk}`}`);

  // Leave data in the LAST session's state; cleanup is a separate explicit step.
  log("\nDone. Synthetic data left in place (last session). Run with CLEANUP=1 to wipe.");
  if (process.env.CLEANUP === "1") {
    await wipeAll();
    log("Wiped all synthetic data for test user.");
  }
}

main().then(() => process.exit(0)).catch((err) => {
  console.error("Harness error:", err);
  process.exit(1);
});
