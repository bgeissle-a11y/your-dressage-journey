import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    const result = await logout();
    if (result.success) {
      navigate('/signin');
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        paddingBottom: '1rem',
        borderBottom: '2px solid #E0D5C7'
      }}>
        <div>
          <h1 style={{
            fontFamily: 'Playfair Display, serif',
            color: '#8B7355',
            marginBottom: '0.5rem'
          }}>
            Your Dressage Journey
          </h1>
          <p style={{ color: '#666' }}>
            Welcome back, <strong>{currentUser?.displayName || 'Rider'}</strong>!
          </p>
        </div>
        <button
          onClick={handleLogout}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#8B7355',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          Sign Out
        </button>
      </header>

      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{
          fontFamily: 'Playfair Display, serif',
          color: '#8B7355',
          marginBottom: '1rem'
        }}>
          Dashboard
        </h2>
        <p style={{ color: '#666', lineHeight: '1.6', marginBottom: '1.5rem' }}>
          This is your dashboard! Phase 2 (Authentication) is complete.
          Next steps will include adding forms, data management, and analytics.
        </p>

        <div style={{
          padding: '1.5rem',
          backgroundColor: '#E8F5E9',
          borderRadius: '8px',
          border: '1px solid #A5D6A7'
        }}>
          <h3 style={{ color: '#2E7D32', marginBottom: '0.5rem' }}>
            ✅ Authentication Working!
          </h3>
          <p style={{ color: '#2E7D32', margin: 0 }}>
            Your account is authenticated and email is verified.
          </p>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <h3 style={{
            fontFamily: 'Playfair Display, serif',
            color: '#8B7355',
            marginBottom: '1rem'
          }}>
            Account Information
          </h3>
          <ul style={{
            listStyle: 'none',
            padding: 0,
            color: '#666'
          }}>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Email:</strong> {currentUser?.email}
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Name:</strong> {currentUser?.displayName || 'Not set'}
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Email Verified:</strong> {currentUser?.emailVerified ? '✅ Yes' : '❌ No'}
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Account Created:</strong> {new Date(currentUser?.metadata.creationTime).toLocaleDateString()}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
