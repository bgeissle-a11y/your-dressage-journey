/**
 * Audit: list every visible debrief, by rider, where overallQuality === 5
 * OR confidenceLevel === 5. These are likely candidates for rider review
 * since the old createDebrief silently coerced untouched-slider nulls into
 * a hard 5. The list cannot distinguish "rider deliberately rated 5" from
 * "rider didn't touch the slider" — riders decide doc by doc.
 *
 * Output:
 *   - console summary grouped by rider
 *   - audit-default-ratings.csv in the repo root, suitable for sharing
 *
 * Usage:
 *   node scripts/auditDefaultRatings.js
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const keyPath = resolve(__dirname, 'serviceAccountKey.json');
const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf-8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
const auth = getAuth();

function fmtDate(ts) {
  if (!ts) return '';
  if (ts._seconds) return new Date(ts._seconds * 1000).toISOString();
  if (ts.toDate) return ts.toDate().toISOString();
  return String(ts);
}

function csvEscape(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function main() {
  // 1. Pull ALL debriefs (admin SDK bypasses rules)
  const snap = await db.collection('debriefs').get();
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  // Visible only: matches what every read in the app does
  const visible = all.filter(d => d.isDeleted === false && d.isDraft !== true);

  // Suspicious: q===5 OR c===5
  const suspicious = visible.filter(d => d.overallQuality === 5 || d.confidenceLevel === 5);

  // 2. Group by userId
  const byUser = new Map();
  for (const d of suspicious) {
    const uid = d.userId || '(no-userId)';
    if (!byUser.has(uid)) byUser.set(uid, []);
    byUser.get(uid).push(d);
  }

  // 3. Resolve auth user records (email + display name)
  const userMeta = new Map();
  for (const uid of byUser.keys()) {
    if (uid === '(no-userId)') continue;
    try {
      const u = await auth.getUser(uid);
      userMeta.set(uid, { email: u.email || '', displayName: u.displayName || '' });
    } catch {
      userMeta.set(uid, { email: '(unknown)', displayName: '' });
    }
  }

  // 4. Console report
  const userOrder = [...byUser.keys()].sort((a, b) => {
    const ea = (userMeta.get(a)?.email || a).toLowerCase();
    const eb = (userMeta.get(b)?.email || b).toLowerCase();
    return ea.localeCompare(eb);
  });

  console.log(`\n=== Suspicious 5-rating Debrief Audit ===`);
  console.log(`Pulled ${all.length} total debriefs`);
  console.log(`  visible (isDeleted=false, isDraft!=true): ${visible.length}`);
  console.log(`  with overallQuality===5 OR confidenceLevel===5: ${suspicious.length}`);
  console.log(`  riders affected: ${byUser.size}\n`);

  for (const uid of userOrder) {
    const meta = userMeta.get(uid) || { email: '(unknown)', displayName: '' };
    const docs = byUser.get(uid).sort((a, b) => (b.rideDate || '').localeCompare(a.rideDate || ''));
    const qOnly = docs.filter(d => d.overallQuality === 5 && d.confidenceLevel !== 5).length;
    const cOnly = docs.filter(d => d.confidenceLevel === 5 && d.overallQuality !== 5).length;
    const both  = docs.filter(d => d.overallQuality === 5 && d.confidenceLevel === 5).length;

    console.log(`\n──────────────────────────────────────────`);
    console.log(`${meta.email}${meta.displayName ? '  ('+meta.displayName+')' : ''}`);
    console.log(`uid: ${uid}`);
    console.log(`affected debriefs: ${docs.length}   (q=5 only: ${qOnly}, c=5 only: ${cOnly}, both: ${both})`);
    for (const d of docs) {
      const flags = [];
      if (d.overallQuality === 5) flags.push('q=5');
      if (d.confidenceLevel === 5) flags.push('c=5');
      const re = d.riderEffort === 5 ? ' rE=5' : '';
      const he = d.horseEffort === 5 ? ' hE=5' : '';
      console.log(
        `  ${d.rideDate || 'NO-DATE'}  ${d.horseName || 'NO-HORSE'}` +
        `  q=${d.overallQuality ?? '_'} c=${d.confidenceLevel ?? '_'}` +
        `  [${flags.join(', ')}${re}${he}]   ${d.id}`
      );
    }
  }

  // 5. CSV export
  const headers = [
    'rider_email', 'rider_name', 'rider_uid',
    'rideDate', 'horseName', 'sessionType', 'sessionModality',
    'overallQuality', 'confidenceLevel', 'riderEffort', 'horseEffort',
    'rideArc', 'createdAt', 'updatedAt', 'docId'
  ];
  const rows = [headers.join(',')];
  for (const uid of userOrder) {
    const meta = userMeta.get(uid) || { email: '', displayName: '' };
    for (const d of byUser.get(uid)) {
      rows.push([
        csvEscape(meta.email),
        csvEscape(meta.displayName),
        csvEscape(uid),
        csvEscape(d.rideDate),
        csvEscape(d.horseName),
        csvEscape(d.sessionType),
        csvEscape(d.sessionModality),
        csvEscape(d.overallQuality),
        csvEscape(d.confidenceLevel),
        csvEscape(d.riderEffort),
        csvEscape(d.horseEffort),
        csvEscape(d.rideArc),
        csvEscape(fmtDate(d.createdAt)),
        csvEscape(fmtDate(d.updatedAt)),
        csvEscape(d.id),
      ].join(','));
    }
  }
  const csvPath = resolve(__dirname, '..', 'audit-default-ratings.csv');
  writeFileSync(csvPath, rows.join('\n') + '\n', 'utf-8');
  console.log(`\nCSV written: ${csvPath}`);
  console.log(`(${rows.length - 1} data rows)`);

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
