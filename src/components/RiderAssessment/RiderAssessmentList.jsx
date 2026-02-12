import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getAllRiderAssessments, deleteRiderAssessment } from '../../services';
import { exportToCSV, exportToJSON } from '../../utils/exportUtils';
import '../Forms/Forms.css';

export default function RiderAssessmentList() {
  const { currentUser } = useAuth();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    loadAssessments();
  }, [currentUser]);

  async function loadAssessments() {
    if (!currentUser) return;
    setLoading(true);
    const result = await getAllRiderAssessments(currentUser.uid);
    if (result.success) {
      setAssessments(result.data);
    }
    setLoading(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await deleteRiderAssessment(deleteTarget);
    if (result.success) {
      setAssessments(prev => prev.filter(a => a.id !== deleteTarget));
    }
    setDeleteTarget(null);
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  }

  if (loading) {
    return <div className="loading-state">Loading assessments...</div>;
  }

  return (
    <div className="list-page">
      <div className="list-page-header">
        <h1>Rider Self-Assessments</h1>
        <div className="list-page-actions">
          {assessments.length > 0 && (
            <>
              <button className="btn-export-sm" onClick={() => exportToCSV(assessments, 'rider-assessments')}>CSV</button>
              <button className="btn-export-sm" onClick={() => exportToJSON(assessments, 'rider-assessments')}>JSON</button>
            </>
          )}
          <Link to="/rider-assessments/new" className="btn-new">+ New Assessment</Link>
        </div>
      </div>

      {assessments.length === 0 ? (
        <div className="empty-state">
          <h3>No rider assessments yet</h3>
          <p>Complete your first rider self-assessment to understand your mental patterns and track growth.</p>
          <Link to="/rider-assessments/new" className="btn-new">+ New Assessment</Link>
        </div>
      ) : (
        assessments.map(assessment => (
          <div key={assessment.id} className="list-card">
            <Link to={`/rider-assessments/${assessment.id}/edit`} className="list-card-content" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="list-card-title">
                Rider Self-Assessment
                {assessment.isDraft && <span className="status-badge draft" style={{ marginLeft: '0.5rem' }}>Draft</span>}
              </div>
              <div className="list-card-meta">
                <span>{formatDate(assessment.createdAt)}</span>
                {assessment.currentStrengths?.length > 0 && (
                  <span>Strengths: {assessment.currentStrengths.join(', ')}</span>
                )}
              </div>
            </Link>
            <div className="list-card-actions">
              <Link to={`/rider-assessments/${assessment.id}/edit`} className="btn-icon" title="Edit">Edit</Link>
              <button className="btn-icon delete" title="Delete" onClick={() => setDeleteTarget(assessment.id)}>Delete</button>
            </div>
          </div>
        ))
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>Delete Assessment</h3>
            <p>Are you sure you want to remove this rider assessment? This action cannot be undone.</p>
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
