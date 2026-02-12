import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getAllReflections, deleteReflection, REFLECTION_CATEGORIES } from '../../services';
import { exportToCSV, exportToJSON, EXPORT_COLUMNS } from '../../utils/exportUtils';
import '../Forms/Forms.css';

const CATEGORY_COLORS = {
  personal: '#4A90E2',
  validation: '#7ED321',
  aha: '#F5A623',
  obstacle: '#D0021B',
  connection: '#8B5CF6',
  feel: '#FF8C42'
};

const CATEGORY_LABELS = Object.fromEntries(REFLECTION_CATEGORIES.map(c => [c.value, c.label]));

export default function ReflectionList() {
  const { currentUser } = useAuth();
  const [reflections, setReflections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    loadReflections();
  }, [currentUser]);

  async function loadReflections() {
    if (!currentUser) return;
    setLoading(true);
    const result = await getAllReflections(currentUser.uid);
    if (result.success) {
      setReflections(result.data);
    }
    setLoading(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await deleteReflection(deleteTarget);
    if (result.success) {
      setReflections(prev => prev.filter(r => r.id !== deleteTarget));
    }
    setDeleteTarget(null);
  }

  const filtered = reflections.filter(r => {
    if (filter === 'all') return true;
    return r.category === filter;
  });

  function formatDate(ts) {
    if (!ts) return '';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  }

  if (loading) {
    return <div className="loading-state">Loading reflections...</div>;
  }

  return (
    <div className="list-page">
      <div className="list-page-header">
        <h1>Reflections</h1>
        <div className="list-page-actions">
          {reflections.length > 0 && (
            <>
              <button className="btn-export-sm" onClick={() => exportToCSV(reflections, 'reflections', EXPORT_COLUMNS.reflections)}>CSV</button>
              <button className="btn-export-sm" onClick={() => exportToJSON(reflections, 'reflections')}>JSON</button>
            </>
          )}
          <Link to="/reflections/new" className="btn-new">+ New Reflection</Link>
        </div>
      </div>

      {reflections.length === 0 ? (
        <div className="empty-state">
          <h3>No reflections yet</h3>
          <p>Start your first reflection to begin tracking your dressage journey.</p>
          <Link to="/reflections/new" className="btn-new">+ New Reflection</Link>
        </div>
      ) : (
        <>
          <div className="filter-bar">
            <button className={`filter-btn${filter === 'all' ? ' active' : ''}`} onClick={() => setFilter('all')}>All</button>
            {REFLECTION_CATEGORIES.map(cat => (
              <button
                key={cat.value}
                className={`filter-btn${filter === cat.value ? ' active' : ''}`}
                onClick={() => setFilter(cat.value)}
              >
                <span style={{ color: CATEGORY_COLORS[cat.value], marginRight: '4px' }}>&#9632;</span>
                {cat.label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <p>No reflections match this filter.</p>
            </div>
          ) : (
            filtered.map(ref => {
              const color = CATEGORY_COLORS[ref.category] || '#8B7355';
              return (
                <div key={ref.id} className="list-card" style={{ borderLeft: `4px solid ${color}` }}>
                  <Link to={`/reflections/${ref.id}/edit`} className="list-card-content" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: '10px',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                        background: `${color}20`,
                        color: color
                      }}>
                        {CATEGORY_LABELS[ref.category] || ref.category}
                      </span>
                      <span style={{ fontSize: '0.82rem', color: '#7A7A7A' }}>{formatDate(ref.createdAt)}</span>
                    </div>
                    {ref.prompt && (
                      <div style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: '1.05rem',
                        marginBottom: '0.5rem',
                        color: '#3A3A3A'
                      }}>
                        {ref.prompt}
                      </div>
                    )}
                    {ref.mainReflection && (
                      <div style={{ fontSize: '0.9rem', color: '#7A7A7A', lineHeight: 1.5 }}>
                        {ref.mainReflection.length > 150 ? ref.mainReflection.slice(0, 150) + '...' : ref.mainReflection}
                      </div>
                    )}
                  </Link>
                  <div className="list-card-actions">
                    <Link to={`/reflections/${ref.id}/edit`} className="btn-icon" title="Edit">Edit</Link>
                    <button className="btn-icon delete" title="Delete" onClick={() => setDeleteTarget(ref.id)}>Delete</button>
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
            <h3>Delete Reflection</h3>
            <p>Are you sure you want to remove this reflection? This action cannot be undone.</p>
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
