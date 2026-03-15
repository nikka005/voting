import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from './components/ui/sonner';

// ===============================================================
// DOMAIN 1: PUBLIC VOTING WEBSITE
// Routes: /, /contestants, /leaderboard, /:year/:slug, /payment/*
// ===============================================================
import HomePage from './pages/HomePage';
import ContestantsPage from './pages/ContestantsPage';
import LeaderboardPage from './pages/LeaderboardPage';
import VotingPage from './pages/VotingPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';

// ===============================================================
// DOMAIN 2: MANAGEMENT PORTAL
// Routes: /portal, /portal/admin/*, /portal/dashboard/*
// ===============================================================
import PortalHome from './pages/portal/PortalHome';
import PortalLogin from './pages/portal/PortalLogin';
import PortalRegister from './pages/portal/PortalRegister';
import AdminPanel from './pages/portal/AdminPanel';
import ContestantDashboard from './pages/portal/ContestantDashboard';

// ===============================================================
// PROTECTED ROUTE COMPONENTS
// ===============================================================

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/portal/login" replace />;
  }
  
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/portal" replace />;
  }
  
  return children;
};

// Redirect authenticated users away from auth pages
const AuthRoute = ({ children }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/portal" replace />;
  }
  
  return children;
};

// ===============================================================
// MAIN APP COMPONENT
// ===============================================================

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ============================================
              DOMAIN 1: PUBLIC VOTING WEBSITE
              Accessible to all visitors without login
              ============================================ */}
          
          {/* Homepage - Contest overview */}
          <Route path="/" element={<HomePage />} />
          
          {/* Contestants - Browse all contestants */}
          <Route path="/contestants" element={<ContestantsPage />} />
          
          {/* Leaderboard - Real-time rankings */}
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          
          {/* Individual Voting Page */}
          <Route path="/:year/:slug" element={<VotingPage />} />
          
          {/* Payment Pages */}
          <Route path="/payment/success" element={<PaymentSuccessPage />} />
          <Route path="/payment/cancel" element={<Navigate to="/" replace />} />

          {/* ============================================
              DOMAIN 2: MANAGEMENT PORTAL
              Separate domain for Admin & Contestants
              ============================================ */}
          
          {/* Portal Home - Entry point for management */}
          <Route 
            path="/portal" 
            element={
              <ProtectedRoute>
                <PortalHome />
              </ProtectedRoute>
            } 
          />
          
          {/* Portal Authentication */}
          <Route 
            path="/portal/login" 
            element={
              <AuthRoute>
                <PortalLogin />
              </AuthRoute>
            } 
          />
          <Route 
            path="/portal/register" 
            element={
              <AuthRoute>
                <PortalRegister />
              </AuthRoute>
            } 
          />
          
          {/* Admin Panel */}
          <Route
            path="/portal/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminPanel />
              </ProtectedRoute>
            }
          />
          
          {/* Contestant Dashboard */}
          <Route
            path="/portal/dashboard"
            element={
              <ProtectedRoute requiredRole="contestant">
                <ContestantDashboard />
              </ProtectedRoute>
            }
          />

          {/* ============================================
              LEGACY REDIRECTS (for backwards compatibility)
              ============================================ */}
          
          <Route path="/login" element={<Navigate to="/portal/login" replace />} />
          <Route path="/register" element={<Navigate to="/portal/register" replace />} />
          <Route path="/dashboard" element={<Navigate to="/portal/dashboard" replace />} />
          <Route path="/admin" element={<Navigate to="/portal/admin" replace />} />
          <Route path="/backbone" element={<Navigate to="/portal/admin" replace />} />
          
          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        
        <Toaster 
          position="top-right" 
          richColors 
          toastOptions={{
            style: { 
              borderRadius: '12px',
              padding: '16px',
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
