import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getAllDebriefs,
  getAllReflections,
  getAllObservations,
  getAllJourneyEvents,
  getAllEventPrepPlans,
  getAllHorseProfiles,
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
 */
function computeCategoryCoverage(reflections) {
  const allCategories = REFLECTION_CATEGORIES.map(c => c.value);
  const covered = new Set(reflections.map(r => r.category).filter(Boolean));
  return {
    covered: allCategories.filter(c => covered.has(c)).length,
    total: allCategories.length
  };
}

export default function useDashboardData() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentDebriefs, setRecentDebriefs] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);

  useEffect(() => {
    if (!currentUser) return;

    let cancelled = false;

    async function fetchAll() {
      setLoading(true);

      const [debRes, refRes, obsRes, evtRes, prepRes, horseRes] = await Promise.all([
        getAllDebriefs(currentUser.uid),
        getAllReflections(currentUser.uid),
        getAllObservations(currentUser.uid),
        getAllJourneyEvents(currentUser.uid),
        getAllEventPrepPlans(currentUser.uid),
        getAllHorseProfiles(currentUser.uid)
      ]);

      if (cancelled) return;

      const debriefs = debRes.success ? debRes.data : [];
      const reflections = refRes.success ? refRes.data : [];
      const observations = obsRes.success ? obsRes.data : [];
      const journeyEvents = evtRes.success ? evtRes.data : [];
      const eventPreps = prepRes.success ? prepRes.data : [];
      const horses = horseRes.success ? horseRes.data : [];

      // Sort debriefs by rideDate descending
      const sortedDebriefs = [...debriefs].sort((a, b) =>
        (b.rideDate || '').localeCompare(a.rideDate || '')
      );

      // Active journey events (not resolved)
      const activeEvents = journeyEvents.filter(e => e.status !== 'resolved');

      // Upcoming event preps (future date, not completed/cancelled)
      const today = new Date().toISOString().split('T')[0];
      const upcoming = eventPreps
        .filter(p => p.eventDate >= today && !['completed', 'cancelled'].includes(p.status))
        .sort((a, b) => (a.eventDate || '').localeCompare(b.eventDate || ''));

      const categoryCoverage = computeCategoryCoverage(reflections);
      const streak = computeStreak(debriefs);

      setStats({
        debriefCount: debriefs.length,
        reflectionCount: reflections.length,
        observationCount: observations.length,
        journeyEventCount: journeyEvents.length,
        activeEventCount: activeEvents.length,
        eventPrepCount: eventPreps.length,
        horseCount: horses.length,
        categoryCoverage,
        streak
      });

      setRecentDebriefs(sortedDebriefs.slice(0, 5));
      setUpcomingEvents(upcoming.slice(0, 3));
      setLoading(false);
    }

    fetchAll();

    return () => { cancelled = true; };
  }, [currentUser]);

  return { loading, stats, recentDebriefs, upcomingEvents };
}
