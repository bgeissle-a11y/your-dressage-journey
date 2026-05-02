import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase-config';
import {
  createLessonNote, getLessonNote, updateLessonNote,
  getAllLessonNotes, getAllHorseProfiles, getAllDebriefs,
  LESSON_TYPES
} from '../../services';
import useFormRecovery from '../../hooks/useFormRecovery';
import FormSection from '../Forms/FormSection';
import FormField from '../Forms/FormField';
import VoiceInput from '../Forms/VoiceInput';
import YDJLoading from '../YDJLoading';
import '../Forms/Forms.css';
import './LessonNotes.css';

const LESSON_TYPE_LABELS = Object.fromEntries(LESSON_TYPES.map(t => [t.value, t.label]));

const MOVEMENT_PROMPTS = [
  'Which movements and exercises you worked on (e.g. shoulder-in, half-pass, tempi changes, piaffe)',
  'Specific directions for performing each movement better (e.g. "leg yield out, really bend him on the right side")',
  'Figures, sequences, or patterns the instructor asked for (e.g. "travers out of a 10-meter circle")',
  'Any movements that were repeated or emphasized more than once'
];

const PURPOSE_PROMPTS = [
  'What training problem was the exercise trying to solve?',
  'What quality in the horse (or you) was it building toward?',
  "If you're not sure, write your best guess \u2014 that's useful data too",
  'Example: "I think the shoulder-in to renvers sequence was about teaching me to maintain bend through a direction change, not just set it once."'
];

const CUES_PROMPTS = [
  'Short verbal cues and reminders (e.g. "be accurate," "thumbs up," "inside leg to outside rein")',
  'Corrections to your position or aids (e.g. "hold with your back," "give the inside rein," "softer hand")',
  'Anything the instructor repeated \u2014 repetition is a pattern signal',
  'Positive feedback, even brief ("nice," "yes," "that\'s it") \u2014 these are data too',
  'Questions asked of you (e.g. "Did you feel that?")'
];

const COACHES_EYE_PROMPTS = [
  'Imagery or metaphors your instructor used to describe the feeling (e.g. "like water flowing downhill")',
  'Observations about your horse \u2014 tension, way of going, asymmetry, a good moment',
  'Any praise or positive feedback your instructor gave (these are data too)',
  'Anything your instructor said that connected to a bigger training idea'
];

const REFLECTION_PROMPTS = [
  'What surprised you when you read this back?',
  'What correction came up more than once \u2014 and does that feel familiar?',
  'Is there a gap between what the instructor described and what you felt in the moment?',
  'What are you most curious or uncertain about from this session?',
  'What do you want to remember to try on your own before the next lesson?',
  'Did any of the instructor\'s cues connect to something you\'ve been working on for a long time?'
];

function PromptBox({ title, items, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`prompt-box${open ? ' open' : ''}`}>
      <button type="button" className="prompt-box-toggle" onClick={() => setOpen(prev => !prev)}>
        <span>{title}</span>
        <span className="prompt-box-chevron">{'\u25BC'}</span>
      </button>
      <div className="prompt-box-body">
        <ul>
          {items.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      </div>
    </div>
  );
}

export default function LessonNoteForm() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const textareaRefs = useRef({});

  const [horses, setHorses] = useState([]);
  const [instructorSuggestions, setInstructorSuggestions] = useState([]);
  const [debriefs, setDebriefs] = useState([]);
  const [draftId, setDraftId] = useState(null);
  const [showCompletion, setShowCompletion] = useState(false);
  const [savedData, setSavedData] = useState(null);

  const [formData, setFormData] = useState({
    lessonDate: new Date().toISOString().split('T')[0],
    horseId: '',
    horseName: '',
    instructorName: '',
    lessonType: '',
    linkedDebriefId: '',
    movementInstructions: '',
    movementPurpose: '',
    cuesCorrections: '',
    coachesEye: '',
    riderReflections: '',
    takeaway1: '',
    takeaway2: '',
    takeaway3: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  // Transcript panel state
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [rawTranscript, setRawTranscript] = useState('');
  const [processing, setProcessing] = useState(false);
  const [processingError, setProcessingError] = useState('');
  const [transcriptDone, setTranscriptDone] = useState(false);

  const { hasRecovery, applyRecovery, dismissRecovery, clearRecovery } = useFormRecovery(
    'ydj-lesson-note-recovery', id, formData, setFormData
  );

  useEffect(() => {
    loadReferenceData();
    if (id) loadExisting();
  }, [id, currentUser]);

  async function loadReferenceData() {
    if (!currentUser) return;

    // Load horses
    const horsesResult = await getAllHorseProfiles(currentUser.uid);
    if (horsesResult.success) {
      setHorses(horsesResult.data.filter(h => h.horseName));
    }

    // Load instructor suggestions from existing lesson notes
    const notesResult = await getAllLessonNotes(currentUser.uid);
    if (notesResult.success) {
      const names = [...new Set(notesResult.data.map(n => n.instructorName).filter(Boolean))];
      setInstructorSuggestions(names);

      // Load draft if not editing
      if (!id) {
        const draft = notesResult.data.find(n => n.isDraft);
        if (draft) {
          setDraftId(draft.id);
          populateForm(draft);
        }
      }
    }

    // Load debriefs for linking
    const debriefsResult = await getAllDebriefs(currentUser.uid);
    if (debriefsResult.success) {
      setDebriefs(debriefsResult.data.slice(0, 30));
    }
  }

  async function loadExisting() {
    setLoadingData(true);
    const result = await getLessonNote(id);
    if (result.success) {
      populateForm(result.data);
    }
    setLoadingData(false);
  }

  function populateForm(data) {
    setFormData({
      lessonDate: data.lessonDate || '',
      horseId: data.horseId || '',
      horseName: data.horseName || '',
      instructorName: data.instructorName || '',
      lessonType: data.lessonType || '',
      linkedDebriefId: data.linkedDebriefId || '',
      movementInstructions: data.movementInstructions || '',
      movementPurpose: data.movementPurpose || '',
      cuesCorrections: data.cuesCorrections || '',
      coachesEye: data.coachesEye || '',
      riderReflections: data.riderReflections || '',
      takeaway1: (data.takeaways && data.takeaways[0]) || '',
      takeaway2: (data.takeaways && data.takeaways[1]) || '',
      takeaway3: (data.takeaways && data.takeaways[2]) || ''
    });
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  }

  function handleHorseChange(e) {
    const selectedId = e.target.value;
    const horse = horses.find(h => h.id === selectedId);
    setFormData(prev => ({
      ...prev,
      horseId: selectedId,
      horseName: horse ? horse.horseName : ''
    }));
    if (errors.horseId) setErrors(prev => ({ ...prev, horseId: '' }));
  }

  function handleLessonTypeSelect(value) {
    setFormData(prev => ({ ...prev, lessonType: value }));
    if (errors.lessonType) setErrors(prev => ({ ...prev, lessonType: '' }));
  }

  function getRef(key) {
    if (!textareaRefs.current[key]) {
      textareaRefs.current[key] = { current: null };
    }
    return textareaRefs.current[key];
  }

  function validateForm() {
    const newErrors = {};
    if (!formData.lessonDate) newErrors.lessonDate = 'Please enter the lesson date.';
    if (!formData.horseId) newErrors.horseId = 'Please select a horse.';
    if (!formData.instructorName.trim()) newErrors.instructorName = "Please enter the instructor's name.";
    if (!formData.lessonType) newErrors.lessonType = 'Please select a lesson type.';
    if (!formData.movementInstructions.trim()) newErrors.movementInstructions = 'Please add movement instructions before saving.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function collectData(isDraft = false) {
    return {
      lessonDate: formData.lessonDate,
      horseId: formData.horseId,
      horseName: formData.horseName,
      instructorName: formData.instructorName.trim(),
      lessonType: formData.lessonType,
      linkedDebriefId: formData.linkedDebriefId || null,
      movementInstructions: formData.movementInstructions.trim(),
      movementPurpose: formData.movementPurpose.trim() || null,
      cuesCorrections: formData.cuesCorrections.trim(),
      coachesEye: formData.coachesEye.trim(),
      transcriptProcessed: rawTranscript.trim().length > 0,
      riderReflections: formData.riderReflections.trim(),
      takeaways: [
        formData.takeaway1.trim(),
        formData.takeaway2.trim(),
        formData.takeaway3.trim()
      ].filter(Boolean),
      isDraft
    };
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    const data = collectData(false);

    const existingId = isEdit ? id : draftId;
    let result;
    if (existingId) {
      result = await updateLessonNote(existingId, data);
    } else {
      result = await createLessonNote(currentUser.uid, data);
    }

    setLoading(false);

    if (result.success) {
      clearRecovery();
      if (isEdit) {
        navigate('/lesson-notes');
      } else {
        setSavedData(data);
        setShowCompletion(true);
      }
    } else {
      setErrors({ submit: result.error });
    }
  }

  async function handleSaveDraft() {
    setLoading(true);
    const data = collectData(true);

    const existingId = isEdit ? id : draftId;
    let result;
    if (existingId) {
      result = await updateLessonNote(existingId, data);
    } else {
      result = await createLessonNote(currentUser.uid, data);
      if (result.success && result.id) setDraftId(result.id);
    }

    setLoading(false);

    if (result.success) {
      clearRecovery();
      navigate('/lesson-notes');
    } else {
      setErrors({ submit: result.error });
    }
  }

  function resetForm() {
    setFormData({
      lessonDate: new Date().toISOString().split('T')[0],
      horseId: '',
      horseName: '',
      instructorName: '',
      lessonType: '',
      linkedDebriefId: '',
      movementInstructions: '',
      movementPurpose: '',
      cuesCorrections: '',
      coachesEye: '',
      riderReflections: '',
      takeaway1: '',
      takeaway2: '',
      takeaway3: ''
    });
    setErrors({});
    setDraftId(null);
    setShowCompletion(false);
    setSavedData(null);
    setRawTranscript('');
    setTranscriptOpen(false);
    setTranscriptDone(false);
    setProcessingError('');
  }

  async function processTranscript() {
    if (!rawTranscript || rawTranscript.trim().length < 100) return;

    setProcessing(true);
    setProcessingError('');
    setTranscriptDone(false);

    try {
      const fn = httpsCallable(functions, 'processLessonTranscript', { timeout: 120_000 });
      const result = await fn({
        transcript: rawTranscript.trim(),
        horseName: formData.horseName || 'the horse',
        instructorName: formData.instructorName.trim() || 'the instructor'
      });

      const data = result.data;
      setFormData(prev => ({
        ...prev,
        movementInstructions: data.movementInstructions || prev.movementInstructions,
        cuesCorrections: data.cuesCorrections || prev.cuesCorrections,
        coachesEye: data.coachesEye || prev.coachesEye
      }));
      setTranscriptDone(true);
    } catch (err) {
      console.error('Transcript processing error:', err);
      setProcessingError('Something went wrong. Please try again or fill in the fields manually.');
    } finally {
      setProcessing(false);
    }
  }

  function clearTranscript() {
    setRawTranscript('');
    setTranscriptDone(false);
    setProcessingError('');
  }

  function handleFileAttach(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setRawTranscript(evt.target.result);
    };
    reader.readAsText(file);
    // Reset file input so the same file can be re-selected
    e.target.value = '';
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  }

  if (loadingData) {
    return <div className="loading-state">Loading lesson note...</div>;
  }

  // Completion screen (new entry only)
  if (showCompletion && savedData) {
    return (
      <div className="form-page">
        <div className="form-card">
          <div className="completion-screen">
            <div className="completion-icon">{'\u2713'}</div>
            <h2>Lesson Notes Saved</h2>
            <p>Your instructor guidance and reflections have been added to your journey data and are ready for coaching analysis.</p>

            <div className="completion-meta">
              <div className="completion-meta-row">
                <span>Date</span>
                <span>{formatDate(savedData.lessonDate)}</span>
              </div>
              <div className="completion-meta-row">
                <span>Horse</span>
                <span>{savedData.horseName}</span>
              </div>
              <div className="completion-meta-row">
                <span>Instructor</span>
                <span>{savedData.instructorName}</span>
              </div>
              <div className="completion-meta-row">
                <span>Type</span>
                <span>{LESSON_TYPE_LABELS[savedData.lessonType] || savedData.lessonType}</span>
              </div>
              {savedData.takeaways.length > 0 && (
                <div className="completion-meta-row">
                  <span>Takeaways captured</span>
                  <span>{savedData.takeaways.length}</span>
                </div>
              )}
            </div>

            <div className="completion-actions">
              <button className="btn btn-secondary" onClick={resetForm}>Log Another</button>
              <button className="btn btn-primary" onClick={() => navigate('/lesson-notes')}>View My Notes</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="form-page">
      <div className="form-page-header">
        <h1>{isEdit ? 'Edit Lesson Notes' : 'Lesson Notes'}</h1>
        <p>Capture instructor guidance, transcribe lesson summaries, and reflect on what to carry into your next ride.</p>
      </div>

      <form onSubmit={handleSubmit} autoComplete="off">
        <div className="form-card">
          {errors.submit && <div className="form-section"><div className="form-alert form-alert-error">{errors.submit}</div></div>}

          {hasRecovery && (
            <div className="form-section">
              <div className="form-alert form-alert-info" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span>You have unsaved data from a previous session. Would you like to restore it?</span>
                <span style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }} onClick={applyRecovery}>Restore</button>
                  <button type="button" className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }} onClick={dismissRecovery}>Dismiss</button>
                </span>
              </div>
            </div>
          )}

          {/* Section 1: About This Lesson */}
          <FormSection title="About This Lesson" description="A few quick details so your notes stay organized and searchable over time.">
            <div className="form-row">
              <FormField label="Date" error={errors.lessonDate}>
                <input type="date" name="lessonDate" value={formData.lessonDate} onChange={handleChange} disabled={loading} />
              </FormField>

              <FormField label="Horse" error={errors.horseId}>
                {horses.length > 0 ? (
                  <select name="horseId" value={formData.horseId} onChange={handleHorseChange} disabled={loading}>
                    <option value="">Select horse...</option>
                    {horses.map(h => <option key={h.id} value={h.id}>{h.horseName}</option>)}
                  </select>
                ) : (
                  <input type="text" name="horseName" value={formData.horseName} onChange={handleChange} disabled={loading} placeholder="Horse name" />
                )}
              </FormField>
            </div>

            <div className="form-row">
              <FormField label="Instructor" error={errors.instructorName} helpText="Previous instructors will appear as suggestions.">
                <input
                  type="text"
                  name="instructorName"
                  list="instructorSuggestions"
                  value={formData.instructorName}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="e.g. Jane Smith"
                />
                <datalist id="instructorSuggestions">
                  {instructorSuggestions.map(name => <option key={name} value={name} />)}
                </datalist>
              </FormField>
            </div>

            <FormField label="Lesson Type" error={errors.lessonType}>
              <div className="lesson-type-chips">
                {LESSON_TYPES.map(lt => (
                  <button
                    key={lt.value}
                    type="button"
                    className={`lesson-chip${formData.lessonType === lt.value ? ' selected' : ''}`}
                    onClick={() => handleLessonTypeSelect(lt.value)}
                    disabled={loading}
                  >
                    {lt.label}
                  </button>
                ))}
              </div>
            </FormField>

            {/* Optional linked debrief */}
            <div className="optional-link">
              <div className="optional-link-label">Optional — Link to a Debrief Entry</div>
              <FormField label="" helpText="When linked, your coaching analysis can cross-reference what you felt with what your instructor saw.">
                <select name="linkedDebriefId" value={formData.linkedDebriefId} onChange={handleChange} disabled={loading}>
                  <option value="">No linked debrief</option>
                  {debriefs.map(d => (
                    <option key={d.id} value={d.id}>
                      {formatDate(d.rideDate)} — {d.horseName || 'Unknown horse'}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
          </FormSection>

          {/* Section 2: Instructor Guidance */}
          <FormSection title="Instructor Guidance" description="Paste your transcript below to let YDJ organize it — or type directly into the fields.">

            {/* Transcript Processing Panel */}
            <div className={`transcript-panel${transcriptOpen ? ' open' : ''}`}>
              <button type="button" className="transcript-panel-header" onClick={() => setTranscriptOpen(prev => !prev)}>
                <div className="transcript-panel-title">
                  {'\u2726'} Process a Lesson Transcript
                  <span className="tp-badge">Optional</span>
                </div>
                <span className="transcript-panel-chevron">{'\u25BC'}</span>
              </button>
              <div className="transcript-panel-body">
                <p className="transcript-intro">
                  Paste the full text of your lesson transcript — from any transcription tool or service. No speaker labels needed. YDJ will identify your instructor's voice and organize guidance into movements, cues, and coaching observations. Before saving, do a quick scan for dressage terminology your tool may have mangled (common: "haunches" → "hunches," "volte" → "vault," "half halt" → "half fault").
                </p>
                <div style={{ marginBottom: 0 }}>
                  <div className="transcript-label-row">
                    <label htmlFor="rawTranscript">Paste or attach transcript</label>
                    <label className="btn-attach-file">
                      <input type="file" accept=".txt,.text,.srt,.vtt" onChange={handleFileAttach} disabled={processing} />
                      Attach file
                    </label>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <textarea
                      ref={el => { getRef('rawTranscript').current = el; }}
                      className="large"
                      value={rawTranscript}
                      onChange={e => setRawTranscript(e.target.value)}
                      disabled={processing}
                      placeholder="Paste your full lesson transcript here..."
                      style={{ paddingRight: '60px' }}
                    />
                    <VoiceInput
                      textareaRef={getRef('rawTranscript')}
                      onTranscript={text => setRawTranscript(text)}
                    />
                  </div>
                  <div className="char-counter">{rawTranscript.length} characters</div>
                </div>
                <div className="transcript-actions">
                  <button
                    type="button"
                    className="btn-process"
                    onClick={processTranscript}
                    disabled={processing || rawTranscript.trim().length < 100}
                  >
                    <span>{'\u2726'}</span> {processing ? 'Processing...' : 'Process with AI'}
                  </button>
                  <button type="button" className="btn-clear-transcript" onClick={clearTranscript} disabled={processing}>Clear</button>
                  {processingError && <span className="processing-status active error">{processingError}</span>}
                </div>
                {processing && (
                  <div style={{ marginTop: 20 }}>
                    <YDJLoading size="sm" message="Organizing your lesson transcript" />
                  </div>
                )}
                {transcriptDone && (
                  <div className="transcript-result-notice active">
                    {'\u2713'} Fields populated from your transcript. Review each section, correct any dressage terminology your transcription tool may have mangled, and add your own reflections before saving.
                  </div>
                )}
              </div>
            </div>

            <FormField label="Movement Instructions" error={errors.movementInstructions}>
              <PromptBox title={'\u2726 What to include'} items={MOVEMENT_PROMPTS} defaultOpen={true} />
              <div style={{ position: 'relative' }}>
                <textarea
                  ref={el => { getRef('movementInstructions').current = el; }}
                  name="movementInstructions"
                  className="large"
                  value={formData.movementInstructions}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="Start typing..."
                  style={{ paddingRight: '60px' }}
                />
                <VoiceInput
                  textareaRef={getRef('movementInstructions')}
                  onTranscript={text => setFormData(prev => ({ ...prev, movementInstructions: text }))}
                />
              </div>
              <div className="char-counter">{formData.movementInstructions.length} characters</div>
            </FormField>

            <FormField label="In your own words — what do you think was the purpose?" optional helpText="Not what you did — why you did it. One sentence is enough.">
              <PromptBox title={'\u2726 What this means'} items={PURPOSE_PROMPTS} />
              <div style={{ position: 'relative' }}>
                <textarea
                  ref={el => { getRef('movementPurpose').current = el; }}
                  name="movementPurpose"
                  value={formData.movementPurpose}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="e.g. I think the purpose of the leg yield sequence was to teach him to move away from my leg without getting tense — it's preparation for half-pass..."
                  style={{ paddingRight: '60px', minHeight: '80px' }}
                />
                <VoiceInput
                  textareaRef={getRef('movementPurpose')}
                  onTranscript={text => setFormData(prev => ({ ...prev, movementPurpose: text }))}
                />
              </div>
              <div className="char-counter">{formData.movementPurpose.length} characters</div>
            </FormField>

            <FormField label="Instructional Cues & Corrections" optional>
              <PromptBox title={'\u2726 What to include'} items={CUES_PROMPTS} />
              <div style={{ position: 'relative' }}>
                <textarea
                  ref={el => { getRef('cuesCorrections').current = el; }}
                  name="cuesCorrections"
                  value={formData.cuesCorrections}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="Start typing..."
                  style={{ paddingRight: '60px' }}
                />
                <VoiceInput
                  textareaRef={getRef('cuesCorrections')}
                  onTranscript={text => setFormData(prev => ({ ...prev, cuesCorrections: text }))}
                />
              </div>
              <div className="char-counter">{formData.cuesCorrections.length} characters</div>
            </FormField>

            {/* Bucket 3: Coach's Eye */}
            <FormField label={
              <div className="coaches-eye-label">
                <span>Coach's Eye</span>
                <span className="eye-badge">Optional</span>
              </div>
            } optional>
              <PromptBox title={'\u2726 What belongs here'} items={COACHES_EYE_PROMPTS} />
              <div style={{ position: 'relative' }}>
                <textarea
                  ref={el => { getRef('coachesEye').current = el; }}
                  name="coachesEye"
                  value={formData.coachesEye}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="e.g. Martin said Rocket was particularly through today on the left rein. Used the image of 'leading him into the bend rather than pushing.' Said the connection in the half-pass was the best he's seen..."
                  style={{ paddingRight: '60px' }}
                />
                <VoiceInput
                  textareaRef={getRef('coachesEye')}
                  onTranscript={text => setFormData(prev => ({ ...prev, coachesEye: text }))}
                />
              </div>
            </FormField>
          </FormSection>

          {/* Section 3: Your Reflections */}
          <FormSection title="Your Reflections" description="Now that you've reviewed the guidance — what does it mean to you? What do you want to carry forward?">
            <FormField label="What stands out as you review this?" optional>
              <PromptBox title={'\u2726 Prompts to get you thinking'} items={REFLECTION_PROMPTS} />
              <div style={{ position: 'relative' }}>
                <textarea
                  ref={el => { getRef('riderReflections').current = el; }}
                  name="riderReflections"
                  value={formData.riderReflections}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="Your thoughts, reactions, and intentions after reviewing this guidance..."
                  style={{ paddingRight: '60px' }}
                />
                <VoiceInput
                  textareaRef={getRef('riderReflections')}
                  onTranscript={text => setFormData(prev => ({ ...prev, riderReflections: text }))}
                />
              </div>
            </FormField>

            <FormField label="My Top 3 Takeaways" optional helpText="Distilling to three makes these actionable — and gives your AI coaching a clear signal about your priorities.">
              <div className="takeaway-list">
                <div className="takeaway-row">
                  <div className="takeaway-number">1</div>
                  <input type="text" name="takeaway1" value={formData.takeaway1} onChange={handleChange} disabled={loading} placeholder="e.g. Timing of the kick in tempi changes" />
                </div>
                <div className="takeaway-row">
                  <div className="takeaway-number">2</div>
                  <input type="text" name="takeaway2" value={formData.takeaway2} onChange={handleChange} disabled={loading} placeholder="e.g. More bend in the right jaw during leg yield" />
                </div>
                <div className="takeaway-row">
                  <div className="takeaway-number">3</div>
                  <input type="text" name="takeaway3" value={formData.takeaway3} onChange={handleChange} disabled={loading} placeholder="e.g. Hold with the back through collection transitions" />
                </div>
              </div>
            </FormField>
          </FormSection>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/lesson-notes')} disabled={loading}>
              Cancel
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleSaveDraft} disabled={loading}>
              Save Draft
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : (isEdit ? 'Update Lesson Notes' : 'Save Lesson Notes')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
