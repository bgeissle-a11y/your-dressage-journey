/**
 * Read-only: dump the latest biweeklyContent entry for a given show plan.
 * Used for spot-checking B9 validation run output.
 *
 * Usage: node scripts/inspectBiweeklyContent.js <planId>
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sa = JSON.parse(readFileSync(resolve(__dirname, 'serviceAccountKey.json'), 'utf-8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const planId = process.argv[2];
if (!planId) {
  console.log('Usage: node scripts/inspectBiweeklyContent.js <planId>');
  process.exit(1);
}

const doc = await db.collection('showPreparations').doc(planId).get();
if (!doc.exists) { console.error(`Plan ${planId} not found`); process.exit(1); }
const data = doc.data();

console.log(`Plan: ${planId}`);
console.log(`  showName:      ${data.showName}`);
console.log(`  horseName:     ${data.horseName}`);
console.log(`  showDateStart: ${data.showDateStart}`);
console.log(`  testsSelected: ${JSON.stringify(data.testsSelected)}`);

const entries = data.biweeklyContent || [];
console.log(`\nbiweeklyContent entries: ${entries.length}`);
entries.forEach((e, i) => {
  const wordCount = (e.text || '').trim().split(/\s+/).length;
  console.log(`\n--- entry ${i + 1} (generatedAt ${e.generatedAt}, source=${e.source}, ${wordCount} words, ${(e.text || '').length} chars) ---`);
  console.log(e.text);
  console.log(`--- end entry ${i + 1} ---`);
});

process.exit(0);
