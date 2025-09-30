import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './stores/authStore';
import { SpaceProvider } from './stores/spaceStore';
import { InvitationProvider } from './stores/invitationStore';
import { ProtectedRoute } from './components/ProtectedRoute';
import { SignIn } from './pages/SignIn';
import { SignUp } from './pages/SignUp';
import { Dashboard } from './pages/Dashboard';
import { SpaceDetail } from './pages/SpaceDetail';
import { JoinSpace } from './pages/JoinSpace';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <SpaceProvider>
        <InvitationProvider>
          <Router>
            <div className="app">
              <Routes>
                {/* Public routes */}
                <Route path="/signin" element={<SignIn />} />
                <Route path="/signup" element={<SignUp />} />

                {/* Protected routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/space/:spaceId"
                  element={
                    <ProtectedRoute>
                      <SpaceDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/join/:inviteCode"
                  element={
                    <ProtectedRoute>
                      <JoinSpace />
                    </ProtectedRoute>
                  }
                />

                {/* Default redirect */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />

                {/* Catch all - redirect to dashboard */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </div>
          </Router>
        </InvitationProvider>
      </SpaceProvider>
    </AuthProvider>
  );
}

export default App;
