import { useEffect, useState } from 'react';
import { doc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase-config';
import { useAuth } from '../../contexts/AuthContext';
import { markFirstReflectionIntroShown } from '../../services/onboardingFlagsService';
import './FirstReflectionIntroOverlay.css';

/**
 * One-time intro overlay shown the first time a rider opens the regular
 * reflection form after First Light is generated. Frames the transition
 * from structured onboarding to weekly rhythm and explains the three
 * Step 0 weekly-context fields.
 *
 * Source of truth: YDJ_FirstLight_Implementation_Brief_v3.md §11.
 *
 * Trigger (all three must be true):
 *   1. firstLight/current exists
 *   2. No reflections exist where source !== "first-light-entry"
 *   3. firstReflectionIntroShownAt does not exist on onboardingFlags/state
 *
 * On dismiss: write firstReflectionIntroShownAt and let the parent form proceed.
 *
 * Props:
 *   onDismiss — () => void. Parent should hide the overlay and continue.
 */
export default function FirstReflectionIntroOverlay({ onDismiss }) {
  const { currentUser } = useAuth();
  const [shouldShow, setShouldShow] = useState(false);
  const [checking, setChecking] = useState(true);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    let firstLightUnsub = null;
    let flagsUnsub = null;
    let firstLightExists = false;
    let flagAlreadySet = false;

    async function evaluate() {
      // Condition 2: any reflection without source === "first-light-entry"?
      // Query for all this user's reflections, then check client-side so we
      // don't need a "source != x" composite index.
      try {
        const refsSnap = await getDocs(query(
          collection(db, 'reflections'),
          where('userId', '==', currentUser.uid),
          where('isDeleted', '==', false),
        ));
        const hasRegularReflection = refsSnap.docs.some(d => {
          const data = d.data();
          return data.source !== 'first-light-entry';
        });
        if (cancelled) return;
        if (hasRegularReflection) {
          setShouldShow(false);
          setChecking(false);
          return;
        }
      } catch (err) {
        console.warn('[FirstReflectionIntroOverlay] reflections query failed:', err.message);
        // Fail closed — don't surprise the user with the overlay if we
        // couldn't verify they haven't already done a regular reflection.
        setShouldShow(false);
        setChecking(false);
        return;
      }

      if (cancelled) return;
      const decision = firstLightExists && !flagAlreadySet;
      setShouldShow(decision);
      setChecking(false);
    }

    // Subscribe to firstLight/current
    firstLightUnsub = onSnapshot(
      doc(db, 'riders', currentUser.uid, 'firstLight', 'current'),
      (snap) => {
        firstLightExists = snap.exists();
        evaluate();
      },
      (err) => console.warn('[FirstReflectionIntroOverlay] firstLight:', err.message)
    );

    // Subscribe to onboardingFlags
    flagsUnsub = onSnapshot(
      doc(db, 'riders', currentUser.uid, 'onboardingFlags', 'state'),
      (snap) => {
        const data = snap.exists() ? snap.data() : null;
        flagAlreadySet = !!(data && data.firstReflectionIntroShownAt);
        evaluate();
      },
      (err) => console.warn('[FirstReflectionIntroOverlay] flags:', err.message)
    );

    return () => {
      cancelled = true;
      if (firstLightUnsub) firstLightUnsub();
      if (flagsUnsub) flagsUnsub();
    };
  }, [currentUser]);

  async function handleDismiss() {
    if (dismissing) return;
    setDismissing(true);
    try {
      await markFirstReflectionIntroShown(currentUser.uid);
    } catch (err) {
      console.warn('[FirstReflectionIntroOverlay] flag write failed:', err.message);
      // Best-effort: dismiss locally even if the write fails so we don't
      // block the rider from completing their reflection.
    }
    setShouldShow(false);
    setDismissing(false);
    if (onDismiss) onDismiss();
  }

  if (checking || !shouldShow) return null;

  return (
    <div className="fl-intro-backdrop" role="dialog" aria-modal="true" aria-labelledby="fl-intro-title">
      <div className="fl-intro-modal">
        <div className="fl-intro-mark">✦</div>
        <h2 id="fl-intro-title" className="fl-intro-title">
          Welcome to your weekly reflection rhythm
        </h2>
        <p className="fl-intro-body">
          Your First Light is done. From here, your reflections become weekly — one at a time,
          in the category that's calling you.
        </p>
        <p className="fl-intro-body">
          You'll notice three new questions before each reflection:
        </p>
        <ul className="fl-intro-list">
          <li>How is your confidence trending this week?</li>
          <li>What word captures the week so far?</li>
          <li>A score or takeaway from a recent ride</li>
        </ul>
        <p className="fl-intro-body">
          These take a minute to answer and only appear once per week — your second reflection
          in the same week picks them up automatically. They give your coaches the weekly frame
          they need to read what you write.
        </p>
        <button
          type="button"
          className="fl-intro-btn"
          onClick={handleDismiss}
          disabled={dismissing}
          autoFocus
        >
          {dismissing ? 'Continuing…' : 'Begin my first weekly reflection →'}
        </button>
      </div>
    </div>
  );
}
