import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  generateLessonPrepSummary,
  buildLessonPrepMailto,
} from '../services/lessonPrepService';
import { loadAllSettings } from '../services';
import './LessonPrep.css';

function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getFirstName(fullName) {
  if (!fullName) return 'Rider';
  return fullName.split(/\s+/)[0];
}

export default function LessonPrep() {
  const { currentUser } = useAuth();
  const [briefData, setBriefData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [coaches, setCoaches] = useState([]);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      const [summary, settings] = await Promise.all([
        generateLessonPrepSummary(),
        loadAllSettings(currentUser.uid),
      ]);
      if (cancelled) return;

      if (summary.success) {
        setBriefData(summary.briefData);
      } else {
        setError(summary.error || 'Unable to assemble your lesson prep summary.');
      }

      if (settings?.success) {
        const active = (settings.data.coaches || []).filter((c) => c.sharingEnabled);
        setCoaches(active);
      }
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [currentUser]);

  if (loading) {
    return (
      <div className="lesson-prep-page">
        <div className="lesson-prep-wrap">
          <div className="lesson-prep-loading">Assembling your pre-lesson summary&hellip;</div>
        </div>
      </div>
    );
  }

  if (error || !briefData) {
    return (
      <div className="lesson-prep-page">
        <div className="lesson-prep-wrap">
          <div className="lesson-prep-error">
            {error || 'No summary available yet.'}
          </div>
        </div>
      </div>
    );
  }

  const firstName = briefData.firstName || getFirstName(briefData.riderName);
  const horses = briefData.horseNames || [];
  const twoCol = (briefData.lessonTakeaways?.length > 0) ||
    (briefData.ahas?.length > 0 || briefData.obstacles?.length > 0);
  const showBlock = briefData.showPrepData;
  const primaryCoach = coaches[0];

  return (
    <div className="lesson-prep-page">
      <div className="lesson-prep-wrap">
        <div className="lp-top-brand">
          <div className="lp-brand-name">Your Dressage Journey</div>
          <div className="lp-week-label">Week of {briefData.weekOf}</div>
        </div>

        <div className="lp-summary-card">
          <div className="lp-hero">
            <div className="lp-hero-top">
              <div>
                <div className="lp-rider-name">{firstName}</div>
                {horses.length > 0 && (
                  <div className="lp-horse-name">{horses.join(' & ')}</div>
                )}
              </div>
              <div className="lp-meta-stack">
                {briefData.lastEntryDate && (
                  <div className="lp-meta-line">Last ride <span>{formatDate(briefData.lastEntryDate)}</span></div>
                )}
                <div className="lp-meta-line">Rides (14 days) <span>{briefData.ridesLast14}</span></div>
              </div>
            </div>
            <div className="lp-invitation">
              <strong>Before your lesson — 60 seconds.</strong>{' '}
              This is your answer to "how's it been going?" Read it, own it, then tell your coach.
            </div>
          </div>

          {(briefData.levelLabel || briefData.activePathLabel) && (
            <div className="lp-level-strip">
              <div className="lp-level-text">
                {briefData.levelLabel || ''}
                {briefData.targetLevelLabel && ` \u00b7 Working toward ${briefData.targetLevelLabel}`}
              </div>
              {briefData.trajectorySnippet && (
                <div className="lp-trajectory-pill">{'\u2197'} {briefData.trajectorySnippet}</div>
              )}
            </div>
          )}

          {briefData.priorityThisWeek && (
            <div className="lp-section lp-focus-section">
              <div className="lp-section-label">What you're working on this week</div>
              <div className="lp-section-body">{briefData.priorityThisWeek}</div>
            </div>
          )}

          {briefData.aiCoachInsight?.snippet && (
            <div className="lp-section lp-insight-section">
              <div className="lp-section-label">
                What your coaching analysis noticed
                <span className="lp-voice-chip">{briefData.aiCoachInsight.voiceName}</span>
              </div>
              <div className="lp-section-body">{briefData.aiCoachInsight.snippet}</div>
            </div>
          )}

          {twoCol && (
            <div className="lp-two-col">
              {briefData.lessonTakeaways?.length > 0 && (
                <div className="lp-section">
                  <div className="lp-section-label">Rider-identified lesson insights</div>
                  <ul className="lp-bullet-list">
                    {briefData.lessonTakeaways.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}
              {(briefData.ahas?.length > 0 || briefData.obstacles?.length > 0) && (
                <div className="lp-section">
                  <div className="lp-section-label">Rider-identified insights</div>
                  {briefData.ahas?.length > 0 && (
                    <div className="lp-moment-block">
                      <div className="lp-sub-label">{'\u2726'} What clicked</div>
                      <ul className="lp-bullet-list lp-aha">
                        {briefData.ahas.map((a, i) => <li key={i}>{a}</li>)}
                      </ul>
                    </div>
                  )}
                  {briefData.obstacles?.length > 0 && (
                    <div className="lp-moment-block">
                      <div className="lp-sub-label">{'\u25b3'} Still working on</div>
                      <ul className="lp-bullet-list lp-obstacle">
                        {briefData.obstacles.map((o, i) => <li key={i}>{o}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {showBlock && (
            <div className="lp-section lp-show-section">
              <div className="lp-section-label">
                Going into {showBlock.showName || 'your show'} — movements to mention
              </div>
              <div className="lp-show-meta">
                {showBlock.daysOut} days out
                {showBlock.testLabel && ` \u00b7 ${showBlock.testLabel}`}
              </div>
              {showBlock.flaggedMovements?.length > 0 && (
                <div className="lp-mv-chips">
                  {showBlock.flaggedMovements.map((m, i) => (
                    <span key={i} className={`lp-mv-chip${m.coeff ? ' lp-coeff' : ''}`}>
                      {m.text}
                      {m.coeff && <span className="lp-coeff-tag">{'\u00d72'}</span>}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {briefData.openingLine && (
            <div className="lp-opening-line-section">
              <div className="lp-opening-label">
                Your opening line
                <span className="lp-opening-label-sub">— say this as you walk to warm up</span>
              </div>
              <div className="lp-opening-quote">"{briefData.openingLine}"</div>
              <div className="lp-opening-note">
                Synthesized from your week's entries. Use your own words — this is a starting point.
              </div>
            </div>
          )}

          <div className="lp-card-footer">
            <div className="lp-footer-note">yourdressagejourney.com</div>
            <div className="lp-read-time">~55 sec read</div>
          </div>
        </div>

        <div className="lp-share-hint">
          {primaryCoach ? (
            <>
              Want your coach to see this too?{' '}
              <a href={buildLessonPrepMailto(briefData, primaryCoach)}>
                Share with {primaryCoach.name || 'coach'} &rarr;
              </a>
            </>
          ) : (
            <>
              Want your coach to see this too?{' '}
              <Link to="/settings">Add a coach in Settings &rarr;</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
