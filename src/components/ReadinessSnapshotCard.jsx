import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase-config';
import { getReadinessSnapshot } from '../services/aiService';

/**
 * ReadinessSnapshotCard
 *
 * Displays a 300–400 word prose narrative from The Technical Coach
 * assessing the rider's readiness for their selected tests.
 *
 * Generated once at plan creation. Refreshable once, gated on 3+ new debriefs.
 */
export default function ReadinessSnapshotCard({ planId, userId, currentDebriefsCount }) {
  const [snapshot, setSnapshot]   = useState(null);   // null = loading
  const [loading, setLoading]     = useState(false);  // refresh in-flight
  const [error, setError]         = useState(null);
  const [showConfirm, setConfirm] = useState(false);
  const [retrying, setRetrying]   = useState(false);

  // Realtime listener — card hydrates when snapshot doc is written
  useEffect(() => {
    if (!planId || !userId) return;
    const ref = doc(db, `users/${userId}/showPreparations/${planId}/readinessSnapshot`, 'data');
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setSnapshot(snap.data());
        setError(null);
      }
    }, (err) => {
      console.error('[YDJ] Snapshot listener error:', err);
    });
    return unsub;
  }, [planId, userId]);

  // Auto-trigger generation for plans without a snapshot (2-minute delay for backward compat)
  useEffect(() => {
    if (snapshot !== null || retrying) return;
    const timer = setTimeout(() => {
      triggerGeneration();
    }, 5000); // 5s initial delay — shorter than the 2-min spec since most plans are new
    return () => clearTimeout(timer);
  }, [snapshot, planId, retrying]);

  async function triggerGeneration() {
    if (retrying) return;
    setRetrying(true);
    try {
      await getReadinessSnapshot({ planId });
      // onSnapshot listener will pick up the result
    } catch (err) {
      console.error('[YDJ] Readiness snapshot generation failed:', err);
      setError('generation_failed');
    } finally {
      setRetrying(false);
    }
  }

  // Refresh gate: canRefresh only when < 1 prior refresh AND 3+ new debriefs
  const canRefresh = snapshot
    && (snapshot.refreshCount || 0) < 1
    && currentDebriefsCount >= (snapshot.debriefsAtGeneration || 0) + 3;

  async function handleRefresh() {
    setConfirm(false);
    setLoading(true);
    setError(null);
    try {
      await getReadinessSnapshot({ planId, refresh: true });
      // onSnapshot listener will hydrate the updated narrative
    } catch (err) {
      console.error('[YDJ] Readiness snapshot refresh failed:', err);
      setError('refresh_failed');
    } finally {
      setLoading(false);
    }
  }

  // ── Error state ──────────────────────────────────────────────────────
  if (error === 'generation_failed' && !snapshot) {
    return (
      <div className="snapshot-card snapshot-card--error">
        <p className="snapshot-error-text">
          Couldn't generate your readiness read. Check your connection.
        </p>
        <button className="snapshot-retry-btn" onClick={triggerGeneration}>
          Retry
        </button>
      </div>
    );
  }

  // ── Loading state (waiting for initial generation) ──────────────────
  if (!snapshot) {
    return (
      <div className="snapshot-card snapshot-card--loading">
        <div className="snapshot-shimmer snapshot-shimmer--lg" />
        <div className="snapshot-shimmer" />
        <div className="snapshot-shimmer snapshot-shimmer--sm" />
        <p className="snapshot-loading-text">Reading your training data…</p>
      </div>
    );
  }

  // ── Loaded state ─────────────────────────────────────────────────────
  const generatedDate = snapshot.generatedAt?.toDate
    ? snapshot.generatedAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '';

  return (
    <div className="snapshot-card">

      <div className="snapshot-header">
        <div className="snapshot-eyebrow">Readiness Snapshot</div>
        <div className="snapshot-byline">
          {(snapshot.refreshCount || 0) > 0 ? 'Refreshed' : 'Updated'} {generatedDate}
          {(snapshot.refreshCount || 0) > 0 && ' · Final'}
        </div>
      </div>

      {/* Confirmation dialog — inline, not a modal */}
      {showConfirm && (
        <div className="snapshot-confirm">
          <p>This will update your readiness read based on your recent rides. Your weekly plan stays the same.</p>
          <div className="snapshot-confirm-actions">
            <button className="snapshot-confirm-btn snapshot-confirm-btn--go" onClick={handleRefresh}>
              Yes, refresh
            </button>
            <button className="snapshot-confirm-btn snapshot-confirm-btn--cancel" onClick={() => setConfirm(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Refresh error inline message */}
      {error === 'refresh_failed' && (
        <div className="snapshot-confirm">
          <p>Refresh failed. Your previous read is still saved.</p>
        </div>
      )}

      {/* Narrative */}
      <div className="snapshot-narrative">
        {snapshot.narrative.split('\n\n').map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>

      {/* Refresh button — only visible when canRefresh */}
      {canRefresh && !showConfirm && !loading && (
        <button className="snapshot-refresh-btn" onClick={() => setConfirm(true)}>
          ↻ Refresh Readiness Read
        </button>
      )}

      {loading && (
        <p className="snapshot-refreshing-text">Refreshing…</p>
      )}

    </div>
  );
}
