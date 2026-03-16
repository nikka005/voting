import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { 
  Sparkles, Shield, Users, BarChart3, Heart, Settings,
  ChevronRight, ArrowRight, Crown, LogOut, ExternalLink,
  Zap, Award, Globe, Lock
} from 'lucide-react';

export default function PortalHome() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/portal/login');
  };

  // Redirect based on role
  const getDashboardLink = () => {
    if (user?.role === 'admin') return '/portal/admin';
    return '/portal/dashboard';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-syne font-bold text-white">Glowing Star</h1>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/20">
                  MANAGEMENT PORTAL
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <a href="/" target="_blank" rel="noopener noreferrer" className="hidden md:flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                <Globe className="w-4 h-4" />
                <span className="text-sm">View Voting Site</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <div className="flex items-center gap-3 pl-4 border-l border-white/10">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-white">{user?.full_name}</p>
                  <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-5xl mx-auto px-4 py-16">
        {/* Welcome Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 mb-6">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-semibold text-green-400">Logged in as {user?.role}</span>
          </div>
          <h1 className="font-syne text-4xl md:text-5xl font-bold text-white mb-4">
            Welcome back, {user?.full_name?.split(' ')[0]}!
          </h1>
          <p className="text-lg text-slate-400 max-w-xl mx-auto">
            {user?.role === 'admin' 
              ? 'Manage your contest platform from the Admin Panel'
              : 'Manage your contestant profile and track your votes'
            }
          </p>
        </div>

        {/* Quick Access Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Main Dashboard Card */}
          <Link to={getDashboardLink()} className="group">
            <div className="relative p-8 rounded-3xl bg-gradient-to-br from-pink-500/10 to-violet-500/10 border border-pink-500/20 hover:border-pink-500/40 transition-all overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-pink-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center mb-6 shadow-lg shadow-pink-500/30">
                  {user?.role === 'admin' ? <Shield className="w-7 h-7 text-white" /> : <BarChart3 className="w-7 h-7 text-white" />}
                </div>
                <h2 className="font-syne text-2xl font-bold text-white mb-2">
                  {user?.role === 'admin' ? 'Admin Panel' : 'My Dashboard'}
                </h2>
                <p className="text-slate-400 mb-6">
                  {user?.role === 'admin' 
                    ? 'Manage contestants, voting, rounds, and analytics'
                    : 'View your stats, update profile, and share your voting link'
                  }
                </p>
                <div className="flex items-center gap-2 text-pink-400 font-semibold group-hover:gap-4 transition-all">
                  Open Dashboard <ArrowRight className="w-5 h-5" />
                </div>
              </div>
            </div>
          </Link>

          {/* Secondary Card */}
          <a href="https://glowingstar.vote" target="_blank" rel="noopener noreferrer" className="group">
            <div className="relative p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-white/20 transition-all overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mb-6 shadow-lg shadow-cyan-500/30">
                  <Globe className="w-7 h-7 text-white" />
                </div>
                <h2 className="font-syne text-2xl font-bold text-white mb-2">
                  Public Voting Site
                </h2>
                <p className="text-slate-400 mb-6">
                  Visit the public voting website where visitors browse contestants and vote
                </p>
                <div className="flex items-center gap-2 text-cyan-400 font-semibold group-hover:gap-4 transition-all">
                  Open Voting Site <ExternalLink className="w-4 h-4" />
                </div>
              </div>
            </div>
          </a>
        </div>

        {/* Quick Stats for Contestants */}
        {user?.role === 'contestant' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {[
              { icon: Heart, label: 'Total Votes', value: '—', color: 'pink' },
              { icon: Crown, label: 'Current Rank', value: '—', color: 'amber' },
              { icon: Zap, label: 'Today', value: '—', color: 'cyan' },
              { icon: Award, label: 'Status', value: 'Active', color: 'green' },
            ].map((stat, idx) => (
              <div key={idx} className={`p-4 rounded-2xl bg-${stat.color}-500/10 border border-${stat.color}-500/20`}>
                <stat.icon className={`w-5 h-5 text-${stat.color}-400 mb-2`} />
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-slate-400">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Quick Links */}
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
          <h3 className="font-semibold text-white mb-4">Quick Links</h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {user?.role === 'admin' ? (
              <>
                <QuickLink icon={Users} label="Manage Contestants" href="/portal/admin" />
                <QuickLink icon={BarChart3} label="View Analytics" href="/portal/admin" />
                <QuickLink icon={Settings} label="Platform Settings" href="/portal/admin" />
                <QuickLink icon={Shield} label="Security Logs" href="/portal/admin" />
                <QuickLink icon={Heart} label="Vote Management" href="/portal/admin" />
                <QuickLink icon={Crown} label="Round Management" href="/portal/admin" />
              </>
            ) : (
              <>
                <QuickLink icon={BarChart3} label="My Stats" href="/portal/dashboard" />
                <QuickLink icon={Users} label="Edit Profile" href="/portal/dashboard" />
                <QuickLink icon={Heart} label="Get Votes" href="/portal/dashboard" />
                <QuickLink icon={Crown} label="Leaderboard" href="/leaderboard" external />
                <QuickLink icon={Globe} label="My Voting Page" href="/" external />
                <QuickLink icon={Settings} label="Settings" href="/portal/dashboard" />
              </>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-6">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
            <p>Glowing Star Contest © 2026</p>
            <div className="flex items-center gap-4">
              <a href="/" className="hover:text-amber-400 transition-colors">Voting Site</a>
              <a href="/leaderboard" className="hover:text-amber-400 transition-colors">Leaderboard</a>
              <a href="/contestants" className="hover:text-amber-400 transition-colors">Contestants</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function QuickLink({ icon: Icon, label, href, external }) {
  const Component = external ? 'a' : Link;
  const props = external ? { href, target: '_blank', rel: 'noopener noreferrer' } : { to: href };
  
  return (
    <Component {...props} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group">
      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-pink-500/20">
        <Icon className="w-4 h-4 text-slate-400 group-hover:text-pink-400" />
      </div>
      <span className="text-slate-300 group-hover:text-white">{label}</span>
      {external && <ExternalLink className="w-3 h-3 text-slate-500 ml-auto" />}
    </Component>
  );
}
