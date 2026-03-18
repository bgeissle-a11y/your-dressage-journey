import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  getShowPreparation, updateShowPreparation,
  SHOW_TYPES, SHOW_EXPERIENCE_LEVELS, SHOW_PREP_STATUSES,
  RIDING_FREQUENCIES, COACH_ACCESS_OPTIONS, AVAILABLE_RESOURCES,
  resolveTestNames
} from '../../services';
import { getTestData, getShortLabel } from '../../services/testDatabase';
import { getEventPlannerStep } from '../../services/aiService';
import TestReferencePanel from '../TestReferencePanel/TestReferencePanel';
import EventPlannerOutput from '../EventPrep/EventPlannerOutput';
import '../Forms/Forms.css';
import '../../pages/Insights.css';
import './ShowPrep.css';

const TYPE_LABELS = Object.fromEntries(SHOW_TYPES.map(t => [t.value, t.label]));
const EXP_LABELS = Object.fromEntries(SHOW_EXPERIENCE_LEVELS.map(e => [e.value, e.label]));
const FREQ_LABELS = Object.fromEntries(RIDING_FREQUENCIES.map(f => [f.value, f.label]));
const COACH_LABELS = Object.fromEntries(COACH_ACCESS_OPTIONS.map(c => [c.value, c.label]));
const RESOURCE_LABELS = Object.fromEntries(AVAILABLE_RESOURCES.map(r => [r.value, r.label]));
const STATUS_LABELS = Object.fromEntries(SHOW_PREP_STATUSES.map(s => [s.value, s.label]));

const STEP_INFO = [
  null,
  { label: 'Analyzing test requirements...', estimate: '~1-2 min' },
  { label: 'Evaluating readiness...', estimate: '~1 min' },
  { label: 'Building preparation plan...', estimate: '~2-3 min' },
  { label: 'Creating show-day guidance...', estimate: '~1-2 min' },
];

export default function ShowPrepPlan() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();

  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  // AI Show Planner state — progressive sections
  const [aiSections, setAiSections] = useState({
    testRequirements: null,
    readinessAnalysis: null,
    preparationPlan: null,
    showDayGuidance: null,
  });
  const [aiMeta, setAiMeta] = useState({
    generatedAt: null,
    fromCache: false,
    stale: false,
    staleReason: null,
    eventPrepChanged: false,
  });
  const [aiStep, setAiStep] = useState(0);
  const [aiError, setAiError] = useState(null);
  const [failedStep, setFailedStep] = useState(null);
  const [checkingCache, setCheckingCache] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const cacheLoaded = useRef(false);
  const generationStartTime = useRef(null);
  const elapsedInterval = useRef(null);

  // Test Reference Panel state
  const [flagState, setFlagState] = useState({});
  const [activeTestId, setActiveTestId] = useState(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    loadPlan();
  }, [id]);

  // Elapsed time counter during generation
  useEffect(() => {
    if (aiStep >= 1 && aiStep <= 4) {
      if (!generationStartTime.current) {
        generationStartTime.current = Date.now();
        setElapsedSeconds(0);
      }
      elapsedInterval.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - generationStartTime.current) / 1000));
      }, 1000);
    } else {
      if (elapsedInterval.current) clearInterval(elapsedInterval.current);
      if (aiStep === 5 || aiStep === 0) generationStartTime.current = null;
    }
    return () => { if (elapsedInterval.current) clearInterval(elapsedInterval.current); };
  }, [aiStep]);

  useEffect(() => {
    if (plan?.generatedPlan?.generatedAt && !cacheLoaded.current && aiStep === 0 && !aiSections.testRequirements) {
      cacheLoaded.current = true;
      loadCachedPlan();
    }
  }, [plan]);

  // Derive selected tests from plan data
  const selectedTests = getSelectedTests(plan);

  // Auto-set active test
  useEffect(() => {
    if (selectedTests.length > 0 && !activeTestId) {
      setActiveTestId(selectedTests[0].value);
    }
  }, [selectedTests.length]);

  // Restore flag state from plan's flaggedByTest
  useEffect(() => {
    if (plan?.concerns?.flaggedByTest) {
      const restored = {};
      plan.concerns.flaggedByTest.forEach(entry => {
        restored[entry.testId] = {};
        (entry.flaggedItems || []).forEach(item => {
          restored[entry.testId][item.id] = true;
        });
      });
      setFlagState(restored);
    }
  }, [plan?.concerns?.flaggedByTest]);

  const totalFlagCount = Object.values(flagState).reduce((sum, testFlags) => {
    return sum + Object.values(testFlags).filter(Boolean).length;
  }, 0);

  function getSelectedTests(planData) {
    if (!planData) return [];
    // Support v2 structure (tests.selected) and v1 (testsSelected)
    const testIds = planData.tests?.selected || planData.testsSelected || [];
    return testIds.map(val => {
      const data = getTestData(val);
      return {
        value: val,
        label: data?.label || resolveTestNames([val])[0] || val
      };
    });
  }

  const handleFlagChange = useCallback((testId, itemId, isFlagged) => {
    setFlagState(prev => ({
      ...prev,
      [testId]: {
        ...prev[testId],
        [itemId]: isFlagged
      }
    }));
  }, []);

  function handleTestSwitch(testId) {
    setActiveTestId(testId);
  }

  async function loadPlan() {
    if (!id) return;
    setLoading(true);
    const result = await getShowPreparation(id);
    if (result.success) {
      setPlan(result.data);
    }
    setLoading(false);
  }

  async function loadCachedPlan() {
    setCheckingCache(true);
    setAiError(null);
    try {
      const result = await getEventPlannerStep({ showPrepPlanId: id, step: 1, cacheOnly: true });
      if (result.success && result.allSections && result.fromCache) {
        setAiSections({
          testRequirements: result.testRequirements,
          readinessAnalysis: result.readinessAnalysis,
          preparationPlan: result.preparationPlan,
          showDayGuidance: result.showDayGuidance,
        });
        setAiMeta({
          generatedAt: result.generatedAt,
          fromCache: true,
          stale: result.stale || false,
          staleReason: result.staleReason || null,
          eventPrepChanged: result.eventPrepChanged || false,
        });
        setAiStep(5);
      }
    } catch (err) {
      console.warn('No cached show plan:', err.message);
    } finally {
      setCheckingCache(false);
    }
  }

  async function generatePlan(forceRefresh = false, startFromStep = 1, initialData = null) {
    setAiError(null);
    setFailedStep(null);

    let accumulated;
    if (initialData) {
      accumulated = { testRequirements: null, readinessAnalysis: null, preparationPlan: null, showDayGuidance: null, ...initialData };
    } else if (startFromStep === 1) {
      accumulated = { testRequirements: null, readinessAnalysis: null, preparationPlan: null, showDayGuidance: null };
    } else {
      accumulated = { ...aiSections };
    }

    if (startFromStep === 1) {
      setAiSections(accumulated);
    } else {
      setAiSections({ ...accumulated });
    }

    for (let step = startFromStep; step <= 4; step++) {
      setAiStep(step);

      try {
        const payload = { showPrepPlanId: id, step };

        if (step === 1) {
          payload.forceRefresh = forceRefresh;
        }
        if (step >= 2) {
          payload.priorResults = {};
          payload.priorResults.testRequirements = accumulated.testRequirements;
          if (step >= 3) payload.priorResults.readinessAnalysis = accumulated.readinessAnalysis;
          if (step >= 4) payload.priorResults.preparationPlan = accumulated.preparationPlan;
        }

        const result = await getEventPlannerStep(payload);

        if (!result.success) {
          if (result.error === 'insufficient_data') {
            setAiError(result.message || 'Not enough data to generate a show plan.');
            setAiStep(0);
            return;
          }
          throw new Error(result.message || `Step ${step} failed.`);
        }

        if (result.allSections && result.fromCache) {
          setAiSections({
            testRequirements: result.testRequirements,
            readinessAnalysis: result.readinessAnalysis,
            preparationPlan: result.preparationPlan,
            showDayGuidance: result.showDayGuidance,
          });
          setAiMeta({
            generatedAt: result.generatedAt,
            fromCache: true,
            stale: result.stale || false,
            staleReason: result.staleReason || null,
            eventPrepChanged: result.eventPrepChanged || false,
          });
          setAiStep(5);
          return;
        }

        if (step === 1) {
          accumulated.testRequirements = result.testRequirements;
          setAiMeta({ generatedAt: null, fromCache: false, stale: false, staleReason: null, eventPrepChanged: false });
        } else if (step === 2) {
          accumulated.readinessAnalysis = result.readinessAnalysis;
        } else if (step === 3) {
          accumulated.preparationPlan = result.preparationPlan;
        } else if (step === 4) {
          accumulated.showDayGuidance = result.showDayGuidance;
          setAiMeta(prev => ({ ...prev, generatedAt: result.generatedAt }));
        }

        setAiSections({ ...accumulated });
      } catch (err) {
        console.error(`Show Planner step ${step} error:`, err);
        const isTimeout = err.code === 'deadline-exceeded' ||
          (err.message && (err.message.includes('deadline') || err.message.includes('DEADLINE') || err.message.includes('timed out')));
        const friendlyMessage = isTimeout
          ? 'The AI is taking longer than expected to generate this section. This can happen with complex test requirements. Please try again — it often works on the second attempt.'
          : (err.message || `An error occurred at step ${step}.`);
        setAiError(friendlyMessage);
        setFailedStep(step);
        setAiStep(0);
        return;
      }
    }

    setAiStep(5);
  }

  async function toggleTask(index) {
    if (!plan) return;
    const updated = [...(plan.prepTasks || [])];
    updated[index] = { ...updated[index], completed: !updated[index].completed };
    setPlan(prev => ({ ...prev, prepTasks: updated }));
    await updateShowPreparation(id, { prepTasks: updated });
  }

  function daysUntilShow() {
    const dateStart = plan?.showDateStart || plan?.showDetails?.dateStart;
    if (!dateStart) return null;
    const now = new Date();
    const show = new Date(dateStart + 'T00:00:00');
    return Math.ceil((show - now) / (1000 * 60 * 60 * 24));
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  const hasAnySections = aiSections.testRequirements || aiSections.readinessAnalysis ||
    aiSections.preparationPlan || aiSections.showDayGuidance;
  const isGenerating = aiStep >= 1 && aiStep <= 4;

  function formatElapsed(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  if (loading) {
    return <div className="loading-state">Loading show preparation plan...</div>;
  }

  if (!plan) {
    return (
      <div className="empty-state">
        <h3>Plan not found</h3>
        <Link to="/show-prep" className="btn-new">Back to Show Preps</Link>
      </div>
    );
  }

  // Support both v1 and v2 data shapes
  const horseName = plan.horseName || plan.horse?.name;
  const currentLevel = plan.currentLevel || plan.horse?.currentLevel;
  const showExperience = plan.showExperience || plan.horse?.showExperience;
  const showName = plan.showName || plan.showDetails?.name;
  const showLocation = plan.showLocation || plan.showDetails?.location;
  const showType = plan.showType || plan.showDetails?.type;
  const showTypeOther = plan.showTypeOther || plan.showDetails?.typeOther;
  const showDateStart = plan.showDateStart || plan.showDetails?.dateStart;
  const showDateEnd = plan.showDateEnd || plan.showDetails?.dateEnd;
  const goals = plan.goals || [];
  const concerns = plan.concerns?.additionalConcerns || (Array.isArray(plan.concerns) ? plan.concerns : []);
  const flaggedByTest = plan.concerns?.flaggedByTest || [];

  const days = daysUntilShow();
  const completedTasks = (plan.prepTasks || []).filter(t => t.completed).length;
  const totalTasks = (plan.prepTasks || []).length;
  const testIds = plan.tests?.selected || plan.testsSelected || [];
  const testNames = resolveTestNames(testIds);

  const showTypeLabel = showType === 'other'
    ? (showTypeOther || 'Other')
    : (TYPE_LABELS[showType] || showType);

  return (
    <div className="form-page">
      <div className="form-page-header">
        <h1>{showName}</h1>
        <p>
          {showTypeLabel}
          {showLocation && ` at ${showLocation}`}
        </p>
      </div>

      {/* Mobile sidebar toggle */}
      {selectedTests.length > 0 && (
        <button
          type="button"
          className="sp-mobile-sidebar-toggle"
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        >
          <span>Test Reference</span>
          {totalFlagCount > 0 && (
            <span className="sp-mobile-flag-badge">{totalFlagCount} flagged</span>
          )}
          <span className={`sp-mobile-arrow${mobileSidebarOpen ? ' open' : ''}`}>&#9660;</span>
        </button>
      )}

      {/* Mobile sidebar */}
      {mobileSidebarOpen && selectedTests.length > 0 && (
        <div className="sp-mobile-sidebar">
          <TestReferencePanel
            testId={activeTestId}
            onFlagChange={handleFlagChange}
            flagState={flagState}
            defaultTab="overview"
            compact={false}
            selectedTests={selectedTests}
            onTestSwitch={handleTestSwitch}
          />
        </div>
      )}

      <div className="sp-layout">
        {/* Desktop sidebar — Test Reference Panel */}
        {selectedTests.length > 0 && (
          <div className="sp-sidebar">
            <TestReferencePanel
              testId={activeTestId}
              onFlagChange={handleFlagChange}
              flagState={flagState}
              defaultTab="overview"
              compact={true}
              selectedTests={selectedTests}
              onTestSwitch={handleTestSwitch}
              sticky
            />
          </div>
        )}

        {/* Main content */}
        <div className="sp-form-col">
          <div className="form-card">
            {/* Show Overview */}
            <div className="form-section">
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                marginBottom: '1rem'
              }}>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#3A3A3A' }}>
                    {formatDate(showDateStart)}
                    {showDateEnd && ` \u2013 ${formatDate(showDateEnd)}`}
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {horseName && <span style={{ fontSize: '0.9rem', color: '#7A7A7A' }}>{horseName}</span>}
                    {currentLevel && <span style={{ fontSize: '0.9rem', color: '#7A7A7A' }}>{currentLevel}</span>}
                    <span className={`show-type-badge ${showType}`}>{showTypeLabel}</span>
                    <span className={`status-badge status-${plan.status === 'completed' ? 'resolved' : plan.status === 'active' ? 'ongoing' : 'active'}`}>
                      {STATUS_LABELS[plan.status] || plan.status}
                    </span>
                  </div>
                </div>
                {days !== null && days >= 0 && (
                  <div style={{ textAlign: 'center', padding: '12px 20px', background: '#FAF8F5', borderRadius: '12px', border: '1px solid #E0D5C7' }}>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', fontWeight: 600, color: '#8B7355' }}>{days}</div>
                    <div style={{ fontSize: '0.8rem', color: '#7A7A7A' }}>days to go</div>
                  </div>
                )}
              </div>

              {/* Tests */}
              {testNames.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <strong style={{ fontSize: '0.9rem' }}>Tests:</strong>
                  <div className="tests-list">
                    {testNames.map((name, i) => (
                      <span key={i} className="test-chip">{name}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Flagged movements summary */}
              {flaggedByTest.length > 0 && (
                <div className="sp-plan-flags-summary">
                  <div className="sp-plan-flags-label">Flagged for Prep</div>
                  <div className="sp-flags-chips">
                    {flaggedByTest.flatMap(entry =>
                      (entry.flaggedItems || []).map(item => (
                        <span key={`${entry.testId}-${item.id}`} className={`sp-flag-chip${item.coeff ? ' coeff' : ''}`}>
                          {selectedTests.length > 1 && (
                            <span className="sp-flag-test-badge">{getShortLabel(entry.testId)}</span>
                          )}
                          {item.text}
                          {item.coeff && <span className="sp-flag-x2">x2</span>}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <Link to={`/show-prep/${id}/edit`} className="btn btn-secondary" style={{ textDecoration: 'none', fontSize: '0.9rem', padding: '8px 16px' }}>Edit Details</Link>
                {aiStep === 0 && !hasAnySections && !checkingCache && (
                  <button className="btn-generate-plan" onClick={() => generatePlan()}>
                    Generate AI Show Plan
                  </button>
                )}
                {aiStep === 5 && (
                  <button
                    className="btn-generate-plan"
                    onClick={() => generatePlan(true)}
                    style={{ background: '#FAF8F5', color: '#8B7355', border: '1.5px solid #E0D5C7' }}
                  >
                    Regenerate Plan
                  </button>
                )}
              </div>
            </div>

            {/* Cache loading state */}
            {checkingCache && !isGenerating && (
              <div className="ep-cache-loading">
                <div className="spinner" style={{ width: '24px', height: '24px' }} />
                <p>Loading your plan...</p>
              </div>
            )}

            {/* Step Progress Indicator */}
            {isGenerating && (
              <div className="ep-loading">
                <div className="spinner" />
                <p>{STEP_INFO[aiStep]?.label}</p>
                <p className="ep-loading__detail">Step {aiStep} of 4</p>
                <p className="ep-elapsed">{formatElapsed(elapsedSeconds)} elapsed {STEP_INFO[aiStep]?.estimate && <span className="ep-estimate">({STEP_INFO[aiStep].estimate} for this step)</span>}</p>
                <div className="ep-step-progress">
                  {[1, 2, 3, 4].map(s => (
                    <div
                      key={s}
                      className={`ep-step-dot${s < aiStep ? ' ep-step-dot--done' : ''}${s === aiStep ? ' ep-step-dot--active' : ''}`}
                    />
                  ))}
                </div>
                <p className="ep-leave-hint">This takes a few minutes. You can leave this page and return — once complete, your plan will load instantly.</p>
              </div>
            )}

            {/* Error with Retry */}
            {aiError && aiStep === 0 && (
              <div className="ep-error">
                <p>{aiError}</p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  {failedStep && failedStep > 1 && (
                    <button onClick={() => generatePlan(false, failedStep)} className="btn-retry">
                      Retry Step {failedStep}
                    </button>
                  )}
                  <button onClick={() => generatePlan(true)} className="btn-retry">
                    {failedStep && failedStep > 1 ? 'Start Over' : 'Try Again'}
                  </button>
                </div>
              </div>
            )}

            {/* Progressive AI Output */}
            {hasAnySections && (
              <EventPlannerOutput
                data={{
                  ...aiSections,
                  generatedAt: aiMeta.generatedAt,
                  fromCache: aiMeta.fromCache,
                  stale: aiMeta.stale,
                  staleReason: aiMeta.staleReason,
                  eventPrepChanged: aiMeta.eventPrepChanged,
                }}
                isGenerating={isGenerating}
                currentStep={aiStep}
                onRegenerate={() => generatePlan(true)}
              />
            )}

            {/* Horse Context */}
            {(showExperience || horseName) && (
              <div className="form-section">
                <div className="form-section-header">
                  <h2 className="form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '30px', height: '30px', background: '#D4A574', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.9em' }}>&#x1F40E;</span>
                    {horseName}
                  </h2>
                </div>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                  {currentLevel && <span style={{ fontSize: '0.9rem', color: '#7A7A7A' }}><strong>Level:</strong> {currentLevel}</span>}
                  {showExperience && <span style={{ fontSize: '0.9rem', color: '#7A7A7A' }}><strong>Experience:</strong> {EXP_LABELS[showExperience] || showExperience}</span>}
                </div>
              </div>
            )}

            {/* Goals */}
            {goals.length > 0 && (
              <div className="form-section">
                <div className="form-section-header">
                  <h2 className="form-section-title">Goals</h2>
                </div>
                {goals.map((goal, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px 0',
                    borderBottom: i < goals.length - 1 ? '1px solid #F0EBE3' : 'none'
                  }}>
                    <div className="goal-number-badge">{i + 1}</div>
                    <span>{goal}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Concerns */}
            {concerns.length > 0 && (
              <div className="form-section">
                <div className="form-section-header">
                  <h2 className="form-section-title">Concerns</h2>
                </div>
                {concerns.map((concern, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px 0',
                    borderBottom: i < concerns.length - 1 ? '1px solid #F0EBE3' : 'none'
                  }}>
                    <div className="concern-number-badge">{i + 1}</div>
                    <span>{concern}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Resources */}
            {(plan.ridingFrequency || plan.resources?.ridingFrequency || plan.coachAccess || plan.resources?.coachAccess) && (
              <div className="form-section">
                <div className="form-section-header">
                  <h2 className="form-section-title">Resources</h2>
                </div>
                <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                  {(plan.ridingFrequency || plan.resources?.ridingFrequency) && (
                    <div><strong>Riding:</strong> {FREQ_LABELS[plan.ridingFrequency || plan.resources?.ridingFrequency] || plan.ridingFrequency || plan.resources?.ridingFrequency}</div>
                  )}
                  {(plan.coachAccess || plan.resources?.coachAccess) && (
                    <div><strong>Coach:</strong> {COACH_LABELS[plan.coachAccess || plan.resources?.coachAccess] || plan.coachAccess || plan.resources?.coachAccess}</div>
                  )}
                </div>
                {((plan.availableResources && plan.availableResources.length > 0) || (plan.resources?.available && plan.resources.available.length > 0)) && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <strong>Available:</strong>{' '}
                    {(plan.availableResources || plan.resources?.available || []).map(r => RESOURCE_LABELS[r] || r).join(', ')}
                  </div>
                )}
                {(plan.constraints || plan.resources?.constraints) && (
                  <div><strong>Constraints:</strong><p style={{ marginTop: '0.25rem', color: '#3A3A3A', lineHeight: 1.6 }}>{plan.constraints || plan.resources?.constraints}</p></div>
                )}
              </div>
            )}

            {/* Additional Info */}
            {(plan.additionalInfo) && (
              <div className="form-section">
                <div className="form-section-header">
                  <h2 className="form-section-title">Additional Details</h2>
                </div>
                <div><strong>Additional Context:</strong><p style={{ marginTop: '0.25rem', color: '#3A3A3A', lineHeight: 1.6 }}>{plan.additionalInfo}</p></div>
              </div>
            )}

            {/* Preparation Tasks */}
            {totalTasks > 0 && (
              <div className="form-section">
                <div className="form-section-header">
                  <h2 className="form-section-title">Preparation Tasks ({completedTasks}/{totalTasks})</h2>
                </div>
                {(plan.prepTasks || []).map((task, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 0',
                    borderBottom: '1px solid #F0EBE3',
                    opacity: task.completed ? 0.6 : 1
                  }}>
                    <input
                      type="checkbox"
                      checked={task.completed || false}
                      onChange={() => toggleTask(index)}
                      style={{ accentColor: '#8B7355' }}
                    />
                    <span style={{ textDecoration: task.completed ? 'line-through' : 'none', flex: 1 }}>{task.task}</span>
                    {task.dueDate && <span style={{ fontSize: '0.82rem', color: '#7A7A7A' }}>{task.dueDate}</span>}
                  </div>
                ))}
              </div>
            )}

            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/show-prep')}>
                Back to List
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
