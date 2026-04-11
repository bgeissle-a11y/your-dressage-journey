/**
 * CoachBriefPage — Generate, preview, and email the Weekly Coach Brief
 *
 * Flow:
 *  1. User clicks "Generate This Week's Brief"
 *  2. Cloud Function assembles data (no AI call) → returns briefData
 *  3. Brief renders in-page matching the prototype design
 *  4. User clicks "Email to [Coach]" → opens their email client with brief content
 *  5. Past briefs viewable from history list
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { loadAllSettings } from '../../services/settingsService';
import {
  generateCoachBrief,
  getCoachBriefs,
  buildMailtoUrl,
} from '../../services/coachBriefService';
import CoachBriefPreview from './CoachBriefPreview';
import YDJLoading from '../YDJLoading';
import './CoachBrief.css';

export default function CoachBriefPage() {
  const { currentUser } = useAuth();

  // Data
  const [coaches, setCoaches] = useState([]);
  const [briefData, setBriefData] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState(null);

  // UI
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success'|'error', message }
  const [toast, setToast] = useState({ message: '', visible: false });

  const showToast = useCallback((message) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2600);
  }, []);

  // Load coaches + brief history on mount
  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;

    (async () => {
      const [settingsResult, briefsResult] = await Promise.all([
        loadAllSettings(currentUser.uid),
        getCoachBriefs(currentUser.uid),
      ]);

      if (cancelled) return;

      if (settingsResult.success) {
        const activeCoaches = (settingsResult.data.coaches || []).filter(c => c.sharingEnabled);
        setCoaches(activeCoaches);
      }

      if (briefsResult.success && briefsResult.data?.length > 0) {
        setHistory(briefsResult.data);
        // Show the most recent brief automatically
        const latest = briefsResult.data[0];
        if (latest.briefData) {
          setBriefData(latest.briefData);
          setSelectedHistoryId(latest.id);
        }
      }

      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [currentUser]);

  // Generate brief
  const handleGenerate = async () => {
    setGenerating(true);
    setStatus(null);

    const result = await generateCoachBrief();

    if (result.success) {
      setBriefData(result.briefData);
      setSelectedHistoryId(result.briefId);
      setStatus({ type: 'success', message: 'Brief generated successfully' });
      showToast('Brief ready');

      // Refresh history
      const briefsResult = await getCoachBriefs(currentUser.uid);
      if (briefsResult.success) {
        setHistory(briefsResult.data);
      }
    } else {
      setStatus({ type: 'error', message: result.error || 'Failed to generate brief' });
    }

    setGenerating(false);
  };

  // View a past brief
  const handleViewBrief = (brief) => {
    setBriefData(brief.briefData);
    setSelectedHistoryId(brief.id);
    setStatus(null);
  };

  const formatHistoryDate = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="cb-page">
        <div className="cb-loading">
          <div className="cb-loading-spinner" />
          Loading...
        </div>
      </div>
    );
  }

  const hasActiveCoaches = coaches.length > 0;

  return (
    <div className="cb-page">
      {/* Page Header */}
      <div className="cb-page-header">
        <Link to="/settings#coaching" className="cb-back-link">{'\u2190'} Settings</Link>
        <div className="cb-title-block">
          <div className="cb-eyebrow">Your Dressage Journey</div>
          <h1 className="cb-page-title">Weekly Coach Brief</h1>
        </div>
      </div>

      {/* No coaches state */}
      {!hasActiveCoaches && (
        <div className="cb-empty-state">
          <p>No coaches with active sharing.</p>
          <p>
            <Link to="/settings#coaching">Add a coach in Settings</Link> and enable sharing
            to generate your Weekly Coach Brief.
          </p>
        </div>
      )}

      {/* Actions */}
      {hasActiveCoaches && (
        <>
          <div className="cb-action-bar">
            <button
              className="cb-btn cb-btn-primary"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? 'Generating...' : 'Generate This Week\u2019s Brief'}
            </button>
          </div>

          {/* Status */}
          {status && (
            <div className={`cb-status ${status.type}`}>
              {status.message}
            </div>
          )}

          {/* Generating state */}
          {generating && (
            <YDJLoading message="Composing your weekly brief" />
          )}

          {/* Email targets */}
          {briefData && (
            <div className="cb-coach-targets">
              {coaches.map(coach => (
                <a
                  key={coach.id}
                  href={buildMailtoUrl(briefData, coach)}
                  className="cb-coach-target"
                >
                  <span className="cb-coach-target-icon">{'\u2709'}</span>
                  Email to {coach.name}
                </a>
              ))}
            </div>
          )}
        </>
      )}

      {/* Brief Preview */}
      {briefData && <CoachBriefPreview briefData={briefData} />}

      {/* Brief History */}
      {history.length > 1 && (
        <div className="cb-history">
          <div className="cb-history-title">Past Briefs</div>
          <ul className="cb-history-list">
            {history.map(brief => (
              <li
                key={brief.id}
                className={`cb-history-item${brief.id === selectedHistoryId ? ' active' : ''}`}
                onClick={() => handleViewBrief(brief)}
              >
                <span className="cb-history-week">
                  Week of {brief.briefData?.weekOf || brief.id}
                </span>
                <span className="cb-history-date">
                  {formatHistoryDate(brief.generatedAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Toast */}
      <div className={`cb-toast${toast.visible ? ' show' : ''}`}>
        {toast.message}
      </div>
    </div>
  );
}
