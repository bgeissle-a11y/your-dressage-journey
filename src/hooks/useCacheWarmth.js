import { useEffect, useRef } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase-config';
import { useAuth } from '../contexts/AuthContext';
import {
  checkCacheStaleness,
  getMultiVoiceCoaching,
  getDataVisualizations,
  getJourneyMap,
  getGrandPrixThinking,
} from '../services/aiService';

/**
 * Login-time cache warming hook.
 *
 * Runs once when an authenticated user is detected. Checks cache staleness
 * (zero Claude API calls) and fires background generation for stale outputs.
 * Entirely best-effort — failures are silent and don't affect the UI.
 *
 * Skips warming if a Firestore trigger-based regeneration is already in progress,
 * to avoid duplicate work and wasted API calls.
 *
 * Priority: coaching → data viz → journey map → GP mental (skip trajectory)
 */
export default function useCacheWarmth() {
  const { currentUser } = useAuth();
  const hasWarmed = useRef(false);

  useEffect(() => {
    if (!currentUser || hasWarmed.current) return;
    hasWarmed.current = true;

    (async () => {
      try {
        // Check if a trigger-based regeneration is already in progress
        try {
          const statusDoc = await getDoc(doc(db, 'generationStatus', currentUser.uid));
          if (statusDoc.exists() && statusDoc.data().status === 'in_progress') {
            console.log('[cacheWarmth] Trigger-based regeneration already in progress — skipping login warming');
            return;
          }
        } catch {
          // If we can't read the status, proceed with warming anyway
        }

        const report = await checkCacheStaleness();
        if (!report.success) return;

        // Only warm if user has enough data (dataTier >= 1)
        if (report.dataTier < 1) return;

        // Fire-and-forget background generation for stale outputs (priority order)
        const warmingQueue = [];

        if (report.coaching?.stale) {
          warmingQueue.push(() => getMultiVoiceCoaching());
        }
        if (report.dataVisualizations?.stale) {
          warmingQueue.push(() => getDataVisualizations());
        }
        if (report.journeyMap?.stale) {
          warmingQueue.push(() => getJourneyMap());
        }
        if (report.grandPrixThinking?.stale) {
          warmingQueue.push(() => getGrandPrixThinking({ layer: 'mental' }));
        }

        if (warmingQueue.length === 0) return;

        console.log(`[cacheWarmth] Warming ${warmingQueue.length} stale output(s) in background`);

        // Run sequentially to avoid rate limiting
        for (const warm of warmingQueue) {
          try {
            await warm();
          } catch {
            // Silent — best-effort only
          }
        }

        console.log('[cacheWarmth] Background warming complete');
      } catch {
        // Silent — if staleness check itself fails, no harm done
      }
    })();
  }, [currentUser]);
}
