import { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { auth } from '../firebase-config';

// Create the Auth Context
const AuthContext = createContext({});

// Custom hook to use the Auth Context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// AuthProvider component that wraps the app
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sign up function
  async function signup(email, password, displayName) {
    try {
      setError(null);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Update user profile with display name
      if (displayName) {
        await updateProfile(userCredential.user, {
          displayName: displayName
        });
      }

      // Send email verification
      await sendEmailVerification(userCredential.user);

      return {
        success: true,
        user: userCredential.user,
        message: 'Account created! Please check your email to verify your account.'
      };
    } catch (err) {
      setError(err.message);
      return {
        success: false,
        error: getErrorMessage(err.code)
      };
    }
  }

  // Sign in function
  async function signin(email, password) {
    try {
      setError(null);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return {
        success: true,
        user: userCredential.user
      };
    } catch (err) {
      setError(err.message);
      return {
        success: false,
        error: getErrorMessage(err.code)
      };
    }
  }

  // Sign out function
  async function logout() {
    try {
      setError(null);
      await signOut(auth);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return {
        success: false,
        error: 'Failed to sign out. Please try again.'
      };
    }
  }

  // Password reset function
  async function resetPassword(email) {
    try {
      setError(null);
      await sendPasswordResetEmail(auth, email);
      return {
        success: true,
        message: 'Password reset email sent! Check your inbox.'
      };
    } catch (err) {
      setError(err.message);
      return {
        success: false,
        error: getErrorMessage(err.code)
      };
    }
  }

  // Resend email verification
  async function resendVerificationEmail() {
    try {
      if (currentUser && !currentUser.emailVerified) {
        await sendEmailVerification(currentUser);
        return {
          success: true,
          message: 'Verification email sent! Check your inbox.'
        };
      }
      return {
        success: false,
        error: 'No user found or email already verified.'
      };
    } catch (err) {
      return {
        success: false,
        error: 'Failed to send verification email.'
      };
    }
  }

  // Helper function to convert Firebase error codes to user-friendly messages
  function getErrorMessage(errorCode) {
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return 'This email is already registered. Please sign in instead.';
      case 'auth/invalid-email':
        return 'Invalid email address format.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters long.';
      case 'auth/user-not-found':
        return 'No account found with this email address.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection.';
      case 'auth/user-disabled':
        return 'This account has been disabled.';
      default:
        return 'An error occurred. Please try again.';
    }
  }

  // Set up auth state observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    signup,
    signin,
    logout,
    resetPassword,
    resendVerificationEmail,
    loading,
    error
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          background: 'linear-gradient(to bottom, #FAF8F5 0%, #F5F1EB 100%)'
        }}>
          <div style={{
            textAlign: 'center',
            color: '#8B7355'
          }}>
            <div style={{
              width: '50px',
              height: '50px',
              border: '4px solid #E0D5C7',
              borderTop: '4px solid #8B7355',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem'
            }} />
            <p style={{ fontSize: '1.1rem', fontWeight: '500' }}>Loading Your Dressage Journey...</p>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        </div>
      ) : children}
    </AuthContext.Provider>
  );
}
