import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../components/Forms/Forms.css';

const sections = [
  {
    title: 'Record',
    items: [
      { label: 'Post-Ride Debrief', description: 'Log your ride experience and rate intentions', to: '/debriefs/new', color: '#8B7355' },
      { label: 'Reflection', description: 'Capture personal milestones, aha moments, and growth', to: '/reflections/new', color: '#4A90E2' },
      { label: 'Observation', description: 'Note what you learn watching others ride', to: '/observations/new', color: '#8B5CF6' },
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

export default function Dashboard() {
  const { currentUser } = useAuth();

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          color: '#8B7355',
          fontSize: '2em',
          marginBottom: '0.5rem'
        }}>
          Welcome back, {currentUser?.displayName || 'Rider'}!
        </h1>
        <p style={{ color: '#666' }}>What would you like to do today?</p>
      </div>

      {sections.map(section => (
        <div key={section.title} style={{ marginBottom: '2rem' }}>
          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            color: '#8B7355',
            fontSize: '1.35em',
            marginBottom: '0.75rem',
            paddingBottom: '0.5rem',
            borderBottom: '2px solid #E0D5C7'
          }}>
            {section.title}
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '0.75rem'
          }}>
            {section.items.map(item => (
              <Link
                key={item.to}
                to={item.to}
                style={{
                  display: 'block',
                  padding: '1.25rem 1.5rem',
                  background: 'white',
                  borderRadius: '12px',
                  border: '1px solid #E0D5C7',
                  borderLeft: item.color ? `4px solid ${item.color}` : '1px solid #E0D5C7',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                  color: 'inherit'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(139, 115, 85, 0.12)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <div style={{ fontWeight: 600, color: '#3A3A3A', marginBottom: '0.25rem' }}>
                  {item.label}
                </div>
                <div style={{ fontSize: '0.88rem', color: '#7A7A7A', lineHeight: 1.4 }}>
                  {item.description}
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
