import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  createEventPrepPlan, getEventPrepPlan, updateEventPrepPlan,
  getAllHorseProfiles,
  EVENT_PREP_TYPES, EXPERIENCE_LEVELS, RIDING_FREQUENCIES,
  COACH_ACCESS_OPTIONS, AVAILABLE_RESOURCES, COACHING_VOICES, EVENT_PREP_STATUSES
} from '../../services';
import FormSection from '../Forms/FormSection';
import FormField from '../Forms/FormField';
import RadioGroup from '../Forms/RadioGroup';
import '../Forms/Forms.css';

const EMPTY_HORSE = {
  horseName: '',
  currentLevel: '',
  targetLevel: '',
  experience: '',
  challenges: '',
  progress: '',
  goal1: '', goal2: '', goal3: '',
  concern1: '', concern2: '', concern3: ''
};

const MAX_EVENT_MONTHS = 6;

export default function EventPrepForm() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const horseSectionRef = useRef(null);

  const [horseNames, setHorseNames] = useState([]);
  const [formData, setFormData] = useState({
    // Section 1: Event Details
    eventName: '',
    eventDate: '',
    eventType: '',
    eventTypeOther: '',
    location: '',
    eventDescription: '',
    // Section 2: Horses (multi-horse)
    horses: [{ ...EMPTY_HORSE }],
    // Section 3: Resources
    ridingFrequency: '',
    coachAccess: '',
    availableResources: [],
    constraints: '',
    // Section 4: Additional
    additionalInfo: '',
    preferredCoach: '',
    // Status
    status: 'planning'
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [dateFeedback, setDateFeedback] = useState(null);

  useEffect(() => {
    loadHorses();
    if (id) loadExisting();
  }, [id, currentUser]);

  // Update date feedback whenever eventDate changes
  useEffect(() => {
    if (formData.eventDate) {
      setDateFeedback(getDateFeedback(formData.eventDate));
    } else {
      setDateFeedback(null);
    }
  }, [formData.eventDate]);

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
      // d.horses is guaranteed by migrateToMultiHorse in the service
      const horses = (d.horses || []).map(h => ({
        horseName: h.horseName || '',
        currentLevel: h.currentLevel || '',
        targetLevel: h.targetLevel || '',
        experience: h.experience || '',
        challenges: h.challenges || '',
        progress: h.progress || '',
        goal1: (h.goals && h.goals[0]) || '',
        goal2: (h.goals && h.goals[1]) || '',
        goal3: (h.goals && h.goals[2]) || '',
        concern1: (h.concerns && h.concerns[0]) || '',
        concern2: (h.concerns && h.concerns[1]) || '',
        concern3: (h.concerns && h.concerns[2]) || ''
      }));

      setFormData({
        eventName: d.eventName || '',
        eventDate: d.eventDate || '',
        eventType: d.eventType || '',
        eventTypeOther: d.eventTypeOther || '',
        location: d.location || '',
        eventDescription: d.eventDescription || '',
        horses: horses.length > 0 ? horses : [{ ...EMPTY_HORSE }],
        ridingFrequency: d.ridingFrequency || '',
        coachAccess: d.coachAccess || '',
        availableResources: d.availableResources || [],
        constraints: d.constraints || '',
        additionalInfo: d.additionalInfo || '',
        preferredCoach: d.preferredCoach || '',
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

  function handleHorseChange(index, e) {
    const { name, value } = e.target;
    setFormData(prev => {
      const horses = prev.horses.map((h, i) =>
        i === index ? { ...h, [name]: value } : h
      );
      return { ...prev, horses };
    });
    const errorKey = `horses[${index}].${name}`;
    if (errors[errorKey]) setErrors(prev => ({ ...prev, [errorKey]: '' }));
  }

  function addHorseEntry() {
    setFormData(prev => ({
      ...prev,
      horses: [...prev.horses, { ...EMPTY_HORSE }]
    }));
    // Scroll to new entry after render
    setTimeout(() => {
      if (horseSectionRef.current) {
        const entries = horseSectionRef.current.querySelectorAll('.horse-entry');
        const last = entries[entries.length - 1];
        if (last) last.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }

  function removeHorseEntry(index) {
    const horse = formData.horses[index];
    const hasData = horse.horseName || horse.currentLevel || horse.goal1 ||
      horse.challenges || horse.progress;

    if (hasData && !window.confirm('Remove this horse entry? Any data entered will be lost.')) {
      return;
    }

    setFormData(prev => ({
      ...prev,
      horses: prev.horses.filter((_, i) => i !== index)
    }));

    // Clear errors for removed horse
    setErrors(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(key => {
        if (key.startsWith(`horses[${index}]`)) delete updated[key];
      });
      return updated;
    });
  }

  function handleResourceToggle(value) {
    setFormData(prev => {
      const current = prev.availableResources;
      const updated = current.includes(value)
        ? current.filter(r => r !== value)
        : [...current, value];
      return { ...prev, availableResources: updated };
    });
  }

  function getDateFeedback(dateStr) {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(dateStr + 'T00:00:00');
    const maxDate = new Date(today);
    maxDate.setMonth(maxDate.getMonth() + MAX_EVENT_MONTHS);

    if (eventDate < today) {
      return { valid: false, message: 'Event date must be today or in the future' };
    }
    if (eventDate > maxDate) {
      return { valid: false, message: `Events must be within ${MAX_EVENT_MONTHS} months` };
    }

    const diffMs = eventDate - today;
    const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const weeks = Math.round(daysUntil / 7);

    if (daysUntil === 0) return { valid: true, message: "That's today!" };
    if (daysUntil === 1) return { valid: true, message: "That's tomorrow — let's focus on final prep!" };
    if (daysUntil < 14) return { valid: true, message: `${daysUntil} days away — short timeline` };
    if (weeks <= 8) return { valid: true, message: `${weeks} weeks away — great lead time` };
    return { valid: true, message: `${weeks} weeks away — plenty of time to prepare` };
  }

  function validateForm() {
    const newErrors = {};
    if (!formData.eventName.trim()) newErrors.eventName = 'Event name is required';
    if (!formData.eventDate) {
      newErrors.eventDate = 'Event date is required';
    } else if (dateFeedback && !dateFeedback.valid) {
      newErrors.eventDate = dateFeedback.message;
    }
    if (!formData.eventType) newErrors.eventType = 'Please select an event type';
    if (formData.eventType === 'other' && !formData.eventTypeOther.trim()) {
      newErrors.eventTypeOther = 'Please specify the event type';
    }

    // Per-horse validation
    formData.horses.forEach((horse, i) => {
      if (!horse.horseName.trim()) {
        newErrors[`horses[${i}].horseName`] = 'Please select a horse';
      }
      if (!horse.currentLevel.trim()) {
        newErrors[`horses[${i}].currentLevel`] = 'Current level is required';
      }
      if (!horse.goal1.trim()) {
        newErrors[`horses[${i}].goal1`] = 'At least one goal is required';
      }
    });

    if (!formData.ridingFrequency) newErrors.ridingFrequency = 'Please select riding frequency';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    const horses = formData.horses.map(h => ({
      horseName: h.horseName,
      currentLevel: h.currentLevel,
      targetLevel: h.targetLevel,
      experience: h.experience,
      challenges: h.challenges,
      progress: h.progress,
      goals: [h.goal1, h.goal2, h.goal3].filter(Boolean),
      concerns: [h.concern1, h.concern2, h.concern3].filter(Boolean)
    }));

    const data = {
      eventName: formData.eventName,
      eventDate: formData.eventDate,
      eventType: formData.eventType,
      eventTypeOther: formData.eventType === 'other' ? formData.eventTypeOther : '',
      location: formData.location,
      eventDescription: formData.eventDescription,
      horses,
      horseNames: horses.map(h => h.horseName).filter(Boolean),
      ridingFrequency: formData.ridingFrequency,
      coachAccess: formData.coachAccess,
      availableResources: formData.availableResources,
      constraints: formData.constraints,
      additionalInfo: formData.additionalInfo,
      preferredCoach: formData.preferredCoach,
      status: formData.status
    };

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
        <h1>{isEdit ? 'Edit Event Preparation' : 'Event Preparation Planner'}</h1>
        <p>Let's create your personalized preparation roadmap for success</p>
      </div>

      <form onSubmit={handleSubmit} autoComplete="off">
        <div className="form-card">
          {errors.submit && <div className="form-section"><div className="form-alert form-alert-error">{errors.submit}</div></div>}

          {/* Section 1: Event Details */}
          <FormSection title="Event Details" description="Tell us about the experience you're preparing for">
            <FormField label="Event Name" error={errors.eventName}>
              <input type="text" name="eventName" value={formData.eventName} onChange={handleChange} disabled={loading} className={errors.eventName ? 'error' : ''} placeholder="e.g., Spring Championship Show, Jane Smith Clinic, First Lesson with New Trainer" />
            </FormField>
            <div className="form-row">
              <FormField label="Event Date" error={errors.eventDate}>
                <input type="date" name="eventDate" value={formData.eventDate} onChange={handleChange} disabled={loading} className={errors.eventDate ? 'error' : ''} />
                {dateFeedback && (
                  <div className={`date-feedback ${dateFeedback.valid ? 'valid' : 'invalid'}`}>
                    {dateFeedback.message}
                  </div>
                )}
              </FormField>
              <FormField label="Event Type" error={errors.eventType}>
                <select name="eventType" value={formData.eventType} onChange={handleChange} disabled={loading} className={errors.eventType ? 'error' : ''}>
                  <option value="">Select type...</option>
                  {EVENT_PREP_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </FormField>
            </div>
            {formData.eventType === 'other' && (
              <FormField label="Please specify" error={errors.eventTypeOther}>
                <input type="text" name="eventTypeOther" value={formData.eventTypeOther} onChange={handleChange} disabled={loading} className={errors.eventTypeOther ? 'error' : ''} placeholder="Describe the event type" />
              </FormField>
            )}
            <FormField label="Location" optional>
              <input type="text" name="location" value={formData.location} onChange={handleChange} disabled={loading} placeholder="Venue name or city" />
            </FormField>
            <FormField label="Additional Event Details" optional>
              <textarea name="eventDescription" value={formData.eventDescription} onChange={handleChange} disabled={loading} placeholder="Any other relevant details about this event (multi-day format, specific tests/classes, clinician background, etc.)" style={{ minHeight: '80px' }} />
            </FormField>
            {isEdit && (
              <FormField label="Status">
                <select name="status" value={formData.status} onChange={handleChange} disabled={loading}>
                  {EVENT_PREP_STATUSES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </FormField>
            )}
          </FormSection>

          {/* Section 2: Horses for This Event */}
          <FormSection
            title={<>Horses for This Event <span className="horse-count-badge">{formData.horses.length} {formData.horses.length === 1 ? 'horse' : 'horses'}</span></>}
            description="Add each horse you're bringing to this event with their specific context, goals, and concerns"
          >
            <div className="horse-entries-container" ref={horseSectionRef}>
              {formData.horses.map((horse, index) => (
                <div key={index} className="horse-entry">
                  <div className="horse-entry-header">
                    <div className="horse-entry-label">
                      <span className="horse-icon">&#x1F40E;</span>
                      <span>Horse {index + 1}{horse.horseName ? `: ${horse.horseName}` : ''}</span>
                    </div>
                    {formData.horses.length > 1 && (
                      <button
                        type="button"
                        className="remove-horse-btn"
                        onClick={() => removeHorseEntry(index)}
                        disabled={loading}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {/* Horse Selection + Levels */}
                  <FormField label="Horse" error={errors[`horses[${index}].horseName`]}>
                    {horseNames.length > 0 ? (
                      <select name="horseName" value={horse.horseName} onChange={e => handleHorseChange(index, e)} disabled={loading} className={errors[`horses[${index}].horseName`] ? 'error' : ''}>
                        <option value="">Select horse...</option>
                        {horseNames.map(name => <option key={name} value={name}>{name}</option>)}
                      </select>
                    ) : (
                      <input type="text" name="horseName" value={horse.horseName} onChange={e => handleHorseChange(index, e)} disabled={loading} className={errors[`horses[${index}].horseName`] ? 'error' : ''} placeholder="Horse name" />
                    )}
                  </FormField>
                  <div className="form-row">
                    <FormField label="Current Level/Stage" error={errors[`horses[${index}].currentLevel`]}>
                      <input type="text" name="currentLevel" value={horse.currentLevel} onChange={e => handleHorseChange(index, e)} disabled={loading} className={errors[`horses[${index}].currentLevel`] ? 'error' : ''} placeholder="e.g., Training Level, 2nd Level, PSG" />
                    </FormField>
                    <FormField label="Level for This Event" optional helpText="If different from current level">
                      <input type="text" name="targetLevel" value={horse.targetLevel} onChange={e => handleHorseChange(index, e)} disabled={loading} placeholder="e.g., Moving up to First Level" />
                    </FormField>
                  </div>
                  <FormField label="What's your experience with this type of event on this horse?" optional>
                    <RadioGroup name="experience" options={EXPERIENCE_LEVELS} value={horse.experience} onChange={e => handleHorseChange(index, e)} disabled={loading} />
                  </FormField>
                  <FormField label="Current Technical or Physical Challenges" optional>
                    <textarea name="challenges" value={horse.challenges} onChange={e => handleHorseChange(index, e)} disabled={loading} placeholder="Describe any specific movements, patterns, or physical issues you're working through right now" style={{ minHeight: '100px' }} />
                  </FormField>
                  <FormField label="Recent Progress or Breakthroughs" optional>
                    <textarea name="progress" value={horse.progress} onChange={e => handleHorseChange(index, e)} disabled={loading} placeholder="Any recent improvements, aha moments, or wins to build on" style={{ minHeight: '80px' }} />
                  </FormField>

                  {/* Per-Horse Goals */}
                  <div className="horse-sub-section">
                    <div className="horse-sub-section-title">Goals for {horse.horseName || `Horse ${index + 1}`}</div>
                    <div style={{
                      background: '#FAF8F5',
                      borderLeft: '4px solid #C67B5C',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      marginBottom: '1rem',
                      fontSize: '0.88rem',
                      color: '#7A7A7A',
                      lineHeight: 1.5
                    }}>
                      <strong style={{ color: '#3A3A3A' }}>Tip:</strong> Good goals are specific and measurable. Instead of "do well," try "score 62% or higher" or "execute clean lead changes."
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
                      <div className="goal-number-badge">1</div>
                      <div style={{ flex: 1 }}>
                        <input type="text" name="goal1" value={horse.goal1} onChange={e => handleHorseChange(index, e)} disabled={loading} placeholder="Primary goal" className={errors[`horses[${index}].goal1`] ? 'error' : ''} />
                        {errors[`horses[${index}].goal1`] && <div className="form-error">{errors[`horses[${index}].goal1`]}</div>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
                      <div className="goal-number-badge">2</div>
                      <input type="text" name="goal2" value={horse.goal2} onChange={e => handleHorseChange(index, e)} disabled={loading} placeholder="Second goal (optional)" style={{ flex: 1 }} />
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
                      <div className="goal-number-badge">3</div>
                      <input type="text" name="goal3" value={horse.goal3} onChange={e => handleHorseChange(index, e)} disabled={loading} placeholder="Third goal (optional)" style={{ flex: 1 }} />
                    </div>
                  </div>

                  {/* Per-Horse Concerns */}
                  <div className="horse-sub-section">
                    <div className="horse-sub-section-title">Concerns for {horse.horseName || `Horse ${index + 1}`}</div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
                      <div className="concern-number-badge">1</div>
                      <input type="text" name="concern1" value={horse.concern1} onChange={e => handleHorseChange(index, e)} disabled={loading} placeholder="Primary concern (optional)" style={{ flex: 1 }} />
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
                      <div className="concern-number-badge">2</div>
                      <input type="text" name="concern2" value={horse.concern2} onChange={e => handleHorseChange(index, e)} disabled={loading} placeholder="Second concern (optional)" style={{ flex: 1 }} />
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
                      <div className="concern-number-badge">3</div>
                      <input type="text" name="concern3" value={horse.concern3} onChange={e => handleHorseChange(index, e)} disabled={loading} placeholder="Third concern (optional)" style={{ flex: 1 }} />
                    </div>
                  </div>
                </div>
              ))}

              <button type="button" className="add-horse-btn" onClick={addHorseEntry} disabled={loading}>
                <span className="plus-icon">+</span>
                Add Another Horse
              </button>
            </div>
          </FormSection>

          {/* Section 3: Resources & Preparation Time */}
          <FormSection title="Resources & Preparation Time" description="Help us tailor your plan to your available resources">
            <FormField label="How many days per week can you typically ride between now and the event?" error={errors.ridingFrequency}>
              <select name="ridingFrequency" value={formData.ridingFrequency} onChange={handleChange} disabled={loading} className={errors.ridingFrequency ? 'error' : ''}>
                <option value="">Select...</option>
                {RIDING_FREQUENCIES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </FormField>
            <FormField label="Do you have regular access to a trainer/coach?" optional>
              <RadioGroup name="coachAccess" options={COACH_ACCESS_OPTIONS} value={formData.coachAccess} onChange={handleChange} disabled={loading} />
            </FormField>
            <FormField label="What resources do you have available?" optional>
              <div className="checkbox-group" style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginTop: '10px' }}>
                {AVAILABLE_RESOURCES.map(res => (
                  <label key={res.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.availableResources.includes(res.value)}
                      onChange={() => handleResourceToggle(res.value)}
                      disabled={loading}
                      style={{ width: '20px', height: '20px', accentColor: '#8B7355' }}
                    />
                    <span style={{ fontSize: '0.95rem' }}>{res.label}</span>
                  </label>
                ))}
              </div>
            </FormField>
            <FormField label="Time or Resource Constraints" optional>
              <textarea name="constraints" value={formData.constraints} onChange={handleChange} disabled={loading} placeholder="Any limitations we should know about (travel schedule, horse soundness issues, weather-dependent arena access, etc.)" style={{ minHeight: '80px' }} />
            </FormField>
          </FormSection>

          {/* Section 4: Logistics */}
          <FormSection title="Logistics" description="Packing and preparation tools for show day">
            <button
              type="button"
              className="packing-list-btn"
              onClick={() => window.open('/packing-list.html', '_blank')}
            >
              🧳 Open Packing List
            </button>
          </FormSection>

          {/* Section 5: Anything Else? */}
          <FormSection title="Anything Else?" description="Share any other context that would help us create your ideal preparation plan">
            <FormField label="Additional Information" optional>
              <textarea name="additionalInfo" value={formData.additionalInfo} onChange={handleChange} disabled={loading} placeholder="Mental game focus areas, past experiences with similar events, specific people you're riding with/against, anxiety triggers, motivation strategies that work for you, etc." style={{ minHeight: '120px' }} />
              <div style={{ fontSize: '0.85rem', color: '#7A7A7A', textAlign: 'right', marginTop: '5px' }}>
                {formData.additionalInfo.length} characters
              </div>
            </FormField>
            <FormField label="Preferred Coaching Voice" optional>
              <select name="preferredCoach" value={formData.preferredCoach} onChange={handleChange} disabled={loading}>
                {COACHING_VOICES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </FormField>
          </FormSection>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/event-prep')} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : (isEdit ? 'Update Plan' : 'Generate My Preparation Plan')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
