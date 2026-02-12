import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { createReflection, getReflection, updateReflection, REFLECTION_CATEGORIES } from '../../services';
import FormField from '../Forms/FormField';
import VoiceInput from '../Forms/VoiceInput';
import useDisableAutofill from '../../hooks/useDisableAutofill';
import '../Forms/Forms.css';

const CATEGORY_COLORS = {
  personal: '#4A90E2',
  validation: '#7ED321',
  aha: '#F5A623',
  obstacle: '#D0021B',
  connection: '#8B5CF6',
  feel: '#FF8C42'
};

const PROMPTS = {
  personal: [
    "A lifestyle change that gave you more productive time in the saddle",
    "A skill you once avoided that you now attempt",
    "A change you made that improved your horse's comfort or confidence",
    "A time you rode in an intimidating situation",
    "A riding or training breakthrough",
    "A time when you felt proud after a difficult lesson or moment in the saddle",
    "A breakthrough in rhythm, connection, or harmony during a ride",
    "A milestone you didn't recognize at the time",
    "A lesson that left you feeling invincible",
    "A time you handled frustration better than before",
    "A ride that felt like true partnership",
    "A setback that led to long-term growth",
    "A time you exceeded your own expectations",
    "A moment you look back on with pride",
    "Mastering a movement you'd watched others do for years"
  ],
  validation: [
    "Encouragement from a coach when you needed it most",
    "Feedback that confirmed you were improving",
    "A compliment that surprised you",
    "Someone noticing progress you hadn't seen yet",
    "A judge's comment that changed your perspective",
    "Positive feedback after a difficult ride",
    "A trainer believing in you before you did",
    "Recognition that felt earned",
    "Support from a barn mate or peer",
    "Someone acknowledging your effort, not just results",
    "Validation that helped you keep going",
    "Encouragement during a setback",
    "Being trusted with more responsibility",
    "A quiet nod or small comment that stuck with you",
    "Being asked to demonstrate for other riders"
  ],
  aha: [
    "A time that something \"clicked\"",
    "A moment when the basics made sense",
    "A time when you realized less effort brought better results",
    "A time when the why behind an exercise became clear",
    "A time when you figured out the correct timing to give the aid",
    "A moment you connected theory to feeling",
    "A time when you realized your horse was giving feedback all along",
    "A time you felt the perfect half-halt, transition, or moment of collection",
    "A time when your instructor said something that struck a chord",
    "A time when you went back to the basics — again",
    "A time when you shifted your perspective from \"doing\" to \"allowing\"",
    "An insight that gave you momentum or took you out of a slump",
    "A realization about partnership vs control",
    "Realizing your seat influences everything",
    "Understanding that \"soft\" doesn't mean \"weak\""
  ],
  obstacle: [
    "A plateau that lasted longer than expected",
    "A lesson that left you discouraged",
    "A time you received conflicting advice",
    "A time you felt stuck despite effort",
    "A confidence setback",
    "A physical issue or physical setback",
    "A horse health or soundness issue",
    "A misunderstanding with your horse",
    "An injury or fall that shook your confidence",
    "Comparison to others",
    "Loss of motivation",
    "A ride that didn't match expectations",
    "A period of self-doubt",
    "Lack of resources (money, time, etc)",
    "A loss of trust — in yourself or your horse"
  ],
  connection: [
    "A time your horse tried their heart out for you",
    "Recognizing when your horse was teaching you",
    "A moment of mutual understanding",
    "Your horse forgiving a mistake",
    "Building trust with a difficult or traumatized horse",
    "The day your horse chose to be with you",
    "A time your horse showed you what they needed",
    "Your horse taking care of you when you were unbalanced",
    "A ride where you and your horse were completely in sync",
    "A time your horse met you halfway when you were struggling",
    "A moment your horse clearly communicated something to you",
    "The first time you truly felt your horse relax under you",
    "Recognizing when your horse was having an off day and adjusting accordingly",
    "A time your horse gave more than you asked for",
    "A breakthrough in how you communicate with your horse"
  ],
  feel: [
    "The first time you truly felt your seat bones",
    "Discovering where tension lives in your body while riding",
    "Feeling the moment of suspension in the trot",
    "The first time you felt your core engage independently",
    "Recognizing the difference between gripping and wrapping your leg",
    "Feeling when your shoulders creep up (and learning to drop them)",
    "The moment you felt the hind legs push",
    "Discovering you were holding your breath",
    "The first time you felt collection as an upward energy",
    "Feeling the horse's back come up beneath you",
    "Learning to soften a locked joint (elbow, knee, ankle, jaw)",
    "Feeling the difference between pulling and half-halting",
    "Discovering your \"strong\" side vs. \"weak\" side",
    "The first time you felt your hip follow the canter",
    "Feeling throughness travel from back to front"
  ]
};

export default function ReflectionForm() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const formRef = useRef(null);
  const mainRef = useRef(null);
  const obstacleRef = useRef(null);
  useDisableAutofill(formRef);
  const feelingRef = useRef(null);
  const influenceRef = useRef(null);

  const [category, setCategory] = useState('');
  const [prompt, setPrompt] = useState('');
  const [passesRemaining, setPassesRemaining] = useState(3);
  const [usedPromptIndices, setUsedPromptIndices] = useState([]);
  const [step, setStep] = useState('category'); // category | prompt | reflect
  const [formData, setFormData] = useState({
    mainReflection: '',
    obstacleStrategy: '',
    feeling: '',
    influence: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (id) loadExisting();
  }, [id]);

  async function loadExisting() {
    setLoadingData(true);
    const result = await getReflection(id);
    if (result.success) {
      setCategory(result.data.category || '');
      setPrompt(result.data.prompt || '');
      setFormData({
        mainReflection: result.data.mainReflection || '',
        obstacleStrategy: result.data.obstacleStrategy || '',
        feeling: result.data.feeling || '',
        influence: result.data.influence || ''
      });
      setStep('reflect');
    }
    setLoadingData(false);
  }

  function selectCategory(cat) {
    setCategory(cat);
    setPassesRemaining(3);
    setUsedPromptIndices([]);
    pickRandomPrompt(cat, []);
    setStep('prompt');
  }

  function pickRandomPrompt(cat, used) {
    const pool = PROMPTS[cat];
    const available = pool.map((_, i) => i).filter(i => !used.includes(i));
    if (available.length === 0) {
      setPrompt(pool[Math.floor(Math.random() * pool.length)]);
      return;
    }
    const idx = available[Math.floor(Math.random() * available.length)];
    setUsedPromptIndices(prev => [...prev, idx]);
    setPrompt(pool[idx]);
  }

  function handlePass() {
    if (passesRemaining <= 0) return;
    setPassesRemaining(prev => prev - 1);
    pickRandomPrompt(category, usedPromptIndices);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  }

  function validateForm() {
    const newErrors = {};
    if (!formData.mainReflection.trim()) newErrors.mainReflection = 'Please share your reflection';
    if (category === 'obstacle' && !formData.obstacleStrategy.trim()) {
      newErrors.obstacleStrategy = 'Please share how you might approach this obstacle';
    }
    if (!formData.feeling.trim()) newErrors.feeling = 'Please describe how this makes you feel';
    if (!formData.influence.trim()) newErrors.influence = 'Please share how this will influence future rides';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    const data = {
      category,
      prompt,
      mainReflection: formData.mainReflection,
      obstacleStrategy: category === 'obstacle' ? formData.obstacleStrategy : null,
      feeling: formData.feeling,
      influence: formData.influence
    };

    let result;
    if (isEdit) {
      result = await updateReflection(id, data);
    } else {
      result = await createReflection(currentUser.uid, data);
    }

    setLoading(false);

    if (result.success) {
      navigate('/reflections');
    } else {
      setErrors({ submit: result.error });
    }
  }

  if (loadingData) {
    return <div className="loading-state">Loading reflection...</div>;
  }

  const categoryLabel = REFLECTION_CATEGORIES.find(c => c.value === category)?.label || '';
  const categoryColor = CATEGORY_COLORS[category] || '#8B7355';

  return (
    <div className="form-page">
      <div className="form-page-header">
        <h1>{isEdit ? 'Edit Reflection' : 'New Reflection'}</h1>
        <p>A space for reflection and growth</p>
      </div>

      {/* Step 1: Category Selection */}
      {step === 'category' && (
        <div className="form-card">
          <div className="form-section">
            <div className="form-section-header">
              <h2 className="form-section-title">Choose Your Reflection Category</h2>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: '12px'
            }}>
              {REFLECTION_CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => selectCategory(cat.value)}
                  style={{
                    padding: '20px 16px',
                    border: `2px solid ${CATEGORY_COLORS[cat.value]}`,
                    borderRadius: '12px',
                    background: 'white',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s ease',
                    fontWeight: 500,
                    color: CATEGORY_COLORS[cat.value],
                    fontSize: '1rem'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = `${CATEGORY_COLORS[cat.value]}15`;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/reflections')}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Prompt Selection */}
      {step === 'prompt' && (
        <div className="form-card">
          <div className="form-section">
            <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
              <span style={{
                display: 'inline-block',
                padding: '4px 14px',
                borderRadius: '12px',
                fontSize: '0.85rem',
                fontWeight: 500,
                background: `${categoryColor}20`,
                color: categoryColor
              }}>
                {categoryLabel}
              </span>
            </div>
            <div style={{ fontSize: '0.9rem', color: '#7A7A7A', textAlign: 'center', marginBottom: '1rem' }}>
              Passes remaining: {passesRemaining}
            </div>
            <div style={{
              background: '#FAFAFA',
              padding: '24px',
              borderRadius: '12px',
              borderLeft: `4px solid ${categoryColor}`,
              marginBottom: '1.5rem'
            }}>
              <p style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '1.25rem',
                lineHeight: 1.6,
                margin: 0
              }}>
                {prompt}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button type="button" className="btn btn-secondary" onClick={() => { setStep('category'); setCategory(''); }}>
                Back
              </button>
              <button type="button" className="btn btn-secondary" onClick={handlePass} disabled={passesRemaining <= 0}>
                Pass
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setStep('reflect')}>
                Reflect on This
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Reflection Writing */}
      {step === 'reflect' && (
        <form ref={formRef} onSubmit={handleSubmit} autoComplete="off">
          <div className="form-card">
            {errors.submit && <div className="form-section"><div className="form-alert form-alert-error">{errors.submit}</div></div>}

            <div className="form-section">
              <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                <span style={{
                  display: 'inline-block',
                  padding: '4px 14px',
                  borderRadius: '12px',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  background: `${categoryColor}20`,
                  color: categoryColor
                }}>
                  {categoryLabel}
                </span>
              </div>
              <div style={{
                background: '#FAFAFA',
                padding: '20px',
                borderRadius: '12px',
                borderLeft: `4px solid ${categoryColor}`,
                marginBottom: '1.5rem'
              }}>
                <p style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: '1.15rem',
                  lineHeight: 1.6,
                  margin: 0
                }}>
                  {prompt}
                </p>
              </div>
            </div>

            <div className="form-section">
              <FormField label="Share your reflection" error={errors.mainReflection}>
                <textarea ref={mainRef} name="mainReflection" value={formData.mainReflection} onChange={handleChange} disabled={loading} className={`tall ${errors.mainReflection ? 'error' : ''}`} placeholder="Take your time to reflect deeply on this moment in your journey..." />
                <VoiceInput textareaRef={mainRef} onTranscript={text => {
                  setFormData(prev => ({ ...prev, mainReflection: text }));
                  if (errors.mainReflection) setErrors(prev => ({ ...prev, mainReflection: '' }));
                }} />
              </FormField>
            </div>

            {category === 'obstacle' && (
              <div className="form-section">
                <FormField label="How might you approach or overcome this obstacle?" error={errors.obstacleStrategy}>
                  <textarea ref={obstacleRef} name="obstacleStrategy" value={formData.obstacleStrategy} onChange={handleChange} disabled={loading} className={errors.obstacleStrategy ? 'error' : ''} placeholder="Consider strategies, support systems, or mindset shifts that could help..." />
                  <VoiceInput textareaRef={obstacleRef} onTranscript={text => {
                    setFormData(prev => ({ ...prev, obstacleStrategy: text }));
                    if (errors.obstacleStrategy) setErrors(prev => ({ ...prev, obstacleStrategy: '' }));
                  }} />
                </FormField>
              </div>
            )}

            <div className="form-section">
              <FormField label="How does this make you feel?" error={errors.feeling}>
                <textarea ref={feelingRef} name="feeling" value={formData.feeling} onChange={handleChange} disabled={loading} className={errors.feeling ? 'error' : ''} style={{ minHeight: '80px' }} placeholder="Grateful, empowered, hopeful, grounded..." />
                <VoiceInput textareaRef={feelingRef} onTranscript={text => {
                  setFormData(prev => ({ ...prev, feeling: text }));
                  if (errors.feeling) setErrors(prev => ({ ...prev, feeling: '' }));
                }} />
              </FormField>
            </div>

            <div className="form-section">
              <FormField label="How will this influence your approach to future rides?" error={errors.influence}>
                <textarea ref={influenceRef} name="influence" value={formData.influence} onChange={handleChange} disabled={loading} className={errors.influence ? 'error' : ''} placeholder="Consider how this insight or experience will shape your journey forward..." />
                <VoiceInput textareaRef={influenceRef} onTranscript={text => {
                  setFormData(prev => ({ ...prev, influence: text }));
                  if (errors.influence) setErrors(prev => ({ ...prev, influence: '' }));
                }} />
              </FormField>
            </div>

            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/reflections')} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Saving...' : (isEdit ? 'Update Reflection' : 'Save Reflection')}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
