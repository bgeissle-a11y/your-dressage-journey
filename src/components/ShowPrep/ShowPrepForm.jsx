import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  createShowPreparation, getShowPreparation, updateShowPreparation,
  getAllHorseProfiles,
  SHOW_TYPES, SHOW_EXPERIENCE_LEVELS, SHOW_PREP_STATUSES,
  RIDING_FREQUENCIES, COACH_ACCESS_OPTIONS, AVAILABLE_RESOURCES,
  STANDARD_TESTS, FREESTYLE_TESTS
} from '../../services';
import FormSection from '../Forms/FormSection';
import FormField from '../Forms/FormField';
import RadioGroup from '../Forms/RadioGroup';
import '../Forms/Forms.css';
import './ShowPrep.css';

const MAX_SHOW_MONTHS = 6;

export default function ShowPrepForm() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [horseNames, setHorseNames] = useState([]);
  const [formData, setFormData] = useState({
    // Show Details
    showName: '',
    showDuration: 'single',
    showDateStart: '',
    showDateEnd: '',
    showType: '',
    showTypeOther: '',
    showLocation: '',
    // Horse
    horseName: '',
    currentLevel: '',
    showExperience: '',
    currentChallenges: '',
    recentProgress: '',
    // Tests
    testType: 'standard',
    test1: '', test2: '', test3: '', test4: '', test5: '', test6: '',
    // Goals
    goal1: '', goal2: '', goal3: '',
    // Concerns
    concern1: '', concern2: '', concern3: '',
    // Resources
    ridingFrequency: '',
    coachAccess: '',
    availableResources: [],
    constraints: '',
    // Additional
    additionalInfo: '',
    // Status
    status: 'draft'
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [dateFeedback, setDateFeedback] = useState(null);

  useEffect(() => {
    loadHorses();
    if (id) loadExisting();
  }, [id, currentUser]);

  useEffect(() => {
    if (formData.showDateStart) {
      setDateFeedback(getDateFeedback(formData.showDateStart));
    } else {
      setDateFeedback(null);
    }
  }, [formData.showDateStart]);

  async function loadHorses() {
    if (!currentUser) return;
    const result = await getAllHorseProfiles(currentUser.uid);
    if (result.success) {
      setHorseNames(result.data.map(h => h.horseName).filter(Boolean));
    }
  }

  async function loadExisting() {
    if (!id) return;
    setLoadingData(true);
    const result = await getShowPreparation(id);
    if (result.success) {
      const d = result.data;
      const tests = d.testsSelected || [];
      setFormData({
        showName: d.showName || '',
        showDuration: d.showDuration || 'single',
        showDateStart: d.showDateStart || '',
        showDateEnd: d.showDateEnd || '',
        showType: d.showType || '',
        showTypeOther: d.showTypeOther || '',
        showLocation: d.showLocation || '',
        horseName: d.horseName || '',
        currentLevel: d.currentLevel || '',
        showExperience: d.showExperience || '',
        currentChallenges: d.currentChallenges || '',
        recentProgress: d.recentProgress || '',
        testType: d.testType || 'standard',
        test1: tests[0] || '', test2: tests[1] || '', test3: tests[2] || '',
        test4: tests[3] || '', test5: tests[4] || '', test6: tests[5] || '',
        goal1: (d.goals && d.goals[0]) || '',
        goal2: (d.goals && d.goals[1]) || '',
        goal3: (d.goals && d.goals[2]) || '',
        concern1: (d.concerns && d.concerns[0]) || '',
        concern2: (d.concerns && d.concerns[1]) || '',
        concern3: (d.concerns && d.concerns[2]) || '',
        ridingFrequency: d.ridingFrequency || '',
        coachAccess: d.coachAccess || '',
        availableResources: d.availableResources || [],
        constraints: d.constraints || '',
        additionalInfo: d.additionalInfo || '',
        status: d.status || 'draft'
      });
    }
    setLoadingData(false);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  }

  function handleResourceToggle(value) {
    setFormData(prev => {
      const current = prev.availableResources;
      const updated = current.includes(value)
        ? current.filter(r => r !== value)
        : [...current, value];
      return { ...prev, availableResources: updated };
    });
  }

  function handleTestTypeChange(e) {
    const { value } = e.target;
    setFormData(prev => ({
      ...prev,
      testType: value,
      test1: '', test2: '', test3: '', test4: '', test5: '', test6: ''
    }));
  }

  function getDateFeedback(dateStr) {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const showDate = new Date(dateStr + 'T00:00:00');
    const maxDate = new Date(today);
    maxDate.setMonth(maxDate.getMonth() + MAX_SHOW_MONTHS);

    if (showDate < today) {
      return { valid: false, message: 'Show date must be today or in the future' };
    }
    if (showDate > maxDate) {
      return { valid: false, message: `Shows must be within ${MAX_SHOW_MONTHS} months` };
    }

    const diffMs = showDate - today;
    const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const weeks = Math.round(daysUntil / 7);

    if (daysUntil === 0) return { valid: true, message: "That's today!" };
    if (daysUntil === 1) return { valid: true, message: "That's tomorrow \u2014 let's focus on final prep!" };
    if (daysUntil < 14) return { valid: true, message: `${daysUntil} days away \u2014 short timeline` };
    if (weeks <= 8) return { valid: true, message: `${weeks} weeks away \u2014 great lead time` };
    return { valid: true, message: `${weeks} weeks away \u2014 plenty of time to prepare` };
  }

  function validateForm() {
    const newErrors = {};
    if (!formData.showName.trim()) newErrors.showName = 'Show name is required';
    if (!formData.showDateStart) {
      newErrors.showDateStart = 'Show date is required';
    } else if (dateFeedback && !dateFeedback.valid) {
      newErrors.showDateStart = dateFeedback.message;
    }
    if (formData.showDuration === 'multi' && !formData.showDateEnd) {
      newErrors.showDateEnd = 'End date is required for multi-day shows';
    }
    if (formData.showDuration === 'multi' && formData.showDateEnd && formData.showDateStart) {
      const start = new Date(formData.showDateStart + 'T00:00:00');
      const end = new Date(formData.showDateEnd + 'T00:00:00');
      if (end <= start) {
        newErrors.showDateEnd = 'End date must be after start date';
      }
    }
    if (!formData.showType) newErrors.showType = 'Please select a show type';
    if (formData.showType === 'other' && !formData.showTypeOther.trim()) {
      newErrors.showTypeOther = 'Please specify the show type';
    }
    if (!formData.horseName) newErrors.horseName = 'Please select a horse';
    if (!formData.currentLevel.trim()) newErrors.currentLevel = 'Current level is required';
    if (!formData.goal1.trim()) newErrors.goal1 = 'At least one goal is required';
    if (!formData.ridingFrequency) newErrors.ridingFrequency = 'Please select riding frequency';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function collectTestSelections() {
    const maxSlots = formData.testType === 'freestyle' ? 2 : 6;
    const tests = [];
    for (let i = 1; i <= maxSlots; i++) {
      const val = formData[`test${i}`];
      if (val) tests.push(val);
    }
    return tests;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    const data = {
      showName: formData.showName,
      showDuration: formData.showDuration,
      showDateStart: formData.showDateStart,
      showDateEnd: formData.showDuration === 'multi' ? formData.showDateEnd : null,
      showType: formData.showType,
      showTypeOther: formData.showType === 'other' ? formData.showTypeOther : null,
      showLocation: formData.showLocation || null,
      testType: formData.testType,
      testsSelected: collectTestSelections(),
      horseName: formData.horseName,
      currentLevel: formData.currentLevel,
      showExperience: formData.showExperience,
      currentChallenges: formData.currentChallenges || null,
      recentProgress: formData.recentProgress || null,
      goals: [formData.goal1, formData.goal2, formData.goal3].filter(Boolean),
      concerns: [formData.concern1, formData.concern2, formData.concern3].filter(Boolean),
      ridingFrequency: formData.ridingFrequency,
      coachAccess: formData.coachAccess,
      availableResources: formData.availableResources,
      constraints: formData.constraints || null,
      additionalInfo: formData.additionalInfo || null,
      status: formData.status
    };

    let result;
    if (isEdit) {
      result = await updateShowPreparation(id, data);
    } else {
      result = await createShowPreparation(currentUser.uid, data);
    }

    setLoading(false);

    if (result.success) {
      navigate('/show-prep');
    } else {
      setErrors({ submit: result.error });
    }
  }

  const testOptions = formData.testType === 'freestyle' ? FREESTYLE_TESTS : STANDARD_TESTS;
  const maxTestSlots = formData.testType === 'freestyle' ? 2 : 6;

  if (loadingData) {
    return <div className="loading-state">Loading show preparation...</div>;
  }

  return (
    <div className="form-page">
      <div className="form-page-header">
        <h1>{isEdit ? 'Edit Show Preparation' : 'Show Preparation Planner'}</h1>
        <p>Let's create your personalized preparation roadmap for success in the ring</p>
      </div>

      <form onSubmit={handleSubmit} autoComplete="off">
        <div className="form-card">
          {errors.submit && <div className="form-section"><div className="form-alert form-alert-error">{errors.submit}</div></div>}

          {/* Section 1: Show Details */}
          <FormSection title="Show Details" description="Tell us about the show you're preparing for">
            <FormField label="Show Name" error={errors.showName}>
              <input type="text" name="showName" value={formData.showName} onChange={handleChange} disabled={loading} className={errors.showName ? 'error' : ''} placeholder="e.g., Sunridge Spring Dressage, NEDA Fall Festival" />
            </FormField>

            {/* Date Toggle */}
            <FormField label="Show Duration">
              <div className="date-toggle-group">
                <button
                  type="button"
                  className={`toggle-option${formData.showDuration === 'single' ? ' active' : ''}`}
                  onClick={() => handleChange({ target: { name: 'showDuration', value: 'single' } })}
                  disabled={loading}
                >
                  One Day
                </button>
                <button
                  type="button"
                  className={`toggle-option${formData.showDuration === 'multi' ? ' active' : ''}`}
                  onClick={() => handleChange({ target: { name: 'showDuration', value: 'multi' } })}
                  disabled={loading}
                >
                  Multiple Days
                </button>
              </div>
              <div className="date-fields">
                <FormField label={formData.showDuration === 'multi' ? 'Start Date' : 'Show Date'} error={errors.showDateStart}>
                  <input type="date" name="showDateStart" value={formData.showDateStart} onChange={handleChange} disabled={loading} className={errors.showDateStart ? 'error' : ''} />
                  {dateFeedback && (
                    <div className={`date-feedback ${dateFeedback.valid ? 'valid' : 'invalid'}`}>
                      {dateFeedback.message}
                    </div>
                  )}
                </FormField>
                {formData.showDuration === 'multi' && (
                  <FormField label="End Date" error={errors.showDateEnd}>
                    <input type="date" name="showDateEnd" value={formData.showDateEnd} onChange={handleChange} disabled={loading} className={errors.showDateEnd ? 'error' : ''} />
                  </FormField>
                )}
              </div>
            </FormField>

            {/* Show Type */}
            <FormField label="Show Type" error={errors.showType}>
              <RadioGroup name="showType" options={SHOW_TYPES} value={formData.showType} onChange={handleChange} disabled={loading} />
            </FormField>
            {formData.showType === 'other' && (
              <FormField label="Please specify" error={errors.showTypeOther}>
                <input type="text" name="showTypeOther" value={formData.showTypeOther} onChange={handleChange} disabled={loading} className={errors.showTypeOther ? 'error' : ''} placeholder="Describe the show type" />
              </FormField>
            )}

            <FormField label="Location" optional>
              <input type="text" name="showLocation" value={formData.showLocation} onChange={handleChange} disabled={loading} placeholder="Venue name or city" />
            </FormField>

            {isEdit && (
              <FormField label="Status">
                <select name="status" value={formData.status} onChange={handleChange} disabled={loading}>
                  {SHOW_PREP_STATUSES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </FormField>
            )}
          </FormSection>

          {/* Section 2: Your Horse */}
          <FormSection title="Your Horse" description="Tell us about the partner you're bringing into the ring">
            <div className="form-row">
              <FormField label="Horse for This Show" error={errors.horseName}>
                {horseNames.length > 0 ? (
                  <select name="horseName" value={formData.horseName} onChange={handleChange} disabled={loading} className={errors.horseName ? 'error' : ''}>
                    <option value="">Select horse...</option>
                    {horseNames.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                ) : (
                  <input type="text" name="horseName" value={formData.horseName} onChange={handleChange} disabled={loading} className={errors.horseName ? 'error' : ''} placeholder="Horse name" />
                )}
              </FormField>
              <FormField label="Current Training Level" error={errors.currentLevel}>
                <input type="text" name="currentLevel" value={formData.currentLevel} onChange={handleChange} disabled={loading} className={errors.currentLevel ? 'error' : ''} placeholder="e.g., Training Level, 2nd Level, PSG" />
              </FormField>
            </div>
            <FormField label="What's your experience showing this horse?" optional>
              <RadioGroup name="showExperience" options={SHOW_EXPERIENCE_LEVELS} value={formData.showExperience} onChange={handleChange} disabled={loading} />
            </FormField>
            <FormField label="Current Technical or Physical Challenges" optional>
              <textarea name="currentChallenges" value={formData.currentChallenges} onChange={handleChange} disabled={loading} placeholder="Describe any specific movements, patterns, or physical issues you're working through right now (e.g., inconsistent tempi changes, struggling with half-pass left, horse tension in transitions, recovering from injury)" style={{ minHeight: '120px' }} />
            </FormField>
            <FormField label="Recent Progress or Breakthroughs" optional>
              <textarea name="recentProgress" value={formData.recentProgress} onChange={handleChange} disabled={loading} placeholder="Any recent improvements, aha moments, or wins to build on" style={{ minHeight: '80px' }} />
            </FormField>
          </FormSection>

          {/* Section 3: Tests */}
          <FormSection title="Tests You're Riding" description="Select up to 6 tests. Use the toggle to switch between standard and freestyle.">
            <div className="test-type-toggle">
              <RadioGroup name="testType" options={[
                { value: 'standard', label: 'Standard Tests' },
                { value: 'freestyle', label: 'Freestyle' }
              ]} value={formData.testType} onChange={handleTestTypeChange} disabled={loading} />
            </div>
            <div className="test-slots">
              {Array.from({ length: maxTestSlots }, (_, i) => (
                <div key={i} className="test-slot">
                  <div className="slot-number">{i + 1}</div>
                  <select name={`test${i + 1}`} value={formData[`test${i + 1}`]} onChange={handleChange} disabled={loading}>
                    {testOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <p className="test-note">Select only the tests you plan to ride. Unused slots can be left blank.</p>
          </FormSection>

          {/* Section 4: Goals */}
          <FormSection title="Your Goals" description="What do you want to achieve at this show? (List up to 3)">
            <div className="show-prep-info-box">
              <strong>Tip:</strong> Good goals are specific and measurable. Instead of "do well," try "score 62% or higher" or "execute clean lead changes" or "feel confident in the warm-up."
            </div>
            <div className="goal-concern-item">
              <div className="item-number">1</div>
              <div style={{ flex: 1 }}>
                <input type="text" name="goal1" value={formData.goal1} onChange={handleChange} disabled={loading} placeholder="Primary goal" className={errors.goal1 ? 'error' : ''} />
                {errors.goal1 && <div className="field-error">{errors.goal1}</div>}
              </div>
            </div>
            <div className="goal-concern-item">
              <div className="item-number">2</div>
              <input type="text" name="goal2" value={formData.goal2} onChange={handleChange} disabled={loading} placeholder="Second goal (optional)" />
            </div>
            <div className="goal-concern-item">
              <div className="item-number">3</div>
              <input type="text" name="goal3" value={formData.goal3} onChange={handleChange} disabled={loading} placeholder="Third goal (optional)" />
            </div>
          </FormSection>

          {/* Section 5: Concerns */}
          <FormSection title="Your Concerns" description="What worries you about this show? (List up to 3)">
            <div className="show-prep-info-box">
              <strong>Why we ask:</strong> Naming your concerns helps us address them directly in your preparation plan. Common concerns include nerves, horse behavior, specific technical elements, or recovery from setbacks.
            </div>
            <div className="goal-concern-item">
              <div className="item-number concern">1</div>
              <input type="text" name="concern1" value={formData.concern1} onChange={handleChange} disabled={loading} placeholder="Primary concern (optional)" />
            </div>
            <div className="goal-concern-item">
              <div className="item-number concern">2</div>
              <input type="text" name="concern2" value={formData.concern2} onChange={handleChange} disabled={loading} placeholder="Second concern (optional)" />
            </div>
            <div className="goal-concern-item">
              <div className="item-number concern">3</div>
              <input type="text" name="concern3" value={formData.concern3} onChange={handleChange} disabled={loading} placeholder="Third concern (optional)" />
            </div>
          </FormSection>

          {/* Section 6: Resources & Preparation Time */}
          <FormSection title="Resources & Preparation Time" description="Help us tailor your plan to what you have available">
            <FormField label="How many days per week can you typically ride between now and the show?" error={errors.ridingFrequency}>
              <select name="ridingFrequency" value={formData.ridingFrequency} onChange={handleChange} disabled={loading} className={errors.ridingFrequency ? 'error' : ''}>
                <option value="">Select...</option>
                {RIDING_FREQUENCIES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </FormField>
            <FormField label="Do you have regular access to a trainer/coach?" optional>
              <RadioGroup name="coachAccess" options={COACH_ACCESS_OPTIONS} value={formData.coachAccess} onChange={handleChange} disabled={loading} />
            </FormField>
            <FormField label="What resources do you have available?" optional>
              <div className="checkbox-group" style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginTop: '10px' }}>
                {AVAILABLE_RESOURCES.map(res => (
                  <label key={res.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.availableResources.includes(res.value)}
                      onChange={() => handleResourceToggle(res.value)}
                      disabled={loading}
                      style={{ width: '20px', height: '20px', accentColor: '#8B7355' }}
                    />
                    <span style={{ fontSize: '0.95rem' }}>{res.label}</span>
                  </label>
                ))}
              </div>
            </FormField>
            <FormField label="Time or Resource Constraints" optional>
              <textarea name="constraints" value={formData.constraints} onChange={handleChange} disabled={loading} placeholder="Any limitations we should know about (travel schedule, horse soundness issues, weather-dependent arena access, etc.)" style={{ minHeight: '80px' }} />
            </FormField>
          </FormSection>

          {/* Section 7: Anything Else */}
          <FormSection title="Anything Else?" description="Share any other context that would help us create your ideal preparation plan">
            <FormField label="Additional Information" optional>
              <textarea name="additionalInfo" value={formData.additionalInfo} onChange={handleChange} disabled={loading} placeholder="Mental game focus areas, past experiences at this show or venue, specific anxiety triggers, motivation strategies that work for you, logistics you're navigating, etc." style={{ minHeight: '120px' }} />
              <div className="char-counter">
                {formData.additionalInfo.length} characters
              </div>
            </FormField>
          </FormSection>

          {/* Section 8: Packing List + Post-Show Reflection */}
          <FormSection title="Show Packing List" description="Don't leave anything behind \u2014 open your interactive checklist">
            <div className="show-prep-link-panel">
              <div className="panel-icon">&#x1F9F3;</div>
              <div className="panel-text">
                <h3>Open Your Packing Checklist</h3>
                <p>Your show packing list covers everything from shipping boots to stock ties \u2014 organized by category with collapsible sections, custom item support, and progress tracking.</p>
                <button type="button" className="btn-panel-action" onClick={() => window.open('/packing-list.html', '_blank')}>
                  Open Packing List
                </button>
              </div>
            </div>
          </FormSection>

          <FormSection title="After the Show" description="Complete your circle \u2014 record what actually happened">
            <div className="show-prep-link-panel">
              <div className="panel-icon">&#x1F3DF;&#xFE0F;</div>
              <div className="panel-text">
                <h3>Log Your Post-Show Reflection</h3>
                <p>Once the ribbons are handed out and the trailer is loaded, come back to capture what you felt, learned, and want to carry forward.</p>
                <button type="button" className="btn-panel-action" onClick={() => navigate('/events/new')}>
                  Record Show Reflection
                </button>
              </div>
            </div>
          </FormSection>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/show-prep')} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : (isEdit ? 'Update Plan' : 'Generate My Preparation Plan')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
