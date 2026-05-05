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

const uid = process.argv[2];
if (!uid) {
  console.log('Usage: node scripts/inspectRegenState.js <uid>');
  process.exit(1);
}

function fmt(ts) {
  if (!ts) return '—';
  if (typeof ts === 'string') return ts;
  if (ts._seconds) return new Date(ts._seconds * 1000).toISOString();
  if (ts.toDate) return ts.toDate().toISOString();
  return String(ts);
}

function daysBetween(aIso, bIso) {
  if (!aIso || !bIso) return null;
  const a = new Date(aIso).getTime();
  const b = new Date(bIso).getTime();
  return Math.round((b - a) / 86400000 * 10) / 10;
}

// Mirror src/services/weeklyFocusService.js getWeekId
function getWeekId(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function priorWeekId(date = new Date()) {
  const d = new Date(date);
  d.setDate(d.getDate() - 7);
  return getWeekId(d);
}

async function showDoc(label, ref, opts = {}) {
  const snap = await ref.get();
  console.log(`\n--- ${label} ---`);
  console.log(`path: ${ref.path}`);
  console.log(`exists: ${snap.exists}`);
  if (!snap.exists) return null;
  const data = snap.data();
  const compact = {};
  for (const [k, v] of Object.entries(data)) {
    if (opts.fullKeys?.includes(k)) {
      compact[k] = v;
    } else if (k === 'result' || k === 'data' || k === 'output') {
      if (v && typeof v === 'object') {
        compact[k] = `<${Object.keys(v).length} keys: ${Object.keys(v).slice(0, 8).join(', ')}${Object.keys(v).length > 8 ? '…' : ''}>`;
      } else {
        compact[k] = `<${typeof v}>`;
      }
    } else if (v && typeof v === 'object' && v._seconds !== undefined) {
      compact[k] = fmt(v);
    } else if (Array.isArray(v)) {
      compact[k] = `[${v.length} items]`;
    } else {
      compact[k] = v;
    }
  }
  console.log(JSON.stringify(compact, null, 2));
  return data;
}

async function main() {
  const now = new Date();
  const weekId = getWeekId(now);
  const lastWeekId = priorWeekId(now);

  console.log(`\n=== Regen State Inspection for ${uid} ===`);
  console.log(`now: ${now.toISOString()}`);
  console.log(`current ISO weekId: ${weekId}`);
  console.log(`prior ISO weekId:   ${lastWeekId}`);

  // ── 30-day cycle state ──
  const gptCycle = await showDoc('GPT cycle state', db.collection('grandPrixThinkingCycle').doc(uid));
  const physCycle = await showDoc('Physical cycle state', db.collection('physicalGuidanceCycle').doc(uid));

  // Cycle-week math: would advanceWeekAndExtract have moved the pointer today?
  for (const [label, cycle] of [['GPT', gptCycle], ['Physical', physCycle]]) {
    if (!cycle?.cycleStartDate) continue;
    const days = daysBetween(cycle.cycleStartDate, now.toISOString());
    const computed = Math.min(4, Math.floor(days / 7) + 1);
    const maxWeek = cycle.status === 'truncated' ? 2 : 4;
    const newWeek = Math.min(computed, maxWeek);
    const wouldAdvance = (cycle.status === 'active' || cycle.status === 'truncated')
      && newWeek !== cycle.currentWeek;
    console.log(`\n[${label} cycle-week math]`);
    console.log(`  cycleStartDate:   ${cycle.cycleStartDate}`);
    console.log(`  daysSinceStart:   ${days}`);
    console.log(`  computed week:    ${computed} (capped at ${maxWeek}: ${newWeek})`);
    console.log(`  stored currentWeek: ${cycle.currentWeek}`);
    console.log(`  status:           ${cycle.status}`);
    console.log(`  WOULD ADVANCE?    ${wouldAdvance ? 'YES (' + cycle.currentWeek + ' → ' + newWeek + ')' : 'NO — week pointer stays'}`);
    // Next 7-day boundary from cycleStartDate
    const start = new Date(cycle.cycleStartDate).getTime();
    const nextBoundary = new Date(start + (Math.floor(days / 7) + 1) * 86400000 * 7);
    console.log(`  next cycle-week boundary: ${nextBoundary.toISOString()}`);
  }

  // ── AI output caches ──
  const gptCache = await showDoc('GPT mental cache', db.collection('analysisCache').doc(`${uid}_grandPrixThinking`));
  await showDoc('GPT trajectory cache', db.collection('analysisCache').doc(`${uid}_grandPrixTrajectory`));
  await showDoc('Journey Map cache', db.collection('analysisCache').doc(`${uid}_journeyMap`));
  await showDoc('Physical Guidance cache', db.collection('analysisCache').doc(`${uid}_physicalGuidance`));

  // GPT weeklyAssignments (extracted server-side per cycle week)
  if (gptCache?.result?.weeklyAssignments) {
    const wa = gptCache.result.weeklyAssignments;
    console.log(`\n[GPT weeklyAssignments] ${wa.length} items, currently extracted for week ${gptCycle?.currentWeek}`);
    wa.slice(0, 3).forEach((a, i) => {
      console.log(`  ${i + 1}. ${(a.title || '').slice(0, 60)} — ${(a.description || '').slice(0, 80)}…`);
    });
  }

  // ── Multi-Voice Coaching: 4 voice docs ──
  console.log('\n=== Multi-Voice Coaching caches ===');
  for (let i = 0; i < 4; i++) {
    const ref = db.collection('analysisCache').doc(`${uid}_coaching_${i}`);
    const snap = await ref.get();
    if (!snap.exists) {
      console.log(`coaching_${i}: <missing>`);
      continue;
    }
    const data = snap.data();
    const r = data.result || {};
    console.log(`coaching_${i}: generatedAt=${fmt(data.generatedAt)} | hasWeeklyFocusExcerpt=${!!r.weeklyFocusExcerpt} | hasWeeklyFocusTitle=${!!r.weeklyFocusTitle} | hasNudge=${!!r.weeklyFocusReflectionNudge}`);
  }

  // ── Practice Card cache (side-extract from MVC) ──
  const pcSnap = await db.collection('analysisCache').doc(`${uid}_coaching_practiceCard`).get();
  console.log('\n=== Practice Card cache ===');
  console.log(`path: ${pcSnap.ref.path}`);
  console.log(`exists: ${pcSnap.exists}`);
  if (pcSnap.exists) {
    const d = pcSnap.data();
    const r = d.result || {};
    console.log(`generatedAt:     ${fmt(d.generatedAt)}`);
    console.log(`weekOf (label):  ${r.weekOf || '—'}`);
    console.log(`confirmedAt:     ${fmt(r.confirmedAt)}`);
    console.log(`confirmedDate:   ${r.confirmedDate || '—'}`);
    console.log(`processGoals:    ${(r.processGoals || r.suggestedGoals || []).length} goals`);
    (r.processGoals || r.suggestedGoals || []).forEach((g, i) => {
      console.log(`  ${i + 1}. ${String(g).slice(0, 100)}`);
    });
    console.log(`analogy:         ${(r.analogy || '').slice(0, 100)}`);
    console.log(`# days old:      ${daysBetween(d.generatedAt, now.toISOString())}`);
  }

  // ── Visualization Suggestion cache ──
  await showDoc('Visualization Suggestion cache', db.collection('analysisCache').doc(`${uid}_coaching_visualizationSuggestion`));

  // ── Weekly Focus snapshots: this week + last week ──
  for (const [label, wid] of [['THIS WEEK', weekId], ['LAST WEEK', lastWeekId]]) {
    const ref = db.collection('users').doc(uid).collection('weeklyFocus').doc(wid);
    const snap = await ref.get();
    console.log(`\n=== Weekly Focus snapshot — ${label} (${wid}) ===`);
    console.log(`exists: ${snap.exists}`);
    if (!snap.exists) continue;
    const d = snap.data();
    console.log(`lastUpdated:  ${fmt(d.lastUpdated)}`);
    console.log(`updatedBy:    ${d.updatedBy || '—'}`);
    console.log(`celebrationId: ${d.celebrationId || '—'}`);
    const cs = d.contentSnapshot || {};
    console.log(`coaching:    ${cs.coaching ? `title="${cs.coaching.title}", ${cs.coaching.excerpts?.length || 0} excerpts, sourceGen=${fmt(cs.coaching.sourceGeneratedAt)}` : '—'}`);
    if (cs.coaching?.excerpts) {
      cs.coaching.excerpts.forEach((ex, i) => {
        console.log(`  excerpt ${i + 1} (${ex.voice}): "${(ex.text || '').slice(0, 80)}…"`);
      });
    }
    console.log(`gpt:         ${cs.gpt ? `cycleWeek=${cs.gpt.cycleWeek}, ${cs.gpt.weeklyAssignments?.length || 0} assignments, sourceGen=${fmt(cs.gpt.sourceGeneratedAt)}` : '—'}`);
    if (cs.gpt?.weeklyAssignments) {
      cs.gpt.weeklyAssignments.slice(0, 3).forEach((a, i) => {
        console.log(`  ${i + 1}. ${(a.title || '').slice(0, 60)} — ${(a.description || '').slice(0, 80)}…`);
      });
    }
    console.log(`physical:    ${cs.physical ? `${cs.physical.weeklyFocusItems?.length || 0} items, sourceGen=${fmt(cs.physical.sourceGeneratedAt)}` : '—'}`);
    console.log(`show:        ${cs.show?.state || '—'}${cs.show?.name ? ` (${cs.show.name}, ${cs.show.daysOut}d out)` : ''}`);
    console.log(`pinnedSections:    ${JSON.stringify(d.pinnedSections || [])}`);
    console.log(`completedSections: ${JSON.stringify(d.completedSections || [])}`);
    console.log(`hasNewerContent:   ${JSON.stringify(d.hasNewerContent || {})}`);
  }

  // ── Reflections — count and categorize for celebration rotation diagnosis ──
  console.log('\n=== Positive Reflections (celebration pool) ===');
  const reflSnap = await db.collection('reflections')
    .where('userId', '==', uid)
    .where('isDeleted', '==', false)
    .get();
  const reflections = reflSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const byCategory = {};
  for (const r of reflections) {
    const c = r.category || '(none)';
    byCategory[c] = (byCategory[c] || 0) + 1;
  }
  console.log(`total reflections: ${reflections.length}`);
  console.log(`by category:`, byCategory);

  // CLIENT filter (weeklyFocusUtils.js):  ['personal','validation','aha']
  // createdAt may be a Firestore Timestamp — normalize to ISO string for sort + compare
  const isoOf = (v) => {
    if (!v) return '';
    if (typeof v === 'string') return v;
    if (v._seconds) return new Date(v._seconds * 1000).toISOString();
    if (v.toDate) return v.toDate().toISOString();
    return '';
  };
  const clientPositive = reflections
    .filter(r => ['personal', 'validation', 'aha'].includes(r.category))
    .sort((a, b) => isoOf(b.createdAt).localeCompare(isoOf(a.createdAt)));
  // SERVER filter (weeklyFocusRefresh.js): aliases also accepted, NO sort
  const serverPositive = reflections.filter(r => {
    const cat = (r.category || '').toLowerCase();
    return ['personal', 'personal_milestone', 'validation', 'external_validation', 'aha', 'aha_moment'].includes(cat);
  });
  const seedThis = parseInt(weekId.match(/W(\d+)/)?.[1] || '0', 10);
  const seedLast = parseInt(lastWeekId.match(/W(\d+)/)?.[1] || '0', 10);
  console.log(`\nclient positive count: ${clientPositive.length} (filter: personal|validation|aha, sorted desc by createdAt)`);
  if (clientPositive.length > 0) {
    const clientThis = clientPositive[seedThis % clientPositive.length];
    const clientLast = clientPositive[seedLast % clientPositive.length];
    console.log(`  client this-week pick (W${seedThis} % ${clientPositive.length} = ${seedThis % clientPositive.length}): ${clientThis?.id} — "${(clientThis?.mainReflection || clientThis?.response || '').slice(0, 80)}"`);
    console.log(`  client last-week pick (W${seedLast} % ${clientPositive.length} = ${seedLast % clientPositive.length}): ${clientLast?.id} — "${(clientLast?.mainReflection || clientLast?.response || '').slice(0, 80)}"`);
    console.log(`  same as last week? ${clientThis?.id === clientLast?.id ? 'YES — modulo coincided' : 'NO — picks differ'}`);
  }
  console.log(`\nserver positive count: ${serverPositive.length} (filter: + aliases, UNSORTED — Firestore order)`);
  if (serverPositive.length > 0) {
    const serverThis = serverPositive[seedThis % serverPositive.length];
    const serverLast = serverPositive[seedLast % serverPositive.length];
    console.log(`  server this-week pick: ${serverThis?.id}`);
    console.log(`  server last-week pick: ${serverLast?.id}`);
  }
  if (clientPositive.length === 1) {
    console.log(`\n  ⚠ N=1: celebration will ALWAYS be the same reflection regardless of weekId.`);
  }

  // Resolve the celebrationIds stored in this/last week's snapshots to actual reflection text
  console.log(`\n[Stored celebrationId resolution]`);
  for (const wid of [weekId, lastWeekId]) {
    const wfSnap = await db.collection('users').doc(uid).collection('weeklyFocus').doc(wid).get();
    if (!wfSnap.exists) continue;
    const cid = wfSnap.data().celebrationId;
    if (!cid) {
      console.log(`  ${wid}: <no celebrationId>`);
      continue;
    }
    const r = reflections.find((x) => x.id === cid);
    if (!r) {
      console.log(`  ${wid}: celebrationId=${cid} — REFLECTION NOT FOUND (deleted? wrong user?)`);
      continue;
    }
    const text = (r.mainReflection || r.response || r.text || '').slice(0, 120);
    console.log(`  ${wid}: celebrationId=${cid}`);
    console.log(`    category=${r.category}  createdAt=${isoOf(r.createdAt)}`);
    console.log(`    text="${text}"`);
  }

  // ── Generation status / locks ──
  await showDoc('Generation status', db.collection('generationStatus').doc(uid));
  for (const ot of ['grandPrixThinking', 'grandPrixTrajectory', 'physicalGuidance', 'coaching', 'journeyMap']) {
    const ref = db.collection('generationLocks').doc(`${uid}_${ot}`);
    const snap = await ref.get();
    if (snap.exists) {
      const d = snap.data();
      const ageMs = d.acquiredAtMs ? Date.now() - d.acquiredAtMs : null;
      console.log(`\nin-flight lock (${ot}): age=${ageMs ? Math.round(ageMs / 1000) + 's' : '—'} stale=${ageMs && ageMs > 10 * 60 * 1000}`);
    }
  }

  // ── Summary ──
  console.log(`\n=== SUMMARY ===`);
  console.log(`Use the cycle-week math above to confirm whether GPT/Physical SHOULD have advanced today.`);
  console.log(`Use the Practice Card 'days old' to confirm MVC last regenerated.`);
  console.log(`Use the celebration pick comparison to confirm whether modulo coincided (only happens at N=1).`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
