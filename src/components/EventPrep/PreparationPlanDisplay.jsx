import { useState } from 'react';
import CollapsibleSection from '../AICoaching/CollapsibleSection';
import { CoachSnippet } from './eventPlannerShared.jsx';

/**
 * Renders the week-by-week preparation plan with exercises.
 * Each week is a collapsible card with training sessions, mental prep, and checkpoints.
 */
export default function PreparationPlanDisplay({ data }) {
  return (
    <CollapsibleSection
      title={`Preparation Plan \u2014 ${data.total_weeks || ''} Weeks`}
      icon="&#x1F4C5;"
    >
      <div className="ep-prep-plan">
        {/* Summary */}
        {data.plan_summary && (
          <div className="ep-prep-plan__summary">
            <p>{data.plan_summary}</p>
          </div>
        )}

        {/* Weeks */}
        {data.weeks && data.weeks.length > 0 && (
          <div className="ep-weeks">
            {data.weeks.map((week) => (
              <WeekCard key={week.week_number} week={week} />
            ))}
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
}


function WeekCard({ week }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="ep-week-card">
      <div className="ep-week-card__header" onClick={() => setExpanded(!expanded)}>
        <div className="ep-week-card__title">
          <span className="ep-week-card__number">Week {week.week_number}</span>
          <span className="ep-week-card__dates">{week.dates}</span>
        </div>
        <div className="ep-week-card__focus">{week.primary_focus}</div>
        <span className={`collapsible-header__chevron ${expanded ? 'collapsible-header__chevron--open' : ''}`}>
          &#9662;
        </span>
      </div>

      {expanded && (
        <div className="ep-week-card__body">
          {/* Training Sessions */}
          {week.training_sessions && week.training_sessions.map((session, si) => (
            <div key={si} className="ep-session">
              <div className="ep-session__type-badge">{session.session_type}</div>
              <p className="ep-session__description">{session.description}</p>

              {session.exercises && session.exercises.map((ex, ei) => (
                <div key={ei} className="ep-exercise">
                  <div className="ep-exercise__header">
                    <strong>{ex.name}</strong>
                    {ex.duration_minutes && (
                      <span className="ep-exercise__duration">{ex.duration_minutes} min</span>
                    )}
                  </div>
                  <p className="ep-exercise__purpose">{ex.purpose}</p>
                  {ex.test_movement_reference && (
                    <p className="ep-exercise__ref">Test reference: {ex.test_movement_reference}</p>
                  )}
                  {ex.tips && <p className="ep-exercise__tips">{ex.tips}</p>}
                </div>
              ))}

              {session.coach_snippet && (
                <CoachSnippet snippet={session.coach_snippet} />
              )}
            </div>
          ))}

          {/* Mental Prep */}
          {week.mental_prep && (
            <div className="ep-mental-prep">
              <h5>Mental Preparation</h5>
              <p><strong>Focus:</strong> {week.mental_prep.focus}</p>
              <p>{week.mental_prep.practice}</p>
              {week.mental_prep.addresses_concern && (
                <p className="ep-mental-prep__concern">{week.mental_prep.addresses_concern}</p>
              )}
            </div>
          )}

          {/* Week Goals */}
          {week.week_goals && week.week_goals.length > 0 && (
            <div className="ep-week-goals">
              <h5>Week Goals</h5>
              <ul>
                {week.week_goals.map((g, i) => <li key={i}>{g}</li>)}
              </ul>
            </div>
          )}

          {/* Readiness Checkpoint */}
          {week.readiness_checkpoint && (
            <div className="ep-checkpoint">
              <h5>Readiness Checkpoint</h5>
              <p>{week.readiness_checkpoint}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
