import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  createTechnicalAssessment,
  getTechnicalAssessment,
  updateTechnicalAssessment,
  TRAINING_SCALE_PILLARS,
  GAIT_UNDERSTANDING_SCALES,
  RIDER_SKILL_SCALES
} from '../../services';
import useFormRecovery from '../../hooks/useFormRecovery';
import FormSection from '../Forms/FormSection';
import FormField from '../Forms/FormField';
import VoiceInput from '../Forms/VoiceInput';
import '../Forms/Forms.css';

const DEFAULT_FORM_DATA = {
  arenaGeometry: {
    confidenceRating: 5,
    quarterlines: '',
    geometryUsage: '',
    geometryGap: ''
  },
  gaitMechanics: {
    walkUnderstanding: 5,
    trotUnderstanding: 5,
    canterUnderstanding: 5,
    timingConcept: '',
    gaitInsight: ''
  },
  movements: {
    pirouetteDiff: '',
    lateralMovements: '',
    currentMovement: '',
    movementQuality: '',
    hardestConcept: ''
  },
  trainingScale: {
    rhythm: { understanding: 5, application: 5 },
    suppleness: { understanding: 5, application: 5 },
    contact: { understanding: 5, application: 5 },
    impulsion: { understanding: 5, application: 5 },
    straightness: { understanding: 5, application: 5 },
    collection: { understanding: 5, application: 5 },
    biggestGap: ''
  },
  riderSkills: {
    independentSeat: { rating: 5 },
    unilateralAids: { rating: 5 },
    timingOfAid: { rating: 5 },
    prioritySkill: ''
  },
  synthesis: {
    dressagePhilosophy: '',
    knowledgeBodyGap: '',
    formativeInfluences: '',
    burningQuestion: ''
  }
};

export default function TechnicalPhilosophicalForm() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const textareaRefs = useRef({});
  const [draftId, setDraftId] = useState(null);

  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  const { hasRecovery, applyRecovery, dismissRecovery, clearRecovery } = useFormRecovery(
    'ydj-technical-assessment-recovery', id, formData, setFormData
  );

  useEffect(() => {
    if (id) loadExisting();
  }, [id, currentUser]);

  async function loadExisting() {
    if (!id) return;
    setLoadingData(true);
    const result = await getTechnicalAssessment(id);
    if (result.success) {
      const d = result.data;
      setFormData({
        arenaGeometry: {
          confidenceRating: d.arenaGeometry?.confidenceRating || 5,
          quarterlines: d.arenaGeometry?.quarterlines || '',
          geometryUsage: d.arenaGeometry?.geometryUsage || '',
          geometryGap: d.arenaGeometry?.geometryGap || ''
        },
        gaitMechanics: {
          walkUnderstanding: d.gaitMechanics?.walkUnderstanding || 5,
          trotUnderstanding: d.gaitMechanics?.trotUnderstanding || 5,
          canterUnderstanding: d.gaitMechanics?.canterUnderstanding || 5,
          timingConcept: d.gaitMechanics?.timingConcept || '',
          gaitInsight: d.gaitMechanics?.gaitInsight || ''
        },
        movements: {
          pirouetteDiff: d.movements?.pirouetteDiff || '',
          lateralMovements: d.movements?.lateralMovements || '',
          currentMovement: d.movements?.currentMovement || '',
          movementQuality: d.movements?.movementQuality || '',
          hardestConcept: d.movements?.hardestConcept || ''
        },
        trainingScale: {
          rhythm: { understanding: d.trainingScale?.rhythm?.understanding || 5, application: d.trainingScale?.rhythm?.application || 5 },
          suppleness: { understanding: d.trainingScale?.suppleness?.understanding || 5, application: d.trainingScale?.suppleness?.application || 5 },
          contact: { understanding: d.trainingScale?.contact?.understanding || 5, application: d.trainingScale?.contact?.application || 5 },
          impulsion: { understanding: d.trainingScale?.impulsion?.understanding || 5, application: d.trainingScale?.impulsion?.application || 5 },
          straightness: { understanding: d.trainingScale?.straightness?.understanding || 5, application: d.trainingScale?.straightness?.application || 5 },
          collection: { understanding: d.trainingScale?.collection?.understanding || 5, application: d.trainingScale?.collection?.application || 5 },
          biggestGap: d.trainingScale?.biggestGap || ''
        },
        riderSkills: {
          independentSeat: { rating: d.riderSkills?.independentSeat?.rating || 5 },
          unilateralAids: { rating: d.riderSkills?.unilateralAids?.rating || 5 },
          timingOfAid: { rating: d.riderSkills?.timingOfAid?.rating || 5 },
          prioritySkill: d.riderSkills?.prioritySkill || ''
        },
        synthesis: {
          dressagePhilosophy: d.synthesis?.dressagePhilosophy || '',
          knowledgeBodyGap: d.synthesis?.knowledgeBodyGap || '',
          formativeInfluences: d.synthesis?.formativeInfluences || '',
          burningQuestion: d.synthesis?.burningQuestion || ''
        }
      });
    }
    setLoadingData(false);
  }

  function handleNestedChange(section, field, value) {
    setFormData(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value }
    }));
    const errorKey = `${section}.${field}`;
    if (errors[errorKey]) setErrors(prev => ({ ...prev, [errorKey]: '' }));
  }

  function handlePillarChange(pillarKey, dimension, value) {
    setFormData(prev => ({
      ...prev,
      trainingScale: {
        ...prev.trainingScale,
        [pillarKey]: { ...prev.trainingScale[pillarKey], [dimension]: parseInt(value, 10) }
      }
    }));
  }

  function handleRiderSkillChange(skillKey, value) {
    setFormData(prev => ({
      ...prev,
      riderSkills: {
        ...prev.riderSkills,
        [skillKey]: { rating: parseInt(value, 10) }
      }
    }));
  }

  function getRef(key) {
    if (!textareaRefs.current[key]) {
      textareaRefs.current[key] = { current: null };
    }
    return textareaRefs.current[key];
  }

  function validateForm() {
    const newErrors = {};
    if (!formData.trainingScale.biggestGap.trim()) {
      newErrors['trainingScale.biggestGap'] = 'Please describe where your largest understanding-application gap is';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e, isDraft = false) {
    if (e) e.preventDefault();
    if (!isDraft && !validateForm()) return;

    setLoading(true);
    const data = { ...formData, isDraft };

    let result;
    const existingId = isEdit ? id : draftId;
    if (existingId) {
      result = await updateTechnicalAssessment(existingId, data);
    } else {
      result = await createTechnicalAssessment(currentUser.uid, data);
      if (result.success && result.id) setDraftId(result.id);
    }

    setLoading(false);

    if (result.success) {
      clearRecovery();
      navigate('/technical-assessments');
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
        <h1>{isEdit ? 'Edit Technical & Philosophical Assessment' : 'Technical & Philosophical Self-Assessment'}</h1>
        <p>Understanding the "why" and "how" beneath every movement</p>
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

          <div className="section-intro">
            Great riding is built on two foundations: what you know, and what you can feel. This assessment explores your theoretical understanding of the arena, the horse's movement, dressage principles, and your own body as an instrument of communication. Your honest reflection here helps your coaching voices offer guidance that meets you exactly where you are — not where you think you should be.
          </div>

          {/* Section 1: Arena Geometry */}
          <FormSection title="The Arena as Your Canvas" description="Spatial awareness and geometric precision — the invisible infrastructure of every movement.">
            <div className="scale-group">
              <div className="scale-label">How confident are you with your knowledge of arena geometry overall?</div>
              <div className="scale-hint">Letter placement, special lines, how movements are sized and placed in the space.</div>
              <div className="scale-wrapper">
                <span className="scale-anchor left">Uncertain — still learning</span>
                <div className="scale-track">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={formData.arenaGeometry.confidenceRating}
                    onChange={e => handleNestedChange('arenaGeometry', 'confidenceRating', parseInt(e.target.value, 10))}
                    disabled={loading}
                  />
                  <span className="scale-value-badge">{formData.arenaGeometry.confidenceRating}</span>
                </div>
                <span className="scale-anchor right">Solid — I could teach it</span>
              </div>
            </div>

            <div className="concept-check">
              <div className="concept-check-title">Concept Check</div>
              <p>Without looking it up, describe where the quarterlines are in a standard arena and name at least one movement that touches one or both.</p>
            </div>
            <FormField>
              <textarea
                ref={el => { getRef('quarterlines').current = el; }}
                value={formData.arenaGeometry.quarterlines}
                onChange={e => handleNestedChange('arenaGeometry', 'quarterlines', e.target.value)}
                disabled={loading}
                placeholder="Describe the quarterlines and at least one movement that uses them..."
              />
              <VoiceInput textareaRef={getRef('quarterlines')} onTranscript={text => handleNestedChange('arenaGeometry', 'quarterlines', text)} />
            </FormField>

            <FormField label="How do you use the geometry of the arena and movements within the space to set up and improve the quality of your movements?" helpText="For example: how does approaching a corner help collection? Why does the size of a circle matter?">
              <textarea
                ref={el => { getRef('geometryUsage').current = el; }}
                value={formData.arenaGeometry.geometryUsage}
                onChange={e => handleNestedChange('arenaGeometry', 'geometryUsage', e.target.value)}
                disabled={loading}
                placeholder="How does arena geometry actively support your training..."
              />
              <VoiceInput textareaRef={getRef('geometryUsage')} onTranscript={text => handleNestedChange('arenaGeometry', 'geometryUsage', text)} />
            </FormField>

            <FormField label="Which aspect of arena geometry is most confusing or least instinctive for you right now?">
              <textarea
                ref={el => { getRef('geometryGap').current = el; }}
                value={formData.arenaGeometry.geometryGap}
                onChange={e => handleNestedChange('arenaGeometry', 'geometryGap', e.target.value)}
                disabled={loading}
                placeholder="Distances, lines, figure sizing — where do you still feel uncertain..."
                style={{ minHeight: '80px' }}
              />
              <VoiceInput textareaRef={getRef('geometryGap')} onTranscript={text => handleNestedChange('arenaGeometry', 'geometryGap', text)} />
            </FormField>
          </FormSection>

          {/* Section 2: Gait Mechanics */}
          <FormSection title="Reading the Movement Beneath You" description="Understanding gait mechanics is the bridge between riding and communication — you can only influence what you understand.">
            <FormField label="Rate your understanding of the footfall sequence and mechanics of each gait:">
              {GAIT_UNDERSTANDING_SCALES.map(scale => (
                <div key={scale.key} className="scale-group">
                  <div className="scale-label">{scale.label}</div>
                  <div className="scale-hint">{scale.hint}</div>
                  <div className="scale-wrapper">
                    <span className="scale-anchor left">{scale.leftAnchor}</span>
                    <div className="scale-track">
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={formData.gaitMechanics[scale.key]}
                        onChange={e => handleNestedChange('gaitMechanics', scale.key, parseInt(e.target.value, 10))}
                        disabled={loading}
                      />
                      <span className="scale-value-badge">{formData.gaitMechanics[scale.key]}</span>
                    </div>
                    <span className="scale-anchor right">{scale.rightAnchor}</span>
                  </div>
                </div>
              ))}
            </FormField>

            <div className="concept-check">
              <div className="concept-check-title">Concept Check</div>
              <p>To influence the flight path of a horse's leg, the aid must be applied at the moment that leg is <em>leaving the ground</em>. In your own words, describe how you think about catching the correct moment — in trot and in canter.</p>
            </div>
            <FormField>
              <textarea
                ref={el => { getRef('timingConcept').current = el; }}
                value={formData.gaitMechanics.timingConcept}
                onChange={e => handleNestedChange('gaitMechanics', 'timingConcept', e.target.value)}
                disabled={loading}
                placeholder="How do you feel or identify the right moment — in trot? In canter?"
              />
              <VoiceInput textareaRef={getRef('timingConcept')} onTranscript={text => handleNestedChange('gaitMechanics', 'timingConcept', text)} />
            </FormField>

            <FormField label="What movement concept in the timing of your aids has been hardest to develop — and what has helped?" helpText="A moment when understanding footfall or gait mechanics shifted how you applied your aids.">
              <textarea
                ref={el => { getRef('gaitInsight').current = el; }}
                value={formData.gaitMechanics.gaitInsight}
                onChange={e => handleNestedChange('gaitMechanics', 'gaitInsight', e.target.value)}
                disabled={loading}
                placeholder="The insight and how it changed something in your riding..."
                style={{ minHeight: '80px' }}
              />
              <VoiceInput textareaRef={getRef('gaitInsight')} onTranscript={text => handleNestedChange('gaitMechanics', 'gaitInsight', text)} />
            </FormField>
          </FormSection>

          {/* Section 3: Movement Understanding */}
          <FormSection title="Understanding the Movements" description="Knowing what a movement requires — of horse and rider — transforms execution from guesswork into intention.">
            <div className="scenario-box">
              <div className="scenario-title">Canter with Haunches In vs. Canter Pirouette</div>
              <FormField label="In your own words, what is the key difference between canter with haunches in and a canter pirouette? How is the horse positioned differently, and what additional qualities must the pirouette have?" helpText="Note: the same concepts apply to haunches in at walk and the walk pirouette.">
                <textarea
                  ref={el => { getRef('pirouetteDiff').current = el; }}
                  value={formData.movements.pirouetteDiff}
                  onChange={e => handleNestedChange('movements', 'pirouetteDiff', e.target.value)}
                  disabled={loading}
                  placeholder="Describe the difference in horse position, hind leg activity, gait quality, and degree of collection required..."
                />
                <VoiceInput textareaRef={getRef('pirouetteDiff')} onTranscript={text => handleNestedChange('movements', 'pirouetteDiff', text)} />
              </FormField>
            </div>

            <div className="scenario-box">
              <div className="scenario-title">Shoulder-In, Travers &amp; Renvers</div>
              <FormField label="How do you distinguish between shoulder-in, travers, and renvers — in terms of the horse's bend, the tracks the hooves follow, and the direction of travel?">
                <textarea
                  ref={el => { getRef('lateralMovements').current = el; }}
                  value={formData.movements.lateralMovements}
                  onChange={e => handleNestedChange('movements', 'lateralMovements', e.target.value)}
                  disabled={loading}
                  placeholder="Describe each movement — where the forehand and haunches are, which way the horse is bent, which tracks the feet follow..."
                />
                <VoiceInput textareaRef={getRef('lateralMovements')} onTranscript={text => handleNestedChange('movements', 'lateralMovements', text)} />
              </FormField>
            </div>

            <FormField label="Choose one movement you are currently working on. What does high-quality execution look like?">
              <div className="sub-question" style={{ fontWeight: 500, fontSize: '0.95rem', marginBottom: '0.5rem' }}>Movement you are working on:</div>
              <input
                type="text"
                value={formData.movements.currentMovement}
                onChange={e => handleNestedChange('movements', 'currentMovement', e.target.value)}
                disabled={loading}
                placeholder="e.g. medium trot, leg yield, half-pass, flying changes..."
              />
              <div className="sub-question" style={{ fontWeight: 500, fontSize: '0.95rem', margin: '1rem 0 0.5rem' }}>What defines high quality in this movement?</div>
              <textarea
                ref={el => { getRef('movementQuality').current = el; }}
                value={formData.movements.movementQuality}
                onChange={e => handleNestedChange('movements', 'movementQuality', e.target.value)}
                disabled={loading}
                placeholder="Describe the ideal: the horse's frame, energy, straightness, rhythm, expression, collection..."
              />
              <VoiceInput textareaRef={getRef('movementQuality')} onTranscript={text => handleNestedChange('movements', 'movementQuality', text)} />
            </FormField>

            <FormField label="What movement concept has been hardest to understand intellectually — even before getting on the horse?">
              <textarea
                ref={el => { getRef('hardestConcept').current = el; }}
                value={formData.movements.hardestConcept}
                onChange={e => handleNestedChange('movements', 'hardestConcept', e.target.value)}
                disabled={loading}
                placeholder="Is there a movement whose requirements feel unclear or confusing when you try to picture them..."
                style={{ minHeight: '80px' }}
              />
              <VoiceInput textareaRef={getRef('hardestConcept')} onTranscript={text => handleNestedChange('movements', 'hardestConcept', text)} />
            </FormField>
          </FormSection>

          {/* Section 4: Training Scale */}
          <FormSection title="The Training Scale" description="The six pillars of classical dressage — rate both your understanding of each concept and your current ability to apply it with your horse.">
            <p className="scale-hint" style={{ marginBottom: '1.5rem' }}>
              <strong>Understanding</strong> = how well you can explain and recognize each pillar. &nbsp;
              <strong>Application</strong> = how consistently you can produce or influence it in your rides.
            </p>

            <div className="pillar-grid">
              {TRAINING_SCALE_PILLARS.map(pillar => (
                <div key={pillar.key} className="pillar-card">
                  <div className="pillar-card-name">{pillar.name}</div>
                  <div className="pillar-card-definition">{pillar.definition}</div>
                  <div className="dual-scale">
                    <div className="dual-scale-item">
                      <div className="dual-scale-label">Understanding (1–10)</div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={formData.trainingScale[pillar.key].understanding}
                        onChange={e => handlePillarChange(pillar.key, 'understanding', e.target.value)}
                        disabled={loading}
                      />
                      <div className="dual-scale-value">{formData.trainingScale[pillar.key].understanding}</div>
                    </div>
                    <div className="dual-scale-item">
                      <div className="dual-scale-label">Application (1–10)</div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={formData.trainingScale[pillar.key].application}
                        onChange={e => handlePillarChange(pillar.key, 'application', e.target.value)}
                        disabled={loading}
                      />
                      <div className="dual-scale-value">{formData.trainingScale[pillar.key].application}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <FormField label="Where is the largest gap between your understanding and your ability to apply a Training Scale element? What creates that gap?" error={errors['trainingScale.biggestGap']}>
              <textarea
                ref={el => { getRef('biggestGap').current = el; }}
                value={formData.trainingScale.biggestGap}
                onChange={e => handleNestedChange('trainingScale', 'biggestGap', e.target.value)}
                disabled={loading}
                placeholder="The pillar where knowing and doing feel furthest apart, and why you think that is..."
              />
              <VoiceInput textareaRef={getRef('biggestGap')} onTranscript={text => handleNestedChange('trainingScale', 'biggestGap', text)} />
            </FormField>
          </FormSection>

          {/* Section 5: Rider Skills */}
          <FormSection title="The Rider as an Instrument" description="Your body is the primary tool of communication. These three skills determine the clarity and honesty of every aid you give.">
            {RIDER_SKILL_SCALES.map(scale => (
              <div key={scale.key} className="scenario-box">
                <div className="scenario-title">{scale.label}</div>
                <p className="scale-hint" style={{ marginTop: 0, marginBottom: '0.75rem' }}>{scale.description}</p>
                <div className="scale-group">
                  <div className="scale-label">{scale.question}</div>
                  <div className="scale-wrapper">
                    <span className="scale-anchor left">{scale.leftAnchor}</span>
                    <div className="scale-track">
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={formData.riderSkills[scale.key].rating}
                        onChange={e => handleRiderSkillChange(scale.key, e.target.value)}
                        disabled={loading}
                      />
                      <span className="scale-value-badge">{formData.riderSkills[scale.key].rating}</span>
                    </div>
                    <span className="scale-anchor right">{scale.rightAnchor}</span>
                  </div>
                </div>
              </div>
            ))}

            <FormField label="Of these three rider skills — Independent Seat, Unilateral Aids, and Timing — which limits your effectiveness most right now? What would become possible if you improved it?">
              <textarea
                ref={el => { getRef('prioritySkill').current = el; }}
                value={formData.riderSkills.prioritySkill}
                onChange={e => handleNestedChange('riderSkills', 'prioritySkill', e.target.value)}
                disabled={loading}
                placeholder="The skill holding you back most, and what you imagine your riding would feel like if that limitation were removed..."
              />
              <VoiceInput textareaRef={getRef('prioritySkill')} onTranscript={text => handleNestedChange('riderSkills', 'prioritySkill', text)} />
            </FormField>
          </FormSection>

          {/* Section 6: Synthesis / Bigger Picture */}
          <FormSection title="The Bigger Picture" description="Stepping back to see the whole. All questions in this section are optional — answer what resonates.">
            <FormField label={<>What is your philosophy of what dressage is for? Not what the rulebook says — what do <em>you</em> believe it is at its core? <span className="optional-badge">Optional</span></>}>
              <textarea
                ref={el => { getRef('dressagePhilosophy').current = el; }}
                value={formData.synthesis.dressagePhilosophy}
                onChange={e => handleNestedChange('synthesis', 'dressagePhilosophy', e.target.value)}
                disabled={loading}
                placeholder="What is dressage, at its deepest level, to you..."
              />
              <VoiceInput textareaRef={getRef('dressagePhilosophy')} onTranscript={text => handleNestedChange('synthesis', 'dressagePhilosophy', text)} />
            </FormField>

            <FormField label={<>Where is the largest gap between your technical knowledge and your ability to embody that knowledge in the saddle? <span className="optional-badge">Optional</span></>} helpText="You understand something intellectually — but it hasn't yet become feeling. Where does that disconnect live?">
              <textarea
                ref={el => { getRef('knowledgeBodyGap').current = el; }}
                value={formData.synthesis.knowledgeBodyGap}
                onChange={e => handleNestedChange('synthesis', 'knowledgeBodyGap', e.target.value)}
                disabled={loading}
                placeholder="The thing you understand but can't yet feel — or feel but can't yet explain..."
              />
              <VoiceInput textareaRef={getRef('knowledgeBodyGap')} onTranscript={text => handleNestedChange('synthesis', 'knowledgeBodyGap', text)} />
            </FormField>

            <FormField label={<>What concept, author, trainer, or experience has most shaped your technical and philosophical understanding of dressage? <span className="optional-badge">Optional</span></>}>
              <textarea
                ref={el => { getRef('formativeInfluences').current = el; }}
                value={formData.synthesis.formativeInfluences}
                onChange={e => handleNestedChange('synthesis', 'formativeInfluences', e.target.value)}
                disabled={loading}
                placeholder="A book, a trainer's phrase, a ride, a clinic, a video — the source of an insight that changed how you think..."
                style={{ minHeight: '80px' }}
              />
              <VoiceInput textareaRef={getRef('formativeInfluences')} onTranscript={text => handleNestedChange('synthesis', 'formativeInfluences', text)} />
            </FormField>

            <FormField label={<>What is the one question you keep returning to — the mystery at the center of your journey right now? <span className="optional-badge">Optional</span></>}>
              <textarea
                ref={el => { getRef('burningQuestion').current = el; }}
                value={formData.synthesis.burningQuestion}
                onChange={e => handleNestedChange('synthesis', 'burningQuestion', e.target.value)}
                disabled={loading}
                placeholder="The concept, skill, or puzzle you most want to understand better..."
                style={{ minHeight: '80px' }}
              />
              <VoiceInput textareaRef={getRef('burningQuestion')} onTranscript={text => handleNestedChange('synthesis', 'burningQuestion', text)} />
            </FormField>
          </FormSection>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/technical-assessments')} disabled={loading}>
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
