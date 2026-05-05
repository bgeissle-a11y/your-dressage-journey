import { useEffect, useState, useRef } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase-config';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Real-time journey progress hook for the QuickStart Map.
 *
 * Subscribes to 13 onSnapshot listeners across all relevant Firestore
 * collections to auto-detect step completion as forms are submitted.
 *
 * All collections are top-level with a `userId` field and soft-delete
 * via `isDeleted` flag, matching the createBaseService pattern.
 *
 * @returns {{ progress: Object, loading: boolean }}
 */
export default function useJourneyProgress() {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid;
  const loadingRef = useRef(true);

  const [progress, setProgress] = useState({
    riderProfileComplete: false,
    horseProfileComplete: false,
    reflectionsByCategory: {
      personal: false,
      validation: false,
      aha: false,
      obstacle: false,
      connection: false,
      feel: false,
    },
    reflectionCount: 0,
    debriefCount: 0,
    riderAssessmentComplete: false,
    physicalAssessmentComplete: false,
    techPhilAssessmentComplete: false,
    hasObservations: false,
    hasHealthLog: false,
    hasEventLog: false,
    hasLessonNotes: false,
    hasToolkitEntries: false,
    hasRiderHealthLog: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    const unsubs = [];

    // Helper: query a top-level collection scoped to this user, excluding soft-deleted
    const userQuery = (collectionName) =>
      query(
        collection(db, collectionName),
        where('userId', '==', uid),
        where('isDeleted', '==', false)
      );

    // Mark loading done after first snapshot arrives
    const onFirst = () => {
      if (loadingRef.current) {
        loadingRef.current = false;
        setLoading(false);
      }
    };

    // 1. Rider Profile
    unsubs.push(
      onSnapshot(userQuery('riderProfiles'), (snap) => {
        setProgress((prev) => ({ ...prev, riderProfileComplete: snap.size > 0 }));
        onFirst();
      }, (err) => console.warn('[useJourneyProgress] riderProfiles:', err.message))
    );

    // 2. Horse Profiles
    unsubs.push(
      onSnapshot(userQuery('horseProfiles'), (snap) => {
        setProgress((prev) => ({ ...prev, horseProfileComplete: snap.size > 0 }));
      }, (err) => console.warn('[useJourneyProgress] horseProfiles:', err.message))
    );

    // 3. Reflections by category (6 listeners)
    // Actual stored category values: 'personal', 'validation', 'aha', 'obstacle', 'connection', 'feel'
    const CATEGORIES = ['personal', 'validation', 'aha', 'obstacle', 'connection', 'feel'];
    const categoryCounts = Object.fromEntries(CATEGORIES.map((c) => [c, 0]));
    CATEGORIES.forEach((cat) => {
      const q = query(
        collection(db, 'reflections'),
        where('userId', '==', uid),
        where('isDeleted', '==', false),
        where('category', '==', cat)
      );
      unsubs.push(
        onSnapshot(q, (snap) => {
          categoryCounts[cat] = snap.size;
          const total = Object.values(categoryCounts).reduce((a, b) => a + b, 0);
          setProgress((prev) => ({
            ...prev,
            reflectionsByCategory: {
              ...prev.reflectionsByCategory,
              [cat]: snap.size > 0,
            },
            reflectionCount: total,
          }));
        }, (err) => console.warn(`[useJourneyProgress] reflections/${cat}:`, err.message))
      );
    });

    // 4. Debriefs — count all
    unsubs.push(
      onSnapshot(userQuery('debriefs'), (snap) => {
        setProgress((prev) => ({ ...prev, debriefCount: snap.size }));
      }, (err) => console.warn('[useJourneyProgress] debriefs:', err.message))
    );

    // 5a. Rider Assessments (mental)
    unsubs.push(
      onSnapshot(userQuery('riderAssessments'), (snap) => {
        setProgress((prev) => ({ ...prev, riderAssessmentComplete: snap.size > 0 }));
      }, (err) => console.warn('[useJourneyProgress] riderAssessments:', err.message))
    );

    // 5b. Physical Assessments
    unsubs.push(
      onSnapshot(userQuery('physicalAssessments'), (snap) => {
        setProgress((prev) => ({ ...prev, physicalAssessmentComplete: snap.size > 0 }));
      }, (err) => console.warn('[useJourneyProgress] physicalAssessments:', err.message))
    );

    // 5c. Technical & Philosophical Assessments
    unsubs.push(
      onSnapshot(userQuery('technicalPhilosophicalAssessments'), (snap) => {
        setProgress((prev) => ({ ...prev, techPhilAssessmentComplete: snap.size > 0 }));
      }, (err) => console.warn('[useJourneyProgress] techPhilAssessments:', err.message))
    );

    // 6. Observations
    unsubs.push(
      onSnapshot(userQuery('observations'), (snap) => {
        setProgress((prev) => ({ ...prev, hasObservations: snap.size > 0 }));
      }, (err) => console.warn('[useJourneyProgress] observations:', err.message))
    );

    // 7. Horse Health Entries
    unsubs.push(
      onSnapshot(userQuery('horseHealthEntries'), (snap) => {
        setProgress((prev) => ({ ...prev, hasHealthLog: snap.size > 0 }));
      }, (err) => console.warn('[useJourneyProgress] horseHealthEntries:', err.message))
    );

    // 8. Journey Events
    unsubs.push(
      onSnapshot(userQuery('journeyEvents'), (snap) => {
        setProgress((prev) => ({ ...prev, hasEventLog: snap.size > 0 }));
      }, (err) => console.warn('[useJourneyProgress] journeyEvents:', err.message))
    );

    // 9. Lesson Notes
    unsubs.push(
      onSnapshot(userQuery('lessonNotes'), (snap) => {
        setProgress((prev) => ({ ...prev, hasLessonNotes: snap.size > 0 }));
      }, (err) => console.warn('[useJourneyProgress] lessonNotes:', err.message))
    );

    // 10. Rider's Toolkit
    unsubs.push(
      onSnapshot(userQuery('riderToolkitEntries'), (snap) => {
        setProgress((prev) => ({ ...prev, hasToolkitEntries: snap.size > 0 }));
      }, (err) => console.warn('[useJourneyProgress] riderToolkitEntries:', err.message))
    );

    // 11. Rider Health Log
    unsubs.push(
      onSnapshot(userQuery('riderHealthEntries'), (snap) => {
        setProgress((prev) => ({ ...prev, hasRiderHealthLog: snap.size > 0 }));
      }, (err) => console.warn('[useJourneyProgress] riderHealthEntries:', err.message))
    );

    return () => unsubs.forEach((u) => u());
  }, [uid]);

  return { progress, loading };
}
