import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  getEventPrepPlan, updateEventPrepPlan,
  EVENT_PREP_TYPES, DRESSAGE_LEVELS, EVENT_PREP_STATUSES
} from '../../services';
import '../Forms/Forms.css';

const TYPE_LABELS = Object.fromEntries(EVENT_PREP_TYPES.map(t => [t.value, t.label]));
const LEVEL_LABELS = Object.fromEntries(DRESSAGE_LEVELS.map(l => [l.value, l.label]));
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
    const diff = Math.ceil((event - now) / (1000 * 60 * 60 * 24));
    return diff;
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

  return (
    <div className="form-page">
      <div className="form-page-header">
        <h1>{plan.eventName}</h1>
        <p>
          {TYPE_LABELS[plan.eventType] || plan.eventType}
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
                {plan.eventEndDate && ` - ${formatDate(plan.eventEndDate)}`}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                {plan.horseName && <span style={{ fontSize: '0.9rem', color: '#7A7A7A' }}>{plan.horseName}</span>}
                {plan.level && <span style={{ fontSize: '0.9rem', color: '#7A7A7A' }}>{LEVEL_LABELS[plan.level] || plan.level}</span>}
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

        {/* Goals */}
        {plan.goals && plan.goals.length > 0 && (
          <div className="form-section">
            <div className="form-section-header">
              <h2 className="form-section-title">Goals</h2>
            </div>
            {plan.goals.map((g, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 0',
                borderBottom: i < plan.goals.length - 1 ? '1px solid #F0EBE3' : 'none'
              }}>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  background: g.priority === 'high' ? '#D0021B20' : g.priority === 'low' ? '#7ED32120' : '#F5A62320',
                  color: g.priority === 'high' ? '#D0021B' : g.priority === 'low' ? '#6B8E5F' : '#C67B5C'
                }}>
                  {g.priority}
                </span>
                <span>{g.goal}</span>
              </div>
            ))}
          </div>
        )}

        {/* Focus Areas */}
        {plan.focusAreas && (
          <div className="form-section">
            <div className="form-section-header">
              <h2 className="form-section-title">Focus Areas</h2>
            </div>
            <p style={{ color: '#3A3A3A', lineHeight: 1.6 }}>{plan.focusAreas}</p>
          </div>
        )}

        {/* Day-of Plan */}
        {(plan.warmUpPlan || plan.rideTimePlan || plan.coolDownPlan || plan.arrivalTime) && (
          <div className="form-section">
            <div className="form-section-header">
              <h2 className="form-section-title">Day-of Plan</h2>
            </div>
            {(plan.departureTime || plan.arrivalTime) && (
              <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem' }}>
                {plan.departureTime && <div><strong>Depart:</strong> {plan.departureTime}</div>}
                {plan.arrivalTime && <div><strong>Arrive:</strong> {plan.arrivalTime}</div>}
              </div>
            )}
            {plan.warmUpPlan && <div style={{ marginBottom: '1rem' }}><strong>Warm-Up:</strong><p style={{ marginTop: '0.25rem', color: '#3A3A3A' }}>{plan.warmUpPlan}</p></div>}
            {plan.rideTimePlan && <div style={{ marginBottom: '1rem' }}><strong>Ride Plan:</strong><p style={{ marginTop: '0.25rem', color: '#3A3A3A' }}>{plan.rideTimePlan}</p></div>}
            {plan.coolDownPlan && <div><strong>Cool-Down:</strong><p style={{ marginTop: '0.25rem', color: '#3A3A3A' }}>{plan.coolDownPlan}</p></div>}
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

        {/* Travel Notes */}
        {plan.travelNotes && (
          <div className="form-section">
            <div className="form-section-header">
              <h2 className="form-section-title">Travel Notes</h2>
            </div>
            <p style={{ color: '#3A3A3A', lineHeight: 1.6 }}>{plan.travelNotes}</p>
          </div>
        )}

        {/* Post-Event (only show for completed) */}
        {plan.status === 'completed' && (
          <div className="form-section">
            <div className="form-section-header">
              <h2 className="form-section-title">Post-Event</h2>
            </div>
            {plan.postEventNotes && <div style={{ marginBottom: '1rem' }}><strong>Notes:</strong><p style={{ marginTop: '0.25rem' }}>{plan.postEventNotes}</p></div>}
            {plan.lessonsLearned && <div style={{ marginBottom: '1rem' }}><strong>Lessons Learned:</strong><p style={{ marginTop: '0.25rem' }}>{plan.lessonsLearned}</p></div>}
            {plan.scores && plan.scores.length > 0 && (
              <div>
                <strong>Scores:</strong>
                {plan.scores.map((s, i) => (
                  <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #F0EBE3' }}>
                    <div>{s.testName}: <strong>{s.score}</strong>{s.placing && ` (${s.placing})`}</div>
                    {s.judgeComments && <div style={{ fontSize: '0.9rem', color: '#7A7A7A', fontStyle: 'italic' }}>{s.judgeComments}</div>}
                  </div>
                ))}
              </div>
            )}
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
