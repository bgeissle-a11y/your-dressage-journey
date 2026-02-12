import { useState, useEffect, useRef } from 'react';
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
    const data = { ...formData, isDraft };

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
