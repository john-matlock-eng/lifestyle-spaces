import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './theme/ThemeProvider';
import { AuthProvider } from './stores/authStore';
import { SpaceProvider } from './stores/spaceStore';
import { InvitationProvider } from './stores/invitationStore';
import { AuthenticatedLayout } from './components/layout/AuthenticatedLayout';
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
import './styles/layout.css';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SpaceProvider>
          <InvitationProvider>
            <Router>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Landing />} />
                <Route path="/signin" element={<SignIn />} />
                <Route path="/signup" element={<SignUp />} />

                {/* Protected routes with layout */}
                <Route element={<AuthenticatedLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/space/:spaceId" element={<SpaceDetail />} />
                  <Route path="/join/:inviteCode" element={<JoinSpace />} />

                  {/* Journal routes */}
                  <Route path="/spaces/:spaceId/journals" element={<JournalListPage />} />
                  <Route path="/spaces/:spaceId/journals/new" element={<JournalCreatePage />} />
                  <Route path="/spaces/:spaceId/journals/:journalId" element={<JournalViewPage />} />
                  <Route path="/spaces/:spaceId/journals/:journalId/edit" element={<JournalEditPage />} />
                </Route>

                {/* Catch all - redirect to landing */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Router>
          </InvitationProvider>
        </SpaceProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
