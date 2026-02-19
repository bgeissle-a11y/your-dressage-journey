import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase-config';
import { useAuth } from '../contexts/AuthContext';

/**
 * Real-time generation status hook.
 *
 * Listens to the `generationStatus/{uid}` Firestore document via onSnapshot.
 * Returns the current generation state so panels can show progress banners
 * and auto-refresh when background generation completes.
 *
 * @returns {{
 *   status: 'idle'|'in_progress'|'complete'|null,
 *   currentOutput: string|null,
 *   outputsCompleted: string[],
 *   outputsRemaining: string[],
 *   completedAt: string|null,
 *   triggeredBy: string|null,
 *   isGenerating: boolean,
 *   justCompleted: boolean
 * }}
 */
export default function useGenerationStatus() {
  const { currentUser } = useAuth();
  const [genStatus, setGenStatus] = useState({
    status: null,
    currentOutput: null,
    outputsCompleted: [],
    outputsRemaining: [],
    completedAt: null,
    triggeredBy: null,
  });
  const [justCompleted, setJustCompleted] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    const docRef = doc(db, 'generationStatus', currentUser.uid);

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setGenStatus({
            status: null,
            currentOutput: null,
            outputsCompleted: [],
            outputsRemaining: [],
            completedAt: null,
            triggeredBy: null,
          });
          return;
        }

        const data = snapshot.data();
        const prevStatus = genStatus.status;

        setGenStatus({
          status: data.status || null,
          currentOutput: data.currentOutput || null,
          outputsCompleted: data.outputsCompleted || [],
          outputsRemaining: data.outputsRemaining || [],
          completedAt: data.completedAt || null,
          triggeredBy: data.triggeredBy || null,
        });

        // Detect transition from in_progress → complete
        if (prevStatus === 'in_progress' && data.status === 'complete') {
          setJustCompleted(true);
          // Auto-clear the "just completed" flag after 5 seconds
          setTimeout(() => setJustCompleted(false), 5000);
        }
      },
      (error) => {
        // Silent — generation status is a nice-to-have, not critical
        console.warn('[useGenerationStatus] Listener error:', error.message);
      }
    );

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  return {
    ...genStatus,
    isGenerating: genStatus.status === 'in_progress',
    justCompleted,
  };
}
