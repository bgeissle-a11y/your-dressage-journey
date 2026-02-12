import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getAllPhysicalAssessments, deletePhysicalAssessment } from '../../services';
import { exportToCSV, exportToJSON } from '../../utils/exportUtils';
import '../Forms/Forms.css';

export default function PhysicalAssessmentList() {
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
    const result = await getAllPhysicalAssessments(currentUser.uid);
    if (result.success) {
      setAssessments(result.data);
    }
    setLoading(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await deletePhysicalAssessment(deleteTarget);
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
        <h1>Physical Self-Assessments</h1>
        <div className="list-page-actions">
          {assessments.length > 0 && (
            <>
              <button className="btn-export-sm" onClick={() => exportToCSV(assessments, 'physical-assessments')}>CSV</button>
              <button className="btn-export-sm" onClick={() => exportToJSON(assessments, 'physical-assessments')}>JSON</button>
            </>
          )}
          <Link to="/physical-assessments/new" className="btn-new">+ New Assessment</Link>
        </div>
      </div>

      {assessments.length === 0 ? (
        <div className="empty-state">
          <h3>No physical assessments yet</h3>
          <p>Complete your first physical self-assessment to track your body awareness and patterns.</p>
          <Link to="/physical-assessments/new" className="btn-new">+ New Assessment</Link>
        </div>
      ) : (
        assessments.map(assessment => (
          <div key={assessment.id} className="list-card">
            <Link to={`/physical-assessments/${assessment.id}/edit`} className="list-card-content" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="list-card-title">
                Physical Self-Assessment
                {assessment.isDraft && <span className="status-badge draft" style={{ marginLeft: '0.5rem' }}>Draft</span>}
              </div>
              <div className="list-card-meta">
                <span>{formatDate(assessment.createdAt)}</span>
                {assessment.kinestheticLevel && <span>Awareness: {assessment.kinestheticLevel}/10</span>}
                {assessment.dailyTensionAreas?.length > 0 && <span>{assessment.dailyTensionAreas.length} tension areas</span>}
              </div>
            </Link>
            <div className="list-card-actions">
              <Link to={`/physical-assessments/${assessment.id}/edit`} className="btn-icon" title="Edit">Edit</Link>
              <button className="btn-icon delete" title="Delete" onClick={() => setDeleteTarget(assessment.id)}>Delete</button>
            </div>
          </div>
        ))
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>Delete Assessment</h3>
            <p>Are you sure you want to remove this physical assessment? This action cannot be undone.</p>
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
