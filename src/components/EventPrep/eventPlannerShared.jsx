/**
 * Shared utilities for Event Planner display components.
 * Voice colors, score helpers, and the CoachSnippet sub-component.
 */

export const VOICE_COLORS = {
  'Classical Master': '#5C4033',
  'The Classical Master': '#5C4033',
  'Empathetic Coach': '#C67B5C',
  'The Empathetic Coach': '#C67B5C',
  'Technical Coach': '#6B8E5F',
  'The Technical Coach': '#6B8E5F',
  'Practical Strategist': '#4A6274',
  'The Practical Strategist': '#4A6274',
};

export function getScoreLevel(score) {
  if (score >= 80) return 'strong';
  if (score >= 65) return 'adequate';
  if (score >= 50) return 'developing';
  return 'needs-work';
}

export function CoachSnippet({ snippet }) {
  if (!snippet) return null;
  const voiceColor = VOICE_COLORS[snippet.voice] || '#8B7355';

  return (
    <div className="ep-coach-snippet" style={{ borderLeftColor: voiceColor }}>
      <span className="ep-coach-snippet__voice" style={{ color: voiceColor }}>
        {snippet.voice}
      </span>
      <p className="ep-coach-snippet__note">{snippet.note}</p>
    </div>
  );
}
