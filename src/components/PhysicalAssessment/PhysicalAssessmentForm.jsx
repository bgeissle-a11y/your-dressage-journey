import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  createPhysicalAssessment,
  getPhysicalAssessment,
  updatePhysicalAssessment,
  BODY_PARTS,
  KINESTHETIC_DESCRIPTIONS
} from '../../services';
import FormSection from '../Forms/FormSection';
import FormField from '../Forms/FormField';
import RadioGroup from '../Forms/RadioGroup';
import VoiceInput from '../Forms/VoiceInput';
import '../Forms/Forms.css';

const PT_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' }
];

const CLOCK_POSITIONS = [
  { value: '12', label: '12 o\'clock', icon: '\u2191' },
  { value: '3', label: '3 o\'clock', icon: '\u2192' },
  { value: '6', label: '6 o\'clock', icon: '\u2193' },
  { value: '9', label: '9 o\'clock', icon: '\u2190' }
];

const INITIAL_PELVIC_DATA = {
  neutralAccuracy: '',
  collapseDirection: '',
  dominantSeatBone: '',
  clockEasiest: [],
  clockHardest: [],
  surprise: '',
  notes: ''
};

export default function PhysicalAssessmentForm() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const textareaRefs = useRef({});

  const [formData, setFormData] = useState({
    occupation: '',
    physicalChallenges: '',
    physicalStrengths: '',
    asymmetries: '',
    coachCues: '',
    ptStatus: '',
    ptType: '',
    ptCues: '',
    kinestheticLevel: 5,
    dailyTensionAreas: [],
    dailyTensionDetails: '',
    ridingTensionAreas: [],
    tensionComparison: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  // Pelvic Clock state (separate from formData since it's optional/nested)
  const [pelvicData, setPelvicData] = useState({ ...INITIAL_PELVIC_DATA });
  const [pelvicExpanded, setPelvicExpanded] = useState(false);

  useEffect(() => {
    if (id) loadExisting();
  }, [id, currentUser]);

  async function loadExisting() {
    if (!id) return;
    setLoadingData(true);
    const result = await getPhysicalAssessment(id);
    if (result.success) {
      const d = result.data;
      setFormData({
        occupation: d.occupation || '',
        physicalChallenges: d.physicalChallenges || '',
        physicalStrengths: d.physicalStrengths || '',
        asymmetries: d.asymmetries || '',
        coachCues: d.coachCues || '',
        ptStatus: d.ptStatus || '',
        ptType: d.ptType || '',
        ptCues: d.ptCues || '',
        kinestheticLevel: d.kinestheticLevel || 5,
        dailyTensionAreas: d.dailyTensionAreas || [],
        dailyTensionDetails: d.dailyTensionDetails || '',
        ridingTensionAreas: d.ridingTensionAreas || [],
        tensionComparison: d.tensionComparison || ''
      });

      // Load pelvic clock data if it exists
      if (d.bodyMapping && d.bodyMapping.pelvicClock) {
        const pc = d.bodyMapping.pelvicClock;
        setPelvicData({
          neutralAccuracy: pc.neutralAccuracy || '',
          collapseDirection: pc.collapseDirection || '',
          dominantSeatBone: pc.dominantSeatBone || '',
          clockEasiest: pc.clockEasiest || [],
          clockHardest: pc.clockHardest || [],
          surprise: pc.surprise || '',
          notes: pc.notes || ''
        });
        setPelvicExpanded(true);
      }
    }
    setLoadingData(false);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  }

  function toggleBodyPart(field, part) {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(part)
        ? prev[field].filter(p => p !== part)
        : [...prev[field], part]
    }));
  }

  function getRef(key) {
    if (!textareaRefs.current[key]) {
      textareaRefs.current[key] = { current: null };
    }
    return textareaRefs.current[key];
  }

  // --- Pelvic Clock handlers ---

  function handlePelvicChange(field, value) {
    setPelvicData(prev => {
      const updated = { ...prev, [field]: value };
      // Reset collapseDirection when accuracy changes to "centered"
      if (field === 'neutralAccuracy' && value === 'centered') {
        updated.collapseDirection = '';
      }
      return updated;
    });
  }

  function togglePelvicChip(field, value) {
    setPelvicData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(v => v !== value)
        : [...prev[field], value]
    }));
  }

  function clearPelvicClock() {
    setPelvicData({ ...INITIAL_PELVIC_DATA });
    setPelvicExpanded(false);
  }

  function togglePelvicExpanded() {
    setPelvicExpanded(prev => !prev);
  }

  function handlePelvicKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      togglePelvicExpanded();
    }
  }

  // Build bodyMapping object for Firestore submission
  function getPelvicClockData() {
    if (!pelvicData.neutralAccuracy) return null;
    return {
      completedTests: ['pelvicClock'],
      pelvicClock: {
        neutralAccuracy: pelvicData.neutralAccuracy,
        collapseDirection: (pelvicData.neutralAccuracy === 'slightly off' || pelvicData.neutralAccuracy === 'significantly off')
          ? pelvicData.collapseDirection || null
          : null,
        dominantSeatBone: pelvicData.dominantSeatBone || null,
        clockEasiest: pelvicData.clockEasiest,
        clockHardest: pelvicData.clockHardest,
        surprise: pelvicData.surprise || null,
        notes: pelvicData.notes || null
      }
    };
  }

  // Dynamic saddle insight — text copied verbatim from HTML prototype
  const pelvicInsights = useMemo(() => {
    if (!pelvicData.neutralAccuracy) return null;

    const { neutralAccuracy, collapseDirection, dominantSeatBone, clockHardest, surprise } = pelvicData;
    const insights = [];

    if (dominantSeatBone === 'left louder') {
      insights.push("Your left seat bone being dominant may be why your horse tends to fall in on left circles or resist bending right. Your horse isn't being crooked \u2014 they're responding to uneven weight that you can't feel yet.");
    } else if (dominantSeatBone === 'right louder') {
      insights.push("Your right seat bone being dominant may be why your horse tends to fall in on right circles or resist bending left. Your horse isn't being crooked \u2014 they're responding to uneven weight that you can't feel yet.");
    }

    if (collapseDirection === 'left' || collapseDirection === 'right') {
      insights.push(`Collapsing to the ${collapseDirection} is often the root cause of "one stirrup feeling longer than the other." Every aid you give carries an unintentional ${collapseDirection}-side bias that your horse has to work around.`);
    } else if (collapseDirection === 'forward') {
      insights.push("A forward collapse often shows up as a chair seat or driving seat in the saddle \u2014 your pelvis tips ahead of the movement, making it harder to sit the trot or follow the canter.");
    } else if (collapseDirection === 'back') {
      insights.push("Collapsing behind the vertical often creates a \"bracing\" seat where your lower back stiffens to compensate. Your horse may feel this as a blocking aid, making transitions feel stuck or heavy.");
    }

    if (clockHardest.includes('6')) {
      insights.push("Finding 6 o'clock difficult often correlates with trouble following your horse's back in sitting trot. That backward pelvic tilt is exactly the motion you need to absorb the horse's movement.");
    }
    if (clockHardest.includes('12') && !clockHardest.includes('6')) {
      insights.push("Difficulty finding 12 o'clock often correlates with trouble engaging your core for upward transitions. The forward pelvic tilt is the foundation of the driving seat aid.");
    }

    if (neutralAccuracy === 'significantly off' && surprise === 'major') {
      insights.push("A large gap between where you felt you were and where you actually were is incredibly common \u2014 and incredibly valuable to know about. This is exactly the kind of perception gap that your ride debriefs will help us track over time.");
    } else if (neutralAccuracy === 'centered' && surprise === 'none') {
      insights.push("Your strong pelvic awareness is a genuine asset. Your kinesthetic slider rating seems well-calibrated. We'll build on this foundation with more nuanced body mapping as the platform develops.");
    }

    if (insights.length > 0) return insights;

    // Fallback when accuracy is set but no specific pattern matches
    return ["When your felt center doesn't match your actual center, every aid you give carries an unintentional bias that your horse has to work around. We'll watch for patterns that connect to this in your ride debriefs."];
  }, [pelvicData]);

  const showCollapseDirection = pelvicData.neutralAccuracy === 'slightly off' || pelvicData.neutralAccuracy === 'significantly off';
  const hasStartedPelvicClock = Boolean(pelvicData.neutralAccuracy);

  // --- End Pelvic Clock ---

  function validateForm() {
    const newErrors = {};
    if (!formData.occupation.trim()) newErrors.occupation = 'Please describe your work and its body impact';
    if (!formData.physicalChallenges.trim()) newErrors.physicalChallenges = 'Please describe your physical challenges';
    if (!formData.physicalStrengths.trim()) newErrors.physicalStrengths = 'Please describe your physical strengths';
    if (!formData.coachCues.trim()) newErrors.coachCues = 'Please share your most common coach cues';
    if (!formData.ptStatus) newErrors.ptStatus = 'Please select yes or no';
    if (formData.ptStatus === 'yes' && !formData.ptType.trim()) newErrors.ptType = 'Please describe the type of work';
    if (formData.dailyTensionAreas.length === 0) newErrors.dailyTensionAreas = 'Please select at least one area';
    if (formData.ridingTensionAreas.length === 0) newErrors.ridingTensionAreas = 'Please select at least one area';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e, isDraft = false) {
    if (e) e.preventDefault();
    if (!isDraft && !validateForm()) return;

    setLoading(true);
    const data = {
      ...formData,
      bodyMapping: getPelvicClockData(),
      isDraft
    };

    let result;
    if (isEdit) {
      result = await updatePhysicalAssessment(id, data);
    } else {
      result = await createPhysicalAssessment(currentUser.uid, data);
    }

    setLoading(false);

    if (result.success) {
      navigate('/physical-assessments');
    } else {
      setErrors({ submit: result.error });
    }
  }

  if (loadingData) {
    return <div className="loading-state">Loading assessment...</div>;
  }

  return (
    <div className="form-page">
      <div className="form-page-header">
        <h1>{isEdit ? 'Edit Physical Self-Assessment' : 'Physical Self-Assessment'}</h1>
        <p>Understanding your body's patterns and awareness</p>
      </div>

      <form onSubmit={handleSubmit} autoComplete="off">
        <div className="form-card">
          {errors.submit && <div className="form-section"><div className="form-alert form-alert-error">{errors.submit}</div></div>}

          {/* Section 1: Physical Profile */}
          <FormSection title="Your Physical Profile" description="Understanding your body's strengths and challenges.">
            <FormField label="What do you do for work, and how do you think it affects your body?" error={errors.occupation}>
              <textarea
                ref={el => { getRef('occupation').current = el; }}
                name="occupation"
                value={formData.occupation}
                onChange={handleChange}
                disabled={loading}
                placeholder="Examples: Software engineer — 8+ hours at a desk, tight hip flexors, forward head posture. Nurse — on my feet all day, lower back fatigue..."
              />
              <VoiceInput textareaRef={getRef('occupation')} onTranscript={text => setFormData(prev => ({ ...prev, occupation: text }))} />
            </FormField>
            <div className="field-help" style={{ marginTop: '-1rem', marginBottom: '1.5rem' }}>
              Consider: hours sitting or standing, repetitive motions, physical demands, stress levels. How does your work day set you up (or not) for riding?
            </div>

            <FormField label="What physical challenges do you have that impact your riding?" error={errors.physicalChallenges}>
              <textarea
                ref={el => { getRef('physicalChallenges').current = el; }}
                name="physicalChallenges"
                value={formData.physicalChallenges}
                onChange={handleChange}
                disabled={loading}
                placeholder="Examples: limited hip flexibility, shoulder tension, lower back pain, previous injuries, asymmetries, balance issues..."
              />
              <VoiceInput textareaRef={getRef('physicalChallenges')} onTranscript={text => setFormData(prev => ({ ...prev, physicalChallenges: text }))} />
            </FormField>

            <FormField label="What physical strengths do you bring into the saddle?" error={errors.physicalStrengths}>
              <textarea
                ref={el => { getRef('physicalStrengths').current = el; }}
                name="physicalStrengths"
                value={formData.physicalStrengths}
                onChange={handleChange}
                disabled={loading}
                placeholder="Examples: strong core, flexible hips, good balance, endurance, body awareness, athletic background..."
              />
              <VoiceInput textareaRef={getRef('physicalStrengths')} onTranscript={text => setFormData(prev => ({ ...prev, physicalStrengths: text }))} />
            </FormField>

            <FormField label="Do you have any known asymmetries?" optional>
              <textarea
                ref={el => { getRef('asymmetries').current = el; }}
                name="asymmetries"
                value={formData.asymmetries}
                onChange={handleChange}
                disabled={loading}
                placeholder="Examples: one hip tighter than the other, shoulder higher on one side, always collapse through one side..."
              />
              <VoiceInput textareaRef={getRef('asymmetries')} onTranscript={text => setFormData(prev => ({ ...prev, asymmetries: text }))} />
            </FormField>
          </FormSection>

          {/* Section 2: Coaching Cues */}
          <FormSection title="Physical Feedback You Receive" description="What cues and corrections do you hear most often?">
            <FormField label="What are the most common physical cues/instructions you hear from your riding coach?" error={errors.coachCues}>
              <textarea
                ref={el => { getRef('coachCues').current = el; }}
                name="coachCues"
                value={formData.coachCues}
                onChange={handleChange}
                disabled={loading}
                placeholder="Examples: 'relax your shoulders,' 'sit deeper,' 'hands forward,' 'stop gripping,' 'open your hip angle'..."
              />
              <VoiceInput textareaRef={getRef('coachCues')} onTranscript={text => setFormData(prev => ({ ...prev, coachCues: text }))} />
            </FormField>

            <FormField label="Are you currently working with a physical therapist, personal trainer, yoga instructor, or taking classes?" error={errors.ptStatus}>
              <RadioGroup name="ptStatus" options={PT_OPTIONS} value={formData.ptStatus} onChange={handleChange} disabled={loading} />
            </FormField>

            {formData.ptStatus === 'yes' && (
              <div className="conditional-section">
                <FormField label="What type(s) of work are you doing?" error={errors.ptType}>
                  <input
                    type="text"
                    name="ptType"
                    value={formData.ptType}
                    onChange={handleChange}
                    disabled={loading}
                    placeholder="Example: Physical therapy, personal training, yoga, pilates, etc."
                  />
                </FormField>
                <FormField label="What physical cues do you regularly hear during these sessions?" optional>
                  <textarea
                    ref={el => { getRef('ptCues').current = el; }}
                    name="ptCues"
                    value={formData.ptCues}
                    onChange={handleChange}
                    disabled={loading}
                    placeholder="Examples: 'engage your core,' 'neutral spine,' 'shoulders down and back,' 'activate your glutes'..."
                    style={{ minHeight: '80px' }}
                  />
                  <VoiceInput textareaRef={getRef('ptCues')} onTranscript={text => setFormData(prev => ({ ...prev, ptCues: text }))} />
                </FormField>
              </div>
            )}
          </FormSection>

          {/* Section 3: Kinesthetic Awareness */}
          <FormSection title="Kinesthetic Awareness" description="How well can you feel what your body is doing?">
            <FormField label="How is your kinesthetic awareness?" helpText="Kinesthetic awareness is your ability to sense where your body parts are and what they're doing without looking. Can you feel when your shoulder creeps up? When your heel comes up? When you're crooked?">
              <input
                type="range"
                name="kinestheticLevel"
                min="1"
                max="10"
                value={formData.kinestheticLevel}
                onChange={e => setFormData(prev => ({ ...prev, kinestheticLevel: parseInt(e.target.value, 10) }))}
                disabled={loading}
                style={{ width: '100%', accentColor: '#8B7355' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#7A7A7A' }}>
                <span>"Huh?" - I don't feel much</span>
                <span>"I feel it all" - Highly aware</span>
              </div>
              <div className="slider-value-display">
                Level {formData.kinestheticLevel} — {KINESTHETIC_DESCRIPTIONS[formData.kinestheticLevel - 1]}
              </div>
            </FormField>
          </FormSection>

          {/* Section 3B: Test Your Feel — Pelvic Clock (Optional) */}
          <div className="form-section">
            <div
              className={`pelvic-clock-trigger${pelvicExpanded ? ' expanded' : ''}`}
              role="button"
              tabIndex={0}
              aria-expanded={pelvicExpanded}
              aria-controls="pelvic-clock-content"
              onClick={togglePelvicExpanded}
              onKeyDown={handlePelvicKeyDown}
            >
              <div className="pelvic-trigger-text">
                <div className="pelvic-trigger-title">Test Your Feel: The Pelvic Clock</div>
                <div className="pelvic-trigger-subtitle">
                  You just rated your body awareness. Want to put it to the test? This 60-second exercise reveals whether your "felt center" matches your actual center.
                </div>
              </div>
              <span className="pelvic-trigger-arrow">&#9654;</span>
            </div>

            {pelvicExpanded && (
              <div className="pelvic-clock-content" id="pelvic-clock-content">
                <div className="pelvic-clock-badge">Optional &middot; ~60 seconds</div>

                {/* Protocol Box */}
                <div className="protocol-box">
                  <h4>How To Do It</h4>
                  <ol className="protocol-steps">
                    <li>Sit on a <strong>firm, flat chair</strong> (not a couch or cushion). Place your feet flat on the floor.</li>
                    <li><strong>Close your eyes.</strong> Tilt your pelvis toward each clock position: <strong>12 o'clock</strong> (pubic bone forward/up), <strong>6 o'clock</strong> (tailbone back), <strong>3 o'clock</strong> (right seat bone), <strong>9 o'clock</strong> (left seat bone).</li>
                    <li>Now find what feels like <strong>"Perfect Neutral"</strong> &mdash; centered, both seat bones evenly weighted.</li>
                    <li><strong>Open your eyes.</strong> Look down. Are you actually where you thought you were?</li>
                  </ol>
                </div>

                {/* Clock Diagram */}
                <div className="pelvic-clock-diagram">
                  <p className="pelvic-clock-diagram-label">The four clock positions on your pelvis:</p>
                  <div className="clock-visual">
                    <div className="clock-dot top"></div>
                    <div className="clock-dot bottom"></div>
                    <div className="clock-dot left"></div>
                    <div className="clock-dot right"></div>
                    <div className="clock-center"></div>
                    <span className="clock-label top">12 &mdash; Pubic bone forward</span>
                    <span className="clock-label bottom">6 &mdash; Tailbone back</span>
                    <span className="clock-label left">9 &mdash; Left seat bone</span>
                    <span className="clock-label right">3 &mdash; Right seat bone</span>
                  </div>
                </div>

                {/* Structured Fields */}
                <div style={{ marginTop: '1.5rem' }}>
                  <label style={{ fontWeight: 600, fontSize: '1.05em', marginBottom: '1.25rem', display: 'block', color: '#8B7355' }}>
                    What did you discover?
                  </label>

                  {/* Neutral Accuracy */}
                  <div className="pelvic-select-group">
                    <label htmlFor="pelvicNeutralAccuracy">When you opened your eyes, were you actually centered?</label>
                    <select
                      className="pelvic-select"
                      id="pelvicNeutralAccuracy"
                      value={pelvicData.neutralAccuracy}
                      onChange={e => handlePelvicChange('neutralAccuracy', e.target.value)}
                      disabled={loading}
                    >
                      <option value="" disabled>Select one...</option>
                      <option value="centered">Yes &mdash; I was right where I thought</option>
                      <option value="slightly off">Slightly off &mdash; close but not quite</option>
                      <option value="significantly off">Significantly off &mdash; I was surprised</option>
                    </select>
                  </div>

                  {/* Collapse Direction (conditional) */}
                  {showCollapseDirection && (
                    <div className="pelvic-select-group">
                      <label htmlFor="pelvicCollapseDirection">Which direction were you actually shifted toward?</label>
                      <select
                        className="pelvic-select"
                        id="pelvicCollapseDirection"
                        value={pelvicData.collapseDirection}
                        onChange={e => handlePelvicChange('collapseDirection', e.target.value)}
                        disabled={loading}
                      >
                        <option value="" disabled>Select one...</option>
                        <option value="left">Left</option>
                        <option value="right">Right</option>
                        <option value="forward">Forward</option>
                        <option value="back">Back</option>
                      </select>
                    </div>
                  )}

                  {/* Dominant Seat Bone */}
                  <div className="pelvic-select-group">
                    <label htmlFor="pelvicDominantSeatBone">Did one seat bone feel "louder" or easier to find than the other?</label>
                    <select
                      className="pelvic-select"
                      id="pelvicDominantSeatBone"
                      value={pelvicData.dominantSeatBone}
                      onChange={e => handlePelvicChange('dominantSeatBone', e.target.value)}
                      disabled={loading}
                    >
                      <option value="" disabled>Select one...</option>
                      <option value="even">Even &mdash; both felt about the same</option>
                      <option value="left louder">Left seat bone was louder/easier to find</option>
                      <option value="right louder">Right seat bone was louder/easier to find</option>
                    </select>
                  </div>

                  {/* Easiest Clock Positions */}
                  <div className="pelvic-select-group">
                    <label>Which clock positions were <strong>easiest</strong> to find?</label>
                    <div className="pelvic-multi-select">
                      {CLOCK_POSITIONS.map(pos => (
                        <label
                          key={`easiest-${pos.value}`}
                          className={`pelvic-chip${pelvicData.clockEasiest.includes(pos.value) ? ' selected' : ''}`}
                          onClick={e => { e.preventDefault(); togglePelvicChip('clockEasiest', pos.value); }}
                        >
                          <input type="checkbox" checked={pelvicData.clockEasiest.includes(pos.value)} readOnly />
                          <span className="chip-icon">{pos.icon}</span> {pos.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Hardest Clock Positions */}
                  <div className="pelvic-select-group">
                    <label>Which clock positions were <strong>hardest</strong> to find?</label>
                    <div className="pelvic-multi-select">
                      {CLOCK_POSITIONS.map(pos => (
                        <label
                          key={`hardest-${pos.value}`}
                          className={`pelvic-chip${pelvicData.clockHardest.includes(pos.value) ? ' selected' : ''}`}
                          onClick={e => { e.preventDefault(); togglePelvicChip('clockHardest', pos.value); }}
                        >
                          <input type="checkbox" checked={pelvicData.clockHardest.includes(pos.value)} readOnly />
                          <span className="chip-icon">{pos.icon}</span> {pos.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Surprise Level */}
                  <div className="pelvic-select-group">
                    <label htmlFor="pelvicSurprise">How surprised were you by what you saw when you opened your eyes?</label>
                    <select
                      className="pelvic-select"
                      id="pelvicSurprise"
                      value={pelvicData.surprise}
                      onChange={e => handlePelvicChange('surprise', e.target.value)}
                      disabled={loading}
                    >
                      <option value="" disabled>Select one...</option>
                      <option value="none">Not surprised &mdash; pretty much what I expected</option>
                      <option value="mild">Mildly surprised &mdash; a little different than I thought</option>
                      <option value="major">Very surprised &mdash; I had no idea I was that far off!</option>
                    </select>
                  </div>

                  {/* Notes */}
                  <div className="pelvic-select-group">
                    <label htmlFor="pelvicNotes">
                      Anything else you noticed? <span style={{ fontWeight: 400, color: '#7A7A7A' }}>(Optional)</span>
                    </label>
                    <textarea
                      ref={el => { getRef('pelvicNotes').current = el; }}
                      id="pelvicNotes"
                      value={pelvicData.notes}
                      onChange={e => handlePelvicChange('notes', e.target.value)}
                      disabled={loading}
                      placeholder="Example: I kept wanting to lean forward, my left side felt completely different from my right, I couldn't find 6 o'clock at all..."
                      style={{ minHeight: '80px' }}
                    />
                    <VoiceInput textareaRef={getRef('pelvicNotes')} onTranscript={text => setPelvicData(prev => ({ ...prev, notes: text }))} />
                  </div>
                </div>

                {/* Dynamic Saddle Insight */}
                {pelvicInsights && (
                  <div className="saddle-insight">
                    <div className="saddle-insight-header">
                      &#127871; In the Saddle
                    </div>
                    <div className="saddle-insight-text">
                      {pelvicInsights.map((insight, i) => (
                        <span key={i}>
                          {i > 0 && <><br /><br /></>}
                          {insight}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Clear/Close Link */}
                {hasStartedPelvicClock && (
                  <button
                    type="button"
                    className="pelvic-skip-link"
                    onClick={clearPelvicClock}
                  >
                    Clear my answers and close
                  </button>
                )}
              </div>
            )}

            {/* Teaser Text (always visible) */}
            <div className="pelvic-teaser">
              <strong>Coming soon:</strong> The Pelvic Clock is one of six Body Mapping tests we're developing to help you see what you can't feel. Future tests will explore your balance, rotation, visual processing, and more. Your feedback during the pilot will help shape how these are integrated.
            </div>
          </div>

          {/* Section 4: Tension Patterns */}
          <FormSection title="Your Tension Patterns" description="Where does stress show up in your body?">
            <FormField label="When you get tense or worried (in daily life), where do you feel it?" error={errors.dailyTensionAreas} helpText="Select all areas where you notice tension, tightness, or discomfort when stressed.">
              <div className="body-parts-grid">
                {BODY_PARTS.map(part => (
                  <label
                    key={`daily-${part}`}
                    className={`body-part-option ${formData.dailyTensionAreas.includes(part) ? 'selected' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.dailyTensionAreas.includes(part)}
                      onChange={() => toggleBodyPart('dailyTensionAreas', part)}
                      disabled={loading}
                    />
                    {part}
                  </label>
                ))}
              </div>
            </FormField>

            <FormField label="Any additional details about your daily tension patterns?" optional>
              <textarea
                ref={el => { getRef('dailyTensionDetails').current = el; }}
                name="dailyTensionDetails"
                value={formData.dailyTensionDetails}
                onChange={handleChange}
                disabled={loading}
                placeholder="Example: My jaw gets tight, I hold my breath, my shoulders creep up toward my ears..."
                style={{ minHeight: '80px' }}
              />
              <VoiceInput textareaRef={getRef('dailyTensionDetails')} onTranscript={text => setFormData(prev => ({ ...prev, dailyTensionDetails: text }))} />
            </FormField>

            <FormField label="When you get tense or worried while riding, where do you feel it?" error={errors.ridingTensionAreas} helpText="Select all areas where you notice tension when things get difficult in the saddle.">
              <div className="body-parts-grid">
                {BODY_PARTS.map(part => (
                  <label
                    key={`riding-${part}`}
                    className={`body-part-option ${formData.ridingTensionAreas.includes(part) ? 'selected' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.ridingTensionAreas.includes(part)}
                      onChange={() => toggleBodyPart('ridingTensionAreas', part)}
                      disabled={loading}
                    />
                    {part}
                  </label>
                ))}
              </div>
            </FormField>

            <FormField label="How is this similar to or different from your daily tension patterns?" optional>
              <textarea
                ref={el => { getRef('tensionComparison').current = el; }}
                name="tensionComparison"
                value={formData.tensionComparison}
                onChange={handleChange}
                disabled={loading}
                placeholder="Example: Same pattern but more intense, completely different areas, I grip with my legs which I don't do off the horse..."
                style={{ minHeight: '80px' }}
              />
              <VoiceInput textareaRef={getRef('tensionComparison')} onTranscript={text => setFormData(prev => ({ ...prev, tensionComparison: text }))} />
            </FormField>
          </FormSection>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/physical-assessments')} disabled={loading}>
              Cancel
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => handleSubmit(null, true)} disabled={loading}>
              {loading ? 'Saving...' : 'Save as Draft'}
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : (isEdit ? 'Update Assessment' : 'Complete Assessment')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
