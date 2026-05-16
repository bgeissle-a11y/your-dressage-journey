/**
 * useSubscription Hook
 *
 * Real-time subscription state from Firestore. Includes IC, pilot, and trial
 * flags so consumers can render the correct UI variant.
 */

import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { onSubscriptionChange } from '../services/subscriptionService';

const DEFAULT_STATE = {
  tier: 'none',
  status: 'none',
  interval: null,
  periodEnd: null,
  tokensUsed: 0,
  tokenBudget: 0,
  isInitialCenterline: false,
  icTier: null,
  icStatus: null,
  icEnrollmentDate: null,
  icCohortNumber: null,
  isPilot: false,
  pilotDiscountActive: false,
  trialStarted: false,
  trialEndDate: null,
  trialConverted: false,
  isFounder: false,
  loading: true,
};

export function useSubscription() {
  const { currentUser } = useAuth();
  const [sub, setSub] = useState(DEFAULT_STATE);

  useEffect(() => {
    if (!currentUser?.uid) {
      setSub({ ...DEFAULT_STATE, loading: false });
      return;
    }

    const unsubscribe = onSubscriptionChange(currentUser.uid, (data) => {
      setSub({ ...data, loading: false });
    });

    return unsubscribe;
  }, [currentUser?.uid]);

  return sub;
}
