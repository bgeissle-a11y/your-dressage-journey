/**
 * One-off: full activity inspection for a single UID.
 * Usage: node scripts/inspectUserActivity.js <uid>
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const keyPath = resolve(__dirname, 'serviceAccountKey.json');
const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf-8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const uid = process.argv[2];
if (!uid) { console.log('Usage: node scripts/inspectUserActivity.js <uid>'); process.exit(1); }

const fmt = (ts) => {
  if (!ts) return '—';
  if (typeof ts === 'string') return ts;
  if (ts._seconds) return new Date(ts._seconds * 1000).toISOString();
  if (ts.toDate) return ts.toDate().toISOString();
  return String(ts);
};

// Top-level collections keyed by userId
const USER_KEYED = [
  'riderProfiles', 'horseProfiles', 'debriefs', 'reflections', 'observations',
  'journeyEvents', 'eventPrepPlans', 'showPreparations', 'physicalAssessments',
  'riderAssessments', 'horseHealthEntries', 'riderHealthEntries',
];

async function main() {
  console.log(`\n=== Auth record for ${uid} ===`);
  try {
    const u = await getAuth().getUser(uid);
    console.log(`email:           ${u.email || '—'}`);
    console.log(`emailVerified:   ${u.emailVerified}`);
    console.log(`displayName:     ${u.displayName || '—'}`);
    console.log(`disabled:        ${u.disabled}`);
    console.log(`providers:       ${u.providerData.map(p => p.providerId).join(', ') || '—'}`);
    console.log(`created:         ${u.metadata.creationTime}`);
    console.log(`lastSignIn:      ${u.metadata.lastSignInTime}`);
    console.log(`lastRefresh:     ${u.metadata.lastRefreshTime || '—'}`);
  } catch (e) {
    console.log(`Auth lookup FAILED: ${e.message}`);
  }

  console.log(`\n=== users/${uid} profile doc ===`);
  const uSnap = await db.collection('users').doc(uid).get();
  console.log(`exists: ${uSnap.exists}`);
  if (uSnap.exists) {
    const d = uSnap.data();
    const fields = ['email','displayName','createdAt','subscriptionTier','subscriptionStatus',
      'subscriptionInterval','isPilot','pilotDiscountActive','isInitialCenterline','icTier','icStatus',
      'trialStarted','trialConverted','consentMethod','consentAt','onboardingComplete','firstLightComplete'];
    for (const f of fields) if (d[f] !== undefined) console.log(`  ${f}: ${fmt(d[f])}`);
    // list subcollections under users/{uid}
    const subs = await db.collection('users').doc(uid).listCollections();
    console.log(`  subcollections: ${subs.map(c => c.id).join(', ') || '(none)'}`);
    for (const c of subs) {
      const cnt = (await c.get()).size;
      console.log(`    ${c.id}: ${cnt} docs`);
    }
  }

  console.log(`\n=== Top-level collection document counts (userId == ${uid}) ===`);
  let grand = 0;
  for (const col of USER_KEYED) {
    try {
      const snap = await db.collection(col).where('userId', '==', uid).get();
      grand += snap.size;
      let extra = '';
      if (snap.size > 0) {
        const times = snap.docs.map(doc => fmt(doc.data().createdAt)).filter(t => t !== '—').sort();
        if (times.length) extra = `  (first ${times[0]}, last ${times[times.length-1]})`;
      }
      console.log(`  ${col}: ${snap.size}${extra}`);
    } catch (e) {
      console.log(`  ${col}: ERROR ${e.message}`);
    }
  }
  console.log(`\n  TOTAL data docs: ${grand}`);

  console.log(`\n=== AI output caches (analysisCache) ===`);
  const cacheIds = ['grandPrixThinking','grandPrixTrajectory','journeyMap','physicalGuidance',
    'coaching_0','coaching_1','coaching_2','coaching_3','firstLight'];
  for (const id of cacheIds) {
    const snap = await db.collection('analysisCache').doc(`${uid}_${id}`).get();
    if (snap.exists) console.log(`  ${id}: generatedAt=${fmt(snap.data().generatedAt)}`);
  }
  console.log('  (only existing caches shown)');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
