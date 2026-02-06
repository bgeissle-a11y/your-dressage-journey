import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/**
 * PrivateRoute component - Protects routes that require authentication
 *
 * Usage:
 * <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
 *
 * If user is not authenticated, redirects to /signin with the original location
 * so they can be redirected back after signing in.
 */
export default function PrivateRoute({ children }) {
  const { currentUser } = useAuth();
  const location = useLocation();

  if (!currentUser) {
    // Redirect to signin but save the location they were trying to access
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  // Check if email is verified
  if (!currentUser.emailVerified) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="alert alert-warning">
            <h3>Email Verification Required</h3>
            <p>
              Please verify your email address to access this page.
              Check your inbox for the verification link.
            </p>
            <p style={{ marginTop: '1rem' }}>
              <a href="/signin" className="auth-link">
                Back to Sign In
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // User is authenticated and email is verified
  return children;
}
