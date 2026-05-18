import { useEffect, useMemo, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase-config';
import { useAuth } from '../../contexts/AuthContext';

function formatDateShort(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

/**
 * Low-emphasis freshness footer for data-driven AI outputs (M12).
 *
 * Shows the cache generation date plus a count of debriefs logged since.
 * Pure visibility hint — does not change cache or regen thresholds. Hides
 * itself when the cache is from today (no staleness to warn about).
 */
export default function FreshnessStrip({ generatedAt, onRefresh, refreshing = false, canRefresh = true }) {
  const { currentUser } = useAuth();
  const [newRideCount, setNewRideCount] = useState(null);

  const generated = useMemo(
    () => (generatedAt ? new Date(generatedAt) : null),
    [generatedAt]
  );

  useEffect(() => {
    if (!currentUser?.uid || !generated || Number.isNaN(generated.getTime())) return;
    let cancelled = false;
    (async () => {
      try {
        // Same equality-only pattern other services use to avoid composite
        // index requirements; filter for new debriefs in memory.
        const q = query(
          collection(db, 'debriefs'),
          where('userId', '==', currentUser.uid),
        );
        const snap = await getDocs(q);
        const since = generated.getTime();
        let count = 0;
        snap.forEach((d) => {
          const data = d.data();
          if (data?.isDeleted) return;
          const createdMillis = data?.createdAt?.toMillis?.()
            ?? (typeof data?.createdAt === 'string' ? Date.parse(data.createdAt) : null)
            ?? (data?.rideDate ? Date.parse(`${data.rideDate}T00:00:00`) : null);
          if (Number.isFinite(createdMillis) && createdMillis > since) count += 1;
        });
        if (!cancelled) setNewRideCount(count);
      } catch {
        // Strip is best-effort. A read failure just hides the count.
      }
    })();
    return () => { cancelled = true; };
  }, [currentUser?.uid, generated]);

  if (!generated || Number.isNaN(generated.getTime())) return null;
  if (isSameDay(generated, new Date())) return null;

  const dateLabel = formatDateShort(generated);
  const hasNewRides = newRideCount != null && newRideCount > 0;

  return (
    <div className="freshness-strip">
      {hasNewRides ? (
        <span className="freshness-strip__text">
          Based on data through {dateLabel} · {newRideCount} new {newRideCount === 1 ? 'ride' : 'rides'} since
        </span>
      ) : (
        <span className="freshness-strip__text">
          Up to date as of {dateLabel}
        </span>
      )}
      {hasNewRides && canRefresh && onRefresh && (
        <>
          <span className="freshness-strip__sep">·</span>
          <button
            type="button"
            className="freshness-strip__refresh"
            onClick={onRefresh}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing…' : 'Refresh now'}
          </button>
        </>
      )}
    </div>
  );
}
