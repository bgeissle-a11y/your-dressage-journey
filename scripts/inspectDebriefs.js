/**
 * Diagnostic: Inspect debrief documents for a user.
 *
 * Pulls EVERY debrief in the collection for the given user — bypassing the
 * `isDeleted == false` filter the app uses — so we can see documents that
 * are hidden from the UI because of missing/wrong flags, plus duplicates
 * and the actual stored numeric values.
 *
 * Usage:
 *   node scripts/inspectDebriefs.js <userId>
 *   node scripts/inspectDebriefs.js <userId> <horseName>
 *   node scripts/inspectDebriefs.js <userId> "Rocket Star" 2026-02-12 2026-02-13 2026-04-18 2026-04-30
 *
 * Output: a table of every matching document with the fields the app reads.
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

function fmtTs(ts) {
  if (!ts) return '—';
  if (ts._seconds) return new Date(ts._seconds * 1000).toISOString();
  if (ts.toDate) return ts.toDate().toISOString();
  return String(ts);
}

function describeIsDeleted(val) {
  if (val === false) return 'false (visible)';
  if (val === true) return 'true (HIDDEN: soft-deleted)';
  if (val === undefined) return 'MISSING (HIDDEN: filter excludes)';
  if (val === null) return 'null (HIDDEN: filter excludes)';
  return `${JSON.stringify(val)} (HIDDEN: filter excludes)`;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.log('Usage: node scripts/inspectDebriefs.js <userId> [horseName] [date1 date2 ...]');
    process.exit(1);
  }

  const userId = args[0];
  const horseFilter = args[1] || null;
  const dateFilter = args.slice(2);

  console.log(`\n=== Debrief Inspection ===`);
  console.log(`User: ${userId}`);
  if (horseFilter) console.log(`Horse: "${horseFilter}"`);
  if (dateFilter.length) console.log(`Dates: ${dateFilter.join(', ')}`);
  console.log('');

  // Pull ALL debriefs for this user — no isDeleted filter
  const snap = await db.collection('debriefs')
    .where('userId', '==', userId)
    .get();

  console.log(`Total documents found (including hidden): ${snap.size}\n`);

  let docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  if (horseFilter) {
    docs = docs.filter(d => (d.horseName || '').trim() === horseFilter);
    console.log(`After horse filter "${horseFilter}": ${docs.length}\n`);
  }
  if (dateFilter.length) {
    const set = new Set(dateFilter);
    docs = docs.filter(d => set.has(d.rideDate));
    console.log(`After date filter: ${docs.length}\n`);
  }

  // Sort by rideDate desc
  docs.sort((a, b) => (b.rideDate || '').localeCompare(a.rideDate || ''));

  // Group by rideDate + horseName to spot duplicates
  const groups = {};
  for (const d of docs) {
    const key = `${d.rideDate || 'NO-DATE'} | ${d.horseName || 'NO-HORSE'}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(d);
  }

  for (const [key, ds] of Object.entries(groups)) {
    console.log(`──────────────────────────────────────────`);
    console.log(`${key}   ${ds.length > 1 ? `[!! ${ds.length} DUPLICATES !!]` : ''}`);
    for (const d of ds) {
      console.log(`  doc id:          ${d.id}`);
      console.log(`  isDeleted:       ${describeIsDeleted(d.isDeleted)}`);
      console.log(`  isDraft:         ${d.isDraft === true ? 'true' : d.isDraft === false ? 'false' : `MISSING (${JSON.stringify(d.isDraft)})`}`);
      console.log(`  overallQuality:  ${d.overallQuality === undefined ? 'MISSING' : JSON.stringify(d.overallQuality)}`);
      console.log(`  confidenceLevel: ${d.confidenceLevel === undefined ? 'MISSING' : JSON.stringify(d.confidenceLevel)}`);
      console.log(`  riderEffort:     ${d.riderEffort === undefined ? 'MISSING' : JSON.stringify(d.riderEffort)}`);
      console.log(`  horseEffort:     ${d.horseEffort === undefined ? 'MISSING' : JSON.stringify(d.horseEffort)}`);
      console.log(`  sessionType:     ${JSON.stringify(d.sessionType || '')}`);
      console.log(`  sessionModality: ${JSON.stringify(d.sessionModality || '')}`);
      console.log(`  rideArc:         ${JSON.stringify(d.rideArc || '')}`);
      console.log(`  createdAt:       ${fmtTs(d.createdAt)}`);
      console.log(`  updatedAt:       ${fmtTs(d.updatedAt)}`);
      // Quick narrative fingerprint to help the user identify which doc is "real"
      const winsLen = (d.wins || '').length;
      const challLen = (d.challenges || '').length;
      const ahaLen = (d.ahaRealization || '').length;
      const horseNotLen = (d.horseNotices || '').length;
      const focusLen = (d.workFocus || '').length;
      console.log(`  narrative chars: wins=${winsLen} challenges=${challLen} aha=${ahaLen} horseNotices=${horseNotLen} workFocus=${focusLen}`);
      const winsPreview = (d.wins || '').slice(0, 80).replace(/\s+/g, ' ');
      if (winsPreview) console.log(`  wins preview:    "${winsPreview}${(d.wins || '').length > 80 ? '…' : ''}"`);
      console.log('');
    }
  }

  // Summary of suspicious docs
  console.log(`\n=== Summary ===`);
  const hidden = docs.filter(d => d.isDeleted !== false);
  const dupes = Object.values(groups).filter(g => g.length > 1);
  const fives = docs.filter(d => d.overallQuality === 5 && d.confidenceLevel === 5);
  console.log(`Hidden from app (isDeleted !== false): ${hidden.length}`);
  if (hidden.length) {
    hidden.forEach(d => console.log(`  - ${d.rideDate} | ${d.horseName} | ${d.id} | isDeleted=${JSON.stringify(d.isDeleted)}`));
  }
  console.log(`Duplicate (rideDate, horseName) groups: ${dupes.length}`);
  console.log(`Documents with overallQuality=5 AND confidenceLevel=5: ${fives.length}`);

  process.exit(0);
}

main().catch(err => {
  console.error('Inspection failed:', err);
  process.exit(1);
});
