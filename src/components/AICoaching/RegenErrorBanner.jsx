import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase-config';
import { useAuth } from '../../contexts/AuthContext';

const SESSION_SUPPRESS_PREFIX = 'ydj.regenError.suppress.';
const STALE_HOURS = 24;

/**
 * Rider-visible banner shown when the most recent regen attempt for this
 * panel's output threw on the backend (B19). Reads
 * users/{uid}/lastRegenError/{output}; only renders when a fresh (< 24h)
 * record exists and the rider hasn't dismissed it in this session.
 */
export default function RegenErrorBanner({ output, onRetry, retrying = false }) {
  const { currentUser } = useAuth();
  const [errorDoc, setErrorDoc] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid || !output) return;
    const suppressKey = `${SESSION_SUPPRESS_PREFIX}${output}`;
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(suppressKey)) {
      setDismissed(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', currentUser.uid, 'lastRegenError', output));
        if (cancelled || !snap.exists()) return;
        const data = snap.data();
        if (!data?.at) return;
        const ageHours = (Date.now() - new Date(data.at).getTime()) / 36e5;
        if (ageHours >= 0 && ageHours < STALE_HOURS) {
          setErrorDoc(data);
        }
      } catch {
        // Banner is best-effort — never block the panel on a read error.
      }
    })();
    return () => { cancelled = true; };
  }, [currentUser?.uid, output]);

  if (dismissed || !errorDoc) return null;

  const handleDismiss = () => {
    try {
      sessionStorage.setItem(`${SESSION_SUPPRESS_PREFIX}${output}`, '1');
    } catch {
      // sessionStorage unavailable — dismissal still works for this render.
    }
    setDismissed(true);
  };

  const handleRetry = () => {
    if (!onRetry || retrying) return;
    setDismissed(true);
    onRetry();
  };

  const message = errorDoc.message || 'a temporary error occurred';

  return (
    <div className="regen-error-banner" role="status">
      <div className="regen-error-banner__text">
        Your last refresh attempt didn't complete ({message}).
      </div>
      <div className="regen-error-banner__actions">
        {onRetry && (
          <button
            type="button"
            className="regen-error-banner__retry"
            onClick={handleRetry}
            disabled={retrying}
          >
            {retrying ? 'Trying…' : 'Try again'}
          </button>
        )}
        <button
          type="button"
          className="regen-error-banner__dismiss"
          onClick={handleDismiss}
          aria-label="Dismiss"
        >
          {'×'}
        </button>
      </div>
    </div>
  );
}
