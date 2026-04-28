import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase-config';
import { useAuth } from '../../contexts/AuthContext';
import './JourneyArchive.css';

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
 * "Your Journey So Far" — Dashboard archive section per §7.1 of the
 * implementation brief. Renders only when First Light has graduated
 * (i.e. firstLight/current.graduatedAt is set). Pre-graduation, First
 * Light lives on the Quick Start page; graduating relocates it here.
 */
export default function JourneyArchive() {
  const { currentUser } = useAuth();
  const [doc1, setDoc1] = useState(null);

  useEffect(() => {
    if (!currentUser) return;
    const ref = doc(db, 'riders', currentUser.uid, 'firstLight', 'current');
    const unsub = onSnapshot(ref, (snap) => {
      setDoc1(snap.exists() ? snap.data() : null);
    }, (err) => console.warn('[JourneyArchive] firstLight/current:', err.message));
    return () => unsub();
  }, [currentUser]);

  if (!doc1 || !doc1.graduatedAt) return null;

  const dateStr = formatDate(doc1.generatedAt);

  return (
    <section className="journey-archive">
      <h3 className="journey-archive-title">Your Journey So Far</h3>
      <Link to="/first-light" className="journey-archive-card">
        <div className="journey-archive-icon">✦</div>
        <div className="journey-archive-body">
          <div className="journey-archive-label">First Light</div>
          <div className="journey-archive-desc">
            Your starting point{dateStr ? ` — ${dateStr}` : ''}
          </div>
        </div>
        <div className="journey-archive-arrow">→</div>
      </Link>
    </section>
  );
}
