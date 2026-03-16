import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { 
  Star, 
  Menu, 
  X, 
  Trophy, 
  Users, 
  Home, 
  User,
  LogOut,
  LayoutDashboard,
  Settings,
  ExternalLink
} from 'lucide-react';

// ===== PUBLIC HEADER (Voting Site - glowingstar.vote) =====
// This is the public voting domain - NO "Join Contest" button
const PublicHeader = () => {
  const { user, isAdmin } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/contestants', label: 'Contestants', icon: Users },
    { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-1.5 sm:gap-2 group" data-testid="logo-link">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25 transition-transform group-hover:scale-110">
              <Star className="w-4 h-4 sm:w-5 sm:h-5 text-white fill-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-syne text-lg sm:text-xl md:text-2xl font-bold gradient-text-gold leading-tight">
                Glowing Star
              </span>
              <span className="text-[8px] sm:text-[10px] text-slate-400 font-medium tracking-wide hidden sm:block">glowingstar.vote</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                data-testid={`nav-${link.label.toLowerCase()}`}
                className={`text-sm font-semibold tracking-wide transition-colors ${
                  isActive(link.href)
                    ? 'text-amber-600'
                    : 'text-slate-600 hover:text-amber-500'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right Side - No login links on public voting site */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/contestants">
              <Button className="btn-gradient btn-jelly">
                <Heart className="w-4 h-4 mr-2" />
                Vote Now
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-600 hover:text-amber-600"
            data-testid="mobile-menu-btn"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 shadow-lg animate-fade-in-up">
          <div className="px-3 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                  isActive(link.href)
                    ? 'bg-amber-50 text-amber-600'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <link.icon className="w-5 h-5" />
                {link.label}
              </Link>
            ))}
            <div className="border-t border-slate-100 pt-2 mt-2">
              {user ? (
                <Link
                  to={isAdmin ? '/portal/admin' : '/portal/dashboard'}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 text-amber-600 hover:bg-amber-50 rounded-xl"
                >
                  <LayoutDashboard className="w-5 h-5" />
                  {isAdmin ? 'Admin Panel' : 'My Dashboard'}
                </Link>
              ) : (
                <a
                  href="https://glowingstar.net/portal/login"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-slate-50 rounded-xl"
                >
                  <ExternalLink className="w-4 h-4" />
                  Contestant Login
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

// ===== MANAGEMENT HEADER (Dashboard/Admin - glowingstar.net) =====
const ManagementHeader = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 flex items-center justify-center">
              <Star className="w-4 h-4 text-white fill-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-syne text-base sm:text-lg font-bold gradient-text-gold leading-tight">
                Glowing Star
              </span>
              <span className="text-[8px] text-slate-400 hidden sm:block">glowingstar.net</span>
            </div>
            <span className="px-2 py-0.5 text-[10px] sm:text-xs font-bold bg-slate-100 text-slate-600 rounded-full ml-1">
              {isAdmin ? 'Admin' : 'Dashboard'}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden sm:flex items-center gap-4">
            <a href="https://glowingstar.vote" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-500 hover:text-amber-600 transition-colors flex items-center gap-1">
              <ExternalLink className="w-3 h-3" />
              View Voting Site
            </a>
            
            {user && (
              <div className="flex items-center gap-3">
                <div className="text-right hidden md:block">
                  <p className="text-sm font-medium text-slate-900 truncate max-w-[150px]">{user.full_name}</p>
                  <p className="text-xs text-slate-500 truncate max-w-[150px]">{user.email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-slate-500 hover:text-red-500"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden p-2 text-slate-600"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="sm:hidden py-3 border-t border-slate-100">
            <a href="https://glowingstar.vote" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600">
              <ExternalLink className="w-4 h-4" />
              View Voting Site
            </a>
            {user && (
              <>
                <div className="px-3 py-2 border-t border-slate-100 mt-2">
                  <p className="text-sm font-medium text-slate-900">{user.full_name}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-red-500 w-full"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

// ===== FOOTER =====
export const Footer = () => {
  return (
    <footer className="border-t border-slate-200 bg-gradient-to-b from-white to-slate-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          {/* Brand */}
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-3 sm:mb-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 flex items-center justify-center">
                <Star className="w-4 h-4 sm:w-5 sm:h-5 text-white fill-white" />
              </div>
              <span className="font-syne text-lg sm:text-xl font-bold gradient-text-gold">Glowing Star</span>
            </Link>
            <p className="text-slate-500 text-xs sm:text-sm max-w-sm">
              The world's premier beauty contest platform. Vote for your favorites and help them win!
            </p>
          </div>

          <div>
            <h4 className="font-syne font-bold text-slate-900 mb-3 sm:mb-4 text-sm sm:text-base">Voting</h4>
            <ul className="space-y-1.5 sm:space-y-2">
              <li><Link to="/contestants" className="text-slate-500 hover:text-amber-500 text-xs sm:text-sm transition-colors">Browse Contestants</Link></li>
              <li><Link to="/leaderboard" className="text-slate-500 hover:text-amber-500 text-xs sm:text-sm transition-colors">Leaderboard</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-syne font-bold text-slate-900 mb-3 sm:mb-4 text-sm sm:text-base">Contestants</h4>
            <ul className="space-y-1.5 sm:space-y-2">
              <li><a href="https://glowingstar.net/portal/register" className="text-slate-500 hover:text-amber-500 text-xs sm:text-sm transition-colors">Join Contest</a></li>
              <li><a href="https://glowingstar.net/portal/login" className="text-slate-500 hover:text-amber-500 text-xs sm:text-sm transition-colors">Sign In</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-200 mt-6 sm:mt-8 pt-6 sm:pt-8 text-center text-slate-400 text-xs sm:text-sm">
          © {new Date().getFullYear()} Glowing Star Contest Platform. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

// ===== MAIN LAYOUT =====
export const Layout = ({ children, hideFooter = false, isManagement = false }) => {
  const location = useLocation();
  
  // Determine if we're in management area (includes /portal paths)
  const isManagementArea = isManagement || 
    location.pathname.startsWith('/portal') ||
    location.pathname.startsWith('/dashboard') || 
    location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen bg-slate-50 orb-bg">
      {isManagementArea ? <ManagementHeader /> : <PublicHeader />}
      <main className={`${isManagementArea ? 'pt-14 sm:pt-16' : 'pt-14 sm:pt-16 md:pt-20'} relative z-10`}>
        {children}
      </main>
      {!hideFooter && !isManagementArea && <Footer />}
    </div>
  );
};

export default Layout;
