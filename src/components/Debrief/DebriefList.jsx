import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getAllDebriefs, deleteDebrief } from '../../services';
import '../Forms/Forms.css';

const SESSION_LABELS = {
  lesson: 'Lesson',
  schooling: 'Schooling',
  conditioning: 'Conditioning',
  clinic: 'Clinic',
  'show-schooling': 'Show Schooling',
  'show-test': 'Show Test',
  other: 'Other'
};

export default function DebriefList() {
  const { currentUser } = useAuth();
  const [debriefs, setDebriefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    loadDebriefs();
  }, [currentUser]);

  async function loadDebriefs() {
    if (!currentUser) return;
    setLoading(true);
    const result = await getAllDebriefs(currentUser.uid);
    if (result.success) {
      setDebriefs(result.data);
    }
    setLoading(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await deleteDebrief(deleteTarget);
    if (result.success) {
      setDebriefs(prev => prev.filter(d => d.id !== deleteTarget));
    }
    setDeleteTarget(null);
  }

  // Build unique horse name filters
  const horseNames = [...new Set(debriefs.map(d => d.horseName).filter(Boolean))];

  const filtered = debriefs.filter(d => {
    if (filter === 'all') return true;
    if (filter === 'drafts') return d.isDraft;
    return d.horseName === filter;
  });

  function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  }

  function qualityColor(q) {
    if (q >= 8) return '#6B8E5F';
    if (q >= 5) return '#D4A574';
    return '#D0021B';
  }

  if (loading) {
    return <div className="loading-state">Loading debriefs...</div>;
  }

  return (
    <div className="list-page">
      <div className="list-page-header">
        <h1>Post-Ride Debriefs</h1>
        <Link to="/debriefs/new" className="btn-new">+ New Debrief</Link>
      </div>

      {debriefs.length === 0 ? (
        <div className="empty-state">
          <h3>No debriefs yet</h3>
          <p>Log your first ride debrief to start tracking your progress.</p>
          <Link to="/debriefs/new" className="btn-new">+ New Debrief</Link>
        </div>
      ) : (
        <>
          <div className="filter-bar">
            <button className={`filter-btn${filter === 'all' ? ' active' : ''}`} onClick={() => setFilter('all')}>All</button>
            <button className={`filter-btn${filter === 'drafts' ? ' active' : ''}`} onClick={() => setFilter('drafts')}>Drafts</button>
            {horseNames.map(name => (
              <button
                key={name}
                className={`filter-btn${filter === name ? ' active' : ''}`}
                onClick={() => setFilter(name)}
              >
                {name}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <p>No debriefs match this filter.</p>
            </div>
          ) : (
            filtered.map(debrief => (
              <div key={debrief.id} className="list-card">
                <Link to={`/debriefs/${debrief.id}/edit`} className="list-card-content" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="list-card-title">{debrief.horseName || 'Untitled'}</div>
                    {debrief.overallQuality && (
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 10px',
                        borderRadius: '10px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        background: `${qualityColor(debrief.overallQuality)}20`,
                        color: qualityColor(debrief.overallQuality)
                      }}>
                        {debrief.overallQuality}/10
                      </span>
                    )}
                  </div>
                  <div className="list-card-meta">
                    <span>{formatDate(debrief.rideDate)}</span>
                    {debrief.sessionType && <span>{SESSION_LABELS[debrief.sessionType] || debrief.sessionType}</span>}
                    {debrief.isDraft && <span className="status-badge status-active">Draft</span>}
                  </div>
                </Link>
                <div className="list-card-actions">
                  <Link to={`/debriefs/${debrief.id}/edit`} className="btn-icon" title="Edit">Edit</Link>
                  <button className="btn-icon delete" title="Delete" onClick={() => setDeleteTarget(debrief.id)}>Delete</button>
                </div>
              </div>
            ))
          )}
        </>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>Delete Debrief</h3>
            <p>Are you sure you want to remove this debrief? This action cannot be undone.</p>
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
