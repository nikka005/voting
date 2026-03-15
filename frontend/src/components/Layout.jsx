import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { 
  Crown, 
  Menu, 
  X, 
  Trophy, 
  Users, 
  Home, 
  User,
  LogOut,
  LayoutDashboard,
  Settings
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
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group" data-testid="logo-link">
            <Crown className="w-7 h-7 text-gold transition-transform group-hover:scale-110" />
            <span className="font-serif text-xl md:text-2xl tracking-tight text-white">
              Lumina
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                data-testid={`nav-${link.label.toLowerCase()}`}
                className={`text-sm font-medium tracking-wide transition-colors ${
                  isActive(link.href)
                    ? 'text-gold'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                {isAdmin ? (
                  <Link to="/admin">
                    <Button variant="ghost" size="sm" data-testid="admin-dashboard-btn" className="text-white/70 hover:text-white">
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      Admin
                    </Button>
                  </Link>
                ) : (
                  <Link to="/dashboard">
                    <Button variant="ghost" size="sm" data-testid="contestant-dashboard-btn" className="text-white/70 hover:text-white">
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
                  className="border-white/20 text-white/70 hover:text-white hover:border-white/40"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm" data-testid="login-btn" className="text-white/70 hover:text-white">
                    Login
                  </Button>
                </Link>
                <Link to="/register">
                  <Button 
                    size="sm" 
                    data-testid="register-btn"
                    className="bg-gold hover:bg-gold-light text-black font-semibold rounded-full px-6"
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
            className="md:hidden p-2 text-white/70 hover:text-white"
            data-testid="mobile-menu-btn"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden glass border-t border-white/5 animate-fade-in">
          <div className="px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-sm transition-colors ${
                  isActive(link.href)
                    ? 'bg-gold/10 text-gold'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <link.icon className="w-5 h-5" />
                {link.label}
              </Link>
            ))}
            <div className="border-t border-white/10 pt-3 space-y-2">
              {user ? (
                <>
                  <Link
                    to={isAdmin ? '/admin' : '/dashboard'}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-white/70 hover:bg-white/5 hover:text-white rounded-sm"
                  >
                    {isAdmin ? <Settings className="w-5 h-5" /> : <User className="w-5 h-5" />}
                    {isAdmin ? 'Admin Panel' : 'My Dashboard'}
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 px-4 py-3 text-white/70 hover:bg-white/5 hover:text-white rounded-sm w-full"
                  >
                    <LogOut className="w-5 h-5" />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-white/70 hover:bg-white/5 hover:text-white rounded-sm"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-3 bg-gold text-black font-semibold text-center rounded-full"
                  >
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
    <footer className="border-t border-white/5 bg-black/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <Crown className="w-6 h-6 text-gold" />
              <span className="font-serif text-xl text-white">Lumina</span>
            </Link>
            <p className="text-white/50 text-sm max-w-sm">
              The premier platform for beauty contests and talent competitions. 
              Join thousands of contestants and voters worldwide.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-serif text-lg text-white mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li><Link to="/contestants" className="text-white/50 hover:text-gold text-sm transition-colors">Contestants</Link></li>
              <li><Link to="/leaderboard" className="text-white/50 hover:text-gold text-sm transition-colors">Leaderboard</Link></li>
              <li><Link to="/register" className="text-white/50 hover:text-gold text-sm transition-colors">Join Contest</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-serif text-lg text-white mb-4">Contact</h4>
            <ul className="space-y-2 text-white/50 text-sm">
              <li>info@lumina-contest.com</li>
              <li>Support 24/7</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 mt-8 pt-8 text-center text-white/30 text-sm">
          © {new Date().getFullYear()} Lumina Contest Platform. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export const Layout = ({ children, hideFooter = false }) => {
  return (
    <div className="min-h-screen bg-[#050505] noise-bg">
      <Header />
      <main className="pt-16 md:pt-20 relative z-10">
        {children}
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
};

export default Layout;
