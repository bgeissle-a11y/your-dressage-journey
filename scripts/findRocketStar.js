/**
 * Find every Rocket Star debrief for the given user.
 *
 * Pulls ALL debriefs for the user (no filters), finds those for "Rocket Star",
 * grep-matches a free-text needle (default: "butt in saddle") across narrative
 * fields, and reports which docs would and would not be visible in the app.
 *
 * Usage:
 *   node scripts/findRocketStar.js <userId> [needle]
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

const NARRATIVE_FIELDS = ['wins', 'ahaRealization', 'horseNotices', 'challenges', 'workFocus', 'rideArcNote', 'goalReflection'];

function fmtTs(ts) {
  if (!ts) return '—';
  if (ts._seconds) return new Date(ts._seconds * 1000).toISOString();
  if (ts.toDate) return ts.toDate().toISOString();
  return String(ts);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.log('Usage: node scripts/findRocketStar.js <userId> [needle]');
    process.exit(1);
  }
  const userId = args[0];
  const needle = (args[1] || 'butt in saddle').toLowerCase();

  const snap = await db.collection('debriefs').where('userId', '==', userId).get();
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  console.log(`\nTotal debriefs for user (any horse, any state): ${all.length}`);

  // 1. Search the needle across ALL debriefs (any horse name)
  console.log(`\n=== Needle search: "${needle}" across all narrative fields, any horse ===`);
  const hits = [];
  for (const d of all) {
    for (const f of NARRATIVE_FIELDS) {
      const v = (d[f] || '').toString().toLowerCase();
      if (v.includes(needle)) {
        hits.push({ doc: d, field: f });
        break;
      }
    }
  }
  if (!hits.length) {
    console.log('  (no matches)');
  } else {
    for (const { doc, field } of hits) {
      console.log(`\n  HIT in field "${field}":`);
      console.log(`    doc id:        ${doc.id}`);
      console.log(`    rideDate:      ${doc.rideDate}`);
      console.log(`    horseName:     ${JSON.stringify(doc.horseName)}`);
      console.log(`    isDeleted:     ${JSON.stringify(doc.isDeleted)}`);
      console.log(`    isDraft:       ${JSON.stringify(doc.isDraft)}`);
      console.log(`    overallQual:   ${JSON.stringify(doc.overallQuality)}`);
      console.log(`    confidence:    ${JSON.stringify(doc.confidenceLevel)}`);
      console.log(`    createdAt:     ${fmtTs(doc.createdAt)}`);
      console.log(`    updatedAt:     ${fmtTs(doc.updatedAt)}`);
      const preview = (doc[field] || '').slice(0, 200).replace(/\s+/g, ' ');
      console.log(`    ${field} preview: "${preview}${(doc[field] || '').length > 200 ? '…' : ''}"`);
    }
  }

  // 2. List every Rocket Star debrief and flag visible vs hidden
  console.log(`\n\n=== Every "Rocket Star" debrief (sorted by rideDate desc) ===`);
  const rs = all.filter(d => (d.horseName || '').trim() === 'Rocket Star')
    .sort((a, b) => (b.rideDate || '').localeCompare(a.rideDate || ''));
  console.log(`Total Rocket Star docs: ${rs.length}`);
  const visible = rs.filter(d => d.isDeleted === false);
  const visibleNotDraft = rs.filter(d => d.isDeleted === false && d.isDraft !== true);
  console.log(`  visible to readAll filter (isDeleted==false):       ${visible.length}`);
  console.log(`  visible AND not draft (what most views actually use): ${visibleNotDraft.length}`);
  console.log('');
  for (const d of rs) {
    const flags = [];
    if (d.isDeleted !== false) flags.push(`isDeleted=${JSON.stringify(d.isDeleted)} HIDDEN`);
    if (d.isDraft === true) flags.push('DRAFT');
    if (d.isDraft === undefined) flags.push('isDraft MISSING');
    const flagStr = flags.length ? `  [${flags.join(', ')}]` : '';
    const ahaPrev = (d.ahaRealization || '').slice(0, 60).replace(/\s+/g, ' ');
    console.log(`  ${d.rideDate || 'NO-DATE'}  ${d.id}  q=${d.overallQuality ?? '?'} c=${d.confidenceLevel ?? '?'}${flagStr}`);
    if (ahaPrev) console.log(`     aha: "${ahaPrev}${(d.ahaRealization || '').length > 60 ? '…' : ''}"`);
  }

  // 3. Look for Rocket Star spelling variants
  console.log(`\n\n=== Possible Rocket Star spelling variants ===`);
  const allHorseNames = [...new Set(all.map(d => d.horseName).filter(Boolean))].sort();
  console.log(`All distinct horseName values: ${JSON.stringify(allHorseNames)}`);
  const variants = allHorseNames.filter(n => /rocket|rocky|^r\b|star/i.test(n) || (n.length <= 3 && /[Rr]/.test(n)));
  console.log(`Rocket-Star-ish variants: ${JSON.stringify(variants)}`);

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
