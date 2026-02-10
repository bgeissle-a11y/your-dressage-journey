import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  createEventPrepPlan, getEventPrepPlan, updateEventPrepPlan,
  getAllHorseProfiles,
  EVENT_PREP_TYPES, DRESSAGE_LEVELS, EVENT_PREP_STATUSES, DEFAULT_EQUIPMENT
} from '../../services';
import FormSection from '../Forms/FormSection';
import FormField from '../Forms/FormField';
import '../Forms/Forms.css';

export default function EventPrepForm() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [horseNames, setHorseNames] = useState([]);
  const [formData, setFormData] = useState({
    eventName: '',
    eventType: '',
    eventDate: '',
    eventEndDate: '',
    location: '',
    horseName: '',
    level: '',
    focusAreas: '',
    goals: [{ goal: '', priority: 'medium' }],
    warmUpPlan: '',
    rideTimePlan: '',
    coolDownPlan: '',
    arrivalTime: '',
    departureTime: '',
    travelNotes: '',
    status: 'planning'
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    loadHorses();
    if (id) loadExisting();
  }, [id, currentUser]);

  async function loadHorses() {
    if (!currentUser) return;
    const result = await getAllHorseProfiles(currentUser.uid);
    if (result.success) {
      setHorseNames(result.data.map(h => h.horseName).filter(Boolean));
    }
  }

  async function loadExisting() {
    if (!id) return;
    setLoadingData(true);
    const result = await getEventPrepPlan(id);
    if (result.success) {
      const d = result.data;
      setFormData({
        eventName: d.eventName || '',
        eventType: d.eventType || '',
        eventDate: d.eventDate || '',
        eventEndDate: d.eventEndDate || '',
        location: d.location || '',
        horseName: d.horseName || '',
        level: d.level || '',
        focusAreas: d.focusAreas || '',
        goals: d.goals && d.goals.length > 0 ? d.goals : [{ goal: '', priority: 'medium' }],
        warmUpPlan: d.warmUpPlan || '',
        rideTimePlan: d.rideTimePlan || '',
        coolDownPlan: d.coolDownPlan || '',
        arrivalTime: d.arrivalTime || '',
        departureTime: d.departureTime || '',
        travelNotes: d.travelNotes || '',
        status: d.status || 'planning'
      });
    }
    setLoadingData(false);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  }

  function handleGoalChange(index, field, value) {
    setFormData(prev => {
      const updated = [...prev.goals];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, goals: updated };
    });
  }

  function addGoal() {
    if (formData.goals.length >= 5) return;
    setFormData(prev => ({
      ...prev,
      goals: [...prev.goals, { goal: '', priority: 'medium' }]
    }));
  }

  function removeGoal(index) {
    if (formData.goals.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      goals: prev.goals.filter((_, i) => i !== index)
    }));
  }

  function validateForm() {
    const newErrors = {};
    if (!formData.eventName.trim()) newErrors.eventName = 'Event name is required';
    if (!formData.eventDate) newErrors.eventDate = 'Event date is required';
    if (!formData.eventType) newErrors.eventType = 'Please select an event type';
    const hasGoal = formData.goals.some(g => g.goal.trim());
    if (!hasGoal) newErrors.goals = 'At least one goal is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    const data = {
      ...formData,
      goals: formData.goals.filter(g => g.goal.trim()),
      equipmentList: isEdit ? undefined : [...DEFAULT_EQUIPMENT],
      prepTasks: isEdit ? undefined : [],
      tests: isEdit ? undefined : [],
      scores: isEdit ? undefined : [],
      postEventNotes: isEdit ? undefined : '',
      lessonsLearned: isEdit ? undefined : '',
      classEntries: isEdit ? undefined : '',
      organizerName: isEdit ? undefined : ''
    };

    // Remove undefined keys for edit
    Object.keys(data).forEach(key => {
      if (data[key] === undefined) delete data[key];
    });

    let result;
    if (isEdit) {
      result = await updateEventPrepPlan(id, data);
    } else {
      result = await createEventPrepPlan(currentUser.uid, data);
    }

    setLoading(false);

    if (result.success) {
      navigate('/event-prep');
    } else {
      setErrors({ submit: result.error });
    }
  }

  if (loadingData) {
    return <div className="loading-state">Loading event plan...</div>;
  }

  return (
    <div className="form-page">
      <div className="form-page-header">
        <h1>{isEdit ? 'Edit Event Preparation' : 'New Event Preparation'}</h1>
        <p>Create a personalized preparation roadmap</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-card">
          {errors.submit && <div className="form-section"><div className="form-alert form-alert-error">{errors.submit}</div></div>}

          {/* Section 1: Event Details */}
          <FormSection title="Event Details" description="What event are you preparing for?">
            <FormField label="Event Name" error={errors.eventName}>
              <input type="text" name="eventName" value={formData.eventName} onChange={handleChange} disabled={loading} className={errors.eventName ? 'error' : ''} placeholder="e.g., Spring Dressage Classic" />
            </FormField>
            <div className="form-row">
              <FormField label="Event Type" error={errors.eventType}>
                <select name="eventType" value={formData.eventType} onChange={handleChange} disabled={loading} className={errors.eventType ? 'error' : ''}>
                  <option value="">Select type...</option>
                  {EVENT_PREP_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </FormField>
              <FormField label="Status">
                <select name="status" value={formData.status} onChange={handleChange} disabled={loading}>
                  {EVENT_PREP_STATUSES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </FormField>
            </div>
            <div className="form-row">
              <FormField label="Event Date" error={errors.eventDate}>
                <input type="date" name="eventDate" value={formData.eventDate} onChange={handleChange} disabled={loading} className={errors.eventDate ? 'error' : ''} />
              </FormField>
              <FormField label="End Date" optional helpText="For multi-day events">
                <input type="date" name="eventEndDate" value={formData.eventEndDate} onChange={handleChange} disabled={loading} />
              </FormField>
            </div>
            <FormField label="Location" optional>
              <input type="text" name="location" value={formData.location} onChange={handleChange} disabled={loading} placeholder="Venue name or address" />
            </FormField>
          </FormSection>

          {/* Section 2: Horse & Level */}
          <FormSection title="Competition Details">
            <div className="form-row">
              <FormField label="Horse" optional>
                <input type="text" name="horseName" value={formData.horseName} onChange={handleChange} disabled={loading} placeholder="Horse name" list="prep-horse-names" />
                <datalist id="prep-horse-names">
                  {horseNames.map(name => <option key={name} value={name} />)}
                </datalist>
              </FormField>
              <FormField label="Dressage Level" optional>
                <select name="level" value={formData.level} onChange={handleChange} disabled={loading}>
                  <option value="">Select level...</option>
                  {DRESSAGE_LEVELS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </FormField>
            </div>
            <FormField label="Focus Areas" optional>
              <textarea name="focusAreas" value={formData.focusAreas} onChange={handleChange} disabled={loading} placeholder="What will you specifically focus on preparing?" style={{ minHeight: '80px' }} />
            </FormField>
          </FormSection>

          {/* Section 3: Goals */}
          <FormSection title="Goals" description="What do you want to achieve?">
            {errors.goals && <div className="form-alert form-alert-error" style={{ marginBottom: '1rem' }}>{errors.goals}</div>}
            {formData.goals.map((g, index) => (
              <div key={index} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div style={{ flex: 1 }}>
                  <input
                    type="text"
                    value={g.goal}
                    onChange={e => handleGoalChange(index, 'goal', e.target.value)}
                    disabled={loading}
                    placeholder={`Goal ${index + 1}${index === 0 ? ' (required)' : ''}`}
                  />
                </div>
                <select
                  value={g.priority}
                  onChange={e => handleGoalChange(index, 'priority', e.target.value)}
                  disabled={loading}
                  style={{ width: '120px' }}
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                {formData.goals.length > 1 && (
                  <button type="button" onClick={() => removeGoal(index)} disabled={loading} style={{
                    background: 'none', border: 'none', color: '#D0021B', cursor: 'pointer', fontSize: '1.2rem', padding: '6px'
                  }}>x</button>
                )}
              </div>
            ))}
            {formData.goals.length < 5 && (
              <button type="button" className="btn btn-secondary" onClick={addGoal} disabled={loading} style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
                + Add Goal
              </button>
            )}
          </FormSection>

          {/* Section 4: Day-of Plan */}
          <FormSection title="Day-of Plan" description="Strategy for event day (optional - fill in as you prepare)">
            <div className="form-row">
              <FormField label="Departure Time" optional>
                <input type="time" name="departureTime" value={formData.departureTime} onChange={handleChange} disabled={loading} />
              </FormField>
              <FormField label="Arrival Time" optional>
                <input type="time" name="arrivalTime" value={formData.arrivalTime} onChange={handleChange} disabled={loading} />
              </FormField>
            </div>
            <FormField label="Warm-Up Plan" optional>
              <textarea name="warmUpPlan" value={formData.warmUpPlan} onChange={handleChange} disabled={loading} placeholder="Your warm-up strategy and timing..." style={{ minHeight: '80px' }} />
            </FormField>
            <FormField label="Ride Plan" optional>
              <textarea name="rideTimePlan" value={formData.rideTimePlan} onChange={handleChange} disabled={loading} placeholder="Notes for during the ride..." style={{ minHeight: '80px' }} />
            </FormField>
            <FormField label="Cool-Down Plan" optional>
              <textarea name="coolDownPlan" value={formData.coolDownPlan} onChange={handleChange} disabled={loading} placeholder="Post-ride plan..." style={{ minHeight: '80px' }} />
            </FormField>
          </FormSection>

          {/* Section 5: Travel */}
          <FormSection title="Travel Notes" description="Optional logistics">
            <FormField label="Travel Notes" optional>
              <textarea name="travelNotes" value={formData.travelNotes} onChange={handleChange} disabled={loading} placeholder="Directions, trailer arrangements, overnight plans..." style={{ minHeight: '80px' }} />
            </FormField>
          </FormSection>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/event-prep')} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : (isEdit ? 'Update Plan' : 'Create Plan')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
