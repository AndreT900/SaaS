import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Login from './pages/auth/Login';

// Super Admin Pages
import Companies from './pages/superadmin/Companies';

// Company Admin Pages
import Users from './pages/admin/Users';

// User Pages
import Overview from './pages/dashboard/Overview';
import Chat from './pages/user/Chat';
import Calendar from './pages/user/Calendar';
import Documents from './pages/user/Documents';

import Setup from './pages/auth/Setup';
const AdminSettings = () => <div className="p-10 text-white font-bold text-2xl">Admin Settings (Todo)</div>;

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/setup" element={<Setup />} />

          {/* Super Admin Routes */}
          <Route path="/superadmin" element={
            <ProtectedRoute allowedRoles={['superadmin']}>
              <Navigate to="/superadmin/companies" replace />
            </ProtectedRoute>
          } />
          <Route path="/superadmin/companies" element={
            <ProtectedRoute allowedRoles={['superadmin']}>
              <Companies />
            </ProtectedRoute>
          } />

          {/* Company Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['company_admin']}>
              <Overview />
            </ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute allowedRoles={['company_admin']}>
              <Users />
            </ProtectedRoute>
          } />
          <Route path="/admin/settings" element={
            <ProtectedRoute allowedRoles={['company_admin']}>
              <AdminSettings />
            </ProtectedRoute>
          } />

          {/* User Routes */}
          <Route path="/user" element={
            <ProtectedRoute allowedRoles={['employee', 'company_admin', 'superadmin']}>
              <Overview />
            </ProtectedRoute>
          } />
          <Route path="/user/chat" element={
            <ProtectedRoute allowedRoles={['employee', 'company_admin', 'superadmin']}>
              <Chat />
            </ProtectedRoute>
          } />
          <Route path="/user/calendar" element={
            <ProtectedRoute allowedRoles={['employee', 'company_admin', 'superadmin']}>
              <Calendar />
            </ProtectedRoute>
          } />
          <Route path="/user/documents" element={
            <ProtectedRoute allowedRoles={['employee', 'company_admin', 'superadmin']}>
              <Documents />
            </ProtectedRoute>
          } />

          {/* Default Redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
