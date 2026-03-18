import { useState, useEffect, useRef } from 'react';
import { getTestData, getShortLabel, isFullDataAvailable } from '../../services/testDatabase';
import './TestReferencePanel.css';

/**
 * TestReferencePanel — shared tabbed sidebar for Show Prep Form and Show Planner.
 *
 * Props:
 *   testId        — currently displayed test key (e.g. 'psg')
 *   onFlagChange  — (testId, itemId, isFlagged) => void
 *   flagState     — { [testId]: { [itemId]: boolean } }
 *   defaultTab    — 'flag' | 'overview' | 'movements' | 'coefficients'
 *   compact       — true = sidebar mode (310px); false = full width
 *   selectedTests — array of { value, label } for multi-test pill switcher
 *   onTestSwitch  — (testId) => void — called when user clicks a different pill
 *   sticky        — true for sticky sidebar positioning
 */
export default function TestReferencePanel({
  testId,
  onFlagChange,
  flagState = {},
  defaultTab = 'flag',
  compact = true,
  selectedTests = [],
  onTestSwitch,
  sticky = false,
}) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const panelRef = useRef(null);
  const [hasActivated, setHasActivated] = useState(false);

  const data = testId ? getTestData(testId) : null;
  const hasData = testId ? isFullDataAvailable(testId) : false;
  const flags = flagState[testId] || {};
  const flagCount = data
    ? (data.assessItems || []).filter(i => flags[i.id]).length
    : 0;

  // Pulse sidebar on first test activation
  useEffect(() => {
    if (testId && !hasActivated && panelRef.current) {
      setHasActivated(true);
      panelRef.current.classList.add('just-activated');
      const timer = setTimeout(() => {
        panelRef.current?.classList.remove('just-activated');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [testId, hasActivated]);

  // No test selected — show empty state
  if (!testId && selectedTests.length === 0) {
    return (
      <div ref={panelRef} className={`trp-panel${sticky ? ' trp-sticky' : ''}`}>
        <div className="trp-head">
          <div className="trp-eyebrow">Test Reference</div>
          <div className="trp-title">No test selected yet</div>
          <div className="trp-sub">Select your tests in the form</div>
        </div>
        <div className="trp-empty">
          <div className="trp-empty-msg">
            Select a test in the form and this panel will load the movements,
            coefficients, and Flag for Prep checklist for that test.
          </div>
          <div className="trp-empty-arrow">↓ select your tests to begin</div>
        </div>
      </div>
    );
  }

  const handleTabClick = (tabName) => {
    setActiveTab(tabName);
  };

  const handleFlagToggle = (itemId) => {
    if (onFlagChange && testId) {
      const currentlyFlagged = !!(flagState[testId]?.[itemId]);
      onFlagChange(testId, itemId, !currentlyFlagged);
    }
  };

  const testLabel = data?.label || selectedTests.find(t => t.value === testId)?.label || testId;
  const testSub = data
    ? `${data.org} · use Flag for Prep to prioritize your AI output`
    : 'Full movement data coming soon';

  return (
    <div ref={panelRef} className={`trp-panel${sticky ? ' trp-sticky' : ''}`}>
      {/* Header */}
      <div className="trp-head">
        <div className="trp-eyebrow">Test Reference</div>
        <div className="trp-title">{testLabel}</div>
        <div className="trp-sub">{testSub}</div>
      </div>

      {/* Pill switcher (shown when >1 test) */}
      {selectedTests.length > 1 && (
        <div className="trp-switcher">
          {selectedTests.map(t => (
            <button
              key={t.value}
              type="button"
              className={`trp-pill${t.value === testId ? ' active' : ''}`}
              onClick={() => onTestSwitch?.(t.value)}
            >
              {getShortLabel(t.value)}
            </button>
          ))}
        </div>
      )}

      {/* Flag count badge */}
      <div className="trp-flag-badge">
        {flagCount === 0 ? '0 movements flagged' : `${flagCount} flagged for this test`}
      </div>

      {/* Tab bar */}
      <div className="trp-tabs">
        {['overview', 'movements', 'coefficients', 'flag'].map(tab => (
          <button
            key={tab}
            type="button"
            className={`trp-tab${activeTab === tab ? ' active' : ''}`}
            onClick={() => handleTabClick(tab)}
          >
            {tab === 'flag' ? 'Flag for Prep' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className={`trp-tab-content${activeTab === 'overview' ? ' active' : ''}`}>
        {hasData ? <OverviewTab data={data} /> : <NoDataPlaceholder />}
      </div>

      <div className={`trp-tab-content${activeTab === 'movements' ? ' active' : ''}`}>
        {hasData ? <MovementsTab data={data} /> : <NoDataPlaceholder />}
      </div>

      <div className={`trp-tab-content${activeTab === 'coefficients' ? ' active' : ''}`}>
        {hasData ? <CoefficientsTab data={data} /> : <NoDataPlaceholder />}
      </div>

      <div className={`trp-tab-content${activeTab === 'flag' ? ' active' : ''}`}>
        {hasData ? (
          <FlagTab
            data={data}
            testId={testId}
            flags={flags}
            onToggle={handleFlagToggle}
          />
        ) : (
          <NoDataPlaceholder message="Movement flagging for this test will be available once its data is added to the database. You can still describe concerns in the free-text fields below." />
        )}
      </div>
    </div>
  );
}

// ── SUB-COMPONENTS ──────────────────────────────────────────────────────────

function NoDataPlaceholder({ message }) {
  return (
    <div className="trp-no-data">
      <div className="trp-no-data-msg">
        {message || 'Full movement data for this test will be available in the next database update. PSG, Inter I, Inter II, Grand Prix, and Grand Prix Special have complete data today.'}
      </div>
    </div>
  );
}

function OverviewTab({ data }) {
  return (
    <>
      <div className="trp-meta-grid">
        <div className="trp-meta-cell">
          <div className="trp-meta-val">{data.org}</div>
          <div className="trp-meta-key">Org</div>
        </div>
        <div className="trp-meta-cell">
          <div className="trp-meta-val">{data.duration}</div>
          <div className="trp-meta-key">Duration</div>
        </div>
        <div className="trp-meta-cell">
          <div className="trp-meta-val">{data.minAge}</div>
          <div className="trp-meta-key">Min Age</div>
        </div>
        <div className="trp-meta-cell">
          <div className="trp-meta-val">{data.arena}</div>
          <div className="trp-meta-key">Arena</div>
        </div>
      </div>

      <div className="trp-directives-title">What Judges Are Watching For</div>
      {data.directives.map((d, i) => (
        <div key={i} className="trp-directive">
          <strong>{d.title}</strong> — {d.body}
        </div>
      ))}

      {data.keyDifferences && (
        <div className="trp-new-callout">
          <strong>What's new at this level:</strong> {data.keyDifferences}
        </div>
      )}
    </>
  );
}

function MovementsTab({ data }) {
  return (
    <>
      {data.movementGroups.map((g, gi) => (
        <div key={gi} className="trp-mov-group">
          <div className="trp-mov-group-head">
            <div className="trp-mov-dot" style={{ background: g.color }} />
            <div className="trp-mov-label">{g.label}</div>
          </div>
          <div className="trp-mov-items">
            {g.movements.map((m, mi) => (
              <span
                key={mi}
                className={`trp-chip${m.coeff ? ' coeff' : ''}${m.newAtLevel ? ' new-at' : ''}`}
              >
                {m.text}
              </span>
            ))}
          </div>
        </div>
      ))}
      <div className="trp-mov-note">
        <span style={{ color: 'var(--mental-color)', fontWeight: 600 }}>Blue chips</span> = new at this level
        &nbsp;&middot;&nbsp;
        <span style={{ color: 'var(--tech-color)', fontWeight: 600 }}>Rust chips &times;2</span> = double coefficient
      </div>
    </>
  );
}

function CoefficientsTab({ data }) {
  return (
    <>
      <table className="trp-coeff-table">
        <thead>
          <tr>
            <th>Movement</th>
            <th style={{ width: 48, textAlign: 'center' }}>Coeff</th>
            <th>Why It Matters</th>
          </tr>
        </thead>
        <tbody>
          {data.coefficients.map((c, i) => (
            <tr key={i}>
              <td>{c.movement}</td>
              <td style={{ textAlign: 'center' }}>
                <span className={`trp-coeff-badge${c.type === 'collective' ? ' collective' : ''}`}>
                  {c.badge}
                </span>
              </td>
              <td>{c.why}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="trp-coeff-note">
        Verify against the current official test sheet before competing.
      </div>
    </>
  );
}

function FlagTab({ data, testId, flags, onToggle }) {
  const flaggedItems = data.assessItems.filter(i => flags[i.id]);

  return (
    <>
      <div className="trp-flag-intro">
        Flag movements or directives to prioritize in your prep plan. Double-coefficient items carry extra weight in the Technical output.
      </div>

      {data.assessItems.map(item => (
        <div
          key={item.id}
          className={`trp-flag-row${flags[item.id] ? ' flagged' : ''}`}
          onClick={() => onToggle(item.id)}
        >
          <div className="trp-flag-check">
            {flags[item.id] ? '✓' : ''}
          </div>
          <div>
            <div className="trp-flag-text">
              {item.text}
              {item.coeff && <span className="trp-flag-coeff-marker">×2</span>}
            </div>
            <div className="trp-flag-note">{item.note}</div>
          </div>
        </div>
      ))}

      <div className="trp-flag-summary">
        <div className="trp-flag-summary-label">Flagged for AI</div>
        <div className="trp-flag-chips">
          {flaggedItems.length === 0 ? (
            <span className="trp-flag-summary-empty">None flagged yet</span>
          ) : (
            flaggedItems.map(item => (
              <span key={item.id} className="trp-flag-chip">
                {item.text}
                {item.coeff && <span className="x2"> ×2</span>}
              </span>
            ))
          )}
        </div>
      </div>
    </>
  );
}
