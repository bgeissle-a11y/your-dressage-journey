/**
 * One-off: flag a list of users as pilot participants.
 *
 *   node flagPilots.cjs              # dry run (default)
 *   node flagPilots.cjs --commit     # actually write isPilot=true
 *
 * Idempotent. Skips users that don't exist in /users.
 */

const admin = require("firebase-admin");
const path = require("path");

const COMMIT = process.argv.includes("--commit");
const serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const UIDS = [
  "gHtSnyoufLVj7V79qKbke9j3otM2",
  "Qx0lKf2PHZUZnM1q06MRDSr5SDy1",
  "vEDkrfGe2th5oxdvVcQMeuwjzKu1",
  "icP3HucKIZf1ncpYlkobs5fUejx1",
  "9elKuL5lKmWZwcZMxX9VnQ9tG502",
  "KUZZuPDdM3dkC3kNatzSX1oPCus2",
  "U0wKDM7gWScnaj7b3RRYeVf93as2",
  "NIqagpXkDDYSBpfndE7Cw1s9TIi2",
  "YdNOtrho4HYOwQP0bWJB8b3mgpZ2",
  "7nMTKCyLluSP48oBEXHuCIB6Cih1",
  "PHVDWkpBPHUlvvB7sPmdidmk8gB3",
  "L0mnY4VkAWXRNFhErgoZgYfe73O2",
  "mtynInGuqkRgWjXx720NX8HgkkQ2",
  "HwwKk5C7qZh1Bn0KYalPYIZWHmj2",
];

async function run() {
  console.log(`Mode: ${COMMIT ? "COMMIT" : "DRY RUN (pass --commit to write)"}`);
  console.log(`Processing ${UIDS.length} UIDs\n`);

  const summary = { wrote: 0, alreadySet: 0, missing: 0, failed: 0 };

  for (const uid of UIDS) {
    try {
      const ref = db.collection("users").doc(uid);
      const snap = await ref.get();

      const data = snap.exists ? snap.data() || {} : null;

      if (data && data.isPilot === true) {
        console.log(`  [already set]  ${uid}`);
        summary.alreadySet++;
        continue;
      }

      const label = data ? "WROTE       " : "STUB CREATED";
      const dryLabel = data ? "would write " : "would stub  ";

      if (COMMIT) {
        await ref.set({ isPilot: true }, { merge: true });
        console.log(`  [${label}] ${uid}`);
      } else {
        console.log(`  [${dryLabel}] ${uid}`);
      }
      summary.wrote++;
    } catch (err) {
      console.log(`  [FAILED]       ${uid}: ${err.message}`);
      summary.failed++;
    }
  }

  console.log("\nSummary:");
  console.log(`  ${COMMIT ? "wrote" : "would write"}: ${summary.wrote}`);
  console.log(`  already pilot: ${summary.alreadySet}`);
  console.log(`  missing /users doc: ${summary.missing}`);
  console.log(`  failed: ${summary.failed}`);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Script error:", err);
    process.exit(1);
  });
