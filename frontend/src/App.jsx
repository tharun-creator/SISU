import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, PrivateRoute } from './lib/auth';
import ClientDashboard from './pages/ClientDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';
import BookingPage from './pages/BookingPage';
import NotificationsPage from './pages/NotificationsPage';

import SettingsPage from './pages/SettingsPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Client */}
          <Route path="/" element={<PrivateRoute><ClientDashboard /></PrivateRoute>} />
          <Route path="/book" element={<PrivateRoute><BookingPage /></PrivateRoute>} />
          <Route path="/meetings" element={<PrivateRoute><ClientDashboard /></PrivateRoute>} />
          <Route path="/notifications" element={<PrivateRoute><NotificationsPage /></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />

          {/* Admin */}
          <Route path="/admin" element={<PrivateRoute adminOnly><AdminDashboard /></PrivateRoute>} />
          <Route path="/admin/meetings" element={<PrivateRoute adminOnly><AdminDashboard /></PrivateRoute>} />
          <Route path="/admin/pending" element={<PrivateRoute adminOnly><AdminDashboard /></PrivateRoute>} />

        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
