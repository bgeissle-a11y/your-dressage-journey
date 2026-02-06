import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Home page - Redirects to dashboard if authenticated, signin if not
 */
export default function Home() {
  const { currentUser } = useAuth();

  // Redirect based on authentication state
  if (currentUser && currentUser.emailVerified) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/signin" replace />;
}
