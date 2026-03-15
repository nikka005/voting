import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from './components/ui/sonner';

// ===== PUBLIC PANEL (Voting Site) =====
import HomePage from './pages/HomePage';
import ContestantsPage from './pages/ContestantsPage';
import LeaderboardPage from './pages/LeaderboardPage';
import VotingPage from './pages/VotingPage';

// ===== USER PANEL (Contestant Dashboard) =====
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ContestantDashboard from './pages/ContestantDashboard';

// ===== ADMIN PANEL (Backbone - Master Control) =====
import AdminPanel from './pages/AdminPanel';

// Protected Route - Requires Authentication
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Guest Route - Redirects if already logged in
const GuestRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* ============================================
          PUBLIC PANEL - Voting Site (Domain 1)
          ============================================ */}
      
      {/* Home - Browse & Discover */}
      <Route path="/" element={<HomePage />} />
      
      {/* Contestants - Browse all approved contestants */}
      <Route path="/contestants" element={<ContestantsPage />} />
      
      {/* Leaderboard - Real-time rankings */}
      <Route path="/leaderboard" element={<LeaderboardPage />} />
      
      {/* Voting Page - Individual contestant voting (e.g., /2026/john-doe) */}
      <Route path="/:year/:slug" element={<VotingPage />} />

      {/* ============================================
          USER PANEL - Contestant Dashboard (Domain 2)
          ============================================ */}
      
      {/* Login */}
      <Route
        path="/login"
        element={
          <GuestRoute>
            <LoginPage />
          </GuestRoute>
        }
      />
      
      {/* Register - Join the contest */}
      <Route
        path="/register"
        element={
          <GuestRoute>
            <RegisterPage />
          </GuestRoute>
        }
      />
      
      {/* Contestant Dashboard - Manage profile, photos, Q&A */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute requiredRole="contestant">
            <ContestantDashboard />
          </ProtectedRoute>
        }
      />

      {/* ============================================
          ADMIN PANEL - Master Control (Domain 2)
          ============================================ */}
      
      {/* Admin Panel - Full control of contestants, votes, rounds, categories */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminPanel />
          </ProtectedRoute>
        }
      />

      {/* Fallback - Redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster 
          position="top-right" 
          toastOptions={{
            style: {
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              color: '#0f172a',
              borderRadius: '16px',
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
