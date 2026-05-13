/**
 * UpgradeNotice — inline banner shown when the user lacks entitlement for a
 * panel's "generate fresh" action. Cached/historical content still renders;
 * the regen button is disabled separately.
 *
 * Per implementation brief: surface the lowest required tier from
 * `requiredTierFor(capability)` and route to /pricing for the upgrade.
 */

import { Link } from 'react-router-dom';

export default function UpgradeNotice({ capability, requiredTierLabel, status }) {
  if (!requiredTierLabel) return null;

  const isPilotGrace = status === 'pilot-grace';
  const isPilotExpired = status === 'pilot-expired';
  const isPaidPastDue = status === 'paid-past-due';

  let message;
  if (isPilotGrace) {
    message =
      'Your pilot grace period is read-only. Convert to a paid plan to generate fresh insights.';
  } else if (isPilotExpired) {
    message =
      'Your pilot has ended. Convert to a paid plan to continue using YDJ.';
  } else if (isPaidPastDue) {
    message =
      'Your subscription is past due. Update your payment method to restore generation.';
  } else {
    message = `This view requires the ${requiredTierLabel} plan or higher to refresh.`;
  }

  return (
    <div className="upgrade-notice" data-capability={capability}>
      <span>{message}</span>
      <Link to="/pricing" className="upgrade-notice__cta">
        {isPaidPastDue ? 'Update billing' : 'View plans'}
      </Link>
    </div>
  );
}
