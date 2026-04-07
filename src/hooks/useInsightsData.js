/**
 * useInsightsData
 *
 * Fetches debrief, reflection, and profile data from Firestore
 * and computes pre-processed summaries for each Insights page chart.
 * No raw debrief documents are passed to chart components.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getAllDebriefs, getAllReflections, getRiderProfile } from '../services';
import { getJourneyMap } from '../services/aiService';

/* ── Color palettes ── */

const HORSE_COLOR_PALETTE = [
  '#B8862A', // gold
  '#4A7DC4', // blue
  '#5B9E6B', // green
  '#C45252', // rust
  '#8B5EA0', // purple
  '#D4722A', // orange
  '#8B7355', // tan
];

export const REFLECTION_CATEGORY_COLORS = {
  'Personal Milestone':  '#4A7DC4',
  'External Validation': '#5B9E6B',
  'Aha Moment':          '#D4A017',
  'Obstacle':            '#C45252',
  'Connection':          '#8B5EA0',
  'Feel/Body Awareness': '#D4722A',
};

const ARC_COLORS = {
  built:      '#5B9E6B',
  consistent: '#4A7DC4',
  peak:       '#B8862A',
  variable:   '#8B7355',
  faded:      '#D4722A',
  valley:     '#C45252',
};

const ARC_LABELS = {
  built:      'Built',
  consistent: 'Consistent',
  peak:       'Peak',
  variable:   'Variable',
  faded:      'Faded',
  valley:     'Valley',
};

const CANONICAL_CATEGORIES = [
  'Personal Milestone',
  'External Validation',
  'Aha Moment',
  'Obstacle',
  'Connection',
  'Feel/Body Awareness',
];

// Map stored category keys to display names
const CATEGORY_KEY_TO_LABEL = {
  personal: 'Personal Milestone',
  validation: 'External Validation',
  aha: 'Aha Moment',
  obstacle: 'Obstacle',
  connection: 'Connection',
  feel: 'Feel/Body Awareness',
};

/* ── Helpers ── */

export function buildHorseColorMap(debriefs) {
  const names = [...new Set(debriefs.map(d => d.horseName).filter(Boolean))].sort();
  return Object.fromEntries(
    names.map((name, i) => [name, HORSE_COLOR_PALETTE[i % HORSE_COLOR_PALETTE.length]])
  );
}

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function getWeekLabel(date) {
  const d = new Date(date + 'T00:00:00');
  const month = d.toLocaleString('en-US', { month: 'short' });
  const day = d.getDate();
  return `${month} ${day}`;
}

function getWeekKey(date) {
  const d = new Date(date + 'T00:00:00');
  const year = d.getFullYear();
  const jan1 = new Date(year, 0, 1);
  const weekNum = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return `${year}-W${String(weekNum).padStart(2, '0')}`;
}

/* ── Compute functions ── */

function computePerRideQC(debriefs, horseColorMap) {
  // Group by horse for separate Scatter components
  const byHorse = {};
  debriefs.forEach(d => {
    if (d.overallQuality == null || d.confidenceLevel == null) return;
    const horse = d.horseName || 'Unknown';
    if (!byHorse[horse]) byHorse[horse] = [];
    byHorse[horse].push({ x: d.overallQuality, y: d.confidenceLevel, horse });
  });
  return byHorse;
}

function computePerRideEffort(debriefs, horseColorMap) {
  const byHorse = {};
  debriefs.forEach(d => {
    if (d.riderEffort == null || d.overallQuality == null) return;
    const horse = d.horseName || 'Unknown';
    if (!byHorse[horse]) byHorse[horse] = [];
    byHorse[horse].push({ x: d.riderEffort, y: d.overallQuality, horse });
  });
  return byHorse;
}

const SESSION_LABELS = {
  lesson: 'Lesson', schooling: 'Schooling', conditioning: 'Conditioning',
  clinic: 'Clinic', 'show-schooling': 'Show Schooling', 'show-test': 'Show Test', other: 'Other',
};

function categorizeTheme(name) {
  const lower = (name || '').toLowerCase();
  if (lower.includes('connection') || lower.includes('throughness') || lower.includes('partnership') || lower.includes('transition') || lower.includes('relationship'))
    return 'partnership';
  if (lower.includes('position') || lower.includes('body') || lower.includes('seat') || lower.includes('softness') || lower.includes('allowing') || lower.includes('feel') || lower.includes('awareness') || lower.includes('proprioceptive') || lower.includes('rider'))
    return 'rider';
  if (lower.includes('tension') || lower.includes('jaw') || lower.includes('contact') || lower.includes('tempi') || lower.includes('lameness') || lower.includes('horse') || lower.includes('suppleness') || lower.includes('resistance'))
    return 'horse';
  return 'training';
}

function computeQualityBySessionType(debriefs, horseColorMap) {
  const horses = Object.keys(horseColorMap);
  const byTypeHorse = {};

  debriefs.forEach(d => {
    if (!d.sessionType || d.overallQuality == null) return;
    const key = d.sessionType;
    if (!byTypeHorse[key]) byTypeHorse[key] = {};
    const horse = d.horseName || 'Unknown';
    if (!byTypeHorse[key][horse]) byTypeHorse[key][horse] = [];
    byTypeHorse[key][horse].push(d.overallQuality);
  });

  const SESSION_LABELS = {
    lesson: 'Lesson', schooling: 'Schooling', conditioning: 'Conditioning',
    clinic: 'Clinic', 'show-schooling': 'Show Schooling', 'show-test': 'Show Test', other: 'Other',
  };

  return Object.entries(byTypeHorse).map(([type, horseData]) => {
    const entry = { type: SESSION_LABELS[type] || type };
    horses.forEach(h => {
      entry[h] = horseData[h] ? Math.round(avg(horseData[h]) * 10) / 10 : null;
    });
    return entry;
  });
}

function computeQualityByArc(debriefs) {
  const byArc = {};
  debriefs.forEach(d => {
    if (!d.rideArc || d.overallQuality == null) return;
    if (!byArc[d.rideArc]) byArc[d.rideArc] = [];
    byArc[d.rideArc].push(d.overallQuality);
  });

  return Object.entries(byArc).map(([arc, qualities]) => ({
    arc,
    label: ARC_LABELS[arc] || arc,
    avgQ: Math.round(avg(qualities) * 10) / 10,
    count: qualities.length,
    color: ARC_COLORS[arc] || '#8B7355',
  }));
}

function computeMentalStateBubbles(debriefs) {
  const total = debriefs.filter(d => d.mentalState).length;
  if (!total) return [];

  const byState = {};
  debriefs.forEach(d => {
    if (!d.mentalState) return;
    if (!byState[d.mentalState]) byState[d.mentalState] = { qualities: [], count: 0 };
    byState[d.mentalState].count++;
    if (d.overallQuality != null) byState[d.mentalState].qualities.push(d.overallQuality);
  });

  const MENTAL_STATE_LABELS = {
    calm: 'Calm/Centered', focused: 'Focused/Determined', joyful: 'Joyful/Flowing',
    confident: 'Confident', mixed: 'Mixed/Complex', uncertain: 'Uncertain/Confused',
    worried: 'Worried', frustrated: 'Frustrated/Tense', tired: 'Tired', distracted: 'Distracted',
  };

  return Object.entries(byState).map(([name, data]) => ({
    name: MENTAL_STATE_LABELS[name] || name,
    pct: Math.round((data.count / total) * 100),
    avgQ: Math.round(avg(data.qualities) * 10) / 10,
    color: getMentalStateColor(name),
  }));
}

function getMentalStateColor(state) {
  const colors = {
    calm: '#5B9E6B', focused: '#4A7DC4', joyful: '#D4A017', confident: '#B8862A',
    mixed: '#8B7355', uncertain: '#D4722A', worried: '#C45252', frustrated: '#C45252',
    tired: '#8B5EA0', distracted: '#D4722A',
  };
  return colors[state] || '#8B7355';
}

function computeAdherenceByWeek(debriefs) {
  const weekMap = {};

  debriefs.forEach(d => {
    // goalRatings is the primary field; prevGoalRatings is legacy
    const ratings = d.goalRatings || d.prevGoalRatings;
    if (!ratings) return;
    const dateStr = d.rideDate || d.createdAt?.split('T')[0] || '';
    if (!dateStr) return;
    const weekKey = getWeekKey(dateStr);
    const weekLabel = getWeekLabel(dateStr);

    if (!weekMap[weekKey]) {
      weekMap[weekKey] = { fully: 0, mostly: 0, somewhat: 0, notAtAll: 0, total: 0, label: weekLabel };
    }

    // Ratings are string enums: 'fully', 'mostly', 'somewhat', 'not-at-all'
    ['goal1', 'goal2', 'goal3'].forEach(gk => {
      const g = ratings[gk];
      if (g == null || g === '') return;
      // Handle both string enum values and legacy numeric values
      const val = typeof g === 'object' ? (g.rating || g) : g;
      if (val == null || val === '') return;
      weekMap[weekKey].total++;
      if (val === 'fully' || val === 4 || val === '4' || val === 5 || val === '5') weekMap[weekKey].fully++;
      else if (val === 'mostly' || val === 3 || val === '3') weekMap[weekKey].mostly++;
      else if (val === 'somewhat' || val === 2 || val === '2') weekMap[weekKey].somewhat++;
      else if (val === 'not-at-all' || val === 1 || val === '1' || val === 0 || val === '0') weekMap[weekKey].notAtAll++;
    });
  });

  return Object.entries(weekMap)
    .filter(([, data]) => data.total > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([, data]) => {
      const total = data.total || 1;
      return {
        week: data.label,
        fully: Math.round((data.fully / total) * 100),
        mostly: Math.round((data.mostly / total) * 100),
        somewhat: Math.round((data.somewhat / total) * 100),
        notAtAll: Math.round((data.notAtAll / total) * 100),
      };
    });
}

function computeReflectionHeatmap(reflections) {
  const weekMap = {};

  reflections.forEach(r => {
    const rawCat = r.category;
    if (!rawCat) return;
    // Map stored key (e.g. 'personal') to display label (e.g. 'Personal Milestone')
    const cat = CATEGORY_KEY_TO_LABEL[rawCat] || rawCat;
    if (!CANONICAL_CATEGORIES.includes(cat)) return;
    const dateStr = r.reflectionDate || r.createdAt?.split('T')[0] || '';
    if (!dateStr) return;
    const weekKey = getWeekKey(dateStr);

    if (!weekMap[weekKey]) weekMap[weekKey] = {};
    if (!weekMap[weekKey][cat]) weekMap[weekKey][cat] = 0;
    weekMap[weekKey][cat]++;
  });

  const allWeeks = Object.keys(weekMap).sort();
  const recentWeeks = allWeeks.slice(-8);

  const counts = {};
  CANONICAL_CATEGORIES.forEach(cat => {
    counts[cat] = recentWeeks.map(wk => weekMap[wk]?.[cat] || 0);
  });

  return {
    categories: CANONICAL_CATEGORIES,
    weeks: recentWeeks.map(wk => {
      // Convert week key to a readable label
      const parts = wk.split('-W');
      return `Wk ${parseInt(parts[1])}`;
    }),
    counts,
  };
}

/* ── Main hook ── */

export default function useInsightsData() {
  const { currentUser } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [insufficientData, setInsufficientData] = useState(null);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [debRes, refRes, profileRes] = await Promise.all([
          getAllDebriefs(currentUser.uid),
          getAllReflections(currentUser.uid),
          getRiderProfile(currentUser.uid),
        ]);

        if (cancelled) return;

        const debriefs = (debRes.success ? debRes.data : [])
          .filter(d => !d.isDraft && !d.isDeleted);
        const reflections = (refRes.success ? refRes.data : [])
          .filter(r => !r.isDeleted);
        const profile = profileRes.success ? profileRes.data : null;

        if (debriefs.length < 5) {
          setInsufficientData({
            message: 'Quality patterns will appear here after a few more rides. Keep logging your debriefs.',
            debriefCount: debriefs.length,
          });
          // Still compute what we can for Sections 2 & 3
        }

        const horseColorMap = buildHorseColorMap(debriefs);

        // Load themes + goals from Journey Map via Cloud Function (same call JourneyMapPanel uses).
        // The CF reads from analysisCache and returns { success, synthesis, narrative, ... }
        let themes = [];
        let aiGoals = [];
        let hasJourneyMap = false;
        try {
          const jmResult = await getJourneyMap({ staleOk: true });
          if (jmResult?.success !== false && jmResult) {
            hasJourneyMap = true;
            const syn = jmResult.synthesis || jmResult;

            // Themes: array of { theme, evidence, significance }
            // No count or category fields — rank by array position, categorize by keywords
            const rawThemes = syn.themes;
            if (rawThemes && Array.isArray(rawThemes)) {
              themes = rawThemes.map((t, i) => ({
                name: typeof t === 'string' ? t : (t.theme || t.name || `Theme ${i + 1}`),
                count: rawThemes.length - i, // approximate rank by position
                category: categorizeTheme(typeof t === 'string' ? t : (t.theme || '')),
                evidence: typeof t === 'object' ? (t.evidence || '') : '',
                significance: typeof t === 'object' ? (t.significance || '') : '',
              }));
            }

            // Goal progress: { goal, progress_pct, evidence, next_step }
            // No milestones or voice_callout in current data
            const rawGoals = syn.goal_progress;
            if (rawGoals && Array.isArray(rawGoals)) {
              aiGoals = rawGoals.map(g => ({
                text: g.goal || g.title || '',
                progress: g.progress_pct || g.progress || 0,
                milestones: g.milestones || [],
                nextSteps: g.next_steps || g.next_step || '',
                evidence: g.evidence || '',
                narrative: g.narrative || '',
                voiceCallout: g.voice_callout || null,
              }));
            }
          }
        } catch (err) {
          // CF call failed — themes and goals will show empty states
          console.warn('[useInsightsData] Journey Map CF failed:', err.message);
        }

        // Fall back to profile longTermGoals text if no AI goal data
        const goals = aiGoals.length > 0 ? aiGoals : [];
        if (!goals.length && profile?.longTermGoals) {
          const lines = profile.longTermGoals.split('\n').filter(l => l.trim());
          lines.forEach(line => goals.push({ text: line.trim() }));
        }

        const result = {
          // Section 1 — grouped by horse for separate Scatter components
          perRideQC: computePerRideQC(debriefs, horseColorMap),
          perRideEffort: computePerRideEffort(debriefs, horseColorMap),
          qualityBySessionType: computeQualityBySessionType(debriefs, horseColorMap),
          qualityByArc: computeQualityByArc(debriefs),
          mentalStateBubbles: computeMentalStateBubbles(debriefs),

          // Section 2
          themes,
          adherenceByWeek: computeAdherenceByWeek(debriefs),

          // Section 3
          goals,
          hasJourneyMap,
          reflectionHeatmap: computeReflectionHeatmap(reflections),

          // Shared
          horseColorMap,
          totalDebriefs: debriefs.length,
          riderName: profile?.name || profile?.displayName || currentUser.displayName || '',
        };

        if (!cancelled) setData(result);
      } catch (err) {
        console.error('useInsightsData error:', err);
        if (!cancelled) setError(err.message || 'Failed to load insights data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [currentUser]);

  return { data, loading, error, insufficientData };
}
