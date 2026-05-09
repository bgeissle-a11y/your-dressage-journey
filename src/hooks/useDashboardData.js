import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getAllDebriefs,
  getAllReflections,
  getAllObservations,
  getAllJourneyEvents,
  getAllShowPreparations,
  getAllHorseProfiles,
  getAllMicroDebriefs,
  getAllFreshStarts,
  REFLECTION_CATEGORIES
} from '../services';

/**
 * Compute the current weekly riding streak from debrief dates.
 * A "week" runs Mon–Sun. Streak counts consecutive weeks with at least one ride,
 * starting from the current or most recent week backward.
 */
function computeStreak(debriefs) {
  if (!debriefs.length) return 0;

  const dates = debriefs
    .map(d => d.rideDate)
    .filter(Boolean)
    .map(d => new Date(d + 'T00:00:00'));

  if (!dates.length) return 0;

  // Get the Monday of a given date's week
  function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  // Unique weeks that have rides
  const rideWeeks = new Set(dates.map(getMonday));

  // Start from today's week and walk backward
  const now = new Date();
  let weekStart = getMonday(now);
  let streak = 0;

  // If current week has no rides, start from the most recent week that does
  if (!rideWeeks.has(weekStart)) {
    const sorted = [...rideWeeks].sort((a, b) => b - a);
    if (sorted.length === 0) return 0;
    weekStart = sorted[0];
  }

  while (rideWeeks.has(weekStart)) {
    streak++;
    weekStart -= 7 * 24 * 60 * 60 * 1000; // go back one week
  }

  return streak;
}

/**
 * Count distinct reflection categories covered (out of 6).
 * Also returns the list of missing category labels.
 */
function computeCategoryCoverage(reflections) {
  const allCategories = REFLECTION_CATEGORIES.map(c => c.value);
  const covered = new Set(reflections.map(r => r.category).filter(Boolean));
  const missingLabels = REFLECTION_CATEGORIES
    .filter(c => !covered.has(c.value))
    .map(c => c.label);
  return {
    covered: allCategories.filter(c => covered.has(c)).length,
    total: allCategories.length,
    missingLabels
  };
}

/**
 * Compute sparkline data from the 8 most recent debriefs.
 */
function computeSparklineData(sortedDebriefs) {
  const recent = sortedDebriefs.slice(0, 8).reverse(); // oldest-to-newest for display
  if (recent.length < 2) return null;

  return {
    quality: recent.map(d => d.overallQuality || null).filter(v => v !== null),
    confidence: recent.map(d => d.confidenceLevel || null).filter(v => v !== null),
    dates: recent.map(d => d.rideDate),
  };
}

/**
 * Compute intention bar chart data from the last 30 days of debriefs.
 */
function computeIntentionData(sortedDebriefs) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff = thirtyDaysAgo.toISOString().split('T')[0];

  const recent = sortedDebriefs.filter(d => (d.rideDate || '') >= cutoff);
  if (recent.length < 3) return null;

  // Aggregate intention ratings
  const sums = {};
  const counts = {};

  recent.forEach(d => {
    if (!d.intentionRatings) return;
    Object.entries(d.intentionRatings).forEach(([label, rating]) => {
      if (typeof rating !== 'number') return;
      sums[label] = (sums[label] || 0) + rating;
      counts[label] = (counts[label] || 0) + 1;
    });
  });

  // Sort by frequency, take top 5
  const entries = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label]) => ({
      label,
      avg: Math.round((sums[label] / counts[label]) * 10) / 10,
      count: counts[label],
    }));

  return entries.length > 0 ? entries : null;
}

export default function useDashboardData() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentDebriefs, setRecentDebriefs] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [sparklineData, setSparklineData] = useState(null);
  const [intentionData, setIntentionData] = useState(null);

  useEffect(() => {
    if (!currentUser) return;

    let cancelled = false;

    async function fetchAll() {
      setLoading(true);

      const [debRes, refRes, obsRes, evtRes, prepRes, horseRes, microRes, freshRes] = await Promise.all([
        getAllDebriefs(currentUser.uid),
        getAllReflections(currentUser.uid),
        getAllObservations(currentUser.uid),
        getAllJourneyEvents(currentUser.uid),
        getAllShowPreparations(currentUser.uid),
        getAllHorseProfiles(currentUser.uid),
        getAllMicroDebriefs(currentUser.uid),
        getAllFreshStarts(currentUser.uid)
      ]);

      if (cancelled) return;

      const debriefs = debRes.success ? debRes.data : [];
      const reflections = refRes.success ? refRes.data : [];
      const observations = obsRes.success ? obsRes.data : [];
      const journeyEvents = evtRes.success ? evtRes.data : [];
      const showPreps = prepRes.success ? prepRes.data : [];
      const horses = horseRes.success ? horseRes.data : [];
      const microDebriefs = microRes.success ? microRes.data : [];
      const freshStarts = freshRes.success ? freshRes.data : [];

      // Sort debriefs by rideDate descending
      const sortedDebriefs = [...debriefs].sort((a, b) =>
        (b.rideDate || '').localeCompare(a.rideDate || '')
      );

      // Active journey events (not resolved)
      const activeEvents = journeyEvents.filter(e => e.status !== 'resolved');

      // Upcoming show preps (future date, not completed)
      const today = new Date().toISOString().split('T')[0];
      const upcoming = showPreps
        .filter(p => (p.showDateStart || '') >= today && p.status !== 'completed')
        .sort((a, b) => (a.showDateStart || '').localeCompare(b.showDateStart || ''));

      const categoryCoverage = computeCategoryCoverage(reflections);
      const streak = computeStreak(debriefs);

      // Most recent activity timestamp across debriefs + micros, used by the
      // Fresh Start prompt to detect rider inactivity. Debriefs use rideDate
      // (date-only); micros use submittedAt (full ISO). Coerce both to ms.
      function toMs(s) {
        if (!s) return 0;
        // Date-only YYYY-MM-DD; coerce to local midnight to avoid TZ drift.
        const t = s.length === 10 ? new Date(s + 'T00:00:00').getTime()
                                  : new Date(s).getTime();
        return Number.isFinite(t) ? t : 0;
      }
      const lastDebriefMs = debriefs.reduce((m, d) => Math.max(m, toMs(d.rideDate)), 0);
      const lastMicroMs = microDebriefs.reduce((m, d) => Math.max(m, toMs(d.submittedAt) || toMs(d.date)), 0);
      const lastActivityMs = Math.max(lastDebriefMs, lastMicroMs);
      const lastFreshStartMs = freshStarts.reduce((m, d) => Math.max(m, toMs(d.submittedAt)), 0);

      const dayMs = 24 * 60 * 60 * 1000;
      const daysSinceLastActivity = lastActivityMs
        ? Math.floor((Date.now() - lastActivityMs) / dayMs)
        : null;
      const daysSinceLastFreshStart = lastFreshStartMs
        ? Math.floor((Date.now() - lastFreshStartMs) / dayMs)
        : null;

      setStats({
        debriefCount: debriefs.length,
        reflectionCount: reflections.length,
        observationCount: observations.length,
        journeyEventCount: journeyEvents.length,
        activeEventCount: activeEvents.length,
        showPrepCount: showPreps.length,
        horseCount: horses.length,
        microDebriefCount: microDebriefs.length,
        freshStartCount: freshStarts.length,
        daysSinceLastActivity,
        daysSinceLastFreshStart,
        categoryCoverage,
        streak
      });

      setRecentDebriefs(sortedDebriefs.slice(0, 5));
      setUpcomingEvents(upcoming.slice(0, 3));
      setSparklineData(computeSparklineData(sortedDebriefs));
      setIntentionData(computeIntentionData(sortedDebriefs));
      setLoading(false);
    }

    fetchAll();

    return () => { cancelled = true; };
  }, [currentUser]);

  return { loading, stats, recentDebriefs, upcomingEvents, sparklineData, intentionData };
}
