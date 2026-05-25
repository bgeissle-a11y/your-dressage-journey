/**
 * Read-only pre-flight for B9 (Show Planner bi-weekly cron enable).
 *
 * Mirrors functions/api/showPlannerBiweeklyContent.js::queryActivePlans:
 *   showPreparations where isDeleted == false, then client-side filter
 *   to showDateStart strictly in the future and within the next 90 days.
 *
 * For each qualifying plan, checks whether analysisCache/{uid}_coaching_precis
 * exists — this is the silent skip condition (no précis → no content).
 *
 * No writes. No callable invocation.
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

const ACTIVE_PREP_WINDOW_DAYS = 90;

function _isoDateOnly(s) {
  if (!s) return null;
  return String(s).slice(0, 10);
}

async function main() {
  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const cutoffIso = new Date(now.getTime() + ACTIVE_PREP_WINDOW_DAYS * 86400000)
    .toISOString().slice(0, 10);

  console.log(`[preflight] today=${todayIso}  cutoff=${cutoffIso} (next ${ACTIVE_PREP_WINDOW_DAYS} days)`);

  const snap = await db.collection('showPreparations').where('isDeleted', '==', false).get();
  console.log(`[preflight] showPreparations with isDeleted=false: ${snap.size}`);

  const plans = [];
  snap.forEach((doc) => {
    const data = doc.data();
    const showDate = _isoDateOnly(data.showDateStart || data.showDate || '');
    if (!showDate) return;
    if (showDate <= todayIso) return;
    if (showDate > cutoffIso) return;
    plans.push({ id: doc.id, userId: data.userId, showName: data.showName, showDate, horseName: data.horseName });
  });

  console.log(`[preflight] qualifying plans (in window, future): ${plans.length}`);
  if (plans.length === 0) {
    console.log('[preflight] NO QUALIFYING PLANS — validation run would return generated=0 (smoke-only).');
    return;
  }

  const uniqueOwners = [...new Set(plans.map((p) => p.userId).filter(Boolean))];
  console.log(`[preflight] unique owners across qualifying plans: ${uniqueOwners.length}`);

  const precisStatus = {};
  await Promise.all(uniqueOwners.map(async (uid) => {
    const doc = await db.collection('analysisCache').doc(`${uid}_coaching_precis`).get();
    precisStatus[uid] = doc.exists;
  }));

  const ownersWithPrecis = uniqueOwners.filter((uid) => precisStatus[uid]);
  console.log(`[preflight] owners WITH coaching_precis: ${ownersWithPrecis.length} / ${uniqueOwners.length}`);

  let willGenerate = 0;
  let willSkipNoPrecis = 0;
  console.log('\n[preflight] per-plan outcome forecast (no-access skips not detected here — capability check happens in the function):');
  for (const p of plans) {
    const hasPrecis = precisStatus[p.userId];
    const outcome = hasPrecis ? 'WILL GENERATE' : 'skip:no-precis';
    if (hasPrecis) willGenerate++;
    else willSkipNoPrecis++;
    console.log(`  ${p.id.padEnd(22)} owner=${p.userId?.slice(0, 8) ?? '?'}…  show=${p.showDate}  horse=${p.horseName ?? '?'}  →  ${outcome}`);
  }

  console.log(`\n[preflight] forecast: generated≈${willGenerate}  skipped:no-precis=${willSkipNoPrecis}  skipped:no-access=? (unknown without capability gate)`);
  console.log('[preflight] Note: actual run also applies tier capability gate; some "WILL GENERATE" may become skipped:no-access.');
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
