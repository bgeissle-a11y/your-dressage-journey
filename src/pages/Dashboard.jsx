import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import useDashboardData from '../hooks/useDashboardData';
import {
  getAllDebriefs,
  getAllReflections,
  getAllObservations,
  getAllJourneyEvents,
  getAllShowPreparations,
  getAllHealthEntries,
  getAllLessonNotes
} from '../services';
import { getAdminStats } from '../services/aiService';
import { exportToCSV, exportToJSON, EXPORT_COLUMNS } from '../utils/exportUtils';
import './Dashboard.css';

const ADMIN_UID = 'HwwKk5C7qZh1Bn0KYalPYIZWHmj2';

const sections = [
  {
    title: 'Record',
    items: [
      { label: 'Post-Ride Debrief', description: 'Log your ride experience and rate intentions', to: '/debriefs/new', color: '#8B7355' },
      { label: 'Reflection', description: 'Capture personal milestones, aha moments, and growth', to: '/reflections/new', color: '#4A90E2' },
      { label: 'Observation', description: 'Note what you learn watching others ride', to: '/observations/new', color: '#8B5CF6' },
      { label: 'Health & Soundness', description: 'Track vet visits, body work, and soundness concerns', to: '/horse-health/new', color: '#6B8E5F' },
      { label: 'Lesson Notes', description: 'Capture instructor guidance, cues, and takeaways', to: '/lesson-notes/new', color: '#C67B5C' },
    ]
  },
  {
    title: 'Plan',
    items: [
      { label: 'Show Preparation', description: 'Create a personalized show preparation roadmap', to: '/show-prep/new', color: '#C67B5C' },
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
      { label: 'Show Preps', description: 'View show preparation plans', to: '/show-prep' },
      { label: 'Health & Soundness Log', description: 'View health records', to: '/horse-health' },
      { label: 'Lesson Notes', description: 'Browse your lesson library', to: '/lesson-notes' },
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
  const [adminData, setAdminData] = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState(null);

  const isAdmin = currentUser?.uid === ADMIN_UID;

  async function handleAdminStats() {
    setAdminLoading(true);
    setAdminError(null);
    try {
      const data = await getAdminStats();
      setAdminData(data);
    } catch (err) {
      setAdminError(err.message || 'Failed to load admin stats');
    }
    setAdminLoading(false);
  }

  async function handleExportAll(format) {
    if (!currentUser || exporting) return;
    setExporting(true);

    try {
      const [debRes, refRes, obsRes, evtRes, prepRes, healthRes, lessonRes] = await Promise.all([
        getAllDebriefs(currentUser.uid),
        getAllReflections(currentUser.uid),
        getAllObservations(currentUser.uid),
        getAllJourneyEvents(currentUser.uid),
        getAllShowPreparations(currentUser.uid),
        getAllHealthEntries(currentUser.uid),
        getAllLessonNotes(currentUser.uid)
      ]);

      const exportFn = format === 'csv' ? exportToCSV : exportToJSON;
      const today = new Date().toISOString().split('T')[0];

      if (debRes.success && debRes.data.length) exportFn(debRes.data, `ydj-debriefs-${today}`, EXPORT_COLUMNS.debriefs);
      if (refRes.success && refRes.data.length) exportFn(refRes.data, `ydj-reflections-${today}`, EXPORT_COLUMNS.reflections);
      if (obsRes.success && obsRes.data.length) exportFn(obsRes.data, `ydj-observations-${today}`, EXPORT_COLUMNS.observations);
      if (evtRes.success && evtRes.data.length) exportFn(evtRes.data, `ydj-journey-events-${today}`, EXPORT_COLUMNS.journeyEvents);
      if (prepRes.success && prepRes.data.length) exportFn(prepRes.data, `ydj-show-preps-${today}`, EXPORT_COLUMNS.showPreparations);
      if (healthRes.success && healthRes.data.length) exportFn(healthRes.data, `ydj-horse-health-${today}`, EXPORT_COLUMNS.horseHealthEntries);
      if (lessonRes.success && lessonRes.data.length) exportFn(lessonRes.data, `ydj-lesson-notes-${today}`, EXPORT_COLUMNS.lessonNotes);
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
      </div>

      {/* Quick Start Map banner — shown when core practice not yet complete */}
      {stats && (stats.debriefCount < 5 || stats.categoryCoverage.covered < 6) && (
        <Link to="/quickstart" className="dashboard-getting-started">
          <strong>Quick Start Map</strong> See your progress and what to do next — a visual guide to your journey.
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
            <div className="stat-label">Reflection Categories</div>
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
          <Link to="/show-prep/new" className="action-btn"><span>+</span> Show Prep</Link>
          <Link to="/events/new" className="action-btn"><span>+</span> Journey Event</Link>
          <Link to="/horse-health/new" className="action-btn"><span>+</span> Health Entry</Link>
          <Link to="/lesson-notes/new" className="action-btn"><span>+</span> Lesson Notes</Link>

          {upcomingEvents.length > 0 && (
            <div className="dashboard-upcoming">
              <h3>Upcoming Shows</h3>
              {upcomingEvents.map(evt => (
                <div key={evt.id} className="upcoming-item">
                  <span className="upcoming-name">{evt.showName || evt.eventName}</span>
                  <span className="upcoming-date">{formatDate(evt.showDateStart || evt.eventDate)}</span>
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

      {/* Admin Stats — only visible to admin */}
      {isAdmin && (
        <div className="dashboard-export">
          <h2>Pilot Activity</h2>
          <p>Cross-user activity summary for all pilot participants.</p>
          <button className="btn-export" onClick={handleAdminStats} disabled={adminLoading}>
            {adminLoading ? 'Loading...' : 'View User Activity'}
          </button>
          {adminError && <p style={{ color: '#D0021B', marginTop: '0.5rem' }}>{adminError}</p>}
          {adminData && (
            <div style={{ marginTop: '1rem', overflowX: 'auto' }}>
              <p style={{ marginBottom: '0.5rem', color: '#8B7355' }}>{adminData.userCount} users as of {new Date(adminData.generatedAt).toLocaleDateString()}</p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E0D5C7', textAlign: 'left' }}>
                    <th style={{ padding: '0.5rem' }}>Name</th>
                    <th style={{ padding: '0.5rem' }}>Email</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>Rides</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>Reflect.</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>Obs.</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>Total</th>
                    <th style={{ padding: '0.5rem' }}>Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {adminData.users.map(u => (
                    <tr key={u.uid} style={{ borderBottom: '1px solid #E0D5C7' }}>
                      <td style={{ padding: '0.5rem' }}>{u.displayName || '—'}</td>
                      <td style={{ padding: '0.5rem' }}>{u.email || '—'}</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>{u.debriefs || 0}</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>{u.reflections || 0}</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>{u.observations || 0}</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 600 }}>{u.total}</td>
                      <td style={{ padding: '0.5rem' }}>{u.lastActivity ? new Date(u.lastActivity).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

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
