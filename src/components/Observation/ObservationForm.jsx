import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { createObservation, getObservation, updateObservation, CONTEXT_TYPES } from '../../services';
import FormSection from '../Forms/FormSection';
import FormField from '../Forms/FormField';
import VoiceInput from '../Forms/VoiceInput';
import GuidingQuestions from '../Forms/GuidingQuestions';
import '../Forms/Forms.css';

const OBSERVATION_FIELDS = [
  { key: 'milestone', label: 'Technical Insight', color: '#4A90E2', placeholder: 'What instructional cue, correction, or technique produced a visible change? What happened in the horse or rider when it worked?' },
  { key: 'aha', label: 'What Resonated', color: '#F5A623', placeholder: 'What stood out or clicked?' },
  { key: 'connection', label: 'Horse-Rider Connection', color: '#8B5CF6', placeholder: 'What did you notice about the connection?' },
  { key: 'selfBridge', label: 'In your own riding', color: '#C67B5C', placeholder: 'What did this look like or feel like in relation to your own riding? Where do you recognize this pattern — either a struggle you share or a quality you\'re working toward?', promptBox: 'As you watched, what did you sense in your own body? How does this movement compare to your experience of it?' },
  { key: 'validation', label: 'Concepts Confirmed', color: '#7ED321', placeholder: 'What was reinforced or validated?' },
  { key: 'obstacle', label: 'Challenges Observed', color: '#D0021B', placeholder: 'What challenges did you see?' },
  { key: 'transferIntention', label: "What I'll try next ride", color: '#6B8E5F', placeholder: 'e.g. "Ask for the half-halt earlier in the corner and wait — stop adding leg once he\'s responded" / "Try releasing the inside rein for one stride during shoulder-in to test if he\'s truly through"', promptBox: 'What specific thing will you attempt in your next ride because of this observation? Be as concrete as you can.' },
  { key: 'notes', label: 'Additional Notes', color: '#8B7355', placeholder: 'Any other observations or takeaways?' }
];

const EMPTY_OBSERVATION = {
  milestone: '', aha: '', connection: '', selfBridge: '', validation: '', obstacle: '', transferIntention: '', notes: ''
};

const CLINIC_RIDER_LEVELS = [
  { value: 'similar-to-me', label: 'Similar level to me' },
  { value: 'above-me', label: 'Above my current level' },
  { value: 'significantly-above', label: 'Significantly more advanced' },
  { value: 'not-sure', label: 'Not sure / mixed' }
];

export default function ObservationForm() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const textareaRefs = useRef({});

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    contextType: '',
    // clinic fields
    clinicianName: '',
    pairObserved: '',
    clinicRiderLevel: '',
    // trainer-riding enriched fields
    trainerHorseName: '',
    trainerName: '',
    trainerSessionFocus: '',
    trainerHorseDiff: '',
    trainerAids: '',
    // schooling/show/video
    description: '',
    showLevel: '',
    // own-video fields
    ownVideoDetails: '',
    ownVideoSurprise: '',
    ownVideoMoment: '',
    // legacy field
    horseName: '',
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
        clinicRiderLevel: d.clinicRiderLevel || '',
        trainerHorseName: d.trainerHorseName || d.horseName || '',
        trainerName: d.trainerName || '',
        trainerSessionFocus: d.trainerSessionFocus || '',
        trainerHorseDiff: d.trainerHorseDiff || '',
        trainerAids: d.trainerAids || '',
        description: d.description || '',
        showLevel: d.showLevel || '',
        ownVideoDetails: d.ownVideoDetails || '',
        ownVideoSurprise: d.ownVideoSurprise || '',
        ownVideoMoment: d.ownVideoMoment || '',
        horseName: d.horseName || '',
        observations: d.observations && d.observations.length > 0
          ? d.observations.map(obs => ({
              milestone: obs.milestone || '',
              aha: obs.aha || '',
              connection: obs.connection || '',
              selfBridge: obs.selfBridge || '',
              validation: obs.validation || '',
              obstacle: obs.obstacle || '',
              transferIntention: obs.transferIntention || '',
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
      observations: formData.observations
    };

    // Context-specific fields
    switch (formData.contextType) {
      case 'clinic':
        data.clinicianName = formData.clinicianName;
        data.pairObserved = formData.pairObserved;
        data.clinicRiderLevel = formData.clinicRiderLevel || null;
        break;
      case 'trainer-riding':
        data.trainerHorseName = formData.trainerHorseName;
        data.trainerName = formData.trainerName;
        data.trainerSessionFocus = formData.trainerSessionFocus;
        data.trainerHorseDiff = formData.trainerHorseDiff;
        data.trainerAids = formData.trainerAids;
        break;
      case 'show':
        data.description = formData.description;
        data.showLevel = formData.showLevel;
        break;
      case 'own-video':
        data.ownVideoDetails = formData.ownVideoDetails;
        data.ownVideoSurprise = formData.ownVideoSurprise;
        data.ownVideoMoment = formData.ownVideoMoment;
        break;
      case 'schooling':
      case 'video':
        data.description = formData.description;
        break;
    }

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

      <form onSubmit={handleSubmit} autoComplete="off">
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

            {/* Clinic context fields */}
            {formData.contextType === 'clinic' && (
              <>
                <div className="form-row">
                  <FormField label="Clinician Name" error={errors.clinicianName}>
                    <input type="text" name="clinicianName" value={formData.clinicianName} onChange={handleChange} disabled={loading} className={errors.clinicianName ? 'error' : ''} placeholder="Who is teaching?" />
                  </FormField>
                  <FormField label="Pair Observed" optional>
                    <input type="text" name="pairObserved" value={formData.pairObserved} onChange={handleChange} disabled={loading} placeholder="Horse and rider being observed" />
                  </FormField>
                </div>
                <FormField label="Relative level of the pair you observed" optional helpText="This helps the AI understand the coaching context of what you observed.">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {CLINIC_RIDER_LEVELS.map(level => (
                      <label key={level.value} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.95rem' }}>
                        <input
                          type="radio"
                          name="clinicRiderLevel"
                          value={level.value}
                          checked={formData.clinicRiderLevel === level.value}
                          onChange={handleChange}
                          disabled={loading}
                        />
                        {level.label}
                      </label>
                    ))}
                  </div>
                </FormField>
              </>
            )}

            {/* Trainer riding — enriched fields */}
            {formData.contextType === 'trainer-riding' && (
              <>
                <div className="form-row">
                  <FormField label="Horse Name" optional>
                    <input type="text" name="trainerHorseName" value={formData.trainerHorseName} onChange={handleChange} disabled={loading} placeholder="Which horse did your trainer ride?" />
                  </FormField>
                  <FormField label="Trainer Name" optional>
                    <input type="text" name="trainerName" value={formData.trainerName} onChange={handleChange} disabled={loading} placeholder="Who rode? (leave blank if obvious)" />
                  </FormField>
                </div>
                <FormField label="Focus of the session" optional>
                  <textarea name="trainerSessionFocus" value={formData.trainerSessionFocus} onChange={handleChange} disabled={loading} placeholder="What was your trainer working on? What did they tell you they were focusing on?" />
                </FormField>
                <FormField label="What the horse did differently" optional>
                  <GuidingQuestions text="Your horse may move differently under your trainer than under you. This is information, not criticism." />
                  <textarea name="trainerHorseDiff" value={formData.trainerHorseDiff} onChange={handleChange} disabled={loading} placeholder="Did the horse respond differently? What changed — in the gaits, the contact, the throughness, the expression?" />
                </FormField>
                <FormField label="What cues or aids produced the change" optional>
                  <textarea name="trainerAids" value={formData.trainerAids} onChange={handleChange} disabled={loading} placeholder="What specifically did you see the trainer do that produced a change in the horse? Timing, position, rein, leg, seat — what was the sequence?" />
                </FormField>
              </>
            )}

            {/* Schooling / video context */}
            {['schooling', 'video'].includes(formData.contextType) && (
              <FormField label="Description" optional>
                <input type="text" name="description" value={formData.description} onChange={handleChange} disabled={loading} placeholder="Brief description of what you're watching" />
              </FormField>
            )}

            {/* Show context — with level field */}
            {formData.contextType === 'show' && (
              <>
                <FormField label="Description" optional>
                  <input type="text" name="description" value={formData.description} onChange={handleChange} disabled={loading} placeholder="Brief description of what you're watching" />
                </FormField>
                <FormField label="Level(s) you watched" optional>
                  <input type="text" name="showLevel" value={formData.showLevel} onChange={handleChange} disabled={loading} placeholder='e.g. "Third Level and Fourth Level" / "PSG"' />
                </FormField>
              </>
            )}

            {/* Own video context */}
            {formData.contextType === 'own-video' && (
              <>
                <FormField label="Video Details" optional>
                  <textarea name="ownVideoDetails" value={formData.ownVideoDetails} onChange={handleChange} disabled={loading} placeholder="What footage? (date ridden, event, who filmed it, link if applicable)" />
                </FormField>
                <FormField label="What surprised you?" optional>
                  <GuidingQuestions text="The proprioceptive gap — what you feel vs. what you actually do — is widest when you first watch yourself ride. This is useful data." />
                  <textarea name="ownVideoSurprise" value={formData.ownVideoSurprise} onChange={handleChange} disabled={loading} placeholder="What looked different from what you expected? What felt correct but looked incorrect? What looked better than it felt?" />
                </FormField>
                <FormField label="Most useful moment in the footage" optional>
                  <textarea name="ownVideoMoment" value={formData.ownVideoMoment} onChange={handleChange} disabled={loading} placeholder="Which specific moment, movement, or transition gave you the most to work with — and what did you see?" />
                </FormField>
              </>
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
                  {field.promptBox && (
                    <GuidingQuestions text={field.promptBox} />
                  )}
                  {!field.promptBox && (
                    <GuidingQuestions text={field.placeholder} />
                  )}
                  <textarea
                    ref={el => { getRef(index, field.key).current = el; }}
                    value={obs[field.key]}
                    onChange={e => handleObsChange(index, field.key, e.target.value)}
                    disabled={loading}
                    placeholder={field.promptBox ? 'Start typing...' : undefined}
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
