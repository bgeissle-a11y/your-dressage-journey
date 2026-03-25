import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  getAllToolkitEntries, updateToolkitEntry, deleteToolkitEntry,
  TOOLKIT_CATEGORIES, TOOLKIT_STATUSES,
  CATEGORY_LABELS, STATUS_LABELS
} from '../../services';
import { exportToCSV, exportToJSON, EXPORT_COLUMNS } from '../../utils/exportUtils';
import '../Forms/Forms.css';
import './Toolkit.css';

const STATUS_ORDER = TOOLKIT_STATUSES.map(s => s.value);

const PROBLEM_LABELS = {
  timing: 'Timing of the aid',
  position: 'Position breaks down',
  collection: 'Loss of collection',
  anticipation: 'Horse anticipates or rushes',
  mental: 'Mental freeze or confidence loss',
  unfamiliar: 'Building from scratch',
};

const FILTERS = [
  { value: 'all', label: 'All' },
  ...TOOLKIT_CATEGORIES.filter(c => c.value !== 'other').map(c => ({
    value: c.value,
    label: c.label.split(' ')[0] // First word: Movement, Strength, etc.
  }))
];

export default function ToolkitList() {
  const { currentUser } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    loadEntries();
  }, [currentUser]);

  async function loadEntries() {
    if (!currentUser) return;
    setLoading(true);
    const result = await getAllToolkitEntries(currentUser.uid);
    if (result.success) {
      setEntries(result.data);
    }
    setLoading(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await deleteToolkitEntry(deleteTarget);
    if (result.success) {
      setEntries(prev => prev.filter(e => e.id !== deleteTarget));
    }
    setDeleteTarget(null);
  }

  async function handleCycleStatus(id) {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    const idx = STATUS_ORDER.indexOf(entry.status);
    const newStatus = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];

    const result = await updateToolkitEntry(id, { status: newStatus });
    if (result.success) {
      setEntries(prev => prev.map(e =>
        e.id === id ? { ...e, status: newStatus } : e
      ));
    }
  }

  function handleExport(format) {
    const exportFn = format === 'csv' ? exportToCSV : exportToJSON;
    const exportData = entries.map(e => ({
      ...e,
      bodyTags: Array.isArray(e.bodyTags) ? e.bodyTags.join('|') : e.bodyTags
    }));
    exportFn(exportData, `toolkit-${new Date().toISOString().split('T')[0]}`, EXPORT_COLUMNS.riderToolkitEntries);
  }

  const filtered = filter === 'all'
    ? entries
    : entries.filter(e => e.category === filter);

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[parseInt(m) - 1]} ${parseInt(d)}, ${y}`;
  }

  if (loading) {
    return <div className="loading-state">Loading your toolkit...</div>;
  }

  return (
    <div className="list-page">
      <div className="list-page-header">
        <h1>Your Toolkit</h1>
        <div className="list-page-actions">
          {entries.length > 0 && (
            <>
              <button className="btn-export-sm" onClick={() => handleExport('csv')}>CSV</button>
              <button className="btn-export-sm" onClick={() => handleExport('json')}>JSON</button>
            </>
          )}
          <Link to="/toolkit/new" className="btn-new">+ New Entry</Link>
          <a href="/ydj-visualization-form.html" className="btn-new tk-viz-btn">Build Visualization Script</a>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="empty-state">
          <h3>Your toolkit is empty</h3>
          <p>Add your first discovery — something you want to remember that might support your riding.</p>
          <Link to="/toolkit/new" className="btn-new">+ New Entry</Link>
        </div>
      ) : (
        <>
          {/* Summary Strip */}
          <div className="tk-summary-strip">
            <div className="tk-summary-card">
              <div className="tk-summary-number">{entries.length}</div>
              <div className="tk-summary-label">Total</div>
            </div>
            <div className="tk-summary-card">
              <div className="tk-summary-number" style={{ color: 'var(--tk-want-to-try)' }}>
                {entries.filter(e => e.status === 'want-to-try').length}
              </div>
              <div className="tk-summary-label">Want to Try</div>
            </div>
            <div className="tk-summary-card">
              <div className="tk-summary-number" style={{ color: 'var(--tk-currently-using)' }}>
                {entries.filter(e => e.status === 'currently-using').length}
              </div>
              <div className="tk-summary-label">Using</div>
            </div>
            <div className="tk-summary-card">
              <div className="tk-summary-number" style={{ color: 'var(--tk-tried-it)' }}>
                {entries.filter(e => e.status === 'tried-it').length}
              </div>
              <div className="tk-summary-label">Tried</div>
            </div>
          </div>

          {/* Filters */}
          <div className="tk-filters">
            {FILTERS.map(f => (
              <button
                key={f.value}
                className={`tk-filter-chip${filter === f.value ? ' active' : ''}`}
                onClick={() => setFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Entry Cards */}
          {filtered.length === 0 ? (
            <div className="empty-state">
              <p>No entries in this category yet.</p>
            </div>
          ) : (
            filtered.map(entry => entry.entryType === 'visualization-script' ? (
              <div key={entry.id} className="tk-entry-card tk-viz-card">
                <div className="tk-entry-top">
                  <div className="tk-entry-title">{entry.name}</div>
                  <span className="tk-cat-badge mental">Mental Rehearsal</span>
                </div>

                <div className="tk-entry-meta-row">
                  <span className="tk-entry-meta-item">
                    <span className={`tk-status-dot ${entry.status}`} />
                    {STATUS_LABELS[entry.status]}
                  </span>
                  {entry.sessionCount > 0 && (
                    <span className="tk-entry-meta-item">
                      {entry.sessionCount} session{entry.sessionCount > 1 ? 's' : ''} completed
                    </span>
                  )}
                  {entry.lastSessionDate && (
                    <span className="tk-entry-meta-item">Last used: {formatDate(entry.lastSessionDate)}</span>
                  )}
                </div>

                {entry.problemFocus && (
                  <div className="tk-entry-description tk-viz-problem">
                    {PROBLEM_LABELS[entry.problemFocus] || entry.problemFocus}
                  </div>
                )}

                <div className="tk-entry-actions">
                  <a
                    href={`/ydj-visualization-form.html?scriptId=${entry.id}`}
                    className="tk-entry-btn tk-viz-open-btn"
                  >
                    Open Script
                  </a>
                  <button className="tk-entry-btn" onClick={() => handleCycleStatus(entry.id)}>
                    Change status
                  </button>
                  <button className="tk-entry-btn delete" onClick={() => setDeleteTarget(entry.id)}>
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div key={entry.id} className="tk-entry-card">
                <div className="tk-entry-top">
                  <div className="tk-entry-title">{entry.name}</div>
                  <span className={`tk-cat-badge ${entry.category}`}>
                    {CATEGORY_LABELS[entry.category] || entry.category}
                  </span>
                </div>

                <div className="tk-entry-meta-row">
                  <span className="tk-entry-meta-item">
                    <span className={`tk-status-dot ${entry.status}`} />
                    {STATUS_LABELS[entry.status]}
                  </span>
                  {entry.date && (
                    <span className="tk-entry-meta-item">{formatDate(entry.date)}</span>
                  )}
                  {entry.source && (
                    <span className="tk-entry-meta-item">{entry.source}</span>
                  )}
                </div>

                {entry.description && (
                  <div className="tk-entry-description">{entry.description}</div>
                )}

                {entry.ridingConnection && (
                  <div className="tk-entry-connection">{entry.ridingConnection}</div>
                )}

                {entry.followupNotes && (
                  <div className="tk-entry-followup">
                    <div className="tk-entry-followup-label">Notes</div>
                    {entry.followupNotes}
                  </div>
                )}

                {entry.bodyTags?.length > 0 && (
                  <div className="tk-entry-body-tags">
                    {entry.bodyTags.map(tag => (
                      <span key={tag} className="tk-entry-body-tag">{tag}</span>
                    ))}
                  </div>
                )}

                <div className="tk-entry-actions">
                  <Link to={`/toolkit/${entry.id}/edit`} className="tk-entry-btn">Edit</Link>
                  <button className="tk-entry-btn" onClick={() => handleCycleStatus(entry.id)}>
                    Change status
                  </button>
                  <button className="tk-entry-btn delete" onClick={() => setDeleteTarget(entry.id)}>
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>Remove Toolkit Entry</h3>
            <p>Are you sure you want to remove this entry? This action cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn-danger" onClick={handleDelete}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
