import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/Auth/PrivateRoute';
import AppLayout from './components/Layout/AppLayout';
import SignUp from './components/Auth/SignUp';
import SignIn from './components/Auth/SignIn';
import ForgotPassword from './components/Auth/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Insights from './pages/Insights';
import TipsAndFaq from './pages/TipsAndFaq';
import OutputsTipsAndFaq from './pages/OutputsTipsAndFaq';
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

// Plan
import JourneyEventList from './components/JourneyEvent/JourneyEventList';
import JourneyEventForm from './components/JourneyEvent/JourneyEventForm';
import EventPrepList from './components/EventPrep/EventPrepList';
import EventPrepForm from './components/EventPrep/EventPrepForm';
import EventPrepPlan from './components/EventPrep/EventPrepPlan';

// Assessments
import PhysicalAssessmentList from './components/PhysicalAssessment/PhysicalAssessmentList';
import PhysicalAssessmentForm from './components/PhysicalAssessment/PhysicalAssessmentForm';
import RiderAssessmentList from './components/RiderAssessment/RiderAssessmentList';
import RiderAssessmentForm from './components/RiderAssessment/RiderAssessmentForm';

import './App.css';

function App() {
  return (
    <Router>
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

            {/* Journey Events */}
            <Route path="/events" element={<JourneyEventList />} />
            <Route path="/events/new" element={<JourneyEventForm />} />
            <Route path="/events/:id/edit" element={<JourneyEventForm />} />

            {/* Event Prep */}
            <Route path="/event-prep" element={<EventPrepList />} />
            <Route path="/event-prep/new" element={<EventPrepForm />} />
            <Route path="/event-prep/:id/edit" element={<EventPrepForm />} />
            <Route path="/event-prep/:id/plan" element={<EventPrepPlan />} />

            {/* Assessments */}
            <Route path="/physical-assessments" element={<PhysicalAssessmentList />} />
            <Route path="/physical-assessments/new" element={<PhysicalAssessmentForm />} />
            <Route path="/physical-assessments/:id/edit" element={<PhysicalAssessmentForm />} />
            <Route path="/rider-assessments" element={<RiderAssessmentList />} />
            <Route path="/rider-assessments/new" element={<RiderAssessmentForm />} />
            <Route path="/rider-assessments/:id/edit" element={<RiderAssessmentForm />} />
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
