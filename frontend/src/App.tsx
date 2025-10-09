import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './theme/ThemeProvider';
import { AuthProvider } from './stores/authStore';
import { SpaceProvider } from './stores/spaceStore';
import { InvitationProvider } from './stores/invitationStore';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Landing } from './pages/Landing';
import { SignIn } from './pages/SignIn';
import { SignUp } from './pages/SignUp';
import { Dashboard } from './pages/Dashboard';
import { SpaceDetail } from './pages/SpaceDetail';
import { JoinSpace } from './pages/JoinSpace';
import { JournalListPage } from './features/journal/pages/JournalListPage';
import { JournalCreatePage } from './features/journal/pages/JournalCreatePage';
import { JournalViewPage } from './features/journal/pages/JournalViewPage';
import { JournalEditPage } from './features/journal/pages/JournalEditPage';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SpaceProvider>
          <InvitationProvider>
            <Router>
              <div className="app">
                <Routes>
                {/* Public routes */}
                <Route path="/" element={<Landing />} />
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

                {/* Journal routes */}
                <Route
                  path="/spaces/:spaceId/journals"
                  element={
                    <ProtectedRoute>
                      <JournalListPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/spaces/:spaceId/journals/new"
                  element={
                    <ProtectedRoute>
                      <JournalCreatePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/journals/:journalId"
                  element={
                    <ProtectedRoute>
                      <JournalViewPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/journals/:journalId/edit"
                  element={
                    <ProtectedRoute>
                      <JournalEditPage />
                    </ProtectedRoute>
                  }
                />

                {/* Catch all - redirect to landing */}
                <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
            </Router>
          </InvitationProvider>
        </SpaceProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
