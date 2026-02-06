import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Home page - Redirects to dashboard if authenticated, signin if not
 */
export default function Home() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser && currentUser.emailVerified) {
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/signin', { replace: true });
    }
  }, [currentUser, navigate]);

  // Show nothing while redirecting
  return null;
}
