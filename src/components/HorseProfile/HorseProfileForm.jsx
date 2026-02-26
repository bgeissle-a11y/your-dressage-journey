import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { createHorseProfile, getHorseProfile, updateHorseProfile } from '../../services';
import FormSection from '../Forms/FormSection';
import FormField from '../Forms/FormField';
import '../Forms/Forms.css';

const LEVEL_OPTIONS = [
  { value: '', label: 'Select level...' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'training', label: 'Training Level' },
  { value: 'first', label: 'First Level' },
  { value: 'second', label: 'Second Level' },
  { value: 'third', label: 'Third Level' },
  { value: 'fourth', label: 'Fourth Level' },
  { value: 'psg', label: 'Prix St. Georges' },
  { value: 'inter1', label: 'Intermediate I' },
  { value: 'inter2', label: 'Intermediate II' },
  { value: 'gp', label: 'Grand Prix' },
  { value: 'training-not-showing', label: 'Training (Not Showing)' },
  { value: 'groundwork', label: 'Ground work only / not currently under saddle' }
];

const SEX_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'mare', label: 'Mare' },
  { value: 'gelding', label: 'Gelding' },
  { value: 'stallion', label: 'Stallion' }
];

const ARRANGEMENT_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'own', label: 'Own' },
  { value: 'lease', label: 'Full Lease' },
  { value: 'partial-lease', label: 'Partial Lease' },
  { value: 'catch-ride', label: 'Catch Ride' },
  { value: 'other', label: 'Other' }
];

const SOUNDNESS_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'sound', label: 'Sound' },
  { value: 'managing', label: 'Managing an issue' },
  { value: 'recovering', label: 'Recovering from injury' },
  { value: 'not-sound', label: 'Not currently sound' }
];

const MONTH_OPTIONS = [
  { value: '', label: 'Month' },
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' }
];

const STRENGTH_CHIPS = [
  'expressive', 'brave', 'sensitive', 'forgiving', 'careful',
  'honest', 'willing', 'elastic', 'powerful', 'good mind',
  'spooky', 'reactive', 'quiet'
];

const ASYMMETRY_TESTS = [
  {
    key: 'sweat',
    title: 'Test 1 \u2014 The Sweat & Hair Diagnostic',
    howTo: 'After a ride where your horse broke a light sweat, pull the saddle and pad off immediately. Look at the sweat patterns on the horse\u2019s back and the underside of the pad.',
    lookingFor: 'Is one side bone-dry while the other is soaked? Are the hair follicles ruffled or \u201Cswirled\u201D differently left vs. right? Dry spots can indicate too much pressure (constricting sweat glands); ruffled hair suggests the saddle is shifting toward one side.',
    obsPlaceholder: 'e.g., Left side was consistently dry near the saddle panel, right side sweated normally. Hair ruffled forward on the left.',
    interpPlaceholder: 'e.g., Saddle may be bridging on the left, or left panel has more pressure.'
  },
  {
    key: 'carrot',
    title: 'Test 2 \u2014 The Carrot Stretch',
    howTo: 'Stand your horse squarely on level ground. Use a carrot or treat to lead their nose toward each hip in turn\u2014ask them to touch their flank/hip on the left, then the right.',
    lookingFor: 'How far can they reach each side? Does one side cause them to \u201Ccheat\u201D by stepping out with a leg to compensate? This identifies lateral stiffness in the neck and thoracic spine.',
    obsPlaceholder: 'e.g., Easily reaches hip on left. On right, can only get to mid-ribcage and shifts right hind out to compensate.',
    interpPlaceholder: 'e.g., Lateral stiffness in right side of neck/thoracic spine.'
  },
  {
    key: 'tail',
    title: 'Test 3 \u2014 The Tail Pull & Swing',
    howTo: 'Stand safely to the side of the haunches. Gently grasp the dock of the tail and let it rest in your hand\u2014feel for tension. Then gently swing the tail like a pendulum, left and right.',
    lookingFor: 'Does the tail hang naturally to one side? When you swing it, does it move fluidly one way but feel \u201Cblocked\u201D or resistant the other? A tail that parks to one side often indicates a rotated pelvis or tension in the opposite SI region.',
    obsPlaceholder: 'e.g., Tail rests slightly to the right. Swings freely to the left but feels blocked/stiff swinging to the right.',
    interpPlaceholder: 'e.g., Possible right SI tension or pelvic rotation to the left.'
  },
  {
    key: 'hoof',
    title: 'Test 4 \u2014 The Hoof Print Tracking',
    howTo: 'On a freshly dragged arena or soft level dirt, lead your horse in a straight line at a walk for about 20 meters. Look back at the tracks.',
    lookingFor: 'Are the hind hooves stepping directly into the prints of the front hooves (tracking up)? Or is one hind consistently stepping to the inside or outside of the front track? The \u201Cweak\u201D pushing leg typically straddling the midline or falling short.',
    obsPlaceholder: 'e.g., Left hind tracks up cleanly. Right hind consistently falls about 3 inches to the inside of the right front print.',
    interpPlaceholder: 'e.g., Right hind appears to be the weaker pushing leg.'
  }
];

function generateYearOptions(rangeBack) {
  const currentYear = new Date().getFullYear();
  const options = [{ value: '', label: 'Year' }];
  for (let y = currentYear; y >= currentYear - rangeBack; y--) {
    options.push({ value: String(y), label: String(y) });
  }
  return options;
}

const BIRTH_YEAR_OPTIONS = generateYearOptions(45);
const PARTNERSHIP_YEAR_OPTIONS = generateYearOptions(30);

const EMPTY_ASYMMETRY = {
  sweat: { completed: false, observation: '', interpretation: '' },
  carrot: { completed: false, observation: '', interpretation: '' },
  tail: { completed: false, observation: '', interpretation: '' },
  hoof: { completed: false, observation: '', interpretation: '' },
  overall: ''
};

export default function HorseProfileForm() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    riderName: '',
    horseName: '',
    birthMonth: '',
    birthYear: '',
    approxAge: '',
    breed: '',
    sex: '',
    partnershipMonth: '',
    partnershipYear: '',
    horseLevel: '',
    arrangement: '',
    strengths: '',
    soundness: '',
    conditions: '',
    important: '',
    asymmetry: { ...EMPTY_ASYMMETRY }
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [openTests, setOpenTests] = useState({});

  useEffect(() => {
    if (currentUser && !isEdit) {
      setFormData(prev => ({ ...prev, riderName: currentUser.displayName || '' }));
    }
  }, [currentUser, isEdit]);

  useEffect(() => {
    if (id) loadExisting();
  }, [id]);

  async function loadExisting() {
    setLoadingData(true);
    const result = await getHorseProfile(id);
    if (result.success) {
      const d = result.data;
      setFormData({
        riderName: d.riderName || '',
        horseName: d.horseName || '',
        birthMonth: d.birthMonth || '',
        birthYear: d.birthYear || '',
        approxAge: d.approxAge || (d.age ? String(d.age) : ''),
        breed: d.breed || '',
        sex: d.sex || '',
        partnershipMonth: d.partnershipMonth || '',
        partnershipYear: d.partnershipYear || '',
        horseLevel: d.horseLevel || '',
        arrangement: d.arrangement || '',
        strengths: d.strengths || '',
        soundness: d.soundness || '',
        conditions: d.conditions || '',
        important: d.important || '',
        asymmetry: d.asymmetry ? {
          sweat: { completed: false, observation: '', interpretation: '', ...d.asymmetry.sweat },
          carrot: { completed: false, observation: '', interpretation: '', ...d.asymmetry.carrot },
          tail: { completed: false, observation: '', interpretation: '', ...d.asymmetry.tail },
          hoof: { completed: false, observation: '', interpretation: '', ...d.asymmetry.hoof },
          overall: d.asymmetry.overall || ''
        } : { ...EMPTY_ASYMMETRY }
      });
      // Open any previously completed tests
      if (d.asymmetry) {
        const opens = {};
        for (const key of ['sweat', 'carrot', 'tail', 'hoof']) {
          if (d.asymmetry[key]?.completed) opens[key] = true;
        }
        setOpenTests(opens);
      }
    }
    setLoadingData(false);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  }

  function handleAsymmetryChange(testKey, field, value) {
    setFormData(prev => ({
      ...prev,
      asymmetry: {
        ...prev.asymmetry,
        [testKey]: {
          ...prev.asymmetry[testKey],
          [field]: value
        }
      }
    }));
  }

  function handleAsymmetryOverall(value) {
    setFormData(prev => ({
      ...prev,
      asymmetry: { ...prev.asymmetry, overall: value }
    }));
  }

  function handleChipClick(word) {
    setFormData(prev => {
      const current = prev.strengths.trim();
      let updated;
      if (current && !current.endsWith(',')) {
        updated = current + ', ' + word;
      } else if (current.endsWith(',')) {
        updated = current + ' ' + word;
      } else {
        updated = word;
      }
      return { ...prev, strengths: updated };
    });
  }

  function toggleTest(testKey) {
    const isCurrentlyOpen = openTests[testKey];
    setOpenTests(prev => ({ ...prev, [testKey]: !isCurrentlyOpen }));
    handleAsymmetryChange(testKey, 'completed', !isCurrentlyOpen);
  }

  function validateForm() {
    const newErrors = {};
    if (!formData.horseName.trim()) newErrors.horseName = "Horse's name is required";
    if (!formData.important.trim()) newErrors.important = 'Please share what is important about this horse';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

    // Compute backward-compatible age from V2 fields
    let computedAge = null;
    if (formData.birthYear) {
      computedAge = new Date().getFullYear() - parseInt(formData.birthYear, 10);
    } else if (formData.approxAge) {
      computedAge = parseInt(formData.approxAge, 10) || null;
    }

    // Compute backward-compatible partnership string
    let computedPartnership = '';
    if (formData.partnershipMonth && formData.partnershipYear) {
      const now = new Date();
      const start = new Date(parseInt(formData.partnershipYear), parseInt(formData.partnershipMonth) - 1);
      const totalMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
      const years = Math.floor(totalMonths / 12);
      const months = totalMonths % 12;
      const parts = [];
      if (years > 0) parts.push(`${years} year${years !== 1 ? 's' : ''}`);
      if (months > 0) parts.push(`${months} month${months !== 1 ? 's' : ''}`);
      computedPartnership = parts.join(', ') || 'less than a month';
    } else if (formData.partnershipYear) {
      computedPartnership = `since ${formData.partnershipYear}`;
    }

    const data = {
      ...formData,
      age: computedAge,
      partnership: computedPartnership,
    };

    let result;
    if (isEdit) {
      result = await updateHorseProfile(id, data);
    } else {
      result = await createHorseProfile(currentUser.uid, data);
    }

    setLoading(false);

    if (result.success) {
      navigate('/horses');
    } else {
      setErrors({ submit: result.error });
    }
  }

  if (loadingData) {
    return <div className="loading-state">Loading horse profile...</div>;
  }

  return (
    <div className="form-page">
      <div className="form-page-header">
        <h1>{isEdit ? 'Edit Horse Profile' : 'Add Horse Profile'}</h1>
        <p>Most fields are optional - fill in what you know</p>
      </div>

      <form onSubmit={handleSubmit} autoComplete="off">
        <div className="form-card">
          {errors.submit && <div className="form-section"><div className="form-alert form-alert-error">{errors.submit}</div></div>}

          <FormSection title="Basic Information">
            <div className="form-row">
              <FormField label="Your Name" optional>
                <input type="text" name="riderName" value={formData.riderName} onChange={handleChange} disabled={loading} />
              </FormField>
              <FormField label="Horse's Name" error={errors.horseName}>
                <input type="text" name="horseName" value={formData.horseName} onChange={handleChange} disabled={loading} className={errors.horseName ? 'error' : ''} placeholder="e.g., Rocket Star" />
              </FormField>
            </div>

            <FormField label="Birthdate" optional helpText="Birthdate is stored permanently so the AI always knows your horse's exact age during analysis.">
              <div className="form-row">
                <select name="birthMonth" value={formData.birthMonth} onChange={handleChange} disabled={loading}>
                  {MONTH_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <select name="birthYear" value={formData.birthYear} onChange={handleChange} disabled={loading}>
                  {BIRTH_YEAR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </FormField>

            <FormField optional>
              <div style={{ marginBottom: '8px', fontWeight: 400, fontSize: '0.95em', color: '#7A7A7A' }}>
                Don&apos;t know the exact birthdate? Enter an approximate age instead:
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input type="number" name="approxAge" min="1" max="45" value={formData.approxAge} onChange={handleChange} disabled={loading} placeholder="e.g., 12" style={{ maxWidth: '120px' }} />
                <span style={{ color: '#7A7A7A', fontSize: '0.9em' }}>years old</span>
              </div>
            </FormField>

            <div className="form-row">
              <FormField label="Breed" optional>
                <input type="text" name="breed" value={formData.breed} onChange={handleChange} disabled={loading} placeholder="e.g., Warmblood, Thoroughbred" />
              </FormField>
              <FormField label="Sex" optional>
                <select name="sex" value={formData.sex} onChange={handleChange} disabled={loading}>
                  {SEX_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </FormField>
            </div>
          </FormSection>

          <FormSection title="Partnership & Training">
            <FormField label="When did you start working together?" optional helpText="The AI uses this to understand the arc of your partnership over time.">
              <div className="form-row">
                <select name="partnershipMonth" value={formData.partnershipMonth} onChange={handleChange} disabled={loading}>
                  {MONTH_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <select name="partnershipYear" value={formData.partnershipYear} onChange={handleChange} disabled={loading}>
                  {PARTNERSHIP_YEAR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </FormField>
            <div className="form-row">
              <FormField label="Training Level" optional>
                <select name="horseLevel" value={formData.horseLevel} onChange={handleChange} disabled={loading}>
                  {LEVEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </FormField>
              <FormField label="Arrangement" optional>
                <select name="arrangement" value={formData.arrangement} onChange={handleChange} disabled={loading}>
                  {ARRANGEMENT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </FormField>
            </div>
          </FormSection>

          <FormSection title="About This Horse">
            <FormField label="Strengths & Qualities" optional>
              <div className="prompt-chips">
                {STRENGTH_CHIPS.map(chip => (
                  <button key={chip} type="button" className="prompt-chip" onClick={() => handleChipClick(chip)} disabled={loading}>
                    {chip}
                  </button>
                ))}
              </div>
              <textarea name="strengths" value={formData.strengths} onChange={handleChange} disabled={loading} placeholder="What does this horse do well? What are their best qualities?" />
            </FormField>
            <FormField label="Current Soundness Status" optional>
              <select name="soundness" value={formData.soundness} onChange={handleChange} disabled={loading}>
                {SOUNDNESS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </FormField>
            <FormField label="Chronic Conditions or Special Considerations" optional helpText="Helps understand your partnership context">
              <textarea name="conditions" value={formData.conditions} onChange={handleChange} disabled={loading} placeholder="Any ongoing health issues, special care requirements, or important notes" />
            </FormField>
            <FormField label="What is important about this horse?" error={errors.important}>
              <textarea name="important" value={formData.important} onChange={handleChange} disabled={loading} className={`tall ${errors.important ? 'error' : ''}`} placeholder="What makes this partnership meaningful to you? Why is this horse special in your journey?" />
              <div className="field-help">This is the most important question &mdash; share what matters</div>
            </FormField>
          </FormSection>

          <FormSection title={<>Horse Asymmetry Assessment <span className="optional-badge">Optional</span></>}>
            <p className="section-intro">
              Asymmetry is normal in horses&mdash;just as humans are right- or left-handed.
              Knowing your horse&apos;s patterns helps the AI connect training observations
              to physical tendencies. Complete any or all of the four tests below at
              your own pace.
            </p>

            {ASYMMETRY_TESTS.map(test => (
              <div key={test.key} className="test-card">
                <div className="test-toggle" onClick={() => toggleTest(test.key)}>
                  <div className="test-toggle-left">
                    <input
                      type="checkbox"
                      className="test-checkbox"
                      checked={formData.asymmetry[test.key].completed}
                      onChange={(e) => { e.stopPropagation(); toggleTest(test.key); }}
                    />
                    <span className="test-toggle-title">{test.title}</span>
                  </div>
                  <span className={`test-toggle-arrow ${openTests[test.key] ? 'open' : ''}`}>&#9660;</span>
                </div>
                <div className={`test-body ${openTests[test.key] ? 'open' : ''}`}>
                  <div className="test-description">
                    <strong>How to do it:</strong>
                    {test.howTo}
                    <div className="what-it-means">
                      <strong>What you&apos;re looking for:</strong> {test.lookingFor}
                    </div>
                  </div>
                  <span className="test-label">What did you observe?</span>
                  <textarea
                    value={formData.asymmetry[test.key].observation}
                    onChange={(e) => handleAsymmetryChange(test.key, 'observation', e.target.value)}
                    disabled={loading}
                    placeholder={test.obsPlaceholder}
                  />
                  <span className="test-label" style={{ marginTop: '12px' }}>Your interpretation (optional)</span>
                  <textarea
                    value={formData.asymmetry[test.key].interpretation}
                    onChange={(e) => handleAsymmetryChange(test.key, 'interpretation', e.target.value)}
                    disabled={loading}
                    placeholder={test.interpPlaceholder}
                    style={{ minHeight: '70px' }}
                  />
                </div>
              </div>
            ))}

            <div className="form-field" style={{ marginTop: '20px' }}>
              <label>Overall Asymmetry Notes</label>
              <textarea
                value={formData.asymmetry.overall}
                onChange={(e) => handleAsymmetryOverall(e.target.value)}
                disabled={loading}
                placeholder="Any patterns you notice across the tests, or other asymmetry observations from your trainer, vet, or bodyworker?"
              />
              <div className="field-help">e.g., My chiropractor mentioned right SI issues, which aligns with the tail and carrot stretch findings.</div>
            </div>
          </FormSection>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/horses')} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : (isEdit ? 'Update Horse' : 'Add Horse')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
