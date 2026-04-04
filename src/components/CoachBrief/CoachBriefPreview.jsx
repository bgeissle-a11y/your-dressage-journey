/**
 * CoachBriefPreview — Renders the Weekly Coach Brief
 *
 * Matches the ydj-weekly-coach-brief.html prototype exactly.
 * All fields are conditional — sections omit gracefully when data is absent.
 * Minimum viable brief: rider name, horses, week of, last entry, rides logged, level, growth edge.
 */

export default function CoachBriefPreview({ briefData }) {
  if (!briefData) return null;

  const {
    riderName,
    horseNames = [],
    weekOf,
    lastEntryDate,
    ridesLast30,
    levelLabel,
    activePathLabel,
    activePathClass,
    trajectorySnippet,
    growthEdge,
    journeyTrajectory,
    aiCoachInsight,
    showPrepData,
    lessonTakeaways = [],
    ahas = [],
    obstacles = [],
    upcomingEvent,
    coaches = [],
  } = briefData;

  const primaryCoach = coaches[0];
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const hasLessonsOrMoments = lessonTakeaways.length > 0 || ahas.length > 0 || obstacles.length > 0;

  return (
    <div className="cb-wrap">
      {/* Header */}
      <div className="cb-header">
        <div className="cb-brand">Your Dressage Journey</div>
        <div className="cb-label">Weekly Rider Brief · Coach Copy</div>
      </div>

      {/* Consent Banner */}
      {primaryCoach && (
        <div className="cb-consent-banner">
          <div className="cb-consent-dot" />
          <div className="cb-consent-text">
            Rider consented to coach sharing
            <span>
              {primaryCoach.optInDate ? ` · Opt-in confirmed ${formatDate(primaryCoach.optInDate)}` : ''}
              {' · Data reflects rider\u2019s own entries, unmodified'}
            </span>
          </div>
        </div>
      )}

      <p className="cb-orientation">This brief gives you a weekly view of what your student is observing between lessons — not a replacement for your coaching, but context that's yours to use however it's useful.</p>

      <div className="cb-card">
        {/* Identity Bar */}
        <div className="cb-identity-bar">
          <div>
            <div className="cb-rider-name">{riderName}</div>
            {horseNames.length > 0 && (
              <div className="cb-horse-name">{horseNames.join(' & ')}</div>
            )}
            {activePathLabel && (
              <div className={`cb-rider-type-chip ${activePathClass || 'competitor'}`}>
                {activePathClass === 'competitor' && '\ud83c\udfc6 '}
                {activePathClass === 'explorer' && '\ud83c\udf0d '}
                {activePathClass === 'builder' && '\ud83c\udfd7\ufe0f '}
                {activePathLabel}
              </div>
            )}
          </div>
          <div className="cb-meta-col">
            <div className="cb-meta-line">Week of <span>{weekOf}</span></div>
            {lastEntryDate && (
              <div className="cb-meta-line">Last entry <span>{formatDate(lastEntryDate)}</span></div>
            )}
            <div className="cb-meta-line">Rides logged <span>{ridesLast30} (30 days)</span></div>
          </div>
        </div>

        {/* Level Strip */}
        {levelLabel && (
          <div className="cb-level-strip">
            <div className="cb-level-badge">{levelLabel}</div>
            {trajectorySnippet && (
              <div className="cb-trajectory-tag">{'\u2197'} {trajectorySnippet}</div>
            )}
          </div>
        )}

        <div className="cb-sections">
          {/* Journey Snapshot */}
          {journeyTrajectory && (
            <div className="cb-section cb-journey-snapshot">
              <div className="cb-section-label">Journey Snapshot</div>
              <div className="cb-journey-direction-row">
                <span className={`cb-direction-chip cb-direction--${(journeyTrajectory.direction || '').toLowerCase().replace(/\s+/g, '-')}`}>
                  {journeyTrajectory.direction}
                </span>
                {journeyTrajectory.themes?.length > 0 && (
                  <span className="cb-journey-themes">
                    {journeyTrajectory.themes.join(' · ')}
                  </span>
                )}
              </div>
              {journeyTrajectory.excerpt && (
                <p className="cb-journey-excerpt">"{journeyTrajectory.excerpt}"</p>
              )}
              {journeyTrajectory.asOf && (
                <div className="cb-journey-as-of">
                  As of {(() => {
                    const d = journeyTrajectory.asOf?.toDate
                      ? journeyTrajectory.asOf.toDate()
                      : new Date(journeyTrajectory.asOf);
                    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Growth Edge */}
          {growthEdge && (
            <div className="cb-section cb-growth-edge">
              <div className="cb-section-label">Rider's Identified Growth Edge</div>
              <div className="cb-section-body">"{growthEdge}"</div>
            </div>
          )}

          {/* AI Coach Insight */}
          {aiCoachInsight && (
            <div className="cb-section">
              <div className="cb-section-label">
                AI Coach Insight
                <span className={`cb-coach-chip ${aiCoachInsight.voiceIndex === 2 ? 'technical' : aiCoachInsight.voiceIndex === 0 ? 'classical' : aiCoachInsight.voiceIndex === 3 ? 'strategist' : ''}`}>
                  {aiCoachInsight.voiceName}
                </span>
              </div>
              {aiCoachInsight.rationale && (
                <div className="cb-coach-rationale">Selected: {aiCoachInsight.rationale}</div>
              )}
              <div className="cb-section-body">{aiCoachInsight.snippet}</div>
            </div>
          )}

          {/* Flagged Concerns / Show Prep */}
          {showPrepData && showPrepData.concerns?.length > 0 && (
            <div className="cb-section cb-flagged-section">
              <div className="cb-section-label">Show Prep — Rider-Flagged Concerns</div>
              <div className="cb-concern-chips">
                {showPrepData.concerns.map((c, i) => (
                  <span key={i} className="cb-concern-chip">{c}</span>
                ))}
              </div>
              {showPrepData.showName && (
                <div className="cb-flagged-context">
                  {showPrepData.showName}
                  {showPrepData.currentLevel ? ` · ${showPrepData.currentLevel}` : ''}
                  {showPrepData.daysOut != null ? ` · ${showPrepData.daysOut} days out` : ''}
                </div>
              )}
            </div>
          )}

          {/* Two-col: Lessons + AHA/Obstacles */}
          {hasLessonsOrMoments && (
            <div className={`cb-two-col ${lessonTakeaways.length === 0 || (ahas.length === 0 && obstacles.length === 0) ? 'cb-single-col' : ''}`}>
              {lessonTakeaways.length > 0 && (
                <div className="cb-section">
                  <div className="cb-section-label">
                    Rider-Identified Lesson Insights <span className="cb-label-note">(30 days)</span>
                  </div>
                  <ul className="cb-bullet-list">
                    {lessonTakeaways.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}
              {(ahas.length > 0 || obstacles.length > 0) && (
                <div className="cb-section">
                  <div className="cb-section-label">
                    Rider-Identified Insights <span className="cb-label-note">(30 days)</span>
                  </div>
                  {ahas.length > 0 && (
                    <div className="cb-moment-block">
                      <div className="cb-sub-label">{'\u2726'} AHA</div>
                      <ul className="cb-bullet-list cb-aha">
                        {ahas.map((a, i) => (
                          <li key={i}>{a}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {obstacles.length > 0 && (
                    <div className="cb-moment-block">
                      <div className="cb-sub-label">{'\u25b3'} Obstacle</div>
                      <ul className="cb-bullet-list cb-obstacle">
                        {obstacles.map((o, i) => (
                          <li key={i}>{o}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Event Bar */}
          {upcomingEvent && (
            <div className="cb-event-bar">
              <span>{'\ud83d\udcc5'}</span>
              <span className="cb-event-text">
                <strong>Upcoming:</strong> {upcomingEvent.name}
                {' — '}<span className="cb-days-out">{upcomingEvent.daysOut} days</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Data Integrity Note */}
      <div className="cb-integrity-note">
        <span className="cb-integrity-icon">{'\u2691'}</span>
        <span className="cb-integrity-text">
          All content reflects the rider's own entries, unedited. The AI insight uses the same
          data the rider sees in her platform — nothing here contradicts or supplements what she
          has been shown. Rider opted in to coach sharing
          {primaryCoach?.optInDate ? ` on ${formatDate(primaryCoach.optInDate)}` : ''}
          {' '}and may withdraw consent at any time.
        </span>
      </div>

      {/* Footer */}
      <div className="cb-footer">
        <div className="cb-footer-note">Confidential · For coaching use only</div>
        <div className="cb-read-time">~55 sec read</div>
      </div>
    </div>
  );
}
