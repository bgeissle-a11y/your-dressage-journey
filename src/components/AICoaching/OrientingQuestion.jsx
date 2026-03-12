import { useState } from 'react';

/**
 * Orienting question callout — displayed between Quick Insights and coaching voices.
 * Prompts the rider to reflect before reading the coaching analysis.
 * Collapsed by default on mobile, expanded on desktop.
 */
export default function OrientingQuestion() {
  const [open, setOpen] = useState(window.innerWidth >= 768);

  return (
    <div className={`orienting-question${open ? ' orienting-question--open' : ''}`}>
      <button
        className="orienting-question__toggle"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="orienting-question__label">A moment before you read</span>
        <span className="orienting-question__chevron">{open ? '\u25B2' : '\u25BC'}</span>
      </button>
      {open && (
        <div className="orienting-question__body">
          <p>
            <em>Before reading further: what pattern do you think defined your riding this week? Hold that thought — then see what the coaching team saw.</em>
          </p>
        </div>
      )}
    </div>
  );
}
