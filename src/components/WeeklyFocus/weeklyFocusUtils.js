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
  // New structure (March 2026+): top-level weeklyAssignments extracted by Hard Rule 2
  if (gptResult?.weeklyAssignments?.length) {
    return gptResult.weeklyAssignments;
  }

  // New structure fallback: derive from selectedPath.weeks
  if (gptResult?.selectedPath?.weeks?.length) {
    const weekData = gptResult.selectedPath.weeks.find(w => w.number === cycleWeek || w.week === cycleWeek)
      || gptResult.selectedPath.weeks[cycleWeek - 1]
      || gptResult.selectedPath.weeks[0];
    const assignments = weekData?.assignments || [];
    return assignments.length ? assignments.map(a => ({
      title: a.title || '',
      description: a.description || '',
      when: a.when || '',
      buildToward: a.trajectoryLink || gptResult.selectedPath.title || 'Mental performance',
    })) : null;
  }

  // Legacy structure (pre-March 2026): paths array
  if (!gptResult?.paths) return null;

  const recommendedId = gptResult.recommendedPath;
  const path = gptResult.paths.find(p =>
    p.recommended === true || p.id === recommendedId
  ) || gptResult.paths[0];

  if (!path || path._error) return null;

  if (path.weeklyAssignments?.length) {
    return path.weeklyAssignments;
  }

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
 * Now supports optional cycleState override from the 30-day cycle system.
 *
 * @param {object} gptResult - Cached GPT output
 * @param {object} [cycleState] - Optional cycle state from readCycleState('gpt')
 */
export function extractGPTSnapshot(gptResult, cycleState = null) {
  if (!gptResult) return null;

  // Prefer cycle state currentWeek if available (30-day cycle system)
  const cycleWeek = cycleState?.currentWeek
    || getCurrentCycleWeek(gptResult.cycleStartDate || null);
  const cycleStartDate = cycleState?.cycleStartDate || gptResult.cycleStartDate || null;

  const assignments = deriveWeeklyAssignments(gptResult, cycleWeek);

  if (!assignments?.length) return null;

  return {
    weeklyAssignments: assignments,
    cycleWeek,
    cycleStartDate,
    cycleStatus: cycleState?.status || null,
    sourceGeneratedAt: gptResult.generatedAt || null,
  };
}

/**
 * Extract physical focus items from physical guidance result.
 * Supports both new 30-day cycle schema (weeks[].patterns) and legacy schema.
 *
 * @param {object} physResult - Cached Physical Guidance output
 * @param {object} [cycleState] - Optional cycle state from readCycleState('physical')
 */
export function extractPhysicalSnapshot(physResult, cycleState = null) {
  if (!physResult) return null;

  // Preferred: top-level weeklyFocusItems (extracted server-side by Hard Rule 3)
  let items = physResult.weeklyFocusItems;

  // New schema fallback: extract from weeks[currentWeek].patterns
  if (!items?.length && physResult.weeks?.length) {
    const weekIndex = (cycleState?.currentWeek || 1) - 1;
    const weekData = physResult.weeks[weekIndex] || physResult.weeks[0];
    if (weekData?.patterns) {
      items = weekData.patterns
        .filter(p => p.feedsWeeklyFocus)
        .map(p => ({
          text: p.noticingCuePrimary || p.title || '',
          sub: p.source || null,
          isHorseHealth: p.isHorseHealth || false,
        }));
    }
  }

  // Legacy fallback: weeklyFocusItems from PG-2 exercisePrescription
  if (!items?.length && physResult.exercisePrescription?.weeklyFocusItems?.length) {
    items = physResult.exercisePrescription.weeklyFocusItems;
  }

  // Legacy fallback: derive from body_awareness_cues
  if (!items?.length && physResult.exercisePrescription?.body_awareness_cues?.length) {
    items = physResult.exercisePrescription.body_awareness_cues.slice(0, 4).map(cue => ({
      text: cue.cue || cue.trigger || '',
      sub: cue.target_pattern || cue.check_method || null,
      isHorseHealth: false,
    }));
  }

  // Legacy fallback: derive from exercises
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
    cycleStatus: cycleState?.status || null,
    sourceGeneratedAt: physResult.generatedAt || null,
  };
}

/**
 * Hardcoded fallback tasks by week bucket.
 * Used when showPlanner.weeklyShowTasks hasn't been generated yet.
 * One task per area per week — mental, technical (keyed as 'tech'), physical.
 */
const TASKS_BY_WEEK = {
  10: [
    { area: 'mental',   title: 'Set your show season intention', cue: 'Write one sentence about what you want this show to teach you — not what you want to score.' },
    { area: 'tech',     title: 'Audit your weakest movement',    cue: 'Identify the one movement you avoid schooling. Ride it once per session this week — just to feel where you are.' },
    { area: 'physical', title: 'Baseline body inventory',        cue: 'Before riding today, stand still and scan: where are you tight? Write it down. This is your starting point.' },
  ],
  9: [
    { area: 'mental',   title: 'Build your focus reset habit',   cue: 'Each ride, practice one deliberate reset: exhale, soften, re-engage. Make it automatic before you need it at the show.' },
    { area: 'tech',     title: 'Ride transitions, not movements', cue: 'Pick 3 key transitions from your test. Ride them in isolation until they feel seamless — the movements will follow.' },
    { area: 'physical', title: 'Find your neutral pelvis',       cue: 'At walk and trot, check: are you tipping forward or bracing back? Find the middle. That is your show posture starting point.' },
  ],
  8: [
    { area: 'mental',   title: 'Establish your baseline mental cue',  cue: 'Choose one word or phrase that signals "ready to ride". Use it every warm-up this week.' },
    { area: 'tech',     title: 'Know your test geometry cold',         cue: 'Walk (or visualize) the test twice — trace the voltes, half-pass lines, and pirouette entry points.' },
    { area: 'physical', title: 'Map your show-day warm-up body',      cue: 'After each ride, note which part of your body needed the most releasing. This becomes your pre-show checklist.' },
  ],
  7: [
    { area: 'mental',   title: 'Ride the movement before the marker', cue: 'Practice committing to each movement 3 strides earlier than the letter this week.' },
    { area: 'tech',     title: 'Counter change of hand accuracy',     cue: 'Ride the half-pass at least twice per session — change of bend at centerline, angle matching both directions.' },
    { area: 'physical', title: 'Upper back, not hands',               cue: 'Every correction originates from the back. Note when the hands want to take over.' },
  ],
  6: [
    { area: 'mental',   title: 'Recovery reflex under pressure',      cue: 'When something goes wrong, give yourself 2 strides to reset — no more. Practice the reset, not the mistake.' },
    { area: 'tech',     title: 'Half-pirouette energy up, not out',   cue: 'Approach every half-pirouette from half-steps this week. Energy must go up before the turn begins.' },
    { area: 'physical', title: 'Glutes soft in collection',           cue: 'In every collected movement, do a single glute-check: are you gripping? Soften and feel what changes.' },
  ],
  5: [
    { area: 'mental',   title: 'Quality over quantity this week',     cue: 'Set a maximum of 3 full run-throughs of any sequence. After 3, move on.' },
    { area: 'tech',     title: 'Straightness in the tempi changes',   cue: 'Ride your changes on the centerline once per session. Straightness matters more than timing at this stage.' },
    { area: 'physical', title: 'Show posture, not fixing posture',    cue: 'Once per session: 2 minutes of your best show posture — tall, open, soft — without correcting the horse at all.' },
  ],
  4: [
    { area: 'mental',   title: 'Sharpen your anchor routine',         cue: 'Finalize the 3-step mental routine you will use before entering at A. Practice it at the start of every ride.' },
    { area: 'tech',     title: 'Halt, immobility, rein back as unit', cue: 'Practice the halt/rein back movement 3× per session as one clean sequence. 5 straight steps back, no shuffle.' },
    { area: 'physical', title: 'Elbow position in extensions',        cue: 'In every extended trot and canter: elbows by your sides, not wings. Feel the difference in following contact.' },
  ],
  3: [
    { area: 'mental',   title: 'No new experiments this week',        cue: 'If you feel the urge to try something new, write it down for after the show. This week, ride only what you know.' },
    { area: 'tech',     title: 'Solidify one weak movement',          cue: 'Pick the one movement you are least confident about. Ride it well — not perfectly — every session. Then leave it.' },
    { area: 'physical', title: 'One body-prep habit daily',           cue: 'Pick one thing — hip circles, shoulder rolls, breathing. Do it every day before you get on.' },
  ],
  2: [
    { area: 'mental',   title: 'Trust the horse, trust the training', cue: 'Before mounting, say one true thing about what your horse can do. Let that be the lens for the whole ride.' },
    { area: 'tech',     title: 'Run your planned warm-up once',       cue: 'Ride your full intended show warm-up sequence once this week. Time it. Adjust if needed.' },
    { area: 'physical', title: 'Ride fresh — shorten sessions',       cue: 'Keep rides to 35–40 minutes max. You are banking energy, not building it.' },
  ],
  1: [
    { area: 'mental',   title: 'Arrive, breathe, be present',         cue: 'Your only job at the show is to ride the horse in front of you. Not the one in your head. This one, right now.' },
    { area: 'tech',     title: 'Warm up to his rhythm, not the clock', cue: 'Let jaw softness and throughness be your green light — not a time target. Forward first, then everything else.' },
    { area: 'physical', title: 'Body check before entry at A',        cue: 'At your final halt before entering: tall, soft glutes, elbows in, exhale. Then go.' },
  ],
};

/**
 * Find the nearest upcoming show within 60 days and derive show card content.
 *
 * Returns either:
 *   { state: 'active_show', name, daysOut, weekNum, showTasks: [...] }
 *   { state: 'no_shows' }
 */
export function buildShowSnapshot(showPreps, showPlanCache, _currentWeekStart) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + 70); // 10-week window
  const cutoffStr = cutoff.toISOString().split('T')[0];

  console.log('[WF Show] buildShowSnapshot input:', {
    totalPreps: showPreps?.length,
    preps: showPreps?.map(p => ({ name: p.showName, date: p.showDateStart, status: p.status })),
    todayStr, cutoffStr,
  });

  const upcoming = showPreps
    .filter(p =>
      (p.showDateStart || '') >= todayStr &&
      (p.showDateStart || '') <= cutoffStr &&
      p.status !== 'completed'
    )
    .sort((a, b) => (a.showDateStart || '').localeCompare(b.showDateStart || ''));

  console.log('[WF Show] After filter:', upcoming.length, 'shows within 70 days');

  if (upcoming.length === 0) {
    return { state: 'no_shows' };
  }

  const show = upcoming[0];
  const showDate = new Date(show.showDateStart + 'T00:00:00');
  const daysOut = Math.ceil((showDate - today) / (1000 * 60 * 60 * 24));

  if (daysOut <= 0 || daysOut > 70) {
    return { state: 'no_shows' };
  }

  const weekNum = Math.min(10, Math.max(1, Math.ceil(daysOut / 7)));

  // Try to get tasks from cached show planner weeklyShowTasks
  let showTasks = null;
  if (showPlanCache?.result?.weeklyShowTasks) {
    const cached = showPlanCache.result.weeklyShowTasks;
    // Extract first item per area
    showTasks = ['mental', 'technical', 'physical']
      .map(area => {
        const items = cached[area];
        if (!items?.length) return null;
        return { area, title: items[0].title, cue: items[0].cue };
      })
      .filter(Boolean);
  }

  // Fallback to hardcoded tasks
  if (!showTasks?.length) {
    showTasks = TASKS_BY_WEEK[weekNum] || TASKS_BY_WEEK[8];
  }

  return {
    state: 'active_show',
    showId: show.id,
    name: show.showName || 'Upcoming Show',
    horseName: show.horseName || null,
    daysOut,
    weekNum,
    showTasks,
    sourceGeneratedAt: showPlanCache?.generatedAt || null,
  };
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
