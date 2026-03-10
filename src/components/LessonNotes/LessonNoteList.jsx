import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getAllLessonNotes, deleteLessonNote, LESSON_TYPES } from '../../services';
import { exportToCSV, exportToJSON, EXPORT_COLUMNS } from '../../utils/exportUtils';
import '../Forms/Forms.css';
import './LessonNotes.css';

const LESSON_TYPE_LABELS = Object.fromEntries(LESSON_TYPES.map(t => [t.value, t.label]));

export default function LessonNoteList() {
  const { currentUser } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    loadNotes();
  }, [currentUser]);

  async function loadNotes() {
    if (!currentUser) return;
    setLoading(true);
    const result = await getAllLessonNotes(currentUser.uid);
    if (result.success) {
      // Exclude drafts from the main list display
      setNotes(result.data.filter(n => !n.isDraft));
    }
    setLoading(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await deleteLessonNote(deleteTarget);
    if (result.success) {
      setNotes(prev => prev.filter(n => n.id !== deleteTarget));
    }
    setDeleteTarget(null);
  }

  const filtered = notes.filter(n => {
    if (filter === 'all') return true;
    return n.lessonType === filter;
  });

  function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  }

  // Stats
  const instructors = new Set(notes.map(n => n.instructorName).filter(Boolean));
  const horsesSet = new Set(notes.map(n => n.horseId || n.horseName).filter(Boolean));

  if (loading) {
    return <div className="loading-state">Loading lesson notes...</div>;
  }

  return (
    <div className="list-page">
      <div className="list-page-header">
        <h1>Lesson Notes</h1>
        <div className="list-page-actions">
          {notes.length > 0 && (
            <>
              <button className="btn-export-sm" onClick={() => exportToCSV(notes, 'lesson-notes', EXPORT_COLUMNS.lessonNotes)}>CSV</button>
              <button className="btn-export-sm" onClick={() => exportToJSON(notes, 'lesson-notes')}>JSON</button>
            </>
          )}
          <Link to="/lesson-notes/new" className="btn-new">+ New Lesson Notes</Link>
        </div>
      </div>

      {notes.length === 0 ? (
        <div className="empty-state">
          <h3>No lesson notes yet</h3>
          <p>Add your first entry to start building your coaching library.</p>
          <Link to="/lesson-notes/new" className="btn-new">+ New Lesson Notes</Link>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="lesson-library-stats">
            <div className="lesson-stat-card">
              <div className="lesson-stat-number">{notes.length}</div>
              <div className="lesson-stat-label">Total Entries</div>
            </div>
            <div className="lesson-stat-card">
              <div className="lesson-stat-number">{instructors.size}</div>
              <div className="lesson-stat-label">Instructors</div>
            </div>
            <div className="lesson-stat-card">
              <div className="lesson-stat-number">{horsesSet.size}</div>
              <div className="lesson-stat-label">Horses</div>
            </div>
          </div>

          {/* Filters */}
          <div className="filter-bar">
            <button className={`filter-btn${filter === 'all' ? ' active' : ''}`} onClick={() => setFilter('all')}>All</button>
            {LESSON_TYPES.map(lt => (
              <button
                key={lt.value}
                className={`filter-btn${filter === lt.value ? ' active' : ''}`}
                onClick={() => setFilter(lt.value)}
              >
                {lt.label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <p>No lesson notes match this filter.</p>
            </div>
          ) : (
            filtered.map(note => (
              <div key={note.id} className="list-card">
                <Link to={`/lesson-notes/${note.id}/edit`} className="list-card-content" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="lesson-note-card-header">
                    <div className="lesson-note-card-meta">
                      <h3>{formatDate(note.lessonDate)} — {note.instructorName}</h3>
                      <p>{note.horseName}{note.linkedDebriefId ? ' \u00b7 Linked to debrief' : ''}</p>
                    </div>
                    <span className="lesson-type-badge">{LESSON_TYPE_LABELS[note.lessonType] || note.lessonType}</span>
                  </div>

                  {note.takeaways && note.takeaways.length > 0 ? (
                    <div className="lesson-note-takeaways">
                      {note.takeaways.map((t, i) => (
                        <div key={i} className="lesson-note-takeaway-item">
                          <div className="lesson-note-takeaway-num">{i + 1}</div>
                          <span>{t}</span>
                        </div>
                      ))}
                    </div>
                  ) : note.movementInstructions ? (
                    <div className="lesson-note-preview">
                      {note.movementInstructions.substring(0, 160)}{note.movementInstructions.length > 160 ? '...' : ''}
                    </div>
                  ) : null}
                </Link>
                <div className="list-card-actions">
                  <Link to={`/lesson-notes/${note.id}/edit`} className="btn-icon" title="Edit">Edit</Link>
                  <button className="btn-icon delete" title="Delete" onClick={() => setDeleteTarget(note.id)}>Delete</button>
                </div>
              </div>
            ))
          )}
        </>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>Delete Lesson Note</h3>
            <p>Are you sure you want to remove this lesson note? This action cannot be undone.</p>
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
