/**
 * Lesson Prep Service
 *
 * Frontend wrapper for the generateLessonPrepSummary Cloud Function.
 * Returns an assembled Pre-Lesson Summary from Firestore data + cached
 * AI outputs. No Claude API call is made.
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase-config';

/**
 * Generate the rider's current Pre-Lesson Summary.
 *
 * @returns {Promise<{success: boolean, briefData?: object, error?: string}>}
 */
export async function generateLessonPrepSummary() {
  try {
    const fn = httpsCallable(functions, 'generateLessonPrepSummary', { timeout: 30_000 });
    const result = await fn();
    return result.data;
  } catch (error) {
    console.error('Error generating lesson prep summary:', error);
    return { success: false, error: error.message || 'Failed to generate summary' };
  }
}

/**
 * Build a plain-text version of the summary suitable for email body
 * when a rider shares it with her coach. Rider-facing (second person).
 *
 * @param {object} briefData
 * @returns {string}
 */
export function buildLessonPrepPlainText(briefData) {
  const lines = [];
  const hr = '\u2500'.repeat(32);

  lines.push('YOUR DRESSAGE JOURNEY');
  lines.push('Pre-Lesson Summary');
  lines.push(hr);
  lines.push('');

  lines.push(`Rider: ${briefData.riderName}`);
  if (briefData.horseNames?.length > 0) {
    lines.push(`Horse${briefData.horseNames.length > 1 ? 's' : ''}: ${briefData.horseNames.join(' & ')}`);
  }
  lines.push(`Week of: ${briefData.weekOf}`);
  if (briefData.lastEntryDate) lines.push(`Last ride: ${briefData.lastEntryDate}`);
  lines.push(`Rides (14 days): ${briefData.ridesLast14}`);
  lines.push('');

  if (briefData.levelLabel) {
    const level = briefData.targetLevelLabel
      ? `${briefData.levelLabel} \u00b7 Working toward ${briefData.targetLevelLabel}`
      : briefData.levelLabel;
    lines.push(`Level: ${level}`);
  }
  if (briefData.trajectorySnippet) lines.push(`Trajectory: ${briefData.trajectorySnippet}`);
  lines.push('');

  if (briefData.priorityThisWeek) {
    lines.push("THIS WEEK'S FOCUS");
    lines.push(briefData.priorityThisWeek);
    lines.push('');
  }

  if (briefData.aiCoachInsight?.snippet) {
    lines.push('COACHING INSIGHT');
    lines.push(briefData.aiCoachInsight.snippet);
    lines.push('');
  }

  if (briefData.lessonTakeaways?.length > 0) {
    lines.push('RIDER-IDENTIFIED LESSON INSIGHTS (14 days)');
    briefData.lessonTakeaways.forEach((t) => lines.push(`  \u2014 ${t}`));
    lines.push('');
  }

  if (briefData.ahas?.length > 0 || briefData.obstacles?.length > 0) {
    lines.push('RIDER-IDENTIFIED INSIGHTS (14 days)');
    (briefData.ahas || []).forEach((a) => lines.push(`  \u2726 AHA: ${a}`));
    (briefData.obstacles || []).forEach((o) => lines.push(`  \u25b3 Obstacle: ${o}`));
    lines.push('');
  }

  if (briefData.showPrepData) {
    const sp = briefData.showPrepData;
    lines.push(`GOING INTO ${sp.showName || 'UPCOMING SHOW'} \u2014 ${sp.daysOut} days out`);
    if (sp.testLabel) lines.push(`Test: ${sp.testLabel}`);
    if (sp.flaggedMovements?.length > 0) {
      sp.flaggedMovements.forEach((m) => {
        const coeff = m.coeff ? ' (\u00d72)' : '';
        lines.push(`  \u2022 ${m.text}${coeff}`);
      });
    }
    lines.push('');
  }

  if (briefData.openingLine) {
    lines.push('OPENING LINE');
    lines.push(`"${briefData.openingLine}"`);
    lines.push('');
  }

  lines.push(hr);
  lines.push('yourdressagejourney.com');
  return lines.join('\n');
}

/**
 * Build a mailto: URL for sharing the summary with a coach.
 */
export function buildLessonPrepMailto(briefData, coach) {
  const subject = `[YDJ] Pre-Lesson Summary \u2014 ${briefData.riderName} \u2014 ${briefData.weekOf}`;
  const body = buildLessonPrepPlainText(briefData);
  return `mailto:${encodeURIComponent(coach.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
