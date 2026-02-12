import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { createRiderProfile, getRiderProfile, updateRiderProfile } from '../../services';
import FormSection from '../Forms/FormSection';
import FormField from '../Forms/FormField';
import RadioGroup from '../Forms/RadioGroup';
import CheckboxGroup from '../Forms/CheckboxGroup';
import useDisableAutofill from '../../hooks/useDisableAutofill';
import '../Forms/Forms.css';

const LEVEL_OPTIONS = [
  { value: 'beginning', label: 'Just beginning' },
  { value: 'while', label: "I've been at this a while" },
  { value: 'block', label: "I've been around the block a time or two" }
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

const OWNERSHIP_OPTIONS = [
  { value: 'own', label: 'I own my horse(s)' },
  { value: 'lease', label: 'I lease a horse' },
  { value: 'schoolHorse', label: 'I ride school/lesson horses' },
  { value: 'training', label: 'I ride horses professionally' }
];

const DEVICE_OPTIONS = [
  { value: 'mobile', label: 'Mobile phone' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'desktop', label: 'Desktop/Laptop' }
];

const MOBILE_OPTIONS = [
  { value: 'apple', label: 'Apple' },
  { value: 'android', label: 'Android' },
  { value: 'both', label: 'Both' },
  { value: 'neither', label: 'Neither' }
];

export default function RiderProfileForm() {
  const { currentUser } = useAuth();
  const formRef = useRef(null);
  useDisableAutofill(formRef);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    level: '',
    frequency: '',
    coach: '',
    ownership: [],
    numHorses: 1,
    whyRide: '',
    enjoyMost: '',
    devices: [],
    mobileType: '',
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
        phone: result.data.phone || '',
        level: result.data.level || '',
        frequency: result.data.frequency || '',
        coach: result.data.coach || '',
        ownership: result.data.ownership || [],
        numHorses: result.data.numHorses || 1,
        whyRide: result.data.whyRide || '',
        enjoyMost: result.data.enjoyMost || '',
        devices: result.data.devices || [],
        mobileType: result.data.mobileType || '',
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
  }

  function validateForm() {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.level) newErrors.level = 'Please select your experience level';
    if (!formData.frequency) newErrors.frequency = 'Please select riding frequency';
    if (!formData.coach) newErrors.coach = 'Please select lesson frequency';
    if (formData.ownership.length === 0) newErrors.ownership = 'Please select at least one';
    if (!formData.whyRide.trim()) newErrors.whyRide = 'Please share why you ride';
    if (formData.devices.length === 0) newErrors.devices = 'Please select at least one device';
    if (!formData.mobileType) newErrors.mobileType = 'Please select your mobile type';
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

      <form ref={formRef} onSubmit={handleSubmit} autoComplete="off">
        <div className="form-card">
          {message && <div className="form-section"><div className="form-alert form-alert-success">{message}</div></div>}
          {errors.submit && <div className="form-section"><div className="form-alert form-alert-error">{errors.submit}</div></div>}

          <FormSection title="Contact Information" description="How can we reach you?">
            <FormField label="Full Name" error={errors.fullName}>
              <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} disabled={loading} className={errors.fullName ? 'error' : ''} />
            </FormField>
            <div className="form-row">
              <FormField label="Email Address" error={errors.email}>
                <input type="email" name="email" value={formData.email} onChange={handleChange} disabled={loading} className={errors.email ? 'error' : ''} />
              </FormField>
              <FormField label="Phone Number" optional>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} disabled={loading} />
              </FormField>
            </div>
          </FormSection>

          <FormSection title="Experience & Training" description="Your riding background">
            <FormField label="My experience level" error={errors.level}>
              <RadioGroup name="level" options={LEVEL_OPTIONS} value={formData.level} onChange={handleChange} disabled={loading} />
            </FormField>
            <FormField label="Riding Frequency" error={errors.frequency}>
              <RadioGroup name="frequency" options={FREQUENCY_OPTIONS} value={formData.frequency} onChange={handleChange} disabled={loading} />
            </FormField>
            <FormField label="Lesson Frequency" error={errors.coach}>
              <RadioGroup name="coach" options={COACH_OPTIONS} value={formData.coach} onChange={handleChange} disabled={loading} />
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
            <FormField label="Number of Horses You Ride">
              <input type="number" name="numHorses" min="1" max="20" value={formData.numHorses} onChange={handleNumberChange} disabled={loading} style={{ maxWidth: '120px' }} />
            </FormField>
          </FormSection>

          <FormSection title="Your Journey" description="Tell us about your relationship with riding">
            <FormField label="Why do you ride?" error={errors.whyRide}>
              <textarea name="whyRide" value={formData.whyRide} onChange={handleChange} disabled={loading} className={errors.whyRide ? 'error' : ''} placeholder="Share what draws you to dressage..." />
            </FormField>
            <FormField label="What do you enjoy most about dressage?" optional helpText="Optional, but helps us understand your journey">
              <textarea name="enjoyMost" value={formData.enjoyMost} onChange={handleChange} disabled={loading} placeholder="What aspects of dressage bring you the most joy?" />
            </FormField>
          </FormSection>

          <FormSection title="Technology & Commitment" description="Help us optimize your experience">
            <FormField label="Devices You Use" error={errors.devices} helpText="Check all that apply">
              <CheckboxGroup
                name="devices"
                options={DEVICE_OPTIONS}
                values={formData.devices}
                onChange={v => {
                  setFormData(prev => ({ ...prev, devices: v }));
                  if (errors.devices) setErrors(prev => ({ ...prev, devices: '' }));
                }}
                disabled={loading}
              />
            </FormField>
            <FormField label="Mobile Device Type" error={errors.mobileType}>
              <RadioGroup name="mobileType" options={MOBILE_OPTIONS} value={formData.mobileType} onChange={handleChange} disabled={loading} />
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
