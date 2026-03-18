import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  createDebrief, getDebrief, updateDebrief,
  getAllHorseProfiles, getAllDebriefs,
  SESSION_TYPES, RIDER_ENERGY_LEVELS, HORSE_ENERGY_LEVELS,
  MENTAL_STATE_GROUPS,
  MOVEMENT_CATEGORIES, RIDE_ARC_OPTIONS
} from '../../services';
import useFormRecovery from '../../hooks/useFormRecovery';
import FormSection from '../Forms/FormSection';
import FormField from '../Forms/FormField';
import RadioGroup from '../Forms/RadioGroup';
import VoiceInput from '../Forms/VoiceInput';
import GuidingQuestions from '../Forms/GuidingQuestions';
import '../Forms/Forms.css';

const NARRATIVE_FIELDS = [
  { key: 'wins', label: 'Personal Milestones and External Validation', color: '#7ED321', placeholder: 'What went well? What felt good? What progress did you make? What feedback or recognition did you receive from your coach, judge, or peers?' },
  { key: 'ahaRealization', label: 'Aha Moment', color: '#F5A623', placeholder: "Did something 'click'? What insight emerged? What did you notice about timing, feel, or technique that changed your understanding?" },
  { key: 'horseNotices', label: 'Connection and Feel', color: '#8B5CF6', placeholder: 'Their energy, responsiveness, balance, comfort, tension -- what were they communicating? How was your partnership? What did you feel in your body -- seat, legs, hands, breathing, tension, balance?' },
  { key: 'challenges', label: 'Obstacle', color: '#D0021B', placeholder: "What was difficult? What didn't work? What left you puzzled? What setback occurred? What felt stuck?" },
  { key: 'workFocus', label: 'Additional notes on your work', color: '#4A90E2', placeholder: "Exercises, movements, concepts, focus areas (e.g., 'transitions,' 'shoulder-in,' 'steady contact,' 'half-halts')" }
];

const PREV_GOAL_RATING_OPTIONS = [
  { value: 'not-at-all', label: 'Not at all' },
  { value: 'somewhat', label: 'Somewhat' },
  { value: 'mostly', label: 'Mostly' },
  { value: 'fully', label: 'Fully' }
];

const ARC_SVGS = {
  consistent: (color) => <polyline points="4,20 68,20" stroke={color} strokeWidth="3" strokeLinecap="round" fill="none"/>,
  built: (color) => <polyline points="4,34 68,6" stroke={color} strokeWidth="3" strokeLinecap="round" fill="none"/>,
  faded: (color) => <polyline points="4,6 68,34" stroke={color} strokeWidth="3" strokeLinecap="round" fill="none"/>,
  strengthened: (color) => <polyline points="4,12 68,2" stroke={color} strokeWidth="3" strokeLinecap="round" fill="none"/>,
  deteriorated: (color) => <polyline points="4,28 68,38" stroke={color} strokeWidth="3" strokeLinecap="round" fill="none"/>,
  peak: (color) => <polyline points="4,34 36,6 68,34" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>,
  valley: (color) => <polyline points="4,6 36,34 68,6" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>,
  variable: (color) => <path d="M4,20 C12,6 20,6 28,20 C36,34 44,34 52,20 C60,6 68,14 68,20" stroke={color} strokeWidth="3" strokeLinecap="round" fill="none"/>
};

function ArcSvg({ type, color }) {
  return (
    <svg className="arc-svg" viewBox="0 0 72 40" width="72" height="40">
      {ARC_SVGS[type]?.(color)}
    </svg>
  );
}

export default function DebriefForm() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);

  const narrativeRefs = useRef({});

  const [draftId, setDraftId] = useState(null);
  const [horseNames, setHorseNames] = useState([]);

  // Previous ride process goals (fetched from Firestore)
  const [prevGoals, setPrevGoals] = useState(null); // { goal1, goal2, goal3 } or null

  // Process goal help expanded
  const [goalHelpOpen, setGoalHelpOpen] = useState(false);

  const [formData, setFormData] = useState({
    rideDate: searchParams.get("date") || new Date().toISOString().split('T')[0],
    horseName: '',
    sessionType: '',
    overallQuality: 5,
    confidenceLevel: 5,
    riderEffort: 5,
    horseEffort: 5,
    riderEnergy: '',
    horseEnergy: '',
    mentalState: '',
    movements: [],
    // Legacy intentions (kept for backward compat)
    intentionRatings: {},
    // Process goals
    processGoal1: '',
    processGoal2: '',
    processGoal3: '',
    // Previous goal ratings
    prevGoal1Rating: '',
    prevGoal2Rating: '',
    prevGoal3Rating: '',
    goalReflection: '',
    rideArc: '',
    rideArcNote: '',
    wins: '',
    ahaRealization: '',
    horseNotices: '',
    challenges: '',
    workFocus: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [overallQualityTouched, setOverallQualityTouched] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  const { hasRecovery, applyRecovery, dismissRecovery, clearRecovery } = useFormRecovery(
    'ydj-debrief-recovery', formData, setFormData
  );

  useEffect(() => {
    loadHorses();
    if (id) loadExisting();
  }, [id, currentUser]);

  // Fetch previous goals when horse changes
  useEffect(() => {
    if (formData.horseName && currentUser && !isEdit) {
      fetchPreviousGoals(formData.horseName);
    }
  }, [formData.horseName, currentUser]);

  async function loadHorses() {
    if (!currentUser) return;
    const result = await getAllHorseProfiles(currentUser.uid);
    if (result.success) {
      setHorseNames(result.data.map(h => h.horseName).filter(Boolean));
    } else {
      console.error('Failed to load horse profiles:', result.error);
    }
  }

  async function fetchPreviousGoals(horseName) {
    if (!currentUser) return;
    try {
      const result = await getAllDebriefs(currentUser.uid);
      if (result.success && result.data.length > 0) {
        // Find most recent submitted debrief for this horse with process goals
        const prev = result.data
          .filter(d => d.horseName === horseName && !d.isDraft && d.processGoal1)
          .sort((a, b) => (b.rideDate || '').localeCompare(a.rideDate || ''))[0];
        if (prev) {
          setPrevGoals({
            goal1: prev.processGoal1 || null,
            goal2: prev.processGoal2 || null,
            goal3: prev.processGoal3 || null
          });
        } else {
          setPrevGoals(null);
        }
      }
    } catch {
      setPrevGoals(null);
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
        confidenceLevel: d.confidenceLevel || 5,
        riderEffort: d.riderEffort || 5,
        horseEffort: d.horseEffort || 5,
        riderEnergy: d.riderEnergy || '',
        horseEnergy: d.horseEnergy || '',
        mentalState: d.mentalState || '',
        movements: d.movements || [],
        intentionRatings: d.intentionRatings || {},
        processGoal1: d.processGoal1 || '',
        processGoal2: d.processGoal2 || '',
        processGoal3: d.processGoal3 || '',
        prevGoal1Rating: d.prevGoalRatings?.goal1?.rating || '',
        prevGoal2Rating: d.prevGoalRatings?.goal2?.rating || '',
        prevGoal3Rating: d.prevGoalRatings?.goal3?.rating || '',
        goalReflection: d.prevGoalRatings?.reflection || '',
        rideArc: d.rideArc || '',
        rideArcNote: d.rideArcNote || '',
        wins: d.wins || '',
        ahaRealization: d.ahaRealization || '',
        horseNotices: d.horseNotices || '',
        challenges: d.challenges || '',
        workFocus: d.workFocus || ''
      });
      if (d.overallQuality != null) setOverallQualityTouched(true);
      // Load previous goals if they were stored
      if (d.prevGoalRatings) {
        setPrevGoals({
          goal1: d.prevGoalRatings.goal1?.text || null,
          goal2: d.prevGoalRatings.goal2?.text || null,
          goal3: d.prevGoalRatings.goal3?.text || null
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

  function toggleMovement(value) {
    setFormData(prev => ({
      ...prev,
      movements: prev.movements.includes(value)
        ? prev.movements.filter(m => m !== value)
        : [...prev.movements, value]
    }));
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
    if (!formData.rideArc) newErrors.rideArc = 'Please select how your ride unfolded.';
    if (!formData.processGoal1.trim()) newErrors.processGoal1 = 'At least one process goal is required';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      // Scroll to first error field so user sees what needs fixing (critical on mobile)
      const firstErrorKey = Object.keys(newErrors)[0];
      requestAnimationFrame(() => {
        const el = document.querySelector(`[name="${firstErrorKey}"]`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e, isDraft = false) {
    if (e) e.preventDefault();
    if (!isDraft && !validateForm()) return;

    setLoading(true);

    // Build prevGoalRatings from form state
    let prevGoalRatings = null;
    if (prevGoals) {
      prevGoalRatings = {
        goal1: prevGoals.goal1 ? { text: prevGoals.goal1, rating: formData.prevGoal1Rating || '' } : null,
        goal2: prevGoals.goal2 ? { text: prevGoals.goal2, rating: formData.prevGoal2Rating || '' } : null,
        goal3: prevGoals.goal3 ? { text: prevGoals.goal3, rating: formData.prevGoal3Rating || '' } : null,
        reflection: formData.goalReflection || null
      };
    }

    const data = {
      rideDate: formData.rideDate,
      horseName: formData.horseName,
      sessionType: formData.sessionType,
      overallQuality: overallQualityTouched ? formData.overallQuality : null,
      confidenceLevel: formData.confidenceLevel,
      riderEffort: formData.riderEffort,
      horseEffort: formData.horseEffort,
      riderEnergy: formData.riderEnergy,
      horseEnergy: formData.horseEnergy,
      mentalState: formData.mentalState,
      movements: formData.movements,
      intentionRatings: formData.intentionRatings,
      processGoal1: formData.processGoal1,
      processGoal2: formData.processGoal2,
      processGoal3: formData.processGoal3,
      prevGoalRatings,
      rideArc: formData.rideArc,
      rideArcNote: formData.rideArcNote,
      wins: formData.wins,
      ahaRealization: formData.ahaRealization,
      horseNotices: formData.horseNotices,
      challenges: formData.challenges,
      workFocus: formData.workFocus,
      isDraft
    };

    let result;
    const existingId = isEdit ? id : draftId;
    if (existingId) {
      result = await updateDebrief(existingId, data);
    } else {
      result = await createDebrief(currentUser.uid, data);
      if (result.success && result.id) setDraftId(result.id);
    }

    setLoading(false);

    if (result.success) {
      clearRecovery();
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
        <p>Capture your insights while they're fresh</p>
      </div>

      <form onSubmit={handleSubmit} autoComplete="off">
        <div className="form-card">
          {errors.submit && <div className="form-section"><div className="form-alert form-alert-error">{errors.submit}</div></div>}

          {hasRecovery && (
            <div className="form-section">
              <div className="form-alert form-alert-info" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span>You have unsaved data from a previous session. Would you like to restore it?</span>
                <span style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }} onClick={applyRecovery}>Restore</button>
                  <button type="button" className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }} onClick={dismissRecovery}>Dismiss</button>
                </span>
              </div>
            </div>
          )}

          {/* Section 1: Ride Basics */}
          <FormSection title="Ride Basics">
            <div className="form-row">
              <FormField label="Date of Ride" error={errors.rideDate}>
                <input type="date" name="rideDate" value={formData.rideDate} onChange={handleChange} disabled={loading} />
              </FormField>
              <FormField label="Horse" error={errors.horseName} helpText="Which horse did you ride?">
                {horseNames.length > 0 ? (
                  <select
                    name="horseName"
                    value={formData.horseName}
                    onChange={handleChange}
                    disabled={loading}
                    className={errors.horseName ? 'error' : ''}
                  >
                    <option value="">Select a horse</option>
                    {horseNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    name="horseName"
                    value={formData.horseName}
                    onChange={handleChange}
                    disabled={loading}
                    className={errors.horseName ? 'error' : ''}
                    placeholder="Horse name"
                  />
                )}
              </FormField>
            </div>
            <FormField label="Type of Session" error={errors.sessionType}>
              <RadioGroup name="sessionType" options={SESSION_TYPES} value={formData.sessionType} onChange={handleChange} disabled={loading} />
            </FormField>
          </FormSection>

          {/* Section 2: Quick Ratings */}
          <FormSection title="Quick Ratings" description="Your immediate impressions -- there are no wrong answers.">
            <FormField label={`Overall Ride Quality: ${formData.overallQuality}/10`} optional>
              <input
                type="range"
                name="overallQuality"
                min="1"
                max="10"
                value={formData.overallQuality}
                onChange={e => {
                  setOverallQualityTouched(true);
                  setFormData(prev => ({ ...prev, overallQuality: parseInt(e.target.value, 10) }));
                }}
                disabled={loading}
                style={{ width: '100%', accentColor: '#8B7355' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#7A7A7A' }}>
                <span>Challenging/Frustrating</span><span>Excellent/Breakthrough</span>
              </div>
            </FormField>

            {/* Ride Arc Picker */}
            <FormField label="How did the ride unfold?" error={errors.rideArc} helpText="Rides rarely stay the same from start to finish. Tap the shape that best describes your ride's arc.">
              <div className="arc-grid">
                {RIDE_ARC_OPTIONS.map(opt => (
                  <label className={`arc-option${formData.rideArc === opt.value ? ' selected' : ''}`} key={opt.value}>
                    <input
                      type="radio"
                      name="rideArc"
                      value={opt.value}
                      checked={formData.rideArc === opt.value}
                      onChange={e => {
                        setFormData(prev => ({ ...prev, rideArc: e.target.value }));
                        if (errors.rideArc) setErrors(prev => ({ ...prev, rideArc: '' }));
                      }}
                      disabled={loading}
                    />
                    <div className="arc-card">
                      <ArcSvg type={opt.value} color={opt.color} />
                      <span className="arc-label">{opt.label}</span>
                    </div>
                  </label>
                ))}
              </div>
              {formData.rideArc && formData.rideArc !== 'consistent' && (
                <div className="shift-explain-wrapper">
                  <label style={{ fontSize: '0.92em', color: '#7A7A7A', fontStyle: 'italic', fontWeight: 400, marginBottom: '0.5rem', display: 'block' }}>
                    What caused the shift? <em style={{ fontWeight: 400 }}>(optional)</em>
                  </label>
                  <textarea
                    name="rideArcNote"
                    value={formData.rideArcNote}
                    onChange={handleChange}
                    disabled={loading}
                    placeholder="e.g. We lost connection after the canter transition, but got it back once I softened my hip..."
                    rows={3}
                  />
                </div>
              )}
            </FormField>

            {/* Estimation prompt + Confidence slider */}
            <FormField label={`Confidence in Your Ability to Execute: ${formData.confidenceLevel}/10`} optional helpText="Your in-session sense of whether you could perform the technical work you were attempting — distinct from how good the ride felt overall.">
              <div className="prompt-box" style={{ marginBottom: '0.75rem' }}>
                <div className="prompt-box-content">
                  Before you rate: if someone had filmed this ride, what would they have seen?
                </div>
              </div>
              <input
                type="range"
                name="confidenceLevel"
                min="1"
                max="10"
                value={formData.confidenceLevel}
                onChange={e => setFormData(prev => ({ ...prev, confidenceLevel: parseInt(e.target.value, 10) }))}
                disabled={loading}
                style={{ width: '100%', accentColor: '#8B7355' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#7A7A7A' }}>
                <span>Hesitant / unsure</span><span>Clear and committed</span>
              </div>
            </FormField>

            <FormField label="Energy/Effort Level" optional helpText="Rate the physical effort/energy for trend tracking.">
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ fontSize: '0.92rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
                    Rider Effort: {formData.riderEffort}/10
                  </label>
                  <input
                    type="range"
                    name="riderEffort"
                    min="1"
                    max="10"
                    value={formData.riderEffort}
                    onChange={e => setFormData(prev => ({ ...prev, riderEffort: parseInt(e.target.value, 10) }))}
                    disabled={loading}
                    style={{ width: '100%', accentColor: '#8B7355' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#7A7A7A' }}>
                    <span>Minimal</span><span>Maximum</span>
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ fontSize: '0.92rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
                    Horse Effort: {formData.horseEffort}/10
                  </label>
                  <input
                    type="range"
                    name="horseEffort"
                    min="1"
                    max="10"
                    value={formData.horseEffort}
                    onChange={e => setFormData(prev => ({ ...prev, horseEffort: parseInt(e.target.value, 10) }))}
                    disabled={loading}
                    style={{ width: '100%', accentColor: '#8B7355' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#7A7A7A' }}>
                    <span>Minimal</span><span>Maximum</span>
                  </div>
                </div>
              </div>
            </FormField>
            <FormField label="Your Energy Level" optional>
              <RadioGroup name="riderEnergy" options={RIDER_ENERGY_LEVELS} value={formData.riderEnergy} onChange={handleChange} disabled={loading} />
            </FormField>
            <FormField label="Horse's Energy Level" optional>
              <RadioGroup name="horseEnergy" options={HORSE_ENERGY_LEVELS} value={formData.horseEnergy} onChange={handleChange} disabled={loading} />
            </FormField>

            {/* Mental/Emotional State — valence-grouped */}
            <FormField label="Your mental/emotional state" optional>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {MENTAL_STATE_GROUPS.map(group => (
                  <div key={group.label}>
                    <div style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: '#7A7A7A',
                      marginBottom: '0.4rem',
                      borderBottom: '1px solid #F0EBE3',
                      paddingBottom: '0.25rem'
                    }}>
                      {group.label}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {group.states.map(state => (
                        <label key={state.value} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          cursor: 'pointer',
                          padding: '0.35rem 0.75rem',
                          borderRadius: '20px',
                          border: `1.5px solid ${formData.mentalState === state.value ? '#8B7355' : '#E0D5C7'}`,
                          background: formData.mentalState === state.value ? '#8B7355' : 'white',
                          color: formData.mentalState === state.value ? 'white' : '#3A3A3A',
                          fontSize: '0.9rem',
                          transition: 'all 0.15s ease'
                        }}>
                          <input
                            type="radio"
                            name="mentalState"
                            value={state.value}
                            checked={formData.mentalState === state.value}
                            onChange={handleChange}
                            disabled={loading}
                            style={{ display: 'none' }}
                          />
                          {state.label}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </FormField>
          </FormSection>

          {/* Section: Movements & Exercises */}
          <FormSection title="Exercises & Movements" description="Select what you worked on today. Tap to toggle.">
            {MOVEMENT_CATEGORIES.map(category => (
              <div key={category.label} style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#8B7355', marginBottom: '0.5rem' }}>
                  {category.label}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {category.tags.map(tag => (
                    <button
                      key={tag.value}
                      type="button"
                      onClick={() => toggleMovement(tag.value)}
                      disabled={loading}
                      className={`movement-tag ${formData.movements.includes(tag.value) ? 'selected' : ''}`}
                    >
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </FormSection>

          {/* Section: Process Goals */}
          <FormSection title="Process Goals" description="What will you focus on in your next ride?">
            {/* Previous ride check-in — only show when previous goals exist */}
            {prevGoals && (prevGoals.goal1 || prevGoals.goal2 || prevGoals.goal3) && (
              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#FAF8F5', borderRadius: '12px', border: '1px solid #E0D5C7' }}>
                <div style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#7A7A7A',
                  marginBottom: '0.75rem'
                }}>
                  From your last ride
                </div>
                {[
                  { goal: prevGoals.goal1, ratingKey: 'prevGoal1Rating' },
                  { goal: prevGoals.goal2, ratingKey: 'prevGoal2Rating' },
                  { goal: prevGoals.goal3, ratingKey: 'prevGoal3Rating' }
                ].filter(item => item.goal).map((item, idx) => (
                  <div key={idx} style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: idx < 2 ? '1px solid #E0D5C7' : 'none' }}>
                    <div style={{ fontSize: '0.95rem', marginBottom: '0.5rem', fontStyle: 'italic', color: '#3A3A3A' }}>
                      {item.goal}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#7A7A7A', marginBottom: '0.35rem' }}>
                      How well did you maintain this focus?
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {PREV_GOAL_RATING_OPTIONS.map(opt => (
                        <label key={opt.value} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          cursor: 'pointer',
                          padding: '0.3rem 0.65rem',
                          borderRadius: '16px',
                          border: `1.5px solid ${formData[item.ratingKey] === opt.value ? '#8B7355' : '#E0D5C7'}`,
                          background: formData[item.ratingKey] === opt.value ? '#8B7355' : 'white',
                          color: formData[item.ratingKey] === opt.value ? 'white' : '#3A3A3A',
                          fontSize: '0.82rem',
                          transition: 'all 0.15s ease'
                        }}>
                          <input
                            type="radio"
                            name={item.ratingKey}
                            value={opt.value}
                            checked={formData[item.ratingKey] === opt.value}
                            onChange={handleChange}
                            disabled={loading}
                            style={{ display: 'none' }}
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', color: '#7A7A7A', display: 'block', marginBottom: '0.35rem' }}>
                    What got in the way, or what helped? <span style={{ fontStyle: 'italic' }}>(optional)</span>
                  </label>
                  <textarea
                    name="goalReflection"
                    value={formData.goalReflection}
                    onChange={handleChange}
                    disabled={loading}
                    rows={2}
                    style={{ fontSize: '0.9rem' }}
                  />
                </div>
              </div>
            )}

            <p style={{ fontSize: '0.9rem', color: '#7A7A7A', marginBottom: '1rem', lineHeight: '1.5' }}>
              Name up to three specific things you will DO — not achieve. Process goals direct your attention during the ride. Keep each one short and action-focused.
            </p>

            <FormField label="Process Goal 1" error={errors.processGoal1}>
              <input
                type="text"
                name="processGoal1"
                value={formData.processGoal1}
                onChange={handleChange}
                disabled={loading}
                className={errors.processGoal1 ? 'error' : ''}
                placeholder="e.g. 'Wait for Rocket Star to seek the contact before asking for collection'"
              />
            </FormField>
            <FormField label="Process Goal 2" optional>
              <input
                type="text"
                name="processGoal2"
                value={formData.processGoal2}
                onChange={handleChange}
                disabled={loading}
                placeholder="e.g. 'Breathe through every downward transition'"
              />
            </FormField>
            <FormField label="Process Goal 3" optional>
              <input
                type="text"
                name="processGoal3"
                value={formData.processGoal3}
                onChange={handleChange}
                disabled={loading}
                placeholder="e.g. 'Soften my lower back at the moment of canter strike-off'"
              />
            </FormField>

            <div style={{ marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setGoalHelpOpen(prev => !prev)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#8B7355',
                  cursor: 'pointer',
                  fontSize: '0.88rem',
                  textDecoration: 'underline',
                  padding: 0
                }}
              >
                {goalHelpOpen ? 'Hide' : "What's a process goal?"}
              </button>
              {goalHelpOpen && (
                <div style={{
                  marginTop: '0.5rem',
                  padding: '0.75rem 1rem',
                  background: '#FAF8F5',
                  borderRadius: '8px',
                  border: '1px solid #E0D5C7',
                  fontSize: '0.88rem',
                  color: '#5A5A5A',
                  lineHeight: '1.5'
                }}>
                  <p style={{ marginBottom: '0.5rem' }}>
                    A process goal describes an action within your control during the ride — what you will attend to or do, not what you hope results from it.
                  </p>
                  <p style={{ marginBottom: '0.5rem' }}>
                    <strong style={{ color: '#D0021B' }}>Outcome goal (avoid for in-session focus):</strong> "Get a good canter transition"
                  </p>
                  <p style={{ marginBottom: '0.5rem' }}>
                    <strong style={{ color: '#6B8E5F' }}>Process goal (use this):</strong> "Establish outside rein contact before asking"
                  </p>
                  <p style={{ margin: 0, fontStyle: 'italic' }}>
                    Three is the maximum. More than three splits your attention below useful threshold.
                  </p>
                </div>
              )}
            </div>
          </FormSection>

          {/* Section: Narrative */}
          <FormSection title="What Happened" description="The heart of your reflection -- what stands out from this ride?">
            {NARRATIVE_FIELDS.map(field => (
              <FormField key={field.key} label={field.label} optional>
                <GuidingQuestions text={field.placeholder} />
                <textarea
                  ref={el => { getNarrativeRef(field.key).current = el; }}
                  name={field.key}
                  value={formData[field.key]}
                  onChange={handleChange}
                  disabled={loading}
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
              {loading ? 'Saving...' : 'Save as Draft'}
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
