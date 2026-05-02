/**
 * Direct admin write to a single debrief field. Bypasses the form to
 * isolate whether persistence problems are in the form or deeper.
 *
 * Usage:
 *   node scripts/setDebriefField.js <docId> <field> <value>
 *
 * Example:
 *   node scripts/setDebriefField.js DytAZM0LoIGGdNQLS5ov confidenceLevel 8
 *
 * Numeric values pass through Number(); the literal strings "null" and
 * "true"/"false" map to JSON null/booleans. Anything else is treated as
 * a string.
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const keyPath = resolve(__dirname, 'serviceAccountKey.json');
const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf-8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

function coerce(raw) {
  if (raw === 'null') return null;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
  return raw;
}

const [docId, field, rawVal] = process.argv.slice(2);
if (!docId || !field || rawVal === undefined) {
  console.error('Usage: node scripts/setDebriefField.js <docId> <field> <value>');
  process.exit(1);
}

const value = coerce(rawVal);

const ref = db.collection('debriefs').doc(docId);
const before = await ref.get();
if (!before.exists) {
  console.error(`Doc ${docId} does not exist.`);
  process.exit(1);
}
const beforeVal = before.data()[field];
console.log(`Before: ${field} = ${JSON.stringify(beforeVal)}`);

await ref.update({ [field]: value, updatedAt: FieldValue.serverTimestamp() });

const after = await ref.get();
console.log(`After:  ${field} = ${JSON.stringify(after.data()[field])}`);
console.log('OK');
process.exit(0);
