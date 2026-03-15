import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { 
  Sparkles, 
  Menu, 
  X, 
  Trophy, 
  Users, 
  Home, 
  User,
  LogOut,
  LayoutDashboard
} from 'lucide-react';

export const Header = () => {
  const { user, logout, isAdmin } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navLinks = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/contestants', label: 'Contestants', icon: Users },
    { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-xl border-b border-slate-200/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group" data-testid="logo-link">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center shadow-pink transition-transform group-hover:scale-110">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-syne text-xl md:text-2xl font-bold gradient-text-pink">
              Glamour
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                data-testid={`nav-${link.label.toLowerCase()}`}
                className={`text-sm font-semibold tracking-wide transition-colors ${
                  isActive(link.href)
                    ? 'text-pink-600'
                    : 'text-slate-600 hover:text-pink-500'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                {isAdmin ? (
                  <Link to="/admin">
                    <Button variant="ghost" size="sm" data-testid="admin-dashboard-btn" className="text-slate-600 hover:text-pink-600 hover:bg-pink-50">
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      Admin
                    </Button>
                  </Link>
                ) : (
                  <Link to="/dashboard">
                    <Button variant="ghost" size="sm" data-testid="contestant-dashboard-btn" className="text-slate-600 hover:text-pink-600 hover:bg-pink-50">
                      <User className="w-4 h-4 mr-2" />
                      Dashboard
                    </Button>
                  </Link>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  data-testid="logout-btn"
                  className="border-slate-200 text-slate-600 hover:text-pink-600 hover:border-pink-300"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm" data-testid="login-btn" className="text-slate-600 hover:text-pink-600">
                    Login
                  </Button>
                </Link>
                <Link to="/register">
                  <Button 
                    size="sm" 
                    data-testid="register-btn"
                    className="btn-gradient px-6 btn-jelly"
                  >
                    Join Contest
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-600 hover:text-pink-600"
            data-testid="mobile-menu-btn"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-xl border-t border-slate-100 animate-fade-in-up">
          <div className="px-4 py-4 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors ${
                  isActive(link.href)
                    ? 'bg-pink-50 text-pink-600'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <link.icon className="w-5 h-5" />
                {link.label}
              </Link>
            ))}
            <div className="border-t border-slate-100 pt-3 space-y-2">
              {user ? (
                <>
                  <Link
                    to={isAdmin ? '/admin' : '/dashboard'}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-2xl"
                  >
                    {isAdmin ? <LayoutDashboard className="w-5 h-5" /> : <User className="w-5 h-5" />}
                    {isAdmin ? 'Admin Panel' : 'My Dashboard'}
                  </Link>
                  <button
                    onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                    className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-2xl w-full"
                  >
                    <LogOut className="w-5 h-5" />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-2xl">
                    Login
                  </Link>
                  <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-3 btn-gradient text-center rounded-full font-bold">
                    Join Contest
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export const Footer = () => {
  return (
    <footer className="border-t border-slate-200 bg-gradient-to-b from-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-syne text-xl font-bold gradient-text-pink">Glamour</span>
            </Link>
            <p className="text-slate-500 text-sm max-w-sm">
              The world's most exciting beauty contest platform. Vote for your favorites and help them shine!
            </p>
          </div>

          <div>
            <h4 className="font-syne font-bold text-slate-900 mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li><Link to="/contestants" className="text-slate-500 hover:text-pink-500 text-sm transition-colors">Contestants</Link></li>
              <li><Link to="/leaderboard" className="text-slate-500 hover:text-pink-500 text-sm transition-colors">Leaderboard</Link></li>
              <li><Link to="/register" className="text-slate-500 hover:text-pink-500 text-sm transition-colors">Join Contest</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-syne font-bold text-slate-900 mb-4">Contact</h4>
            <ul className="space-y-2 text-slate-500 text-sm">
              <li>hello@glamour.vote</li>
              <li>Support 24/7</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-200 mt-8 pt-8 text-center text-slate-400 text-sm">
          © {new Date().getFullYear()} Glamour Contest Platform. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export const Layout = ({ children, hideFooter = false }) => {
  return (
    <div className="min-h-screen bg-slate-50 orb-bg">
      <Header />
      <main className="pt-16 md:pt-20 relative z-10">
        {children}
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
};

export default Layout;
