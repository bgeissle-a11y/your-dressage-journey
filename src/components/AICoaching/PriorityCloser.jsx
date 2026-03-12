/**
 * Priority Closer — rendered after all four coaching voices.
 * Displays the AI-generated "Your Priority This Week" closing section
 * with a priority restatement and two actualization prompts.
 */
export default function PriorityCloser({ closer }) {
  if (!closer) return null;

  const { restatement, strategy_prompt, evidence_prompt } = closer;

  return (
    <div className="priority-closer">
      <h3 className="priority-closer__title">Your Priority This Week</h3>
      {restatement && (
        <p className="priority-closer__restatement">{restatement}</p>
      )}
      {strategy_prompt && (
        <p className="priority-closer__prompt">{strategy_prompt}</p>
      )}
      {evidence_prompt && (
        <p className="priority-closer__prompt">{evidence_prompt}</p>
      )}
    </div>
  );
}
