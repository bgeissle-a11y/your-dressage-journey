import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { createHorseProfile, getHorseProfile, updateHorseProfile } from '../../services';
import FormSection from '../Forms/FormSection';
import FormField from '../Forms/FormField';
import useDisableAutofill from '../../hooks/useDisableAutofill';
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
  { value: 'training-not-showing', label: 'Training (Not Showing)' }
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

export default function HorseProfileForm() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const formRef = useRef(null);
  useDisableAutofill(formRef);

  const [formData, setFormData] = useState({
    riderName: '',
    horseName: '',
    age: '',
    breed: '',
    sex: '',
    partnership: '',
    horseLevel: '',
    arrangement: '',
    strengths: '',
    soundness: '',
    conditions: '',
    important: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

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
      setFormData({
        riderName: result.data.riderName || '',
        horseName: result.data.horseName || '',
        age: result.data.age || '',
        breed: result.data.breed || '',
        sex: result.data.sex || '',
        partnership: result.data.partnership || '',
        horseLevel: result.data.horseLevel || '',
        arrangement: result.data.arrangement || '',
        strengths: result.data.strengths || '',
        soundness: result.data.soundness || '',
        conditions: result.data.conditions || '',
        important: result.data.important || ''
      });
    }
    setLoadingData(false);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
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
    const data = {
      ...formData,
      age: formData.age ? parseInt(formData.age, 10) : null
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

      <form ref={formRef} onSubmit={handleSubmit} autoComplete="off">
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
            <div className="form-row">
              <FormField label="Age" optional>
                <input type="number" name="age" min="1" max="40" value={formData.age} onChange={handleChange} disabled={loading} placeholder="Years" />
              </FormField>
              <FormField label="Breed" optional>
                <input type="text" name="breed" value={formData.breed} onChange={handleChange} disabled={loading} />
              </FormField>
              <FormField label="Sex" optional>
                <select name="sex" value={formData.sex} onChange={handleChange} disabled={loading}>
                  {SEX_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </FormField>
            </div>
          </FormSection>

          <FormSection title="Partnership & Training">
            <div className="form-row">
              <FormField label="How long have you worked together?" optional>
                <input type="text" name="partnership" value={formData.partnership} onChange={handleChange} disabled={loading} placeholder="e.g., 2 years" />
              </FormField>
              <FormField label="Training Level" optional>
                <select name="horseLevel" value={formData.horseLevel} onChange={handleChange} disabled={loading}>
                  {LEVEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </FormField>
            </div>
            <FormField label="Arrangement" optional>
              <select name="arrangement" value={formData.arrangement} onChange={handleChange} disabled={loading}>
                {ARRANGEMENT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </FormField>
          </FormSection>

          <FormSection title="About This Horse" description="Help us understand your horse">
            <FormField label="Strengths & Qualities" optional>
              <textarea name="strengths" value={formData.strengths} onChange={handleChange} disabled={loading} placeholder="What are this horse's best qualities?" />
            </FormField>
            <FormField label="Current Soundness Status" optional>
              <select name="soundness" value={formData.soundness} onChange={handleChange} disabled={loading}>
                {SOUNDNESS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </FormField>
            <FormField label="Chronic Conditions" optional>
              <textarea name="conditions" value={formData.conditions} onChange={handleChange} disabled={loading} placeholder="Any ongoing health considerations?" />
            </FormField>
            <FormField label="What is important about this horse?" error={errors.important}>
              <textarea name="important" value={formData.important} onChange={handleChange} disabled={loading} className={`tall ${errors.important ? 'error' : ''}`} placeholder="What makes this horse special to you? What should we know?" />
            </FormField>
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
