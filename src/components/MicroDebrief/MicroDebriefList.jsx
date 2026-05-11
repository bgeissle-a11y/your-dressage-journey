import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  getAllMicroDebriefs,
  deleteMicroDebrief,
  MENTAL_STATES,
} from '../../services';
import '../HabitLoop/HabitLoop.css';
import '../Forms/Forms.css';

/**
 * MicroDebriefList — history view for the lightweight ride entries.
 *
 * Each card shows date, horse, quality (1-10), mental state, optional
 * moment text, and the Empathetic Coach response. The list reads from
 * the separate `microDebriefs` collection; full debriefs continue to
 * live in /debriefs.
 */

const MENTAL_STATE_LABELS = MENTAL_STATES.reduce((acc, s) => {
  acc[s.value] = s.label;
  return acc;
}, {});

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function formatTimeAgo(iso) {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

export default function MicroDebriefList() {
  const { currentUser } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  async function loadEntries() {
    if (!currentUser) return;
    setLoading(true);
    const result = await getAllMicroDebriefs(currentUser.uid);
    if (result.success) setEntries(result.data || []);
    setLoading(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await deleteMicroDebrief(deleteTarget);
    if (result.success) {
      setEntries((prev) => prev.filter((e) => e.id !== deleteTarget));
    }
    setDeleteTarget(null);
  }

  const horseNames = [...new Set(entries.map((e) => e.horseName).filter(Boolean))];

  const filtered = entries.filter((e) => {
    if (filter === 'all') return true;
    return e.horseName === filter;
  });

  if (loading) {
    return (
      <div className="habit-loop-page">
        <div className="habit-loop-container">
          <div className="habit-loop-header">
            <h1>Quick Captures</h1>
            <div className="subtitle">Loading…</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="habit-loop-page">
      <div className="habit-loop-container" style={{ maxWidth: '760px' }}>
        <header className="habit-loop-header">
          <h1>Quick Captures</h1>
          <div className="subtitle">
            Your lightweight ride entries. For the full debrief library, see
            {' '}<Link to="/debriefs" style={{ color: '#8B7355' }}>All Debriefs</Link>.
          </div>
        </header>

        {/* Header actions */}
        <div
          className="habit-loop-frame"
          style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{ maxWidth: '220px' }}
            >
              <option value="all">All horses ({entries.length})</option>
              {horseNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <Link
            to="/forms/micro-debrief"
            className="hl-submit-btn"
            style={{ textDecoration: 'none', padding: '12px 24px', fontSize: '0.95em', display: 'inline-block' }}
          >
            + New Quick Capture
          </Link>
        </div>

        {filtered.length === 0 && (
          <div
            className="habit-loop-frame"
            style={{ textAlign: 'center', padding: '40px 24px', color: '#7A7A7A' }}
          >
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.2em', color: '#8B7355', marginBottom: '8px' }}>
              No quick captures yet
            </div>
            <div style={{ fontSize: '0.95em', lineHeight: 1.55 }}>
              Quick Capture is a 60-second alternative to the full debrief —
              for moments at the trailer, between work calls, or when you
              want to capture the headline before it fades.
            </div>
          </div>
        )}

        {filtered.map((entry) => {
          const mentalLabel = MENTAL_STATE_LABELS[entry.mentalState] || entry.mentalState || '';
          return (
            <div key={entry.id} className="habit-loop-frame" style={{ position: 'relative' }}>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '12px',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #E0D5C7',
                  paddingBottom: '12px',
                  marginBottom: '14px',
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: '1.2em',
                      color: '#8B7355',
                      fontWeight: 600,
                    }}
                  >
                    {entry.horseName || 'Unspecified horse'}
                    {' · '}
                    <span style={{ fontWeight: 400, color: '#3A3A3A' }}>{formatDate(entry.date)}</span>
                  </div>
                  <div style={{ fontSize: '0.85em', color: '#7A7A7A', marginTop: '2px' }}>
                    Quick Capture · {formatTimeAgo(entry.submittedAt)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(entry.id)}
                  title="Delete this entry"
                  aria-label="Delete entry"
                  style={{
                    background: 'transparent',
                    border: '1px solid #E0D5C7',
                    color: '#7A7A7A',
                    cursor: 'pointer',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '0.85em',
                  }}
                >
                  Delete
                </button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '14px' }}>
                <div>
                  <div style={{ fontSize: '0.78em', color: '#7A7A7A', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Quality
                  </div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4em', fontWeight: 600, color: '#C67B5C' }}>
                    {entry.quality ?? '—'}<span style={{ fontSize: '0.6em', color: '#7A7A7A' }}>/10</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.78em', color: '#7A7A7A', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    In the saddle
                  </div>
                  <div style={{ fontSize: '1em', color: '#3A3A3A', marginTop: '2px' }}>{mentalLabel || '—'}</div>
                </div>
              </div>

              {entry.momentText && entry.momentText.trim() && (
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '0.78em', color: '#7A7A7A', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
                    One thing worth remembering
                  </div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1em', color: '#3A3A3A', fontStyle: 'italic', lineHeight: 1.55 }}>
                    "{entry.momentText.trim()}"
                  </div>
                </div>
              )}

              {entry.empatheticResponse && (
                <div className="hl-voice-response" style={{ margin: 0, animation: 'none' }}>
                  <div className="hl-voice-name">⭐ The Empathetic Coach</div>
                  <div className="hl-voice-text">{entry.empatheticResponse}</div>
                </div>
              )}
            </div>
          );
        })}

        {/* Delete confirmation modal */}
        {deleteTarget && (
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(58, 58, 58, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              zIndex: 1000,
            }}
            onClick={() => setDeleteTarget(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'white',
                borderRadius: '14px',
                padding: '24px',
                maxWidth: '420px',
                width: '100%',
              }}
            >
              <h2 style={{ fontFamily: "'Playfair Display', serif", color: '#8B7355', fontSize: '1.3em', marginTop: 0 }}>
                Delete this Quick Capture?
              </h2>
              <p style={{ color: '#3A3A3A', lineHeight: 1.55 }}>
                The entry will be soft-deleted from your list. It can be restored from Firestore if needed.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  style={{
                    background: 'white',
                    border: '1.5px solid #E0D5C7',
                    color: '#3A3A3A',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  style={{
                    background: '#B84A4A',
                    border: 'none',
                    color: 'white',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontWeight: 600,
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
