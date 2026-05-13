/**
 * useEntitlements — capability check helpers wrapped around useSubscription.
 *
 * Centralizes "can this user do X?" checks across panels and Settings so
 * UI components don't hand-roll tier comparisons. The backend Cloud Functions
 * mirror this via `functions/lib/loadSubscription.js` + `entitlements.js`,
 * so a denied UI button maps 1:1 to a denied API call.
 *
 * Usage:
 *   const { can, requiredTier, status, loading } = useEntitlements();
 *   if (can('generateGrandPrixThinking')) ... else show upgrade CTA
 *
 * Per the implementation brief: disable, don't hide, the buttons that the
 * user lacks entitlement for, and surface the lowest-required tier as the
 * upgrade target.
 */

import { useMemo } from 'react';
import { useSubscription } from './useSubscription';
import {
  canAccess,
  requiredTierFor,
  getTierStatus,
  STATUS,
} from '../constants/entitlements';

const TIER_LABELS = {
  working: 'Working',
  medium: 'Medium',
  extended: 'Extended',
};

export function useEntitlements() {
  const sub = useSubscription();

  return useMemo(() => {
    const status = getTierStatus(sub);

    return {
      sub,
      loading: !!sub.loading,
      status,
      isPilot:
        status === STATUS.PILOT ||
        status === STATUS.PILOT_GRACE,
      tier: sub.tier,
      can: (capability) => canAccess(sub, capability),
      requiredTier: (capability) => requiredTierFor(capability),
      requiredTierLabel: (capability) => {
        const t = requiredTierFor(capability);
        return t ? TIER_LABELS[t] || t : null;
      },
    };
  }, [sub]);
}
