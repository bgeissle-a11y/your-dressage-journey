import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import useDashboardData from '../hooks/useDashboardData';
import {
  getAllDebriefs,
  getAllReflections,
  getAllObservations,
  getAllJourneyEvents,
  getAllEventPrepPlans,
  getAllHealthEntries
} from '../services';
import { exportToCSV, exportToJSON, EXPORT_COLUMNS } from '../utils/exportUtils';
import './Dashboard.css';

const sections = [
  {
    title: 'Record',
    items: [
      { label: 'Post-Ride Debrief', description: 'Log your ride experience and rate intentions', to: '/debriefs/new', color: '#8B7355' },
      { label: 'Reflection', description: 'Capture personal milestones, aha moments, and growth', to: '/reflections/new', color: '#4A90E2' },
      { label: 'Observation', description: 'Note what you learn watching others ride', to: '/observations/new', color: '#8B5CF6' },
      { label: 'Health & Soundness', description: 'Track vet visits, body work, and soundness concerns', to: '/horse-health/new', color: '#6B8E5F' },
    ]
  },
  {
    title: 'Plan',
    items: [
      { label: 'Event Preparation', description: 'Create a personalized preparation roadmap', to: '/event-prep/new', color: '#C67B5C' },
      { label: 'Journey Event', description: 'Track life changes that affect your riding', to: '/events/new', color: '#6B8E5F' },
    ]
  },
  {
    title: 'Review',
    items: [
      { label: 'All Debriefs', description: 'Browse your ride history', to: '/debriefs' },
      { label: 'All Reflections', description: 'Review your reflection library', to: '/reflections' },
      { label: 'All Observations', description: 'View observation notes', to: '/observations' },
      { label: 'Journey Events', description: 'View your timeline', to: '/events' },
      { label: 'Event Preps', description: 'View preparation plans', to: '/event-prep' },
      { label: 'Health & Soundness Log', description: 'View health records', to: '/horse-health' },
    ]
  },
  {
    title: 'Profile',
    items: [
      { label: 'Rider Profile', description: 'Your riding background and goals', to: '/profile/rider' },
      { label: 'My Horses', description: 'Manage your horse profiles', to: '/horses' },
    ]
  }
];

function qualityColor(q) {
  if (q >= 8) return '#6B8E5F';
  if (q >= 5) return '#D4A574';
  return '#D0021B';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric'
  });
}

export default function Dashboard() {
  const { currentUser } = useAuth();
  const { loading, stats, recentDebriefs, upcomingEvents } = useDashboardData();
  const [exporting, setExporting] = useState(false);

  async function handleExportAll(format) {
    if (!currentUser || exporting) return;
    setExporting(true);

    try {
      const [debRes, refRes, obsRes, evtRes, prepRes, healthRes] = await Promise.all([
        getAllDebriefs(currentUser.uid),
        getAllReflections(currentUser.uid),
        getAllObservations(currentUser.uid),
        getAllJourneyEvents(currentUser.uid),
        getAllEventPrepPlans(currentUser.uid),
        getAllHealthEntries(currentUser.uid)
      ]);

      const exportFn = format === 'csv' ? exportToCSV : exportToJSON;
      const today = new Date().toISOString().split('T')[0];

      if (debRes.success && debRes.data.length) exportFn(debRes.data, `ydj-debriefs-${today}`, EXPORT_COLUMNS.debriefs);
      if (refRes.success && refRes.data.length) exportFn(refRes.data, `ydj-reflections-${today}`, EXPORT_COLUMNS.reflections);
      if (obsRes.success && obsRes.data.length) exportFn(obsRes.data, `ydj-observations-${today}`, EXPORT_COLUMNS.observations);
      if (evtRes.success && evtRes.data.length) exportFn(evtRes.data, `ydj-journey-events-${today}`, EXPORT_COLUMNS.journeyEvents);
      if (prepRes.success && prepRes.data.length) exportFn(prepRes.data, `ydj-event-preps-${today}`, EXPORT_COLUMNS.eventPrepPlans);
      if (healthRes.success && healthRes.data.length) exportFn(healthRes.data, `ydj-horse-health-${today}`, EXPORT_COLUMNS.horseHealthEntries);
    } catch (err) {
      console.error('Export failed:', err);
    }

    setExporting(false);
  }

  if (loading) {
    return <div className="dashboard-loading">Loading your journey...</div>;
  }

  return (
    <div className="dashboard">
      {/* Welcome */}
      <div className="dashboard-welcome">
        <h1>Welcome back, {currentUser?.displayName || 'Rider'}!</h1>
        <p>What would you like to do today?</p>
      </div>

      {/* Getting Started banner — shown when user has no debriefs yet */}
      {stats && stats.debriefCount === 0 && (
        <Link to="/tips-and-faq" className="dashboard-getting-started">
          <strong>New here?</strong> Check out our Tips &amp; FAQ for a quick guide to getting the most from your journey.
          <span className="getting-started-arrow">&rarr;</span>
        </Link>
      )}

      {/* Stat Cards */}
      {stats && (
        <div className="dashboard-stats">
          <div className="stat-card">
            <div className="stat-value">{stats.debriefCount}</div>
            <div className="stat-label">Rides Logged</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.reflectionCount}</div>
            <div className="stat-label">Reflections</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {stats.categoryCoverage.covered}/{stats.categoryCoverage.total}
            </div>
            <div className="stat-label">Categories</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.streak}<span style={{ fontSize: '0.6em', fontWeight: 400 }}>wk</span></div>
            <div className="stat-label">Riding Streak</div>
          </div>
        </div>
      )}

      {/* Recent Rides + Quick Actions */}
      <div className="dashboard-middle">
        <div className="dashboard-recent">
          <h2>Recent Rides</h2>
          {recentDebriefs.length === 0 ? (
            <div className="recent-empty">
              No rides logged yet. <Link to="/debriefs/new" style={{ color: '#8B7355' }}>Log your first ride</Link>
            </div>
          ) : (
            <>
              {recentDebriefs.map(d => (
                <Link key={d.id} to={`/debriefs/${d.id}/edit`} className="recent-item">
                  <div className="recent-item-left">
                    <span className="recent-horse">{d.horseName || 'Untitled'}</span>
                    <span className="recent-date">{formatDate(d.rideDate)}</span>
                  </div>
                  {d.overallQuality && (
                    <span
                      className="recent-quality"
                      style={{
                        background: `${qualityColor(d.overallQuality)}20`,
                        color: qualityColor(d.overallQuality)
                      }}
                    >
                      {d.overallQuality}/10
                    </span>
                  )}
                </Link>
              ))}
              <Link to="/debriefs" className="recent-view-all">View all debriefs</Link>
            </>
          )}
        </div>

        <div className="dashboard-actions">
          <h2>Quick Actions</h2>
          <Link to="/debriefs/new" className="action-btn"><span>+</span> New Debrief</Link>
          <Link to="/reflections/new" className="action-btn"><span>+</span> New Reflection</Link>
          <Link to="/observations/new" className="action-btn"><span>+</span> New Observation</Link>
          <Link to="/event-prep/new" className="action-btn"><span>+</span> Event Prep</Link>
          <Link to="/events/new" className="action-btn"><span>+</span> Journey Event</Link>
          <Link to="/horse-health/new" className="action-btn"><span>+</span> Health Entry</Link>

          {upcomingEvents.length > 0 && (
            <div className="dashboard-upcoming">
              <h3>Upcoming Events</h3>
              {upcomingEvents.map(evt => (
                <div key={evt.id} className="upcoming-item">
                  <span className="upcoming-name">{evt.eventName}</span>
                  <span className="upcoming-date">{formatDate(evt.eventDate)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI Insights Banner */}
      <Link to="/insights" className="dashboard-insights-banner">
        <div className="insights-banner-content">
          <strong>AI Coaching Insights</strong>
          <span>Get personalized coaching from 4 expert perspectives, explore your journey map, and build your mental performance system.</span>
        </div>
        <span className="insights-banner-arrow">&rarr;</span>
      </Link>

      {/* Section Cards */}
      <div className="dashboard-sections">
        {sections.map(section => (
          <div key={section.title} className="dashboard-section">
            <h2>{section.title}</h2>
            <div className="dashboard-cards">
              {section.items.map(item => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="dashboard-card"
                  style={item.color ? { borderLeft: `4px solid ${item.color}` } : undefined}
                >
                  <div className="dashboard-card-label">{item.label}</div>
                  <div className="dashboard-card-desc">{item.description}</div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Export All */}
      <div className="dashboard-export">
        <h2>Export My Data</h2>
        <p>Download all your journey data. Each collection exports as a separate file.</p>
        <div className="export-buttons">
          <button className="btn-export" onClick={() => handleExportAll('csv')} disabled={exporting}>
            Export All as CSV
          </button>
          <button className="btn-export" onClick={() => handleExportAll('json')} disabled={exporting}>
            Export All as JSON
          </button>
        </div>
      </div>
    </div>
  );
}
