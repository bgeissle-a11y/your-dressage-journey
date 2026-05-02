/**
 * Find and HARD DELETE debrief documents whose every non-empty narrative
 * field is throwaway content (e.g. "test", "testing", "tst").
 *
 * Default is a dry run that lists matches. Pass --commit to actually delete.
 *
 * Usage:
 *   node scripts/deleteTestStubDebriefs.js <userId>             # dry run
 *   node scripts/deleteTestStubDebriefs.js <userId> --commit    # actually delete
 *
 * Safety rules:
 *   - Operates on the userId you pass; never deletes other riders' data.
 *   - Skips a doc unless it has at least one non-empty narrative field
 *     AND every non-empty narrative field, when normalized (lowercase +
 *     whitespace-tokenized), is one of the throwaway tokens.
 *   - Acts on both visible and soft-deleted docs (soft-deleted stubs
 *     would still pollute admin queries and aggregate counts).
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const keyPath = resolve(__dirname, 'serviceAccountKey.json');
const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf-8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const NARRATIVE_FIELDS = [
  'wins', 'challenges', 'ahaRealization', 'horseNotices',
  'workFocus', 'rideArcNote', 'goalReflection',
];

const STUB_TOKENS = new Set([
  'test', 'testing', 'tst', 'asdf', 'asdfasdf', 'qwerty',
  'foo', 'bar', 'foobar', 'lorem', 'ipsum', 'xxx', 'xx', 'x',
]);

function isStub(text) {
  if (text === null || text === undefined) return null;
  const trimmed = String(text).trim().toLowerCase();
  if (!trimmed) return null;
  const tokens = trimmed.split(/\s+/);
  return tokens.every(t => STUB_TOKENS.has(t));
}

function isAllStub(doc) {
  let any = false;
  for (const f of NARRATIVE_FIELDS) {
    const verdict = isStub(doc[f]);
    if (verdict === false) return false;        // non-stub content found
    if (verdict === true) any = true;
  }
  return any;
}

async function main() {
  const args = process.argv.slice(2);
  const commit = args.includes('--commit');
  const userId = args.filter(a => a !== '--commit')[0];
  if (!userId) {
    console.error('Usage: node scripts/deleteTestStubDebriefs.js <userId> [--commit]');
    process.exit(1);
  }

  const snap = await db.collection('debriefs').where('userId', '==', userId).get();
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const matches = all.filter(isAllStub);

  console.log(`\n=== Test-Stub Debrief Sweep ${commit ? '(COMMIT MODE)' : '(DRY RUN)'} ===`);
  console.log(`User: ${userId}`);
  console.log(`Total debriefs: ${all.length}`);
  console.log(`Matches (all narrative fields are stub): ${matches.length}\n`);

  if (!matches.length) {
    console.log('Nothing to delete.');
    process.exit(0);
  }

  for (const d of matches) {
    const sample = NARRATIVE_FIELDS
      .map(f => d[f] ? `${f}="${String(d[f]).slice(0, 40).replace(/\s+/g, ' ')}"` : null)
      .filter(Boolean)
      .join(' ');
    console.log(`  ${d.rideDate || 'NO-DATE'}  ${d.horseName || 'NO-HORSE'}  ${d.id}`);
    console.log(`    isDeleted=${JSON.stringify(d.isDeleted)} isDraft=${JSON.stringify(d.isDraft)}`);
    console.log(`    ${sample}`);
  }

  if (!commit) {
    console.log(`\nDry run. Re-run with --commit to hard-delete the ${matches.length} match(es) above.`);
    process.exit(0);
  }

  console.log(`\nHard-deleting ${matches.length} doc(s)...`);
  let deleted = 0;
  let failed = 0;
  for (const d of matches) {
    try {
      await db.collection('debriefs').doc(d.id).delete();
      console.log(`  ✓ ${d.id}`);
      deleted++;
    } catch (err) {
      console.log(`  ✗ ${d.id}: ${err.message}`);
      failed++;
    }
  }
  console.log(`\nDone. ${deleted} deleted, ${failed} failed.`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => { console.error(err); process.exit(1); });
