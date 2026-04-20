import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  getAllRiderHealthEntries, updateRiderHealthEntry, deleteRiderHealthEntry,
  RIDER_ISSUE_TYPES, RIDER_IMPACT_LABELS
} from '../../services';
import { exportToCSV, exportToJSON, EXPORT_COLUMNS } from '../../utils/exportUtils';
import '../Forms/Forms.css';
import '../HorseHealth/HorseHealth.css';
import './RiderHealth.css';

const FILTERS = [
  { value: 'all',         label: 'All' },
  { value: 'ongoing',     label: 'Ongoing' },
  { value: 'resolved',    label: 'Resolved' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'concern',     label: 'Concern' },
  { value: 'injury',      label: 'Injury' }
];

const ISSUE_LABELS = Object.fromEntries(RIDER_ISSUE_TYPES.map(t => [t.value, t.label]));

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(m, 10) - 1]} ${parseInt(d, 10)}, ${y}`;
}

function flattenForExport(entries) {
  return entries.map(e => ({
    ...e,
    bodyAreas: Array.isArray(e.bodyAreas) ? e.bodyAreas.join('|') : '',
    professionals: Array.isArray(e.professionals) ? e.professionals.join('|') : ''
  }));
}

export default function HealthLogList() {
  const { currentUser } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  async function loadEntries() {
    if (!currentUser) return;
    setLoading(true);
    const result = await getAllRiderHealthEntries(currentUser.uid);
    if (result.success) {
      setEntries(result.data);
    }
    setLoading(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await deleteRiderHealthEntry(deleteTarget);
    if (result.success) {
      setEntries(prev => prev.filter(e => e.id !== deleteTarget));
    }
    setDeleteTarget(null);
  }

  async function handleMarkResolved(id) {
    const today = new Date().toISOString().split('T')[0];
    const result = await updateRiderHealthEntry(id, {
      status: 'resolved',
      resolvedDate: today
    });
    if (result.success) {
      setEntries(prev => prev.map(e =>
        e.id === id
          ? { ...e, status: 'resolved', resolvedDate: today }
          : e
      ));
    }
  }

  function toggleExpand(id) {
    setExpandedId(prev => (prev === id ? null : id));
  }

  const filtered = entries.filter(entry => {
    if (filter === 'all') return true;
    if (['ongoing', 'resolved'].includes(filter)) return entry.status === filter;
    return entry.issueType === filter;
  });

  const totalCount = entries.length;
  const ongoingCount = entries.filter(e => e.status === 'ongoing').length;
  const resolvedCount = entries.filter(e => e.status === 'resolved').length;

  function handleCsvExport() {
    const today = new Date().toISOString().split('T')[0];
    exportToCSV(flattenForExport(entries), `rider-health-log-${today}`, EXPORT_COLUMNS.riderHealthEntries);
  }

  function handleJsonExport() {
    const today = new Date().toISOString().split('T')[0];
    exportToJSON(entries, `rider-health-log-${today}`);
  }

  if (loading) {
    return <div className="loading-state">Loading rider health log...</div>;
  }

  return (
    <div className="list-page">
      <div className="list-page-header">
        <h1>Rider Health & Wellness Log</h1>
        <div className="list-page-actions">
          {entries.length > 0 && (
            <>
              <button className="btn-export-sm" onClick={handleCsvExport}>CSV</button>
              <button className="btn-export-sm" onClick={handleJsonExport}>JSON</button>
            </>
          )}
          <Link to="/rider-health/new" className="btn-new">+ New Entry</Link>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="empty-state">
          <h3>No entries yet</h3>
          <p>
            Log something here only when it&apos;s affecting your riding —
            an appointment, an injury, a flare-up that&apos;s changing how
            you ride.
          </p>
          <Link to="/rider-health/new" className="btn-new">+ New Entry</Link>
        </div>
      ) : (
        <>
          <div className="health-summary-strip">
            <div className="health-summary-card">
              <div className="health-summary-number">{totalCount}</div>
              <div className="health-summary-label">Total</div>
            </div>
            <div className="health-summary-card">
              <div className="health-summary-number" style={{ color: 'var(--health-ongoing)' }}>{ongoingCount}</div>
              <div className="health-summary-label">Ongoing</div>
            </div>
            <div className="health-summary-card">
              <div className="health-summary-number" style={{ color: 'var(--health-resolved)' }}>{resolvedCount}</div>
              <div className="health-summary-label">Resolved</div>
            </div>
          </div>

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
                        {formatDate(entry.date)} &middot; {ISSUE_LABELS[entry.issueType] || entry.issueType}
                        {entry.impact && <> &middot; Impact: {RIDER_IMPACT_LABELS[entry.impact] || entry.impact}</>}
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
                      {entry.notes && (
                        <div className="health-detail-item health-detail-full">
                          <div className="health-detail-label">What&apos;s going on</div>
                          <div className="health-detail-value">{entry.notes}</div>
                        </div>
                      )}
                      {entry.inSaddleNotes && (
                        <div className="health-detail-item health-detail-full">
                          <div className="health-detail-label">What you&apos;re noticing in the saddle</div>
                          <div className="health-detail-value">{entry.inSaddleNotes}</div>
                        </div>
                      )}
                      {entry.workingOnNotes && (
                        <div className="health-detail-item health-detail-full">
                          <div className="health-detail-label">What you&apos;re working on</div>
                          <div className="health-detail-value">{entry.workingOnNotes}</div>
                        </div>
                      )}
                      {entry.resolvedDate && (
                        <div className="health-detail-item">
                          <div className="health-detail-label">Resolved on</div>
                          <div className="health-detail-value">{formatDate(entry.resolvedDate)}</div>
                        </div>
                      )}
                    </div>

                    {((entry.bodyAreas && entry.bodyAreas.length > 0) ||
                      (entry.professionals && entry.professionals.length > 0)) && (
                      <div className="rider-health-tag-row">
                        {(entry.bodyAreas || []).map(area => (
                          <span key={`b-${area}`} className="rider-health-tag">{area}</span>
                        ))}
                        {(entry.professionals || []).map(pro => (
                          <span key={`p-${pro}`} className="rider-health-tag pro">{pro}</span>
                        ))}
                      </div>
                    )}

                    <div className="health-entry-actions">
                      <Link to={`/rider-health/${entry.id}/edit`} className="health-entry-btn">Edit</Link>
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
            <h3>Delete Rider Health Entry</h3>
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
