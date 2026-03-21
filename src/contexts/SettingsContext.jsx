import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { loadPreferences, SETTINGS_DEFAULTS } from '../services/settingsService';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const { currentUser } = useAuth();
  const [preferences, setPreferences] = useState(SETTINGS_DEFAULTS.preferences);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      setPreferences(SETTINGS_DEFAULTS.preferences);
      setLoaded(false);
      return;
    }

    let cancelled = false;
    (async () => {
      const result = await loadPreferences(currentUser.uid);
      if (!cancelled && result.success) {
        setPreferences(result.data);
      }
      if (!cancelled) setLoaded(true);
    })();

    return () => { cancelled = true; };
  }, [currentUser]);

  const refreshPreferences = useCallback(async () => {
    if (!currentUser) return;
    const result = await loadPreferences(currentUser.uid);
    if (result.success) {
      setPreferences(result.data);
    }
  }, [currentUser]);

  return (
    <SettingsContext.Provider value={{ preferences, loaded, refreshPreferences }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    // Graceful fallback if used outside provider
    return { preferences: SETTINGS_DEFAULTS.preferences, loaded: false, refreshPreferences: () => {} };
  }
  return ctx;
}
