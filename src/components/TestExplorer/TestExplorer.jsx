import { useState, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase-config';
import {
  getTestList, getTestData, isFullDataAvailable, getShortLabel
} from '../../services/testDatabase';
import '../Forms/Forms.css';
import './TestExplorer.css';

const ALL_TESTS = getTestList();

// Classical Master system prompt
const SYSTEM_PROMPT = `You are the Classical Master coaching voice for Your Dressage Journey, an AI dressage coaching platform for adult amateur riders. Your voice is precise, pithy, and honest — "Why not the first time?" is your ethos. You respect the rider's intelligence.

Rules:
- Never use bullet points or headers
- Speak in complete paragraphs
- Be direct about gaps without being discouraging
- Lead with double-coefficient movements when any are flagged developing — those are the highest-leverage areas
- Do not mention that you are an AI
- Do not use the rider's name (you don't have it)
- Keep total response under 400 words (single test) or 500 words (compare mode)
- In compare mode: one paragraph per test, then one comparative paragraph`;

export default function TestExplorer() {
  const [mode, setMode] = useState('one'); // 'one' | 'compare'
  const [test1, setTest1] = useState('');
  const [test2, setTest2] = useState('');

  // devState: { [testId]: { [itemId]: boolean } }
  const [devState, setDevState] = useState({});

  // AI analysis
  const [analysisText, setAnalysisText] = useState('');
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);

  const handleDevToggle = useCallback((testId, itemId) => {
    setDevState(prev => ({
      ...prev,
      [testId]: {
        ...prev[testId],
        [itemId]: !prev[testId]?.[itemId]
      }
    }));
  }, []);

  function getReadinessStats(testId) {
    const data = getTestData(testId);
    if (!data) return null;
    const items = data.assessItems || [];
    const total = items.length;
    const developing = items.filter(i => devState[testId]?.[i.id]).length;
    const solid = total - developing;
    const pct = total > 0 ? Math.round((solid / total) * 100) : 0;
    return { total, developing, solid, pct };
  }

  function getCategoryPct(testId, gaitGroup) {
    const data = getTestData(testId);
    if (!data) return 0;
    const items = (data.assessItems || []).filter(i => i.gaitGroup === gaitGroup);
    if (items.length === 0) return 0;
    const developing = items.filter(i => devState[testId]?.[i.id]).length;
    return Math.round(((items.length - developing) / items.length) * 100);
  }

  function buildExplorerPrompt() {
    const tests = [test1, mode === 'compare' ? test2 : null].filter(Boolean);
    const parts = [];

    tests.forEach((tKey, idx) => {
      const data = getTestData(tKey);
      if (!data) return;
      const items = data.assessItems || [];
      const devItems = items.filter(i => devState[tKey]?.[i.id]);
      const devCoeff = devItems.filter(i => i.coeff);
      const solidCount = items.length - devItems.length;

      parts.push([
        `Test ${idx + 1}: ${data.label}`,
        `Total assessed movements: ${items.length}`,
        `Solid: ${solidCount}`,
        `Developing: ${devItems.length}${devItems.length > 0 ? ` (${devItems.map(i => i.text).join(', ')})` : ''}`,
        devCoeff.length > 0 ? `Developing DOUBLE-COEFFICIENT movements: ${devCoeff.map(i => i.text).join(', ')}` : null,
      ].filter(Boolean).join('\n'));
    });

    if (mode === 'compare' && test2) {
      const d2 = getTestData(test2);
      if (d2?.keyDifferences) {
        parts.push(`What's new at ${d2.label}: ${d2.keyDifferences}`);
      }

      // Find overlapping developing items
      const dev1 = new Set((getTestData(test1)?.assessItems || [])
        .filter(i => devState[test1]?.[i.id]).map(i => i.text));
      const dev2 = new Set((getTestData(test2)?.assessItems || [])
        .filter(i => devState[test2]?.[i.id]).map(i => i.text));
      const overlap = [...dev1].filter(t => dev2.has(t));
      if (overlap.length > 0) {
        parts.push(`Developing movements that overlap between both tests: ${overlap.join(', ')}`);
      }
    }

    return parts.join('\n\n');
  }

  async function handleGetCoachingRead() {
    setAnalysisLoading(true);
    setAnalysisError(null);
    setAnalysisText('');

    try {
      const userMessage = buildExplorerPrompt();

      // Call via Cloud Function (same pattern as other AI calls)
      const callFn = httpsCallable(functions, 'testExplorerAnalysis');

      const result = await callFn({
        systemPrompt: SYSTEM_PROMPT,
        userMessage,
        maxTokens: 600
      });

      if (result.data?.success) {
        setAnalysisText(result.data.text);
      } else {
        throw new Error(result.data?.message || 'Analysis failed');
      }
    } catch (err) {
      console.error('Test Explorer analysis error:', err);
      setAnalysisError(err.message || 'Failed to get coaching analysis. Please try again.');
    } finally {
      setAnalysisLoading(false);
    }
  }

  const hasTest1 = test1 && isFullDataAvailable(test1);
  const hasTest2 = mode === 'compare' && test2 && isFullDataAvailable(test2);
  const stats1 = hasTest1 ? getReadinessStats(test1) : null;
  const stats2 = hasTest2 ? getReadinessStats(test2) : null;
  const showChart = mode === 'compare' && hasTest1 && hasTest2 && analysisText;
  const gaitGroups = ['trot', 'canter', 'walk', 'other'];

  return (
    <div className="form-page">
      <div className="form-page-header">
        <h1>Test Explorer</h1>
        <p>Explore test requirements and assess your readiness — no show pressure</p>
      </div>

      {/* Mode toggle + test selectors */}
      <div className="te-selector-bar">
        <div className="te-mode-toggle">
          <button
            type="button"
            className={`te-mode-btn${mode === 'one' ? ' active' : ''}`}
            onClick={() => { setMode('one'); setTest2(''); setAnalysisText(''); }}
          >
            One Test
          </button>
          <button
            type="button"
            className={`te-mode-btn${mode === 'compare' ? ' active' : ''}`}
            onClick={() => { setMode('compare'); setAnalysisText(''); }}
          >
            Compare Two
          </button>
        </div>

        <div className="te-selectors">
          <div className="te-select-wrap">
            <label className="te-select-label">Test {mode === 'compare' ? '1' : ''}</label>
            <select value={test1} onChange={e => { setTest1(e.target.value); setAnalysisText(''); }}>
              <option value="">Select a test...</option>
              {ALL_TESTS.map(t => (
                <option key={t.value} value={t.value}>
                  {t.label} {!isFullDataAvailable(t.value) ? '(coming soon)' : ''}
                </option>
              ))}
            </select>
          </div>
          {mode === 'compare' && (
            <div className="te-select-wrap">
              <label className="te-select-label">Test 2</label>
              <select value={test2} onChange={e => { setTest2(e.target.value); setAnalysisText(''); }}>
                <option value="">Select a test...</option>
                {ALL_TESTS.filter(t => t.value !== test1).map(t => (
                  <option key={t.value} value={t.value}>
                    {t.label} {!isFullDataAvailable(t.value) ? '(coming soon)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Panels */}
      <div className={`te-panels${mode === 'compare' ? ' compare' : ''}`}>
        {hasTest1 && (
          <ExplorerPanel
            testId={test1}
            devState={devState}
            onToggle={handleDevToggle}
            stats={stats1}
          />
        )}
        {hasTest2 && (
          <ExplorerPanel
            testId={test2}
            devState={devState}
            onToggle={handleDevToggle}
            stats={stats2}
          />
        )}
        {test1 && !hasTest1 && (
          <div className="te-panel">
            <div className="te-panel-head">
              <div className="te-panel-title">{getShortLabel(test1) || test1}</div>
            </div>
            <div className="te-no-data">
              Full movement data for this test will be available in the next database update. PSG, Inter I, Inter II, Grand Prix, and Grand Prix Special have complete data today.
            </div>
          </div>
        )}
        {mode === 'compare' && test2 && !hasTest2 && (
          <div className="te-panel">
            <div className="te-panel-head">
              <div className="te-panel-title">{getShortLabel(test2) || test2}</div>
            </div>
            <div className="te-no-data">
              Full movement data for this test will be available in the next database update.
            </div>
          </div>
        )}
      </div>

      {/* Readiness stats + AI analysis */}
      {(hasTest1 || hasTest2) && (
        <div className="te-readiness-section">
          {/* Stat cards */}
          <div className={`te-stats-row${mode === 'compare' && hasTest2 ? ' compare' : ''}`}>
            {stats1 && (
              <ReadinessCard
                label={mode === 'compare' ? getShortLabel(test1) : 'Readiness'}
                stats={stats1}
                color="var(--forest)"
              />
            )}
            {mode === 'compare' && stats2 && (
              <ReadinessCard
                label={getShortLabel(test2)}
                stats={stats2}
                color="var(--mental-color)"
              />
            )}
          </div>

          {/* Get Coaching Read button */}
          <div className="te-analysis-trigger">
            <button
              type="button"
              className="te-coaching-btn"
              onClick={handleGetCoachingRead}
              disabled={analysisLoading}
            >
              {analysisLoading ? 'Analyzing...' : 'Get Coaching Read'}
            </button>
          </div>

          {/* AI output */}
          {analysisError && (
            <div className="te-analysis-error">{analysisError}</div>
          )}
          {analysisText && (
            <div className="te-coaching-output">
              <div className="te-coaching-text">{analysisText}</div>
              <div className="te-coaching-attr">— The Classical Master, Your Dressage Journey</div>
            </div>
          )}

          {/* Comparison chart */}
          {showChart && (
            <div className="te-chart-section">
              <div className="te-chart-title">Readiness by Category</div>
              <div className="te-chart">
                {gaitGroups.map(group => {
                  const pct1 = getCategoryPct(test1, group);
                  const pct2 = getCategoryPct(test2, group);
                  return (
                    <div key={group} className="te-chart-row">
                      <div className="te-chart-label">{group.charAt(0).toUpperCase() + group.slice(1)}</div>
                      <div className="te-chart-bars">
                        <div className="te-chart-bar-wrap">
                          <div
                            className="te-chart-bar t1"
                            style={{ width: `${pct1}%` }}
                          />
                          <span className="te-chart-pct">{pct1}%</span>
                        </div>
                        <div className="te-chart-bar-wrap">
                          <div
                            className="te-chart-bar t2"
                            style={{ width: `${pct2}%` }}
                          />
                          <span className="te-chart-pct">{pct2}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="te-chart-legend">
                <span className="te-legend-item"><span className="te-legend-dot t1" />{getShortLabel(test1)}</span>
                <span className="te-legend-item"><span className="te-legend-dot t2" />{getShortLabel(test2)}</span>
              </div>
              <div className="te-chart-footer">
                Based on self-assessment only. Bar length = % of movements the rider considers solid in training for that category.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── EXPLORER PANEL ─────────────────────────────────────────────────────────────

function ExplorerPanel({ testId, devState, onToggle, stats }) {
  const [activeTab, setActiveTab] = useState('directives');
  const data = getTestData(testId);
  if (!data) return null;

  const flags = devState[testId] || {};
  const tabs = ['directives', 'movements', 'coefficients', 'assessment'];

  return (
    <div className="te-panel">
      <div className="te-panel-head">
        <div className="te-panel-title">{data.label}</div>
        <div className="te-panel-sub">{data.org} · {data.arena} · {data.duration}</div>
        {stats && (
          <div className="te-readiness-bar-wrap">
            <div className="te-readiness-bar">
              <div className="te-readiness-fill" style={{ width: `${stats.pct}%` }} />
            </div>
            <span className="te-readiness-pct">{stats.pct}% ready</span>
          </div>
        )}
      </div>

      <div className="te-tabs">
        {tabs.map(tab => (
          <button
            key={tab}
            type="button"
            className={`te-tab${activeTab === tab ? ' active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'assessment' ? 'Assessment' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="te-tab-body">
        {activeTab === 'directives' && (
          <>
            <div className="te-section-label">What Judges Are Watching For</div>
            {data.directives.map((d, i) => (
              <div key={i} className="te-directive">
                <strong>{d.title}</strong> — {d.body}
              </div>
            ))}
            {data.keyDifferences && (
              <div className="te-new-callout">
                <strong>What's new at this level:</strong> {data.keyDifferences}
              </div>
            )}
          </>
        )}

        {activeTab === 'movements' && (
          <>
            {data.movementGroups.map((g, gi) => (
              <div key={gi} className="te-mov-group">
                <div className="te-mov-head">
                  <span className="te-mov-dot" style={{ background: g.color }} />
                  <span className="te-mov-label">{g.label}</span>
                </div>
                <div className="te-mov-chips">
                  {g.movements.map((m, mi) => (
                    <span key={mi} className={`trp-chip${m.coeff ? ' coeff' : ''}${m.newAtLevel ? ' new-at' : ''}`}>
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
        )}

        {activeTab === 'coefficients' && (
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
        )}

        {activeTab === 'assessment' && (
          <>
            <div className="te-assess-intro">
              Mark movements you're still developing. This self-assessment updates your readiness score and gives the AI coaching analysis more to work with.
            </div>
            {data.assessItems.map(item => (
              <div
                key={item.id}
                className={`te-assess-row${flags[item.id] ? ' developing' : ''}`}
                onClick={() => onToggle(testId, item.id)}
              >
                <div className="te-assess-check">
                  {flags[item.id] ? '!' : ''}
                </div>
                <div>
                  <div className="te-assess-text">
                    {item.text}
                    {item.coeff && <span className="te-assess-coeff">x2</span>}
                  </div>
                  <div className="te-assess-note">{item.note}</div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ── READINESS CARD ─────────────────────────────────────────────────────────────

function ReadinessCard({ label, stats, color }) {
  return (
    <div className="te-stat-card">
      <div className="te-stat-label">{label}</div>
      <div className="te-stat-pct" style={{ color }}>{stats.pct}%</div>
      <div className="te-stat-detail">
        {stats.solid} solid · {stats.developing} developing · {stats.total} total
      </div>
      <div className="te-stat-bar">
        <div className="te-stat-bar-fill" style={{ width: `${stats.pct}%`, background: color }} />
      </div>
    </div>
  );
}
