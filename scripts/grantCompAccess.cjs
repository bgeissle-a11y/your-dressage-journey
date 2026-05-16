/**
 * Grant complimentary lifetime access to specific users by setting
 * `isComp: true` on their `users/{uid}` doc.
 *
 *   node scripts/grantCompAccess.cjs           # dry-run, prints plan
 *   node scripts/grantCompAccess.cjs --commit  # applies the changes
 *
 * The flag is read by getTierStatus() in entitlements.js (both frontend
 * and backend), which returns STATUS.COMP → unconditional full access
 * via canAccess(). Mirrors the isFounder bypass, but labeled as
 * "Complimentary" so the UI doesn't badge comp users as "Founder".
 *
 * Idempotent — safe to re-run; just overwrites isComp with the same true.
 * To revoke, replace with a delete script that strips the field.
 */

const admin = require("firebase-admin");
const path = require("path");

const serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();
const COMMIT = process.argv.includes("--commit");

const COMP_USERS = [
  { uid: "gHtSnyoufLVj7V79qKbke9j3otM2", note: "comp user #1" },
  { uid: "mtynInGuqkRgWjXx720NX8HgkkQ2", note: "comp user #2" },
];

async function run() {
  console.log(
    `\nMode: ${COMMIT ? "COMMIT" : "DRY RUN (pass --commit to apply)"}\n`
  );

  for (const item of COMP_USERS) {
    console.log(`--- ${item.note}`);
    console.log(`    uid: ${item.uid}`);
    console.log(`    set: isComp = true`);

    const ref = db.collection("users").doc(item.uid);
    const snap = await ref.get();
    if (!snap.exists) {
      console.log(`    ⚠ user doc not found — skipping`);
      console.log("");
      continue;
    }

    const data = snap.data() || {};
    console.log(`    current email: ${data.email || "(unknown)"}`);
    console.log(`    current isComp: ${data.isComp === true}`);
    console.log(`    current isFounder: ${data.isFounder === true}`);
    console.log(`    current isPilot: ${data.isPilot === true}`);
    console.log(`    current subscriptionTier: ${data.subscriptionTier || "none"}`);
    console.log(
      `    current subscriptionStatus: ${data.subscriptionStatus || "none"}`
    );

    if (COMMIT) {
      await ref.update({ isComp: true });
      console.log(`    ✔ applied`);
    }
    console.log("");
  }

  console.log("Done.\n");
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Grant failed:", err);
    process.exit(1);
  });
