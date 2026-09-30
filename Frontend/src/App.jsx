import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import Layout from './components/Layout/Layout';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// App Pages
import RoomSetup from './pages/RoomSetup';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import AddExpense from './pages/AddExpense';
import Members from './pages/Members';
import Reports from './pages/Reports';
import Budget from './pages/Budget';
import Settlement from './pages/Settlement';
import Settings from './pages/Settings';
import Admin from './pages/Admin';
import { useAuth } from './contexts/AuthContext';

// Helper component for role-aware root navigation
const RootRedirect = () => {
  const { user } = useAuth();
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  return <Navigate to="/dashboard" replace />;
};

const App = () => (
  <ThemeProvider>
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            {/* Temporarily redirected auth routes */}
            <Route path="/forgot-password" element={<Navigate to="/login" replace />} />
            <Route path="/reset-password/:token" element={<Navigate to="/login" replace />} />

            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/room-setup" element={<RoomSetup />} />

              <Route element={<Layout />}>
                <Route index element={<RootRedirect />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/expenses" element={<Expenses />} />
                <Route path="/add-expense" element={<AddExpense />} />
                <Route path="/members" element={<Members />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/budget" element={<Budget />} />
                <Route path="/settlement" element={<Settlement />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/admin" element={<Admin />} />
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  </ThemeProvider>
);

export default App;
