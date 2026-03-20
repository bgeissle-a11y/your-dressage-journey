import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import useJourneyProgress from './useJourneyProgress';
import './QuickStartMap.css';

const REFLECTION_LABELS = {
  personal:   { abbrev: 'PM', label: 'Personal Milestone' },
  validation: { abbrev: 'EV', label: 'External Validation' },
  aha:        { abbrev: 'AH', label: 'Aha Moment' },
  obstacle:   { abbrev: 'OB', label: 'Obstacle' },
  connection: { abbrev: 'CO', label: 'Connection' },
  feel:       { abbrev: 'FB', label: 'Feel/Body Awareness' },
};

function getProgressPct(progress) {
  let done = 0;
  if (progress.riderProfileComplete) done++;
  if (progress.horseProfileComplete) done++;
  done += Object.values(progress.reflectionsByCategory).filter(Boolean).length;
  done += Math.min(progress.debriefCount, 5);
  return Math.round((done / 14) * 100);
}

function getYAHText(progress) {
  const refDone = Object.values(progress.reflectionsByCategory).every(Boolean);
  const debDone = progress.debriefCount >= 5;
  const coreDone = refDone && debDone;

  if (!progress.riderProfileComplete) return 'Start your journey \u2014 create your Rider Profile';
  if (!progress.horseProfileComplete) return 'Next: create your Horse Profile(s)';
  if (!coreDone) {
    const refCount = Object.values(progress.reflectionsByCategory).filter(Boolean).length;
    return `Core practice in progress: ${refCount}/6 reflections \u00B7 ${Math.min(progress.debriefCount, 5)}/5 debriefs`;
  }
  return 'Outputs unlocked \u2014 keep riding and building your data, or explore a new path';
}

function QuickStartMapSkeleton() {
  return (
    <div className="qsm-page">
      <div className="qsm-header">
        <div className="qsm-skeleton-bar" style={{ width: '140px', height: '14px', margin: '0 auto 8px' }} />
        <div className="qsm-skeleton-bar" style={{ width: '280px', height: '32px', margin: '0 auto' }} />
      </div>
      <div className="qsm-skeleton-bar" style={{ height: '44px', marginBottom: '28px', borderRadius: '8px' }} />
      <div className="qsm-progress-row">
        <div className="qsm-skeleton-bar" style={{ width: '110px', height: '12px' }} />
        <div className="qsm-skeleton-bar" style={{ flex: 1, height: '7px' }} />
        <div className="qsm-skeleton-bar" style={{ width: '40px', height: '13px' }} />
      </div>
      <div className="qsm-skeleton-bar" style={{ height: '40px', marginBottom: '28px', borderRadius: '8px' }} />
      {[1, 2].map((i) => (
        <div key={i} className="qsm-station" style={{ marginBottom: '16px' }}>
          <div className="qsm-station-col">
            <div className="qsm-skeleton-bar" style={{ width: '20px', height: '20px', borderRadius: '50%' }} />
            <div className="qsm-skeleton-bar" style={{ width: '4px', flex: 1, minHeight: '20px' }} />
          </div>
          <div className="qsm-skeleton-bar" style={{ flex: 1, height: '100px', borderRadius: '10px' }} />
        </div>
      ))}
      <div style={{ display: 'flex', gap: '14px', marginLeft: '60px', marginTop: '16px' }}>
        <div className="qsm-skeleton-bar" style={{ flex: 1, height: '180px', borderRadius: '10px' }} />
        <div className="qsm-skeleton-bar" style={{ flex: 1, height: '180px', borderRadius: '10px' }} />
      </div>
    </div>
  );
}

export default function QuickStartMap() {
  const { progress, loading } = useJourneyProgress();

  const pct = useMemo(() => getProgressPct(progress), [progress]);
  const yahText = useMemo(() => getYAHText(progress), [progress]);

  const refDone = Object.values(progress.reflectionsByCategory).every(Boolean);
  const debDone = progress.debriefCount >= 5;
  const coreDone = refDone && debDone;

  if (loading) return <QuickStartMapSkeleton />;

  return (
    <div className="qsm-page">

      {/* HEADER */}
      <div className="qsm-header">
        <div className="qsm-subtitle">Quick Start Guide</div>
        <h1>Your Dressage Journey</h1>
      </div>

      {/* LEGEND */}
      <div className="qsm-legend">
        <div className="qsm-legend-item">
          <div className="qsm-legend-line" style={{ background: 'var(--qsm-track)' }} />
          Required path
        </div>
        <div className="qsm-legend-item">
          <div className="qsm-legend-dashed" style={{ borderColor: 'var(--qsm-opt)' }} />
          <span style={{ color: 'var(--qsm-opt)' }}>Optional / any time</span>
        </div>
        <div className="qsm-legend-item">
          <div className="qsm-legend-dot" style={{ background: 'var(--qsm-gold)' }} />
          Completed
        </div>
        <div className="qsm-legend-item">
          <div className="qsm-legend-dot" style={{ background: 'var(--qsm-you-are-here)' }} />
          You are here
        </div>
        <div className="qsm-legend-item">
          <div className="qsm-legend-dot" style={{ background: 'var(--qsm-output-teal)' }} />
          Output unlocked
        </div>
      </div>

      {/* PROGRESS BAR */}
      <div className="qsm-progress-row">
        <div className="qsm-progress-label">Your progress</div>
        <div className="qsm-progress-bar">
          <div className="qsm-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="qsm-progress-pct">{pct}%</div>
      </div>

      {/* YOU ARE HERE */}
      <div className="qsm-yah-bar">
        <div className="qsm-yah-pin" />
        <span>{yahText}</span>
      </div>

      {/* ═══════════ FOUNDATION ═══════════ */}
      <div className="qsm-section-label">Foundation</div>

      {/* Step 1 — Rider Profile */}
      <div className="qsm-station">
        <div className="qsm-station-col">
          <div className={`qsm-station-node ${progress.riderProfileComplete ? 'done' : ''}`} />
          <div className="qsm-down-line" />
        </div>
        <div className={`qsm-station-card ${progress.riderProfileComplete ? 'done' : ''}`}>
          <div className="qsm-step-tag">Step 1 · Required</div>
          <div className="qsm-card-title">Create Your Rider Profile</div>
          <div className="qsm-card-desc">Your background, goals, training history, and learning style. This context shapes everything that follows.</div>
          <Link to="/profile/rider" className="qsm-card-link" onClick={(e) => e.stopPropagation()}>→ Open Rider Profile</Link>
        </div>
      </div>

      {/* Step 2 — Horse Profile */}
      <div className="qsm-station">
        <div className="qsm-station-col">
          <div className={`qsm-station-node ${progress.horseProfileComplete ? 'done' : ''}`} />
          <div className="qsm-down-line" />
        </div>
        <div className={`qsm-station-card ${progress.horseProfileComplete ? 'done' : ''}`}>
          <div className="qsm-step-tag">Step 2 · Required</div>
          <div className="qsm-card-title">Create Your Horse Profile(s)</div>
          <div className="qsm-card-desc">One profile per horse. Include movement tendencies, asymmetries, and your partnership history.</div>
          <Link to="/horses/new" className="qsm-card-link" onClick={(e) => e.stopPropagation()}>→ Open Horse Profile</Link>
        </div>
      </div>

      {/* Optional: Horse Health */}
      <div className="qsm-opt-cluster">
        <div className={`qsm-opt-card ${progress.hasHealthLog ? 'done' : ''}`}>
          <div className="qsm-opt-title">
            <span className={`qsm-opt-node ${progress.hasHealthLog ? 'done' : ''}`} />
            Horse Health &amp; Soundness Log
          </div>
          <div className="qsm-opt-desc">Track health events, vet visits, bodywork, and soundness observations. Use at any time throughout your journey.</div>
          <Link to="/horse-health/new" className="qsm-opt-link-sm" onClick={(e) => e.stopPropagation()}>→ Open Health Log</Link>
        </div>
      </div>

      {/* Optional section header */}
      <div className="qsm-opt-section-header">Optional · Available at any time</div>

      {/* Optional: Self-assessments row 1 */}
      <div className="qsm-opt-cluster">
        <div className={`qsm-opt-card ${progress.riderAssessmentComplete ? 'done' : ''}`}>
          <div className="qsm-opt-title">
            <span className={`qsm-opt-node ${progress.riderAssessmentComplete ? 'done' : ''}`} />
            Rider Self-Assessment
          </div>
          <div className="qsm-opt-desc">Mental state, focus, and rider patterns.<br /><strong style={{ color: 'var(--qsm-opt)' }}>Required for Grand Prix Thinking path.</strong></div>
          <Link to="/rider-assessments/new" className="qsm-opt-link-sm" onClick={(e) => e.stopPropagation()}>→ Open Assessment</Link>
        </div>
        <div className={`qsm-opt-card ${progress.physicalAssessmentComplete ? 'done' : ''}`}>
          <div className="qsm-opt-title">
            <span className={`qsm-opt-node ${progress.physicalAssessmentComplete ? 'done' : ''}`} />
            Physical Self-Assessment
          </div>
          <div className="qsm-opt-desc">Body awareness and asymmetry mapping.<br /><strong style={{ color: 'var(--qsm-opt)' }}>Required for Physical Insights path.</strong></div>
          <Link to="/physical-assessments/new" className="qsm-opt-link-sm" onClick={(e) => e.stopPropagation()}>→ Open Assessment</Link>
        </div>
      </div>

      {/* Optional: Self-assessments row 2 */}
      <div className="qsm-opt-cluster" style={{ marginTop: '8px' }}>
        <div className={`qsm-opt-card ${progress.techPhilAssessmentComplete ? 'done' : ''}`}>
          <div className="qsm-opt-title">
            <span className={`qsm-opt-node ${progress.techPhilAssessmentComplete ? 'done' : ''}`} />
            Technical &amp; Philosophical Assessment
          </div>
          <div className="qsm-opt-desc">Explore your riding philosophy, training values, and technical self-perception. Deepens the coaching dialogue.</div>
          <Link to="/technical-assessments/new" className="qsm-opt-link-sm" onClick={(e) => e.stopPropagation()}>→ Open Assessment</Link>
        </div>
        <div className={`qsm-opt-card ${progress.hasObservations ? 'done' : ''}`}>
          <div className="qsm-opt-title">
            <span className={`qsm-opt-node ${progress.hasObservations ? 'done' : ''}`} />
            Observations of Others
          </div>
          <div className="qsm-opt-desc">Log insights from watching lessons, clinics, or other riders. Patterns here inform your coaching.</div>
          <Link to="/observations/new" className="qsm-opt-link-sm" onClick={(e) => e.stopPropagation()}>→ Open Form</Link>
        </div>
      </div>

      {/* Optional: Journey Event Log + Lesson Notes */}
      <div className="qsm-opt-cluster" style={{ marginTop: '8px', marginBottom: '4px' }}>
        <div className={`qsm-opt-card ${progress.hasEventLog ? 'done' : ''}`}>
          <div className="qsm-opt-title">
            <span className={`qsm-opt-node ${progress.hasEventLog ? 'done' : ''}`} />
            Journey Event Log
          </div>
          <div className="qsm-opt-desc">Record significant events shaping your journey — injury, life changes, breakthroughs, setbacks.</div>
          <Link to="/events/new" className="qsm-opt-link-sm" onClick={(e) => e.stopPropagation()}>→ Open Log</Link>
        </div>
        <div className={`qsm-opt-card ${progress.hasLessonNotes ? 'done' : ''}`}>
          <div className="qsm-opt-title">
            <span className={`qsm-opt-node ${progress.hasLessonNotes ? 'done' : ''}`} />
            Lesson Notes
          </div>
          <div className="qsm-opt-desc">Capture instructor guidance, cues, corrections, and your takeaways after lessons or clinics.</div>
          <Link to="/lesson-notes/new" className="qsm-opt-link-sm" onClick={(e) => e.stopPropagation()}>→ Open Lesson Notes</Link>
        </div>
      </div>

      {/* Optional: Rider's Toolkit */}
      <div className="qsm-opt-cluster" style={{ marginTop: '8px', marginBottom: '4px' }}>
        <div className={`qsm-opt-card ${progress.hasToolkitEntries ? 'done' : ''}`}>
          <div className="qsm-opt-title">
            <span className={`qsm-opt-node ${progress.hasToolkitEntries ? 'done' : ''}`} />
            Rider&#39;s Toolkit
          </div>
          <div className="qsm-opt-desc">Catalog off-horse discoveries — exercises, supplements, books, recovery practices. Your personal reference for things that might support your riding.</div>
          <Link to="/toolkit/new" className="qsm-opt-link-sm" onClick={(e) => e.stopPropagation()}>→ Open Toolkit</Link>
        </div>
      </div>

      {/* CONNECTOR */}
      <div className="qsm-connector" style={{ marginTop: '8px' }} />

      {/* ═══════════ CORE PRACTICE ═══════════ */}
      <div className="qsm-section-label">Core Practice — Two Parallel Tracks</div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, marginBottom: '4px' }}>
        <div className="qsm-station-col" style={{ paddingTop: '10px' }}>
          <div className={`qsm-station-node ${coreDone ? 'done' : ''}`} style={{ borderColor: 'var(--qsm-gold)' }} />
          <div className="qsm-down-line" />
        </div>
        <div style={{ flex: 1, paddingTop: '7px', paddingBottom: '4px' }}>
          <div className="qsm-step-tag">Step 3 · Required — Complete Both Tracks</div>
          <div style={{ fontSize: '13px', color: 'var(--qsm-ink-mid)' }}>These run in parallel. Work both as part of your regular training.</div>
        </div>
      </div>

      <div className="qsm-dual-wrap">
        <div className="qsm-dual-row">
          {/* Reflections */}
          <div className={`qsm-dual-card ${refDone ? 'done' : ''}`}>
            <div>
              <span className={`qsm-dual-node ${refDone ? 'done' : ''}`} />
              <span className="qsm-dual-title">Journey Reflections</span>
            </div>
            <div className="qsm-dual-count">6</div>
            <div className="qsm-dual-sublabel">one in each category</div>
            <div className="qsm-dual-desc">Personal Milestone · External Validation · Aha Moment · Obstacle · Connection · Feel/Body Awareness</div>
            <div className="qsm-ticks">
              {Object.entries(REFLECTION_LABELS).map(([key, { abbrev, label }]) => (
                <div
                  key={key}
                  className={`qsm-tick ${progress.reflectionsByCategory[key] ? 'checked' : ''}`}
                  title={progress.reflectionsByCategory[key] ? `Completed — ${label}` : label}
                >
                  {abbrev}
                </div>
              ))}
            </div>
            <Link to="/reflections/new" className="qsm-card-link" style={{ marginTop: '10px', fontSize: '11.5px' }} onClick={(e) => e.stopPropagation()}>→ Open Reflection Form</Link>
          </div>

          {/* Debriefs */}
          <div className={`qsm-dual-card ${debDone ? 'done' : ''}`}>
            <div>
              <span className={`qsm-dual-node ${debDone ? 'done' : ''}`} />
              <span className="qsm-dual-title">Ride Debriefs</span>
            </div>
            <div className="qsm-dual-count">5</div>
            <div className="qsm-dual-sublabel">minimum to unlock outputs</div>
            <div className="qsm-dual-desc">Post-ride reflection with intentions. Captures what you felt, noticed, and are working toward.</div>
            <div className="qsm-dual-note">✎ Customize your intentions — don't keep the defaults. Make them specific to your current goals.</div>
            <div className="qsm-ticks">
              {[1, 2, 3, 4, 5].map((n) => (
                <div
                  key={n}
                  className={`qsm-tick ${progress.debriefCount >= n ? 'checked' : ''}`}
                  title={progress.debriefCount >= n ? `Debrief ${n} completed` : `Debrief ${n}`}
                >
                  {n}
                </div>
              ))}
            </div>
            <Link to="/debriefs/new" className="qsm-card-link" style={{ marginTop: '10px', fontSize: '11.5px' }} onClick={(e) => e.stopPropagation()}>→ Open Debrief Form</Link>
          </div>
        </div>
      </div>

      {/* CONNECTOR */}
      <div className="qsm-connector" style={{ marginTop: '8px' }} />

      {/* ═══════════ OUTPUTS ═══════════ */}
      <div className="qsm-section-label">Your First Outputs Unlocked</div>

      {/* Outputs station node — no down-line */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, marginBottom: '8px' }}>
        <div className="qsm-station-col" style={{ paddingTop: '10px' }}>
          <div className={`qsm-station-node ${coreDone ? 'done' : ''}`} style={{ borderColor: 'var(--qsm-output-teal)' }} />
        </div>
        <div style={{ flex: 1, paddingTop: '7px' }}>
          <div className="qsm-step-tag qsm-out-tag">Review Point — Pause &amp; Reflect</div>
          <div style={{ fontSize: '13px', color: 'var(--qsm-ink-mid)', marginBottom: '10px' }}>Three outputs are now available. Take time with each before continuing.</div>
        </div>
      </div>

      <div className="qsm-outputs-zone">
        <div className="qsm-outputs-row">
          <Link to="/outputs-tips-and-faq" className="qsm-out-card">
            <div className="qsm-out-icon">🗺</div>
            <div className="qsm-out-title">Journey Map</div>
            <div className="qsm-out-desc">Where you have been — a narrative arc of your training history.</div>
          </Link>
          <Link to="/outputs-tips-and-faq" className="qsm-out-card">
            <div className="qsm-out-icon">🧭</div>
            <div className="qsm-out-title">Coaching Output</div>
            <div className="qsm-out-desc">Four coaching voices offering insight and direction for what comes next.</div>
          </Link>
          <Link to="/outputs-tips-and-faq" className="qsm-out-card">
            <div className="qsm-out-icon">📊</div>
            <div className="qsm-out-title">Data Visualization</div>
            <div className="qsm-out-desc">A quantitative picture of your patterns and what the numbers reveal.</div>
          </Link>
        </div>
      </div>

      {/* Continue loop */}
      <div className="qsm-loop-box">
        <div className="qsm-loop-icon">↺</div>
        <div>
          <strong style={{ color: 'var(--qsm-ink)', fontSize: '13.5px' }}>Keep going — this is your ongoing practice.</strong>
          <div style={{ marginTop: '3px', fontSize: '12.5px', lineHeight: '1.55' }}>Continue adding reflections, debriefs, observations, and events. Update your self-assessments as you evolve. Request updated outputs as your data grows — the more you add, the richer the analysis becomes.</div>
        </div>
      </div>

      {/* ═══════════ DIVERGE ═══════════ */}
      <div className="qsm-diverge-wrap">
        <div className="qsm-diverge-note">
          These paths can be taken at any time once you have established your practice.<br />
          Each is independent of the others.
        </div>

        <div className="qsm-branches">
          {/* Mental Skills Path */}
          <div className="qsm-branch qsm-b-purple">
            <div className="qsm-branch-hdr">
              <div className={`qsm-branch-node ${progress.riderAssessmentComplete ? 'done' : ''}`} />
              <div className="qsm-branch-title-txt">Mental Skills Path</div>
            </div>
            <div className="qsm-branch-body">
              <div className="qsm-branch-req">
                <strong>Requires:</strong> Rider Self-Assessment (mental state) completed
              </div>
              <div className="qsm-branch-desc">Explore focus, nerves, competition mindset, and the inner game of riding.</div>
              <div className="qsm-branch-out">
                <div className="qsm-branch-out-icon">🏆</div>
                <div>
                  <div className="qsm-branch-out-title">Grand Prix Thinking</div>
                  <div className="qsm-branch-out-desc">Mental performance paths + training trajectory — think like a Grand Prix rider at every level.</div>
                </div>
              </div>
              <Link to="/rider-assessments/new" className="qsm-branch-link" onClick={(e) => e.stopPropagation()}>→ Complete Assessment</Link>
            </div>
          </div>

          {/* Physical Insights Path */}
          <div className="qsm-branch qsm-b-blue">
            <div className="qsm-branch-hdr">
              <div className={`qsm-branch-node ${progress.physicalAssessmentComplete ? 'done' : ''}`} />
              <div className="qsm-branch-title-txt">Physical Insights Path</div>
            </div>
            <div className="qsm-branch-body">
              <div className="qsm-branch-req">
                <strong>Requires:</strong> Physical Self-Assessment completed
              </div>
              <div className="qsm-branch-desc">Understand how your body affects your riding — asymmetries, position patterns, physical development.</div>
              <div className="qsm-branch-out">
                <div className="qsm-branch-out-icon">⚖️</div>
                <div>
                  <div className="qsm-branch-out-title">Physical Guidance</div>
                  <div className="qsm-branch-out-desc">Targeted insights on how your physical patterns show up in your riding and how to address them.</div>
                </div>
              </div>
              <Link to="/physical-assessments/new" className="qsm-branch-link" onClick={(e) => e.stopPropagation()}>→ Complete Assessment</Link>
            </div>
          </div>

          {/* Show Planning Path */}
          <div className="qsm-branch qsm-b-rust">
            <div className="qsm-branch-hdr">
              <div className={`qsm-branch-node ${progress.riderProfileComplete && progress.horseProfileComplete ? 'done' : ''}`} />
              <div className="qsm-branch-title-txt">Show Planning Path</div>
            </div>
            <div className="qsm-branch-body">
              <div className="qsm-branch-req">
                <strong>Requires:</strong> Basic rider &amp; horse profiles complete
              </div>
              <div className="qsm-branch-desc">Prepare for competition with structured show preparation — from schedule to mental readiness.</div>
              <div className="qsm-branch-out">
                <div className="qsm-branch-out-icon">📋</div>
                <div>
                  <div className="qsm-branch-out-title">Detailed Show Plan</div>
                  <div className="qsm-branch-out-desc">Personalized competition plan: test strategy, warm-up, packing list, and readiness assessment.</div>
                </div>
              </div>
              <Link to="/show-prep/new" className="qsm-branch-link" onClick={(e) => e.stopPropagation()}>→ Open Show Planner</Link>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="qsm-footer-note">
        <strong>Your progress updates automatically</strong> as you complete forms. Your "You Are Here" marker and progress bar reflect your real data.
        Come back to this map any time you need a sense of where you stand and what comes next.
      </div>
    </div>
  );
}
