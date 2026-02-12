import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  createJourneyEvent, getJourneyEvent, updateJourneyEvent,
  EVENT_TYPES, EVENT_MAGNITUDES, IMPACT_DURATIONS, EVENT_STATUSES
} from '../../services';
import FormSection from '../Forms/FormSection';
import FormField from '../Forms/FormField';
import VoiceInput from '../Forms/VoiceInput';
import useDisableAutofill from '../../hooks/useDisableAutofill';
import '../Forms/Forms.css';

export default function JourneyEventForm() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const formRef = useRef(null);
  const descriptionRef = useRef(null);
  useDisableAutofill(formRef);

  const [formData, setFormData] = useState({
    category: '',
    type: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    magnitude: '',
    duration: '',
    status: 'active',
    resolutionDate: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (id) loadExisting();
  }, [id]);

  async function loadExisting() {
    setLoadingData(true);
    const result = await getJourneyEvent(id);
    if (result.success) {
      setFormData({
        category: result.data.category || '',
        type: result.data.type || '',
        date: result.data.date || '',
        description: result.data.description || '',
        magnitude: result.data.magnitude || '',
        duration: result.data.duration || '',
        status: result.data.status || 'active',
        resolutionDate: result.data.resolutionDate || ''
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
    const data = {
      ...formData,
      resolutionDate: formData.status === 'resolved' ? formData.resolutionDate : null
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

      <form ref={formRef} onSubmit={handleSubmit} autoComplete="off">
        <div className="form-card">
          {errors.submit && <div className="form-section"><div className="form-alert form-alert-error">{errors.submit}</div></div>}

          <FormSection title="Event Details" description="Capture the who, what, when of this significant event.">
            <FormField label="Brief Event Summary" error={errors.category} helpText="e.g., Started new horse, Moved to new barn, Shoulder injury">
              <input type="text" name="category" value={formData.category} onChange={handleChange} disabled={loading} className={errors.category ? 'error' : ''} placeholder="What happened?" />
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
