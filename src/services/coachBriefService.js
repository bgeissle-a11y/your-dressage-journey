/**
 * Coach Brief Service
 *
 * Frontend service for generating and retrieving Weekly Coach Briefs.
 * Calls the generateWeeklyCoachBrief Cloud Function and reads stored
 * briefs from the riders/{uid}/coachBriefs subcollection.
 */

import { httpsCallable } from 'firebase/functions';
import { collection, getDocs, doc, getDoc, query, orderBy } from 'firebase/firestore';
import { db, functions } from '../firebase-config';

/**
 * Generate this week's coach brief via Cloud Function.
 * Assembles data from all Firestore sources (no AI call).
 *
 * @returns {Promise<{success: boolean, briefData?: object, briefId?: string, error?: string}>}
 */
export async function generateCoachBrief() {
  try {
    const fn = httpsCallable(functions, 'generateWeeklyCoachBrief', { timeout: 30_000 });
    const result = await fn();
    return result.data;
  } catch (error) {
    console.error('Error generating coach brief:', error);
    const msg = error.message || 'Failed to generate brief';
    return { success: false, error: msg };
  }
}

/**
 * Load all stored briefs for the current user, sorted newest first.
 *
 * @param {string} userId
 * @returns {Promise<{success: boolean, data?: object[], error?: string}>}
 */
export async function getCoachBriefs(userId) {
  try {
    const colRef = collection(db, 'riders', userId, 'coachBriefs');
    const snap = await getDocs(colRef);
    const briefs = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.generatedAt || '').localeCompare(a.generatedAt || ''));
    return { success: true, data: briefs };
  } catch (error) {
    console.error('Error loading coach briefs:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Load a specific brief by week ID.
 *
 * @param {string} userId
 * @param {string} weekId - e.g. "2026-03-17"
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function getCoachBrief(userId, weekId) {
  try {
    const docRef = doc(db, 'riders', userId, 'coachBriefs', weekId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return { success: false, error: 'Brief not found' };
    }
    return { success: true, data: { id: snap.id, ...snap.data() } };
  } catch (error) {
    console.error('Error loading coach brief:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Build a plain-text version of the brief suitable for email body.
 *
 * @param {object} briefData - The assembled brief data object
 * @returns {string} Plain text brief
 */
export function buildPlainTextBrief(briefData) {
  const lines = [];
  const hr = '────────────────────────────────';

  lines.push('YOUR DRESSAGE JOURNEY');
  lines.push('Weekly Rider Brief — Coach Copy');
  lines.push(hr);
  lines.push('');
  lines.push('This brief gives you a weekly view of what your student is observing');
  lines.push('between lessons — not a replacement for your coaching, but context');
  lines.push('that\'s yours to use however it\'s useful.');
  lines.push('');

  // Identity
  lines.push(`Rider: ${briefData.riderName}`);
  if (briefData.horseNames?.length > 0) {
    lines.push(`Horse${briefData.horseNames.length > 1 ? 's' : ''}: ${briefData.horseNames.join(' & ')}`);
  }
  lines.push(`Week of: ${briefData.weekOf}`);
  if (briefData.lastEntryDate) lines.push(`Last entry: ${briefData.lastEntryDate}`);
  lines.push(`Rides logged (30 days): ${briefData.ridesLast30}`);
  lines.push('');

  // Level
  if (briefData.levelLabel) {
    lines.push(`Level: ${briefData.levelLabel}`);
  }
  if (briefData.activePathLabel) {
    lines.push(`Rider type: ${briefData.activePathLabel}`);
  }
  if (briefData.trajectorySnippet) {
    lines.push(`Trajectory: ${briefData.trajectorySnippet}`);
  }
  lines.push('');

  // Growth edge
  if (briefData.growthEdge) {
    lines.push(`RIDER'S GROWTH EDGE`);
    lines.push(`"${briefData.growthEdge}"`);
    lines.push('');
  }

  // AI coach insight
  if (briefData.aiCoachInsight) {
    lines.push(`AI COACH INSIGHT — ${briefData.aiCoachInsight.voiceName}`);
    if (briefData.aiCoachInsight.rationale) {
      lines.push(`Selected: ${briefData.aiCoachInsight.rationale}`);
    }
    lines.push(briefData.aiCoachInsight.snippet);
    lines.push('');
  }

  // Show prep
  if (briefData.showPrepData) {
    const sp = briefData.showPrepData;
    lines.push('SHOW PREP — RIDER-FLAGGED CONCERNS');
    if (sp.concerns?.length > 0) {
      sp.concerns.forEach(c => lines.push(`  • ${c}`));
    }
    if (sp.showName) {
      lines.push(`${sp.showName} — ${sp.daysOut} days out`);
    }
    lines.push('');
  }

  // Lessons
  if (briefData.lessonTakeaways?.length > 0) {
    lines.push('RECENT LESSON TAKEAWAYS (30 days)');
    briefData.lessonTakeaways.forEach(t => lines.push(`  — ${t}`));
    lines.push('');
  }

  // AHAs & Obstacles
  if (briefData.ahas?.length > 0) {
    lines.push('AHA MOMENTS (30 days)');
    briefData.ahas.forEach(a => lines.push(`  ✦ ${a}`));
    lines.push('');
  }
  if (briefData.obstacles?.length > 0) {
    lines.push('OBSTACLES (30 days)');
    briefData.obstacles.forEach(o => lines.push(`  △ ${o}`));
    lines.push('');
  }

  // Upcoming event
  if (briefData.upcomingEvent) {
    const evt = briefData.upcomingEvent;
    lines.push(`UPCOMING: ${evt.name} — ${evt.daysOut} days`);
    lines.push('');
  }

  // Consent & integrity
  lines.push(hr);
  if (briefData.coaches?.[0]) {
    lines.push(`Rider consented to coach sharing — Opt-in: ${briefData.coaches[0].optInDate}`);
  }
  lines.push('Data reflects rider\'s own entries, unmodified.');
  lines.push('AI insight uses the same data the rider sees — nothing contradicts or supplements what she has been shown.');
  lines.push('');
  lines.push('Confidential — For coaching use only');
  lines.push('yourdressagejourney.com');

  return lines.join('\n');
}

/**
 * Build a mailto: URL for sending the brief to a coach.
 *
 * @param {object} briefData - The assembled brief data
 * @param {object} coach - { name, email }
 * @returns {string} mailto: URL
 */
export function buildMailtoUrl(briefData, coach) {
  const subject = `[YDJ] Weekly Rider Brief — ${briefData.riderName} — Week of ${briefData.weekOf}`;
  const body = buildPlainTextBrief(briefData);
  return `mailto:${encodeURIComponent(coach.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
