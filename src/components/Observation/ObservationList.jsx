import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getAllObservations, deleteObservation, CONTEXT_TYPES } from '../../services';
import '../Forms/Forms.css';

const CONTEXT_LABELS = Object.fromEntries(CONTEXT_TYPES.map(c => [c.value, c.label]));

export default function ObservationList() {
  const { currentUser } = useAuth();
  const [observations, setObservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    loadObservations();
  }, [currentUser]);

  async function loadObservations() {
    if (!currentUser) return;
    setLoading(true);
    const result = await getAllObservations(currentUser.uid);
    if (result.success) {
      setObservations(result.data);
    }
    setLoading(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await deleteObservation(deleteTarget);
    if (result.success) {
      setObservations(prev => prev.filter(o => o.id !== deleteTarget));
    }
    setDeleteTarget(null);
  }

  const filtered = observations.filter(obs => {
    if (filter === 'all') return true;
    return obs.contextType === filter;
  });

  function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  }

  function getContextDetail(obs) {
    switch (obs.contextType) {
      case 'clinic': return obs.clinicianName ? `with ${obs.clinicianName}` : '';
      case 'trainer-riding': return obs.horseName || '';
      default: return obs.description || '';
    }
  }

  if (loading) {
    return <div className="loading-state">Loading observations...</div>;
  }

  return (
    <div className="list-page">
      <div className="list-page-header">
        <h1>Observations</h1>
        <Link to="/observations/new" className="btn-new">+ New Observation</Link>
      </div>

      {observations.length === 0 ? (
        <div className="empty-state">
          <h3>No observations yet</h3>
          <p>Start recording what you learn watching others ride.</p>
          <Link to="/observations/new" className="btn-new">+ New Observation</Link>
        </div>
      ) : (
        <>
          <div className="filter-bar">
            <button className={`filter-btn${filter === 'all' ? ' active' : ''}`} onClick={() => setFilter('all')}>All</button>
            {CONTEXT_TYPES.map(ct => (
              <button
                key={ct.value}
                className={`filter-btn${filter === ct.value ? ' active' : ''}`}
                onClick={() => setFilter(ct.value)}
              >
                {ct.label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <p>No observations match this filter.</p>
            </div>
          ) : (
            filtered.map(obs => {
              const detail = getContextDetail(obs);
              const noteCount = (obs.observations || []).length;
              return (
                <div key={obs.id} className="list-card">
                  <Link to={`/observations/${obs.id}/edit`} className="list-card-content" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="list-card-title">
                      {CONTEXT_LABELS[obs.contextType] || obs.contextType}
                      {detail && ` - ${detail}`}
                    </div>
                    <div className="list-card-meta">
                      <span>{formatDate(obs.date)}</span>
                      <span>{noteCount} observation{noteCount !== 1 ? 's' : ''}</span>
                    </div>
                  </Link>
                  <div className="list-card-actions">
                    <Link to={`/observations/${obs.id}/edit`} className="btn-icon" title="Edit">Edit</Link>
                    <button className="btn-icon delete" title="Delete" onClick={() => setDeleteTarget(obs.id)}>Delete</button>
                  </div>
                </div>
              );
            })
          )}
        </>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>Delete Observation</h3>
            <p>Are you sure you want to remove this observation? This action cannot be undone.</p>
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
