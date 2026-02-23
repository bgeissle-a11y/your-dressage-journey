import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { createRiderProfile, getRiderProfile, updateRiderProfile } from '../../services';
import FormSection from '../Forms/FormSection';
import FormField from '../Forms/FormField';
import CheckboxGroup from '../Forms/CheckboxGroup';
import '../Forms/Forms.css';

const LEVEL_OPTIONS = [
  { value: 'beginning', label: 'Just beginning' },
  { value: 'while', label: "I've been at this a while" },
  { value: 'block', label: 'Seemingly forever' }
];

const FREQUENCY_OPTIONS = [
  { value: '1-2', label: '1-2 times per week' },
  { value: '3-4', label: '3-4 times per week' },
  { value: '5-6', label: '5-6 times per week' },
  { value: '7+', label: 'Daily (7+ times per week)' }
];

const COACH_OPTIONS = [
  { value: 'weekly', label: 'Weekly or more' },
  { value: 'biweekly', label: 'Bi-weekly or monthly' },
  { value: 'occasional', label: 'Occasional lessons' },
  { value: 'independent', label: 'Independent (no regular lessons)' }
];

const TRAINING_TIME_OPTIONS = [
  { value: '1-3', label: '1\u20133 hours' },
  { value: '4-6', label: '4\u20136 hours' },
  { value: '7-10', label: '7\u201310 hours' },
  { value: '11-15', label: '11\u201315 hours' },
  { value: '16+', label: '16+ hours' }
];

const COMP_LEVEL_OPTIONS = [
  { value: 'none', label: "I haven't competed yet" },
  { value: 'intro', label: 'Introductory Level' },
  { value: 'training', label: 'Training Level' },
  { value: 'first', label: 'First Level' },
  { value: 'second', label: 'Second Level' },
  { value: 'third', label: 'Third Level' },
  { value: 'fourth', label: 'Fourth Level' },
  { value: 'prix-st-georges', label: 'Prix St. Georges' },
  { value: 'intermediaire-1', label: 'Intermediaire I' },
  { value: 'intermediaire-2', label: 'Intermediaire II' },
  { value: 'grand-prix', label: 'Grand Prix' }
];

const OWNERSHIP_OPTIONS = [
  { value: 'own', label: 'I own my horse(s)' },
  { value: 'lease', label: 'I lease a horse' },
  { value: 'schoolHorse', label: 'I ride school/lesson horses' },
  { value: 'training', label: 'I ride horses professionally' }
];

const LEARNING_STYLE_OPTIONS = [
  { value: 'visual', label: 'Visual (diagrams, images, videos)' },
  { value: 'verbal', label: 'Verbal (listening, discussion, audio)' },
  { value: 'kinesthetic', label: 'Kinesthetic (feel it in my body, physical practice)' },
  { value: 'reading', label: 'Reading/Writing (articles, notes, written explanations)' }
];

export default function RiderProfileForm() {
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    level: '',
    frequency: '',
    coach: '',
    trainingTime: '',
    compLevel: '',
    recentScores: '',
    ownership: [],
    numHorses: 1,
    whyRide: '',
    enjoyMost: '',
    longTermGoals: '',
    learningStyle: [],
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [message, setMessage] = useState('');
  const [existingId, setExistingId] = useState(null);

  useEffect(() => {
    loadExisting();
  }, [currentUser]);

  async function loadExisting() {
    if (!currentUser) return;
    setLoadingProfile(true);
    const result = await getRiderProfile(currentUser.uid);
    if (result.success) {
      setExistingId(result.data.id);
      setFormData({
        fullName: result.data.fullName || currentUser.displayName || '',
        email: result.data.email || currentUser.email || '',
        level: result.data.level || '',
        frequency: result.data.frequency || '',
        coach: result.data.coach || '',
        trainingTime: result.data.trainingTime || '',
        compLevel: result.data.compLevel || '',
        recentScores: result.data.recentScores || '',
        ownership: result.data.ownership || [],
        numHorses: result.data.numHorses || 1,
        whyRide: result.data.whyRide || '',
        enjoyMost: result.data.enjoyMost || '',
        longTermGoals: result.data.longTermGoals || '',
        learningStyle: result.data.learningStyle || [],
      });
    } else {
      setFormData(prev => ({
        ...prev,
        fullName: currentUser.displayName || '',
        email: currentUser.email || ''
      }));
    }
    setLoadingProfile(false);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  }

  function handleNumberChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: parseInt(value, 10) || 1 }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  }

  function validateForm() {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.level) newErrors.level = 'Please select your experience level';
    if (!formData.frequency) newErrors.frequency = 'Please select riding frequency';
    if (!formData.coach) newErrors.coach = 'Please select lesson frequency';
    if (!formData.trainingTime) newErrors.trainingTime = 'Please select available training time';
    if (!formData.compLevel) newErrors.compLevel = 'Please select competition history';
    if (formData.ownership.length === 0) newErrors.ownership = 'Please select at least one';
    if (!formData.numHorses || formData.numHorses < 1) newErrors.numHorses = 'Please enter number of horses';
    if (!formData.whyRide.trim()) newErrors.whyRide = 'Please share why you ride';
    if (!formData.longTermGoals.trim()) newErrors.longTermGoals = 'Please share your long-term goals';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setMessage('');

    let result;
    if (existingId) {
      result = await updateRiderProfile(existingId, formData);
    } else {
      result = await createRiderProfile(currentUser.uid, formData);
    }

    setLoading(false);

    if (result.success) {
      setMessage(existingId ? 'Profile updated successfully!' : 'Profile created successfully!');
      if (!existingId && result.id) setExistingId(result.id);
    } else {
      setErrors({ submit: result.error });
    }
  }

  if (loadingProfile) {
    return <div className="loading-state">Loading profile...</div>;
  }

  return (
    <div className="form-page">
      <div className="form-page-header">
        <h1>{existingId ? 'Edit Rider Profile' : 'Create Rider Profile'}</h1>
        <p>Tell us about your riding journey</p>
      </div>

      <form onSubmit={handleSubmit} autoComplete="off">
        <div className="form-card">
          {message && <div className="form-section"><div className="form-alert form-alert-success">{message}</div></div>}
          {errors.submit && <div className="form-section"><div className="form-alert form-alert-error">{errors.submit}</div></div>}

          <FormSection title="Contact Information" description="How can we reach you?">
            <FormField label="Full Name" error={errors.fullName}>
              <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} disabled={loading} className={errors.fullName ? 'error' : ''} />
            </FormField>
            <FormField label="Email Address" error={errors.email}>
              <input type="email" name="email" value={formData.email} onChange={handleChange} disabled={loading} className={errors.email ? 'error' : ''} />
            </FormField>
          </FormSection>

          <FormSection title="Experience & Training" description="Your riding background">
            <FormField label="My experience level" error={errors.level}>
              <select name="level" value={formData.level} onChange={handleChange} disabled={loading} className={errors.level ? 'error' : ''}>
                <option value="">Select...</option>
                {LEVEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </FormField>
            <FormField label="Riding Frequency" error={errors.frequency}>
              <select name="frequency" value={formData.frequency} onChange={handleChange} disabled={loading} className={errors.frequency ? 'error' : ''}>
                <option value="">Select...</option>
                {FREQUENCY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </FormField>
            <FormField label="Lesson Frequency" error={errors.coach}>
              <select name="coach" value={formData.coach} onChange={handleChange} disabled={loading} className={errors.coach ? 'error' : ''}>
                <option value="">Select...</option>
                {COACH_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </FormField>
            <FormField label="Available Training Time Per Week" error={errors.trainingTime} helpText="Total time for riding, groundwork, and training activities">
              <select name="trainingTime" value={formData.trainingTime} onChange={handleChange} disabled={loading} className={errors.trainingTime ? 'error' : ''}>
                <option value="">Select...</option>
                {TRAINING_TIME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </FormField>
            <FormField label="Competition History" error={errors.compLevel}>
              <select name="compLevel" value={formData.compLevel} onChange={handleChange} disabled={loading} className={errors.compLevel ? 'error' : ''}>
                <option value="">Select highest level shown...</option>
                {COMP_LEVEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </FormField>
            <FormField label="Most Recent Competition Scores" optional helpText="Share any recent test scores you remember - approximate is fine!">
              <textarea name="recentScores" value={formData.recentScores} onChange={handleChange} disabled={loading} placeholder="e.g., Training Level Test 2: 65.5% (June 2025), First Level Test 1: 62.3% (Sept 2025)" />
            </FormField>
          </FormSection>

          <FormSection title="Your Situation">
            <FormField label="Horse Ownership" error={errors.ownership} helpText="Check all that apply">
              <CheckboxGroup
                name="ownership"
                options={OWNERSHIP_OPTIONS}
                values={formData.ownership}
                onChange={v => {
                  setFormData(prev => ({ ...prev, ownership: v }));
                  if (errors.ownership) setErrors(prev => ({ ...prev, ownership: '' }));
                }}
                disabled={loading}
              />
            </FormField>
            <FormField label="Number of Horses You Ride" error={errors.numHorses}>
              <input type="number" name="numHorses" min="1" max="20" value={formData.numHorses} onChange={handleNumberChange} disabled={loading} className={errors.numHorses ? 'error' : ''} style={{ maxWidth: '120px' }} />
            </FormField>
          </FormSection>

          <FormSection title="Your Journey" description="Tell us about your relationship with riding">
            <FormField label="Why do you ride?" error={errors.whyRide}>
              <textarea name="whyRide" value={formData.whyRide} onChange={handleChange} disabled={loading} className={errors.whyRide ? 'error' : ''} placeholder="Share what draws you to dressage..." />
            </FormField>
            <FormField label="What do you enjoy most about dressage?" optional helpText="Optional, but helps us understand your journey">
              <textarea name="enjoyMost" value={formData.enjoyMost} onChange={handleChange} disabled={loading} placeholder="What aspects of dressage bring you the most joy?" />
            </FormField>
            <FormField label="Long-term Dressage Goals" error={errors.longTermGoals} helpText="Where do you want your dressage journey to take you? Think 1-5 years out.">
              <textarea name="longTermGoals" value={formData.longTermGoals} onChange={handleChange} disabled={loading} className={errors.longTermGoals ? 'error' : ''} placeholder="e.g., Compete at Second Level by 2027, improve connection and throughness, earn my USDF Bronze Medal..." />
            </FormField>
            <FormField label="How Do You Learn Best?" optional helpText="Select all that apply - this helps us tailor how coaching insights are delivered to you">
              <CheckboxGroup
                name="learningStyle"
                options={LEARNING_STYLE_OPTIONS}
                values={formData.learningStyle}
                onChange={v => {
                  setFormData(prev => ({ ...prev, learningStyle: v }));
                }}
                disabled={loading}
              />
            </FormField>
          </FormSection>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : (existingId ? 'Update Profile' : 'Create Profile')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
