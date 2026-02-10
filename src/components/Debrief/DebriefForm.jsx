import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  createDebrief, getDebrief, updateDebrief,
  getAllHorseProfiles,
  SESSION_TYPES, RIDER_ENERGY_LEVELS, HORSE_ENERGY_LEVELS, MENTAL_STATES
} from '../../services';
import FormSection from '../Forms/FormSection';
import FormField from '../Forms/FormField';
import RadioGroup from '../Forms/RadioGroup';
import VoiceInput from '../Forms/VoiceInput';
import '../Forms/Forms.css';

const NARRATIVE_FIELDS = [
  { key: 'wins', label: 'Wins & Validation', color: '#7ED321', placeholder: 'What went well? Personal milestones? Positive feedback?' },
  { key: 'ahaRealization', label: 'Aha Moments', color: '#F5A623', placeholder: 'What clicked? New realizations?' },
  { key: 'horseNotices', label: 'Connection & Feel', color: '#8B5CF6', placeholder: 'What did you notice about your horse? Connection moments?' },
  { key: 'challenges', label: 'Challenges', color: '#D0021B', placeholder: 'What was difficult? Obstacles encountered?' },
  { key: 'workFocus', label: 'What We Worked On', color: '#4A90E2', placeholder: 'Specific exercises, movements, or focuses?' }
];

const STORAGE_KEY = 'ydj-debrief-intentions';

function loadSavedIntentions() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : ['Soft hands', 'Breathe', 'Heels down', 'Look up', 'Sit tall'];
  } catch {
    return ['Soft hands', 'Breathe', 'Heels down', 'Look up', 'Sit tall'];
  }
}

function saveIntentions(intentions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(intentions));
  } catch { /* ignore */ }
}

export default function DebriefForm() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const narrativeRefs = useRef({});

  const [horseNames, setHorseNames] = useState([]);
  const [intentions, setIntentions] = useState(loadSavedIntentions);
  const [newIntention, setNewIntention] = useState('');
  const [editingIntention, setEditingIntention] = useState(null);

  const [formData, setFormData] = useState({
    rideDate: new Date().toISOString().split('T')[0],
    horseName: '',
    sessionType: '',
    overallQuality: 5,
    riderEnergy: '',
    horseEnergy: '',
    mentalState: '',
    intentionRatings: {},
    wins: '',
    ahaRealization: '',
    horseNotices: '',
    challenges: '',
    workFocus: ''
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
    const result = await getDebrief(id);
    if (result.success) {
      const d = result.data;
      setFormData({
        rideDate: d.rideDate || '',
        horseName: d.horseName || '',
        sessionType: d.sessionType || '',
        overallQuality: d.overallQuality || 5,
        riderEnergy: d.riderEnergy || '',
        horseEnergy: d.horseEnergy || '',
        mentalState: d.mentalState || '',
        intentionRatings: d.intentionRatings || {},
        wins: d.wins || '',
        ahaRealization: d.ahaRealization || '',
        horseNotices: d.horseNotices || '',
        challenges: d.challenges || '',
        workFocus: d.workFocus || ''
      });
      // Merge any intentions from the saved debrief
      if (d.intentionRatings) {
        const debriefIntentions = Object.keys(d.intentionRatings);
        setIntentions(prev => {
          const merged = [...new Set([...prev, ...debriefIntentions])];
          saveIntentions(merged);
          return merged;
        });
      }
    }
    setLoadingData(false);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  }

  function handleRatingChange(intention, rating) {
    setFormData(prev => ({
      ...prev,
      intentionRatings: { ...prev.intentionRatings, [intention]: rating }
    }));
  }

  function addIntention() {
    const trimmed = newIntention.trim();
    if (!trimmed || intentions.includes(trimmed)) return;
    const updated = [...intentions, trimmed];
    setIntentions(updated);
    saveIntentions(updated);
    setNewIntention('');
  }

  function removeIntention(intention) {
    const updated = intentions.filter(i => i !== intention);
    setIntentions(updated);
    saveIntentions(updated);
    setFormData(prev => {
      const ratings = { ...prev.intentionRatings };
      delete ratings[intention];
      return { ...prev, intentionRatings: ratings };
    });
  }

  function startEditIntention(intention) {
    setEditingIntention({ original: intention, value: intention });
  }

  function saveEditIntention() {
    if (!editingIntention) return;
    const trimmed = editingIntention.value.trim();
    if (!trimmed || (trimmed !== editingIntention.original && intentions.includes(trimmed))) {
      setEditingIntention(null);
      return;
    }
    const updated = intentions.map(i => i === editingIntention.original ? trimmed : i);
    setIntentions(updated);
    saveIntentions(updated);
    // Update the rating key if changed
    if (trimmed !== editingIntention.original) {
      setFormData(prev => {
        const ratings = { ...prev.intentionRatings };
        if (ratings[editingIntention.original] !== undefined) {
          ratings[trimmed] = ratings[editingIntention.original];
          delete ratings[editingIntention.original];
        }
        return { ...prev, intentionRatings: ratings };
      });
    }
    setEditingIntention(null);
  }

  function getNarrativeRef(key) {
    if (!narrativeRefs.current[key]) {
      narrativeRefs.current[key] = { current: null };
    }
    return narrativeRefs.current[key];
  }

  function validateForm() {
    const newErrors = {};
    if (!formData.rideDate) newErrors.rideDate = 'Date is required';
    if (!formData.horseName.trim()) newErrors.horseName = 'Horse name is required';
    if (!formData.sessionType) newErrors.sessionType = 'Please select session type';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e, isDraft = false) {
    if (e) e.preventDefault();
    if (!isDraft && !validateForm()) return;

    setLoading(true);
    const data = { ...formData, isDraft };

    let result;
    if (isEdit) {
      result = await updateDebrief(id, data);
    } else {
      result = await createDebrief(currentUser.uid, data);
    }

    setLoading(false);

    if (result.success) {
      navigate('/debriefs');
    } else {
      setErrors({ submit: result.error });
    }
  }

  if (loadingData) {
    return <div className="loading-state">Loading debrief...</div>;
  }

  return (
    <div className="form-page">
      <div className="form-page-header">
        <h1>{isEdit ? 'Edit Debrief' : 'Post-Ride Debrief'}</h1>
        <p>Capture your ride experience while it's fresh</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-card">
          {errors.submit && <div className="form-section"><div className="form-alert form-alert-error">{errors.submit}</div></div>}

          {/* Section 1: Ride Basics */}
          <FormSection title="Ride Basics">
            <div className="form-row">
              <FormField label="Ride Date" error={errors.rideDate}>
                <input type="date" name="rideDate" value={formData.rideDate} onChange={handleChange} disabled={loading} />
              </FormField>
              <FormField label="Horse" error={errors.horseName}>
                <input
                  type="text"
                  name="horseName"
                  value={formData.horseName}
                  onChange={handleChange}
                  disabled={loading}
                  className={errors.horseName ? 'error' : ''}
                  placeholder="Horse name"
                  list="horse-names"
                />
                <datalist id="horse-names">
                  {horseNames.map(name => <option key={name} value={name} />)}
                </datalist>
              </FormField>
            </div>
            <FormField label="Session Type" error={errors.sessionType}>
              <RadioGroup name="sessionType" options={SESSION_TYPES} value={formData.sessionType} onChange={handleChange} disabled={loading} />
            </FormField>
          </FormSection>

          {/* Section 2: Quick Ratings */}
          <FormSection title="Quick Check-In" description="How was the energy today?">
            <FormField label={`Overall Ride Quality: ${formData.overallQuality}/10`}>
              <input
                type="range"
                name="overallQuality"
                min="1"
                max="10"
                value={formData.overallQuality}
                onChange={e => setFormData(prev => ({ ...prev, overallQuality: parseInt(e.target.value, 10) }))}
                disabled={loading}
                style={{ width: '100%', accentColor: '#8B7355' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#7A7A7A' }}>
                <span>Rough</span><span>Average</span><span>Amazing</span>
              </div>
            </FormField>
            <FormField label="Your Energy Level" optional>
              <RadioGroup name="riderEnergy" options={RIDER_ENERGY_LEVELS} value={formData.riderEnergy} onChange={handleChange} disabled={loading} />
            </FormField>
            <FormField label="Horse's Energy Level" optional>
              <RadioGroup name="horseEnergy" options={HORSE_ENERGY_LEVELS} value={formData.horseEnergy} onChange={handleChange} disabled={loading} />
            </FormField>
            <FormField label="Your Mental State" optional>
              <RadioGroup name="mentalState" options={MENTAL_STATES} value={formData.mentalState} onChange={handleChange} disabled={loading} />
            </FormField>
          </FormSection>

          {/* Section 3: Riding Intentions */}
          <FormSection title="Riding Intentions" description="Rate how well you maintained each intention (1-5)">
            <div style={{ marginBottom: '1rem' }}>
              {intentions.map(intention => (
                <div key={intention} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 0',
                  borderBottom: '1px solid #F0EBE3'
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {editingIntention?.original === intention ? (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input
                          type="text"
                          value={editingIntention.value}
                          onChange={e => setEditingIntention(prev => ({ ...prev, value: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && saveEditIntention()}
                          onBlur={saveEditIntention}
                          autoFocus
                          style={{ flex: 1, padding: '4px 8px', fontSize: '0.9rem' }}
                        />
                      </div>
                    ) : (
                      <span
                        style={{ cursor: 'pointer', fontSize: '0.95rem' }}
                        onClick={() => startEditIntention(intention)}
                        title="Click to edit"
                      >
                        {intention}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[1, 2, 3, 4, 5].map(rating => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => handleRatingChange(intention, rating)}
                        disabled={loading}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          border: `2px solid ${formData.intentionRatings[intention] === rating ? '#8B7355' : '#E0D5C7'}`,
                          background: formData.intentionRatings[intention] === rating ? '#8B7355' : 'white',
                          color: formData.intentionRatings[intention] === rating ? 'white' : '#3A3A3A',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {rating}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeIntention(intention)}
                    disabled={loading}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#D0021B',
                      cursor: 'pointer',
                      fontSize: '1.1rem',
                      padding: '4px',
                      opacity: 0.6
                    }}
                    title="Remove intention"
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={newIntention}
                onChange={e => setNewIntention(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addIntention())}
                placeholder="Add a new intention..."
                disabled={loading}
                style={{ flex: 1 }}
              />
              <button type="button" className="btn btn-secondary" onClick={addIntention} disabled={loading || !newIntention.trim()}>
                Add
              </button>
            </div>
          </FormSection>

          {/* Section 4: Narrative */}
          <FormSection title="Ride Narrative" description="Fill in what resonates - all fields are optional">
            {NARRATIVE_FIELDS.map(field => (
              <FormField key={field.key} label={field.label} optional>
                <textarea
                  ref={el => { getNarrativeRef(field.key).current = el; }}
                  name={field.key}
                  value={formData[field.key]}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder={field.placeholder}
                  style={{ borderLeft: `3px solid ${field.color}` }}
                />
                <VoiceInput
                  textareaRef={getNarrativeRef(field.key)}
                  onTranscript={text => setFormData(prev => ({ ...prev, [field.key]: text }))}
                />
              </FormField>
            ))}
          </FormSection>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/debriefs')} disabled={loading}>
              Cancel
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => handleSubmit(null, true)} disabled={loading}>
              {loading ? 'Saving...' : 'Save Draft'}
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : (isEdit ? 'Update Debrief' : 'Complete Debrief')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
