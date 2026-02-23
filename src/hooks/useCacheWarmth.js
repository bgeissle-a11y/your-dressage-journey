// Imports preserved for when login warming is re-enabled post-pilot.
// import { useEffect, useRef } from 'react';
// import { doc, getDoc } from 'firebase/firestore';
// import { db } from '../firebase-config';
// import { useAuth } from '../contexts/AuthContext';
// import {
//   checkCacheStaleness,
//   getMultiVoiceCoaching,
//   getDataVisualizations,
//   getJourneyMap,
//   getGrandPrixThinking,
// } from '../services/aiService';

/**
 * Login-time cache warming hook.
 *
 * DISABLED during pilot to control API costs. Was regenerating all stale outputs
 * on every login (~280k tokens per session, ~$2.50/week for 10 users).
 *
 * Users can still manually refresh outputs from the Insights page.
 * Re-enable post-pilot when budget supports it.
 *
 * Original behavior: checked cache staleness on login, then sequentially
 * regenerated stale outputs (coaching → data viz → journey map → GP mental).
 */
export default function useCacheWarmth() {
  // No-op during pilot — login warming disabled to reduce API costs
}
