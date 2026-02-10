import { useState, useEffect } from 'react';
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
import CheckboxGroup from '../Forms/CheckboxGroup';
import '../Forms/Forms.css';

export default function EventPrepForm() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [horseNames, setHorseNames] = useState([]);
  const [formData, setFormData] = useState({
    // Section 1: Event Details
    eventName: '',
    eventDate: '',
    eventType: '',
    eventTypeOther: '',
    location: '',
    eventDescription: '',
    // Section 2: Current Context
    horseName: '',
    currentLevel: '',
    targetLevel: '',
    eventExperience: '',
    currentChallenges: '',
    recentProgress: '',
    // Section 3: Goals
    goal1: '',
    goal2: '',
    goal3: '',
    // Section 4: Concerns
    concern1: '',
    concern2: '',
    concern3: '',
    // Section 5: Resources
    ridingFrequency: '',
    coachAccess: '',
    availableResources: [],
    constraints: '',
    // Section 6: Additional
    additionalInfo: '',
    preferredCoach: '',
    // Status
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
        eventDate: d.eventDate || '',
        eventType: d.eventType || '',
        eventTypeOther: d.eventTypeOther || '',
        location: d.location || '',
        eventDescription: d.eventDescription || '',
        horseName: d.horseName || '',
        currentLevel: d.currentLevel || '',
        targetLevel: d.targetLevel || '',
        eventExperience: d.eventExperience || '',
        currentChallenges: d.currentChallenges || '',
        recentProgress: d.recentProgress || '',
        goal1: (d.goals && d.goals[0]) || '',
        goal2: (d.goals && d.goals[1]) || '',
        goal3: (d.goals && d.goals[2]) || '',
        concern1: (d.concerns && d.concerns[0]) || '',
        concern2: (d.concerns && d.concerns[1]) || '',
        concern3: (d.concerns && d.concerns[2]) || '',
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

  function handleResourceToggle(value) {
    setFormData(prev => {
      const current = prev.availableResources;
      const updated = current.includes(value)
        ? current.filter(r => r !== value)
        : [...current, value];
      return { ...prev, availableResources: updated };
    });
  }

  function validateForm() {
    const newErrors = {};
    if (!formData.eventName.trim()) newErrors.eventName = 'Event name is required';
    if (!formData.eventDate) newErrors.eventDate = 'Event date is required';
    if (!formData.eventType) newErrors.eventType = 'Please select an event type';
    if (formData.eventType === 'other' && !formData.eventTypeOther.trim()) {
      newErrors.eventTypeOther = 'Please specify the event type';
    }
    if (!formData.horseName.trim()) newErrors.horseName = 'Please select a horse';
    if (!formData.currentLevel.trim()) newErrors.currentLevel = 'Current level is required';
    if (!formData.goal1.trim()) newErrors.goal1 = 'At least one goal is required';
    if (!formData.ridingFrequency) newErrors.ridingFrequency = 'Please select riding frequency';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    const data = {
      eventName: formData.eventName,
      eventDate: formData.eventDate,
      eventType: formData.eventType,
      eventTypeOther: formData.eventType === 'other' ? formData.eventTypeOther : '',
      location: formData.location,
      eventDescription: formData.eventDescription,
      horseName: formData.horseName,
      currentLevel: formData.currentLevel,
      targetLevel: formData.targetLevel,
      eventExperience: formData.eventExperience,
      currentChallenges: formData.currentChallenges,
      recentProgress: formData.recentProgress,
      goals: [formData.goal1, formData.goal2, formData.goal3].filter(Boolean),
      concerns: [formData.concern1, formData.concern2, formData.concern3].filter(Boolean),
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

      <form onSubmit={handleSubmit}>
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

          {/* Section 2: Current Context */}
          <FormSection title="Your Current Context" description="Help us understand where you are right now">
            <FormField label="Horse for This Event" error={errors.horseName}>
              {horseNames.length > 0 ? (
                <select name="horseName" value={formData.horseName} onChange={handleChange} disabled={loading} className={errors.horseName ? 'error' : ''}>
                  <option value="">Select horse...</option>
                  {horseNames.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
              ) : (
                <>
                  <input type="text" name="horseName" value={formData.horseName} onChange={handleChange} disabled={loading} className={errors.horseName ? 'error' : ''} placeholder="Horse name" />
                </>
              )}
            </FormField>
            <FormField label="Current Level/Stage" error={errors.currentLevel}>
              <input type="text" name="currentLevel" value={formData.currentLevel} onChange={handleChange} disabled={loading} className={errors.currentLevel ? 'error' : ''} placeholder="e.g., Training Level, 2nd Level, PSG" />
            </FormField>
            <FormField label="Level for This Event" optional helpText="If different from current level">
              <input type="text" name="targetLevel" value={formData.targetLevel} onChange={handleChange} disabled={loading} placeholder="e.g., Moving up to First Level, Intermediate 1" />
            </FormField>
            <FormField label="What's your experience with this type of event?" optional>
              <RadioGroup name="eventExperience" options={EXPERIENCE_LEVELS} value={formData.eventExperience} onChange={handleChange} disabled={loading} />
            </FormField>
            <FormField label="Current Technical or Physical Challenges" optional>
              <textarea name="currentChallenges" value={formData.currentChallenges} onChange={handleChange} disabled={loading} placeholder="Describe any specific movements, patterns, or physical issues you're working through right now (e.g., inconsistent tempi changes, struggling with half-pass left, horse tension in transitions, recovering from injury)" style={{ minHeight: '120px' }} />
            </FormField>
            <FormField label="Recent Progress or Breakthroughs" optional>
              <textarea name="recentProgress" value={formData.recentProgress} onChange={handleChange} disabled={loading} placeholder="Any recent improvements, aha moments, or wins to build on" style={{ minHeight: '80px' }} />
            </FormField>
          </FormSection>

          {/* Section 3: Goals */}
          <FormSection title="Your Goals" description="What do you want to achieve at this event? (List up to 3)">
            <div style={{
              background: '#FAF8F5',
              borderLeft: '4px solid #C67B5C',
              padding: '15px 20px',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              fontSize: '0.9rem',
              color: '#7A7A7A',
              lineHeight: 1.6
            }}>
              <strong style={{ color: '#3A3A3A' }}>Tip:</strong> Good goals are specific and measurable. Instead of "do well," try "score 62% or higher" or "execute clean lead changes" or "feel confident in warm-up."
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '15px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: '#D4A574', color: 'white', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontWeight: 600, fontSize: '0.9rem', flexShrink: 0
              }}>1</div>
              <div style={{ flex: 1 }}>
                <input type="text" name="goal1" value={formData.goal1} onChange={handleChange} disabled={loading} placeholder="Primary goal" className={errors.goal1 ? 'error' : ''} />
                {errors.goal1 && <div className="form-error">{errors.goal1}</div>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '15px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: '#D4A574', color: 'white', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontWeight: 600, fontSize: '0.9rem', flexShrink: 0
              }}>2</div>
              <input type="text" name="goal2" value={formData.goal2} onChange={handleChange} disabled={loading} placeholder="Second goal (optional)" style={{ flex: 1 }} />
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '15px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: '#D4A574', color: 'white', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontWeight: 600, fontSize: '0.9rem', flexShrink: 0
              }}>3</div>
              <input type="text" name="goal3" value={formData.goal3} onChange={handleChange} disabled={loading} placeholder="Third goal (optional)" style={{ flex: 1 }} />
            </div>
          </FormSection>

          {/* Section 4: Concerns */}
          <FormSection title="Your Concerns" description="What worries you about this event? (List up to 3)">
            <div style={{
              background: '#FAF8F5',
              borderLeft: '4px solid #C67B5C',
              padding: '15px 20px',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              fontSize: '0.9rem',
              color: '#7A7A7A',
              lineHeight: 1.6
            }}>
              <strong style={{ color: '#3A3A3A' }}>Why we ask:</strong> Naming your concerns helps us address them directly in your preparation plan. Common concerns include nerves, horse behavior, specific technical elements, or recovery from setbacks.
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '15px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: '#D4A574', color: 'white', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontWeight: 600, fontSize: '0.9rem', flexShrink: 0
              }}>1</div>
              <input type="text" name="concern1" value={formData.concern1} onChange={handleChange} disabled={loading} placeholder="Primary concern" style={{ flex: 1 }} />
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '15px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: '#D4A574', color: 'white', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontWeight: 600, fontSize: '0.9rem', flexShrink: 0
              }}>2</div>
              <input type="text" name="concern2" value={formData.concern2} onChange={handleChange} disabled={loading} placeholder="Second concern (optional)" style={{ flex: 1 }} />
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '15px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: '#D4A574', color: 'white', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontWeight: 600, fontSize: '0.9rem', flexShrink: 0
              }}>3</div>
              <input type="text" name="concern3" value={formData.concern3} onChange={handleChange} disabled={loading} placeholder="Third concern (optional)" style={{ flex: 1 }} />
            </div>
          </FormSection>

          {/* Section 5: Resources & Preparation Time */}
          <FormSection title="Resources & Preparation Time" description="Help us tailor your plan to your available resources">
            <FormField label="How many days per week can you typically ride?" error={errors.ridingFrequency}>
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

          {/* Section 6: Anything Else? */}
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
