import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Auth.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const { resetPassword } = useAuth();

  // Validate email
  function validateEmail() {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setError('Email is required');
      return false;
    } else if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }
    setError('');
    return true;
  }

  // Handle form submission
  async function handleSubmit(e) {
    e.preventDefault();

    if (!validateEmail()) return;

    setLoading(true);
    setError('');
    setMessage('');

    const result = await resetPassword(email);

    setLoading(false);

    if (result.success) {
      setMessage(result.message);
      setEmail(''); // Clear the form
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Reset Your Password</h1>
          <p>Enter your email address and we'll send you a link to reset your password</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {/* Success Message */}
          {message && (
            <div className="alert alert-success">
              {message}
              <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                Didn't receive the email? Check your spam folder or try again.
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          {/* Email */}
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              placeholder="you@example.com"
              disabled={loading}
              className={error ? 'error' : ''}
              autoComplete="email"
            />
            {error && (
              <span className="error-message">{error}</span>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        {/* Back to Sign In */}
        <div className="auth-footer">
          <p>
            Remember your password?{' '}
            <Link to="/signin" className="auth-link">
              Back to Sign In
            </Link>
          </p>
        </div>

        {/* Help Text */}
        <div className="help-text">
          <p>
            <strong>What happens next?</strong>
          </p>
          <ul>
            <li>We'll send a password reset link to your email</li>
            <li>Click the link in the email (it's valid for 1 hour)</li>
            <li>Create a new password</li>
            <li>Sign in with your new password</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
