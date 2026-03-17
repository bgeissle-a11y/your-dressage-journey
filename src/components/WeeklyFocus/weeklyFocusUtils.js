import { getWeekMonday, getWeekId } from '../../services/weeklyFocusService';

const VOICE_IDS = ['classical_master', 'empathetic_coach', 'technical_coach', 'practical_strategist'];

/**
 * Extract the numeric week number from a weekId (e.g. "2026-W12" → 12).
 * Used as a rotation seed so content varies each week.
 */
function weekRotationSeed(weekId) {
  if (!weekId) {
    const id = getWeekId();
    const m = id.match(/W(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  }
  const m = weekId.match(/W(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

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
      title: typeof p === 'string' ? p : p.text || p.name || '',
      description: typeof p === 'string' ? p : p.text || p.description || '',
      buildToward: weekData.theme || path.title || 'Mental performance',
    }));
  }

  return null;
}

/**
 * Extract coaching snapshot from multi-voice coaching result.
 * Collects weeklyFocusExcerpt from each voice, takes up to 2.
 * Falls back to narrative fields when weeklyFocusExcerpt not yet available.
 * Uses weekId to rotate which excerpts/fields are highlighted each week.
 */
export function extractCoachingSnapshot(coachingResult, weekId) {
  if (!coachingResult?.voices) return null;

  const seed = weekRotationSeed(weekId);
  const excerpts = [];
  let title = null;
  let reflectionNudge = null;
  let generatedAt = coachingResult.generatedAt || null;

  // First pass: collect weeklyFocusExcerpt fields (preferred)
  // Rotate starting voice each week so different pairs surface
  const allExcerpts = [];
  for (let i = 0; i < 4; i++) {
    const voice = coachingResult.voices[i];
    if (!voice || voice._error) continue;

    if (voice.weeklyFocusExcerpt) {
      allExcerpts.push({ voice: VOICE_IDS[i], text: voice.weeklyFocusExcerpt });
    }
    if (i === 3 && voice.weeklyFocusTitle) {
      title = voice.weeklyFocusTitle;
    }
    if (i === 1 && voice.weeklyFocusReflectionNudge) {
      reflectionNudge = voice.weeklyFocusReflectionNudge;
    }
  }

  if (allExcerpts.length > 0) {
    // Rotate: pick 2 starting from a week-dependent offset
    const offset = seed % allExcerpts.length;
    for (let j = 0; j < Math.min(2, allExcerpts.length); j++) {
      excerpts.push(allExcerpts[(offset + j) % allExcerpts.length]);
    }
  }

  // Fallback: if no weeklyFocusExcerpt, derive from existing voice fields
  // Rotate the order each week so different voices are featured
  if (excerpts.length === 0) {
    const fallbackFields = [
      { idx: 2, field: 'technical', extract: v => v.key_observations?.[0] },
      { idx: 3, field: 'practical', extract: v => v.priorities?.[0] },
      { idx: 1, field: 'empathetic', extract: v => v.partnership_insights?.[0] },
      { idx: 0, field: 'classical', extract: v => v.philosophical_reflection },
    ];

    // Collect all available fallback excerpts
    const available = [];
    for (const fb of fallbackFields) {
      const voice = coachingResult.voices[fb.idx];
      if (!voice || voice._error) continue;
      const text = fb.extract(voice);
      if (text && typeof text === 'string' && text.length > 20) {
        available.push({ voice: VOICE_IDS[fb.idx], text });
      }
    }

    // Rotate: pick 2 starting from a week-dependent offset
    if (available.length > 0) {
      const offset = seed % available.length;
      for (let j = 0; j < Math.min(2, available.length); j++) {
        excerpts.push(available[(offset + j) % available.length]);
      }
    }

    // Fallback title — rotate between available title sources
    if (!title) {
      const titleSources = [];
      const v3 = coachingResult.voices[3];
      if (v3?.weekly_plan?.focus) titleSources.push(v3.weekly_plan.focus);
      if (v3?.weekly_plan?.theme) titleSources.push(v3.weekly_plan.theme);
      const v2 = coachingResult.voices[2];
      if (v2?.key_observations?.[0] && v2.key_observations[0].length < 60) {
        titleSources.push(v2.key_observations[0]);
      }
      if (titleSources.length > 0) {
        title = titleSources[seed % titleSources.length];
      }
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
 * Falls back to body_awareness_cues or exercises when weeklyFocusItems not yet available.
 */
export function extractPhysicalSnapshot(physResult) {
  if (!physResult) return null;

  // Preferred: weeklyFocusItems from PG-2 prompt
  let items = physResult.exercisePrescription?.weeklyFocusItems
    || physResult.weeklyFocusItems;

  // Fallback: derive from body_awareness_cues
  if (!items?.length && physResult.exercisePrescription?.body_awareness_cues?.length) {
    items = physResult.exercisePrescription.body_awareness_cues.slice(0, 4).map(cue => ({
      text: cue.cue || cue.trigger || '',
      sub: cue.target_pattern || cue.check_method || null,
      isHorseHealth: false,
    }));
  }

  // Fallback: derive from exercises
  if (!items?.length && physResult.exercisePrescription?.exercises?.length) {
    items = physResult.exercisePrescription.exercises.slice(0, 4).map(ex => ({
      text: ex.name || '',
      sub: ex.riding_connection || ex.target_pattern || null,
      isHorseHealth: false,
    }));
  }

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
 * Uses weekId to rotate through different reflections each week.
 */
export function selectCelebration(reflections, weekId) {
  const positive = reflections
    .filter(r => ['personal', 'validation', 'aha'].includes(r.category))
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  if (positive.length === 0) return null;

  // Rotate: pick a different reflection each week
  const seed = weekRotationSeed(weekId);
  const r = positive[seed % positive.length];
  return {
    id: r.id,
    quote: r.mainReflection || r.response || r.text || '',
    horseName: r.horseName || '',
    date: r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : '',
    category: r.category === 'personal' ? 'Personal Milestone'
      : r.category === 'validation' ? 'External Validation'
      : 'Aha Moment',
  };
}
