import { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import useCacheWarmth from '../../hooks/useCacheWarmth';
import './AppLayout.css';

/* ── Nav dropdown group definitions ── */
const NAV_GROUPS = [
  {
    id: 'record',
    label: 'Record',
    sections: [
      {
        heading: 'Before Your Ride',
        links: [
          { icon: '\uD83C\uDCCF', label: 'Practice Card', to: '/practice-card' },
        ],
      },
      {
        heading: 'After Your Ride',
        links: [
          { icon: '\uD83C\uDFC7', label: 'Post-Ride Debrief', to: '/debriefs/new' },
          { icon: '\u26A1', label: 'Quick Capture', to: '/forms/micro-debrief', desc: "When you don't have time for the full debrief" },
          { icon: '\uD83D\uDCAD', label: 'Reflection', to: '/reflections/new' },
          { icon: '\uD83D\uDC41', label: 'Observation', to: '/observations/new' },
          { icon: '\uD83D\uDCDD', label: 'Lesson Notes', to: '/lesson-notes/new' },
        ],
      },
      {
        heading: 'Track',
        links: [
          { icon: '\uD83C\uDF3F', label: 'Health & Soundness', to: '/horse-health/new' },
          { icon: '\uD83E\uDE7A', label: 'Rider Health', to: '/rider-health/new' },
          { icon: '\uD83D\uDCC5', label: 'Journey Event', to: '/events/new' },
        ],
      },
    ],
  },
  {
    id: 'plan',
    label: 'Plan',
    sections: [
      {
        heading: 'Every Ride',
        links: [
          { icon: '\uD83C\uDF05', label: 'Pre-Ride Ritual', to: '/pre-ride-ritual', desc: 'Your consistent pre-ride sequence' },
          { icon: '\uD83D\uDCDD', label: 'Lesson Prep', to: '/lesson-prep', desc: 'A 60-second summary before your next lesson' },
        ],
      },
      {
        heading: 'Competitions',
        links: [
          { icon: '\uD83C\uDFDF', label: 'Show Preparation', to: '/show-prep/new' },
          { icon: '\uD83D\uDCCB', label: 'Event Planner', to: '/events/new' },
          { icon: '\uD83E\uDDF3', label: 'Packing List', to: '/show-prep/new' },
        ],
      },
    ],
  },
  {
    id: 'coaching',
    label: 'AI Coaching',
    sections: [
      {
        heading: 'Your Insights',
        links: [
          { icon: '\uD83D\uDDFA', label: 'Journey Map', to: '/insights?tab=journey' },
          { icon: '\uD83C\uDFAF', label: 'Multi-Voice Coaching', to: '/insights?tab=coaching' },
          { icon: '\uD83E\uDDE0', label: 'Grand Prix Thinking', to: '/insights?tab=grandprix' },
          { icon: '\uD83C\uDF3F', label: 'Physical Guidance', to: '/insights?tab=physical' },
          { icon: '\uD83D\uDCCA', label: 'Data Visualizations', to: '/insights?tab=visualizations' },
        ],
      },
    ],
  },
  {
    id: 'learn',
    label: 'Learn',
    sections: [
      {
        heading: 'Dressage Study',
        links: [
          { icon: '\uD83D\uDCD0', label: 'Arena Geometry Trainer', href: '/arena-geometry-trainer.html' },
          { icon: '\uD83D\uDDD2', label: 'Test Explorer', to: '/learn/test-explorer' },
          { icon: '\uD83D\uDC65', label: 'Meet Your Coaches', to: '/learn/your-coaches' },
          { icon: '\uD83D\uDCDA', label: 'Recommended Reading', to: '/learn/recommended-reading' },
        ],
      },
      {
        heading: 'Background',
        links: [
          { icon: '\uD83D\uDD2C', label: 'Science & Research', href: '/ydj-science.html' },
        ],
      },
    ],
  },
  {
    id: 'assess',
    label: 'Assess',
    sections: [
      {
        heading: 'Self-Assessment',
        links: [
          { icon: '\uD83E\uDE9E', label: 'Rider Self-Assessment', to: '/rider-assessments/new' },
          { icon: '\uD83C\uDFC3', label: 'Physical Assessment', to: '/physical-assessments/new' },
          { icon: '\uD83D\uDCD0', label: 'Technical & Philosophical', to: '/technical-assessments/new' },
        ],
      },
      {
        heading: 'Practice',
        links: [
          { icon: '\uD83E\uDDF0', label: "Rider\u2019s Toolkit", to: '/toolkit/new' },
          { icon: '\uD83E\uDDE0', label: 'Visualization Script', to: '/toolkit/visualization/new' },
        ],
      },
    ],
  },
  {
    id: 'profiles',
    label: 'Profiles',
    sections: [
      {
        heading: 'My Info',
        links: [
          { icon: '\uD83E\uDDD1', label: 'Rider Profile', to: '/profile/rider' },
          { icon: '\uD83D\uDC34', label: 'Horses', to: '/horses' },
          { icon: '\u2699\uFE0F', label: 'Settings', to: '/settings' },
        ],
      },
    ],
  },
];

export default function AppLayout() {
  const { currentUser, logout } = useAuth();
  useCacheWarmth();
  const navigate = useNavigate();
  const location = useLocation();
  const navRef = useRef(null);

  // Theme toggle
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('ydj-theme');
    return saved || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ydj-theme', theme);
  }, [theme]);

  function toggleTheme() {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }

  // Add body class so child pages can detect layout context
  useEffect(() => {
    document.body.classList.add('app-layout-active');
    return () => document.body.classList.remove('app-layout-active');
  }, []);

  // Touch support: tap-to-toggle dropdowns on touch devices
  const handleTouchStart = useCallback((e) => {
    const navItem = e.target.closest('.nav-item.has-dd');
    if (!navItem) {
      // Tapped outside — close all
      navRef.current?.querySelectorAll('.nav-item.open').forEach(el => el.classList.remove('open'));
      return;
    }
    // If tapping the button area (not a link inside dropdown)
    const inDropdown = e.target.closest('.nav-dd');
    if (!inDropdown) {
      e.preventDefault();
      const wasOpen = navItem.classList.contains('open');
      // Close all others
      navRef.current?.querySelectorAll('.nav-item.open').forEach(el => el.classList.remove('open'));
      if (!wasOpen) navItem.classList.add('open');
    }
  }, []);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    nav.addEventListener('touchstart', handleTouchStart, { passive: false });
    // Close on outside touch
    const handleOutside = (e) => {
      if (!nav.contains(e.target)) {
        nav.querySelectorAll('.nav-item.open').forEach(el => el.classList.remove('open'));
      }
    };
    document.addEventListener('touchstart', handleOutside, { passive: true });
    return () => {
      nav.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [handleTouchStart]);

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

  return (
    <div className="app-layout">
      <nav className="top-nav" ref={navRef}>
        {/* Brand */}
        <div className="nav-brand">
          <img src="/assets/logo-white-line.svg"
               alt="Your Dressage Journey"
               height="44" />
        </div>

        {/* Home — direct link */}
        <div className="nav-item">
          <Link to="/dashboard" className={`nav-btn${isActive('/dashboard') ? ' active' : ''}`}>&#8962; Home</Link>
        </div>

        <div className="nav-sep" />

        {/* Dropdown groups */}
        {NAV_GROUPS.map(group => (
          <div key={group.id} className="nav-item has-dd">
            <button className="nav-btn">
              {group.label} <span className="nav-caret">&#9662;</span>
            </button>
            <div className="nav-dd">
              {group.sections.map((section, si) => (
                <div key={si}>
                  <div className="dd-section-label">{section.heading}</div>
                  {section.links.map((link, li) => (
                    link.href ? (
                      <a key={li} href={link.href} className="dd-link">
                        <span className="dd-icon">{link.icon}</span> {link.label}
                      </a>
                    ) : (
                      <Link key={li} to={link.to} className="dd-link">
                        <span className="dd-icon">{link.icon}</span> {link.label}
                      </Link>
                    )
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="nav-sep" />

        {/* Quick Start — direct link */}
        <div className="nav-item">
          <Link to="/quickstart" className={`nav-btn nav-special${isActive('/quickstart') ? ' active' : ''}`}>&#9672; Quick Start</Link>
        </div>

        <div className="nav-spacer" />

        {/* Help — direct link */}
        <div className="nav-item">
          <Link to="/tips-and-faq" className={`nav-btn nav-help${isActive('/tips-and-faq') ? ' active' : ''}`}>? Help</Link>
        </div>

        {/* Theme toggle */}
        <button className="nav-btn nav-theme-toggle" onClick={toggleTheme} title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}>
          {theme === 'light' ? '\u263D' : '\u2600'}
        </button>
      </nav>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
