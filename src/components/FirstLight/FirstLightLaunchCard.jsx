import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  collection, doc, query, where, onSnapshot,
} from 'firebase/firestore';
import { db } from '../../firebase-config';
import { useAuth } from '../../contexts/AuthContext';
import {
  generateFirstLight as callGenerateFirstLight,
  VOICE_META,
} from '../../services/aiService';
import LoadingExperience from './LoadingExperience';
import './FirstLightLaunchCard.css';

const REQUIRED_CATEGORIES = ['personal', 'validation', 'aha', 'obstacle', 'connection', 'feel'];
const VOICE_INDEX_BY_KEY = { classical: 0, empathetic: 1, technical: 2, strategic: 3 };

/**
 * Translate a Firebase callable error into a friendly diagnostic showing
 * BOTH the code and the underlying server message — the previous "internal"-only
 * display hid the real cause.
 */
function describeGenerateError(err) {
  const code = err?.code || '';
  const rawMessage = err?.message || String(err);
  const details = err?.details;

  let extra = '';
  if (details) {
    if (typeof details === 'string') extra = details;
    else if (details.category) extra = `[category: ${details.category}]`;
    else extra = JSON.stringify(details);
  }

  const looksUndeployed =
    code === 'functions/internal' ||
    code === 'internal' ||
    code === 'functions/not-found' ||
    code === 'not-found';

  return {
    code: code || 'unknown',
    message: rawMessage,
    extra,
    hint: looksUndeployed
      ? 'If this is the first run after Phase B, the Cloud Function may not be deployed yet. Run: firebase deploy --only functions:generateFirstLight'
      : null,
  };
}

function voiceLabelFor(key) {
  const idx = VOICE_INDEX_BY_KEY[key];
  return idx !== undefined ? VOICE_META[idx].name : key;
}

function formatDate(ts) {
  if (!ts) return '';
  let d;
  if (ts.toDate) d = ts.toDate();
  else if (typeof ts === 'string') d = new Date(ts);
  else if (ts.seconds) d = new Date(ts.seconds * 1000);
  else return '';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/**
 * Quick Start launch surface for First Light.
 *
 * Renders one of seven card states per §6.1 of the implementation brief:
 *   A — Not Yet Eligible
 *   B — Eligible, no wizard reflections yet
 *   C — Wizard in progress (1–5 of 6)
 *   D — All 6 reflections complete, not yet generated
 *   E — Generating (uses LoadingExperience)
 *   F — Generated, regenerate available
 *   G — Generated, regenerate used
 *
 * After graduation the card hides itself entirely — First Light moves to the
 * "Your Journey So Far" archive on the Dashboard (per §6.4 / §7.1).
 *
 * Props:
 *   eligible — boolean. Rider profile + ≥1 horse profile both complete.
 */
export default function FirstLightLaunchCard({ eligible }) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [wizardCategoriesDone, setWizardCategoriesDone] = useState(new Set());
  const [firstLightDoc, setFirstLightDoc] = useState(null);
  const [firstLightLoading, setFirstLightLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(null);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'reflections'),
      where('userId', '==', currentUser.uid),
      where('isDeleted', '==', false),
      where('source', '==', 'first-light-entry')
    );
    const unsub = onSnapshot(q, (snap) => {
      const cats = new Set();
      snap.forEach((d) => {
        const cat = d.data().category;
        if (REQUIRED_CATEGORIES.includes(cat)) cats.add(cat);
      });
      setWizardCategoriesDone(cats);
    }, (err) => console.warn('[FirstLightLaunchCard] reflections:', err.message));
    return () => unsub();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const ref = doc(db, 'riders', currentUser.uid, 'firstLight', 'current');
    const unsub = onSnapshot(ref, (snap) => {
      setFirstLightDoc(snap.exists() ? snap.data() : null);
      setFirstLightLoading(false);
    }, (err) => {
      console.warn('[FirstLightLaunchCard] firstLight/current:', err.message);
      setFirstLightLoading(false);
    });
    return () => unsub();
  }, [currentUser]);

  async function handleGenerate() {
    setGenerating(true);
    setGenError(null);
    try {
      console.log('[FirstLightLaunchCard] calling generateFirstLight…');
      const result = await callGenerateFirstLight();
      console.log('[FirstLightLaunchCard] generate result:', result);
    } catch (err) {
      console.error('[FirstLightLaunchCard] generate failed — full error:', err);
      console.error('[FirstLightLaunchCard] code:', err?.code, 'message:', err?.message, 'details:', err?.details);
      setGenError(describeGenerateError(err));
    } finally {
      setGenerating(false);
    }
  }

  if (firstLightLoading) return null;

  // ─── State E (in-flight): show the phased loading experience ──────
  if (generating) {
    return (
      <div className="fl-card fl-card-ready">
        <div className="fl-card-eyebrow">Your First Light is on its way</div>
        <LoadingExperience mode="generate" />
      </div>
    );
  }

  const wizardCount = wizardCategoriesDone.size;
  const wizardComplete = wizardCount === REQUIRED_CATEGORIES.length;
  const hasFirstLight = !!firstLightDoc;
  const isGraduated = !!(firstLightDoc && firstLightDoc.graduatedAt);

  // After graduation the card moves to the dashboard archive — hide here.
  if (isGraduated) return null;

  // ─── State F / G: First Light exists ──────────────────────────────
  if (hasFirstLight) {
    const voice = firstLightDoc.primaryVoice;
    const voiceName = voiceLabelFor(voice);
    const generatedDateStr = formatDate(firstLightDoc.generatedAt);
    const regenAvailable = !firstLightDoc.regeneratedAt;

    return (
      <div className="fl-card fl-card-generated">
        <div className="fl-card-eyebrow">Your First Light</div>
        <div className="fl-card-title">
          {generatedDateStr ? `Generated ${generatedDateStr}` : 'Generated'}
          {voiceName && <> · primary voice: {voiceName}</>}
        </div>
        <div className="fl-card-desc">
          {regenAvailable
            ? 'Adding more data — debriefs, additional reflections, or self-assessments — sharpens your First Light. You have one regenerate available.'
            : 'Your First Light is your preserved starting point. Keep logging debriefs and reflections to unlock your full Multi-Voice coaching.'}
        </div>
        <div className="fl-card-actions">
          <Link to="/first-light" className="fl-card-btn">
            View My First Light →
          </Link>
          {regenAvailable && (
            <Link to="/first-light" className="fl-card-btn-secondary">
              Regenerate available — open viewer
            </Link>
          )}
        </div>
      </div>
    );
  }

  // ─── State A: Not Yet Eligible ────────────────────────────────────
  if (!eligible) {
    return (
      <div className="fl-card fl-card-pending">
        <div className="fl-card-eyebrow">Your First Light</div>
        <div className="fl-card-title">A first read of you and your horse from your coaches</div>
        <div className="fl-card-desc">
          Complete your Rider Profile and at least one Horse Profile above to unlock First Light entry.
          The richer your input, the richer your First Light.
        </div>
      </div>
    );
  }

  // ─── State B: Eligible, no reflections started ────────────────────
  if (wizardCount === 0) {
    return (
      <div className="fl-card">
        <div className="fl-card-eyebrow">Your First Light awaits</div>
        <div className="fl-card-title">A first read of you and your horse from your coaches</div>
        <div className="fl-card-desc">
          You'll write six short reflections — one for each category. They'll be saved to your
          reflection record and count toward your six reflection categories. Plan on 10–15 minutes.
        </div>
        <button type="button" className="fl-card-btn" onClick={() => navigate('/first-light/wizard')}>
          Begin My First Light →
        </button>
      </div>
    );
  }

  // ─── State C: Wizard in progress ──────────────────────────────────
  if (wizardCount > 0 && !wizardComplete) {
    return (
      <div className="fl-card">
        <div className="fl-card-eyebrow">Your First Light · in progress</div>
        <div className="fl-card-title">{wizardCount} of {REQUIRED_CATEGORIES.length} reflections complete</div>
        <div className="fl-card-desc">
          When you're done, your First Light will be ready to generate.
        </div>
        <button type="button" className="fl-card-btn" onClick={() => navigate('/first-light/wizard')}>
          Continue My First Light →
        </button>
      </div>
    );
  }

  // ─── State D: Wizard complete, ready to generate ──────────────────
  return (
    <div className="fl-card fl-card-ready">
      <div className="fl-card-eyebrow">Your First Light is ready to generate</div>
      <div className="fl-card-title">Your six reflections are complete.</div>
      <div className="fl-card-desc">
        Adding debriefs or self-assessments before generating gives your coaches more
        to work with — but you can also generate now and regenerate once after adding more.
      </div>
      <button
        type="button"
        className="fl-card-btn"
        onClick={handleGenerate}
      >
        Generate My First Light →
      </button>

      {genError && (
        <div className="fl-card-error" role="alert">
          <strong>Generation failed.</strong>
          <div>{genError.message}</div>
          <div style={{ marginTop: 6, fontSize: '0.85em' }}>
            <code>{genError.code}</code>
            {genError.extra && <> · {genError.extra}</>}
          </div>
          {genError.hint && (
            <div style={{ marginTop: 8, fontSize: '0.85em', fontStyle: 'italic' }}>
              {genError.hint}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
