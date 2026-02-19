import { useState, useEffect } from 'react';

/**
 * Shows elapsed time since a loading operation started.
 * Provides encouragement messages for longer waits.
 *
 * @param {object} props
 * @param {number} [props.startedAt] - Unix timestamp (Date.now()) when loading started
 * @param {number} [props.hideUnder] - Don't show until this many seconds (default: 5)
 */
export default function ElapsedTimer({ startedAt, hideUnder = 5 }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt) return;

    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startedAt]);

  if (!startedAt || elapsed < hideUnder) return null;

  let encouragement = null;
  if (elapsed >= 120) {
    encouragement = 'Almost there — finalizing your results.';
  } else if (elapsed >= 60) {
    encouragement = 'Still working — complex analysis takes longer with more data.';
  }

  return (
    <span className="elapsed-timer">
      <span className="elapsed-timer__time">{elapsed}s</span>
      {encouragement && (
        <span className="elapsed-timer__message">{encouragement}</span>
      )}
    </span>
  );
}
