import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase-config';
import { useAuth } from '../../contexts/AuthContext';
import { regenerateFirstLight as callRegenerateFirstLight } from '../../services/aiService';
import { VOICE_META } from '../../services/aiService';
import LoadingExperience from './LoadingExperience';
import './FirstLightViewer.css';

const VOICE_INDEX_BY_KEY = { classical: 0, empathetic: 1, technical: 2, strategic: 3 };

function voiceMetaFor(key) {
  const idx = VOICE_INDEX_BY_KEY[key];
  return idx !== undefined ? VOICE_META[idx] : null;
}

function formatGeneratedDate(ts) {
  if (!ts) return '';
  // ts may be a Firestore Timestamp object (live snapshot) or an ISO string (cached)
  let date;
  if (ts.toDate) {
    date = ts.toDate();
  } else if (typeof ts === 'string') {
    date = new Date(ts);
  } else if (ts.seconds) {
    date = new Date(ts.seconds * 1000);
  } else {
    return '';
  }
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/**
 * Pre-graduation footer counter — shows progress toward Multi-Voice.
 */
function PreGradProgress({ debriefCount, categoriesCount }) {
  return (
    <div className="fl-viewer-progress">
      Your full coaching arc unlocks at 5 debriefs and reflections in all six categories.
      You're <strong>{Math.min(debriefCount, 5)} / 5</strong> debriefs and{' '}
      <strong>{categoriesCount} / 6</strong> categories so far.
    </div>
  );
}

export default function FirstLightViewer() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [doc1, setDoc1] = useState(null); // firstLight/current
  const [loading, setLoading] = useState(true);
  const [debriefCount, setDebriefCount] = useState(0);
  const [categoriesCount, setCategoriesCount] = useState(0);
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState(null);

  // Subscribe to firstLight/current
  useEffect(() => {
    if (!currentUser) return;
    const ref = doc(db, 'riders', currentUser.uid, 'firstLight', 'current');
    const unsub = onSnapshot(ref, (snap) => {
      setDoc1(snap.exists() ? snap.data() : null);
      setLoading(false);
    }, (err) => {
      console.warn('[FirstLightViewer] firstLight/current:', err.message);
      setLoading(false);
    });
    return () => unsub();
  }, [currentUser]);

  // Pre-graduation progress counters
  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    (async () => {
      try {
        const debriefsSnap = await getDocs(query(
          collection(db, 'debriefs'),
          where('userId', '==', currentUser.uid),
          where('isDeleted', '==', false),
        ));
        const reflectionsSnap = await getDocs(query(
          collection(db, 'reflections'),
          where('userId', '==', currentUser.uid),
          where('isDeleted', '==', false),
        ));
        if (cancelled) return;
        setDebriefCount(debriefsSnap.size);
        const cats = new Set();
        reflectionsSnap.forEach(d => {
          const c = d.data().category;
          if (c) cats.add(c);
        });
        setCategoriesCount(cats.size);
      } catch (err) {
        console.warn('[FirstLightViewer] progress query failed:', err.message);
      }
    })();
    return () => { cancelled = true; };
  }, [currentUser, doc1]); // refresh counts when doc updates (e.g. after regenerate)

  async function handleRegenerate() {
    setRegenerating(true);
    setRegenError(null);
    try {
      console.log('[FirstLightViewer] calling regenerateFirstLight…');
      const result = await callRegenerateFirstLight();
      console.log('[FirstLightViewer] regenerate result:', result);
      // The onSnapshot listener will pick up the update.
    } catch (err) {
      console.error('[FirstLightViewer] regenerate failed:', err);
      setRegenError({
        code: err?.code || 'unknown',
        message: err?.message || String(err),
      });
    } finally {
      setRegenerating(false);
    }
  }

  // ─── States ────────────────────────────────────────────────────────

  if (loading) {
    return <div className="fl-viewer-state">Loading your First Light…</div>;
  }

  if (!doc1) {
    return (
      <div className="fl-viewer-state">
        <h1>Your First Light hasn't been generated yet.</h1>
        <p>Head to Quick Start to begin.</p>
        <button className="fl-viewer-btn-primary" onClick={() => navigate('/quickstart')}>
          Go to Quick Start →
        </button>
      </div>
    );
  }

  if (regenerating) {
    return (
      <div className="fl-viewer-page">
        <LoadingExperience mode="regenerate" />
      </div>
    );
  }

  const sections = doc1.sections || {};
  const primary = voiceMetaFor(doc1.primaryVoice);
  const otherVoices = Array.isArray(sections.otherVoices) ? sections.otherVoices : [];
  const generatedDateStr = formatGeneratedDate(doc1.generatedAt);
  const isGraduated = !!doc1.graduatedAt;
  const regenAvailable = !doc1.regeneratedAt && !isGraduated;

  return (
    <div className="fl-viewer-page">
      {/* HEADER */}
      <header className="fl-viewer-header">
        <div className="fl-viewer-eyebrow">✦ Your First Light</div>
        <h1>A first read of you and your horse from your coaches.</h1>
        <div className="fl-viewer-meta">
          {generatedDateStr && <span>Generated {generatedDateStr}</span>}
          {primary && (
            <>
              <span className="fl-viewer-dot" />
              <span
                className="fl-viewer-voice-badge"
                style={{ background: `${primary.color}1A`, color: primary.color, borderColor: primary.color }}
              >
                Primary voice: {primary.name}
              </span>
            </>
          )}
        </div>
      </header>

      {/* riderRead */}
      {sections.riderRead && (
        <section className="fl-viewer-section">
          {primary && (
            <div className="fl-viewer-attribution" style={{ color: primary.color }}>
              {primary.name}
            </div>
          )}
          <p className="fl-viewer-prose">{sections.riderRead}</p>
        </section>
      )}

      {/* partnershipRead */}
      {sections.partnershipRead && (
        <section className="fl-viewer-section">
          {primary && (
            <div className="fl-viewer-attribution" style={{ color: primary.color }}>
              {primary.name}, on the partnership
            </div>
          )}
          <p className="fl-viewer-prose">{sections.partnershipRead}</p>
        </section>
      )}

      {/* otherVoices */}
      {otherVoices.length > 0 && (
        <section className="fl-viewer-other-voices">
          <h2 className="fl-viewer-section-heading">Your other coaches are listening too</h2>
          <div className="fl-viewer-voice-grid">
            {otherVoices.map((ov, i) => {
              const meta = voiceMetaFor(ov.voice);
              return (
                <div
                  key={i}
                  className="fl-viewer-voice-card"
                  style={meta ? { borderTopColor: meta.color } : undefined}
                >
                  {meta && (
                    <div className="fl-viewer-voice-card-name" style={{ color: meta.color }}>
                      {meta.name}
                    </div>
                  )}
                  <p className="fl-viewer-voice-card-msg">{ov.message}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* whereWeBegin */}
      {sections.whereWeBegin && (
        <section className="fl-viewer-section fl-viewer-where">
          <div className="fl-viewer-where-label">Where we begin</div>
          <blockquote className="fl-viewer-where-quote">{sections.whereWeBegin}</blockquote>
        </section>
      )}

      {/* FOOTER — three states per §7.3 */}
      <footer className="fl-viewer-footer">
        {/* State: post-graduation */}
        {isGraduated && (
          <div className="fl-viewer-footer-block fl-viewer-footer-graduated">
            <div className="fl-viewer-footer-msg">
              Multi-Voice Coaching has unfolded from this beginning. Your full coaching arc is active.
            </div>
            <Link to="/insights" className="fl-viewer-btn-secondary">
              View your current Multi-Voice →
            </Link>
          </div>
        )}

        {/* State: pre-graduation, regenerate available */}
        {!isGraduated && regenAvailable && (
          <div className="fl-viewer-footer-block">
            <div className="fl-viewer-footer-msg">
              Your First Light reflects what you've shared so far. As you log debriefs, more reflections,
              and self-assessments, your full coaching arc unfolds. You have <strong>one regenerate</strong>{' '}
              available — use it when you've added enough new material that you want to hear from your
              coaches again.
            </div>
            <PreGradProgress debriefCount={debriefCount} categoriesCount={categoriesCount} />
            <button
              type="button"
              className="fl-viewer-btn-primary"
              onClick={handleRegenerate}
              disabled={regenerating}
            >
              Regenerate My First Light →
            </button>
            {regenError && (
              <div className="fl-viewer-error" role="alert">
                <strong>Regenerate failed.</strong>
                <div>{regenError.message}</div>
                <div style={{ marginTop: 6, fontSize: '0.85em' }}>
                  <code>{regenError.code}</code>
                </div>
              </div>
            )}
          </div>
        )}

        {/* State: pre-graduation, regenerate already used */}
        {!isGraduated && !regenAvailable && (
          <div className="fl-viewer-footer-block">
            <div className="fl-viewer-footer-msg">
              Your First Light reflects what you've shared so far. Your full coaching arc unlocks
              at 5 debriefs and reflections in all six categories.
            </div>
            <PreGradProgress debriefCount={debriefCount} categoriesCount={categoriesCount} />
          </div>
        )}
      </footer>
    </div>
  );
}
