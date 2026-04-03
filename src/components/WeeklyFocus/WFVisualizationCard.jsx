import { Link } from 'react-router-dom';

const TRIGGER_LABELS = {
  upcoming_show: 'Show prep',
  new_movement: 'New movement',
  recurring_mechanic: 'Body pattern',
  persistent_struggle: 'Recurring struggle',
};

export default function WFVisualizationCard({ visualization }) {
  if (!visualization || !visualization.shouldSuggest) return null;

  const {
    triggerType,
    movementLabel,
    cardTeaser,
    rationale,
    mechanicSummary,
    movementKey,
    problemFocus,
    context,
    suggestedLength,
  } = visualization;

  const vizUrl = `/toolkit/visualization/new?movement=${encodeURIComponent(movementKey || '')}&problem=${encodeURIComponent(problemFocus || '')}&context=${encodeURIComponent(context || '')}&length=${encodeURIComponent(suggestedLength || '')}`;

  return (
    <div className="insight-card">
      <div className="done-stripe" />
      <div className="card-header">
        <div className="card-icon icon-viz">&#129504;</div>
        <div className="card-title-block">
          <div className="card-label label-viz">
            Visualization This Week
          </div>
          <div className="card-title">{cardTeaser || 'Build your mental rehearsal'}</div>
        </div>
      </div>
      <div className="card-body">
        <div className="viz-badges">
          {movementLabel && (
            <span className="viz-badge badge-movement">{movementLabel}</span>
          )}
          {triggerType && TRIGGER_LABELS[triggerType] && (
            <span className="viz-badge badge-trigger">{TRIGGER_LABELS[triggerType]}</span>
          )}
        </div>

        {rationale && (
          <p className="viz-rationale">{rationale}</p>
        )}

        {mechanicSummary && (
          <div className="viz-mechanic-box">
            <div className="viz-mechanic-label">Pattern noted</div>
            <div className="viz-mechanic-quote">&ldquo;{mechanicSummary}&rdquo;</div>
          </div>
        )}

        <Link to={vizUrl} className="viz-cta-btn">
          Build Visualization Script &rarr;
        </Link>
      </div>
    </div>
  );
}
