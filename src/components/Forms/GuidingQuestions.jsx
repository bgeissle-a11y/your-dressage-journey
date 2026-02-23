import { useState } from 'react';

export default function GuidingQuestions({ text }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`guiding-questions${collapsed ? ' collapsed' : ''}`}>
      <div className="guiding-questions-header">
        <span className="guiding-questions-label">Guiding Questions</span>
        <button
          type="button"
          className="guiding-questions-toggle"
          onClick={() => setCollapsed(prev => !prev)}
        >
          {collapsed ? 'Show' : 'Hide'}
        </button>
      </div>
      <div className="guiding-questions-content">{text}</div>
    </div>
  );
}
