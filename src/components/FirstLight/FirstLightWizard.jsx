import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  upsertFirstLightReflection,
  getFirstLightReflectionsByCategory,
} from '../../services/reflectionService';
import { getRiderProfile } from '../../services/riderProfileService';
import { getAllHorseProfiles } from '../../services/horseProfileService';
import FormField from '../Forms/FormField';
import VoiceInput from '../Forms/VoiceInput';
import '../Forms/Forms.css';
import './FirstLightWizard.css';

// Source of truth: YDJ_FirstLight_Implementation_Brief_v3.md §3.1
// These six prompts are intentionally hard-coded. The four-voice mechanic
// depends on the specific signal these prompts elicit, so they are NOT
// rider-selectable from a pool the way regular reflections are.
const FIRST_LIGHT_SCREENS = [
  {
    category: 'personal',
    label: 'Personal Milestone',
    prompt: 'Describe a recent moment in your riding that felt like a personal breakthrough — big or small.',
  },
  {
    category: 'validation',
    label: 'External Validation',
    prompt: "Tell us about an achievement in your riding that you're particularly proud of.",
  },
  {
    category: 'aha',
    label: 'Aha Moment',
    prompt: "Describe a dressage insight you've recently rediscovered — something that clicked in a new way.",
  },
  {
    category: 'obstacle',
    label: 'Obstacle',
    prompt: "Describe a challenge you're currently facing in your riding — the one that keeps showing up.",
  },
  {
    category: 'connection',
    label: 'Connection',
    prompt: 'Describe a moment when you felt a genuine connection to your horse.',
  },
  {
    category: 'feel',
    label: 'Feel & Body Awareness',
    prompt: 'Describe something about your position or body that you regularly work to improve — and why it matters.',
  },
];

const TOTAL_SCREENS = FIRST_LIGHT_SCREENS.length;

function ProgressIndicator({ currentIndex, label }) {
  const dots = [];
  for (let i = 0; i < TOTAL_SCREENS; i++) {
    dots.push(
      <span
        key={i}
        className={`fl-dot ${i < currentIndex ? 'done' : i === currentIndex ? 'current' : ''}`}
      />
    );
  }
  return (
    <div className="fl-progress">
      <div className="fl-progress-dots">{dots}</div>
      <div className="fl-progress-label">
        Reflection {currentIndex + 1} of {TOTAL_SCREENS} · {label}
      </div>
    </div>
  );
}

const EMPTY_FORM = {
  mainReflection: '',
  obstacleStrategy: '',
  feeling: '',
  influence: '',
};

export default function FirstLightWizard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const mainRef = useRef(null);
  const obstacleRef = useRef(null);
  const feelingRef = useRef(null);
  const influenceRef = useRef(null);

  // Map of category → existing wizard reflection (or null)
  const [byCategory, setByCategory] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [phase, setPhase] = useState('loading'); // loading | ineligible | wizard | error
  const [ineligibleReasons, setIneligibleReasons] = useState([]);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  // Initial load: check eligibility + load existing wizard reflections
  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;

    (async () => {
      // Eligibility check (must mirror the Cloud Function's checks)
      const reasons = [];
      const riderRes = await getRiderProfile(currentUser.uid);
      const riderComplete = riderRes.success && riderRes.data && riderRes.data.fullName;
      if (!riderComplete) reasons.push('Complete your Rider Profile');

      const horseRes = await getAllHorseProfiles(currentUser.uid);
      const completeHorses = horseRes.success
        ? (horseRes.data || []).filter(h => h.horseName && h.horseName.trim())
        : [];
      if (completeHorses.length === 0) reasons.push('Complete at least one Horse Profile');

      const reflRes = await getFirstLightReflectionsByCategory(currentUser.uid);
      const existing = reflRes.success ? reflRes.data : {};

      if (cancelled) return;

      if (reasons.length > 0) {
        setIneligibleReasons(reasons);
        setPhase('ineligible');
        return;
      }

      // Open at the first incomplete screen
      const firstIncomplete = FIRST_LIGHT_SCREENS.findIndex(
        s => !existing[s.category]
      );
      const startIndex = firstIncomplete === -1 ? TOTAL_SCREENS - 1 : firstIncomplete;
      setByCategory(existing);
      setCurrentIndex(startIndex);
      hydrateFormFromExisting(existing, startIndex);
      setPhase('wizard');
    })();

    return () => { cancelled = true; };
  }, [currentUser]);

  function hydrateFormFromExisting(map, idx) {
    const screen = FIRST_LIGHT_SCREENS[idx];
    const existing = map[screen.category];
    if (existing) {
      setFormData({
        mainReflection: existing.mainReflection || '',
        obstacleStrategy: existing.obstacleStrategy || '',
        feeling: existing.feeling || '',
        influence: existing.influence || '',
      });
    } else {
      setFormData(EMPTY_FORM);
    }
    setErrors({});
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  }

  function validate(category) {
    const next = {};
    if (!formData.mainReflection.trim()) next.mainReflection = 'Please share your reflection';
    if (category === 'obstacle' && !formData.obstacleStrategy.trim()) {
      next.obstacleStrategy = 'Please share how you might approach this obstacle';
    }
    if (!formData.feeling.trim()) next.feeling = 'Please describe how this makes you feel';
    if (!formData.influence.trim()) next.influence = 'Please share how this will influence future rides';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSaveAndContinue() {
    const screen = FIRST_LIGHT_SCREENS[currentIndex];
    if (!validate(screen.category)) return;

    setErrors({});
    setSaving(true);
    console.log('[FirstLightWizard] saving screen', currentIndex + 1, '— category:', screen.category);

    let result;
    try {
      result = await upsertFirstLightReflection(currentUser.uid, {
        category: screen.category,
        prompt: screen.prompt,
        mainReflection: formData.mainReflection,
        obstacleStrategy: screen.category === 'obstacle' ? formData.obstacleStrategy : null,
        feeling: formData.feeling,
        influence: formData.influence,
      });
    } catch (err) {
      console.error('[FirstLightWizard] save threw unexpectedly:', err);
      result = { success: false, error: err.message || String(err) };
    }
    setSaving(false);

    if (!result || !result.success) {
      const msg = (result && result.error) || 'Save failed — please try again.';
      console.error('[FirstLightWizard] save failed:', msg);
      setErrors({ submit: msg });
      // Don't advance — keep the rider on this screen so they don't lose work.
      return;
    }

    console.log('[FirstLightWizard] save succeeded — id:', result.id, 'replaced:', !!result.replaced);

    // Update the local map so going Back shows what we just saved
    const savedRecord = {
      id: result.id,
      category: screen.category,
      prompt: screen.prompt,
      mainReflection: formData.mainReflection,
      obstacleStrategy: screen.category === 'obstacle' ? formData.obstacleStrategy : null,
      feeling: formData.feeling,
      influence: formData.influence,
    };
    const nextMap = { ...byCategory, [screen.category]: savedRecord };
    setByCategory(nextMap);

    // Brief "Saved ✓" flash so the rider sees the write landed
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);

    if (currentIndex === TOTAL_SCREENS - 1) {
      // Last screen — return to Quick Start where the Generate button awaits
      navigate('/quickstart');
      return;
    }
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    hydrateFormFromExisting(nextMap, nextIndex);
  }

  function handleBack() {
    if (currentIndex === 0) {
      navigate('/quickstart');
      return;
    }
    const prevIndex = currentIndex - 1;
    setCurrentIndex(prevIndex);
    hydrateFormFromExisting(byCategory, prevIndex);
  }

  function handleExit() {
    // Partial progress is preserved in Firestore; just leave.
    navigate('/quickstart');
  }

  // ─── Rendering ──────────────────────────────────────────────────────

  if (phase === 'loading') {
    return <div className="loading-state">Loading your First Light…</div>;
  }

  if (phase === 'ineligible') {
    return (
      <div className="form-page">
        <div className="form-page-header">
          <h1>Your First Light</h1>
          <p>A first read of you and your horse from your coaches.</p>
        </div>
        <div className="form-card">
          <div className="form-section">
            <h2 className="form-section-title">Almost there</h2>
            <p>To unlock First Light, please complete:</p>
            <ul className="fl-eligibility-list">
              {ineligibleReasons.map(r => <li key={r}>{r}</li>)}
            </ul>
            <p className="fl-eligibility-note">
              The richer your input, the richer your First Light.
            </p>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/quickstart')}>
              Back to Quick Start
            </button>
          </div>
        </div>
      </div>
    );
  }

  const screen = FIRST_LIGHT_SCREENS[currentIndex];
  const isLast = currentIndex === TOTAL_SCREENS - 1;
  const continueLabel = saving
    ? 'Saving…'
    : isLast ? 'Save & Finish' : 'Save & Continue →';
  const completedCount = Object.values(byCategory).filter(Boolean).length;
  const screenAlreadySaved = !!byCategory[screen.category];

  return (
    <div className="form-page fl-wizard">
      <div className="form-page-header">
        <div className="fl-eyebrow">✦ First Light entry</div>
        <h1>Your First Light</h1>
        <p>Six short reflections — one for each category. They're saved to your reflection record as you go.</p>
      </div>

      <ProgressIndicator currentIndex={currentIndex} label={screen.label} />

      {errors.submit && (
        <div className="fl-banner fl-banner-error" role="alert">
          <strong>Save didn't go through.</strong>
          <div>{errors.submit}</div>
          <div className="fl-banner-hint">
            Your typed text is still on this screen — try Save &amp; Continue again.
            If it keeps failing, copy this message and check the browser console for details.
          </div>
        </div>
      )}

      {savedFlash && (
        <div className="fl-banner fl-banner-success" role="status">
          ✓ Saved.
        </div>
      )}

      <div className="form-card">
        <div className="form-section">
          <h2 className="fl-screen-title">{screen.label}</h2>
          <p className="fl-screen-prompt">{screen.prompt}</p>
          {screenAlreadySaved && (
            <div className="fl-screen-saved-note">
              ✓ You've already saved this reflection — edits below will replace it.
            </div>
          )}

          <FormField label="Your reflection" error={errors.mainReflection}>
            <textarea
              ref={mainRef}
              name="mainReflection"
              value={formData.mainReflection}
              onChange={handleChange}
              disabled={saving}
              className={`tall ${errors.mainReflection ? 'error' : ''}`}
              placeholder="Take your time — share whatever this brings up for you."
            />
            <VoiceInput textareaRef={mainRef} onTranscript={text => {
              setFormData(prev => ({ ...prev, mainReflection: text }));
              if (errors.mainReflection) setErrors(prev => ({ ...prev, mainReflection: '' }));
            }} />
          </FormField>
        </div>

        {screen.category === 'obstacle' && (
          <div className="form-section">
            <FormField label="How might you approach or overcome this obstacle?" error={errors.obstacleStrategy}>
              <textarea
                ref={obstacleRef}
                name="obstacleStrategy"
                value={formData.obstacleStrategy}
                onChange={handleChange}
                disabled={saving}
                className={errors.obstacleStrategy ? 'error' : ''}
                placeholder="Consider strategies, support systems, or mindset shifts that could help…"
              />
              <VoiceInput textareaRef={obstacleRef} onTranscript={text => {
                setFormData(prev => ({ ...prev, obstacleStrategy: text }));
                if (errors.obstacleStrategy) setErrors(prev => ({ ...prev, obstacleStrategy: '' }));
              }} />
            </FormField>
          </div>
        )}

        <div className="form-section">
          <FormField label="How does this make you feel?" error={errors.feeling}>
            <textarea
              ref={feelingRef}
              name="feeling"
              value={formData.feeling}
              onChange={handleChange}
              disabled={saving}
              className={errors.feeling ? 'error' : ''}
              style={{ minHeight: '80px' }}
              placeholder="Grateful, empowered, hopeful, grounded…"
            />
            <VoiceInput textareaRef={feelingRef} onTranscript={text => {
              setFormData(prev => ({ ...prev, feeling: text }));
              if (errors.feeling) setErrors(prev => ({ ...prev, feeling: '' }));
            }} />
          </FormField>
        </div>

        <div className="form-section">
          <FormField label="How will this influence your approach to future rides?" error={errors.influence}>
            <textarea
              ref={influenceRef}
              name="influence"
              value={formData.influence}
              onChange={handleChange}
              disabled={saving}
              className={errors.influence ? 'error' : ''}
              placeholder="Consider how this insight or experience will shape your journey forward…"
            />
            <VoiceInput textareaRef={influenceRef} onTranscript={text => {
              setFormData(prev => ({ ...prev, influence: text }));
              if (errors.influence) setErrors(prev => ({ ...prev, influence: '' }));
            }} />
          </FormField>
        </div>

        <div className="form-actions fl-actions">
          <button type="button" className="btn btn-secondary" onClick={handleBack} disabled={saving}>
            ← Back
          </button>
          <button type="button" className="btn-link fl-exit" onClick={handleExit} disabled={saving}>
            Save progress &amp; exit
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSaveAndContinue} disabled={saving}>
            {continueLabel}
          </button>
        </div>

        <div className="fl-completion-note">
          {completedCount} of {TOTAL_SCREENS} reflections saved · they count toward your Multi-Voice threshold immediately.
        </div>
      </div>
    </div>
  );
}
