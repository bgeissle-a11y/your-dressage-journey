import { useState, useRef, useEffect, useCallback } from 'react';
import './Visualization.css';

const CONTEXT_ICONS = { training: '\uD83C\uDFE0', warmup: '\u26FA', test: '\uD83C\uDFDF' };
const CONTEXT_LABELS = { training: 'Training ride', warmup: 'Show warm-up', test: 'Competition test' };

function escHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatScriptContent(content) {
  if (!content) return '';
  const paragraphs = content.split(/\n\n|\n/).filter(p => p.trim());
  return paragraphs.map(p => {
    let html = escHtml(p);
    html = html.replace(/\*\*(.*?)\*\*/g, '<span class="viz-key-concept">$1</span>');
    html = html.replace(/\s\u2014\s?/g, ' <span class="viz-em-dash">\u2014</span> ');
    html = html.replace(/\u2014$/g, '<span class="viz-em-dash">\u2014</span>');
    return `<p>${html}</p>`;
  }).join('');
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function ScriptBlock({ block, index, script, expandedBlocks, onToggle }) {
  const isFirst = index === 0;
  const isReflect = block.phase === 'reflect';
  const isOpen = expandedBlocks.has(index);

  const [timerState, setTimerState] = useState('idle'); // idle | running | done
  const [timeRemaining, setTimeRemaining] = useState(block.minutes * 60);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  function startTimer() {
    setTimerState('running');
    let remaining = block.minutes * 60;
    timerRef.current = setInterval(() => {
      remaining--;
      setTimeRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(timerRef.current);
        setTimerState('done');
      }
    }, 1000);
  }

  const formattedTime = `${Math.floor(timeRemaining / 60)}:${(timeRemaining % 60).toString().padStart(2, '0')}`;

  return (
    <div className="viz-script-block" data-phase={block.phase}>
      <div className="viz-block-header" onClick={() => onToggle(index)}>
        <div className="viz-block-header-left">
          <span className={`viz-block-phase viz-phase-${block.phase}`}>{capitalize(block.phase)}</span>
          <span className="viz-block-title">{block.title}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isReflect ? (
            <span className="viz-block-timer-badge">No timer</span>
          ) : (
            <span className="viz-block-timer-badge">
              <span>⏱</span> {block.minutes} min
            </span>
          )}
          <span style={{ color: 'var(--color-text-light)', fontSize: '0.9em' }}>
            {isOpen ? '▾' : '▸'}
          </span>
        </div>
      </div>

      {isOpen && (
        <div className="viz-block-content">
          {!isReflect && (
            <>
              <div className="viz-pause-instruction">
                <span className="viz-pause-icon">👁</span>
                <span className="viz-pause-text">
                  {block.pauseInstruction || 'Read this section, then close your eyes.'}
                </span>
              </div>
              <div
                className="viz-script-text"
                dangerouslySetInnerHTML={{ __html: formatScriptContent(block.content) }}
              />
            </>
          )}

          {isReflect && (
            <ReflectionBlock script={script} />
          )}

          {!isReflect && block.hasTimer !== false && (
            <>
              <button
                className="viz-start-timer-btn"
                onClick={startTimer}
                disabled={timerState !== 'idle'}
              >
                {timerState === 'idle' && `⏱ Start ${block.minutes}-min timer`}
                {timerState === 'running' && '⏸ Timer running…'}
                {timerState === 'done' && '✓ Complete'}
              </button>
              {timerState !== 'idle' && (
                <div className={`viz-timer-display${timerState === 'done' ? ' viz-timer-done' : ''}`}>
                  {timerState === 'done' ? '✓ Done' : formattedTime}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ReflectionBlock({ script }) {
  return (
    <>
      <div className="viz-reflection-box">
        <div className="viz-reflection-prompt">
          "{script.reflectionPrompt || 'What did my body want to do that I had to consciously choose not to do?'}"
        </div>
        <label>Write one sentence. This is your pattern to watch for in the saddle.</label>
        <textarea
          id="viz-reflection-textarea"
          placeholder="e.g., My body wanted to tip forward and look down after each change to check if it happened..."
        />
      </div>
      <p className="viz-reflection-note">
        This response feeds back into your YDJ data. Over time, patterns in what your body wants to do become as useful as patterns in what actually happens.
      </p>
    </>
  );
}

export default function VisualizationOutput({ script, context, onSaveSession, onReset, sessionSaved }) {
  const [expandedBlocks, setExpandedBlocks] = useState(new Set([0]));

  const toggleBlock = useCallback((index) => {
    setExpandedBlocks(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  function handleSave() {
    const textarea = document.getElementById('viz-reflection-textarea');
    const reflectionText = textarea ? textarea.value.trim() : '';
    const completedBlocks = Array.from(expandedBlocks).map(
      i => script.blocks[i]?.phase
    ).filter(Boolean);

    onSaveSession({ reflectionText, completedBlocks });
  }

  return (
    <div>
      {/* Output header */}
      <div className="viz-output-header">
        <div className="viz-output-title">{script.title}</div>
        <div className="viz-output-meta">
          <span>⏱ ~{script.totalMinutes} minutes</span>
          <span>{CONTEXT_ICONS[context] || '🏠'} {CONTEXT_LABELS[context] || context}</span>
          <span>📅 Generated today</span>
        </div>
      </div>

      {/* Recording instructions */}
      <div className="viz-recording">
        <h3>🎙 Want to record this and play it back?</h3>
        <p>The most effective way to use this script is to hear it with your eyes closed — in your own voice, at your own pace. Here's how to record it in one take on your phone:</p>
        <ol className="viz-recording-steps">
          <li data-step="1.">Find a quiet space before your next ride. Read the script through once silently so nothing surprises you.</li>
          <li data-step="2.">Open your phone's Voice Memos app (iOS) or Recorder app (Android). Press record.</li>
          <li data-step="3.">Read slowly — far slower than feels natural. The <span style={{ color: 'var(--color-gold, #B8862A)', fontWeight: 600 }}>— pause cues</span> mean 3–4 full seconds of silence. Let them breathe.</li>
          <li data-step="4.">You don't need a perfect take. A stumble followed by a natural pause is fine — it's your voice your nervous system trusts.</li>
          <li data-step="5.">Save the file. Before each session, press play, set your phone face-down, and close your eyes.</li>
        </ol>
        {script.recordingTip && (
          <p style={{ marginTop: 8, fontSize: '0.85em', color: 'var(--color-gold, #B8862A)', fontWeight: 500 }}>{script.recordingTip}</p>
        )}
        <p style={{ marginTop: 4, fontSize: '0.85em', color: 'var(--color-text-light)' }}>
          No recording? Use the <strong>read-chunk method</strong>: read each section below, then put the phone face-down and close your eyes for that section before continuing to the next.
        </p>
      </div>

      {/* Script blocks */}
      <div className="viz-script-blocks">
        {script.blocks.map((block, i) => (
          <ScriptBlock
            key={i}
            block={block}
            index={i}
            script={script}
            expandedBlocks={expandedBlocks}
            onToggle={toggleBlock}
          />
        ))}
      </div>

      {/* Output actions */}
      <div className="viz-output-actions">
        <button
          className="viz-btn-save"
          onClick={handleSave}
          disabled={sessionSaved}
        >
          {sessionSaved ? '✓ Session Saved' : '✓ Save Session'}
        </button>
        <button className="viz-btn-reset" onClick={onReset}>
          ← Build another script
        </button>
      </div>
    </div>
  );
}
