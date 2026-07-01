import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, PrivateRoute } from './lib/auth';
import { ToastProvider } from './components/ui/Toast';

// Lazy loaded feature components and pages
const LoginPage = lazy(() => import('./features/auth/LoginPage'));
const SignupPage = lazy(() => import('./features/auth/SignupPage'));
const ForgotPasswordPage = lazy(() => import('./features/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./features/auth/ResetPasswordPage'));

const ClientDashboard = lazy(() => import('./features/dashboard/ClientDashboard'));
const BookingPage = lazy(() => import('./pages/BookingPage'));
const NotebookPage = lazy(() => import('./features/notebook/NotebookPage'));
const SharedNoteView = lazy(() => import('./pages/SharedNoteView'));
const SetupProfile = lazy(() => import('./pages/SetupProfile'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const SessionLogsPage = lazy(() => import('./features/session_logs/SessionLogsPage'));
const SessionDetailPage = lazy(() => import('./pages/SessionDetailPage'));
const InvoicesPage = lazy(() => import('./pages/InvoicesPage'));

// Admin pages (temporarily imported as JSX, to be fully checked by type checker)
const AdminDashboard = lazy(() => import('./pages/AdminDashboard.jsx'));
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage.jsx'));
const AdminCalendarSlotsPage = lazy(() => import('./pages/AdminCalendarSlotsPage.jsx'));
const AdminDecisionFeed = lazy(() => import('./pages/AdminDecisionFeed.jsx'));
const AdminSlotsBookedPage = lazy(() => import('./pages/AdminSlotsBookedPage.jsx'));
const AdminReschedulePage = lazy(() => import('./pages/AdminReschedulePage.jsx'));

function PageLoader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );
}

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Router>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/notes/shared/:token" element={<SharedNoteView />} />

              {/* Client routes */}
              <Route path="/" element={<PrivateRoute><ClientDashboard /></PrivateRoute>} />
              <Route path="/book" element={<PrivateRoute><BookingPage /></PrivateRoute>} />
              <Route path="/notebook" element={<PrivateRoute><NotebookPage /></PrivateRoute>} />
              <Route path="/setup-profile" element={<PrivateRoute><SetupProfile /></PrivateRoute>} />
              <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
              <Route path="/notifications" element={<PrivateRoute><NotificationsPage /></PrivateRoute>} />
              <Route path="/session-logs" element={<PrivateRoute><SessionLogsPage /></PrivateRoute>} />
              <Route path="/session/:id" element={<PrivateRoute><SessionDetailPage /></PrivateRoute>} />
              <Route path="/invoices" element={<PrivateRoute><InvoicesPage /></PrivateRoute>} />

              {/* Admin routes */}
              <Route path="/admin" element={<PrivateRoute adminOnly><AdminDashboard /></PrivateRoute>} />
              <Route path="/admin/meetings" element={<PrivateRoute adminOnly><AdminDashboard /></PrivateRoute>} />
              <Route path="/admin/invoices" element={<PrivateRoute adminOnly><InvoicesPage /></PrivateRoute>} />
              <Route path="/admin/pending" element={<PrivateRoute adminOnly><AdminDecisionFeed /></PrivateRoute>} />
              <Route path="/admin/rescheduled" element={<PrivateRoute adminOnly><AdminReschedulePage /></PrivateRoute>} />
              <Route path="/admin/users" element={<PrivateRoute adminOnly><AdminUsersPage /></PrivateRoute>} />
              <Route path="/admin/calendar-slots" element={<PrivateRoute adminOnly><AdminCalendarSlotsPage /></PrivateRoute>} />
              <Route path="/admin/slots-booked" element={<PrivateRoute adminOnly><AdminSlotsBookedPage /></PrivateRoute>} />

              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </Router>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
