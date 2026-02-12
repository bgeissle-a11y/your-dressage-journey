import { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './AppLayout.css';

export default function AppLayout() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [openDropdown, setOpenDropdown] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileMenuOpen(false);
    setOpenDropdown(null);
  }, [location.pathname]);

  async function handleLogout() {
    const result = await logout();
    if (result.success) {
      navigate('/signin');
    }
  }

  function toggleDropdown(name) {
    setOpenDropdown(prev => prev === name ? null : name);
  }

  function isActive(path) {
    return location.pathname.startsWith(path);
  }

  return (
    <div className="app-layout">
      <nav className="top-nav" ref={navRef}>
        <div className="nav-container">
          <Link to="/dashboard" className="nav-brand">
            <h1>Your Dressage Journey</h1>
          </Link>

          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span className={`hamburger ${mobileMenuOpen ? 'open' : ''}`} />
          </button>

          <div className={`nav-links ${mobileMenuOpen ? 'open' : ''}`}>
            <Link
              to="/dashboard"
              className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
            >
              Dashboard
            </Link>

            {/* Record Dropdown */}
            <div className="nav-dropdown">
              <button
                className={`nav-link dropdown-trigger ${
                  isActive('/debriefs') || isActive('/reflections') || isActive('/observations') ? 'active' : ''
                }`}
                onClick={() => toggleDropdown('record')}
              >
                Record <span className="dropdown-arrow">&#9662;</span>
              </button>
              {openDropdown === 'record' && (
                <div className="dropdown-menu">
                  <Link to="/debriefs/new" className="dropdown-item">New Debrief</Link>
                  <Link to="/reflections/new" className="dropdown-item">New Reflection</Link>
                  <Link to="/observations/new" className="dropdown-item">New Observation</Link>
                  <div className="dropdown-divider" />
                  <Link to="/debriefs" className="dropdown-item">All Debriefs</Link>
                  <Link to="/reflections" className="dropdown-item">All Reflections</Link>
                  <Link to="/observations" className="dropdown-item">All Observations</Link>
                </div>
              )}
            </div>

            {/* Plan Dropdown */}
            <div className="nav-dropdown">
              <button
                className={`nav-link dropdown-trigger ${
                  isActive('/event-prep') || isActive('/events') ? 'active' : ''
                }`}
                onClick={() => toggleDropdown('plan')}
              >
                Plan <span className="dropdown-arrow">&#9662;</span>
              </button>
              {openDropdown === 'plan' && (
                <div className="dropdown-menu">
                  <Link to="/event-prep/new" className="dropdown-item">New Event Prep</Link>
                  <Link to="/events/new" className="dropdown-item">New Journey Event</Link>
                  <div className="dropdown-divider" />
                  <Link to="/event-prep" className="dropdown-item">All Event Preps</Link>
                  <Link to="/events" className="dropdown-item">All Journey Events</Link>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="nav-dropdown">
              <button
                className={`nav-link dropdown-trigger ${
                  isActive('/profile') || isActive('/horses') ? 'active' : ''
                }`}
                onClick={() => toggleDropdown('profile')}
              >
                Profile <span className="dropdown-arrow">&#9662;</span>
              </button>
              {openDropdown === 'profile' && (
                <div className="dropdown-menu">
                  <Link to="/profile/rider" className="dropdown-item">Rider Profile</Link>
                  <Link to="/horses" className="dropdown-item">My Horses</Link>
                </div>
              )}
            </div>

            <Link
              to="/tips-and-faq"
              className={`nav-link nav-help-link ${location.pathname === '/tips-and-faq' ? 'active' : ''}`}
              title="Tips & FAQ"
            >
              <span className="nav-help-icon">?</span>
              <span className="nav-help-label">Help</span>
            </Link>

            <div className="nav-user">
              <span className="nav-username">{currentUser?.displayName || 'Rider'}</span>
              <button onClick={handleLogout} className="btn-sign-out">
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
