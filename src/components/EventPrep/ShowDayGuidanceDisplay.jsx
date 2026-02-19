import CollapsibleSection from '../AICoaching/CollapsibleSection';
import { CoachSnippet } from './eventPlannerShared.jsx';

/**
 * Renders show-day guidance: timeline, warm-up strategy, mental game plan.
 * Uses nested CollapsibleSections for each guidance area.
 */
export default function ShowDayGuidanceDisplay({ data }) {
  return (
    <CollapsibleSection
      title="Show-Day Guidance"
      icon="&#x1F3C6;"
    >
      <div className="ep-show-day">
        {/* Summary */}
        {data.show_day_summary && (
          <div className="ep-show-day__summary">
            <p>{data.show_day_summary}</p>
          </div>
        )}

        {/* Timeline */}
        {data.timeline && data.timeline.length > 0 && (
          <CollapsibleSection title="Show-Day Timeline" icon="&#x23F0;" defaultOpen>
            <div className="ep-timeline">
              {data.timeline.map((item, i) => (
                <div key={i} className="ep-timeline__item">
                  <div className="ep-timeline__time">{item.time_relative}</div>
                  <div className="ep-timeline__content">
                    <h5>{item.activity}</h5>
                    <p>{item.details}</p>
                    {item.tips && <p className="ep-timeline__tips">{item.tips}</p>}
                    {item.voice_note && (
                      <CoachSnippet snippet={item.voice_note} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Warm-Up Strategy */}
        {data.warm_up_strategy && (
          <CollapsibleSection title="Warm-Up Strategy" icon="&#x1F525;">
            <div className="ep-warmup">
              <p className="ep-warmup__arrive">
                <strong>Arrive at warm-up:</strong> {data.warm_up_strategy.arrive_at_warm_up}
              </p>
              {data.warm_up_strategy.phases && data.warm_up_strategy.phases.map((phase, i) => (
                <div key={i} className="ep-warmup__phase">
                  <div className="ep-warmup__phase-header">
                    <strong>{phase.phase}</strong>
                    <span className="ep-exercise__duration">{phase.duration}</span>
                  </div>
                  <p>{phase.what_to_do}</p>
                  {phase.what_to_feel_for && (
                    <div className="ep-warmup__feel">
                      <h6>What to Feel For</h6>
                      <p>{phase.what_to_feel_for}</p>
                    </div>
                  )}
                  {phase.if_trouble && (
                    <div className="ep-warmup__trouble">
                      <h6>If Trouble</h6>
                      <p>{phase.if_trouble}</p>
                    </div>
                  )}
                </div>
              ))}
              {data.warm_up_strategy.final_preparation && (
                <div className="ep-warmup__final">
                  <h5>Final Preparation</h5>
                  <p>{data.warm_up_strategy.final_preparation}</p>
                </div>
              )}
            </div>
          </CollapsibleSection>
        )}

        {/* Mental Game Plan */}
        {data.mental_game_plan && (
          <CollapsibleSection title="Mental Game Plan" icon="&#x1F9E0;">
            <div className="ep-mental-game">
              {data.mental_game_plan.morning_mindset && (
                <div className="ep-mental-game__section">
                  <h5>Morning Mindset</h5>
                  <p>{data.mental_game_plan.morning_mindset}</p>
                </div>
              )}
              {data.mental_game_plan.pre_ride_routine && (
                <div className="ep-mental-game__section">
                  <h5>Pre-Ride Routine</h5>
                  <p>{data.mental_game_plan.pre_ride_routine}</p>
                </div>
              )}
              {data.mental_game_plan.in_ring_focus_words && (
                <div className="ep-mental-game__focus-words">
                  <h5>In-Ring Focus Words</h5>
                  <div className="ep-focus-words">
                    {data.mental_game_plan.in_ring_focus_words.map((w, i) => (
                      <span key={i} className="ep-focus-word">{w}</span>
                    ))}
                  </div>
                </div>
              )}
              {data.mental_game_plan.if_mistake_happens && (
                <div className="ep-mental-game__section">
                  <h5>If a Mistake Happens</h5>
                  <p>{data.mental_game_plan.if_mistake_happens}</p>
                </div>
              )}
              {data.mental_game_plan.post_ride_self_talk && (
                <div className="ep-mental-game__section">
                  <h5>Post-Ride Self-Talk</h5>
                  <p>{data.mental_game_plan.post_ride_self_talk}</p>
                </div>
              )}
            </div>
          </CollapsibleSection>
        )}

        {/* Contingency Plans */}
        {data.contingency_plans && data.contingency_plans.length > 0 && (
          <CollapsibleSection title="Contingency Plans" icon="&#x1F6E1;&#xFE0F;">
            <div className="ep-contingencies">
              {data.contingency_plans.map((cp, i) => (
                <div key={i} className="ep-contingency-card">
                  <h5>{cp.scenario}</h5>
                  <p>{cp.response}</p>
                  {cp.voice_perspective && (
                    <CoachSnippet snippet={cp.voice_perspective} />
                  )}
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Between Rides */}
        {data.between_rides_plan && (
          <CollapsibleSection title="Between Rides" icon="&#x1F504;">
            <div className="ep-between-rides">
              {data.between_rides_plan.horse_care && (
                <div className="ep-between-rides__section">
                  <h5>Horse Care</h5>
                  <p>{data.between_rides_plan.horse_care}</p>
                </div>
              )}
              {data.between_rides_plan.rider_reset && (
                <div className="ep-between-rides__section">
                  <h5>Rider Reset</h5>
                  <p>{data.between_rides_plan.rider_reset}</p>
                </div>
              )}
              {data.between_rides_plan.warm_up_adjustment && (
                <div className="ep-between-rides__section">
                  <h5>Warm-Up Adjustment</h5>
                  <p>{data.between_rides_plan.warm_up_adjustment}</p>
                </div>
              )}
            </div>
          </CollapsibleSection>
        )}

        {/* Post-Event */}
        {data.post_event && (
          <CollapsibleSection title="Post-Event" icon="&#x1F31F;">
            <div className="ep-post-event">
              {data.post_event.immediate_care && (
                <div className="ep-post-event__section">
                  <h5>Immediate Care</h5>
                  <p>{data.post_event.immediate_care}</p>
                </div>
              )}
              {data.post_event.celebration_prompt && (
                <div className="ep-post-event__celebration">
                  <h5>Celebrate!</h5>
                  <p>{data.post_event.celebration_prompt}</p>
                </div>
              )}
              {data.post_event.debrief_questions && data.post_event.debrief_questions.length > 0 && (
                <div className="ep-post-event__section">
                  <h5>Debrief Questions</h5>
                  <ol className="ep-debrief-questions">
                    {data.post_event.debrief_questions.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ol>
                </div>
              )}
              {data.post_event.what_to_journal && (
                <div className="ep-post-event__section">
                  <h5>What to Journal</h5>
                  <p>{data.post_event.what_to_journal}</p>
                </div>
              )}
            </div>
          </CollapsibleSection>
        )}
      </div>
    </CollapsibleSection>
  );
}
