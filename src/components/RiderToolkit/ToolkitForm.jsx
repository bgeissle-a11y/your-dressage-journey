import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  createToolkitEntry, getToolkitEntry, updateToolkitEntry,
  TOOLKIT_CATEGORIES, TOOLKIT_STATUSES, BODY_TAGS
} from '../../services';
import FormSection from '../Forms/FormSection';
import FormField from '../Forms/FormField';
import VoiceInput from '../Forms/VoiceInput';
import '../Forms/Forms.css';
import './Toolkit.css';

export default function ToolkitForm() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const descRef = useRef(null);
  const connectionRef = useRef(null);
  const followupRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    ridingConnection: '',
    bodyTags: [],
    status: 'want-to-try',
    source: '',
    followupNotes: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (id) loadExisting();
  }, [id]);

  async function loadExisting() {
    setLoadingData(true);
    const result = await getToolkitEntry(id);
    if (result.success) {
      const d = result.data;
      setFormData({
        name: d.name || '',
        category: d.category || '',
        date: d.date || '',
        description: d.description || '',
        ridingConnection: d.ridingConnection || '',
        bodyTags: d.bodyTags || [],
        status: d.status || 'want-to-try',
        source: d.source || '',
        followupNotes: d.followupNotes || ''
      });
    }
    setLoadingData(false);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  }

  function selectCategory(cat) {
    setFormData(prev => ({ ...prev, category: prev.category === cat ? '' : cat }));
    if (errors.category) setErrors(prev => ({ ...prev, category: '' }));
  }

  function selectStatus(status) {
    setFormData(prev => ({ ...prev, status }));
  }

  function toggleBodyTag(tag) {
    setFormData(prev => ({
      ...prev,
      bodyTags: prev.bodyTags.includes(tag)
        ? prev.bodyTags.filter(t => t !== tag)
        : [...prev.bodyTags, tag]
    }));
  }

  function validateForm() {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Give it a name so you can find it later';
    if (!formData.category) newErrors.category = 'Please select a category';
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      const firstErrorKey = Object.keys(newErrors)[0];
      const el = document.querySelector(`[data-field="${firstErrorKey}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

    const data = {
      name: formData.name.trim(),
      category: formData.category,
      date: formData.date,
      description: formData.description.trim(),
      ridingConnection: formData.ridingConnection.trim(),
      bodyTags: formData.bodyTags,
      status: formData.status,
      source: formData.source.trim(),
      followupNotes: formData.followupNotes.trim()
    };

    let result;
    if (isEdit) {
      result = await updateToolkitEntry(id, data);
    } else {
      result = await createToolkitEntry(currentUser.uid, data);
    }

    setLoading(false);

    if (result.success) {
      navigate('/toolkit');
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
        <h1>{isEdit ? 'Edit Toolkit Entry' : "The Rider\u2019s Toolkit"}</h1>
        <p>Off-horse discoveries worth remembering</p>
      </div>

      <form onSubmit={handleSubmit} autoComplete="off">
        <div className="form-card">
          {errors.submit && (
            <div className="form-section">
              <div className="form-alert form-alert-error">{errors.submit}</div>
            </div>
          )}

          {/* Category */}
          <FormSection title="What kind of thing is this?" data-field="category">
            <div className="tk-category-grid" data-field="category">
              {TOOLKIT_CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  className={`tk-cat-chip${formData.category === cat.value ? ' selected' : ''}`}
                  data-cat={cat.value}
                  onClick={() => selectCategory(cat.value)}
                  disabled={loading}
                >
                  <span className="tk-cat-dot" style={{ background: cat.color }} />
                  {cat.label}
                </button>
              ))}
            </div>
            {errors.category && <div className="field-error" style={{ marginTop: '0.5rem' }}>{errors.category}</div>}
          </FormSection>

          {/* Name & Date */}
          <FormSection title="What & When">
            <div className="form-row" data-field="name">
              <FormField label="What do you want to remember?" error={errors.name}>
                <div className="tk-prompt-box">Give it a name you'll recognize later — e.g., "Hip flexor release sequence," "Magnesium glycinate," "The Mary Wanless book"</div>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={loading}
                  className={errors.name ? 'error' : ''}
                  placeholder="Name or title..."
                />
              </FormField>
              <FormField label="Date noted">
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  disabled={loading}
                />
              </FormField>
            </div>
          </FormSection>

          {/* Description */}
          <FormSection title="Details">
            <FormField label="Describe it" optional>
              <div className="tk-prompt-box">Enough detail that you'll remember what to do, look up, or ask about. A link, a cue, a dosage, a sequence — whatever makes it useful later.</div>
              <textarea
                ref={descRef}
                name="description"
                value={formData.description}
                onChange={handleChange}
                disabled={loading}
                placeholder="Notes, steps, source, where you heard about it..."
              />
              <VoiceInput textareaRef={descRef} onTranscript={text => {
                setFormData(prev => ({ ...prev, description: text }));
              }} />
            </FormField>
          </FormSection>

          {/* Riding Connection */}
          <FormSection title="Riding Connection">
            <FormField label="How might this support your riding?" optional>
              <div className="tk-prompt-box">This is the "so what" — e.g., "might help with hip openness and independent seat," or "could reduce stiffness in the rising trot warm-up"</div>
              <textarea
                ref={connectionRef}
                name="ridingConnection"
                value={formData.ridingConnection}
                onChange={handleChange}
                disabled={loading}
                placeholder="The connection you're seeing..."
              />
              <VoiceInput textareaRef={connectionRef} onTranscript={text => {
                setFormData(prev => ({ ...prev, ridingConnection: text }));
              }} />
            </FormField>
          </FormSection>

          {/* Body Tags */}
          <FormSection title="Body Areas or Riding Elements">
            <FormField label="Areas targeted" optional helpText="Select all that apply">
              <div className="tk-tag-grid">
                {BODY_TAGS.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    className={`tk-tag-btn${formData.bodyTags.includes(tag) ? ' selected' : ''}`}
                    onClick={() => toggleBodyTag(tag)}
                    disabled={loading}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </FormField>
          </FormSection>

          {/* Status & Source */}
          <FormSection title="Status & Source">
            <div className="form-row">
              <FormField label="Where are you with this?">
                <div className="tk-status-group">
                  {TOOLKIT_STATUSES.map(s => (
                    <button
                      key={s.value}
                      type="button"
                      className={`tk-status-btn${formData.status === s.value ? ' selected' : ''}`}
                      data-status={s.value}
                      onClick={() => selectStatus(s.value)}
                      disabled={loading}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </FormField>
              <FormField label="Source or origin" optional>
                <input
                  type="text"
                  name="source"
                  value={formData.source}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="Trainer, book, podcast, clinic..."
                />
              </FormField>
            </div>
          </FormSection>

          {/* Follow-up Notes */}
          <FormSection title="Follow-Up Notes">
            <FormField label="Follow-up notes" optional>
              <div className="tk-prompt-box">If you've tried it — what happened? Did it help? What did you notice? Would you continue?</div>
              <textarea
                ref={followupRef}
                name="followupNotes"
                value={formData.followupNotes}
                onChange={handleChange}
                disabled={loading}
                placeholder="What happened when you tried it..."
              />
              <VoiceInput textareaRef={followupRef} onTranscript={text => {
                setFormData(prev => ({ ...prev, followupNotes: text }));
              }} />
            </FormField>
          </FormSection>

          {/* Actions */}
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/toolkit')} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : (isEdit ? 'Update Entry' : 'Save to My Toolkit')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
