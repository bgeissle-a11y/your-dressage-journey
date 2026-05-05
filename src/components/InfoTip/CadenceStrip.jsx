import InfoTip from './InfoTip';
import { CADENCE_CONTENT } from '../../constants/cadenceContent';
import './CadenceStrip.css';

function formatDate(value) {
  if (!value) return null;
  let d;
  if (value instanceof Date) d = value;
  else if (typeof value === 'object' && typeof value.toDate === 'function') d = value.toDate();
  else if (typeof value === 'number' || typeof value === 'string') d = new Date(value);
  else if (value && typeof value === 'object' && '_seconds' in value) {
    d = new Date(value._seconds * 1000);
  } else return null;

  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Compact metadata strip for output pages.
 *
 * Pattern: Last refreshed [date] · Next refresh [date or condition] · How this works ⓘ
 *
 * Props:
 *   outputSlug:        key into CADENCE_CONTENT (e.g., "journey-map")
 *   lastRefreshedAt:   Date | string | Firestore Timestamp | { _seconds }
 *   nextRefreshAt:     Date | string | Timestamp — used for cycle-based outputs
 *                      to display "Apr 28 — end of current 30-day cycle"
 *   liveData:          true for client-side computed outputs (e.g., Data Viz)
 *                      that don't have an AI-generated document timestamp.
 */
export default function CadenceStrip({ outputSlug, lastRefreshedAt, nextRefreshAt, liveData = false }) {
  const c = CADENCE_CONTENT[outputSlug];
  if (!c) return null;

  const lastFormatted = formatDate(lastRefreshedAt);
  const nextDateFormatted = formatDate(nextRefreshAt);

  let lastSegment;
  if (liveData) lastSegment = 'Updated continuously';
  else if (lastFormatted) lastSegment = `Last refreshed ${lastFormatted}`;
  else lastSegment = 'Not yet generated';

  let nextSegment;
  if (nextDateFormatted && c.nextRefreshLabel.includes('cycle')) {
    nextSegment = `Next refresh ${nextDateFormatted} — ${c.nextRefreshLabel}`;
  } else if (c.nextRefreshLabel === 'Generated per event') {
    nextSegment = c.nextRefreshLabel;
  } else {
    nextSegment = `Next refresh: ${c.nextRefreshLabel.charAt(0).toLowerCase() + c.nextRefreshLabel.slice(1)}`;
  }

  return (
    <div className="cadence-strip" role="contentinfo">
      <span className="cadence-strip__segment">{lastSegment}</span>
      <span className="cadence-strip__sep" aria-hidden="true">·</span>
      <span className="cadence-strip__segment">{nextSegment}</span>
      <span className="cadence-strip__sep" aria-hidden="true">·</span>
      <span className="cadence-strip__segment cadence-strip__segment--how">
        How this works
        <InfoTip
          content={<p>{c.howItWorks}</p>}
          ariaLabel={`How ${c.title} refreshes`}
          iconSize={14}
        />
      </span>
    </div>
  );
}
