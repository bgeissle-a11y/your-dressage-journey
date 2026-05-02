/**
 * Quick lookup: find a Firebase Auth UID by email.
 * Usage: node scripts/lookupUid.js <email>
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const keyPath = resolve(__dirname, 'serviceAccountKey.json');
const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf-8'));
initializeApp({ credential: cert(serviceAccount) });

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/lookupUid.js <email>');
  process.exit(1);
}

try {
  const user = await getAuth().getUserByEmail(email);
  console.log(user.uid);
} catch (err) {
  console.error(`Lookup failed: ${err.message}`);
  process.exit(1);
}
