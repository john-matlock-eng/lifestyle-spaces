import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './theme/ThemeProvider';
import { AuthProvider } from './stores/authStore';
import { SpaceProvider } from './stores/spaceStore';
import { InvitationProvider } from './stores/invitationStore';
import { EllieCustomizationProvider } from './contexts/EllieCustomizationContext';
import { EllieProvider } from './contexts/EllieContext';
import { ChatProvider } from './features/chat';
import { AuthenticatedLayout } from './components/layout/AuthenticatedLayout';
import './App.css';
import './styles/layout.css';

// Eager-loaded pages (small, frequently accessed)
import { Landing } from './pages/Landing';
import { SignIn } from './pages/SignIn';
import { SignUp } from './pages/SignUp';
import { Dashboard } from './pages/Dashboard';

// Lazy-loaded pages (larger bundles, loaded on demand)
const SpaceDetail = lazy(() => import('./pages/SpaceDetail').then(m => ({ default: m.SpaceDetail })));
const JoinSpace = lazy(() => import('./pages/JoinSpace').then(m => ({ default: m.JoinSpace })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));

// Journal pages (heavy with TipTap editor)
const JournalListPage = lazy(() => import('./features/journal/pages/JournalListPage').then(m => ({ default: m.JournalListPage })));
const JournalCreatePage = lazy(() => import('./features/journal/pages/JournalCreatePage').then(m => ({ default: m.JournalCreatePage })));
const JournalViewPage = lazy(() => import('./features/journal/pages/JournalViewPage').then(m => ({ default: m.JournalViewPage })));
const JournalEditPage = lazy(() => import('./features/journal/pages/JournalEditPage').then(m => ({ default: m.JournalEditPage })));
const FrameworkDashboardPage = lazy(() => import('./features/journal/pages/FrameworkDashboardPage').then(m => ({ default: m.FrameworkDashboardPage })));

// Loading fallback component
const PageLoader = () => (
  <div className="page-loader">
    <div className="page-loader-spinner" />
  </div>
);

// Create a client with sensible defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      gcTime: 1000 * 60 * 5, // 5 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <SpaceProvider>
            <InvitationProvider>
              <EllieCustomizationProvider>
                <EllieProvider>
                  <ChatProvider>
                    <Router>
                      <Suspense fallback={<PageLoader />}>
                        <Routes>
                          {/* Public routes */}
                          <Route path="/" element={<Landing />} />
                          <Route path="/signin" element={<SignIn />} />
                          <Route path="/signup" element={<SignUp />} />

                          {/* Protected routes with layout */}
                          <Route element={<AuthenticatedLayout />}>
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/profile" element={<Profile />} />
                            <Route path="/settings" element={<Settings />} />
                            <Route path="/space/:spaceId" element={<SpaceDetail />} />
                            <Route path="/space/:spaceId/:tab" element={<SpaceDetail />} />
                            <Route path="/join/:inviteCode" element={<JoinSpace />} />

                            {/* Journal routes */}
                            <Route path="/spaces/:spaceId/journals" element={<JournalListPage />} />
                            <Route path="/spaces/:spaceId/journals/new" element={<JournalCreatePage />} />
                            <Route path="/spaces/:spaceId/journals/:journalId" element={<JournalViewPage />} />
                            <Route path="/spaces/:spaceId/journals/:journalId/edit" element={<JournalEditPage />} />

                            {/* Framework routes */}
                            <Route path="/spaces/:spaceId/frameworks/:frameworkId" element={<FrameworkDashboardPage />} />
                          </Route>

                          {/* Catch all - redirect to landing */}
                          <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                      </Suspense>
                    </Router>
                  </ChatProvider>
                </EllieProvider>
              </EllieCustomizationProvider>
            </InvitationProvider>
          </SpaceProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
