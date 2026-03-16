import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from './components/ui/sonner';

// ===============================================================
// DOMAIN 1: PUBLIC VOTING WEBSITE (glowingstar.vote)
// Routes: /, /contestants, /leaderboard, /:year/:slug, /payment/*
// ===============================================================
import HomePage from './pages/HomePage';
import ContestantsPage from './pages/ContestantsPage';
import LeaderboardPage from './pages/LeaderboardPage';
import VotingPage from './pages/VotingPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';

// ===============================================================
// DOMAIN 2: USER SITE / CONTESTANT PORTAL (glowingstar.net)
// Routes: /join, /portal, /portal/admin/*, /portal/dashboard/*
// ===============================================================
import UserSiteLanding from './pages/UserSiteLanding';
import PortalHome from './pages/portal/PortalHome';
import PortalLogin from './pages/portal/PortalLogin';
import PortalRegister from './pages/portal/PortalRegister';
import AdminLogin from './pages/portal/AdminLogin';
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

// Smart Home Router - Shows different pages based on domain
function SmartHome() {
  const hostname = window.location.hostname.toLowerCase();
  
  // Check for user site domain patterns
  const isUserSite = 
    hostname.includes('glowingstar.net') || 
    hostname.includes('.net') ||
    hostname === 'localhost' && window.location.port === '3001'; // For local testing
  
  // If on user site domain (glowingstar.net), show landing page
  if (isUserSite) {
    return <UserSiteLanding />;
  }
  
  // Otherwise show voting homepage (glowingstar.vote)
  return <HomePage />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ============================================
              SMART HOME ROUTING
              glowingstar.vote -> Voting HomePage
              glowingstar.net -> User Site Landing
              ============================================ */}
          
          {/* Homepage - Smart routing based on domain */}
          <Route path="/" element={<SmartHome />} />
          
          {/* ============================================
              DOMAIN 1: PUBLIC VOTING WEBSITE
              Accessible to all visitors without login
              ============================================ */}
          
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
          
          {/* User Site Landing - Join Contest Page */}
          <Route path="/join" element={<UserSiteLanding />} />
          
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
          
          {/* Admin Secret Login */}
          <Route 
            path="/backbon/admin-login" 
            element={
              <AuthRoute>
                <AdminLogin />
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
          <Route path="/backbone" element={<Navigate to="/portal/login" replace />} />
          <Route path="/backend" element={<Navigate to="/portal/login" replace />} />
          <Route path="/control" element={<Navigate to="/portal/login" replace />} />
          <Route path="/manage" element={<Navigate to="/portal/login" replace />} />
          
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
