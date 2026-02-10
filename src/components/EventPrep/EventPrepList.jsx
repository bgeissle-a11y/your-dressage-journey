import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getAllEventPrepPlans, deleteEventPrepPlan, EVENT_PREP_TYPES, EVENT_PREP_STATUSES } from '../../services';
import '../Forms/Forms.css';

const TYPE_LABELS = Object.fromEntries(EVENT_PREP_TYPES.map(t => [t.value, t.label]));
const STATUS_LABELS = Object.fromEntries(EVENT_PREP_STATUSES.map(s => [s.value, s.label]));

export default function EventPrepList() {
  const { currentUser } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    loadPlans();
  }, [currentUser]);

  async function loadPlans() {
    if (!currentUser) return;
    setLoading(true);
    const result = await getAllEventPrepPlans(currentUser.uid);
    if (result.success) {
      setPlans(result.data);
    }
    setLoading(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await deleteEventPrepPlan(deleteTarget);
    if (result.success) {
      setPlans(prev => prev.filter(p => p.id !== deleteTarget));
    }
    setDeleteTarget(null);
  }

  const filtered = plans.filter(plan => {
    if (filter === 'all') return true;
    if (filter === 'upcoming') return ['planning', 'confirmed'].includes(plan.status);
    if (filter === 'completed') return plan.status === 'completed';
    return plan.status === filter;
  });

  function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  }

  function daysUntil(dateStr) {
    if (!dateStr) return null;
    const now = new Date();
    const event = new Date(dateStr + 'T00:00:00');
    return Math.ceil((event - now) / (1000 * 60 * 60 * 24));
  }

  function statusBadgeClass(status) {
    switch (status) {
      case 'completed': return 'status-resolved';
      case 'cancelled': return 'status-resolved';
      case 'confirmed': return 'status-ongoing';
      default: return 'status-active';
    }
  }

  function eventTypeLabel(plan) {
    if (plan.eventType === 'other') return plan.eventTypeOther || 'Other';
    return TYPE_LABELS[plan.eventType] || plan.eventType;
  }

  if (loading) {
    return <div className="loading-state">Loading event preparations...</div>;
  }

  return (
    <div className="list-page">
      <div className="list-page-header">
        <h1>Event Preparations</h1>
        <Link to="/event-prep/new" className="btn-new">+ New Event Prep</Link>
      </div>

      {plans.length === 0 ? (
        <div className="empty-state">
          <h3>No event preparations yet</h3>
          <p>Create your first preparation plan to get ready for an event.</p>
          <Link to="/event-prep/new" className="btn-new">+ New Event Prep</Link>
        </div>
      ) : (
        <>
          <div className="filter-bar">
            <button className={`filter-btn${filter === 'all' ? ' active' : ''}`} onClick={() => setFilter('all')}>All</button>
            <button className={`filter-btn${filter === 'upcoming' ? ' active' : ''}`} onClick={() => setFilter('upcoming')}>Upcoming</button>
            <button className={`filter-btn${filter === 'completed' ? ' active' : ''}`} onClick={() => setFilter('completed')}>Completed</button>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <p>No events match this filter.</p>
            </div>
          ) : (
            filtered.map(plan => {
              const days = daysUntil(plan.eventDate);
              return (
                <div key={plan.id} className="list-card">
                  <Link to={`/event-prep/${plan.id}/plan`} className="list-card-content" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div className="list-card-title">{plan.eventName}</div>
                      {days !== null && days >= 0 && ['planning', 'confirmed'].includes(plan.status) && (
                        <span style={{
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          color: days <= 7 ? '#D0021B' : days <= 30 ? '#C67B5C' : '#6B8E5F'
                        }}>
                          {days === 0 ? 'Today!' : days === 1 ? '1 day' : `${days} days`}
                        </span>
                      )}
                    </div>
                    <div className="list-card-meta">
                      <span>{formatDate(plan.eventDate)}</span>
                      {plan.eventType && <span>{eventTypeLabel(plan)}</span>}
                      {plan.horseName && <span>{plan.horseName}</span>}
                      <span className={`status-badge ${statusBadgeClass(plan.status)}`}>
                        {STATUS_LABELS[plan.status] || plan.status}
                      </span>
                    </div>
                  </Link>
                  <div className="list-card-actions">
                    <Link to={`/event-prep/${plan.id}/plan`} className="btn-icon" title="View Plan">View</Link>
                    <Link to={`/event-prep/${plan.id}/edit`} className="btn-icon" title="Edit">Edit</Link>
                    <button className="btn-icon delete" title="Delete" onClick={() => setDeleteTarget(plan.id)}>Delete</button>
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
            <h3>Delete Event Preparation</h3>
            <p>Are you sure you want to remove this event preparation? This action cannot be undone.</p>
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
