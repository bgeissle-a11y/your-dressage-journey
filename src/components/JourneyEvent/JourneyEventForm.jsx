import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  createJourneyEvent, getJourneyEvent, updateJourneyEvent,
  getAllEventPrepPlans,
  EVENT_TYPES, EVENT_MAGNITUDES, IMPACT_DURATIONS, EVENT_STATUSES
} from '../../services';
import FormSection from '../Forms/FormSection';
import FormField from '../Forms/FormField';
import VoiceInput from '../Forms/VoiceInput';
import '../Forms/Forms.css';
import '../HorseHealth/HorseHealth.css';

export default function JourneyEventForm() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const descriptionRef = useRef(null);
  const realityRef = useRef(null);
  const lessonsRef = useRef(null);
  const unexpectedRef = useRef(null);
  const futureRef = useRef(null);

  const [formData, setFormData] = useState({
    entryMode: 'unplanned',
    prepReference: '',
    category: '',
    type: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    magnitude: '',
    duration: '',
    status: 'active',
    resolutionDate: '',
    realityVsExpectation: '',
    lessonsLearned: '',
    unexpectedOutcomes: '',
    futureApproach: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [eventPreps, setEventPreps] = useState([]);

  useEffect(() => {
    if (id) loadExisting();
    if (currentUser) loadEventPreps();
  }, [id, currentUser]);

  async function loadEventPreps() {
    const result = await getAllEventPrepPlans(currentUser.uid);
    if (result.success) {
      setEventPreps(result.data);
    }
  }

  async function loadExisting() {
    setLoadingData(true);
    const result = await getJourneyEvent(id);
    if (result.success) {
      const reflection = result.data.reflection || {};
      setFormData({
        entryMode: result.data.entryMode || 'unplanned',
        prepReference: result.data.prepReference || '',
        category: result.data.category || '',
        type: result.data.type || '',
        date: result.data.date || '',
        description: result.data.description || '',
        magnitude: result.data.magnitude || '',
        duration: result.data.duration || '',
        status: result.data.status || 'active',
        resolutionDate: result.data.resolutionDate || '',
        realityVsExpectation: reflection.realityVsExpectation || '',
        lessonsLearned: reflection.lessonsLearned || '',
        unexpectedOutcomes: reflection.unexpectedOutcomes || '',
        futureApproach: reflection.futureApproach || ''
      });
    }
    setLoadingData(false);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'status' && value !== 'resolved') {
        updated.resolutionDate = '';
      }
      if (name === 'entryMode' && value !== 'planned') {
        updated.prepReference = '';
      }
      return updated;
    });
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  }

  function validateForm() {
    const newErrors = {};
    if (!formData.category.trim()) newErrors.category = 'Brief summary is required';
    if (!formData.type) newErrors.type = 'Please select an event type';
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.magnitude) newErrors.magnitude = 'Please select magnitude';
    if (!formData.duration) newErrors.duration = 'Please select impact duration';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    const reflection = formData.entryMode === 'planned' ? {
      realityVsExpectation: formData.realityVsExpectation,
      lessonsLearned: formData.lessonsLearned,
      unexpectedOutcomes: formData.unexpectedOutcomes,
      futureApproach: formData.futureApproach
    } : null;

    const data = {
      entryMode: formData.entryMode,
      prepReference: formData.entryMode === 'planned' ? formData.prepReference || null : null,
      category: formData.category,
      type: formData.type,
      date: formData.date,
      description: formData.description,
      magnitude: formData.magnitude,
      duration: formData.duration,
      status: formData.status,
      resolutionDate: formData.status === 'resolved' ? formData.resolutionDate : null,
      reflection
    };

    let result;
    if (isEdit) {
      result = await updateJourneyEvent(id, data);
    } else {
      result = await createJourneyEvent(currentUser.uid, data);
    }

    setLoading(false);

    if (result.success) {
      navigate('/events');
    } else {
      setErrors({ submit: result.error });
    }
  }

  if (loadingData) {
    return <div className="loading-state">Loading event...</div>;
  }

  return (
    <div className="form-page">
      <div className="form-page-header">
        <h1>{isEdit ? 'Edit Journey Event' : 'Log Journey Event'}</h1>
        <p>Track significant events that shape your riding journey</p>
      </div>

      <div className="form-info-callout">
        Tracking a vet visit, soundness issue, or body work appointment? Use the <Link to="/horse-health/new">Health &amp; Soundness Tracker</Link> — it gives you a full medical history per horse.
      </div>

      <form onSubmit={handleSubmit} autoComplete="off">
        <div className="form-card">
          {errors.submit && <div className="form-section"><div className="form-alert form-alert-error">{errors.submit}</div></div>}

          <FormSection title="Event Details" description="Capture the who, what, when of this significant event.">
            <FormField label="Was this event:">
              <select name="entryMode" value={formData.entryMode} onChange={handleChange} disabled={loading}>
                <option value="unplanned">Unplanned — Injury, barn move, equipment change, etc.</option>
                <option value="planned">Planned — Show, clinic, audit, lesson</option>
              </select>
            </FormField>
            {formData.entryMode === 'planned' && eventPreps.length > 0 && (
              <FormField label="Event Preparation Reference" optional helpText="Link to an Event Preparation you created for this event">
                <select name="prepReference" value={formData.prepReference} onChange={handleChange} disabled={loading}>
                  <option value="">Select a prepared event or leave blank...</option>
                  {eventPreps.map(prep => {
                    const dateLabel = prep.eventDate
                      ? new Date(prep.eventDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '';
                    return (
                      <option key={prep.id} value={prep.id}>
                        {prep.eventName}{dateLabel ? ` — ${dateLabel}` : ''}
                      </option>
                    );
                  })}
                </select>
              </FormField>
            )}
            <FormField label="Brief Event Summary" error={errors.category} helpText={formData.entryMode === 'planned' ? 'Event name (e.g., Spring Championship Show, Jane Smith Clinic)' : 'What happened? (e.g., Started new horse, Moved to new barn, Shoulder injury)'}>
              <input type="text" name="category" value={formData.category} onChange={handleChange} disabled={loading} className={errors.category ? 'error' : ''} placeholder={formData.entryMode === 'planned' ? 'Event name...' : 'What happened?'} />
            </FormField>
            <div className="form-row">
              <FormField label="Event Type" error={errors.type}>
                <select name="type" value={formData.type} onChange={handleChange} disabled={loading} className={errors.type ? 'error' : ''}>
                  <option value="">Select general category...</option>
                  {EVENT_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </FormField>
              <FormField label="Date Event Occurred" error={errors.date}>
                <input type="date" name="date" value={formData.date} onChange={handleChange} disabled={loading} className={errors.date ? 'error' : ''} />
              </FormField>
            </div>
            <FormField label="Event Description" error={errors.description}>
              <textarea ref={descriptionRef} name="description" value={formData.description} onChange={handleChange} disabled={loading} className={errors.description ? 'error' : ''} placeholder="Describe what happened and how this might affect your riding..." />
              <VoiceInput textareaRef={descriptionRef} onTranscript={text => {
                setFormData(prev => ({ ...prev, description: text }));
                if (errors.description) setErrors(prev => ({ ...prev, description: '' }));
              }} />
            </FormField>
          </FormSection>

          <FormSection title="Impact Assessment" description="Help us understand the scope and timeline of this event's impact.">
            <FormField label="Magnitude" error={errors.magnitude}>
              <select name="magnitude" value={formData.magnitude} onChange={handleChange} disabled={loading} className={errors.magnitude ? 'error' : ''}>
                <option value="">Select magnitude...</option>
                {EVENT_MAGNITUDES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </FormField>
            <FormField label="Projected Impact Duration" error={errors.duration}>
              <select name="duration" value={formData.duration} onChange={handleChange} disabled={loading} className={errors.duration ? 'error' : ''}>
                <option value="">Select timeframe...</option>
                {IMPACT_DURATIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </FormField>
            <FormField label="Current Status">
              <select name="status" value={formData.status} onChange={handleChange} disabled={loading}>
                {EVENT_STATUSES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </FormField>
            {formData.status === 'resolved' && (
              <FormField label="Resolution Date" optional>
                <input type="date" name="resolutionDate" value={formData.resolutionDate} onChange={handleChange} disabled={loading} />
              </FormField>
            )}
          </FormSection>

          {formData.entryMode === 'planned' && (
            <FormSection title="Post-Event Reflection" description="Compare what you planned with what actually happened.">
              <FormField label="How did reality compare to your expectations?" optional>
                <textarea ref={realityRef} name="realityVsExpectation" value={formData.realityVsExpectation} onChange={handleChange} disabled={loading} placeholder="What went as planned? What surprised you?" />
                <VoiceInput textareaRef={realityRef} onTranscript={text => setFormData(prev => ({ ...prev, realityVsExpectation: text }))} />
              </FormField>
              <FormField label="Key takeaways or lessons learned" optional>
                <textarea ref={lessonsRef} name="lessonsLearned" value={formData.lessonsLearned} onChange={handleChange} disabled={loading} placeholder="What did you learn from this experience?" />
                <VoiceInput textareaRef={lessonsRef} onTranscript={text => setFormData(prev => ({ ...prev, lessonsLearned: text }))} />
              </FormField>
              <FormField label="Unexpected outcomes (positive or challenging)" optional>
                <textarea ref={unexpectedRef} name="unexpectedOutcomes" value={formData.unexpectedOutcomes} onChange={handleChange} disabled={loading} placeholder="Anything that caught you off guard?" />
                <VoiceInput textareaRef={unexpectedRef} onTranscript={text => setFormData(prev => ({ ...prev, unexpectedOutcomes: text }))} />
              </FormField>
              <FormField label="Would you approach this differently next time?" optional>
                <textarea ref={futureRef} name="futureApproach" value={formData.futureApproach} onChange={handleChange} disabled={loading} placeholder="What would you keep the same? What would you change?" />
                <VoiceInput textareaRef={futureRef} onTranscript={text => setFormData(prev => ({ ...prev, futureApproach: text }))} />
              </FormField>
            </FormSection>
          )}

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/events')} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : (isEdit ? 'Update Event' : 'Log Event')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
