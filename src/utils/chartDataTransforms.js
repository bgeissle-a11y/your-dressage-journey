/**
 * Chart Data Transformations
 *
 * Pure functions that transform raw debrief and reflection data
 * into Recharts-compatible data structures.
 * No Firestore calls — these run on data already fetched client-side.
 */

import { MENTAL_STATES, MOVEMENT_CATEGORIES, REFLECTION_CATEGORIES } from '../services';

// ─── Chart 1: Ride Quality Trend ─────────────────────────────────────
// LineChart with raw quality + 3-ride rolling average
export function computeRideQualityTrend(debriefs) {
  const sorted = [...debriefs]
    .filter(d => d.rideDate && typeof d.overallQuality === 'number')
    .sort((a, b) => (a.rideDate || '').localeCompare(b.rideDate || ''));

  return sorted.map((d, i) => {
    const windowStart = Math.max(0, i - 2);
    const window = sorted.slice(windowStart, i + 1);
    const rollingAvg = window.reduce((sum, w) => sum + w.overallQuality, 0) / window.length;

    return {
      date: d.rideDate,
      quality: d.overallQuality,
      rollingAvg: Math.round(rollingAvg * 10) / 10,
      horse: d.horseName || '',
      mentalState: d.mentalState || '',
    };
  });
}

// ─── Chart 2: Mental State Distribution ──────────────────────────────
// PieChart — count of rides per mental state
export function computeMentalStateDistribution(debriefs) {
  const COLORS = {
    calm: '#6B8E5F',
    focused: '#4A90E2',
    frustrated: '#C67B5C',
    uncertain: '#7A7A7A',
    joyful: '#D4A574',
    mixed: '#8B7355',
  };

  const LABELS = {};
  MENTAL_STATES.forEach(s => { LABELS[s.value] = s.label; });

  const counts = {};
  for (const d of debriefs) {
    if (d.mentalState) {
      counts[d.mentalState] = (counts[d.mentalState] || 0) + 1;
    }
  }

  return Object.entries(counts).map(([state, count]) => ({
    name: LABELS[state] || state,
    value: count,
    fill: COLORS[state] || '#8B7355',
  }));
}

// ─── Chart 3: Quality by Mental State ────────────────────────────────
// BarChart — average ride quality grouped by mental state
export function computeQualityByMentalState(debriefs) {
  const COLORS = {
    calm: '#6B8E5F',
    focused: '#4A90E2',
    frustrated: '#C67B5C',
    uncertain: '#7A7A7A',
    joyful: '#D4A574',
    mixed: '#8B7355',
  };

  const LABELS = {};
  MENTAL_STATES.forEach(s => { LABELS[s.value] = s.label; });

  const groups = {};
  for (const d of debriefs) {
    if (d.mentalState && typeof d.overallQuality === 'number') {
      if (!groups[d.mentalState]) groups[d.mentalState] = [];
      groups[d.mentalState].push(d.overallQuality);
    }
  }

  return Object.entries(groups).map(([state, qualities]) => ({
    state: LABELS[state] || state,
    avgQuality: Math.round((qualities.reduce((s, v) => s + v, 0) / qualities.length) * 10) / 10,
    rideCount: qualities.length,
    fill: COLORS[state] || '#8B7355',
  }));
}

// ─── Chart 6: Training Focus Distribution ────────────────────────────
// PieChart — movement tag counts grouped by category
export function computeTrainingFocusDistribution(debriefs) {
  const COLORS = [
    '#8B7355', '#6B8E5F', '#4A90E2', '#C67B5C', '#D4A574', '#4A6274',
  ];

  // Build reverse lookup: tag value → category label
  const tagToCategory = {};
  for (const cat of MOVEMENT_CATEGORIES) {
    for (const tag of cat.tags) {
      tagToCategory[tag.value] = cat.label;
    }
  }

  const categoryCounts = {};
  for (const d of debriefs) {
    for (const movement of (d.movements || [])) {
      const category = tagToCategory[movement];
      if (category) {
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      }
    }
  }

  return Object.entries(categoryCounts)
    .filter(([, count]) => count > 0)
    .map(([name, value], i) => ({
      name,
      value,
      fill: COLORS[i % COLORS.length],
    }));
}

// ─── Chart 7: Confidence Trajectory ──────────────────────────────────
// AreaChart — confidence level over time with rolling average
export function computeConfidenceTrajectory(debriefs) {
  const sorted = [...debriefs]
    .filter(d => d.rideDate && typeof d.confidenceLevel === 'number')
    .sort((a, b) => (a.rideDate || '').localeCompare(b.rideDate || ''));

  return sorted.map((d, i) => {
    const windowStart = Math.max(0, i - 2);
    const window = sorted.slice(windowStart, i + 1);
    const rollingAvg = window.reduce((sum, w) => sum + w.confidenceLevel, 0) / window.length;

    return {
      date: d.rideDate,
      confidence: d.confidenceLevel,
      rollingAvg: Math.round(rollingAvg * 10) / 10,
      horse: d.horseName || '',
      sessionType: d.sessionType || '',
    };
  });
}

// ─── Chart 8: Celebration vs Challenge Ratio ─────────────────────────
// BarChart — content proportions between wins and challenges
export function computeCelebrationChallengeRatio(debriefs) {
  let winsLength = 0;
  let challengesLength = 0;
  let ridesWithWins = 0;
  let ridesWithChallenges = 0;

  for (const d of debriefs) {
    const wl = (d.wins || '').trim().length;
    const cl = (d.challenges || '').trim().length;
    winsLength += wl;
    challengesLength += cl;
    if (wl > 0) ridesWithWins++;
    if (cl > 0) ridesWithChallenges++;
  }

  const total = winsLength + challengesLength;
  return [
    {
      name: 'Celebrations',
      contentPct: total > 0 ? Math.round((winsLength / total) * 100) : 0,
      rideCount: ridesWithWins,
      fill: '#6B8E5F',
    },
    {
      name: 'Challenges',
      contentPct: total > 0 ? Math.round((challengesLength / total) * 100) : 0,
      rideCount: ridesWithChallenges,
      fill: '#C67B5C',
    },
  ];
}

// ─── Chart 9: Reflection Category Distribution ──────────────────────
// RadarChart — count per reflection category
export function computeReflectionCategoryDistribution(reflections) {
  const counts = {};
  for (const cat of REFLECTION_CATEGORIES) {
    counts[cat.value] = 0;
  }

  for (const r of reflections) {
    if (r.category && counts[r.category] !== undefined) {
      counts[r.category]++;
    }
  }

  const maxCount = Math.max(...Object.values(counts), 1);

  return REFLECTION_CATEGORIES.map(cat => ({
    category: cat.label,
    value: counts[cat.value] || 0,
    fullMark: maxCount,
  }));
}
