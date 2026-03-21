import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import {
  loadAllSettings,
  saveSettings as saveSettingsToFirestore,
  SETTINGS_DEFAULTS,
} from '../../services/settingsService';
import AppPreferencesSection from './AppPreferencesSection';
import CoachSharingSection from './CoachSharingSection';
import NotificationsSection from './NotificationsSection';
import PrivacySection from './PrivacySection';
import AccountSection from './AccountSection';
import './Settings.css';

export default function Settings() {
  const { currentUser } = useAuth();
  const { refreshPreferences } = useSettings();
  const location = useLocation();

  // ── Data state ──
  const [preferences, setPreferences] = useState({ ...SETTINGS_DEFAULTS.preferences });
  const [notifications, setNotifications] = useState({ ...SETTINGS_DEFAULTS.notifications });
  const [privacy, setPrivacy] = useState({ ...SETTINGS_DEFAULTS.privacy });
  const [coaches, setCoaches] = useState([]);

  // ── UI state ──
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [toast, setToast] = useState({ message: '', visible: false });
  const [openSections, setOpenSections] = useState({
    preferences: true,
    coaching: true,
    notifications: false,
    privacy: false,
    account: false,
  });

  // Keep a clean copy for discard
  const cleanRef = useRef({ preferences: null, notifications: null, privacy: null });

  // ── Load settings on mount ──
  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;

    (async () => {
      const result = await loadAllSettings(currentUser.uid);
      if (cancelled) return;
      if (result.success) {
        const { preferences: p, notifications: n, privacy: pr, coaches: c } = result.data;
        setPreferences(p);
        setNotifications(n);
        setPrivacy(pr);
        setCoaches(c);
        cleanRef.current = { preferences: { ...p }, notifications: { ...n }, privacy: { ...pr } };
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [currentUser]);

  // ── Hash-based scroll on load ──
  useEffect(() => {
    if (loading) return;
    const hash = location.hash.replace('#', '');
    if (hash && ['preferences', 'coaching', 'notifications', 'privacy', 'account'].includes(hash)) {
      setOpenSections(prev => ({ ...prev, [hash]: true }));
      setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [loading, location.hash]);

  // ── beforeunload warning ──
  useEffect(() => {
    const handler = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // ── Toast helper ──
  const showToast = useCallback((message) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2600);
  }, []);

  // ── Section toggle ──
  const toggleSection = (key) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // ── Settings change handlers (mark dirty) ──
  const handlePreferenceChange = (field, value) => {
    setPreferences(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleNotificationChange = (field, value) => {
    setNotifications(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handlePrivacyChange = (field, value) => {
    setPrivacy(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  // ── Save (batch write) ──
  const handleSave = async () => {
    setSaving(true);
    const result = await saveSettingsToFirestore(currentUser.uid, {
      preferences,
      notifications,
      privacy,
    });
    setSaving(false);

    if (result.success) {
      setIsDirty(false);
      cleanRef.current = { preferences: { ...preferences }, notifications: { ...notifications }, privacy: { ...privacy } };
      showToast('Settings saved');
      refreshPreferences();
    } else {
      showToast('Error saving settings');
    }
  };

  // ── Discard ──
  const handleDiscard = () => {
    if (cleanRef.current.preferences) {
      setPreferences({ ...cleanRef.current.preferences });
      setNotifications({ ...cleanRef.current.notifications });
      setPrivacy({ ...cleanRef.current.privacy });
    }
    setIsDirty(false);
  };

  if (loading) {
    return (
      <div className="settings-page">
        <div className="settings-loading">
          <div className="settings-loading-spinner" />
          Loading settings...
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      {/* Page Header */}
      <div className="settings-page-header">
        <Link to="/dashboard" className="settings-back-link">← Dashboard</Link>
        <div className="settings-title-block">
          <div className="settings-eyebrow">Your Dressage Journey</div>
          <h1 className="settings-page-title">Settings</h1>
        </div>
      </div>

      {/* Section 1 — App Preferences */}
      <div className="settings-section" id="preferences">
        <button
          className={`settings-section-header${openSections.preferences ? ' open' : ''}`}
          onClick={() => toggleSection('preferences')}
        >
          <div className="settings-section-icon">⚙️</div>
          <div className="settings-section-title-block">
            <div className="settings-section-title">App Preferences</div>
            <div className="settings-section-subtitle">Landing page, output display, coaching defaults</div>
          </div>
          <span className="settings-chevron">▾</span>
        </button>
        <div className={`settings-section-body${openSections.preferences ? ' open' : ''}`}>
          <AppPreferencesSection
            preferences={preferences}
            onChange={handlePreferenceChange}
          />
        </div>
      </div>

      {/* Section 2 — Coach Sharing */}
      <div className="settings-section" id="coaching">
        <button
          className={`settings-section-header${openSections.coaching ? ' open' : ''}`}
          onClick={() => toggleSection('coaching')}
        >
          <div className="settings-section-icon">👩‍🏫</div>
          <div className="settings-section-title-block">
            <div className="settings-section-title">Coach Sharing</div>
            <div className="settings-section-subtitle">Share your Weekly Coach Brief with your trainers</div>
          </div>
          <span className="settings-chevron">▾</span>
        </button>
        <div className={`settings-section-body${openSections.coaching ? ' open' : ''}`}>
          <CoachSharingSection
            coaches={coaches}
            setCoaches={setCoaches}
            userId={currentUser.uid}
            showToast={showToast}
          />
        </div>
      </div>

      {/* Section 3 — Notifications */}
      <div className="settings-section" id="notifications">
        <button
          className={`settings-section-header${openSections.notifications ? ' open' : ''}`}
          onClick={() => toggleSection('notifications')}
        >
          <div className="settings-section-icon">🔔</div>
          <div className="settings-section-title-block">
            <div className="settings-section-title">Notifications</div>
            <div className="settings-section-subtitle">Email and in-app alerts</div>
          </div>
          <span className="settings-chevron">▾</span>
        </button>
        <div className={`settings-section-body${openSections.notifications ? ' open' : ''}`}>
          <NotificationsSection
            notifications={notifications}
            onChange={handleNotificationChange}
          />
        </div>
      </div>

      {/* Section 4 — Privacy & Data */}
      <div className="settings-section" id="privacy">
        <button
          className={`settings-section-header${openSections.privacy ? ' open' : ''}`}
          onClick={() => toggleSection('privacy')}
        >
          <div className="settings-section-icon">🔒</div>
          <div className="settings-section-title-block">
            <div className="settings-section-title">Privacy & Data</div>
            <div className="settings-section-subtitle">Usage preferences, data export, and account deletion</div>
          </div>
          <span className="settings-chevron">▾</span>
        </button>
        <div className={`settings-section-body${openSections.privacy ? ' open' : ''}`}>
          <PrivacySection
            privacy={privacy}
            onChange={handlePrivacyChange}
            showToast={showToast}
          />
        </div>
      </div>

      {/* Section 5 — Account */}
      <div className="settings-section" id="account">
        <button
          className={`settings-section-header${openSections.account ? ' open' : ''}`}
          onClick={() => toggleSection('account')}
        >
          <div className="settings-section-icon">👤</div>
          <div className="settings-section-title-block">
            <div className="settings-section-title">Account</div>
            <div className="settings-section-subtitle">Email, password, and subscription</div>
          </div>
          <span className="settings-chevron">▾</span>
        </button>
        <div className={`settings-section-body${openSections.account ? ' open' : ''}`}>
          <AccountSection
            currentUser={currentUser}
            showToast={showToast}
          />
        </div>
      </div>

      {/* Save Bar */}
      <div className={`settings-save-bar${isDirty ? ' visible' : ''}`}>
        <span className="settings-save-bar-message">You have unsaved changes</span>
        <button
          className="settings-btn settings-btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        <button className="settings-btn-discard" onClick={handleDiscard}>
          Discard
        </button>
      </div>

      {/* Toast */}
      <div className={`settings-toast${toast.visible ? ' show' : ''}`}>
        {toast.message}
      </div>
    </div>
  );
}
