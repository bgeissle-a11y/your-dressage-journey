import { useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import useCacheWarmth from '../../hooks/useCacheWarmth';
import './AppLayout.css';

export default function AppLayout() {
  const { currentUser, logout } = useAuth();
  useCacheWarmth();
  const navigate = useNavigate();
  const location = useLocation();

  // Add body class so child pages can detect layout context
  useEffect(() => {
    document.body.classList.add('app-layout-active');
    return () => document.body.classList.remove('app-layout-active');
  }, []);

  async function handleLogout() {
    const result = await logout();
    if (result.success) {
      navigate('/signin');
    }
  }

  function isActive(path) {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  }

  function navClass(path) {
    return `nav-btn${isActive(path) ? ' active' : ''}`;
  }

  return (
    <div className="app-layout">
      <nav className="top-nav">
        <div className="nav-brand">YDJ</div>

        <Link to="/dashboard" className={navClass('/dashboard')}>&#8962; Home</Link>
        <div className="nav-sep" />

        {/* Utility trio — always visible */}
        <Link to="/quickstart" className={`nav-btn nav-special${isActive('/quickstart') ? ' active' : ''}`}>&#9672; Quick Start</Link>
        <Link to="/insights" className={`nav-btn nav-special${isActive('/insights') ? ' active' : ''}`}>&#10022; Insights</Link>
        <Link to="/tips-and-faq" className={`nav-btn nav-help${isActive('/tips-and-faq') ? ' active' : ''}`}>? Help</Link>
        <div className="nav-sep" />

        {/* Record */}
        <span className="nav-group-label">Record</span>
        <Link to="/debriefs/new" className={navClass('/debriefs')}>Debrief</Link>
        <Link to="/reflections/new" className={navClass('/reflections')}>Reflection</Link>
        <Link to="/observations/new" className={navClass('/observations')}>Observation</Link>
        <Link to="/lesson-notes/new" className={navClass('/lesson-notes')}>Lesson</Link>
        <Link to="/horse-health/new" className={navClass('/horse-health')}>Health</Link>
        <Link to="/events/new" className={navClass('/events')}>Event</Link>
        <div className="nav-sep" />

        {/* Plan */}
        <span className="nav-group-label">Plan</span>
        <Link to="/show-prep/new" className={navClass('/show-prep')}>Show Prep</Link>
        <div className="nav-sep" />

        {/* AI Coaching */}
        <span className="nav-group-label">AI Coaching</span>
        <Link to="/insights?tab=journey" className="nav-btn">Journey Map</Link>
        <Link to="/insights?tab=coaching" className="nav-btn">Multi-Voice</Link>
        <Link to="/insights?tab=grandprix" className="nav-btn">Grand Prix</Link>
        <div className="nav-sep" />

        {/* Profiles */}
        <span className="nav-group-label">Profiles</span>
        <Link to="/profile/rider" className={navClass('/profile')}>Rider</Link>
        <Link to="/horses" className={navClass('/horses')}>Horses</Link>
        <div className="nav-sep" />

        {/* User / Sign Out */}
        <span className="nav-user-name">{currentUser?.displayName || 'Rider'}</span>
        <button className="nav-btn nav-signout" onClick={handleLogout}>Sign Out</button>
      </nav>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
