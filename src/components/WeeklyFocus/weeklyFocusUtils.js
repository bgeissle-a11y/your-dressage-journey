import { getWeekMonday } from '../../services/weeklyFocusService';

const VOICE_IDS = ['classical_master', 'empathetic_coach', 'technical_coach', 'practical_strategist'];

/**
 * Compute which week of the 4-week GPT cycle we're in.
 * Returns 1-4, wraps around.
 */
export function getCurrentCycleWeek(cycleStartDate) {
  if (!cycleStartDate) return 1;
  const diffMs = Date.now() - new Date(cycleStartDate).getTime();
  const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
  return (diffWeeks % 4) + 1;
}

/**
 * Derive weekly assignments from GPT L1 result's existing 4-week structure.
 * Falls back to prompt-generated weeklyAssignments if cycle data unavailable.
 */
export function deriveWeeklyAssignments(gptResult, cycleWeek) {
  if (!gptResult?.paths) return null;

  const recommendedId = gptResult.recommendedPath;
  const path = gptResult.paths.find(p =>
    p.recommended === true || p.id === recommendedId
  ) || gptResult.paths[0];

  if (!path || path._error) return null;

  // Prefer prompt-generated weeklyAssignments
  if (path.weeklyAssignments?.length) {
    return path.weeklyAssignments;
  }

  // Fallback: derive from existing 4-week drilldown structure
  if (path.weeks?.length) {
    const weekData = path.weeks.find(w => w.week === cycleWeek) || path.weeks[0];
    const practices = weekData?.practices || weekData?.exercises || [];
    return practices.slice(0, 3).map(p => ({
      title: (typeof p === 'string' ? p : p.text || p.name || '').substring(0, 60),
      description: typeof p === 'string' ? p : p.text || p.description || '',
      buildToward: weekData.theme || path.title || 'Mental performance',
    }));
  }

  return null;
}

/**
 * Extract coaching snapshot from multi-voice coaching result.
 * Collects weeklyFocusExcerpt from each voice, takes up to 2.
 */
export function extractCoachingSnapshot(coachingResult) {
  if (!coachingResult?.voices) return null;

  const excerpts = [];
  let title = null;
  let reflectionNudge = null;
  let generatedAt = coachingResult.generatedAt || null;

  for (let i = 0; i < 4; i++) {
    const voice = coachingResult.voices[i];
    if (!voice || voice._error) continue;

    if (voice.weeklyFocusExcerpt && excerpts.length < 2) {
      excerpts.push({ voice: VOICE_IDS[i], text: voice.weeklyFocusExcerpt });
    }
    if (i === 3 && voice.weeklyFocusTitle) {
      title = voice.weeklyFocusTitle;
    }
    if (i === 1 && voice.weeklyFocusReflectionNudge) {
      reflectionNudge = voice.weeklyFocusReflectionNudge;
    }
  }

  if (excerpts.length === 0) return null;

  return {
    title: title || 'This week\u2019s coaching focus',
    excerpts,
    reflectionNudge,
    sourceGeneratedAt: generatedAt,
  };
}

/**
 * Extract GPT snapshot from grand prix thinking result.
 */
export function extractGPTSnapshot(gptResult) {
  if (!gptResult) return null;

  const cycleStartDate = gptResult.cycleStartDate || null;
  const cycleWeek = getCurrentCycleWeek(cycleStartDate);
  const assignments = deriveWeeklyAssignments(gptResult, cycleWeek);

  if (!assignments?.length) return null;

  return {
    weeklyAssignments: assignments,
    cycleWeek,
    cycleStartDate,
    sourceGeneratedAt: gptResult.generatedAt || null,
  };
}

/**
 * Extract physical focus items from physical guidance result.
 */
export function extractPhysicalSnapshot(physResult) {
  if (!physResult) return null;

  const items = physResult.exercisePrescription?.weeklyFocusItems
    || physResult.weeklyFocusItems;

  if (!items?.length) return null;

  return {
    weeklyFocusItems: items,
    sourceGeneratedAt: physResult.generatedAt || null,
  };
}

/**
 * Derive the current week's show content from a cached EP-3 preparation plan.
 * Returns null if no matching week or no plan.
 */
export function deriveShowWeekContent(showPlanResult, currentWeekStart) {
  if (!showPlanResult?.result) return null;

  const plan = showPlanResult.result.preparationPlan;
  if (!plan?.weeks?.length) return null;

  // Find week whose date range overlaps current ISO week
  const matchedWeek = plan.weeks.find(w => {
    if (!w.dates) return false;
    const [startStr, endStr] = w.dates.split(' to ');
    if (!startStr || !endStr) return false;
    const weekStart = new Date(startStr + 'T00:00:00');
    const weekEnd = new Date(endStr + 'T00:00:00');
    return currentWeekStart >= weekStart && currentWeekStart <= weekEnd;
  });

  if (!matchedWeek) {
    // Check if we're before plan start or after plan end
    const firstWeekStart = new Date(plan.weeks[0].dates?.split(' to ')[0] + 'T00:00:00');
    const lastWeekEnd = new Date(plan.weeks[plan.weeks.length - 1].dates?.split(' to ')[1] + 'T00:00:00');

    if (currentWeekStart < firstWeekStart) {
      return {
        state: 'before_plan',
        planStartDate: firstWeekStart.toISOString().split('T')[0],
      };
    }
    if (currentWeekStart > lastWeekEnd) {
      return { state: 'after_plan' };
    }
    return null;
  }

  return {
    state: 'active_week',
    weekNumber: matchedWeek.week_number,
    totalWeeks: plan.total_weeks,
    primaryFocus: matchedWeek.primary_focus,
    weekGoals: matchedWeek.week_goals || [],
    trainingHighlights: (matchedWeek.training_sessions || [])
      .slice(0, 3)
      .map(s => ({ type: s.session_type, description: s.description })),
    mentalPrepFocus: matchedWeek.mental_prep?.focus || null,
    readinessCheckpoint: matchedWeek.readiness_checkpoint || null,
  };
}

/**
 * Check if the show date falls within the current ISO week.
 */
export function isShowDayWeek(showDateStart, currentWeekStart) {
  if (!showDateStart) return false;
  const showDate = new Date(showDateStart + 'T00:00:00');
  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  return showDate >= currentWeekStart && showDate <= weekEnd;
}

/**
 * Extract show-day highlights from EP-4 (Show-Day Guidance) result.
 */
export function extractShowDayHighlights(showPlanResult) {
  if (!showPlanResult?.result?.showDayGuidance) return null;

  const guidance = showPlanResult.result.showDayGuidance;
  return {
    state: 'show_week',
    warmUpSummary: guidance.warm_up_strategy?.summary || guidance.warm_up_plan?.summary || null,
    keyTiming: guidance.timing_logistics?.key_times || null,
    mentalCue: guidance.mental_game?.test_ride_cue || guidance.mental_game?.key_focus || null,
  };
}

/**
 * Find the nearest upcoming show prep and derive show card content.
 */
export function buildShowSnapshot(showPreps, showPlanCache, currentWeekStart) {
  // Find nearest upcoming show
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + 90);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  const upcoming = showPreps
    .filter(p =>
      (p.showDateStart || '') >= todayStr &&
      (p.showDateStart || '') <= cutoffStr &&
      p.status !== 'completed'
    )
    .sort((a, b) => (a.showDateStart || '').localeCompare(b.showDateStart || ''));

  if (upcoming.length === 0) {
    return { state: 'no_shows' };
  }

  const show = upcoming[0];
  const showDate = new Date(show.showDateStart + 'T00:00:00');
  const daysOut = Math.ceil((showDate - today) / (1000 * 60 * 60 * 24));

  const base = {
    showId: show.id,
    name: show.showName || 'Upcoming Show',
    horseName: show.horseName || null,
    daysOut,
    showDateStart: show.showDateStart,
  };

  // No cached plan yet
  if (!showPlanCache) {
    return { ...base, state: 'plan_not_generated' };
  }

  // Show day this week?
  if (isShowDayWeek(show.showDateStart, currentWeekStart)) {
    const highlights = extractShowDayHighlights(showPlanCache);
    if (highlights) {
      return { ...base, ...highlights };
    }
  }

  // Derive week content from EP-3
  const weekContent = deriveShowWeekContent(showPlanCache, currentWeekStart);
  if (weekContent) {
    return {
      ...base,
      ...weekContent,
      sourceGeneratedAt: showPlanCache.generatedAt || null,
    };
  }

  // Current week not covered by plan
  return { ...base, state: 'outside_range' };
}

/**
 * Select the celebration from positive reflections.
 */
export function selectCelebration(reflections) {
  const positive = reflections
    .filter(r => ['personal', 'validation', 'aha'].includes(r.category))
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  if (positive.length === 0) return null;

  const r = positive[0];
  return {
    id: r.id,
    quote: r.response || r.text || '',
    horseName: r.horseName || '',
    date: r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : '',
    category: r.category === 'personal' ? 'Personal Milestone'
      : r.category === 'validation' ? 'External Validation'
      : 'Aha Moment',
  };
}
