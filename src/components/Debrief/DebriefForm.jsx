import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  createDebrief, getDebrief, updateDebrief,
  getAllHorseProfiles, getAllDebriefs,
  SESSION_TYPES, RIDER_ENERGY_LEVELS, HORSE_ENERGY_LEVELS,
  MENTAL_STATE_GROUPS,
  MOVEMENT_CATEGORIES, GROUNDWORK_MOVEMENT_CATEGORIES,
  SESSION_MODALITY_OPTIONS, RIDE_ARC_OPTIONS
} from '../../services';
import { readPracticeCardCache } from '../../services/weeklyFocusService';
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
  const location = useLocation();
  const isEdit = Boolean(id);

  const narrativeRefs = useRef({});

  const [draftId, setDraftId] = useState(null);
  const [horseNames, setHorseNames] = useState([]);

  // Practice Card confirmed goals (fetched from cache)
  const [practiceCardGoals, setPracticeCardGoals] = useState(null); // string[] or null
  const [hasPracticeCard, setHasPracticeCard] = useState(false);

  const [formData, setFormData] = useState({
    rideDate: searchParams.get("date") || new Date().toISOString().split('T')[0],
    horseName: '',
    sessionType: '',
    sessionModality: '',
    overallQuality: 5,
    confidenceLevel: null,
    riderEffort: null,
    horseEffort: null,
    riderEnergy: '',
    horseEnergy: '',
    mentalState: '',
    movements: [],
    // Legacy intentions (kept for backward compat)
    intentionRatings: {},
    // Goal ratings (from Practice Card or fallback)
    goalRating1: '',
    goalRating2: '',
    goalRating3: '',
    goalReflection: '',
    // Fallback manual goals (when no Practice Card)
    fallbackGoal1: '',
    fallbackGoal2: '',
    fallbackGoal3: '',
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
  const [confidenceTouched, setConfidenceTouched] = useState(false);
  const [riderEffortTouched, setRiderEffortTouched] = useState(false);
  const [horseEffortTouched, setHorseEffortTouched] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  // Snapshot of formData captured immediately after loadExisting completes.
  // Used to gate the recovery hook's auto-save: while formData equals the
  // baseline, the user hasn't actually edited anything, so don't write a
  // recovery blob that would later trigger a "phantom" recovery banner.
  // For new debriefs (no id), baseline stays null and isDirty is always true.
  const [loadedBaseline, setLoadedBaseline] = useState(null);
  const isDirty = loadedBaseline === null
    ? true
    : JSON.stringify(formData) !== JSON.stringify(loadedBaseline);

  const { hasRecovery, applyRecovery, dismissRecovery, clearRecovery } = useFormRecovery(
    'ydj-debrief-recovery', id, formData, setFormData, isDirty
  );

  useEffect(() => {
    loadHorses();
    if (id) loadExisting();
  }, [id, currentUser]);

  // Load Practice Card goals: from nav state (instant) or Firestore (fallback)
  useEffect(() => {
    if (isEdit) return;
    const navGoals = location.state?.practiceCardGoals;
    if (navGoals && navGoals.length > 0) {
      setPracticeCardGoals(navGoals);
      setHasPracticeCard(true);
    } else if (currentUser) {
      fetchPracticeCardGoals();
    }
  }, [currentUser]);

  async function loadHorses() {
    if (!currentUser) return;
    const result = await getAllHorseProfiles(currentUser.uid);
    if (result.success) {
      setHorseNames(result.data.map(h => h.horseName).filter(Boolean));
    } else {
      console.error('Failed to load horse profiles:', result.error);
    }
  }

  async function fetchPracticeCardGoals() {
    if (!currentUser) return;
    try {
      const data = await readPracticeCardCache(currentUser.uid);
      if (data && data.confirmedAt) {
        const goals = data.confirmedGoals || data.processGoals || data.suggestedGoals || [];
        if (goals.length > 0) {
          setPracticeCardGoals(goals);
          setHasPracticeCard(true);
          return;
        }
      }
      setPracticeCardGoals(null);
      setHasPracticeCard(false);
    } catch {
      setPracticeCardGoals(null);
      setHasPracticeCard(false);
    }
  }

  async function loadExisting() {
    if (!id) return;
    setLoadingData(true);
    const result = await getDebrief(id);
    if (result.success) {
      const d = result.data;
      const loaded = {
        rideDate: d.rideDate || '',
        horseName: d.horseName || '',
        sessionType: d.sessionType || '',
        sessionModality: d.sessionModality || '',
        overallQuality: d.overallQuality ?? 5,
        confidenceLevel: d.confidenceLevel ?? null,
        riderEffort: d.riderEffort ?? null,
        horseEffort: d.horseEffort ?? null,
        riderEnergy: d.riderEnergy || '',
        horseEnergy: d.horseEnergy || '',
        mentalState: d.mentalState || '',
        movements: d.movements || [],
        intentionRatings: d.intentionRatings || {},
        goalRating1: d.prevGoalRatings?.goal1?.rating || '',
        goalRating2: d.prevGoalRatings?.goal2?.rating || '',
        goalRating3: d.prevGoalRatings?.goal3?.rating || '',
        goalReflection: d.prevGoalRatings?.reflection || '',
        fallbackGoal1: '',
        fallbackGoal2: '',
        fallbackGoal3: '',
        rideArc: d.rideArc || '',
        rideArcNote: d.rideArcNote || '',
        wins: d.wins || '',
        ahaRealization: d.ahaRealization || '',
        horseNotices: d.horseNotices || '',
        challenges: d.challenges || '',
        workFocus: d.workFocus || ''
      };
      setFormData(loaded);
      setLoadedBaseline(loaded);
      if (d.overallQuality != null) setOverallQualityTouched(true);
      if (d.confidenceLevel != null) setConfidenceTouched(true);
      if (d.riderEffort != null) setRiderEffortTouched(true);
      if (d.horseEffort != null) setHorseEffortTouched(true);
      // Load process goals if stored
      if (d.processGoal1) {
        const goals = [
          d.processGoal1,
          d.processGoal2,
          d.processGoal3
        ].filter(Boolean);
        if (goals.length > 0) {
          setPracticeCardGoals(goals);
          setHasPracticeCard(true);
        }
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
    if (!formData.sessionModality) newErrors.sessionModality = 'Please select how this session happened';
    if (!formData.rideArc) newErrors.rideArc = 'Please select how your session unfolded.';
    if (!overallQualityTouched) newErrors.overallQuality = 'Please rate your overall session quality.';
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

    // Build goal data based on whether Practice Card was used
    let confirmedGoalsSnapshot = null;
    let goalRatings = null;

    if (hasPracticeCard && practiceCardGoals) {
      // Primary path: Practice Card goals
      confirmedGoalsSnapshot = {
        goal1: practiceCardGoals[0] || null,
        goal2: practiceCardGoals[1] || null,
        goal3: practiceCardGoals[2] || null
      };
      goalRatings = {
        goal1: formData.goalRating1 || null,
        goal2: formData.goalRating2 || null,
        goal3: formData.goalRating3 || null,
        reflection: formData.goalReflection || null
      };
    } else {
      // Fallback path: manual entry
      const fb1 = formData.fallbackGoal1?.trim();
      const fb2 = formData.fallbackGoal2?.trim();
      const fb3 = formData.fallbackGoal3?.trim();
      if (fb1 || fb2 || fb3) {
        confirmedGoalsSnapshot = {
          goal1: fb1 || null,
          goal2: fb2 || null,
          goal3: fb3 || null
        };
        goalRatings = {
          goal1: fb1 ? (formData.goalRating1 || null) : null,
          goal2: fb2 ? (formData.goalRating2 || null) : null,
          goal3: fb3 ? (formData.goalRating3 || null) : null,
          reflection: formData.goalReflection || null
        };
      }
    }

    const data = {
      rideDate: formData.rideDate,
      horseName: formData.horseName,
      sessionType: formData.sessionType,
      sessionModality: formData.sessionModality,
      overallQuality: overallQualityTouched ? formData.overallQuality : null,
      confidenceLevel: confidenceTouched ? formData.confidenceLevel : null,
      riderEffort: riderEffortTouched ? formData.riderEffort : null,
      horseEffort: horseEffortTouched ? formData.horseEffort : null,
      riderEnergy: formData.riderEnergy,
      horseEnergy: formData.horseEnergy,
      mentalState: formData.mentalState,
      movements: formData.movements,
      intentionRatings: formData.intentionRatings,
      processGoal1: confirmedGoalsSnapshot?.goal1 || '',
      processGoal2: confirmedGoalsSnapshot?.goal2 || '',
      processGoal3: confirmedGoalsSnapshot?.goal3 || '',
      prevGoalRatings: goalRatings ? {
        goal1: goalRatings.goal1 ? { text: confirmedGoalsSnapshot?.goal1 || '', rating: goalRatings.goal1 } : null,
        goal2: goalRatings.goal2 ? { text: confirmedGoalsSnapshot?.goal2 || '', rating: goalRatings.goal2 } : null,
        goal3: goalRatings.goal3 ? { text: confirmedGoalsSnapshot?.goal3 || '', rating: goalRatings.goal3 } : null,
        reflection: goalRatings.reflection || null
      } : null,
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
        <h1>{isEdit ? 'Edit Debrief' : 'Debrief'}</h1>
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

          {/* Section 1: Session Basics */}
          <FormSection title="Session Basics">
            <div className="form-row">
              <FormField label="Date of Session" error={errors.rideDate}>
                <input type="date" name="rideDate" value={formData.rideDate} onChange={handleChange} disabled={loading} />
              </FormField>
              <FormField label="Horse" error={errors.horseName} helpText="Which horse?">
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
                  <>
                    <input
                      type="text"
                      name="horseName"
                      value={formData.horseName}
                      onChange={handleChange}
                      disabled={loading}
                      className={errors.horseName ? 'error' : ''}
                      placeholder="Horse name"
                    />
                    <p className="form-field-warning">
                      Tip: <a href="/horses/new">Create a horse profile</a> first to ensure consistent naming across all your entries.
                    </p>
                  </>
                )}
              </FormField>
            </div>
            <FormField label="Type of Session" error={errors.sessionType}>
              <RadioGroup name="sessionType" options={SESSION_TYPES} value={formData.sessionType} onChange={handleChange} disabled={loading} />
            </FormField>
          </FormSection>

          {/* Section: Session Modality (added April 2026 — groundwork awareness) */}
          <FormSection title="How did this session happen?" description="Tells the platform how to frame your coaching and which work options to show below.">
            <FormField label="" error={errors.sessionModality}>
              <div className="modality-grid">
                {SESSION_MODALITY_OPTIONS.map(opt => (
                  <label
                    key={opt.value}
                    className={`modality-option${formData.sessionModality === opt.value ? ' selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="sessionModality"
                      value={opt.value}
                      checked={formData.sessionModality === opt.value}
                      onChange={e => {
                        setFormData(prev => ({ ...prev, sessionModality: e.target.value }));
                        if (errors.sessionModality) setErrors(prev => ({ ...prev, sessionModality: '' }));
                      }}
                      disabled={loading}
                    />
                    <span className="modality-icon">{opt.icon}</span>
                    <span className="modality-label">{opt.label}</span>
                    <span className="modality-sub">{opt.sub}</span>
                  </label>
                ))}
              </div>
            </FormField>
          </FormSection>

          {/* Section 2: Quick Ratings */}
          <FormSection title="Quick Ratings" description="Your immediate impressions -- there are no wrong answers.">
            <FormField label={overallQualityTouched ? `Overall Session Quality: ${formData.overallQuality}/10` : 'Overall Session Quality'} error={errors.overallQuality}>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#7A7A7A', marginTop: '0.4rem', lineHeight: '1.3' }}>
                <span style={{ width: '18%', textAlign: 'left' }}>1–2<br/>Survival mode</span>
                <span style={{ width: '18%', textAlign: 'center' }}>3–4<br/>Below where I want to be</span>
                <span style={{ width: '18%', textAlign: 'center' }}>5–6<br/>Solid working session</span>
                <span style={{ width: '18%', textAlign: 'center' }}>7–8<br/>Better than typical</span>
                <span style={{ width: '18%', textAlign: 'right' }}>9–10<br/>Breakthrough quality</span>
              </div>
            </FormField>

            {/* Session Arc Picker */}
            <FormField label="How did the session unfold?" error={errors.rideArc} helpText="Sessions rarely stay the same from start to finish. Tap the shape that best describes your session's arc.">
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
            <FormField label={confidenceTouched ? `Confidence in Your Ability to Execute: ${formData.confidenceLevel}/10` : 'Confidence in Your Ability to Execute'} optional helpText="Your in-session sense of whether you could perform the technical work you were attempting — distinct from how good the session felt overall.">
              <div className="prompt-box" style={{ marginBottom: '0.75rem' }}>
                <div className="prompt-box-content">
                  Before you rate: if someone had filmed this session, what would they have seen?
                </div>
              </div>
              <input
                type="range"
                name="confidenceLevel"
                min="1"
                max="10"
                value={formData.confidenceLevel ?? 5}
                onChange={e => {
                  setConfidenceTouched(true);
                  setFormData(prev => ({ ...prev, confidenceLevel: parseInt(e.target.value, 10) }));
                }}
                disabled={loading}
                style={{ width: '100%', accentColor: '#8B7355', opacity: confidenceTouched ? 1 : 0.35 }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#7A7A7A', marginTop: '0.4rem', lineHeight: '1.3' }}>
                <span style={{ width: '18%', textAlign: 'left' }}>1–2<br/>Guessing / uncertain</span>
                <span style={{ width: '18%', textAlign: 'center' }}>3–4<br/>Doubting</span>
                <span style={{ width: '18%', textAlign: 'center' }}>5–6<br/>Reasonably clear</span>
                <span style={{ width: '18%', textAlign: 'center' }}>7–8<br/>Mostly clear</span>
                <span style={{ width: '18%', textAlign: 'right' }}>9–10<br/>Committed and present</span>
              </div>
            </FormField>

            <FormField label="Energy/Effort Level" optional helpText="Rate the physical effort/energy for trend tracking.">
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ fontSize: '0.92rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
                    {riderEffortTouched ? `Rider Effort: ${formData.riderEffort}/10` : 'Rider Effort'}
                  </label>
                  <input
                    type="range"
                    name="riderEffort"
                    min="1"
                    max="10"
                    value={formData.riderEffort ?? 5}
                    onChange={e => {
                      setRiderEffortTouched(true);
                      setFormData(prev => ({ ...prev, riderEffort: parseInt(e.target.value, 10) }));
                    }}
                    disabled={loading}
                    style={{ width: '100%', accentColor: '#8B7355', opacity: riderEffortTouched ? 1 : 0.35 }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#7A7A7A' }}>
                    <span>Minimal</span><span>Maximum</span>
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ fontSize: '0.92rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
                    {horseEffortTouched ? `Horse Effort: ${formData.horseEffort}/10` : 'Horse Effort'}
                  </label>
                  <input
                    type="range"
                    name="horseEffort"
                    min="1"
                    max="10"
                    value={formData.horseEffort ?? 5}
                    onChange={e => {
                      setHorseEffortTouched(true);
                      setFormData(prev => ({ ...prev, horseEffort: parseInt(e.target.value, 10) }));
                    }}
                    disabled={loading}
                    style={{ width: '100%', accentColor: '#8B7355', opacity: horseEffortTouched ? 1 : 0.35 }}
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

          {/* Section: Movements & Exercises — modality-aware (April 2026) */}
          {!formData.sessionModality && (
            <FormSection title="Exercises & Movements" description="Select what you worked on today. Tap to toggle.">
              <div className="modality-empty-state">
                Select <em>How did this session happen?</em> above to see the work options.
              </div>
            </FormSection>
          )}

          {(formData.sessionModality === 'in-saddle' || formData.sessionModality === 'combined') && (
            <FormSection title="Ridden Work" description="What you worked on in the saddle. Tap to toggle.">
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
          )}

          {(formData.sessionModality === 'on-ground' || formData.sessionModality === 'combined') && (
            <FormSection title="Ground Work" description="What you worked on from the ground. Tap to toggle.">
              {GROUNDWORK_MOVEMENT_CATEGORIES.map(category => (
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
          )}

          {/* Section: Process Goals — rate confirmed goals from Practice Card */}
          <FormSection title="Process Goals" description="How well did you stay focused on your goals for this session?">
            {hasPracticeCard && practiceCardGoals && practiceCardGoals.length > 0 ? (
              /* Primary path: Practice Card was locked — show goals read-only with ratings */
              <div>
                <div style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#7A7A7A',
                  marginBottom: '0.75rem'
                }}>
                  From your practice card
                </div>
                {practiceCardGoals.map((goal, idx) => {
                  const ratingKey = `goalRating${idx + 1}`;
                  return (
                    <div key={idx} style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: idx < practiceCardGoals.length - 1 ? '1px solid #E0D5C7' : 'none' }}>
                      <div style={{ fontSize: '0.95rem', marginBottom: '0.5rem', fontStyle: 'italic', color: '#3A3A3A' }}>
                        {goal}
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
                            border: `1.5px solid ${formData[ratingKey] === opt.value ? '#8B7355' : '#E0D5C7'}`,
                            background: formData[ratingKey] === opt.value ? '#8B7355' : 'white',
                            color: formData[ratingKey] === opt.value ? 'white' : '#3A3A3A',
                            fontSize: '0.82rem',
                            transition: 'all 0.15s ease'
                          }}>
                            <input
                              type="radio"
                              name={ratingKey}
                              value={opt.value}
                              checked={formData[ratingKey] === opt.value}
                              onChange={handleChange}
                              disabled={loading}
                              style={{ display: 'none' }}
                            />
                            {opt.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
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
            ) : (
              /* Fallback path: no locked Practice Card — manual entry */
              <div>
                <p style={{ fontSize: '0.9rem', color: '#7A7A7A', marginBottom: '1rem', lineHeight: '1.5' }}>
                  What were you focusing on in this session?
                </p>
                {[
                  { goalKey: 'fallbackGoal1', ratingKey: 'goalRating1', num: 1 },
                  { goalKey: 'fallbackGoal2', ratingKey: 'goalRating2', num: 2 },
                  { goalKey: 'fallbackGoal3', ratingKey: 'goalRating3', num: 3 }
                ].map(({ goalKey, ratingKey, num }) => (
                  <div key={goalKey} style={{ marginBottom: '1rem' }}>
                    <FormField label={`Focus ${num}`} optional={num > 1}>
                      <input
                        type="text"
                        name={goalKey}
                        value={formData[goalKey]}
                        onChange={handleChange}
                        disabled={loading}
                        placeholder="What were you working on?"
                      />
                    </FormField>
                    {formData[goalKey]?.trim() && (
                      <div style={{ marginTop: '0.35rem', marginBottom: '0.5rem' }}>
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
                              border: `1.5px solid ${formData[ratingKey] === opt.value ? '#8B7355' : '#E0D5C7'}`,
                              background: formData[ratingKey] === opt.value ? '#8B7355' : 'white',
                              color: formData[ratingKey] === opt.value ? 'white' : '#3A3A3A',
                              fontSize: '0.82rem',
                              transition: 'all 0.15s ease'
                            }}>
                              <input
                                type="radio"
                                name={ratingKey}
                                value={opt.value}
                                checked={formData[ratingKey] === opt.value}
                                onChange={handleChange}
                                disabled={loading}
                                style={{ display: 'none' }}
                              />
                              {opt.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
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
          </FormSection>

          {/* Section: Narrative */}
          <FormSection title="What Happened" description="The heart of your reflection -- what stands out from this session?">
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
