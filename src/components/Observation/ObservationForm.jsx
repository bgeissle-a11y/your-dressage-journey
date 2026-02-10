import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { createObservation, getObservation, updateObservation, CONTEXT_TYPES } from '../../services';
import FormSection from '../Forms/FormSection';
import FormField from '../Forms/FormField';
import VoiceInput from '../Forms/VoiceInput';
import '../Forms/Forms.css';

const OBSERVATION_FIELDS = [
  { key: 'milestone', label: 'Instructional Cues / Riding Techniques', color: '#4A90E2', placeholder: 'What techniques or cues were used?' },
  { key: 'aha', label: 'What Resonated', color: '#F5A623', placeholder: 'What stood out or clicked?' },
  { key: 'connection', label: 'Horse-Rider Connection', color: '#8B5CF6', placeholder: 'What did you notice about the connection?' },
  { key: 'validation', label: 'Concepts Confirmed', color: '#7ED321', placeholder: 'What was reinforced or validated?' },
  { key: 'obstacle', label: 'Challenges Observed', color: '#D0021B', placeholder: 'What challenges did you see?' },
  { key: 'notes', label: 'Additional Notes', color: '#8B7355', placeholder: 'Anything else worth noting?' }
];

const EMPTY_OBSERVATION = {
  milestone: '', aha: '', connection: '', validation: '', obstacle: '', notes: ''
};

export default function ObservationForm() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const textareaRefs = useRef({});

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    contextType: '',
    clinicianName: '',
    pairObserved: '',
    horseName: '',
    description: '',
    observations: [{ ...EMPTY_OBSERVATION }]
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (id) loadExisting();
  }, [id]);

  async function loadExisting() {
    setLoadingData(true);
    const result = await getObservation(id);
    if (result.success) {
      const d = result.data;
      setFormData({
        date: d.date || '',
        contextType: d.contextType || '',
        clinicianName: d.clinicianName || '',
        pairObserved: d.pairObserved || '',
        horseName: d.horseName || '',
        description: d.description || '',
        observations: d.observations && d.observations.length > 0
          ? d.observations.map(obs => ({
              milestone: obs.milestone || '',
              aha: obs.aha || '',
              connection: obs.connection || '',
              validation: obs.validation || '',
              obstacle: obs.obstacle || '',
              notes: obs.notes || ''
            }))
          : [{ ...EMPTY_OBSERVATION }]
      });
    }
    setLoadingData(false);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  }

  function handleObsChange(index, field, value) {
    setFormData(prev => {
      const updated = [...prev.observations];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, observations: updated };
    });
  }

  function addObservation() {
    setFormData(prev => ({
      ...prev,
      observations: [...prev.observations, { ...EMPTY_OBSERVATION }]
    }));
  }

  function removeObservation(index) {
    if (formData.observations.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      observations: prev.observations.filter((_, i) => i !== index)
    }));
  }

  function getRefKey(index, field) {
    return `${index}-${field}`;
  }

  function getRef(index, field) {
    const key = getRefKey(index, field);
    if (!textareaRefs.current[key]) {
      textareaRefs.current[key] = { current: null };
    }
    return textareaRefs.current[key];
  }

  function validateForm() {
    const newErrors = {};
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.contextType) newErrors.contextType = 'Please select a context';
    if (formData.contextType === 'clinic' && !formData.clinicianName.trim()) {
      newErrors.clinicianName = 'Clinician name is required';
    }
    const hasContent = formData.observations.some(obs =>
      Object.values(obs).some(v => v.trim())
    );
    if (!hasContent) newErrors.observations = 'Please add at least one observation note';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    const data = {
      date: formData.date,
      contextType: formData.contextType,
      clinicianName: formData.contextType === 'clinic' ? formData.clinicianName : null,
      pairObserved: formData.contextType === 'clinic' ? formData.pairObserved : null,
      horseName: formData.contextType === 'trainer-riding' ? formData.horseName : null,
      description: ['schooling', 'show', 'video'].includes(formData.contextType) ? formData.description : null,
      observations: formData.observations
    };

    let result;
    if (isEdit) {
      result = await updateObservation(id, data);
    } else {
      result = await createObservation(currentUser.uid, data);
    }

    setLoading(false);

    if (result.success) {
      navigate('/observations');
    } else {
      setErrors({ submit: result.error });
    }
  }

  if (loadingData) {
    return <div className="loading-state">Loading observation...</div>;
  }

  return (
    <div className="form-page">
      <div className="form-page-header">
        <h1>{isEdit ? 'Edit Observation' : 'New Observation'}</h1>
        <p>Note what you learn watching others ride</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-card">
          {errors.submit && <div className="form-section"><div className="form-alert form-alert-error">{errors.submit}</div></div>}

          <FormSection title="Context" description="What are you observing?">
            <div className="form-row">
              <FormField label="Date" error={errors.date}>
                <input type="date" name="date" value={formData.date} onChange={handleChange} disabled={loading} />
              </FormField>
              <FormField label="Context Type" error={errors.contextType}>
                <select name="contextType" value={formData.contextType} onChange={handleChange} disabled={loading} className={errors.contextType ? 'error' : ''}>
                  <option value="">Select context...</option>
                  {CONTEXT_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </FormField>
            </div>

            {formData.contextType === 'clinic' && (
              <div className="form-row">
                <FormField label="Clinician Name" error={errors.clinicianName}>
                  <input type="text" name="clinicianName" value={formData.clinicianName} onChange={handleChange} disabled={loading} className={errors.clinicianName ? 'error' : ''} placeholder="Who is teaching?" />
                </FormField>
                <FormField label="Pair Observed" optional>
                  <input type="text" name="pairObserved" value={formData.pairObserved} onChange={handleChange} disabled={loading} placeholder="Horse and rider being observed" />
                </FormField>
              </div>
            )}

            {formData.contextType === 'trainer-riding' && (
              <FormField label="Horse Name" optional>
                <input type="text" name="horseName" value={formData.horseName} onChange={handleChange} disabled={loading} placeholder="Which horse?" />
              </FormField>
            )}

            {['schooling', 'show', 'video'].includes(formData.contextType) && (
              <FormField label="Description" optional>
                <input type="text" name="description" value={formData.description} onChange={handleChange} disabled={loading} placeholder="Brief description of what you're watching" />
              </FormField>
            )}
          </FormSection>

          {formData.observations.map((obs, index) => (
            <FormSection
              key={index}
              title={`Observation ${formData.observations.length > 1 ? index + 1 : ''}`}
              description={formData.observations.length > 1 ? undefined : 'Record what you noticed'}
            >
              {index === 0 && errors.observations && (
                <div className="form-alert form-alert-error" style={{ marginBottom: '1rem' }}>{errors.observations}</div>
              )}
              {OBSERVATION_FIELDS.map(field => (
                <FormField key={field.key} label={field.label} optional>
                  <textarea
                    ref={el => { getRef(index, field.key).current = el; }}
                    value={obs[field.key]}
                    onChange={e => handleObsChange(index, field.key, e.target.value)}
                    disabled={loading}
                    placeholder={field.placeholder}
                    style={{ borderLeft: `3px solid ${field.color}` }}
                  />
                  <VoiceInput
                    textareaRef={getRef(index, field.key)}
                    onTranscript={text => handleObsChange(index, field.key, text)}
                  />
                </FormField>
              ))}
              {formData.observations.length > 1 && (
                <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '6px 14px' }} onClick={() => removeObservation(index)} disabled={loading}>
                    Remove this observation
                  </button>
                </div>
              )}
            </FormSection>
          ))}

          <div className="form-section" style={{ textAlign: 'center' }}>
            <button type="button" className="btn btn-secondary" onClick={addObservation} disabled={loading}>
              + Add Another Observation
            </button>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/observations')} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : (isEdit ? 'Update Observation' : 'Save Observation')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
