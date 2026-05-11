import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase-config';
import { useAuth } from '../../contexts/AuthContext';
import {
  createMicroDebrief,
  getAllHorseProfiles,
  MENTAL_STATE_GROUPS,
} from '../../services';
import VoiceInput from '../Forms/VoiceInput';
import '../HabitLoop/HabitLoop.css';

/**
 * Micro-Debrief form — 4 required fields + 1 optional.
 *
 * Flow:
 *   1. Rider fills in date, horse, quality (1-10), mental state, optional moment.
 *   2. On submit → write doc via createMicroDebrief.
 *   3. Subscribe to the new doc with onSnapshot. The onMicroDebriefSubmit
 *      Cloud Function fires on document creation, calls Sonnet, and writes
 *      empatheticResponse back to the same document. The listener picks it
 *      up and renders the response card below the form.
 *   4. If response doesn't arrive in 8 seconds, show a fallback canned
 *      response inline (the Cloud Function also writes a fallback on
 *      Sonnet failure — this client-side timeout is a UX safety net).
 *
 * The form stays visible after submit so the rider can resubmit or change
 * inputs (per micro-debrief-prototype-v3.html).
 */

// Client-side fallback timeout. Cloud Function p50 is ~5-7s; cold starts can
// push it to 10s+, so the fallback window is generous. When the real response
// arrives after the fallback has shown, the listener stays subscribed and
// swaps the fallback text for the real Empathetic Coach response.
const RESPONSE_TIMEOUT_MS = 15000;
const CLIENT_FALLBACK_RESPONSE =
  "Captured. Thanks for logging this one — we'll take it from here.";

// Flatten the existing 10-value debrief mental-state enum into the
// "How were you in the saddle?" chip list. Per founder's Phase 2 decision:
// reuse the debrief enum so micros and fulls are interchangeable for
// downstream prompts.
function buildMentalStateChips() {
  const chips = [];
  for (const group of MENTAL_STATE_GROUPS) {
    for (const s of group.states) chips.push(s);
  }
  return chips;
}
const MENTAL_STATE_CHIPS = buildMentalStateChips();

export default function MicroDebriefForm() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const momentRef = useRef(null);

  // Defaults
  const today = new Date().toISOString().slice(0, 10);

  const [formData, setFormData] = useState({
    date: today,
    horseName: '',
    horseId: '',
    quality: null,
    mentalState: '',
    momentText: '',
  });
  const [horseProfiles, setHorseProfiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submittedDocId, setSubmittedDocId] = useState(null);
  const [response, setResponse] = useState(null); // {text, fallback?}
  const [error, setError] = useState(null);

  // Load the rider's horses for the dropdown
  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    (async () => {
      const result = await getAllHorseProfiles(currentUser.uid);
      if (cancelled) return;
      if (result.success) setHorseProfiles(result.data || []);
    })();
    return () => { cancelled = true; };
  }, [currentUser]);

  // Subscribe to the new doc once submitted, with a fallback timeout.
  // The listener stays subscribed for the lifetime of the component — even
  // after the fallback fires — so a late-arriving Cloud Function response
  // replaces the canned fallback in place. (Earlier version tore the
  // listener down at the timeout, leaving the rider stuck on the fallback
  // when the real response arrived 1-3 seconds later.)
  useEffect(() => {
    if (!submittedDocId) return;
    let timeoutId = null;
    let realArrived = false;

    const ref = doc(db, 'microDebriefs', submittedDocId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        if (data.empatheticResponse && !realArrived) {
          realArrived = true;
          setResponse({ text: data.empatheticResponse, fallback: false });
          if (timeoutId) clearTimeout(timeoutId);
        }
      },
      (err) => {
        console.warn('[MicroDebriefForm] snapshot error:', err.message);
      }
    );

    // Show the canned fallback if no real response by the timeout. Do NOT
    // unsubscribe — the real response may still arrive and we want to
    // upgrade the UI when it does.
    timeoutId = setTimeout(() => {
      if (realArrived) return;
      setResponse((prev) => prev || { text: CLIENT_FALLBACK_RESPONSE, fallback: true });
    }, RESPONSE_TIMEOUT_MS);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      unsub();
    };
  }, [submittedDocId]);

  function selectQuality(n) {
    setFormData((d) => ({ ...d, quality: n }));
  }
  function selectMentalState(value) {
    setFormData((d) => ({ ...d, mentalState: value }));
  }
  function handleChange(field, value) {
    setFormData((d) => ({ ...d, [field]: value }));
    setError(null);
  }
  function handleHorseChange(value) {
    const match = horseProfiles.find((h) => h.horseName === value);
    setFormData((d) => ({
      ...d,
      horseName: value,
      horseId: match ? match.id : '',
    }));
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    setError(null);

    // JS-only validation
    if (!formData.date) {
      setError('Pick a date for the ride.');
      return;
    }
    if (!formData.horseName.trim()) {
      setError("Add the horse's name.");
      return;
    }
    if (!formData.quality) {
      setError('Tap a quality number from 1 to 10.');
      return;
    }
    if (!formData.mentalState) {
      setError('Pick how you were in the saddle.');
      return;
    }

    setSubmitting(true);
    setResponse(null);

    const payload = {
      date: formData.date,
      horseId: formData.horseId,
      horseName: formData.horseName.trim(),
      quality: Number(formData.quality),
      mentalState: formData.mentalState,
      momentText: formData.momentText.trim(),
    };

    const result = await createMicroDebrief(currentUser.uid, payload);
    setSubmitting(false);

    if (!result.success) {
      setError(result.error || 'Could not save the micro-debrief. Try again.');
      return;
    }

    setSubmittedDocId(result.id);

    // Scroll the response area into view shortly after the loading card appears
    setTimeout(() => {
      const el = document.getElementById('hl-response-anchor');
      if (el?.scrollIntoView) {
        try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (_) {}
      }
    }, 80);
  }

  function resetForm() {
    setFormData({
      date: today,
      horseName: '',
      horseId: '',
      quality: null,
      mentalState: '',
      momentText: '',
    });
    setSubmittedDocId(null);
    setResponse(null);
    setError(null);
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (_) { /* noop */ }
  }

  const hasHorses = horseProfiles.length > 0;
  const showResponseArea = submittedDocId !== null;

  return (
    <div className="habit-loop-page">
      <div className="habit-loop-container">
        <header className="habit-loop-header">
          <h1>Micro Debrief</h1>
          <div className="subtitle">90 seconds. The essentials. Truth-telling at its smallest.</div>
        </header>

        <form
          className="habit-loop-frame"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="habit-loop-intro">
            <p>
              <strong>When to use this:</strong> when you don't have the headspace for a
              full debrief, when you're still at the barn and want to capture the ride
              before it fades, or when you're just easing back into the habit.
            </p>
            <p>
              The full debrief gives you and your AI more to work with — but a micro
              beats no debrief, and the AI still has something to listen to.
            </p>
          </div>

          <div className="hl-row">
            <div className="hl-field-group">
              <label className="hl-field-label">
                Date <span className="hl-required">*</span>
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                disabled={submitting || showResponseArea}
              />
            </div>
            <div className="hl-field-group">
              <label className="hl-field-label">
                Horse <span className="hl-required">*</span>
              </label>
              {hasHorses ? (
                <select
                  value={formData.horseName}
                  onChange={(e) => handleHorseChange(e.target.value)}
                  disabled={submitting || showResponseArea}
                >
                  <option value="">Select a horse</option>
                  {horseProfiles.map((h) => (
                    <option key={h.id} value={h.horseName}>{h.horseName}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={formData.horseName}
                  placeholder="Rocket Star"
                  onChange={(e) => handleHorseChange(e.target.value)}
                  disabled={submitting || showResponseArea}
                />
              )}
            </div>
          </div>

          <div className="hl-field-group">
            <label className="hl-field-label">
              Overall ride quality <span className="hl-required">*</span>
              <span className="hl-helper">Gut-feel, not analysis. 1 = struggle, 10 = flowing.</span>
            </label>
            <div className="hl-num-row">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`hl-num-btn ${formData.quality === n ? 'selected' : ''}`}
                  onClick={() => selectQuality(n)}
                  disabled={submitting || showResponseArea}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="hl-field-group">
            <label className="hl-field-label">
              How were you in the saddle? <span className="hl-required">*</span>
            </label>
            <div className="hl-chip-grid">
              {MENTAL_STATE_CHIPS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  className={`hl-chip ${formData.mentalState === s.value ? 'selected' : ''}`}
                  onClick={() => selectMentalState(s.value)}
                  disabled={submitting || showResponseArea}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="hl-field-group">
            <label className="hl-field-label">
              One thing worth remembering
              <span className="hl-helper">
                A word, a phrase, a feeling, a moment. Whatever stayed with you.
                Optional but encouraged — this is what gives the AI something to
                listen to.
              </span>
            </label>
            <textarea
              ref={momentRef}
              value={formData.momentText}
              onChange={(e) => handleChange('momentText', e.target.value)}
              placeholder='e.g. "Falling-down neck for half a circle." "Rushed the changes again." "He was honest today."'
              disabled={submitting || showResponseArea}
            />
            <VoiceInput
              textareaRef={momentRef}
              onTranscript={(text) => handleChange('momentText', text)}
              disabled={submitting || showResponseArea}
            />
          </div>

          {error && (
            <div
              role="alert"
              style={{
                color: '#B84A4A',
                background: '#FFF1F0',
                border: '1px solid #F5C7C7',
                padding: '10px 14px',
                borderRadius: '8px',
                marginTop: '12px',
                fontSize: '0.9em',
              }}
            >
              {error}
            </div>
          )}

          <div className="hl-submit-row">
            <a className="hl-skip-link" href="/debriefs/new" onClick={(e) => {
              e.preventDefault();
              navigate('/debriefs/new');
            }}>
              Have more time? Do the full debrief →
            </a>
            <button
              type="submit"
              className="hl-submit-btn"
              disabled={submitting || showResponseArea}
            >
              {submitting ? 'Saving…' : 'Submit'}
            </button>
          </div>
        </form>

        <div id="hl-response-anchor" />

        {showResponseArea && (
          <>
            <div className="hl-voice-response">
              <div className="hl-voice-name">⭐ The Empathetic Coach</div>
              {response ? (
                <div className="hl-voice-text">{response.text}</div>
              ) : (
                <div className="hl-loading">
                  <span className="hl-loading-dot" />
                  <span className="hl-loading-dot" />
                  <span className="hl-loading-dot" />
                  <span style={{ marginLeft: '8px' }}>Capturing your reflection…</span>
                </div>
              )}
            </div>

            {response && (
              <div className="hl-done-actions">
                <button type="button" className="linklike" onClick={resetForm}>
                  Try different inputs
                </button>
                <a href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
                  Back to dashboard
                </a>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
