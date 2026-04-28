import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, doc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase-config';
import { useAuth } from '../../contexts/AuthContext';
import './FirstLightTerminusNode.css';

const REQUIRED_CATEGORIES = ['personal', 'validation', 'aha', 'obstacle', 'connection', 'feel'];

/**
 * First Light terminus node — per §6.3 of the implementation brief.
 *
 * Sits on the journey map visualization between the Core Practice section
 * and the Outputs Unlocked threshold. Visually distinct from data-entry
 * nodes (gold accent, larger size, ✦ mark) to signal "this is what you're
 * building toward."
 *
 * State reflects the same wizard / firstLight document the launch card
 * tracks, so the node and the card stay in sync.
 *
 * Props:
 *   eligible — boolean. Profile + ≥1 horse complete.
 */
export default function FirstLightTerminusNode({ eligible }) {
  const { currentUser } = useAuth();
  const [wizardCount, setWizardCount] = useState(0);
  const [firstLightDoc, setFirstLightDoc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'reflections'),
      where('userId', '==', currentUser.uid),
      where('isDeleted', '==', false),
      where('source', '==', 'first-light-entry'),
    );
    const unsub = onSnapshot(q, (snap) => {
      const cats = new Set();
      snap.forEach(d => {
        const c = d.data().category;
        if (REQUIRED_CATEGORIES.includes(c)) cats.add(c);
      });
      setWizardCount(cats.size);
    }, (err) => console.warn('[FirstLightTerminusNode] reflections:', err.message));
    return () => unsub();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const ref = doc(db, 'riders', currentUser.uid, 'firstLight', 'current');
    const unsub = onSnapshot(ref, (snap) => {
      setFirstLightDoc(snap.exists() ? snap.data() : null);
      setLoading(false);
    }, (err) => {
      console.warn('[FirstLightTerminusNode] firstLight:', err.message);
      setLoading(false);
    });
    return () => unsub();
  }, [currentUser]);

  if (loading) return null;

  // After graduation the node moves to "preserved milestone" — still visible
  // on the map but presented as a completed waypoint.
  const isGraduated = !!(firstLightDoc && firstLightDoc.graduatedAt);
  const hasFirstLight = !!firstLightDoc;
  const wizardComplete = wizardCount === REQUIRED_CATEGORIES.length;

  let state;     // visual state class
  let title;     // node label
  let subtitle;
  let action;    // { to, label } or null
  if (!eligible) {
    state = 'pending';
    title = 'First Light';
    subtitle = 'Unlocks once your Rider Profile and Horse Profile are complete';
    action = null;
  } else if (hasFirstLight) {
    state = isGraduated ? 'graduated' : 'generated';
    title = 'First Light';
    subtitle = isGraduated
      ? 'Preserved milestone — your starting point'
      : 'Generated — your inaugural coaching artifact';
    action = { to: '/first-light', label: isGraduated ? 'View →' : 'View My First Light →' };
  } else if (wizardComplete) {
    state = 'ready';
    title = 'First Light';
    subtitle = 'Six reflections complete — ready to generate';
    action = { to: '/quickstart#first-light-card', label: 'Generate above ↑' };
  } else if (wizardCount > 0) {
    state = 'in-progress';
    title = 'First Light';
    subtitle = `Wizard in progress — ${wizardCount} of 6 reflections saved`;
    action = { to: '/first-light/wizard', label: 'Continue →' };
  } else {
    state = 'available';
    title = 'First Light';
    subtitle = 'Your inaugural coaching artifact — six guided reflections';
    action = { to: '/first-light/wizard', label: 'Begin →' };
  }

  return (
    <div className="qsm-firstlight-station" data-state={state}>
      <div className="qsm-firstlight-col">
        <div className="qsm-firstlight-node" aria-hidden="true">✦</div>
      </div>
      <div className="qsm-firstlight-card">
        <div className="qsm-firstlight-tag">Milestone — what you're building toward</div>
        <div className="qsm-firstlight-title">{title}</div>
        <div className="qsm-firstlight-desc">{subtitle}</div>
        {action && (
          action.to.startsWith('/') && !action.to.includes('#') ? (
            <Link to={action.to} className="qsm-firstlight-link">{action.label}</Link>
          ) : (
            <a href={action.to} className="qsm-firstlight-link">{action.label}</a>
          )
        )}
      </div>
    </div>
  );
}
