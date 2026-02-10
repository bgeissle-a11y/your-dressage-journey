import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getAllJourneyEvents, deleteJourneyEvent, EVENT_TYPES } from '../../services';
import '../Forms/Forms.css';

const STATUS_LABELS = {
  active: 'Active',
  ongoing: 'Ongoing',
  resolved: 'Resolved'
};

const MAGNITUDE_LABELS = {
  minor: 'Minor',
  moderate: 'Moderate',
  major: 'Major'
};

const TYPE_LABELS = Object.fromEntries(EVENT_TYPES.map(t => [t.value, t.label]));

const FILTERS = [
  { value: 'all', label: 'All Events' },
  ...EVENT_TYPES,
  { value: 'active-only', label: 'Active Only' }
];

export default function JourneyEventList() {
  const { currentUser } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    loadEvents();
  }, [currentUser]);

  async function loadEvents() {
    if (!currentUser) return;
    setLoading(true);
    const result = await getAllJourneyEvents(currentUser.uid);
    if (result.success) {
      setEvents(result.data);
    }
    setLoading(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await deleteJourneyEvent(deleteTarget);
    if (result.success) {
      setEvents(prev => prev.filter(e => e.id !== deleteTarget));
    }
    setDeleteTarget(null);
  }

  const filtered = events.filter(event => {
    if (filter === 'all') return true;
    if (filter === 'active-only') return event.status === 'active';
    return event.type === filter;
  });

  function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  if (loading) {
    return <div className="loading-state">Loading events...</div>;
  }

  return (
    <div className="list-page">
      <div className="list-page-header">
        <h1>Journey Events</h1>
        <Link to="/events/new" className="btn-new">+ Log Event</Link>
      </div>

      {events.length === 0 ? (
        <div className="empty-state">
          <h3>No events yet</h3>
          <p>Start tracking significant events that shape your riding journey.</p>
          <Link to="/events/new" className="btn-new">+ Log Event</Link>
        </div>
      ) : (
        <>
          <div className="filter-bar">
            {FILTERS.map(f => (
              <button
                key={f.value}
                className={`filter-btn${filter === f.value ? ' active' : ''}`}
                onClick={() => setFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <p>No events match this filter.</p>
            </div>
          ) : (
            filtered.map(event => (
              <div key={event.id} className="list-card">
                <Link to={`/events/${event.id}/edit`} className="list-card-content" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="list-card-title">{event.category}</div>
                  <div className="list-card-meta">
                    <span>{formatDate(event.date)}</span>
                    {event.type && <span>{TYPE_LABELS[event.type] || event.type}</span>}
                    {event.magnitude && <span>{MAGNITUDE_LABELS[event.magnitude]}</span>}
                    <span className={`status-badge status-${event.status}`}>
                      {STATUS_LABELS[event.status] || event.status}
                    </span>
                  </div>
                  {event.description && (
                    <div style={{ fontSize: '0.9rem', color: '#7A7A7A', marginTop: '0.5rem', lineHeight: 1.5 }}>
                      {event.description.length > 120 ? event.description.slice(0, 120) + '...' : event.description}
                    </div>
                  )}
                </Link>
                <div className="list-card-actions">
                  <Link to={`/events/${event.id}/edit`} className="btn-icon" title="Edit">Edit</Link>
                  <button className="btn-icon delete" title="Delete" onClick={() => setDeleteTarget(event.id)}>Delete</button>
                </div>
              </div>
            ))
          )}
        </>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>Delete Journey Event</h3>
            <p>Are you sure you want to remove this event? This action cannot be undone.</p>
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
