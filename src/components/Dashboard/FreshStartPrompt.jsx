import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

/**
 * FreshStartPrompt — soft re-engagement prompt at the top of the dashboard.
 *
 * Per YDJ_HabitLoop_Implementation_Brief.md §5.2, the Fresh Start surface
 * appears only when ALL of these are true:
 *
 *   1. Rider has at least one prior debrief (not a brand-new rider — for
 *      those, the Quick Start Map handles onboarding).
 *   2. ≥14 days since the most recent debrief OR micro-debrief.
 *   3. No Fresh Start submitted in the last 30 days (don't repeat-prompt
 *      after the rider has already taken it).
 *
 * Dismissal is session-scoped (sessionStorage). The prompt reappears in
 * the next session if the trigger conditions still hold — per the brief,
 * "It WILL reappear in the next session if the trigger conditions still
 * hold." This keeps the surface gentle but not invisible.
 */

const INACTIVITY_DAYS_THRESHOLD = 14;
const FRESH_START_SUPPRESS_DAYS = 30;
const SESSION_DISMISS_KEY = 'ydj-fresh-start-prompt-dismissed';

export default function FreshStartPrompt({ stats }) {
  const [dismissed, setDismissed] = useState(false);

  // Check session dismissal on mount
  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_DISMISS_KEY) === '1') {
        setDismissed(true);
      }
    } catch (_) { /* sessionStorage may be unavailable in some contexts */ }
  }, []);

  if (!stats) return null;
  if (dismissed) return null;

  const hasPriorDebrief = (stats.debriefCount || 0) >= 1;
  const inactiveLongEnough =
    stats.daysSinceLastActivity != null &&
    stats.daysSinceLastActivity >= INACTIVITY_DAYS_THRESHOLD;
  const recentlyTookFreshStart =
    stats.daysSinceLastFreshStart != null &&
    stats.daysSinceLastFreshStart < FRESH_START_SUPPRESS_DAYS;
  // Respect the monthly / yearly cap — don't invite a Fresh Start the rider
  // can't actually submit. (Caps live in freshStartService.computeFreshStartCaps.)
  const atCap = !!stats.freshStartCaps?.atAnyCap;

  const shouldShow = hasPriorDebrief && inactiveLongEnough && !recentlyTookFreshStart && !atCap;
  if (!shouldShow) return null;

  function handleDismiss() {
    try { sessionStorage.setItem(SESSION_DISMISS_KEY, '1'); } catch (_) {}
    setDismissed(true);
  }

  return (
    <div
      className="fresh-start-prompt"
      role="region"
      aria-label="Fresh Start invitation"
      style={{
        background: 'linear-gradient(135deg, #FFF8F0 0%, #FAF3E8 100%)',
        borderLeft: '4px solid #C67B5C',
        borderRadius: '12px',
        padding: '20px 24px',
        margin: '0 0 20px 0',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '16px',
        boxShadow: '0 2px 12px rgba(139, 115, 85, 0.08)',
      }}
    >
      <div style={{ flex: '1 1 320px', minWidth: 0 }}>
        <div
          style={{
            fontSize: '0.78em',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '1.2px',
            color: '#C67B5C',
            marginBottom: '6px',
          }}
        >
          ⭐ The Empathetic Coach
        </div>
        <div
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '1.05em',
            color: '#3A3A3A',
            lineHeight: 1.55,
            fontStyle: 'italic',
          }}
        >
          <strong style={{ fontStyle: 'normal', color: '#8B7355' }}>Welcome back.</strong>
          {' '}Have a few minutes to settle in? A Fresh Start helps the AI catch up
          to where you are now — no catch-up logging required.
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexShrink: 0,
        }}
      >
        <Link
          to="/forms/fresh-start"
          style={{
            background: '#C67B5C',
            color: 'white',
            padding: '12px 22px',
            borderRadius: '10px',
            fontWeight: 600,
            textDecoration: 'none',
            fontSize: '0.95em',
            boxShadow: '0 2px 10px rgba(198, 123, 92, 0.25)',
            whiteSpace: 'nowrap',
          }}
        >
          Take the Fresh Start →
        </Link>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss for this session"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#7A7A7A',
            fontSize: '1.4em',
            cursor: 'pointer',
            padding: '4px 10px',
            lineHeight: 1,
          }}
          title="Not right now"
        >
          ×
        </button>
      </div>
    </div>
  );
}
