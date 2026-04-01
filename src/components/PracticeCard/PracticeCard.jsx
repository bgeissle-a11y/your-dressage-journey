import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { readPracticeCardCache, confirmPracticeCard } from "../../services/weeklyFocusService";
import "./PracticeCard.css";

/**
 * PracticeCard v2 — barn-ready, mobile-first card distilled from coaching output.
 *
 * Three states:
 *   A — UNCONFIRMED (confirmedAt === null): full card + editable goals + "Ready to ride"
 *   B — BREATH OVERLAY (transitional ~3.2s): dark overlay with "Breathe"
 *   C — LOCKED (confirmedAt set): card read-only, locked banner + debrief CTA
 *
 * v2 changes: goals are editable before locking, Between Rides + Carry Question removed,
 * horse name removed from header.
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

  // Editable goals state
  const [goals, setGoals] = useState([]);
  const [suggestedGoals, setSuggestedGoals] = useState([]);
  const [goalsEdited, setGoalsEdited] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editHintVisible, setEditHintVisible] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      const data = await readPracticeCardCache(currentUser.uid);
      if (cancelled) return;

      if (data) {
        setCard(data);
        const suggested = data.processGoals || data.suggestedGoals || [];
        setSuggestedGoals(suggested);

        if (data.confirmedAt) {
          // Already locked — show confirmed goals
          setPhase("locked");
          setConfirmedAt(data.confirmedAt);
          setConfirmedDate(data.confirmedDate);
          setGoals(data.confirmedGoals || suggested);
          setGoalsEdited(data.goalsEdited || suggested.map(() => false));
        } else {
          // Unconfirmed — start with suggested goals as editable
          setGoals([...suggested]);
          setGoalsEdited(suggested.map(() => false));
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

  const handleGoalTap = useCallback((idx) => {
    if (phase !== "unconfirmed") return;
    setEditingIndex(idx);
    setEditHintVisible(false);
  }, [phase]);

  const handleGoalSave = useCallback((idx, newText) => {
    const trimmed = newText.trim();
    if (!trimmed) return; // Don't save empty

    setGoals(prev => {
      const updated = [...prev];
      updated[idx] = trimmed;
      return updated;
    });
    setGoalsEdited(prev => {
      const updated = [...prev];
      updated[idx] = trimmed !== suggestedGoals[idx];
      return updated;
    });
    setEditingIndex(null);
  }, [suggestedGoals]);

  const handleGoalCancel = useCallback(() => {
    setEditingIndex(null);
  }, []);

  const handleReadyToRide = useCallback(async () => {
    setPhase("breathing");
    setBreathKey(prev => prev + 1);

    breathTimerRef.current = setTimeout(async () => {
      const now = new Date();
      const dateStr = now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
      setConfirmedAt(now.toISOString());
      setConfirmedDate(dateStr);
      setPhase("locked");

      // Write to Firestore (optimistic — don't block UX)
      if (currentUser) {
        confirmPracticeCard(currentUser.uid, goals, goalsEdited).catch(err => {
          console.error("Failed to write confirmedAt:", err);
        });
      }
    }, 3200);
  }, [currentUser, goals, goalsEdited]);

  const handleDebriefCta = useCallback(() => {
    const today = new Date().toISOString().split("T")[0];
    navigate(`/debriefs/new?date=${today}`, {
      state: { practiceCardGoals: goals }
    });
  }, [navigate, goals]);

  if (loading) {
    return <div className="pc-loading">Loading your practice card...</div>;
  }

  if (!card) {
    return null;
  }

  const lockedTime = confirmedAt
    ? new Date(confirmedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  const editCount = goalsEdited.filter(Boolean).length;

  return (
    <div className="pc-container">
      <div className="pc-card">
        {/* Header — no horse name per v2 spec */}
        <div className="pc-header">
          <div className="pc-wordmark">Your Dressage Journey</div>
          <div className="pc-title">Practice Card</div>
          <div className="pc-meta">Week of {card.weekOf || "This Week"}</div>
        </div>

        {/* Body */}
        <div className="pc-body">
          {/* 1. Process Goals — editable in State A */}
          <div className="pc-section pc-section-goals">
            <div className="pc-section-label pc-label-gold">This ride, focus on</div>

            {phase === "unconfirmed" && editHintVisible && (
              <div className="pc-goals-edit-hint">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Tap any goal to refine it for today
              </div>
            )}

            {goals.map((goal, i) => (
              <GoalRow
                key={i}
                index={i}
                text={goal}
                isEditing={editingIndex === i}
                isModified={goalsEdited[i]}
                isLocked={phase !== "unconfirmed"}
                onTap={handleGoalTap}
                onSave={handleGoalSave}
                onCancel={handleGoalCancel}
              />
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

        {/* Modification count badge (State A, when goals edited) */}
        {phase === "unconfirmed" && editCount > 0 && (
          <div className="pc-mod-summary">
            {editCount} goal{editCount > 1 ? "s" : ""} edited from AI suggestion
          </div>
        )}

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
 * GoalRow — renders a single process goal, editable in State A.
 */
function GoalRow({ index, text, isEditing, isModified, isLocked, onTap, onSave, onCancel }) {
  const textareaRef = useRef(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const ta = textareaRef.current;
      ta.focus();
      ta.select();
      ta.style.height = "auto";
      ta.style.height = ta.scrollHeight + "px";
    }
  }, [isEditing]);

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSave(index, e.target.value);
    }
    if (e.key === "Escape") {
      onCancel();
    }
  }

  function handleBlur(e) {
    onSave(index, e.target.value);
  }

  function handleInput(e) {
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
  }

  if (isLocked) {
    return (
      <div className={`pc-goal-row${isModified ? " pc-goal-modified" : ""}`}>
        <span className="pc-goal-num">{index + 1}</span>
        <div className="pc-goal-content">
          <div className="pc-goal-text-locked">{text}</div>
          {isModified && <div className="pc-goal-edited-label">&#9998; Your edit</div>}
        </div>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="pc-goal-row">
        <span className="pc-goal-num">{index + 1}</span>
        <div className="pc-goal-content">
          <textarea
            ref={textareaRef}
            className="pc-goal-input"
            defaultValue={text}
            rows={2}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`pc-goal-row${isModified ? " pc-goal-modified" : ""}`}>
      <span className="pc-goal-num">{index + 1}</span>
      <div className="pc-goal-content">
        <div
          className={`pc-goal-text-display${isModified ? " modified" : ""}`}
          onClick={() => onTap(index)}
          title="Tap to edit"
        >
          {text}
        </div>
        {isModified && <div className="pc-goal-edited-label">&#9998; Edited from suggestion</div>}
      </div>
      <button
        className="pc-goal-edit-btn"
        onClick={() => onTap(index)}
        title="Edit goal"
        aria-label={`Edit goal ${index + 1}`}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
    </div>
  );
}

/**
 * PracticeCardCompact — Dashboard entry point (compact preview).
 * v2: no horse name in header, shows week date only.
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
  const goals = card.confirmedGoals || card.processGoals || card.suggestedGoals || [];

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
        <button className="pc-compact-link" onClick={() => navigate(`/debriefs/new?date=${today}`, { state: { practiceCardGoals: goals } })}>
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
          <div className="pc-compact-meta">Week of {card.weekOf}</div>
        </div>
      </div>
      {goals[0] && (
        <div className="pc-compact-teaser">
          1. {goals[0].length > 60 ? goals[0].slice(0, 57) + "..." : goals[0]}
        </div>
      )}
      <div className="pc-compact-link-inline">Ready to ride &rarr;</div>
    </div>
  );
}
