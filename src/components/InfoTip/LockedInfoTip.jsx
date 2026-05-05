import InfoTip from './InfoTip';
import useJourneyProgress from '../QuickStartMap/useJourneyProgress';

/**
 * Locked-state tooltip for outputs that haven't unlocked yet.
 *
 * Copy is sourced verbatim from Part 2D of the v1.1 Contextual Help brief,
 * which routes per-output trigger language to one of three variants:
 *
 *   activity — Multi-Voice Coaching, Journey Map, Data Visualizations.
 *              Auto-refresh trigger is "10 combined entries (debriefs +
 *              reflections)." Live count is read from useJourneyProgress.
 *
 *   tier     — Grand Prix Thinking, Physical Guidance.
 *              30-day cycle outputs gated to Medium / Extended tiers.
 *              Static copy.
 *
 *   event    — Event Planner. Static copy.
 *
 * Usage:
 *   <LockedInfoTip variant="activity" />
 */
export default function LockedInfoTip({ variant = 'activity', iconSize = 14, triggerClassName }) {
  const { progress, loading } = useJourneyProgress();

  const ariaLabel = 'Why this is locked';

  if (variant === 'tier') {
    const content = (
      <p>
        Available on Medium and Extended tiers. Once activated, generates as a 30-day program
        with internal 4-week progression.
      </p>
    );
    return (
      <InfoTip content={content} iconSize={iconSize} ariaLabel={ariaLabel} triggerClassName={triggerClassName} />
    );
  }

  if (variant === 'event') {
    const content = <p>Generates when you submit an Event Preparation form for an upcoming event.</p>;
    return (
      <InfoTip content={content} iconSize={iconSize} ariaLabel={ariaLabel} triggerClassName={triggerClassName} />
    );
  }

  // variant === 'activity'
  if (loading || !progress) {
    return (
      <InfoTip
        content="Loading your progress…"
        iconSize={iconSize}
        ariaLabel={ariaLabel}
        triggerClassName={triggerClassName}
      />
    );
  }

  const combined = (progress.debriefCount || 0) + (progress.reflectionCount || 0);
  const content = (
    <p>
      Auto-refreshes once you&rsquo;ve crossed the activity trigger &mdash; typically 10 debriefs
      (or a mix of debriefs and reflections). You&rsquo;re at {combined}{' '}
      combined {combined === 1 ? 'entry' : 'entries'}.
    </p>
  );
  return (
    <InfoTip content={content} iconSize={iconSize} ariaLabel={ariaLabel} triggerClassName={triggerClassName} />
  );
}
