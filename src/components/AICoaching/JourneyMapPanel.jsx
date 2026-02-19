import { useState, useEffect, useCallback } from 'react';
import { getJourneyMap } from '../../services/aiService';
import CollapsibleSection from './CollapsibleSection';
import ErrorDisplay from './ErrorDisplay';
import ElapsedTimer from './ElapsedTimer';

/**
 * Journey Map display panel with at-a-glance summary
 * and collapsible detail sections.
 */
export default function JourneyMapPanel({ generationStatus }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [insufficientData, setInsufficientData] = useState(null);
  const [loadStartedAt, setLoadStartedAt] = useState(null);

  const fetchJourneyMap = useCallback(async (forceRefresh = false) => {
    // Stale-while-revalidate: keep existing data visible during refresh
    if (forceRefresh && data) {
      setRefreshing(true);
    } else {
      setLoading(true);
      setLoadStartedAt(Date.now());
    }
    setError(null);
    setInsufficientData(null);

    try {
      const result = await getJourneyMap({ forceRefresh });

      if (!result.success) {
        if (result.error === 'insufficient_data') {
          setInsufficientData(result);
        } else {
          setError({ message: 'Failed to generate your Journey Map.' });
        }
        return;
      }

      setData(result);
    } catch (err) {
      console.error('Journey Map error:', err);
      const details = err?.details || err?.customData || {};
      const parsed = {
        category: details.category || 'unknown',
        retryable: details.retryable !== false,
        message: err?.message || 'An error occurred while generating your Journey Map.',
      };

      // If refreshing with existing data, show non-destructive error
      if (forceRefresh && data) {
        setError({
          ...parsed,
          message: 'Could not refresh your Journey Map. Showing previous results.',
        });
      } else {
        setError(parsed);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [data]);

  useEffect(() => {
    fetchJourneyMap();
  }, [fetchJourneyMap]);

  // Auto-refresh when background generation completes
  useEffect(() => {
    if (generationStatus?.justCompleted && data) {
      fetchJourneyMap();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generationStatus?.justCompleted]);

  if (insufficientData) {
    return (
      <div className="panel-insufficient">
        <div className="panel-insufficient__icon">
          <span role="img" aria-label="map">&#x1F5FA;&#xFE0F;</span>
        </div>
        <h3>Your Journey Map Awaits</h3>
        <p>{insufficientData.message}</p>
        <div className="panel-insufficient__checklist">
          <p>To build your Journey Map, you need:</p>
          <ul>
            <li>A completed rider profile</li>
            <li>At least one horse profile</li>
            <li>At least 3 post-ride debriefs</li>
          </ul>
        </div>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="journey-map-panel journey-map-panel--loading">
        <div className="journey-map-panel__header">
          <h2>Journey Map</h2>
          <p>Mapping your riding journey...</p>
        </div>
        <div className="panel-loading-spinner">
          <div className="spinner" />
          <p>Analyzing your data and writing your story...</p>
          <ElapsedTimer startedAt={loadStartedAt} />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="journey-map-panel">
        <ErrorDisplay
          message={error.message}
          category={error.category}
          retryable={error.retryable !== false}
          onRetry={() => fetchJourneyMap(true)}
          retrying={loading}
        />
      </div>
    );
  }

  if (!data) return null;

  const { synthesis, narrative, visualization, generatedAt, fromCache, dataSnapshot } = data;

  // Derive at-a-glance stats
  const timelineCount = visualization?.timeline_events?.length || 0;
  const themesCount = synthesis?.themes?.length || 0;
  const milestonesCount = synthesis?.milestones?.length || 0;
  const trajectory = visualization?.progress_scores?.overall_trajectory;
  const currentFocus = synthesis?.current_focus;

  return (
    <div className="journey-map-panel">
      <div className="journey-map-panel__header">
        <div>
          <h2>Your Journey Map</h2>
          <p>A chronological story of your growth</p>
        </div>
        <div className="journey-map-panel__actions">
          {generatedAt && (
            <span className="panel-timestamp">
              {fromCache && 'Cached \u00B7 '}
              {new Date(generatedAt).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric'
              })}
            </span>
          )}
          <button
            className="btn-refresh"
            onClick={() => fetchJourneyMap(true)}
            disabled={loading || refreshing}
          >
            {loading || refreshing ? 'Regenerating...' : 'Regenerate'}
          </button>
        </div>
      </div>

      {/* Refreshing banner (stale-while-revalidate) */}
      {refreshing && (
        <div className="panel-refreshing">
          <div className="spinner spinner--small" />
          <span>Refreshing with your latest data...</span>
        </div>
      )}

      {/* Inline error during refresh (keeps existing data visible) */}
      {error && data && !refreshing && (
        <ErrorDisplay
          message={error.message}
          category={error.category}
          retryable={error.retryable !== false}
          onRetry={() => fetchJourneyMap(true)}
          retrying={loading}
          compact
        />
      )}

      {/* At a Glance — always visible */}
      <div className="journey-at-a-glance">
        <h2>Your Journey at a Glance</h2>
        <div className="journey-at-a-glance__stats">
          {milestonesCount > 0 && (
            <div className="journey-at-a-glance__stat">
              <span className="journey-at-a-glance__stat-value">{milestonesCount}</span>
              <span className="journey-at-a-glance__stat-label">Milestones</span>
            </div>
          )}
          {themesCount > 0 && (
            <div className="journey-at-a-glance__stat">
              <span className="journey-at-a-glance__stat-value">{themesCount}</span>
              <span className="journey-at-a-glance__stat-label">Themes Identified</span>
            </div>
          )}
          {timelineCount > 0 && (
            <div className="journey-at-a-glance__stat">
              <span className="journey-at-a-glance__stat-value">{timelineCount}</span>
              <span className="journey-at-a-glance__stat-label">Key Events</span>
            </div>
          )}
          {trajectory && (
            <div className="journey-at-a-glance__stat">
              <span className={`journey-at-a-glance__stat-value progress-score-value--${trajectory}`}>
                {trajectory}
              </span>
              <span className="journey-at-a-glance__stat-label">Trajectory</span>
            </div>
          )}
        </div>

        {currentFocus && (
          <div className="journey-at-a-glance__focus">
            <h3>Current Focus</h3>
            <p>{currentFocus}</p>
          </div>
        )}
      </div>

      {/* Key Milestones — collapsible, default open */}
      {visualization?.timeline_events && visualization.timeline_events.length > 0 && (
        <CollapsibleSection title="Key Milestones" icon="&#x1F4C5;" defaultOpen>
          <div className="timeline">
            {visualization.timeline_events.map((event, i) => (
              <div key={i} className="timeline-event" data-type={event.type}>
                <div className="timeline-event__marker">
                  <span className="timeline-event__icon">{event.icon || '\u2022'}</span>
                </div>
                <div className="timeline-event__content">
                  <div className="timeline-event__date">
                    {event.date ? new Date(event.date).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric'
                    }) : ''}
                  </div>
                  <h4>{event.title}</h4>
                  <p>{event.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Progress Snapshot — collapsible, default open */}
      {visualization?.progress_scores && (
        <CollapsibleSection title="Progress Snapshot" icon="&#x1F4CA;" defaultOpen>
          <div className="progress-scores">
            {visualization.progress_scores.overall_trajectory && (
              <div className="progress-score-item">
                <span className="progress-score-label">Overall Trajectory</span>
                <span className={`progress-score-value progress-score-value--${visualization.progress_scores.overall_trajectory}`}>
                  {visualization.progress_scores.overall_trajectory}
                </span>
              </div>
            )}
            {visualization.progress_scores.consistency_score && (
              <div className="progress-score-item">
                <span className="progress-score-label">Consistency</span>
                <span className="progress-score-value">{visualization.progress_scores.consistency_score}/10</span>
              </div>
            )}
            {visualization.progress_scores.self_awareness_score && (
              <div className="progress-score-item">
                <span className="progress-score-label">Self-Awareness</span>
                <span className="progress-score-value">{visualization.progress_scores.self_awareness_score}/10</span>
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* Your Story — collapsible, default closed (longest section) */}
      {narrative && (
        <CollapsibleSection title="Your Story" icon="&#x1F4D6;">
          <div
            className="journey-narrative__content"
            dangerouslySetInnerHTML={{ __html: markdownToHtml(narrative) }}
          />
        </CollapsibleSection>
      )}

      {/* Emerging Themes — collapsible, default closed */}
      {synthesis?.themes && synthesis.themes.length > 0 && (
        <CollapsibleSection title="Emerging Themes" icon="&#x1F50D;">
          <div className="theme-cards">
            {synthesis.themes.map((theme, i) => (
              <div key={i} className="theme-card">
                <h4>{theme.theme}</h4>
                <p className="theme-evidence">{theme.evidence}</p>
                <p className="theme-significance">{theme.significance}</p>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Goal Progress — collapsible, default closed */}
      {synthesis?.goal_progress && synthesis.goal_progress.length > 0 && (
        <CollapsibleSection title="Goal Progress" icon="&#x1F3AF;">
          {synthesis.goal_progress.map((goal, i) => (
            <div key={i} className="goal-item">
              <div className="goal-item__header">
                <span className="goal-item__name">{goal.goal}</span>
                <span className="goal-item__pct">{goal.progress_pct}%</span>
              </div>
              <div className="goal-item__bar">
                <div
                  className="goal-item__fill"
                  style={{ width: `${Math.min(100, Math.max(0, goal.progress_pct))}%` }}
                />
              </div>
              <p className="goal-item__evidence">{goal.evidence}</p>
              {goal.next_step && <p className="goal-item__next"><strong>Next:</strong> {goal.next_step}</p>}
            </div>
          ))}
        </CollapsibleSection>
      )}
    </div>
  );
}

// Voice name → color mapping for voice highlight blockquotes
const VOICE_COLORS = {
  'Classical Master': '#5C4033',
  'Empathetic Coach': '#C67B5C',
  'Technical Coach': '#6B8E5F',
  'Practical Strategist': '#4A6274',
};

/**
 * Enhanced markdown to HTML conversion for the narrative.
 */
function markdownToHtml(md) {
  if (!md) return '';

  const lines = md.split('\n');
  const merged = [];
  let blockquoteBuffer = [];

  for (const line of lines) {
    if (line.startsWith('> ')) {
      blockquoteBuffer.push(line.slice(2));
    } else {
      if (blockquoteBuffer.length > 0) {
        merged.push({ type: 'blockquote', lines: blockquoteBuffer });
        blockquoteBuffer = [];
      }
      merged.push({ type: 'text', content: line });
    }
  }
  if (blockquoteBuffer.length > 0) {
    merged.push({ type: 'blockquote', lines: blockquoteBuffer });
  }

  let html = '';
  for (const block of merged) {
    if (block.type === 'blockquote') {
      const isVoiceGroup = block.lines.some((l) =>
        Object.keys(VOICE_COLORS).some((v) => l.includes(`**${v}:**`) || l.includes(`**${v}**`))
      );

      if (isVoiceGroup) {
        html += '<div class="voice-highlights">';
        for (const bqLine of block.lines) {
          let voiceColor = null;
          for (const [name, color] of Object.entries(VOICE_COLORS)) {
            if (bqLine.includes(name)) {
              voiceColor = color;
              break;
            }
          }
          const styled = voiceColor ? ` style="border-left-color:${voiceColor}"` : '';
          const rendered = bqLine
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>');
          html += `<blockquote class="voice-snippet"${styled}>${rendered}</blockquote>`;
        }
        html += '</div>';
      } else {
        const rendered = block.lines
          .map((l) => l.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>'))
          .join('<br/>');
        html += `<blockquote>${rendered}</blockquote>`;
      }
    } else {
      let line = block.content;
      if (line.match(/^### /)) {
        html += `<h4>${line.slice(4)}</h4>`;
      } else if (line.match(/^## /)) {
        html += `<h3>${line.slice(3)}</h3>`;
      } else if (line.match(/^# /)) {
        html += `<h2>${line.slice(2)}</h2>`;
      } else if (line.trim() === '') {
        html += '</p><p>';
      } else {
        line = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        line = line.replace(/\*(.+?)\*/g, '<em>$1</em>');
        html += line + ' ';
      }
    }
  }

  html = '<p>' + html + '</p>';
  html = html.replace(/<p>\s*<\/p>/g, '');
  html = html.replace(/<p>\s*(<h[2-4]>)/g, '$1');
  html = html.replace(/(<\/h[2-4]>)\s*<\/p>/g, '$1');
  html = html.replace(/<p>\s*(<div)/g, '$1');
  html = html.replace(/(<\/div>)\s*<\/p>/g, '$1');

  return html;
}
