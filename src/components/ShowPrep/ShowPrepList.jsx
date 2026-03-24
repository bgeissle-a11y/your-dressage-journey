import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  getAllShowPreparations, deleteShowPreparation,
  SHOW_TYPES, SHOW_PREP_STATUSES, resolveTestNames
} from '../../services';
import { exportToCSV, exportToJSON } from '../../utils/exportUtils';
import '../Forms/Forms.css';
import './ShowPrep.css';

const TYPE_LABELS = Object.fromEntries(SHOW_TYPES.map(t => [t.value, t.label]));
const STATUS_LABELS = Object.fromEntries(SHOW_PREP_STATUSES.map(s => [s.value, s.label]));

function flattenShowPrepForExport(plans) {
  return plans.map(p => ({
    showName: p.showName,
    showDateStart: p.showDateStart,
    showDateEnd: p.showDateEnd || '',
    showType: p.showType,
    horseName: p.horseName,
    currentLevel: p.currentLevel,
    testsSelected: (p.testsSelected || []).join(', '),
    goals: (p.goals || []).join('; '),
    concerns: (p.concerns || []).join('; '),
    ridingFrequency: p.ridingFrequency,
    coachAccess: p.coachAccess,
    status: p.status,
    createdAt: p.createdAt
  }));
}

const EXPORT_COLS = [
  'showName', 'showDateStart', 'showDateEnd', 'showType', 'horseName',
  'currentLevel', 'testsSelected', 'goals', 'concerns', 'ridingFrequency',
  'coachAccess', 'status', 'createdAt'
];

export default function ShowPrepList() {
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
    const result = await getAllShowPreparations(currentUser.uid);
    if (result.success) {
      setPlans(result.data);
    }
    setLoading(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await deleteShowPreparation(deleteTarget);
    if (result.success) {
      setPlans(prev => prev.filter(p => p.id !== deleteTarget));
    }
    setDeleteTarget(null);
  }

  const filtered = plans.filter(plan => {
    if (filter === 'all') return true;
    if (filter === 'upcoming') return ['draft', 'active'].includes(plan.status);
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
    const show = new Date(dateStr + 'T00:00:00');
    return Math.ceil((show - now) / (1000 * 60 * 60 * 24));
  }

  function statusBadgeClass(status) {
    switch (status) {
      case 'completed': return 'status-resolved';
      case 'active': return 'status-ongoing';
      default: return 'status-active';
    }
  }

  function showTypeLabel(plan) {
    if (plan.showType === 'other') return plan.showTypeOther || 'Other';
    return TYPE_LABELS[plan.showType] || plan.showType;
  }

  if (loading) {
    return <div className="loading-state">Loading show preparations...</div>;
  }

  return (
    <div className="list-page">
      <div className="list-page-header">
        <h1>Show Preparations</h1>
        <div className="list-page-actions">
          {plans.length > 0 && (
            <>
              <button className="btn-export-sm" onClick={() => exportToCSV(flattenShowPrepForExport(plans), 'show-preps', EXPORT_COLS)}>CSV</button>
              <button className="btn-export-sm" onClick={() => exportToJSON(plans, 'show-preps')}>JSON</button>
            </>
          )}
          <Link to="/show-prep/new" className="btn-new">+ New Show Prep</Link>
        </div>
      </div>

      {plans.length === 0 ? (
        <div className="empty-state">
          <h3>No show preparations yet</h3>
          <p>Create your first preparation plan to get ready for a show.</p>
          <Link to="/show-prep/new" className="btn-new">+ New Show Prep</Link>
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
              <p>No shows match this filter.</p>
            </div>
          ) : (
            filtered.map(plan => {
              const days = daysUntil(plan.showDateStart);
              const testNames = resolveTestNames(plan.testsSelected);
              return (
                <div key={plan.id} className="list-card">
                  <Link to={`/show-planner/${plan.id}`} className="list-card-content" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div className="list-card-title">{plan.showName}</div>
                      {days !== null && days >= 0 && ['draft', 'active'].includes(plan.status) && (
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
                      <span>{formatDate(plan.showDateStart)}{plan.showDateEnd ? ` \u2013 ${formatDate(plan.showDateEnd)}` : ''}</span>
                      {plan.showType && <span className={`show-type-badge ${plan.showType}`}>{showTypeLabel(plan)}</span>}
                      {plan.horseName && <span>{plan.horseName}</span>}
                      {testNames.length > 0 && <span>{testNames.length} test{testNames.length > 1 ? 's' : ''}</span>}
                      <span className={`status-badge ${statusBadgeClass(plan.status)}`}>
                        {STATUS_LABELS[plan.status] || plan.status}
                      </span>
                    </div>
                  </Link>
                  <div className="list-card-actions">
                    <Link to={`/show-planner/${plan.id}`} className="btn-icon" title="View Plan">View</Link>
                    <Link to={`/show-prep/${plan.id}/edit`} className="btn-icon" title="Edit">Edit</Link>
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
            <h3>Delete Show Preparation</h3>
            <p>Are you sure you want to remove this show preparation? This action cannot be undone.</p>
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
