/**
 * useVisualizationData
 *
 * Two-phase data loading for Data Visualizations:
 * Phase 1 (fast): Fetch debriefs + reflections from Firestore, compute client-side charts
 * Phase 2 (slow): Call getDataVisualizations() Cloud Function for AI-derived data
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getAllDebriefs, getAllReflections } from '../services';
import { getDataVisualizations } from '../services/aiService';
import {
  computeRideQualityTrend,
  computeMentalStateDistribution,
  computeQualityByMentalState,
  computeTrainingFocusDistribution,
  computeConfidenceTrajectory,
  computeCelebrationChallengeRatio,
  computeReflectionCategoryDistribution,
} from '../utils/chartDataTransforms';

export default function useVisualizationData() {
  const { currentUser } = useAuth();

  // Phase 1: client-side chart data
  const [clientData, setClientData] = useState(null);
  const [clientLoading, setClientLoading] = useState(true);

  // Phase 2: AI-derived data
  const [aiData, setAiData] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [aiStale, setAiStale] = useState(false);
  const [insufficientData, setInsufficientData] = useState(null);

  // Phase 1: Fetch raw data and compute charts client-side
  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;

    async function fetchClientData() {
      setClientLoading(true);
      try {
        const [debRes, refRes] = await Promise.all([
          getAllDebriefs(currentUser.uid),
          getAllReflections(currentUser.uid),
        ]);

        if (cancelled) return;

        const debriefs = debRes.success ? debRes.data : [];
        const reflections = refRes.success ? refRes.data : [];

        // Need minimum data for meaningful charts
        if (debriefs.length < 3) {
          setInsufficientData({
            message: 'We need at least 3 post-ride debriefs to generate your visualizations.',
            debriefCount: debriefs.length,
          });
          setClientLoading(false);
          return;
        }

        setClientData({
          rideQualityTrend: computeRideQualityTrend(debriefs),
          mentalStateDistribution: computeMentalStateDistribution(debriefs),
          qualityByMentalState: computeQualityByMentalState(debriefs),
          trainingFocusDistribution: computeTrainingFocusDistribution(debriefs),
          confidenceTrajectory: computeConfidenceTrajectory(debriefs),
          celebrationChallengeRatio: computeCelebrationChallengeRatio(debriefs),
          reflectionCategoryDistribution: computeReflectionCategoryDistribution(reflections),
          totalDebriefs: debriefs.length,
          totalReflections: reflections.length,
        });
      } catch (err) {
        console.error('Visualization client data error:', err);
      } finally {
        if (!cancelled) setClientLoading(false);
      }
    }

    fetchClientData();
    return () => { cancelled = true; };
  }, [currentUser]);

  // Phase 2: Fetch AI-derived data
  const fetchAiData = useCallback(async ({ forceRefresh = false, staleOk = false } = {}) => {
    if (!staleOk) {
      setAiLoading(true);
      setAiError(null);
    }

    try {
      const result = await getDataVisualizations({ forceRefresh, staleOk });

      if (!result.success) {
        if (result.error === 'insufficient_data') {
          setInsufficientData(result);
        } else if (!staleOk) {
          setAiError('Failed to generate AI visualizations.');
        }
        return;
      }

      setAiData(result);
      setAiStale(!!result.stale);

      // If stale data returned from fast path, trigger background refresh
      if (result.stale && staleOk) {
        fetchAiData({ forceRefresh: false });
      }
    } catch (err) {
      // Silently fall through to full load on staleOk errors
      if (staleOk) {
        fetchAiData({ forceRefresh: false });
        return;
      }
      console.error('Data Visualizations AI error:', err);
      const details = err?.details || err?.customData || {};
      setAiError({
        message: err?.message || 'An error occurred generating AI insights.',
        category: details.category || 'unknown',
        retryable: details.retryable !== false,
      });
    } finally {
      if (!staleOk) {
        setAiLoading(false);
      }
    }
  }, []);

  // Auto-fetch AI data once client data is ready (fast path first)
  useEffect(() => {
    if (clientData && !aiData && !aiLoading) {
      fetchAiData({ staleOk: true });
    }
  }, [clientData, aiData, aiLoading, fetchAiData]);

  return {
    clientData,
    clientLoading,
    aiData,
    aiLoading,
    aiError,
    aiStale,
    insufficientData,
    refreshAiData: fetchAiData,
  };
}
