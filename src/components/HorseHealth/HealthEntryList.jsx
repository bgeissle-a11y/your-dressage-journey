import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  getAllHealthEntries, updateHealthEntry, deleteHealthEntry,
  ISSUE_TYPES, HEALTH_STATUSES
} from '../../services';
import { exportToCSV, exportToJSON, EXPORT_COLUMNS } from '../../utils/exportUtils';
import '../Forms/Forms.css';
import './HorseHealth.css';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'concern', label: 'Concern' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'resolved', label: 'Resolved' }
];

const ISSUE_LABELS = Object.fromEntries(ISSUE_TYPES.map(t => [t.value, t.label]));

export default function HealthEntryList() {
  const { currentUser } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    loadEntries();
  }, [currentUser]);

  async function loadEntries() {
    if (!currentUser) return;
    setLoading(true);
    const result = await getAllHealthEntries(currentUser.uid);
    if (result.success) {
      setEntries(result.data);
    }
    setLoading(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await deleteHealthEntry(deleteTarget);
    if (result.success) {
      setEntries(prev => prev.filter(e => e.id !== deleteTarget));
    }
    setDeleteTarget(null);
  }

  async function handleMarkResolved(id) {
    const result = await updateHealthEntry(id, {
      status: 'resolved',
      resolvedDate: new Date().toISOString().split('T')[0]
    });
    if (result.success) {
      setEntries(prev => prev.map(e =>
        e.id === id
          ? { ...e, status: 'resolved', resolvedDate: new Date().toISOString().split('T')[0] }
          : e
      ));
    }
  }

  const filtered = entries.filter(entry => {
    if (filter === 'all') return true;
    if (['ongoing', 'resolved'].includes(filter)) return entry.status === filter;
    return entry.issueType === filter;
  });

  // Summary counts
  const totalCount = entries.length;
  const ongoingCount = entries.filter(e => e.status === 'ongoing').length;
  const resolvedCount = entries.filter(e => e.status === 'resolved').length;
  const emergencyCount = entries.filter(e => e.issueType === 'emergency').length;

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[parseInt(m)-1]} ${parseInt(d)}, ${y}`;
  }

  function toggleExpand(id) {
    setExpandedId(prev => prev === id ? null : id);
  }

  if (loading) {
    return <div className="loading-state">Loading health records...</div>;
  }

  return (
    <div className="list-page">
      <div className="list-page-header">
        <h1>Health & Soundness Log</h1>
        <div className="list-page-actions">
          {entries.length > 0 && (
            <>
              <button className="btn-export-sm" onClick={() => exportToCSV(entries, 'horse-health', EXPORT_COLUMNS.horseHealthEntries)}>CSV</button>
              <button className="btn-export-sm" onClick={() => exportToJSON(entries, 'horse-health')}>JSON</button>
            </>
          )}
          <Link to="/horse-health/new" className="btn-new">+ New Entry</Link>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="empty-state">
          <h3>No entries yet</h3>
          <p>Start tracking your horse's health and soundness.</p>
          <Link to="/horse-health/new" className="btn-new">+ New Entry</Link>
        </div>
      ) : (
        <>
          {/* Summary Strip */}
          <div className="health-summary-strip">
            <div className="health-summary-card">
              <div className="health-summary-number">{totalCount}</div>
              <div className="health-summary-label">Total Entries</div>
            </div>
            <div className="health-summary-card">
              <div className="health-summary-number" style={{ color: 'var(--health-ongoing)' }}>{ongoingCount}</div>
              <div className="health-summary-label">Ongoing</div>
            </div>
            <div className="health-summary-card">
              <div className="health-summary-number" style={{ color: 'var(--health-resolved)' }}>{resolvedCount}</div>
              <div className="health-summary-label">Resolved</div>
            </div>
            <div className="health-summary-card">
              <div className="health-summary-number" style={{ color: 'var(--health-emergency)' }}>{emergencyCount}</div>
              <div className="health-summary-label">Emergencies</div>
            </div>
          </div>

          {/* Filters */}
          <div className="health-filters">
            {FILTERS.map(f => (
              <button
                key={f.value}
                className={`health-filter-chip${filter === f.value ? ' active' : ''}`}
                onClick={() => setFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Entry Cards */}
          {filtered.length === 0 ? (
            <div className="empty-state">
              <p>No entries match this filter.</p>
            </div>
          ) : (
            filtered.map(entry => (
              <div key={entry.id} className="health-entry-card">
                <div className="health-entry-header" onClick={() => toggleExpand(entry.id)}>
                  <div className="health-entry-header-left">
                    <div className={`health-type-badge ${entry.issueType}`} />
                    <div className="health-entry-info">
                      <div className="health-entry-title">{entry.title}</div>
                      <div className="health-entry-meta">
                        {entry.horseName && <><strong>{entry.horseName}</strong> &middot; </>}
                        {formatDate(entry.date)} &middot; {ISSUE_LABELS[entry.issueType] || entry.issueType}
                      </div>
                    </div>
                  </div>
                  <div className="health-entry-right">
                    <span className={`health-status-pill ${entry.status}`}>
                      {entry.status === 'ongoing' ? 'Ongoing' : 'Resolved'}
                    </span>
                    <span className="health-expand-btn">
                      {expandedId === entry.id ? '\u25B4' : '\u25BE'}
                    </span>
                  </div>
                </div>

                {expandedId === entry.id && (
                  <div className="health-entry-body">
                    <div className="health-detail-grid">
                      {entry.horseName && (
                        <div className="health-detail-item">
                          <div className="health-detail-label">Horse</div>
                          <div className="health-detail-value">{entry.horseName}</div>
                        </div>
                      )}
                      {entry.professionals?.length > 0 && (
                        <div className="health-detail-item">
                          <div className="health-detail-label">Seen By</div>
                          <div className="health-detail-value">{entry.professionals.join(', ')}</div>
                        </div>
                      )}
                      {entry.resolvedDate && (
                        <div className="health-detail-item">
                          <div className="health-detail-label">Resolved On</div>
                          <div className="health-detail-value">{formatDate(entry.resolvedDate)}</div>
                        </div>
                      )}
                      {entry.notes && (
                        <div className="health-detail-item health-detail-full">
                          <div className="health-detail-label">Details / Observation</div>
                          <div className="health-detail-value">{entry.notes}</div>
                        </div>
                      )}
                      {entry.results && (
                        <div className="health-detail-item health-detail-full">
                          <div className="health-detail-label">Results / What Happened</div>
                          <div className="health-detail-value">{entry.results}</div>
                        </div>
                      )}
                      {entry.nextSteps && (
                        <div className="health-detail-item health-detail-full">
                          <div className="health-detail-label">Next Steps</div>
                          <div className="health-detail-value">{entry.nextSteps}</div>
                        </div>
                      )}
                    </div>

                    <div className="health-entry-actions">
                      <Link to={`/horse-health/${entry.id}/edit`} className="health-entry-btn">Edit</Link>
                      {entry.status === 'ongoing' && (
                        <button className="health-entry-btn resolve" onClick={() => handleMarkResolved(entry.id)}>
                          Mark Resolved
                        </button>
                      )}
                      <button className="health-entry-btn delete" onClick={() => setDeleteTarget(entry.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>Delete Health Entry</h3>
            <p>Are you sure you want to remove this entry? This action cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn-danger" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
