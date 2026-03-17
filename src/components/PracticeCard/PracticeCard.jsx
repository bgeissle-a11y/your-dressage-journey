import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { readPracticeCardCache, confirmPracticeCard } from "../../services/weeklyFocusService";
import "./PracticeCard.css";

/**
 * PracticeCard — barn-ready, mobile-first card distilled from coaching output.
 *
 * Three states:
 *   A — UNCONFIRMED (confirmedAt === null): full card + "Ready to ride" button
 *   B — BREATH OVERLAY (transitional ~3.2s): dark overlay with "Breathe"
 *   C — LOCKED (confirmedAt set): card visible, locked banner + debrief CTA
 */
export default function PracticeCard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState("unconfirmed"); // unconfirmed | breathing | locked
  const [confirmedAt, setConfirmedAt] = useState(null);
  const [confirmedDate, setConfirmedDate] = useState(null);
  const [breathKey, setBreathKey] = useState(0);
  const breathTimerRef = useRef(null);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      const data = await readPracticeCardCache(currentUser.uid);
      if (cancelled) return;

      if (data) {
        setCard(data);
        if (data.confirmedAt) {
          setPhase("locked");
          setConfirmedAt(data.confirmedAt);
          setConfirmedDate(data.confirmedDate);
        }
      }
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [currentUser]);

  // Cleanup breath timer
  useEffect(() => {
    return () => {
      if (breathTimerRef.current) clearTimeout(breathTimerRef.current);
    };
  }, []);

  const handleReadyToRide = useCallback(async () => {
    setPhase("breathing");
    setBreathKey(prev => prev + 1);

    // After 3200ms: lock the card
    breathTimerRef.current = setTimeout(async () => {
      const now = new Date();
      const dateStr = now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
      setConfirmedAt(now.toISOString());
      setConfirmedDate(dateStr);
      setPhase("locked");

      // Write to Firestore (optimistic — don't block UX)
      if (currentUser) {
        confirmPracticeCard(currentUser.uid).catch(err => {
          console.error("Failed to write confirmedAt:", err);
        });
      }
    }, 3200);
  }, [currentUser]);

  const handleDebriefCta = useCallback(() => {
    const today = new Date().toISOString().split("T")[0];
    navigate(`/debriefs/new?date=${today}`);
  }, [navigate]);

  if (loading) {
    return <div className="pc-loading">Loading your practice card...</div>;
  }

  if (!card) {
    return null; // No card for this week — don't render
  }

  const lockedTime = confirmedAt
    ? new Date(confirmedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="pc-container">
      <div className="pc-card">
        {/* Header */}
        <div className="pc-header">
          <div className="pc-wordmark">Your Dressage Journey</div>
          <div className="pc-title">Practice Card</div>
          <div className="pc-meta">{card.horseName || "Your Horse"} &middot; {card.weekOf || "This Week"}</div>
        </div>

        {/* Body */}
        <div className="pc-body">
          {/* 1. Process Goals */}
          <div className="pc-section pc-section-goals">
            <div className="pc-section-label pc-label-gold">This ride, focus on</div>
            {(card.processGoals || []).map((goal, i) => (
              <div className="pc-goal-row" key={i}>
                <span className="pc-goal-num">{i + 1}</span>
                <span className="pc-goal-text">{goal}</span>
              </div>
            ))}
          </div>

          {/* 2. In-Saddle Cues */}
          <div className="pc-section pc-section-cues">
            <div className="pc-section-label pc-label-rust">In the saddle — feel for</div>
            {(card.inSaddleCues || []).map((cue, i) => (
              <div className="pc-cue-row" key={i}>
                <span className="pc-cue-dot">&#9670;</span>
                <span className="pc-cue-text">{cue}</span>
              </div>
            ))}
          </div>

          {/* 3. Analogy */}
          <div className="pc-section pc-section-analogy">
            <div className="pc-section-label pc-label-forest">This week's image</div>
            <div className="pc-italic-text">{card.analogy}</div>
          </div>

          {/* 4. Mental Rehearsal */}
          <div className="pc-section pc-section-rehearsal">
            <div className="pc-section-label pc-label-sky">Between rides</div>
            <div className="pc-rehearsal-text">{card.mentalRehearsal}</div>
          </div>

          {/* 5. Carry Question */}
          <div className="pc-section pc-section-question">
            <div className="pc-section-label pc-label-parchment">Carry this question</div>
            <div className="pc-italic-text pc-question-text">{card.carryQuestion}</div>
          </div>

          {/* Locked Banner (State C) */}
          {phase === "locked" && (
            <div className="pc-locked-banner">
              <div className="pc-locked-dot"></div>
              <div className="pc-locked-text">
                <div className="pc-locked-line1">&#10003; Have a great ride!</div>
                <div className="pc-locked-line2">Locked {lockedTime} &middot; {confirmedDate}</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pc-footer">
          <div className="pc-footer-text">Illuminate Your Journey</div>
        </div>

        {/* Ready to Ride Button (State A) */}
        {phase === "unconfirmed" && (
          <button className="pc-ready-btn" onClick={handleReadyToRide}>
            Ready to ride &#8599;
          </button>
        )}

        {/* Breath Overlay (State B) */}
        {phase === "breathing" && (
          <div className="pc-breath-overlay">
            <div className="pc-breath-word" key={breathKey}>Breathe</div>
            <div className="pc-breath-subtitle">one breath before you mount</div>
          </div>
        )}
      </div>

      {/* Post-Ride CTA (State C, below card) */}
      {phase === "locked" && (
        <button className="pc-debrief-cta" onClick={handleDebriefCta}>
          <div className="pc-cta-label">After your ride</div>
          <div className="pc-cta-action">Log your debrief</div>
          <div className="pc-cta-arrow">&#8599;</div>
        </button>
      )}
    </div>
  );
}

/**
 * PracticeCardCompact — Dashboard entry point (compact preview).
 * Shows teaser when unconfirmed, locked state when confirmed.
 */
export function PracticeCardCompact() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;

    async function load() {
      const data = await readPracticeCardCache(currentUser.uid);
      if (!cancelled) {
        setCard(data);
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [currentUser]);

  if (loading || !card) return null;

  const isConfirmed = Boolean(card.confirmedAt);

  if (isConfirmed) {
    const today = new Date().toISOString().split("T")[0];
    return (
      <div className="pc-compact pc-compact-confirmed">
        <div className="pc-compact-header">
          <div className="pc-compact-icon">&#10003;</div>
          <div className="pc-compact-text">
            <div className="pc-compact-title" style={{ color: "#2D6A4F" }}>Have a great ride!</div>
            <div className="pc-compact-meta">Locked {card.confirmedDate}</div>
          </div>
        </div>
        <button className="pc-compact-link" onClick={() => navigate(`/debriefs/new?date=${today}`)}>
          Log your debrief &rarr;
        </button>
      </div>
    );
  }

  return (
    <div className="pc-compact" onClick={() => navigate("/practice-card")}>
      <div className="pc-compact-header">
        <div className="pc-compact-icon-card">&#9830;</div>
        <div className="pc-compact-text">
          <div className="pc-compact-title">Practice Card</div>
          <div className="pc-compact-meta">{card.horseName} &middot; {card.weekOf}</div>
        </div>
      </div>
      {card.processGoals?.[0] && (
        <div className="pc-compact-teaser">1. {card.processGoals[0]}</div>
      )}
      <div className="pc-compact-link-inline">Ready to ride &rarr;</div>
    </div>
  );
}
