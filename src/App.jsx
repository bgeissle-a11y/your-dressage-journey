import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/Auth/PrivateRoute';
import SignUp from './components/Auth/SignUp';
import SignIn from './components/Auth/SignIn';
import ForgotPassword from './components/Auth/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
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

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />

          {/* Default Route - Smart redirect based on auth state */}
          <Route path="/" element={<Home />} />

          {/* 404 - Redirect to home */}
          <Route path="*" element={<Home />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
