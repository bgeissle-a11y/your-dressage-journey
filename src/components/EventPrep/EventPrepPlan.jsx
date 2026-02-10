import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  getEventPrepPlan, updateEventPrepPlan,
  EVENT_PREP_TYPES, EXPERIENCE_LEVELS, RIDING_FREQUENCIES,
  COACH_ACCESS_OPTIONS, AVAILABLE_RESOURCES, COACHING_VOICES, EVENT_PREP_STATUSES
} from '../../services';
import '../Forms/Forms.css';

const TYPE_LABELS = Object.fromEntries(EVENT_PREP_TYPES.map(t => [t.value, t.label]));
const EXP_LABELS = Object.fromEntries(EXPERIENCE_LEVELS.map(e => [e.value, e.label]));
const FREQ_LABELS = Object.fromEntries(RIDING_FREQUENCIES.map(f => [f.value, f.label]));
const COACH_LABELS = Object.fromEntries(COACH_ACCESS_OPTIONS.map(c => [c.value, c.label]));
const RESOURCE_LABELS = Object.fromEntries(AVAILABLE_RESOURCES.map(r => [r.value, r.label]));
const VOICE_LABELS = Object.fromEntries(COACHING_VOICES.filter(v => v.value).map(v => [v.value, v.label]));
const STATUS_LABELS = Object.fromEntries(EVENT_PREP_STATUSES.map(s => [s.value, s.label]));

const EQUIPMENT_CATEGORIES = {
  tack: 'Tack',
  'rider-attire': 'Rider Attire',
  aids: 'Aids',
  'horse-care': 'Horse Care',
  documents: 'Documents'
};

export default function EventPrepPlan() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();

  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlan();
  }, [id]);

  async function loadPlan() {
    if (!id) return;
    setLoading(true);
    const result = await getEventPrepPlan(id);
    if (result.success) {
      setPlan(result.data);
    }
    setLoading(false);
  }

  async function toggleEquipment(index) {
    if (!plan) return;
    const updated = [...plan.equipmentList];
    updated[index] = { ...updated[index], packed: !updated[index].packed };
    setPlan(prev => ({ ...prev, equipmentList: updated }));
    await updateEventPrepPlan(id, { equipmentList: updated });
  }

  async function toggleTask(index) {
    if (!plan) return;
    const updated = [...plan.prepTasks];
    updated[index] = { ...updated[index], completed: !updated[index].completed };
    setPlan(prev => ({ ...prev, prepTasks: updated }));
    await updateEventPrepPlan(id, { prepTasks: updated });
  }

  function daysUntilEvent() {
    if (!plan?.eventDate) return null;
    const now = new Date();
    const event = new Date(plan.eventDate + 'T00:00:00');
    return Math.ceil((event - now) / (1000 * 60 * 60 * 24));
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  if (loading) {
    return <div className="loading-state">Loading preparation plan...</div>;
  }

  if (!plan) {
    return (
      <div className="empty-state">
        <h3>Plan not found</h3>
        <Link to="/event-prep" className="btn-new">Back to Event Preps</Link>
      </div>
    );
  }

  const days = daysUntilEvent();
  const equipmentByCategory = {};
  (plan.equipmentList || []).forEach((item, index) => {
    const cat = item.category || 'other';
    if (!equipmentByCategory[cat]) equipmentByCategory[cat] = [];
    equipmentByCategory[cat].push({ ...item, _index: index });
  });

  const packedCount = (plan.equipmentList || []).filter(e => e.packed).length;
  const totalEquipment = (plan.equipmentList || []).length;
  const completedTasks = (plan.prepTasks || []).filter(t => t.completed).length;
  const totalTasks = (plan.prepTasks || []).length;

  const eventTypeLabel = plan.eventType === 'other'
    ? (plan.eventTypeOther || 'Other')
    : (TYPE_LABELS[plan.eventType] || plan.eventType);

  return (
    <div className="form-page">
      <div className="form-page-header">
        <h1>{plan.eventName}</h1>
        <p>
          {eventTypeLabel}
          {plan.location && ` at ${plan.location}`}
        </p>
      </div>

      <div className="form-card">
        {/* Event Overview */}
        <div className="form-section">
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#3A3A3A' }}>
                {formatDate(plan.eventDate)}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                {plan.horseName && <span style={{ fontSize: '0.9rem', color: '#7A7A7A' }}>{plan.horseName}</span>}
                {plan.currentLevel && <span style={{ fontSize: '0.9rem', color: '#7A7A7A' }}>{plan.currentLevel}</span>}
                {plan.eventExperience && <span style={{ fontSize: '0.9rem', color: '#7A7A7A' }}>{EXP_LABELS[plan.eventExperience] || plan.eventExperience}</span>}
                <span className={`status-badge status-${plan.status === 'completed' ? 'resolved' : plan.status === 'planning' ? 'active' : 'ongoing'}`}>
                  {STATUS_LABELS[plan.status] || plan.status}
                </span>
              </div>
            </div>
            {days !== null && days >= 0 && (
              <div style={{ textAlign: 'center', padding: '12px 20px', background: '#FAF8F5', borderRadius: '12px', border: '1px solid #E0D5C7' }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', fontWeight: 600, color: '#8B7355' }}>{days}</div>
                <div style={{ fontSize: '0.8rem', color: '#7A7A7A' }}>days to go</div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Link to={`/event-prep/${id}/edit`} className="btn btn-secondary" style={{ textDecoration: 'none', fontSize: '0.9rem', padding: '8px 16px' }}>Edit Details</Link>
          </div>
        </div>

        {/* Context */}
        {(plan.targetLevel || plan.currentChallenges || plan.recentProgress) && (
          <div className="form-section">
            <div className="form-section-header">
              <h2 className="form-section-title">Context</h2>
            </div>
            {plan.targetLevel && <div style={{ marginBottom: '0.75rem' }}><strong>Target Level:</strong> {plan.targetLevel}</div>}
            {plan.currentChallenges && <div style={{ marginBottom: '0.75rem' }}><strong>Current Challenges:</strong><p style={{ marginTop: '0.25rem', color: '#3A3A3A', lineHeight: 1.6 }}>{plan.currentChallenges}</p></div>}
            {plan.recentProgress && <div style={{ marginBottom: '0.75rem' }}><strong>Recent Progress:</strong><p style={{ marginTop: '0.25rem', color: '#3A3A3A', lineHeight: 1.6 }}>{plan.recentProgress}</p></div>}
          </div>
        )}

        {/* Goals */}
        {plan.goals && plan.goals.length > 0 && (
          <div className="form-section">
            <div className="form-section-header">
              <h2 className="form-section-title">Goals</h2>
            </div>
            {plan.goals.map((goal, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 0',
                borderBottom: i < plan.goals.length - 1 ? '1px solid #F0EBE3' : 'none'
              }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: '#D4A574', color: 'white', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontWeight: 600, fontSize: '0.85rem', flexShrink: 0
                }}>{i + 1}</div>
                <span>{goal}</span>
              </div>
            ))}
          </div>
        )}

        {/* Concerns */}
        {plan.concerns && plan.concerns.length > 0 && (
          <div className="form-section">
            <div className="form-section-header">
              <h2 className="form-section-title">Concerns</h2>
            </div>
            {plan.concerns.map((concern, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 0',
                borderBottom: i < plan.concerns.length - 1 ? '1px solid #F0EBE3' : 'none'
              }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: '#C67B5C', color: 'white', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontWeight: 600, fontSize: '0.85rem', flexShrink: 0
                }}>{i + 1}</div>
                <span>{concern}</span>
              </div>
            ))}
          </div>
        )}

        {/* Resources */}
        {(plan.ridingFrequency || plan.coachAccess || (plan.availableResources && plan.availableResources.length > 0)) && (
          <div className="form-section">
            <div className="form-section-header">
              <h2 className="form-section-title">Resources</h2>
            </div>
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              {plan.ridingFrequency && <div><strong>Riding:</strong> {FREQ_LABELS[plan.ridingFrequency] || plan.ridingFrequency}</div>}
              {plan.coachAccess && <div><strong>Coach:</strong> {COACH_LABELS[plan.coachAccess] || plan.coachAccess}</div>}
            </div>
            {plan.availableResources && plan.availableResources.length > 0 && (
              <div style={{ marginBottom: '0.75rem' }}>
                <strong>Available:</strong>{' '}
                {plan.availableResources.map(r => RESOURCE_LABELS[r] || r).join(', ')}
              </div>
            )}
            {plan.constraints && <div><strong>Constraints:</strong><p style={{ marginTop: '0.25rem', color: '#3A3A3A', lineHeight: 1.6 }}>{plan.constraints}</p></div>}
          </div>
        )}

        {/* Additional Info */}
        {(plan.eventDescription || plan.additionalInfo || plan.preferredCoach) && (
          <div className="form-section">
            <div className="form-section-header">
              <h2 className="form-section-title">Additional Details</h2>
            </div>
            {plan.eventDescription && <div style={{ marginBottom: '0.75rem' }}><strong>Event Details:</strong><p style={{ marginTop: '0.25rem', color: '#3A3A3A', lineHeight: 1.6 }}>{plan.eventDescription}</p></div>}
            {plan.additionalInfo && <div style={{ marginBottom: '0.75rem' }}><strong>Additional Context:</strong><p style={{ marginTop: '0.25rem', color: '#3A3A3A', lineHeight: 1.6 }}>{plan.additionalInfo}</p></div>}
            {plan.preferredCoach && <div><strong>Coaching Voice:</strong> {VOICE_LABELS[plan.preferredCoach] || plan.preferredCoach}</div>}
          </div>
        )}

        {/* Preparation Tasks */}
        {totalTasks > 0 && (
          <div className="form-section">
            <div className="form-section-header">
              <h2 className="form-section-title">Preparation Tasks ({completedTasks}/{totalTasks})</h2>
            </div>
            {plan.prepTasks.map((task, index) => (
              <div key={index} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 0',
                borderBottom: '1px solid #F0EBE3',
                opacity: task.completed ? 0.6 : 1
              }}>
                <input
                  type="checkbox"
                  checked={task.completed || false}
                  onChange={() => toggleTask(index)}
                  style={{ accentColor: '#8B7355' }}
                />
                <span style={{ textDecoration: task.completed ? 'line-through' : 'none', flex: 1 }}>{task.task}</span>
                {task.dueDate && <span style={{ fontSize: '0.82rem', color: '#7A7A7A' }}>{task.dueDate}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Equipment Checklist */}
        {totalEquipment > 0 && (
          <div className="form-section">
            <div className="form-section-header">
              <h2 className="form-section-title">Equipment Checklist ({packedCount}/{totalEquipment})</h2>
            </div>
            {Object.entries(equipmentByCategory).map(([cat, items]) => (
              <div key={cat} style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#8B7355', marginBottom: '0.5rem' }}>
                  {EQUIPMENT_CATEGORIES[cat] || cat}
                </h3>
                {items.map(item => (
                  <div key={item._index} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '6px 0',
                    opacity: item.packed ? 0.6 : 1
                  }}>
                    <input
                      type="checkbox"
                      checked={item.packed}
                      onChange={() => toggleEquipment(item._index)}
                      style={{ accentColor: '#6B8E5F' }}
                    />
                    <span style={{ textDecoration: item.packed ? 'line-through' : 'none' }}>{item.item}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/event-prep')}>
            Back to List
          </button>
        </div>
      </div>
    </div>
  );
}
