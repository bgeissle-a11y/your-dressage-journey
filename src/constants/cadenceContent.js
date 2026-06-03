/**
 * Cadence content for tooltip & cadence-strip placements.
 *
 * Single source of truth: YDJ_Pricing_Discounts_Consolidation_v2.md Part 2
 * (April 21, 2026 — Final), as restated in Part 0 of the v1.1 Contextual
 * Help Implementation Brief. Do not paraphrase the cadence label, the
 * "Next refresh" line, or the howItWorks tooltip — they are rider-facing
 * copy locked to that source.
 *
 * EXCEPTION: the cycle outputs (grand-prix, physical) had their
 * nextRefreshLabel + howItWorks corrected by the Cycle Cadence Copy
 * Correction brief (June 2026) to stop implying automatic regeneration.
 * These outputs are rider-triggered (no auto-regen); that brief and
 * CLAUDE.md ("Cycle expiry: rider-triggered refresh only") are the
 * authority for their cycle copy.
 *
 * Each entry:
 *   title:            Output display name.
 *   description:      One-sentence summary (used as the second line of the
 *                     dashboard cadence tooltip; sourced from the FAQ overview).
 *   cadence:          Cadence badge label (verbatim, Part 0).
 *   nextRefreshLabel: "Next refresh" copy on the cadence strip
 *                     (a date is substituted at render time for cycle-based outputs).
 *   howItWorks:       Verbatim Part 0 tooltip — used inside the strip's
 *                     trailing "How this works" InfoTip.
 */
export const CADENCE_CONTENT = {
  'journey-map': {
    title: 'Journey Map',
    description: "Your visual and narrative timeline — milestones, patterns, and progress you might not see yourself.",
    cadence: 'Auto-refresh on activity',
    nextRefreshLabel: 'When you cross the next refresh trigger',
    howItWorks:
      'Refreshes after 10 combined debriefs and reflections, or after a journey event plus 5 entries. Working tier: max once per month. Extended: no frequency cap.',
  },
  'multi-voice': {
    title: 'Multi-Voice Coaching',
    description: 'Four distinct coaching perspectives analyze your same data through different lenses.',
    cadence: 'Auto-refresh on activity',
    nextRefreshLabel: 'When you cross the next refresh trigger',
    howItWorks:
      "Refreshes after every 10 new debriefs. Working tier: also a monthly fallback if the 10-debrief trigger hasn't fired. Extended tier: regenerate any time, with a 4-hour cooldown.",
  },
  'data-viz': {
    title: 'Data Visualizations',
    description: 'Charts and graphs that make the invisible visible — your trends, correlations, and progress over time.',
    cadence: 'Refreshes with Multi-Voice',
    nextRefreshLabel: 'Refreshes with Multi-Voice Coaching',
    howItWorks:
      'Refreshes whenever your Multi-Voice Coaching refreshes — every 10 debriefs (Working: monthly fallback; Extended: manual regen with 4-hour cooldown).',
  },
  'grand-prix': {
    title: 'Grand Prix Thinking',
    description: 'Mental skills development with daily practices and long-term training trajectory paths.',
    cadence: 'monthly cycle',
    nextRefreshLabel: 'end of your current 30-day cycle',
    howItWorks:
      'Your 30-day program runs as one continuous cycle with weekly progression. When the cycle ends, you decide when to generate the next one. Medium tier includes one mid-cycle refresh. Extended tier can refresh any time.',
  },
  physical: {
    title: 'Physical Guidance',
    description: "Off-horse exercises and body awareness practices tailored to your documented challenges.",
    cadence: 'monthly cycle',
    nextRefreshLabel: 'end of your current 30-day cycle',
    howItWorks:
      'Your 30-day program runs as one continuous cycle with weekly progression. When the cycle ends, you decide when to generate the next one. Medium tier includes one mid-cycle refresh. Extended tier can refresh any time.',
  },
  'event-planner': {
    title: 'Event Planner',
    description: 'Personalized preparation plans for shows — from readiness analysis through a week-by-week training plan.',
    cadence: 'On demand',
    nextRefreshLabel: 'Generated per event',
    howItWorks:
      'Generated when you submit an Event Preparation form. One plan per event.',
  },
};
