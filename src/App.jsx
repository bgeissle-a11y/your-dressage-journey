import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
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
import ShowPrepPlan from './components/ShowPrep/ShowPrepPlan';

// Horse Health
import HealthEntryList from './components/HorseHealth/HealthEntryList';
import HealthEntryForm from './components/HorseHealth/HealthEntryForm';

// Assessments
import PhysicalAssessmentList from './components/PhysicalAssessment/PhysicalAssessmentList';
import PhysicalAssessmentForm from './components/PhysicalAssessment/PhysicalAssessmentForm';
import RiderAssessmentList from './components/RiderAssessment/RiderAssessmentList';
import RiderAssessmentForm from './components/RiderAssessment/RiderAssessmentForm';
import TechnicalPhilosophicalList from './components/TechnicalPhilosophical/TechnicalPhilosophicalList';
import TechnicalPhilosophicalForm from './components/TechnicalPhilosophical/TechnicalPhilosophicalForm';

import PracticeCard from './components/PracticeCard/PracticeCard';
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
        <Routes>
          {/* Public Routes */}
          <Route path="/signup" element={<SignUp />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Protected Routes - wrapped in AppLayout */}
          <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/insights" element={<Insights />} />

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

            {/* Practice Card */}
            <Route path="/practice-card" element={<PracticeCard />} />

            {/* Show Prep */}
            <Route path="/show-prep" element={<ShowPrepList />} />
            <Route path="/show-prep/new" element={<ShowPrepForm />} />
            <Route path="/show-prep/:id/edit" element={<ShowPrepForm />} />
            <Route path="/show-prep/:id/plan" element={<ShowPrepPlan />} />

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
          </Route>

          {/* Default Route */}
          <Route path="/" element={<Home />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
