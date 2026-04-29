import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  readPreRideRitual,
  savePreRideRitual,
  hideResearchPanel,
  DEFAULT_BLOCKS,
} from '../../services/preRideRitualService';
import './PreRideRitual.css';

/* ── Block metadata (static — not stored in Firestore) ── */
const BLOCK_META = {
  physical: {
    icon: '\uD83C\uDF3F',
    iconBg: '#e6f3eb',
    iconFg: '#2a5c36',
    desc: 'Review barn aisle prep and your pre-ride checklist.',
    linkLabel: 'Barn Aisle Prep',
    route: '/insights?tab=physical#barn-aisle-prep',
  },
  gpt: {
    icon: '\uD83E\uDDE0',
    iconBg: '#deeaf5',
    iconFg: '#1e5080',
    desc: "Review this week's Grand Prix Thinking assignment.",
    linkLabel: 'This Week in GPT',
    route: '/insights?tab=grandprix#gpt-this-week',
  },
  practice: {
    icon: '\uD83D\uDCCB',
    iconBg: '#fdf3e0',
    iconFg: '#9a6f1a',
    desc: 'Set your session intention and review your process goals.',
    linkLabel: 'Practice Card',
    route: '/practice-card',
  },
  'pre-lesson': {
    icon: '\uD83D\uDCDD',
    iconBg: '#e8eef5',
    iconFg: '#2c4a6e',
    desc: 'Review your pre-lesson summary before riding with your trainer.',
    linkLabel: 'Pre-Lesson Summary',
    route: '/lesson-prep',
  },
  viz: {
    icon: '\uD83C\uDFAF',
    iconBg: '#f0e8f5',
    iconFg: '#6b3f7a',
    desc: 'Run your opening movement in your mind before mounting.',
    linkLabel: 'Open Script',
    route: '/toolkit',
  },
  custom: {
    icon: '\u270E',
    iconBg: '#f0efed',
    iconFg: '#6b6660',
    desc: '',
    linkLabel: '',
    route: '',
  },
};

export default function PreRideRitual() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [researchHidden, setResearchHidden] = useState(false);
  const [researchOpen, setResearchOpen] = useState(true);
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved
  const [docExists, setDocExists] = useState(false);

  const dragSrc = useRef(null);
  const lastCustomRef = useRef(null);

  /* ── Load ── */
  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      const result = await readPreRideRitual(currentUser.uid);
      if (cancelled) return;
      if (result.success) {
        setBlocks(result.data.blocks);
        setResearchHidden(result.data.researchHidden);
        setDocExists(result.exists);
      } else {
        // Firestore read failed (e.g. permissions) — use defaults so page is usable
        setBlocks(DEFAULT_BLOCKS.map(b => ({ ...b })));
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [currentUser]);

  /* ── Focus last-added custom input ── */
  useEffect(() => {
    if (lastCustomRef.current) {
      lastCustomRef.current.focus();
      lastCustomRef.current = null;
    }
  });

  /* ── Helpers ── */
  const activeCount = blocks.filter(b => b.active).length;

  const toggleBlock = useCallback((idx) => {
    setBlocks(prev => prev.map((b, i) => i === idx ? { ...b, active: !b.active } : b));
  }, []);

  const removeBlock = useCallback((idx) => {
    setBlocks(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const updateCustomLabel = useCallback((idx, value) => {
    setBlocks(prev => prev.map((b, i) => i === idx ? { ...b, label: value } : b));
  }, []);

  const addCustom = useCallback(() => {
    const newBlock = {
      id: 'custom_' + Date.now(),
      type: 'custom',
      label: '',
      active: true,
      order: blocks.length,
    };
    setBlocks(prev => [...prev, newBlock]);
    lastCustomRef.current = true; // signal to focus after render
  }, [blocks.length]);

  const moveBlock = useCallback((from, to) => {
    if (from === to || to < 0) return;
    setBlocks(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  /* ── Save ── */
  const handleSave = useCallback(async () => {
    if (!currentUser || saveState === 'saving') return;
    setSaveState('saving');
    const result = await savePreRideRitual(currentUser.uid, blocks, researchHidden);
    if (result.success) {
      setDocExists(true);
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2200);
    } else {
      setSaveState('idle');
    }
  }, [currentUser, blocks, researchHidden, saveState]);

  /* ── Hide research permanently ── */
  const handleHideResearch = useCallback(async () => {
    setResearchHidden(true);
    if (currentUser) {
      await hideResearchPanel(currentUser.uid);
    }
  }, [currentUser]);

  /* ── Drag handlers (HTML5 DnD) ── */
  const handleDragStart = useCallback((e, idx) => {
    dragSrc.current = idx;
    e.dataTransfer.effectAllowed = 'move';
    // Defer adding class so the drag image captures the original look
    setTimeout(() => {
      const el = document.querySelector(`[data-ritual-idx="${idx}"]`);
      if (el) el.classList.add('prr-dragging-src');
    }, 0);
  }, []);

  const handleDragEnd = useCallback(() => {
    dragSrc.current = null;
    document.querySelectorAll('.prr-block').forEach(el => {
      el.classList.remove('prr-dragging-src', 'prr-drag-over');
    });
  }, []);

  const handleDragOver = useCallback((e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    document.querySelectorAll('.prr-block').forEach(el => el.classList.remove('prr-drag-over'));
    const el = document.querySelector(`[data-ritual-idx="${idx}"]`);
    if (el) el.classList.add('prr-drag-over');
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.currentTarget.classList.remove('prr-drag-over');
  }, []);

  const handleDrop = useCallback((e, targetIdx) => {
    e.preventDefault();
    const fromIdx = dragSrc.current;
    if (fromIdx !== null && fromIdx !== targetIdx) {
      moveBlock(fromIdx, fromIdx < targetIdx ? targetIdx : targetIdx);
    }
    dragSrc.current = null;
    document.querySelectorAll('.prr-block').forEach(el => {
      el.classList.remove('prr-dragging-src', 'prr-drag-over');
    });
  }, [moveBlock]);

  /* ── Navigate to linked section ── */
  const navigateTo = useCallback((route) => {
    if (route) navigate(route);
  }, [navigate]);

  /* ── Render ── */
  if (loading) {
    return (
      <div className="prr-container">
        <div className="prr-loading">Loading your ritual...</div>
      </div>
    );
  }

  return (
    <div className="prr-container">
      <div className="prr-eyebrow">Your Dressage Journey</div>
      <h1 className="prr-title">Pre-Ride Ritual</h1>
      <p className="prr-sub">Build a sequence that's yours. Do it the same way, every time.</p>

      {/* ── Research Panel ── */}
      {!researchHidden && (
        <div className="prr-research-box">
          <button
            className="prr-research-trigger"
            onClick={() => setResearchOpen(prev => !prev)}
          >
            <span>Why a consistent ritual works — research context</span>
            <span className={'prr-chevron' + (researchOpen ? ' open' : '')}>&#9660;</span>
          </button>
          {researchOpen && (
            <div className="prr-research-body">
              <div className="prr-stats">
                <span className="prr-stat blue">g = 0.70 under pressure</span>
                <span className="prr-stat green">d = 0.87 self-efficacy</span>
                <span className="prr-stat blue">d = 0.48 self-talk</span>
              </div>
              <p>
                A pre-performance routine's benefit comes from <strong>doing the same sequence
                consistently</strong> — not from what the sequence contains. Riders who build their own
                idiosyncratic routine outperform those given a prescribed one. The routine reduces cognitive
                load at the barn gate: you've already decided what you're bringing into the saddle.
              </p>
              <p>
                Under pressure — at shows, in high-stakes schooling — the consistency effect grows
                significantly. This is where your ritual earns its keep. Even a three-step sequence, done
                reliably, protects performance when it counts.
              </p>
              <p>
                The steps here reference your active YDJ outputs rather than prescribing content. That's
                intentional: the sequence should be in your own rhythm, not the platform's.
              </p>
              <p className="prr-cite">
                Wergin, Gr&ouml;pel &amp; Mesagno (2021), 112 effect sizes &middot; Kingston &amp; Hardy (1997)
                on process goals &middot; Hatzigeorgiadis et al. (2011) on self-talk
              </p>
              <button className="prr-hide-link" onClick={handleHideResearch}>
                Hide this — I've got it &#10003;
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Section label ── */}
      <div className="prr-section-label">Your sequence — drag to reorder</div>

      {/* ── Block list ── */}
      <div className="prr-blocks-list">
        {blocks.map((block, idx) => {
          const meta = BLOCK_META[block.type] || BLOCK_META.custom;
          const isCustom = block.type === 'custom';
          const isVizInactive = block.type === 'viz' && !block.active;

          return (
            <div
              key={block.id}
              className={'prr-block' + (block.active ? '' : ' prr-inactive')}
              data-ritual-idx={idx}
              draggable
              onDragStart={e => handleDragStart(e, idx)}
              onDragEnd={handleDragEnd}
              onDragOver={e => handleDragOver(e, idx)}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, idx)}
            >
              {/* Drag handle */}
              <div className="prr-drag-handle" title="Drag to reorder">
                <span className="prr-dh-dot" /><span className="prr-dh-dot" />
                <span className="prr-dh-dot" /><span className="prr-dh-dot" />
                <span className="prr-dh-dot" /><span className="prr-dh-dot" />
              </div>

              {/* Reorder buttons (mobile fallback) */}
              <div className="prr-reorder-btns">
                <button
                  className="prr-reorder-btn"
                  disabled={idx === 0}
                  onClick={() => moveBlock(idx, idx - 1)}
                  aria-label="Move up"
                >&#9650;</button>
                <button
                  className="prr-reorder-btn"
                  disabled={idx === blocks.length - 1}
                  onClick={() => moveBlock(idx, idx + 1)}
                  aria-label="Move down"
                >&#9660;</button>
              </div>

              {/* Icon */}
              <div
                className="prr-block-icon"
                style={{ background: meta.iconBg, color: meta.iconFg }}
              >
                {meta.icon}
              </div>

              {/* Content */}
              <div className="prr-block-content">
                {isCustom ? (
                  <input
                    className="prr-custom-input"
                    value={block.label}
                    placeholder="Describe your step..."
                    onChange={e => updateCustomLabel(idx, e.target.value)}
                    ref={el => {
                      if (lastCustomRef.current === true && idx === blocks.length - 1) {
                        lastCustomRef.current = el;
                      }
                    }}
                  />
                ) : (
                  <div className="prr-block-label">{block.label}</div>
                )}
                {!isCustom && <div className="prr-block-desc">{meta.desc}</div>}
                {isVizInactive && (
                  <div className="prr-block-cond">
                    No active script — turn on when you have a visualization script
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="prr-block-actions">
                {!isCustom && meta.linkLabel && (
                  <button
                    className="prr-open-link"
                    onClick={() => navigateTo(meta.route)}
                  >
                    {meta.linkLabel} &#8599;
                  </button>
                )}
                {isCustom ? (
                  <button
                    className="prr-rm-btn"
                    onClick={() => removeBlock(idx)}
                    title="Remove"
                  >&times;</button>
                ) : (
                  <label className="prr-toggle-wrap" title={block.active ? 'Disable this step' : 'Enable this step'}>
                    <input
                      type="checkbox"
                      checked={block.active}
                      onChange={() => toggleBlock(idx)}
                    />
                    <span className="prr-toggle-slider" />
                  </label>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Add custom step ── */}
      <button className="prr-add-btn" onClick={addCustom}>+ Add your own step</button>

      {/* ── Footer ── */}
      <div className="prr-footer">
        <span className="prr-step-count">
          {activeCount} active step{activeCount !== 1 ? 's' : ''}
        </span>
        <button
          className={'prr-save-btn' + (saveState === 'saved' ? ' saved' : '')}
          onClick={handleSave}
          disabled={saveState === 'saving'}
        >
          {saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'Saved \u2713' : 'Save my ritual'}
        </button>
      </div>
    </div>
  );
}
