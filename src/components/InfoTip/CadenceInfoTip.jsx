import InfoTip from './InfoTip';
import { CADENCE_CONTENT } from '../../constants/cadenceContent';

/**
 * Output-card cadence tooltip for the dashboard.
 * Displays: title + 1-sentence description + cadence label.
 *
 * Per the Contextual Help brief, "Last refreshed" is shown on the per-output
 * page cadence strip (where the cached output document is already loaded),
 * not on the dashboard cards (which would require new Firestore reads).
 *
 * Usage:
 *   <CadenceInfoTip outputSlug="journey-map" />
 */
export default function CadenceInfoTip({ outputSlug, iconSize = 14, triggerClassName }) {
  const c = CADENCE_CONTENT[outputSlug];
  if (!c) return null;

  const content = (
    <>
      <p className="info-tip__heading">{c.title}</p>
      <p>{c.description}</p>
      <span className="info-tip__meta">
        <strong>Refreshes:</strong> {c.cadence}
      </span>
    </>
  );

  return (
    <InfoTip
      content={content}
      iconSize={iconSize}
      ariaLabel={`About ${c.title}`}
      triggerClassName={triggerClassName}
    />
  );
}
