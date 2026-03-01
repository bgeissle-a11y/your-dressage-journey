import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  createHealthEntry, getHealthEntry, updateHealthEntry,
  ISSUE_TYPES, PROFESSIONAL_TYPES, HEALTH_STATUSES
} from '../../services';
import FormSection from '../Forms/FormSection';
import FormField from '../Forms/FormField';
import VoiceInput from '../Forms/VoiceInput';
import '../Forms/Forms.css';
import './HorseHealth.css';

export default function HealthEntryForm() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const notesRef = useRef(null);
  const resultsRef = useRef(null);
  const nextStepsRef = useRef(null);

  const [formData, setFormData] = useState({
    horseName: '',
    date: new Date().toISOString().split('T')[0],
    issueType: '',
    title: '',
    notes: '',
    professionals: [],
    otherProfessional: '',
    results: '',
    nextSteps: '',
    status: '',
    resolvedDate: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (id) loadExisting();
  }, [id]);

  async function loadExisting() {
    setLoadingData(true);
    const result = await getHealthEntry(id);
    if (result.success) {
      const d = result.data;
      // Check if professionals includes a non-standard value (an "Other" entry)
      const knownValues = PROFESSIONAL_TYPES.map(p => p.value);
      const otherPro = (d.professionals || []).find(p => !knownValues.includes(p));
      const pros = otherPro
        ? [...(d.professionals || []).filter(p => p !== otherPro), 'Other']
        : (d.professionals || []);

      setFormData({
        horseName: d.horseName || '',
        date: d.date || '',
        issueType: d.issueType || '',
        title: d.title || '',
        notes: d.notes || '',
        professionals: pros,
        otherProfessional: otherPro || '',
        results: d.results || '',
        nextSteps: d.nextSteps || '',
        status: d.status || '',
        resolvedDate: d.resolvedDate || ''
      });
    }
    setLoadingData(false);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'status' && value !== 'resolved') {
        updated.resolvedDate = '';
      }
      return updated;
    });
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  }

  function toggleIssueType(type) {
    setFormData(prev => ({ ...prev, issueType: prev.issueType === type ? '' : type }));
    if (errors.issueType) setErrors(prev => ({ ...prev, issueType: '' }));
  }

  function toggleProfessional(value) {
    setFormData(prev => {
      const has = prev.professionals.includes(value);
      const updated = has
        ? prev.professionals.filter(p => p !== value)
        : [...prev.professionals, value];
      return { ...prev, professionals: updated };
    });
  }

  function toggleStatus(status) {
    setFormData(prev => ({
      ...prev,
      status: prev.status === status ? '' : status,
      resolvedDate: status !== 'resolved' ? '' : prev.resolvedDate
    }));
    if (errors.status) setErrors(prev => ({ ...prev, status: '' }));
  }

  function validateForm() {
    const newErrors = {};
    if (!formData.horseName.trim()) newErrors.horseName = 'Horse name is required';
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.title.trim()) newErrors.title = 'Please describe the issue';
    if (!formData.issueType) newErrors.issueType = 'Please select an issue type';
    if (!formData.status) newErrors.status = 'Please set the status';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

    // Build professionals array, replacing "Other" with actual text
    const professionals = formData.professionals.map(p => {
      if (p === 'Other' && formData.otherProfessional.trim()) {
        return formData.otherProfessional.trim();
      }
      return p;
    }).filter(p => p !== 'Other');

    const data = {
      horseName: formData.horseName.trim(),
      date: formData.date,
      issueType: formData.issueType,
      title: formData.title.trim(),
      notes: formData.notes.trim(),
      professionals,
      results: formData.results.trim(),
      nextSteps: formData.nextSteps.trim(),
      status: formData.status,
      resolvedDate: formData.status === 'resolved' ? formData.resolvedDate || null : null
    };

    let result;
    if (isEdit) {
      result = await updateHealthEntry(id, data);
    } else {
      result = await createHealthEntry(currentUser.uid, data);
    }

    setLoading(false);

    if (result.success) {
      navigate('/horse-health');
    } else {
      setErrors({ submit: result.error });
    }
  }

  if (loadingData) {
    return <div className="loading-state">Loading entry...</div>;
  }

  return (
    <div className="form-page">
      <div className="form-page-header">
        <h1>{isEdit ? 'Edit Health Entry' : 'Health & Soundness Entry'}</h1>
        <p>Track your horse's wellbeing — from routine maintenance to unexpected concerns</p>
      </div>

      <form onSubmit={handleSubmit} autoComplete="off">
        <div className="form-card">
          {errors.submit && (
            <div className="form-section">
              <div className="form-alert form-alert-error">{errors.submit}</div>
            </div>
          )}

          {/* Who & When */}
          <FormSection title="Who & When">
            <div className="form-row">
              <FormField label="Horse Name" error={errors.horseName}>
                <input
                  type="text"
                  name="horseName"
                  value={formData.horseName}
                  onChange={handleChange}
                  disabled={loading}
                  className={errors.horseName ? 'error' : ''}
                  placeholder="e.g. Ravel, Weltino, Beau"
                />
              </FormField>
              <FormField label="Date of visit or observation" error={errors.date}>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  disabled={loading}
                  className={errors.date ? 'error' : ''}
                />
              </FormField>
            </div>
          </FormSection>

          {/* Issue Type */}
          <FormSection title="Type of Issue">
            <div className="health-issue-grid">
              {ISSUE_TYPES.map(type => (
                <button
                  key={type.value}
                  type="button"
                  className={`health-issue-btn health-issue-${type.value} ${formData.issueType === type.value ? 'selected' : ''}`}
                  onClick={() => toggleIssueType(type.value)}
                  disabled={loading}
                >
                  <span className="health-issue-icon">{type.icon}</span>
                  <span className="health-issue-name">{type.label}</span>
                  <span className="health-issue-desc">{type.description}</span>
                </button>
              ))}
            </div>
            {errors.issueType && <div className="field-error" style={{ marginTop: '0.5rem' }}>{errors.issueType}</div>}
          </FormSection>

          {/* What's Going On */}
          <FormSection title="What's Going On">
            <FormField label="Issue / Condition" error={errors.title} helpText="Short description">
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                disabled={loading}
                className={errors.title ? 'error' : ''}
                placeholder="e.g. Right hind stiffness, Chiropractic adjustment, Colic episode"
              />
            </FormField>
            <FormField label="Details" optional helpText="What you observed or what prompted this">
              <textarea
                ref={notesRef}
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                disabled={loading}
                placeholder="Describe what you noticed, what changed, or what you wanted to address..."
              />
              <VoiceInput textareaRef={notesRef} onTranscript={text => {
                setFormData(prev => ({ ...prev, notes: text }));
              }} />
            </FormField>
          </FormSection>

          {/* Professionals */}
          <FormSection title="Seen By / Professional Involved">
            <div className="health-pro-grid">
              {PROFESSIONAL_TYPES.map(pro => (
                <button
                  key={pro.value}
                  type="button"
                  className={`health-pro-chip ${formData.professionals.includes(pro.value) ? 'selected' : ''}`}
                  onClick={() => toggleProfessional(pro.value)}
                  disabled={loading}
                >
                  {pro.label}
                </button>
              ))}
            </div>
            {formData.professionals.includes('Other') && (
              <div style={{ marginTop: '0.75rem' }}>
                <input
                  type="text"
                  name="otherProfessional"
                  value={formData.otherProfessional}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="Who else was involved?"
                />
              </div>
            )}
          </FormSection>

          {/* Results & Next Steps */}
          <FormSection title="Findings & Follow-Through">
            <FormField label="Results / What Happened" optional>
              <textarea
                ref={resultsRef}
                name="results"
                value={formData.results}
                onChange={handleChange}
                disabled={loading}
                placeholder="What did the professional find? What treatment or work was done?"
              />
              <VoiceInput textareaRef={resultsRef} onTranscript={text => {
                setFormData(prev => ({ ...prev, results: text }));
              }} />
            </FormField>
            <FormField label="Next Steps" optional>
              <textarea
                ref={nextStepsRef}
                name="nextSteps"
                value={formData.nextSteps}
                onChange={handleChange}
                disabled={loading}
                placeholder="Follow-up appointments, exercises, restrictions, things to watch for..."
                style={{ minHeight: '80px' }}
              />
              <VoiceInput textareaRef={nextStepsRef} onTranscript={text => {
                setFormData(prev => ({ ...prev, nextSteps: text }));
              }} />
            </FormField>
          </FormSection>

          {/* Status */}
          <FormSection title="Status">
            <FormField label="Is this issue ongoing or resolved?" error={errors.status}>
              <div className="health-status-toggle">
                {HEALTH_STATUSES.map(s => (
                  <button
                    key={s.value}
                    type="button"
                    className={`health-status-btn health-status-${s.value} ${formData.status === s.value ? 'selected' : ''}`}
                    onClick={() => toggleStatus(s.value)}
                    disabled={loading}
                  >
                    {s.value === 'ongoing' ? '\uD83D\uDD04' : '\u2705'} {s.label}
                  </button>
                ))}
              </div>
            </FormField>
            {formData.status === 'resolved' && (
              <FormField label="Date resolved" optional>
                <input
                  type="date"
                  name="resolvedDate"
                  value={formData.resolvedDate}
                  onChange={handleChange}
                  disabled={loading}
                />
              </FormField>
            )}
          </FormSection>

          {/* Actions */}
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/horse-health')} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : (isEdit ? 'Update Entry' : 'Save Entry')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
