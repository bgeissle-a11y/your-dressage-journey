import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase-config';
import { useAuth } from '../../contexts/AuthContext';
import {
  createFreshStart,
  getAllFreshStarts,
  computeFreshStartCaps,
  FRESH_START_STATES,
} from '../../services';
import VoiceInput from '../Forms/VoiceInput';
import '../HabitLoop/HabitLoop.css';

/**
 * Fresh Start form — re-onboarding after a gap from the platform.
 *
 * Required: confidence (1-10) and the riding-toggle (State A or B).
 * Other fields are optional.
 *
 * State A (rider hasn't been riding) hides fields 2/3/4. State B shows all
 * five fields. State is set by the explicit toggle, not inferred from
 * content.
 *
 * Flow:
 *   1. Rider fills in fields → submit.
 *   2. createFreshStart writes the document.
 *   3. onFreshStartSubmit Cloud Function fires, calls Sonnet, writes
 *      empatheticResponse back.
 *   4. onSnapshot listener picks up the response. Fallback at 12 seconds
 *      (Fresh Start prompts are longer than micro).
 *
 * The response card is multi-paragraph; we render plain-text with newline
 * preservation via white-space: pre-wrap on the .hl-voice-text class.
 */

// Fresh Start responses are longer than micros, so the Sonnet call takes
// longer (smoke test showed 7-9s). Generous timeout window — and the listener
// stays subscribed past the fallback so a late real response replaces the
// canned text in place.
const RESPONSE_TIMEOUT_MS = 20000;
const CLIENT_FALLBACK_RESPONSE =
  "Welcome back. The dataset picks up from your next entry. No catch-up required.";

export default function FreshStartForm() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const workingOnRef = useRef(null);
  const goingWellRef = useRef(null);
  const difficultRef = useRef(null);
  const anythingElseRef = useRef(null);

  const [formData, setFormData] = useState({
    confidence: null,
    confidenceExplanation: '',
    state: null, // 'A' or 'B', set by toggle
    workingOn: '',
    goingWell: '',
    difficult: '',
    anythingElse: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submittedDocId, setSubmittedDocId] = useState(null);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  // Cap state — null while loading, then an object from computeFreshStartCaps.
  // Layer 1 defense: don't let the rider submit if they're at the monthly or
  // yearly cap. Soft-deleted entries are excluded by getAllFreshStarts itself.
  const [capState, setCapState] = useState(null);
  const [capLoading, setCapLoading] = useState(true);

  // Load the rider's existing Fresh Starts on mount, compute cap state.
  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    (async () => {
      const result = await getAllFreshStarts(currentUser.uid);
      if (cancelled) return;
      const list = result.success ? (result.data || []) : [];
      setCapState(computeFreshStartCaps(list));
      setCapLoading(false);
    })();
    return () => { cancelled = true; };
  }, [currentUser]);

  // Subscribe to the new doc once submitted. Listener stays alive past the
  // fallback timeout so a late-arriving Cloud Function response replaces the
  // canned fallback. (Earlier version tore the listener down at the timeout,
  // which stranded riders on the fallback.)
  useEffect(() => {
    if (!submittedDocId) return;
    let timeoutId = null;
    let realArrived = false;

    const ref = doc(db, 'freshStarts', submittedDocId);
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
        console.warn('[FreshStartForm] snapshot error:', err.message);
      }
    );

    timeoutId = setTimeout(() => {
      if (realArrived) return;
      setResponse((prev) => prev || { text: CLIENT_FALLBACK_RESPONSE, fallback: true });
    }, RESPONSE_TIMEOUT_MS);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      unsub();
    };
  }, [submittedDocId]);

  function selectConfidence(n) {
    setFormData((d) => ({ ...d, confidence: n }));
    setError(null);
  }
  function setState(state) {
    setFormData((d) => ({ ...d, state }));
    setError(null);
  }
  function handleChange(field, value) {
    setFormData((d) => ({ ...d, [field]: value }));
    setError(null);
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    setError(null);

    // Defense in depth: if cap state hasn't loaded yet, or the rider is
    // already at cap (race window between mount and the load resolving),
    // refuse the submit. The cap-notice UI normally replaces the form
    // entirely, but this guard covers the brief loading window.
    if (capLoading) {
      setError('Just a moment — checking your Fresh Start history…');
      return;
    }
    if (capState?.atAnyCap) {
      const reason = capState.capReason === 'yearly'
        ? `You've used all 4 Fresh Starts for the year. The next one unlocks on ${capState.nextAvailableLabel}.`
        : `You've already done a Fresh Start this month. The next one unlocks on ${capState.nextAvailableLabel}.`;
      setError(reason);
      return;
    }

    if (!formData.confidence) {
      setError('Tap a confidence number from 1 to 10. (Even just that is a real fresh start.)');
      return;
    }
    if (!formData.state) {
      setError("Pick whether you've been riding while away from the platform.");
      return;
    }

    setSubmitting(true);
    setResponse(null);

    const payload = {
      state: formData.state,
      confidence: Number(formData.confidence),
      confidenceExplanation: formData.confidenceExplanation.trim(),
      workingOn: formData.state === 'B' ? formData.workingOn.trim() : '',
      goingWell: formData.state === 'B' ? formData.goingWell.trim() : '',
      difficult: formData.state === 'B' ? formData.difficult.trim() : '',
      anythingElse: formData.anythingElse.trim(),
    };

    const result = await createFreshStart(currentUser.uid, payload);
    setSubmitting(false);

    if (!result.success) {
      setError(result.error || 'Could not save the Fresh Start. Try again.');
      return;
    }

    setSubmittedDocId(result.id);

    setTimeout(() => {
      const el = document.getElementById('hl-response-anchor');
      if (el?.scrollIntoView) {
        try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (_) {}
      }
    }, 80);
  }

  function resetForm() {
    setFormData({
      confidence: null,
      confidenceExplanation: '',
      state: null,
      workingOn: '',
      goingWell: '',
      difficult: '',
      anythingElse: '',
    });
    setSubmittedDocId(null);
    setResponse(null);
    setError(null);
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (_) {}
  }

  const showResponseArea = submittedDocId !== null;
  const isStateB = formData.state === 'B';

  return (
    <div className="habit-loop-page">
      <div className="habit-loop-container">
        <header className="habit-loop-header">
          <h1>Fresh Start</h1>
          <div className="subtitle">
            A way to step back into reflection — without trying to recreate
            everything you missed.
          </div>
        </header>

        <div className="habit-loop-welcome">
          <div className="habit-loop-welcome-label">⭐ The Empathetic Coach</div>
          <div className="habit-loop-welcome-body">
            <p>
              Welcome back. Whatever pulled you away from the platform — life, work,
              the horse, yourself — the dataset doesn't care about the gap. It picks
              up wherever you start it again.
            </p>
            <p>
              There's nothing to catch up on. <strong>This takes about five minutes.</strong>
              {' '}Skip any field that doesn't apply — even submitting with just your
              confidence number is a real fresh start.
            </p>
          </div>
        </div>

        {/* Cap notice — shown instead of the form when the rider has already
            used their monthly or yearly Fresh Start allotment. The dataset
            doesn't need another one; warmly redirect to the right tools. */}
        {!capLoading && capState?.atAnyCap ? (
          <div className="habit-loop-frame">
            <div
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '1.15em',
                color: '#3A3A3A',
                lineHeight: 1.65,
                fontStyle: 'italic',
              }}
            >
              {capState.capReason === 'yearly' ? (
                <p style={{ margin: 0 }}>
                  You've already taken your four Fresh Starts for the year. The
                  dataset has what it needs from those — the next Fresh Start
                  unlocks on{' '}
                  <strong style={{ fontStyle: 'normal', color: '#8B7355' }}>
                    {capState.nextAvailableLabel}
                  </strong>
                  . Until then, your next ride is the right place to pick up.
                </p>
              ) : (
                <p style={{ margin: 0 }}>
                  You've already done a Fresh Start this month — the dataset
                  has what it needs from that one. The next Fresh Start
                  unlocks on{' '}
                  <strong style={{ fontStyle: 'normal', color: '#8B7355' }}>
                    {capState.nextAvailableLabel}
                  </strong>
                  . In the meantime, the tools below are the right fit for
                  whatever's next.
                </p>
              )}
            </div>
            <div className="hl-done-actions" style={{ marginTop: '20px' }}>
              <a
                href="/forms/micro-debrief"
                className="primary"
                onClick={(e) => { e.preventDefault(); navigate('/forms/micro-debrief'); }}
              >
                Quick Capture →
              </a>
              <a
                href="/debriefs/new"
                onClick={(e) => { e.preventDefault(); navigate('/debriefs/new'); }}
              >
                Post-Ride Debrief
              </a>
              <a href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
                Back to dashboard
              </a>
            </div>
          </div>
        ) : (
        <form
          className="habit-loop-frame"
          onSubmit={handleSubmit}
          noValidate
        >
          {/* Field 1: Confidence (REQUIRED) */}
          <div className="hl-field-group divided">
            <label className="hl-field-label large">
              Where's your confidence right now? <span className="hl-required">*</span>
            </label>
            <div className="hl-helper standalone">A gut number. 1 = pretty shaky, 10 = solid.</div>
            <div className="hl-num-row">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`hl-num-btn ${formData.confidence === n ? 'selected' : ''}`}
                  onClick={() => selectConfidence(n)}
                  disabled={submitting || showResponseArea}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="hl-anchor-row">
              <span>shaky</span>
              <span>solid</span>
            </div>
            <textarea
              value={formData.confidenceExplanation}
              onChange={(e) => handleChange('confidenceExplanation', e.target.value)}
              placeholder="If you want to say a little about why — go for it. Otherwise leave it blank."
              disabled={submitting || showResponseArea}
            />
            <div className="hl-helper optional" style={{ marginTop: '8px' }}>
              A sentence is plenty.
            </div>
          </div>

          {/* Riding-toggle (drives State A vs B) */}
          <div className="hl-riding-toggle">
            <div className="hl-toggle-label">
              Have you been riding while you've been away from the platform?
              <span className="hl-required" style={{ marginLeft: '4px' }}>*</span>
            </div>
            <div className="hl-toggle-options">
              <button
                type="button"
                className={`hl-toggle-btn ${formData.state === FRESH_START_STATES.RIDING ? 'selected' : ''}`}
                onClick={() => setState(FRESH_START_STATES.RIDING)}
                disabled={submitting || showResponseArea}
              >
                Yes — riding, just not logging
              </button>
              <button
                type="button"
                className={`hl-toggle-btn ${formData.state === FRESH_START_STATES.AWAY ? 'selected' : ''}`}
                onClick={() => setState(FRESH_START_STATES.AWAY)}
                disabled={submitting || showResponseArea}
              >
                No — life pulled me away
              </button>
            </div>
          </div>

          {/* Fields 2/3/4 — State B only */}
          {isStateB && (
            <>
              <div className="hl-field-group divided">
                <label className="hl-field-label large">
                  Since the last time you were here, what have you been working on?
                </label>
                <div className="hl-helper optional standalone">
                  Movements, position, partnership, mental work — whatever's been on
                  your mind in the saddle.
                </div>
                <textarea
                  ref={workingOnRef}
                  value={formData.workingOn}
                  onChange={(e) => handleChange('workingOn', e.target.value)}
                  placeholder='e.g. "Inter II piaffe work, plus the falling-down neck on Rocket Star."'
                  disabled={submitting || showResponseArea}
                />
                <VoiceInput
                  textareaRef={workingOnRef}
                  onTranscript={(text) => handleChange('workingOn', text)}
                  disabled={submitting || showResponseArea}
                />
              </div>

              <div className="hl-field-group divided">
                <label className="hl-field-label large">What has been going well?</label>
                <div className="hl-helper optional standalone">
                  Your own wins or recognition from others. Small wins count.
                </div>
                <textarea
                  ref={goingWellRef}
                  value={formData.goingWell}
                  onChange={(e) => handleChange('goingWell', e.target.value)}
                  disabled={submitting || showResponseArea}
                />
                <VoiceInput
                  textareaRef={goingWellRef}
                  onTranscript={(text) => handleChange('goingWell', text)}
                  disabled={submitting || showResponseArea}
                />
              </div>

              <div className="hl-field-group divided">
                <label className="hl-field-label large">What has been difficult?</label>
                <div className="hl-helper optional standalone">
                  The hard parts — physical, mental, partnership, life.
                </div>
                <textarea
                  ref={difficultRef}
                  value={formData.difficult}
                  onChange={(e) => handleChange('difficult', e.target.value)}
                  placeholder="Just name what's been sticky. Don't try to fix it here."
                  disabled={submitting || showResponseArea}
                />
                <VoiceInput
                  textareaRef={difficultRef}
                  onTranscript={(text) => handleChange('difficult', text)}
                  disabled={submitting || showResponseArea}
                />
              </div>
            </>
          )}

          {/* Field 5: Anything else (always visible) */}
          <div className="hl-field-group divided">
            <label className="hl-field-label large">Anything else you want to report on?</label>
            <div className="hl-helper optional standalone">
              Free space. Could be a horse health note, a major life thing, a
              question, a feeling. Whatever feels worth saying.
            </div>
            <textarea
              ref={anythingElseRef}
              value={formData.anythingElse}
              onChange={(e) => handleChange('anythingElse', e.target.value)}
              disabled={submitting || showResponseArea}
            />
            <VoiceInput
              textareaRef={anythingElseRef}
              onTranscript={(text) => handleChange('anythingElse', text)}
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
            <a className="hl-skip-link" href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
              Not now — just take me to the dashboard
            </a>
            <button
              type="submit"
              className="hl-submit-btn"
              disabled={submitting || showResponseArea}
            >
              {submitting ? 'Settling in…' : 'Submit Fresh Start'}
            </button>
          </div>
        </form>
        )}

        <div id="hl-response-anchor" />

        {showResponseArea && (
          <>
            <div className="hl-voice-response">
              <div className="hl-voice-name">⭐ The Empathetic Coach — A Note for Your Return</div>
              {response ? (
                <div className="hl-voice-text">{response.text}</div>
              ) : (
                <div className="hl-loading">
                  <span className="hl-loading-dot" />
                  <span className="hl-loading-dot" />
                  <span className="hl-loading-dot" />
                  <span style={{ marginLeft: '8px' }}>Settling in…</span>
                </div>
              )}
            </div>

            {response && (
              <div className="hl-done-actions">
                <button type="button" className="linklike" onClick={resetForm}>
                  Try different inputs
                </button>
                <a
                  href="/forms/micro-debrief"
                  className="primary"
                  onClick={(e) => { e.preventDefault(); navigate('/forms/micro-debrief'); }}
                >
                  Log today's ride →
                </a>
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
