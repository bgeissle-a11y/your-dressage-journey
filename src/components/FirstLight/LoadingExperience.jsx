import { useEffect, useState } from 'react';
import YDJLoading from '../YDJLoading';
import './LoadingExperience.css';

/**
 * Phased loading experience for First Light generation and regeneration.
 * Source of truth: YDJ_FirstLight_Implementation_Brief_v3.md §6.1 State E.
 *
 * Phase 0–2.5s : "Reading your journey…" (or "Re-reading…")
 * Phase 2.5s–end : "Hearing from your coaches…" (or "…again")
 * Within each phase, rotating sub-messages cycle every 1.8s.
 *
 * Props:
 *   mode — "generate" (default) or "regenerate"
 */

const PHASES = {
  generate: [
    {
      title: 'Reading your journey…',
      subtitle: 'Your six reflections, your profile, and your horse are being woven together.',
      rotating: [
        "Listening to what you've shared…",
        'Choosing the voice that will serve you…',
      ],
    },
    {
      title: 'Hearing from your coaches…',
      subtitle: 'They have been waiting for this moment.',
      rotating: [
        'Drafting your First Light…',
        'Almost there…',
      ],
    },
  ],
  regenerate: [
    {
      title: 'Re-reading your journey…',
      subtitle: "Your coaches are picking up everything you've added since.",
      rotating: [
        "Listening for what's new…",
        'Weighing the new alongside the old…',
      ],
    },
    {
      title: 'Hearing from your coaches again…',
      subtitle: 'A sharper read is coming.',
      rotating: [
        'Drafting your refreshed First Light…',
        'Almost there…',
      ],
    },
  ],
};

const PHASE_TRANSITION_MS = 2500;
const ROTATING_INTERVAL_MS = 1800;

export default function LoadingExperience({ mode = 'generate' }) {
  const phases = PHASES[mode] || PHASES.generate;
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [rotatingIndex, setRotatingIndex] = useState(0);

  // Advance from phase 0 → phase 1 after PHASE_TRANSITION_MS
  useEffect(() => {
    const t = setTimeout(() => setPhaseIndex(1), PHASE_TRANSITION_MS);
    return () => clearTimeout(t);
  }, []);

  // Cycle the rotating sub-message within the current phase
  useEffect(() => {
    setRotatingIndex(0);
    const phase = phases[phaseIndex];
    if (!phase || phase.rotating.length <= 1) return;
    const interval = setInterval(() => {
      setRotatingIndex(prev => (prev + 1) % phase.rotating.length);
    }, ROTATING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [phaseIndex, phases]);

  const phase = phases[phaseIndex];

  return (
    <div className="fl-loading-screen" id="firstLightLoadingScreen">
      <YDJLoading size="md" message={phase.rotating[rotatingIndex]} />
      <h2 className="loading-title">{phase.title}</h2>
      <p className="loading-sub">{phase.subtitle}</p>
    </div>
  );
}
