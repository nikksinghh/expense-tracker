import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import Layout from './components/Layout/Layout';

// Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
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

const App = () => (
  <ThemeProvider>
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/room-setup" element={<RoomSetup />} />

              <Route path="/" element={
                <Layout>
                  {({ selectedMonth }) => <Navigate to="/dashboard" replace />}
                </Layout>
              } />

              <Route path="/dashboard" element={
                <Layout>
                  {({ selectedMonth }) => <Dashboard selectedMonth={selectedMonth} />}
                </Layout>
              } />

              <Route path="/expenses" element={<Layout><Expenses /></Layout>} />
              <Route path="/add-expense" element={<Layout><AddExpense /></Layout>} />
              <Route path="/members" element={<Layout><Members /></Layout>} />

              <Route path="/reports" element={
                <Layout>
                  {({ selectedMonth }) => <Reports selectedMonth={selectedMonth} />}
                </Layout>
              } />

              <Route path="/budget" element={
                <Layout>
                  {({ selectedMonth }) => <Budget selectedMonth={selectedMonth} />}
                </Layout>
              } />

              <Route path="/settlement" element={<Layout><Settlement /></Layout>} />
              <Route path="/settings" element={<Layout><Settings /></Layout>} />
              <Route path="/admin" element={<Layout><Admin /></Layout>} />
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
