import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  createRiderHealthEntry, getRiderHealthEntry, updateRiderHealthEntry,
  RIDER_ISSUE_TYPES, RIDER_IMPACT_LEVELS, RIDER_HEALTH_STATUSES,
  RIDER_BODY_AREAS, RIDER_PROFESSIONAL_TYPES
} from '../../services';
import FormSection from '../Forms/FormSection';
import FormField from '../Forms/FormField';
import VoiceInput from '../Forms/VoiceInput';
import '../Forms/Forms.css';
import '../HorseHealth/HorseHealth.css';
import './RiderHealth.css';

export default function HealthLogForm() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const notesRef = useRef(null);
  const inSaddleRef = useRef(null);
  const workingOnRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    issueType: '',
    notes: '',
    bodyAreas: [],
    professionals: [],
    inSaddleNotes: '',
    workingOnNotes: '',
    impact: '',
    status: 'ongoing',
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
    const result = await getRiderHealthEntry(id);
    if (result.success) {
      const d = result.data;
      setFormData({
        title: d.title || '',
        date: d.date || '',
        issueType: d.issueType || '',
        notes: d.notes || '',
        bodyAreas: d.bodyAreas || [],
        professionals: d.professionals || [],
        inSaddleNotes: d.inSaddleNotes || '',
        workingOnNotes: d.workingOnNotes || '',
        impact: d.impact || '',
        status: d.status || 'ongoing',
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

  function toggleImpact(impact) {
    setFormData(prev => ({ ...prev, impact: prev.impact === impact ? '' : impact }));
    if (errors.impact) setErrors(prev => ({ ...prev, impact: '' }));
  }

  function toggleStatus(status) {
    setFormData(prev => ({
      ...prev,
      status,
      resolvedDate: status === 'resolved' ? (prev.resolvedDate || new Date().toISOString().split('T')[0]) : ''
    }));
  }

  function toggleArrayMember(field, value) {
    setFormData(prev => {
      const has = prev[field].includes(value);
      return {
        ...prev,
        [field]: has ? prev[field].filter(v => v !== value) : [...prev[field], value]
      };
    });
  }

  function validateForm() {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'A short title is required';
    if (!formData.issueType) newErrors.issueType = 'Please select a type';
    if (!formData.impact) newErrors.impact = 'Please select an impact level';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    const data = {
      title: formData.title.trim(),
      date: formData.date,
      issueType: formData.issueType,
      notes: formData.notes.trim(),
      bodyAreas: formData.bodyAreas,
      professionals: formData.professionals,
      inSaddleNotes: formData.inSaddleNotes.trim(),
      workingOnNotes: formData.workingOnNotes.trim(),
      impact: formData.impact,
      status: formData.status,
      resolvedDate: formData.status === 'resolved' ? (formData.resolvedDate || null) : null
    };

    const result = isEdit
      ? await updateRiderHealthEntry(id, data)
      : await createRiderHealthEntry(currentUser.uid, data);

    setLoading(false);

    if (result.success) {
      navigate('/rider-health');
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
        <h1>{isEdit ? 'Edit Rider Health Entry' : 'Rider Health & Wellness Log'}</h1>
        <p>A training journal for how your body is showing up in the saddle.</p>
      </div>

      <div className="rider-health-scope-note">
        <strong>This is a training journal, not a medical record.</strong>{' '}
        Log what helps you and your coach understand your riding — not clinical
        detail that belongs in your doctor&apos;s chart. Only log something here
        if it&apos;s <strong>currently affecting your riding</strong>. Baseline
        asymmetries live in your Physical Self-Assessment. Exercises and things
        you&apos;re trying live in your Rider&apos;s Toolkit.
      </div>
      <div className="rider-health-scope-note accent">
        <strong>What not to log:</strong> Please keep entries functional and
        riding-focused. Do not enter specific medication names or dosages,
        verbatim diagnoses or medical codes, mental health treatment details,
        or anything you&apos;d want your doctor&apos;s office to keep private.{' '}
        <em>&ldquo;Right hip tight and limiting my seat&rdquo;</em> is useful.{' '}
        <em>Clinical diagnoses with specific codes or test results</em> belong
        in your medical chart, not here.
      </div>

      <form onSubmit={handleSubmit} autoComplete="off">
        <div className="form-card">
          {errors.submit && (
            <div className="form-section">
              <div className="form-alert form-alert-error">{errors.submit}</div>
            </div>
          )}

          <FormSection title="Date & Type">
            <div className="form-row">
              <FormField label="Date">
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  disabled={loading}
                />
              </FormField>
              <FormField label="Type" error={errors.issueType}>
                <div className="health-issue-grid">
                  {RIDER_ISSUE_TYPES.map(type => (
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
              </FormField>
            </div>
          </FormSection>

          <FormSection title="Title & Notes">
            <FormField label="Short title" error={errors.title} helpText='E.g. "Right SI flare," "PT check-in," "Fall at show"'>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                disabled={loading}
                className={errors.title ? 'error' : ''}
                placeholder="Title..."
              />
            </FormField>
            <FormField label="What's going on" optional>
              <div className="rider-health-prompt">
                Describe it in your own words — what you&apos;re feeling, when
                it shows up, what you&apos;ve noticed.
              </div>
              <textarea
                ref={notesRef}
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                disabled={loading}
                placeholder="What you're noticing..."
              />
              <VoiceInput textareaRef={notesRef} onTranscript={text => {
                setFormData(prev => ({ ...prev, notes: text }));
              }} />
            </FormField>
          </FormSection>

          <FormSection title="Body areas involved" description="Optional — select all that apply.">
            <div className="rider-body-area-grid">
              {RIDER_BODY_AREAS.map(area => (
                <button
                  key={area}
                  type="button"
                  className={`health-pro-chip ${formData.bodyAreas.includes(area) ? 'selected' : ''}`}
                  onClick={() => toggleArrayMember('bodyAreas', area)}
                  disabled={loading}
                >
                  {area}
                </button>
              ))}
            </div>
          </FormSection>

          <FormSection title="Professionals seen" description="Optional — select all that apply.">
            <div className="health-pro-grid">
              {RIDER_PROFESSIONAL_TYPES.map(pro => (
                <button
                  key={pro}
                  type="button"
                  className={`health-pro-chip ${formData.professionals.includes(pro) ? 'selected' : ''}`}
                  onClick={() => toggleArrayMember('professionals', pro)}
                  disabled={loading}
                >
                  {pro}
                </button>
              ))}
            </div>
          </FormSection>

          <FormSection title="What you're noticing in the saddle" description="Optional.">
            <div className="rider-health-prompt">
              How this is showing up in your riding — what&apos;s harder,
              what&apos;s shifted, what your body is telling you when you ride.
            </div>
            <FormField>
              <textarea
                ref={inSaddleRef}
                name="inSaddleNotes"
                value={formData.inSaddleNotes}
                onChange={handleChange}
                disabled={loading}
                placeholder="How it's affecting your riding..."
              />
              <VoiceInput textareaRef={inSaddleRef} onTranscript={text => {
                setFormData(prev => ({ ...prev, inSaddleNotes: text }));
              }} />
            </FormField>
          </FormSection>

          <FormSection title="What you're working on" description="Optional.">
            <div className="rider-health-prompt">
              Exercises you&apos;re doing, activity adjustments, what
              you&apos;re giving attention to. Keep it general — specific
              treatment plans belong in your medical chart.
            </div>
            <FormField>
              <textarea
                ref={workingOnRef}
                name="workingOnNotes"
                value={formData.workingOnNotes}
                onChange={handleChange}
                disabled={loading}
                placeholder="What you're working on..."
              />
              <VoiceInput textareaRef={workingOnRef} onTranscript={text => {
                setFormData(prev => ({ ...prev, workingOnNotes: text }));
              }} />
            </FormField>
          </FormSection>

          <FormSection title="Impact on riding">
            <div className="rider-health-prompt">
              Only log entries that are affecting your riding. If it&apos;s not
              impacting your ride, you don&apos;t need to track it here.
            </div>
            <FormField error={errors.impact}>
              <div className="rider-impact-group">
                {RIDER_IMPACT_LEVELS.map(level => (
                  <button
                    key={level.value}
                    type="button"
                    className={`rider-impact-chip ${formData.impact === level.value ? 'selected' : ''}`}
                    onClick={() => toggleImpact(level.value)}
                    disabled={loading}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </FormField>
          </FormSection>

          <FormSection title="Status">
            <FormField label="Is this ongoing or resolved?">
              <div className="health-status-toggle">
                {RIDER_HEALTH_STATUSES.map(s => (
                  <button
                    key={s.value}
                    type="button"
                    className={`health-status-btn health-status-${s.value} ${formData.status === s.value ? 'selected' : ''}`}
                    onClick={() => toggleStatus(s.value)}
                    disabled={loading}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </FormField>
            {formData.status === 'resolved' && (
              <FormField label="Resolved on" optional>
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

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/rider-health')}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Saving...' : (isEdit ? 'Update Entry' : 'Save Entry')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
