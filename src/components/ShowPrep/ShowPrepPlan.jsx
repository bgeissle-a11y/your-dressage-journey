import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  getShowPreparation, updateShowPreparation,
  SHOW_TYPES, SHOW_EXPERIENCE_LEVELS, SHOW_PREP_STATUSES,
  RIDING_FREQUENCIES, COACH_ACCESS_OPTIONS, AVAILABLE_RESOURCES,
  resolveTestNames
} from '../../services';
import { getEventPlannerStep } from '../../services/aiService';
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

const STEP_LABELS = [
  '',
  'Analyzing test requirements...',
  'Evaluating readiness...',
  'Building preparation plan...',
  'Creating show-day guidance...',
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
  const cacheLoaded = useRef(false);

  useEffect(() => {
    loadPlan();
  }, [id]);

  useEffect(() => {
    if (plan?.generatedPlan?.generatedAt && !cacheLoaded.current && aiStep === 0 && !aiSections.testRequirements) {
      cacheLoaded.current = true;
      loadCachedPlan();
    }
  }, [plan]);

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
    setAiStep(1);
    setAiError(null);
    try {
      const result = await getEventPlannerStep({ showPrepPlanId: id, step: 1 });
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
      } else {
        setAiStep(0);
      }
    } catch (err) {
      console.warn('No cached show plan:', err.message);
      setAiStep(0);
    }
  }

  async function generatePlan(forceRefresh = false, startFromStep = 1) {
    setAiError(null);
    setFailedStep(null);

    let accumulated = startFromStep === 1
      ? { testRequirements: null, readinessAnalysis: null, preparationPlan: null, showDayGuidance: null }
      : { ...aiSections };

    if (startFromStep === 1) {
      setAiSections(accumulated);
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
        setAiError(err.message || `An error occurred at step ${step}.`);
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
    if (!plan?.showDateStart) return null;
    const now = new Date();
    const show = new Date(plan.showDateStart + 'T00:00:00');
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

  const days = daysUntilShow();
  const completedTasks = (plan.prepTasks || []).filter(t => t.completed).length;
  const totalTasks = (plan.prepTasks || []).length;
  const testNames = resolveTestNames(plan.testsSelected);

  const showTypeLabel = plan.showType === 'other'
    ? (plan.showTypeOther || 'Other')
    : (TYPE_LABELS[plan.showType] || plan.showType);

  return (
    <div className="form-page">
      <div className="form-page-header">
        <h1>{plan.showName}</h1>
        <p>
          {showTypeLabel}
          {plan.showLocation && ` at ${plan.showLocation}`}
        </p>
      </div>

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
                {formatDate(plan.showDateStart)}
                {plan.showDateEnd && ` \u2013 ${formatDate(plan.showDateEnd)}`}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                {plan.horseName && <span style={{ fontSize: '0.9rem', color: '#7A7A7A' }}>{plan.horseName}</span>}
                {plan.currentLevel && <span style={{ fontSize: '0.9rem', color: '#7A7A7A' }}>{plan.currentLevel}</span>}
                <span className={`show-type-badge ${plan.showType}`}>{showTypeLabel}</span>
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

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Link to={`/show-prep/${id}/edit`} className="btn btn-secondary" style={{ textDecoration: 'none', fontSize: '0.9rem', padding: '8px 16px' }}>Edit Details</Link>
            {aiStep === 0 && !hasAnySections && (
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

        {/* Step Progress Indicator */}
        {isGenerating && (
          <div className="ep-loading">
            <div className="spinner" />
            <p>{STEP_LABELS[aiStep]}</p>
            <p className="ep-loading__detail">Step {aiStep} of 4</p>
            <div className="ep-step-progress">
              {[1, 2, 3, 4].map(s => (
                <div
                  key={s}
                  className={`ep-step-dot${s < aiStep ? ' ep-step-dot--done' : ''}${s === aiStep ? ' ep-step-dot--active' : ''}`}
                />
              ))}
            </div>
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
        {(plan.showExperience || plan.currentChallenges || plan.recentProgress) && (
          <div className="form-section">
            <div className="form-section-header">
              <h2 className="form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '30px', height: '30px', background: '#D4A574', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.9em' }}>&#x1F40E;</span>
                {plan.horseName}
              </h2>
            </div>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              {plan.currentLevel && <span style={{ fontSize: '0.9rem', color: '#7A7A7A' }}><strong>Level:</strong> {plan.currentLevel}</span>}
              {plan.showExperience && <span style={{ fontSize: '0.9rem', color: '#7A7A7A' }}><strong>Experience:</strong> {EXP_LABELS[plan.showExperience] || plan.showExperience}</span>}
            </div>
            {plan.currentChallenges && <div style={{ marginBottom: '0.75rem' }}><strong>Current Challenges:</strong><p style={{ marginTop: '0.25rem', color: '#3A3A3A', lineHeight: 1.6 }}>{plan.currentChallenges}</p></div>}
            {plan.recentProgress && <div style={{ marginBottom: '0.75rem' }}><strong>Recent Progress:</strong><p style={{ marginTop: '0.25rem', color: '#3A3A3A', lineHeight: 1.6 }}>{plan.recentProgress}</p></div>}
          </div>
        )}

        {/* Goals */}
        {plan.goals && plan.goals.length > 0 && (
          <div className="form-section">
            <div className="form-section-header">
              <h2 className="form-section-title">Goals</h2>
            </div>
            {plan.goals.map((goal, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '8px 0',
                borderBottom: i < plan.goals.length - 1 ? '1px solid #F0EBE3' : 'none'
              }}>
                <div className="goal-number-badge">{i + 1}</div>
                <span>{goal}</span>
              </div>
            ))}
          </div>
        )}

        {/* Concerns */}
        {plan.concerns && plan.concerns.length > 0 && (
          <div className="form-section">
            <div className="form-section-header">
              <h2 className="form-section-title">Concerns</h2>
            </div>
            {plan.concerns.map((concern, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '8px 0',
                borderBottom: i < plan.concerns.length - 1 ? '1px solid #F0EBE3' : 'none'
              }}>
                <div className="concern-number-badge">{i + 1}</div>
                <span>{concern}</span>
              </div>
            ))}
          </div>
        )}

        {/* Resources */}
        {(plan.ridingFrequency || plan.coachAccess || (plan.availableResources && plan.availableResources.length > 0)) && (
          <div className="form-section">
            <div className="form-section-header">
              <h2 className="form-section-title">Resources</h2>
            </div>
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              {plan.ridingFrequency && <div><strong>Riding:</strong> {FREQ_LABELS[plan.ridingFrequency] || plan.ridingFrequency}</div>}
              {plan.coachAccess && <div><strong>Coach:</strong> {COACH_LABELS[plan.coachAccess] || plan.coachAccess}</div>}
            </div>
            {plan.availableResources && plan.availableResources.length > 0 && (
              <div style={{ marginBottom: '0.75rem' }}>
                <strong>Available:</strong>{' '}
                {plan.availableResources.map(r => RESOURCE_LABELS[r] || r).join(', ')}
              </div>
            )}
            {plan.constraints && <div><strong>Constraints:</strong><p style={{ marginTop: '0.25rem', color: '#3A3A3A', lineHeight: 1.6 }}>{plan.constraints}</p></div>}
          </div>
        )}

        {/* Additional Info */}
        {plan.additionalInfo && (
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
  );
}
