import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';

/**
 * Home page — index route post-auth redirect.
 *
 * Resolution order for signed-in users:
 *   1. preferences.landingPage === 'dashboard'  → /dashboard
 *   2. preferences.landingPage === 'quickstart' → /quickstart
 *   3. preferences doc missing / field unset    → /quickstart  (default)
 *   4. preferences read fails                   → /quickstart  (default)
 *
 * Default is always /quickstart. We never fall back to /dashboard.
 */
export default function Home() {
  const { currentUser } = useAuth();
  const { preferences, loaded } = useSettings();

  if (!currentUser || !currentUser.emailVerified) {
    return <Navigate to="/signin" replace />;
  }

  // Block render until preferences resolve — avoids flashing the wrong page.
  if (!loaded) return null;

  const destination = preferences.landingPage === 'dashboard' ? '/dashboard' : '/quickstart';
  return <Navigate to={destination} replace />;
}
