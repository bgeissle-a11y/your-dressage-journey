import { useState } from 'react';
import CoachCard from './CoachCard';
import AddCoachForm from './AddCoachForm';

export default function CoachSharingSection({ coaches, setCoaches, userId, showToast }) {
  const [showForm, setShowForm] = useState(false);

  const handleCoachAdded = (newCoach) => {
    setCoaches(prev => [...prev, newCoach]);
    setShowForm(false);
    showToast(`${newCoach.name} added`);
  };

  const handleCoachRemoved = (coachId) => {
    setCoaches(prev => prev.filter(c => c.id !== coachId));
  };

  const handleCoachUpdated = (coachId, updates) => {
    setCoaches(prev => prev.map(c => c.id === coachId ? { ...c, ...updates } : c));
  };

  return (
    <>
      <div className="settings-privacy-note" style={{ marginTop: 0, marginBottom: 18 }}>
        When sharing is on, your coach receives a weekly training summary — themes, focus areas,
        and questions you've flagged for them. They do <strong>not</strong> see your full reflections,
        raw notes, or personal debrief entries.
      </div>

      <div className="coach-list">
        {coaches.map(coach => (
          <CoachCard
            key={coach.id}
            coach={coach}
            userId={userId}
            showToast={showToast}
            onRemoved={handleCoachRemoved}
            onUpdated={handleCoachUpdated}
          />
        ))}
      </div>

      {!showForm && (
        <button className="add-coach-trigger" onClick={() => setShowForm(true)}>
          <span>+</span> Add a coach
        </button>
      )}

      {showForm && (
        <AddCoachForm
          userId={userId}
          existingCoaches={coaches}
          onAdded={handleCoachAdded}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="settings-privacy-note">
        You can withdraw sharing consent at any time by toggling off. Your coach will stop receiving
        briefs immediately. You can re-enable at any time.
      </div>
    </>
  );
}
