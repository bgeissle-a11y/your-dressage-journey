import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase-config';
import { getReadinessSnapshot } from '../services/aiService';
import YDJLoading from './YDJLoading';

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
  // One-shot guard: only auto-fire generation once per (planId) mount.
  // Without this, a backend that returns success without writing the doc
  // (or any other "soft" failure that leaves snapshot null) would retrigger
  // the 5-second auto-fire forever.
  const [autoFired, setAutoFired] = useState(false);

  // Realtime listener — card hydrates when snapshot doc is written.
  // Only adopt the doc into state if it has a non-empty narrative; a doc
  // missing that field means a partial / corrupt write (or an old schema)
  // and we'd rather stay in loading state than crash on .split() below.
  useEffect(() => {
    if (!planId || !userId) return;
    const ref = doc(db, `showPreparations/${planId}/readinessSnapshot`, 'data');
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (typeof data.narrative === 'string' && data.narrative.trim().length > 0) {
          setSnapshot(data);
          setError(null);
        } else {
          console.warn('[YDJ] Snapshot doc exists but has no narrative — treating as missing', { planId });
        }
      }
    }, (err) => {
      console.error('[YDJ] Snapshot listener error:', err);
    });
    return unsub;
  }, [planId, userId]);

  // Auto-trigger generation for plans without a snapshot. Fires AT MOST
  // once per mount — see autoFired guard. After that the rider can use the
  // Retry button on the error state if needed.
  useEffect(() => {
    if (snapshot !== null || retrying || autoFired) return;
    const timer = setTimeout(() => {
      setAutoFired(true);
      triggerGeneration();
    }, 5000);
    return () => clearTimeout(timer);
  }, [snapshot, planId, retrying, autoFired]);

  // Reset the one-shot guard if the parent navigates to a different plan.
  useEffect(() => {
    setAutoFired(false);
    setSnapshot(null);
    setError(null);
  }, [planId]);

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
        <YDJLoading size="sm" message="Reading your ride data" />
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

      {/* Narrative — defensive split, in case a malformed doc slipped past
          the listener guard (older deploy, manual edit, etc.). */}
      <div className="snapshot-narrative">
        {(snapshot.narrative || '').split('\n\n').filter(Boolean).map((para, i) => (
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
        <YDJLoading size="sm" message="Updating your readiness read" />
      )}

    </div>
  );
}
