import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getAllHorseProfiles, deleteHorseProfile } from '../../services';
import '../Forms/Forms.css';

export default function HorseProfileList() {
  const { currentUser } = useAuth();
  const [horses, setHorses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    loadHorses();
  }, [currentUser]);

  async function loadHorses() {
    if (!currentUser) return;
    setLoading(true);
    const result = await getAllHorseProfiles(currentUser.uid);
    if (result.success) {
      setHorses(result.data);
    }
    setLoading(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await deleteHorseProfile(deleteTarget);
    if (result.success) {
      setHorses(prev => prev.filter(h => h.id !== deleteTarget));
    }
    setDeleteTarget(null);
  }

  if (loading) {
    return <div className="loading-state">Loading horses...</div>;
  }

  return (
    <div className="list-page">
      <div className="list-page-header">
        <h1>My Horses</h1>
        <Link to="/horses/new" className="btn-new">+ Add Horse</Link>
      </div>

      {horses.length === 0 ? (
        <div className="empty-state">
          <h3>No horses yet</h3>
          <p>Add your first horse profile to get started.</p>
          <Link to="/horses/new" className="btn-new">+ Add Horse</Link>
        </div>
      ) : (
        horses.map(horse => (
          <div key={horse.id} className="list-card">
            <Link to={`/horses/${horse.id}/edit`} className="list-card-content" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="list-card-title">{horse.horseName}</div>
              <div className="list-card-meta">
                {horse.breed && <span>{horse.breed}</span>}
                {horse.age && <span>{horse.age} years</span>}
                {horse.horseLevel && <span>{horse.horseLevel}</span>}
                {horse.arrangement && <span>{horse.arrangement}</span>}
              </div>
            </Link>
            <div className="list-card-actions">
              <Link to={`/horses/${horse.id}/edit`} className="btn-icon" title="Edit">Edit</Link>
              <button className="btn-icon delete" title="Delete" onClick={() => setDeleteTarget(horse.id)}>Delete</button>
            </div>
          </div>
        ))
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>Delete Horse Profile</h3>
            <p>Are you sure you want to remove this horse? This action cannot be undone.</p>
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
