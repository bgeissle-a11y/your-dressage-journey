import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import PrivateRoute from './components/Auth/PrivateRoute';
import AppLayout from './components/Layout/AppLayout';
import { initGA4, trackPageView } from './analytics';
import SignUp from './components/Auth/SignUp';
import SignIn from './components/Auth/SignIn';
import ForgotPassword from './components/Auth/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Insights from './pages/Insights';

import TipsAndFaq from './pages/TipsAndFaq';
import OutputsTipsAndFaq from './pages/OutputsTipsAndFaq';
import QuickStartMap from './components/QuickStartMap/QuickStartMap';
import Home from './pages/Home';

// Profile
import RiderProfileForm from './components/RiderProfile/RiderProfileForm';
import HorseProfileList from './components/HorseProfile/HorseProfileList';
import HorseProfileForm from './components/HorseProfile/HorseProfileForm';

// Record
import ReflectionList from './components/Reflection/ReflectionList';
import ReflectionForm from './components/Reflection/ReflectionForm';
import DebriefList from './components/Debrief/DebriefList';
import DebriefForm from './components/Debrief/DebriefForm';
import ObservationList from './components/Observation/ObservationList';
import ObservationForm from './components/Observation/ObservationForm';
import LessonNoteList from './components/LessonNotes/LessonNoteList';
import LessonNoteForm from './components/LessonNotes/LessonNoteForm';

// Plan
import JourneyEventList from './components/JourneyEvent/JourneyEventList';
import JourneyEventForm from './components/JourneyEvent/JourneyEventForm';
import ShowPrepList from './components/ShowPrep/ShowPrepList';
import ShowPrepForm from './components/ShowPrep/ShowPrepForm';
import ShowPlanner from './components/ShowPlanner/ShowPlanner';

// Horse Health
import HealthEntryList from './components/HorseHealth/HealthEntryList';
import HealthEntryForm from './components/HorseHealth/HealthEntryForm';

// Rider Health
import HealthLogList from './components/RiderHealth/HealthLogList';
import HealthLogForm from './components/RiderHealth/HealthLogForm';

// Assessments
import PhysicalAssessmentList from './components/PhysicalAssessment/PhysicalAssessmentList';
import PhysicalAssessmentForm from './components/PhysicalAssessment/PhysicalAssessmentForm';
import RiderAssessmentList from './components/RiderAssessment/RiderAssessmentList';
import RiderAssessmentForm from './components/RiderAssessment/RiderAssessmentForm';
import TechnicalPhilosophicalList from './components/TechnicalPhilosophical/TechnicalPhilosophicalList';
import TechnicalPhilosophicalForm from './components/TechnicalPhilosophical/TechnicalPhilosophicalForm';

import PracticeCard from './components/PracticeCard/PracticeCard';
import PreRideRitual from './components/PreRideRitual/PreRideRitual';
import LessonPrep from './pages/LessonPrep';

// Toolkit
import ToolkitList from './components/RiderToolkit/ToolkitList';
import ToolkitForm from './components/RiderToolkit/ToolkitForm';

// Visualization
import VisualizationPage from './components/Visualization/VisualizationPage';

// Settings
import Settings from './components/Settings/Settings';

// Subscription
import Pricing from './pages/Pricing';
import SubscriptionSuccess from './pages/SubscriptionSuccess';
import SubscriptionCancel from './pages/SubscriptionCancel';

// Coach Brief
import CoachBriefPage from './components/CoachBrief/CoachBriefPage';

// First Light
import FirstLightWizard from './components/FirstLight/FirstLightWizard';
import FirstLightViewer from './components/FirstLight/FirstLightViewer';

// Learn
import TestExplorer from './components/TestExplorer/TestExplorer';
import './App.css';

// Initialize GA4 once on app load
initGA4()

// Sends page_view on every route change (SPA-aware)
function RouteTracker() {
  const location = useLocation()
  useEffect(() => {
    trackPageView(location.pathname, document.title)
  }, [location])
  return null
}

function App() {
  return (
    <Router>
      <RouteTracker />
      <AuthProvider>
        <SettingsProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/signup" element={<SignUp />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Protected Routes - wrapped in AppLayout */}
          <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/insights" element={<Insights />} />
            {/* Old standalone Insights URL — now folded into AI Coaching tabs */}
            <Route path="/data-insights" element={<Navigate to="/insights?tab=visualizations" replace />} />

            <Route path="/tips-and-faq" element={<TipsAndFaq />} />
            <Route path="/outputs-tips-and-faq" element={<OutputsTipsAndFaq />} />
            <Route path="/quickstart" element={<QuickStartMap />} />

            {/* Profile */}
            <Route path="/profile/rider" element={<RiderProfileForm />} />
            <Route path="/horses" element={<HorseProfileList />} />
            <Route path="/horses/new" element={<HorseProfileForm />} />
            <Route path="/horses/:id/edit" element={<HorseProfileForm />} />

            {/* Reflections */}
            <Route path="/reflections" element={<ReflectionList />} />
            <Route path="/reflections/new" element={<ReflectionForm />} />
            <Route path="/reflections/:id/edit" element={<ReflectionForm />} />

            {/* Debriefs */}
            <Route path="/debriefs" element={<DebriefList />} />
            <Route path="/debriefs/new" element={<DebriefForm />} />
            <Route path="/debriefs/:id/edit" element={<DebriefForm />} />

            {/* Observations */}
            <Route path="/observations" element={<ObservationList />} />
            <Route path="/observations/new" element={<ObservationForm />} />
            <Route path="/observations/:id/edit" element={<ObservationForm />} />

            {/* Lesson Notes */}
            <Route path="/lesson-notes" element={<LessonNoteList />} />
            <Route path="/lesson-notes/new" element={<LessonNoteForm />} />
            <Route path="/lesson-notes/:id/edit" element={<LessonNoteForm />} />

            {/* Journey Events */}
            <Route path="/events" element={<JourneyEventList />} />
            <Route path="/events/new" element={<JourneyEventForm />} />
            <Route path="/events/:id/edit" element={<JourneyEventForm />} />

            {/* Horse Health */}
            <Route path="/horse-health" element={<HealthEntryList />} />
            <Route path="/horse-health/new" element={<HealthEntryForm />} />
            <Route path="/horse-health/:id/edit" element={<HealthEntryForm />} />

            {/* Rider Health */}
            <Route path="/rider-health" element={<HealthLogList />} />
            <Route path="/rider-health/new" element={<HealthLogForm />} />
            <Route path="/rider-health/:id/edit" element={<HealthLogForm />} />

            {/* Practice Card */}
            <Route path="/practice-card" element={<PracticeCard />} />

            {/* Pre-Ride Ritual */}
            <Route path="/pre-ride-ritual" element={<PreRideRitual />} />

            {/* Lesson Prep (Pre-Lesson Summary) */}
            <Route path="/lesson-prep" element={<LessonPrep />} />

            {/* Toolkit */}
            <Route path="/toolkit" element={<ToolkitList />} />
            <Route path="/toolkit/new" element={<ToolkitForm />} />
            <Route path="/toolkit/:id/edit" element={<ToolkitForm />} />
            <Route path="/toolkit/visualization/new" element={<VisualizationPage />} />
            <Route path="/toolkit/visualization/:id" element={<VisualizationPage />} />

            {/* Show Prep */}
            <Route path="/show-prep" element={<ShowPrepList />} />
            <Route path="/show-prep/new" element={<ShowPrepForm />} />
            <Route path="/show-prep/:id/edit" element={<ShowPrepForm />} />
            <Route path="/show-planner/:planId" element={<ShowPlanner />} />

            {/* Assessments */}
            <Route path="/physical-assessments" element={<PhysicalAssessmentList />} />
            <Route path="/physical-assessments/new" element={<PhysicalAssessmentForm />} />
            <Route path="/physical-assessments/:id/edit" element={<PhysicalAssessmentForm />} />
            <Route path="/rider-assessments" element={<RiderAssessmentList />} />
            <Route path="/rider-assessments/new" element={<RiderAssessmentForm />} />
            <Route path="/rider-assessments/:id/edit" element={<RiderAssessmentForm />} />
            <Route path="/technical-assessments" element={<TechnicalPhilosophicalList />} />
            <Route path="/technical-assessments/new" element={<TechnicalPhilosophicalForm />} />
            <Route path="/technical-assessments/:id/edit" element={<TechnicalPhilosophicalForm />} />

            {/* Settings */}
            <Route path="/settings" element={<Settings />} />

            {/* Subscription */}
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/subscription/success" element={<SubscriptionSuccess />} />
            <Route path="/subscription/cancel" element={<SubscriptionCancel />} />

            {/* Coach Brief */}
            <Route path="/coach-brief" element={<CoachBriefPage />} />

            {/* First Light */}
            <Route path="/first-light" element={<FirstLightViewer />} />
            <Route path="/first-light/wizard" element={<FirstLightWizard />} />

            {/* Learn */}
            <Route path="/learn/test-explorer" element={<TestExplorer />} />
          </Route>

          {/* Default Route */}
          <Route path="/" element={<Home />} />
          <Route path="*" element={<Home />} />
        </Routes>
        </SettingsProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
