import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Auth.css';

export default function SignIn() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showVerificationResend, setShowVerificationResend] = useState(false);

  const { signin, resendVerificationEmail } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get message from navigation state (e.g., from signup redirect)
  const successMessage = location.state?.message;

  // Get the path user was trying to access before being redirected to signin
  const from = location.state?.from?.pathname || '/dashboard';

  // Validate form
  function validateForm() {
    const newErrors = {};

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // Handle input changes
  function handleChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  }

  // Handle form submission
  async function handleSubmit(e) {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setErrors({});
    setShowVerificationResend(false);

    const result = await signin(formData.email, formData.password);

    setLoading(false);

    if (result.success) {
      // Check if email is verified
      if (!result.user.emailVerified) {
        setShowVerificationResend(true);
        setErrors({
          submit: 'Please verify your email address before signing in. Check your inbox for the verification link.'
        });
        return;
      }

      // Successful sign in - redirect to intended page or dashboard
      navigate(from, { replace: true });
    } else {
      setErrors({ submit: result.error });
    }
  }

  // Resend verification email
  async function handleResendVerification() {
    setLoading(true);
    const result = await resendVerificationEmail();
    setLoading(false);

    if (result.success) {
      setErrors({
        submit: result.message
      });
    } else {
      setErrors({
        submit: result.error
      });
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Welcome Back</h1>
          <p>Sign in to continue your dressage journey</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {/* Success Message (from previous page) */}
          {successMessage && (
            <div className="alert alert-success">
              {successMessage}
            </div>
          )}

          {/* Error Message */}
          {errors.submit && (
            <div className={`alert ${showVerificationResend ? 'alert-warning' : 'alert-error'}`}>
              {errors.submit}
            </div>
          )}

          {/* Resend Verification Button */}
          {showVerificationResend && (
            <button
              type="button"
              onClick={handleResendVerification}
              className="btn btn-secondary"
              disabled={loading}
              style={{ marginBottom: '1rem' }}
            >
              Resend Verification Email
            </button>
          )}

          {/* Email */}
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              disabled={loading}
              className={errors.email ? 'error' : ''}
              autoComplete="email"
            />
            {errors.email && (
              <span className="error-message">{errors.email}</span>
            )}
          </div>

          {/* Password */}
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              disabled={loading}
              className={errors.password ? 'error' : ''}
              autoComplete="current-password"
            />
            {errors.password && (
              <span className="error-message">{errors.password}</span>
            )}
          </div>

          {/* Forgot Password Link */}
          <div className="form-group" style={{ textAlign: 'right' }}>
            <Link to="/forgot-password" className="auth-link">
              Forgot your password?
            </Link>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        {/* Sign Up Link */}
        <div className="auth-footer">
          <p>
            Don't have an account?{' '}
            <Link to="/signup" className="auth-link">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
