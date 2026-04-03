import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  MOVEMENT_GROUPS, SUB_OPTIONS, ASPIRATIONAL_MOVEMENTS, ASPIRATIONAL_SUBS,
  STANDARD_PROBLEMS, WARMUP_PROBLEMS, REFERENCE_OPTIONS, CONTEXT_OPTIONS,
  SENSORY_OPTIONS, LENGTH_OPTIONS,
} from './visualizationConstants';
import './Visualization.css';

export default function VisualizationForm({ onGenerate, generating }) {
  const [searchParams] = useSearchParams();

  const [movement, setMovement] = useState(null);
  const [movementSub, setMovementSub] = useState(null);
  const [movementSub2, setMovementSub2] = useState(null);
  const [problemFocus, setProblemFocus] = useState(null);
  const [referenceType, setReferenceType] = useState(null);
  const [referenceText, setReferenceText] = useState('');
  const [context, setContext] = useState(null);
  const [sensoryPreference, setSensoryPreference] = useState(null);
  const [scriptLength, setScriptLength] = useState('standard');

  const [errors, setErrors] = useState({});
  const [hasPrefill, setHasPrefill] = useState(false);

  const isWarmup = movement === 'warm-up';

  // Determine if current selection is aspirational
  const isAspirational =
    ASPIRATIONAL_MOVEMENTS.includes(movement) ||
    ASPIRATIONAL_SUBS.includes(movementSub);

  // URL param pre-fill (from Weekly Focus)
  useEffect(() => {
    const m = searchParams.get('movement');
    const p = searchParams.get('problem');
    const c = searchParams.get('context');
    const l = searchParams.get('length');
    if (!m && !p && !c && !l) return;

    setHasPrefill(true);
    if (m) setMovement(m);
    if (p) setProblemFocus(p);
    if (c) setContext(c);
    if (l) setScriptLength(l);
  }, [searchParams]);

  function handleSelectMovement(key) {
    setMovement(key);
    setMovementSub(null);
    setMovementSub2(null);
    // Clear problem focus when switching between warmup and standard
    if ((key === 'warm-up') !== isWarmup) {
      setProblemFocus(null);
    }
    // Clear test context if switching to warmup
    if (key === 'warm-up' && context === 'test') {
      setContext(null);
    }
    setErrors(prev => ({ ...prev, movement: false }));
  }

  function handleSelectSub(key, aspirational) {
    setMovementSub(key);
    setErrors(prev => ({ ...prev, movement: false }));
  }

  function validate() {
    const newErrors = {};
    if (!movement) newErrors.movement = true;
    if (!problemFocus) newErrors.problem = true;
    if (!referenceType) newErrors.reference = true;
    if (!context) newErrors.context = true;
    return newErrors;
  }

  function handleSubmit() {
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onGenerate({
      movement,
      movementSub: movementSub || null,
      movementSub2: movementSub2 || null,
      problemFocus,
      referenceType,
      referenceText: referenceText.trim() || null,
      context,
      sensoryPreference: sensoryPreference || null,
      scriptLength,
    });
  }

  const problems = isWarmup ? WARMUP_PROBLEMS : STANDARD_PROBLEMS;
  const subConfig = movement ? SUB_OPTIONS[movement] : null;
  const showRefTextarea = referenceType && referenceType !== 'none';

  return (
    <div>
      {/* Header */}
      <div className="viz-header">
        <div className="viz-header-eyebrow">🧠 Rider's Toolkit</div>
        <h1>Visualization Script Builder</h1>
        <p className="viz-header-sub">
          Build a personalized mental rehearsal script for any movement —
          then use it between rides to develop feel before you're in the saddle.
        </p>
        <div className="viz-header-note">
          Your script is generated from your rider profile, horse profile, and debrief history.
          Answer the questions below to frame what the AI needs to personalize it for you.
        </div>
      </div>

      {/* Prefill banner */}
      {hasPrefill && (
        <div className="viz-prefill-banner">
          <span>✦</span>
          <span>Pre-filled from your Weekly Focus suggestion. Review and adjust before generating.</span>
        </div>
      )}

      {/* Section 1: Movement */}
      <div className="viz-section">
        <div className="viz-section-header">
          <div className="viz-section-num">1</div>
          <div className="viz-section-title">
            <h2>Which movement do you want to rehearse?</h2>
            <p>Choose one. Sub-options appear for movements that need more specificity.</p>
          </div>
        </div>
        <div className="viz-section-body">
          {MOVEMENT_GROUPS.map(group => (
            <div key={group.label} className="viz-movement-group">
              <div className="viz-movement-group-label">{group.label}</div>
              <div className="viz-movement-grid">
                {group.movements.map(m => (
                  <button
                    key={m.key}
                    className={`viz-chip${m.advanced ? ' advanced' : ''}${movement === m.key ? ' selected' : ''}`}
                    onClick={() => handleSelectMovement(m.key)}
                    type="button"
                  >
                    {m.label}
                    {m.hasSub && <span className="arrow">›</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Sub-selections */}
          {subConfig && (
            <div className="viz-sub-panel">
              <div className="viz-sub-label">{subConfig.label}</div>
              <div className="viz-sub-options">
                {subConfig.options.map(opt => (
                  <button
                    key={opt.key}
                    className={`viz-sub-option${movementSub === opt.key ? ' selected' : ''}`}
                    onClick={() => handleSelectSub(opt.key, opt.aspirational)}
                    type="button"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {subConfig.sub2 && (
                <div style={{ marginTop: 10, fontSize: '0.8em', color: 'var(--color-text-light)' }}>
                  {subConfig.sub2.label}
                  <div className="viz-sub-options" style={{ marginTop: 6 }}>
                    {subConfig.sub2.options.map(opt => (
                      <button
                        key={opt.key}
                        className={`viz-sub-option${movementSub2 === opt.key ? ' selected' : ''}`}
                        onClick={() => setMovementSub2(opt.key)}
                        type="button"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Aspiration note */}
          {isAspirational && !isWarmup && (
            <div className="viz-aspiration-note">
              <p><strong>An aspiration movement — and a great one to visualize.</strong> Imagery is one of the most legitimate ways to begin building a felt sense of a movement before you have physical experience of it. Research supports this: mental practice develops internal movement representations even without physical repetition.</p>
              <p style={{ marginTop: 8 }}>Your script will be grounded in what you already know — the feel of collection, the rhythm of canter, the coordination you've already built — and it will extend from there toward the new movement. The first few sessions are about laying track, not running on it.</p>
            </div>
          )}

          {errors.movement && (
            <div className="viz-hint">Please select a movement to continue.</div>
          )}
        </div>
      </div>

      {/* Section 2: Problem Focus */}
      <div className="viz-section">
        <div className="viz-section-header">
          <div className="viz-section-num">2</div>
          <div className="viz-section-title">
            <h2>What specifically needs work?</h2>
            <p>The problem you're solving shapes the heart of your script.</p>
          </div>
        </div>
        <div className="viz-section-body">
          <div className="viz-radio-cards">
            {problems.map(p => (
              <label
                key={p.value}
                className={`viz-radio-card${problemFocus === p.value ? ' selected' : ''}`}
                onClick={() => { setProblemFocus(p.value); setErrors(prev => ({ ...prev, problem: false })); }}
              >
                <input type="radio" name="problem" value={p.value} checked={problemFocus === p.value} readOnly />
                <div>
                  <div className="viz-radio-card-label">{p.icon} {p.label}</div>
                  <div className="viz-radio-card-desc">{p.desc}</div>
                </div>
              </label>
            ))}
          </div>
          {errors.problem && (
            <div className="viz-hint">Please select the challenge you're working on.</div>
          )}
        </div>
      </div>

      {/* Section 3: Reference Moment */}
      <div className="viz-section">
        <div className="viz-section-header">
          <div className="viz-section-num">3</div>
          <div className="viz-section-title">
            <h2>Do you have a reference moment to anchor the script?</h2>
            <p>A real memory — even partial — makes imagery significantly more effective.</p>
          </div>
        </div>
        <div className="viz-section-body">
          <div className="viz-radio-cards">
            {REFERENCE_OPTIONS.map(r => (
              <label
                key={r.value}
                className={`viz-radio-card${referenceType === r.value ? ' selected' : ''}`}
                onClick={() => { setReferenceType(r.value); setErrors(prev => ({ ...prev, reference: false })); }}
              >
                <input type="radio" name="reference" value={r.value} checked={referenceType === r.value} readOnly />
                <div>
                  <div className="viz-radio-card-label">{r.icon} {r.label}</div>
                  <div className="viz-radio-card-desc">{r.desc}</div>
                </div>
              </label>
            ))}
          </div>

          {showRefTextarea && (
            <div className="viz-ref-textarea">
              <label>Describe the moment in a few sentences — what did you feel?</label>
              <textarea
                value={referenceText}
                onChange={e => setReferenceText(e.target.value)}
                rows={3}
                placeholder="e.g., In my Wednesday lesson Cindy had me come out of the corner with more inside leg and the canter half-pass just flowed..."
              />
            </div>
          )}

          {errors.reference && (
            <div className="viz-hint">Please select a reference option.</div>
          )}
        </div>
      </div>

      {/* Section 4: Context */}
      <div className="viz-section">
        <div className="viz-section-header">
          <div className="viz-section-num">4</div>
          <div className="viz-section-title">
            <h2>Where is this script set?</h2>
            <p>The environment layer of your imagery — choose what you're preparing for.</p>
          </div>
        </div>
        <div className="viz-section-body">
          <div className="viz-context-grid">
            {CONTEXT_OPTIONS.map(c => (
              <div
                key={c.value}
                className={`viz-context-card${context === c.value ? ' selected' : ''}${isWarmup && c.value === 'test' ? ' hidden-for-warmup' : ''}`}
                onClick={() => { setContext(c.value); setErrors(prev => ({ ...prev, context: false })); }}
              >
                <div className="viz-context-icon">{c.icon}</div>
                <div className="viz-context-label">{c.label}</div>
                <div className="viz-context-desc">{c.desc}</div>
              </div>
            ))}
          </div>
          {errors.context && (
            <div className="viz-hint">Please select a context.</div>
          )}
        </div>
      </div>

      {/* Section 5: Sensory Channel (optional) */}
      <div className="viz-section">
        <div className="viz-section-header">
          <div className="viz-section-num optional">5</div>
          <div className="viz-section-title">
            <h2>When you're riding well, what do you notice first? <span className="viz-optional-tag">Optional</span></h2>
            <p>Helps the AI weight the right sensory language in your script.</p>
          </div>
        </div>
        <div className="viz-section-body">
          <div className="viz-sensory-pills">
            {SENSORY_OPTIONS.map(s => (
              <button
                key={s.value}
                className={`viz-sensory-pill${sensoryPreference === s.value ? ' selected' : ''}`}
                onClick={() => setSensoryPreference(sensoryPreference === s.value ? null : s.value)}
                type="button"
              >
                {s.icon} {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Section 6: Script Length (optional) */}
      <div className="viz-section">
        <div className="viz-section-header">
          <div className="viz-section-num optional">6</div>
          <div className="viz-section-title">
            <h2>How long do you want the session to be? <span className="viz-optional-tag">Optional</span></h2>
            <p>Defaults to Standard if not selected.</p>
          </div>
        </div>
        <div className="viz-section-body">
          <div className="viz-length-options">
            {LENGTH_OPTIONS.map(l => (
              <div
                key={l.value}
                className={`viz-length-option${scriptLength === l.value ? ' selected' : ''}`}
                onClick={() => setScriptLength(l.value)}
              >
                <div className="viz-length-time">{l.time}</div>
                <div className="viz-length-label">{l.label}</div>
                <div className="viz-length-desc">{l.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Generate button */}
      <div className="viz-generate-area">
        <button
          className="viz-btn-generate"
          onClick={handleSubmit}
          disabled={generating}
          type="button"
        >
          🧠 Generate My Visualization Script
        </button>
        <div className="viz-generate-note">
          Sections 1–4 required · 5 & 6 optional · Script saved to your Toolkit
        </div>
      </div>
    </div>
  );
}
