import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  createRiderAssessment,
  getRiderAssessment,
  updateRiderAssessment,
  RIDER_ATTRIBUTES,
  SELF_RATING_SCALES
} from '../../services';
import FormSection from '../Forms/FormSection';
import FormField from '../Forms/FormField';
import VoiceInput from '../Forms/VoiceInput';
import '../Forms/Forms.css';

const MAX_ATTRIBUTES = 4;

export default function RiderAssessmentForm() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const textareaRefs = useRef({});

  const [formData, setFormData] = useState({
    // Awareness scenarios
    bestWhen: '',
    bestFeelings: '',
    bestDialogue: '',
    losingWhen: '',
    losingFeelings: '',
    losingDialogue: '',
    lostWhen: '',
    lostFeelings: '',
    lostDialogue: '',
    // Journey
    roleModels: '',
    roleModelQualities: '',
    biggestChallenge: '',
    challengeResolution: '',
    greatestPerformance: '',
    performanceFactors: '',
    // Self-Regulation
    energizers: '',
    relaxers: '',
    // Attributes
    currentStrengths: [],
    growthAreas: [],
    // Self-Ratings
    positionAndSeat: 5,
    aidsAndCommunication: 5,
    feelAndTiming: 5,
    knowledgeAndUnderstanding: 5,
    mentalGame: 5
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (id) loadExisting();
  }, [id, currentUser]);

  async function loadExisting() {
    if (!id) return;
    setLoadingData(true);
    const result = await getRiderAssessment(id);
    if (result.success) {
      const d = result.data;
      setFormData({
        bestWhen: d.bestWhen || '',
        bestFeelings: d.bestFeelings || '',
        bestDialogue: d.bestDialogue || '',
        losingWhen: d.losingWhen || '',
        losingFeelings: d.losingFeelings || '',
        losingDialogue: d.losingDialogue || '',
        lostWhen: d.lostWhen || '',
        lostFeelings: d.lostFeelings || '',
        lostDialogue: d.lostDialogue || '',
        roleModels: d.roleModels || '',
        roleModelQualities: d.roleModelQualities || '',
        biggestChallenge: d.biggestChallenge || '',
        challengeResolution: d.challengeResolution || '',
        greatestPerformance: d.greatestPerformance || '',
        performanceFactors: d.performanceFactors || '',
        energizers: d.energizers || '',
        relaxers: d.relaxers || '',
        currentStrengths: d.currentStrengths || [],
        growthAreas: d.growthAreas || [],
        positionAndSeat: d.positionAndSeat || 5,
        aidsAndCommunication: d.aidsAndCommunication || 5,
        feelAndTiming: d.feelAndTiming || 5,
        knowledgeAndUnderstanding: d.knowledgeAndUnderstanding || 5,
        mentalGame: d.mentalGame || 5
      });
    }
    setLoadingData(false);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  }

  function toggleAttribute(field, attr) {
    setFormData(prev => {
      const current = prev[field];
      if (current.includes(attr)) {
        return { ...prev, [field]: current.filter(a => a !== attr) };
      }
      if (current.length >= MAX_ATTRIBUTES) return prev;
      return { ...prev, [field]: [...current, attr] };
    });
  }

  function handleSliderChange(key, value) {
    setFormData(prev => ({ ...prev, [key]: parseInt(value, 10) }));
  }

  function getRef(key) {
    if (!textareaRefs.current[key]) {
      textareaRefs.current[key] = { current: null };
    }
    return textareaRefs.current[key];
  }

  function validateForm() {
    const newErrors = {};
    // Awareness - at least one scenario required
    if (!formData.bestWhen.trim()) newErrors.bestWhen = 'Please complete this field';
    if (!formData.bestFeelings.trim()) newErrors.bestFeelings = 'Please describe your feelings';
    if (!formData.losingWhen.trim()) newErrors.losingWhen = 'Please complete this field';
    if (!formData.losingFeelings.trim()) newErrors.losingFeelings = 'Please describe your feelings';
    if (!formData.lostWhen.trim()) newErrors.lostWhen = 'Please complete this field';
    if (!formData.lostFeelings.trim()) newErrors.lostFeelings = 'Please describe your feelings';
    // Journey
    if (!formData.roleModels.trim()) newErrors.roleModels = 'Please name your role models';
    if (!formData.biggestChallenge.trim()) newErrors.biggestChallenge = 'Please describe your challenge';
    if (!formData.greatestPerformance.trim()) newErrors.greatestPerformance = 'Please describe your performance';
    // Attributes
    if (formData.currentStrengths.length === 0) newErrors.currentStrengths = 'Please select at least one strength';
    if (formData.growthAreas.length === 0) newErrors.growthAreas = 'Please select at least one growth area';
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
      result = await updateRiderAssessment(id, data);
    } else {
      result = await createRiderAssessment(currentUser.uid, data);
    }

    setLoading(false);

    if (result.success) {
      navigate('/rider-assessments');
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
        <h1>{isEdit ? 'Edit Rider Self-Assessment' : 'Rider Self-Assessment'}</h1>
        <p>Understanding your mental patterns and experiences in the saddle</p>
      </div>

      <form onSubmit={handleSubmit} autoComplete="off">
        <div className="form-card">
          {errors.submit && <div className="form-section"><div className="form-alert form-alert-error">{errors.submit}</div></div>}

          {/* Section 1: Awareness - 3 Scenarios */}
          <FormSection title="Awareness: Your Internal Landscape" description="Recognizing your feelings and internal dialogue helps you understand your patterns and triggers.">

            {/* At My Best */}
            <div className="scenario-box">
              <div className="scenario-title">When Things Are Going Well</div>
              <FormField label="Complete this statement: I feel at my best in the saddle when..." error={errors.bestWhen}>
                <textarea
                  ref={el => { getRef('bestWhen').current = el; }}
                  name="bestWhen"
                  value={formData.bestWhen}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="Example: when my horse is soft and responsive, when I feel balanced and quiet, when I trust my preparation..."
                />
                <VoiceInput textareaRef={getRef('bestWhen')} onTranscript={text => setFormData(prev => ({ ...prev, bestWhen: text }))} />
              </FormField>
              <FormField label="Describe the feeling(s) you have when things are going well:" error={errors.bestFeelings}>
                <textarea
                  ref={el => { getRef('bestFeelings').current = el; }}
                  name="bestFeelings"
                  value={formData.bestFeelings}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="Example: confident, calm, connected, powerful, joyful, focused, flowing..."
                />
                <VoiceInput textareaRef={getRef('bestFeelings')} onTranscript={text => setFormData(prev => ({ ...prev, bestFeelings: text }))} />
              </FormField>
              <FormField label="What is your internal dialogue?" optional>
                <textarea
                  ref={el => { getRef('bestDialogue').current = el; }}
                  name="bestDialogue"
                  value={formData.bestDialogue}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="Example: 'Yes, this is it!' 'We've got this.' 'Just keep allowing.'"
                  style={{ minHeight: '80px' }}
                />
                <VoiceInput textareaRef={getRef('bestDialogue')} onTranscript={text => setFormData(prev => ({ ...prev, bestDialogue: text }))} />
              </FormField>
            </div>

            {/* Starting to Lose It */}
            <div className="scenario-box">
              <div className="scenario-title">When Things Start Going Downhill</div>
              <FormField label="I know I am starting to lose it (my confidence, focus) during my ride when..." error={errors.losingWhen}>
                <textarea
                  ref={el => { getRef('losingWhen').current = el; }}
                  name="losingWhen"
                  value={formData.losingWhen}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="Example: when my horse becomes tense, when I make the same mistake twice, when nothing seems to work..."
                />
                <VoiceInput textareaRef={getRef('losingWhen')} onTranscript={text => setFormData(prev => ({ ...prev, losingWhen: text }))} />
              </FormField>
              <FormField label="Describe the feeling(s) you have when things are starting to go poorly:" error={errors.losingFeelings}>
                <textarea
                  ref={el => { getRef('losingFeelings').current = el; }}
                  name="losingFeelings"
                  value={formData.losingFeelings}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="Example: frustrated, tense, anxious, scattered, worried, self-critical..."
                />
                <VoiceInput textareaRef={getRef('losingFeelings')} onTranscript={text => setFormData(prev => ({ ...prev, losingFeelings: text }))} />
              </FormField>
              <FormField label="What is your internal dialogue?" optional>
                <textarea
                  ref={el => { getRef('losingDialogue').current = el; }}
                  name="losingDialogue"
                  value={formData.losingDialogue}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="Example: 'Why isn't this working?' 'I'm doing it wrong again.' 'This is going badly.'"
                  style={{ minHeight: '80px' }}
                />
                <VoiceInput textareaRef={getRef('losingDialogue')} onTranscript={text => setFormData(prev => ({ ...prev, losingDialogue: text }))} />
              </FormField>
            </div>

            {/* Lost It */}
            <div className="scenario-box">
              <div className="scenario-title">When Things Have Gone From Bad to Worse</div>
              <FormField label="I know I've lost it (my confidence, focus) during my ride when..." error={errors.lostWhen}>
                <textarea
                  ref={el => { getRef('lostWhen').current = el; }}
                  name="lostWhen"
                  value={formData.lostWhen}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="Example: when I want to get off, when I feel like crying, when I stop trying..."
                />
                <VoiceInput textareaRef={getRef('lostWhen')} onTranscript={text => setFormData(prev => ({ ...prev, lostWhen: text }))} />
              </FormField>
              <FormField label="Describe the feeling(s) you have when things have completely fallen apart:" error={errors.lostFeelings}>
                <textarea
                  ref={el => { getRef('lostFeelings').current = el; }}
                  name="lostFeelings"
                  value={formData.lostFeelings}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="Example: defeated, overwhelmed, embarrassed, angry, hopeless, disconnected..."
                />
                <VoiceInput textareaRef={getRef('lostFeelings')} onTranscript={text => setFormData(prev => ({ ...prev, lostFeelings: text }))} />
              </FormField>
              <FormField label="What is your internal dialogue?" optional>
                <textarea
                  ref={el => { getRef('lostDialogue').current = el; }}
                  name="lostDialogue"
                  value={formData.lostDialogue}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="Example: 'I can't do this.' 'I'm not good enough.' 'What's the point?'"
                  style={{ minHeight: '80px' }}
                />
                <VoiceInput textareaRef={getRef('lostDialogue')} onTranscript={text => setFormData(prev => ({ ...prev, lostDialogue: text }))} />
              </FormField>
            </div>
          </FormSection>

          {/* Section 2: Dressage Journey */}
          <FormSection title="Your Dressage Journey" description="Understanding what inspires you and what you've overcome.">
            <FormField label="Name one or two dressage role models:" error={errors.roleModels}>
              <input
                type="text"
                name="roleModels"
                value={formData.roleModels}
                onChange={handleChange}
                disabled={loading}
                placeholder="Names of riders, trainers, or figures you admire..."
              />
            </FormField>
            <FormField label="What do you admire about them?" optional>
              <textarea
                ref={el => { getRef('roleModelQualities').current = el; }}
                name="roleModelQualities"
                value={formData.roleModelQualities}
                onChange={handleChange}
                disabled={loading}
                placeholder="What qualities, skills, or approaches do they have that you respect or aspire to?"
                style={{ minHeight: '80px' }}
              />
              <VoiceInput textareaRef={getRef('roleModelQualities')} onTranscript={text => setFormData(prev => ({ ...prev, roleModelQualities: text }))} />
            </FormField>

            <FormField label="What has been your biggest horse-related challenge to date?" error={errors.biggestChallenge}>
              <textarea
                ref={el => { getRef('biggestChallenge').current = el; }}
                name="biggestChallenge"
                value={formData.biggestChallenge}
                onChange={handleChange}
                disabled={loading}
                placeholder="Describe a significant obstacle or difficult period in your riding journey..."
              />
              <VoiceInput textareaRef={getRef('biggestChallenge')} onTranscript={text => setFormData(prev => ({ ...prev, biggestChallenge: text }))} />
            </FormField>
            <FormField label="How did you overcome it (or how are you working through it)?" optional>
              <textarea
                ref={el => { getRef('challengeResolution').current = el; }}
                name="challengeResolution"
                value={formData.challengeResolution}
                onChange={handleChange}
                disabled={loading}
                placeholder="What strategies, support, or mindset shifts helped you address this challenge?"
              />
              <VoiceInput textareaRef={getRef('challengeResolution')} onTranscript={text => setFormData(prev => ({ ...prev, challengeResolution: text }))} />
            </FormField>

            <FormField label="What has been your greatest horse-related performance to date?" error={errors.greatestPerformance}>
              <textarea
                ref={el => { getRef('greatestPerformance').current = el; }}
                name="greatestPerformance"
                value={formData.greatestPerformance}
                onChange={handleChange}
                disabled={loading}
                placeholder="A ride, lesson, show, or moment where you felt you performed at your best..."
              />
              <VoiceInput textareaRef={getRef('greatestPerformance')} onTranscript={text => setFormData(prev => ({ ...prev, greatestPerformance: text }))} />
            </FormField>
            <FormField label="What helped you get there?" optional>
              <textarea
                ref={el => { getRef('performanceFactors').current = el; }}
                name="performanceFactors"
                value={formData.performanceFactors}
                onChange={handleChange}
                disabled={loading}
                placeholder="What preparation, support, mindset, or conditions contributed to this success?"
              />
              <VoiceInput textareaRef={getRef('performanceFactors')} onTranscript={text => setFormData(prev => ({ ...prev, performanceFactors: text }))} />
            </FormField>
          </FormSection>

          {/* Section 3: Self-Regulation */}
          <FormSection title="Self-Regulation" description="Understanding what energizes and calms you.">
            <FormField label="What makes you feel more energetic?" optional>
              <textarea
                ref={el => { getRef('energizers').current = el; }}
                name="energizers"
                value={formData.energizers}
                onChange={handleChange}
                disabled={loading}
                placeholder="Activities, environments, people, or practices that boost your energy and motivation..."
                style={{ minHeight: '80px' }}
              />
              <VoiceInput textareaRef={getRef('energizers')} onTranscript={text => setFormData(prev => ({ ...prev, energizers: text }))} />
            </FormField>
            <FormField label="What helps you to relax?" optional>
              <textarea
                ref={el => { getRef('relaxers').current = el; }}
                name="relaxers"
                value={formData.relaxers}
                onChange={handleChange}
                disabled={loading}
                placeholder="Activities, environments, people, or practices that help you unwind and feel calm..."
                style={{ minHeight: '80px' }}
              />
              <VoiceInput textareaRef={getRef('relaxers')} onTranscript={text => setFormData(prev => ({ ...prev, relaxers: text }))} />
            </FormField>
          </FormSection>

          {/* Section 4: Current Strengths */}
          <FormSection title="Your Strengths" description="Check up to 4 attributes you most often display while riding or pursuing your dressage journey.">
            {errors.currentStrengths && <div className="field-error" style={{ marginBottom: '0.75rem' }}>{errors.currentStrengths}</div>}
            <div className="attribute-grid">
              {RIDER_ATTRIBUTES.map(attr => {
                const isSelected = formData.currentStrengths.includes(attr);
                const atMax = formData.currentStrengths.length >= MAX_ATTRIBUTES && !isSelected;
                return (
                  <label
                    key={`strength-${attr}`}
                    className={`attribute-option ${isSelected ? 'selected' : ''} ${atMax ? 'at-max' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleAttribute('currentStrengths', attr)}
                      disabled={loading || atMax}
                    />
                    {attr}
                  </label>
                );
              })}
            </div>
            <div className="attribute-counter">
              {formData.currentStrengths.length} of {MAX_ATTRIBUTES} selected
            </div>
          </FormSection>

          {/* Section 5: Growth Areas */}
          <FormSection title="Growth Areas" description="Are there any attributes you would like to bring into focus more in your dressage journey? Select up to 4.">
            {errors.growthAreas && <div className="field-error" style={{ marginBottom: '0.75rem' }}>{errors.growthAreas}</div>}
            <div className="attribute-grid">
              {RIDER_ATTRIBUTES.map(attr => {
                const isSelected = formData.growthAreas.includes(attr);
                const atMax = formData.growthAreas.length >= MAX_ATTRIBUTES && !isSelected;
                return (
                  <label
                    key={`growth-${attr}`}
                    className={`attribute-option ${isSelected ? 'selected' : ''} ${atMax ? 'at-max' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleAttribute('growthAreas', attr)}
                      disabled={loading || atMax}
                    />
                    {attr}
                  </label>
                );
              })}
            </div>
            <div className="attribute-counter">
              {formData.growthAreas.length} of {MAX_ATTRIBUTES} selected
            </div>
          </FormSection>

          {/* Section 6: Quick Self-Rating */}
          <FormSection title="Quick Self-Rating" description="Rate yourself honestly on each dimension. There are no 'right' scores — this snapshot helps track your growth over time.">
            {SELF_RATING_SCALES.map(scale => (
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
                      value={formData[scale.key]}
                      onChange={e => handleSliderChange(scale.key, e.target.value)}
                      disabled={loading}
                    />
                    <span className="scale-value-badge">{formData[scale.key]}</span>
                  </div>
                  <span className="scale-anchor right">{scale.rightAnchor}</span>
                </div>
              </div>
            ))}
          </FormSection>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/rider-assessments')} disabled={loading}>
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
