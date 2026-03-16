import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Switch } from '../../components/ui/switch';
import { adminAPI, contestantsAPI, categoriesAPI, roundsAPI } from '../../lib/api';
import { formatNumber, formatDate } from '../../lib/utils';
import { useVoteUpdates } from '../../hooks/useWebSocket';
import { toast } from 'sonner';
import {
  Users, Heart, Crown, Clock, Plus, Trash2, Check, X, Edit, Loader2, Search,
  Eye, Trophy, Sparkles, Settings, BarChart3, TrendingUp, Globe, Shield,
  Mail, Bell, Image, Download, Activity, AlertTriangle, UserCheck, UserX,
  Calendar, ChevronRight, RefreshCw, Zap, Lock, FileText, Database,
  Monitor, Smartphone, MapPin, ChevronDown, MoreHorizontal, Filter,
  ArrowUpRight, ArrowDownRight, Play, Pause, Ban, CheckCircle2, XCircle,
  Award, Star, Layers, PieChart, LineChart, Target, Flag, AlertCircle, Megaphone,
  HelpCircle, BookOpen, Rocket, Gift, MousePointer, Share2, QrCode, BarChart
} from 'lucide-react';

// ============ ADMIN PANEL - PREMIUM CONTEST PLATFORM ============
// Dark Luxury Web3 Design with Glassmorphism & Neon Accents

export default function AdminPanel() {
  const { isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  
  // Real-time WebSocket updates
  const { lastVoteUpdate, isConnected } = useVoteUpdates();
  
  // Core Data States
  const [stats, setStats] = useState(null);
  const [contestants, setContestants] = useState([]);
  const [categories, setCategories] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [votes, setVotes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // UI States
  const [activeSection, setActiveSection] = useState('dashboard');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [roundModalOpen, setRoundModalOpen] = useState(false);
  const [contestantModalOpen, setContestantModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingRound, setEditingRound] = useState(null);
  const [selectedContestant, setSelectedContestant] = useState(null);
  
  // Form States
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', is_active: true });
  const [roundForm, setRoundForm] = useState({ 
    name: '', description: '', max_contestants: '', 
    start_date: '', end_date: '', is_active: false 
  });

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      const [statsRes, categoriesRes, roundsRes, votesRes] = await Promise.all([
        adminAPI.getStats(),
        categoriesAPI.getAll(),
        roundsAPI.getAll(),
        adminAPI.getVotes({ limit: 50 }),
      ]);
      setStats(statsRes.data);
      setCategories(categoriesRes.data);
      setRounds(roundsRes.data);
      setVotes(votesRes.data);
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchContestants = useCallback(async () => {
    try {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;
      const response = await contestantsAPI.getAll(params);
      setContestants(response.data);
    } catch (error) {
      console.error('Failed to fetch contestants:', error);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return; }
    fetchData();
  }, [isAdmin, navigate, fetchData]);

  useEffect(() => {
    if (isAdmin) fetchContestants();
  }, [isAdmin, statusFilter, searchQuery, fetchContestants]);

  // Handle real-time vote updates
  useEffect(() => {
    if (lastVoteUpdate) {
      // Update stats
      setStats(prev => prev ? {
        ...prev,
        total_votes: (prev.total_votes || 0) + 1
      } : prev);
      
      // Update contestants vote count
      setContestants(prev => prev.map(c => 
        c.id === lastVoteUpdate.contestant_id 
          ? { ...c, vote_count: lastVoteUpdate.vote_count }
          : c
      ));
      
      // Add to recent votes
      setVotes(prev => [{
        id: `live-${Date.now()}`,
        contestant_id: lastVoteUpdate.contestant_id,
        contestant_name: lastVoteUpdate.contestant_name,
        email: 'Live vote',
        type: lastVoteUpdate.vote_type || 'free',
        timestamp: new Date().toISOString()
      }, ...prev.slice(0, 49)]);
    }
  }, [lastVoteUpdate]);

  // Category handlers
  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await categoriesAPI.update(editingCategory.id, categoryForm);
        toast.success('Category updated successfully');
      } else {
        await categoriesAPI.create(categoryForm);
        toast.success('Category created successfully');
      }
      setCategoryModalOpen(false);
      setCategoryForm({ name: '', description: '', is_active: true });
      setEditingCategory(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to save category');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Delete this category? This action cannot be undone.')) return;
    try {
      await categoriesAPI.delete(id);
      toast.success('Category deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete category');
    }
  };

  // Round handlers
  const handleRoundSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { 
        ...roundForm, 
        max_contestants: roundForm.max_contestants ? parseInt(roundForm.max_contestants) : null 
      };
      if (editingRound) {
        await roundsAPI.update(editingRound.id, data);
        toast.success('Round updated successfully');
      } else {
        await roundsAPI.create(data);
        toast.success('Round created successfully');
      }
      setRoundModalOpen(false);
      setRoundForm({ name: '', description: '', max_contestants: '', start_date: '', end_date: '', is_active: false });
      setEditingRound(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to save round');
    }
  };

  const handleActivateRound = async (id) => {
    try {
      await roundsAPI.activate(id);
      toast.success('Round activated');
      fetchData();
    } catch (error) {
      toast.error('Failed to activate round');
    }
  };

  // Contestant handlers
  const handleStatusChange = async (contestantId, newStatus) => {
    try {
      await adminAPI.updateContestantStatus(contestantId, newStatus);
      toast.success(`Contestant ${newStatus}`);
      fetchContestants();
      fetchData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleAssignRound = async (contestantId, roundName) => {
    try {
      await adminAPI.assignContestantRound(contestantId, roundName);
      toast.success('Round assigned successfully');
      fetchContestants();
    } catch (error) {
      toast.error('Failed to assign round');
    }
  };

  const handleDeleteContestant = async (id) => {
    if (!window.confirm('Delete this contestant permanently? All votes will also be removed.')) return;
    try {
      await adminAPI.deleteContestant(id);
      toast.success('Contestant deleted');
      fetchContestants();
      fetchData();
    } catch (error) {
      toast.error('Failed to delete contestant');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center animate-pulse">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <Loader2 className="w-8 h-8 text-pink-500 animate-spin mx-auto" />
          <p className="text-slate-400 mt-4">Loading Admin Panel...</p>
        </div>
      </div>
    );
  }

  // Navigation items
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'guide', label: 'How It Works', icon: HelpCircle },
    { id: 'contests', label: 'Contests', icon: Trophy },
    { id: 'contestants', label: 'Contestants', icon: Users },
    { id: 'banners', label: 'Promotions', icon: Megaphone },
    { id: 'voting', label: 'Voting', icon: Heart },
    { id: 'leaderboard', label: 'Leaderboard', icon: Award },
    { id: 'media', label: 'Media', icon: Image },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* ============ SIDEBAR ============ */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#0f0f15]/80 backdrop-blur-xl border-r border-white/5 z-50" data-testid="admin-sidebar">
        {/* Logo */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-syne font-bold text-lg">Glowing Star</h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/20">
                ADMIN
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              data-testid={`nav-${item.id}`}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeSection === item.id
                  ? 'bg-gradient-to-r from-pink-500/20 to-violet-500/20 text-white border border-pink-500/20 shadow-lg shadow-pink-500/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon className={`w-5 h-5 ${activeSection === item.id ? 'text-pink-400' : ''}`} />
              {item.label}
              {item.id === 'contestants' && stats?.pending_approvals > 0 && (
                <span className="ml-auto px-2 py-0.5 text-xs font-bold bg-pink-500 text-white rounded-full">
                  {stats.pending_approvals}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* System Status */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/5">
          <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-medium text-green-400">System Online</span>
            </div>
          </div>
          <button
            onClick={() => { logout(); navigate('/'); }}
            className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <X className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* ============ MAIN CONTENT ============ */}
      <main className="ml-64 min-h-screen">
        {/* Top Header */}
        <header className="sticky top-0 z-40 px-6 py-4 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-syne text-xl font-bold capitalize">{activeSection}</h2>
              <p className="text-sm text-slate-500">Manage your contest platform</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => fetchData()}
                variant="outline"
                size="sm"
                className="bg-white/5 border-white/10 text-white hover:bg-white/10"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <a href="https://glowingstar.vote" target="_blank" rel="noopener noreferrer">
                <Button size="sm" className="bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-600 hover:to-violet-700">
                  <Globe className="w-4 h-4 mr-2" />
                  View Site
                </Button>
              </a>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-6">
          {/* ============ DASHBOARD SECTION ============ */}
          {activeSection === 'dashboard' && (
            <DashboardSection 
              stats={stats} 
              contestants={contestants} 
              votes={votes}
              rounds={rounds}
            />
          )}

          {/* ============ HOW IT WORKS / GUIDE SECTION ============ */}
          {activeSection === 'guide' && (
            <AdminGuideSection />
          )}

          {/* ============ CONTESTS SECTION ============ */}
          {activeSection === 'contests' && (
            <ContestsSection
              categories={categories}
              rounds={rounds}
              categoryForm={categoryForm}
              setCategoryForm={setCategoryForm}
              roundForm={roundForm}
              setRoundForm={setRoundForm}
              categoryModalOpen={categoryModalOpen}
              setCategoryModalOpen={setCategoryModalOpen}
              roundModalOpen={roundModalOpen}
              setRoundModalOpen={setRoundModalOpen}
              editingCategory={editingCategory}
              setEditingCategory={setEditingCategory}
              editingRound={editingRound}
              setEditingRound={setEditingRound}
              handleCategorySubmit={handleCategorySubmit}
              handleDeleteCategory={handleDeleteCategory}
              handleRoundSubmit={handleRoundSubmit}
              handleActivateRound={handleActivateRound}
            />
          )}

          {/* ============ CONTESTANTS SECTION ============ */}
          {activeSection === 'contestants' && (
            <ContestantsSection
              contestants={contestants}
              categories={categories}
              rounds={rounds}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              handleStatusChange={handleStatusChange}
              handleAssignRound={handleAssignRound}
              handleDeleteContestant={handleDeleteContestant}
              selectedContestant={selectedContestant}
              setSelectedContestant={setSelectedContestant}
              contestantModalOpen={contestantModalOpen}
              setContestantModalOpen={setContestantModalOpen}
            />
          )}

          {/* ============ VOTING SECTION ============ */}
          {activeSection === 'voting' && (
            <VotingSection votes={votes} contestants={contestants} />
          )}

          {/* ============ BANNERS/PROMOTIONS SECTION ============ */}
          {activeSection === 'banners' && (
            <BannersSection />
          )}

          {/* ============ LEADERBOARD SECTION ============ */}
          {activeSection === 'leaderboard' && (
            <LeaderboardSection contestants={contestants} categories={categories} rounds={rounds} />
          )}

          {/* ============ MEDIA SECTION ============ */}
          {activeSection === 'media' && (
            <MediaSection contestants={contestants} />
          )}

          {/* ============ SECURITY SECTION ============ */}
          {activeSection === 'security' && (
            <SecuritySection votes={votes} />
          )}

          {/* ============ REPORTS SECTION ============ */}
          {activeSection === 'reports' && (
            <ReportsSection stats={stats} contestants={contestants} votes={votes} />
          )}

          {/* ============ SETTINGS SECTION ============ */}
          {activeSection === 'settings' && (
            <SettingsSection />
          )}
        </div>
      </main>
    </div>
  );
}

// ============ ADMIN GUIDE / HOW IT WORKS SECTION ============
function AdminGuideSection() {
  const [activeGuide, setActiveGuide] = useState('overview');

  const guideItems = [
    { id: 'overview', label: 'Platform Overview', icon: Rocket },
    { id: 'contestants', label: 'Managing Contestants', icon: Users },
    { id: 'voting', label: 'Voting System', icon: Heart },
    { id: 'rounds', label: 'Contest Rounds', icon: Trophy },
    { id: 'promotions', label: 'Promotions & Banners', icon: Megaphone },
    { id: 'security', label: 'Security & Fraud', icon: Shield },
    { id: 'prizes', label: 'Prize Distribution', icon: Gift },
  ];

  return (
    <div className="space-y-6" data-testid="guide-section">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-amber-400" />
            Admin Guide - How It Works
          </h3>
          <p className="text-slate-400 mt-1">Complete guide to managing your Glowing Star contest platform</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Guide Navigation */}
        <div className="lg:col-span-1">
          <div className="bg-white/5 rounded-2xl border border-white/10 p-4 sticky top-6">
            <h4 className="font-semibold text-sm text-slate-400 mb-3 px-2">GUIDE SECTIONS</h4>
            <nav className="space-y-1">
              {guideItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveGuide(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                    activeGuide === item.id
                      ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Guide Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Platform Overview */}
          {activeGuide === 'overview' && (
            <div className="space-y-6">
              <GlassCard title="Platform Overview" icon={Rocket}>
                <div className="space-y-6">
                  <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                    <h4 className="font-semibold text-amber-400 mb-2">🌟 Welcome to Glowing Star Admin</h4>
                    <p className="text-slate-300 text-sm">
                      Glowing Star is a premium online beauty contest platform with two main websites:
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h5 className="font-semibold">glowingstar.net</h5>
                          <p className="text-xs text-slate-500">User Site</p>
                        </div>
                      </div>
                      <ul className="text-sm text-slate-400 space-y-2">
                        <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-400 mt-0.5" /> Contestants register & join contest</li>
                        <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-400 mt-0.5" /> Manage profile & upload photos</li>
                        <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-400 mt-0.5" /> View stats & share voting link</li>
                        <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-400 mt-0.5" /> Admin dashboard access</li>
                      </ul>
                    </div>

                    <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center">
                          <Heart className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h5 className="font-semibold">glowingstar.vote</h5>
                          <p className="text-xs text-slate-500">Public Voting Site</p>
                        </div>
                      </div>
                      <ul className="text-sm text-slate-400 space-y-2">
                        <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-400 mt-0.5" /> Public can browse contestants</li>
                        <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-400 mt-0.5" /> Vote for favorite contestants</li>
                        <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-400 mt-0.5" /> View live leaderboard</li>
                        <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-400 mt-0.5" /> Purchase vote packages</li>
                      </ul>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <h5 className="font-semibold text-blue-400 mb-2">📊 Contest Flow</h5>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="px-3 py-1 rounded-full bg-white/10">1. Registration Opens</span>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                      <span className="px-3 py-1 rounded-full bg-white/10">2. Contestants Join</span>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                      <span className="px-3 py-1 rounded-full bg-white/10">3. Admin Approves</span>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                      <span className="px-3 py-1 rounded-full bg-white/10">4. Voting Starts</span>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                      <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400">5. Winners Announced</span>
                    </div>
                  </div>
                </div>
              </GlassCard>

              <GlassCard title="Quick Start Checklist" icon={CheckCircle2}>
                <div className="space-y-3">
                  {[
                    { step: 1, title: 'Configure Contest Settings', desc: 'Set prize pool, rules, and timeline in Settings', done: true },
                    { step: 2, title: 'Create Contest Rounds', desc: 'Set up competition rounds (Top 100, Top 50, Finals)', done: false },
                    { step: 3, title: 'Review & Approve Contestants', desc: 'Check registrations and approve valid contestants', done: false },
                    { step: 4, title: 'Create Promotional Banners', desc: 'Add popup banners to attract more participants', done: false },
                    { step: 5, title: 'Monitor Voting Activity', desc: 'Watch for fraud and track vote statistics', done: false },
                    { step: 6, title: 'Announce Winners', desc: 'Complete rounds and distribute prizes', done: false },
                  ].map((item) => (
                    <div key={item.step} className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/10">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        item.done ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-slate-400'
                      }`}>
                        {item.done ? <Check className="w-4 h-4" /> : item.step}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{item.title}</p>
                        <p className="text-xs text-slate-500">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          )}

          {/* Managing Contestants */}
          {activeGuide === 'contestants' && (
            <div className="space-y-6">
              <GlassCard title="Managing Contestants" icon={Users}>
                <div className="space-y-6">
                  <p className="text-slate-300">
                    The Contestants section allows you to review, approve, and manage all participants in your contest.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-center">
                      <Clock className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                      <h5 className="font-semibold text-yellow-400">Pending</h5>
                      <p className="text-xs text-slate-400 mt-1">New registrations awaiting review</p>
                    </div>
                    <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
                      <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                      <h5 className="font-semibold text-green-400">Approved</h5>
                      <p className="text-xs text-slate-400 mt-1">Active contestants in the contest</p>
                    </div>
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                      <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                      <h5 className="font-semibold text-red-400">Rejected</h5>
                      <p className="text-xs text-slate-400 mt-1">Contestants not meeting criteria</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <h5 className="font-semibold mb-3 flex items-center gap-2">
                      <MousePointer className="w-4 h-4 text-pink-400" />
                      How to Approve/Reject Contestants
                    </h5>
                    <ol className="text-sm text-slate-400 space-y-2 list-decimal list-inside">
                      <li>Go to <strong className="text-white">Contestants</strong> section</li>
                      <li>Filter by <strong className="text-yellow-400">Pending</strong> status</li>
                      <li>Review contestant profile, photos, and bio</li>
                      <li>Click <strong className="text-green-400">✓ Approve</strong> or <strong className="text-red-400">✗ Reject</strong></li>
                      <li>Approved contestants appear on the voting site</li>
                    </ol>
                  </div>

                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <h5 className="font-semibold text-amber-400 mb-2">⚠️ Review Criteria</h5>
                    <ul className="text-sm text-slate-300 space-y-1">
                      <li>• Clear, appropriate photos (no explicit content)</li>
                      <li>• Complete profile information</li>
                      <li>• Valid email address</li>
                      <li>• Meets age requirement (18+)</li>
                    </ul>
                  </div>
                </div>
              </GlassCard>
            </div>
          )}

          {/* Voting System */}
          {activeGuide === 'voting' && (
            <div className="space-y-6">
              <GlassCard title="Voting System" icon={Heart}>
                <div className="space-y-6">
                  <p className="text-slate-300">
                    Understand how the voting system works and monitor vote activity.
                  </p>

                  <div className="p-4 rounded-xl bg-gradient-to-r from-pink-500/10 to-violet-500/10 border border-pink-500/20">
                    <h5 className="font-semibold text-pink-400 mb-3">Voting Rules</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-start gap-3">
                        <Mail className="w-5 h-5 text-pink-400 mt-0.5" />
                        <div>
                          <p className="font-medium">Email Verification</p>
                          <p className="text-slate-400">All votes require OTP email verification</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Clock className="w-5 h-5 text-pink-400 mt-0.5" />
                        <div>
                          <p className="font-medium">24-Hour Limit</p>
                          <p className="text-slate-400">1 free vote per email every 24 hours</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Gift className="w-5 h-5 text-pink-400 mt-0.5" />
                        <div>
                          <p className="font-medium">Paid Votes</p>
                          <p className="text-slate-400">Users can purchase vote packages via Stripe</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-pink-400 mt-0.5" />
                        <div>
                          <p className="font-medium">Fraud Detection</p>
                          <p className="text-slate-400">AI monitors for suspicious voting patterns</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <h5 className="font-semibold mb-3">Vote Types</h5>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                        <span className="text-sm">Free Vote</span>
                        <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">1 vote / 24hrs</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                        <span className="text-sm">Paid Vote Package</span>
                        <span className="text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-400">Multiple votes</span>
                      </div>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>
          )}

          {/* Contest Rounds */}
          {activeGuide === 'rounds' && (
            <div className="space-y-6">
              <GlassCard title="Contest Rounds" icon={Trophy}>
                <div className="space-y-6">
                  <p className="text-slate-300">
                    Manage competition rounds to create an exciting elimination-style contest.
                  </p>

                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <h5 className="font-semibold mb-4">Recommended Round Structure</h5>
                    <div className="space-y-3">
                      {[
                        { round: 'Round 1', name: 'Qualification', desc: 'All approved contestants compete', participants: '100' },
                        { round: 'Round 2', name: 'Top 50', desc: 'Top 50 advance based on votes', participants: '50' },
                        { round: 'Round 3', name: 'Top 20', desc: 'Competition intensifies', participants: '20' },
                        { round: 'Round 4', name: 'Semi-Finals', desc: 'Elite contestants battle', participants: '10' },
                        { round: 'Round 5', name: 'Grand Finale', desc: 'Top 5 compete for the crown', participants: '5' },
                      ].map((r, idx) => (
                        <div key={idx} className="flex items-center gap-4 p-3 rounded-lg bg-white/5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-sm font-bold">
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{r.name}</p>
                            <p className="text-xs text-slate-500">{r.desc}</p>
                          </div>
                          <span className="text-xs px-2 py-1 rounded-full bg-white/10">{r.participants} contestants</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <h5 className="font-semibold text-blue-400 mb-2">💡 How to Create Rounds</h5>
                    <ol className="text-sm text-slate-300 space-y-1 list-decimal list-inside">
                      <li>Go to <strong>Contests</strong> section</li>
                      <li>Click <strong>Create Round</strong></li>
                      <li>Set round name, start/end dates</li>
                      <li>Activate round when ready to start</li>
                      <li>System tracks votes for that round period</li>
                    </ol>
                  </div>
                </div>
              </GlassCard>
            </div>
          )}

          {/* Promotions & Banners */}
          {activeGuide === 'promotions' && (
            <div className="space-y-6">
              <GlassCard title="Promotions & Banners" icon={Megaphone}>
                <div className="space-y-6">
                  <p className="text-slate-300">
                    Create eye-catching popup banners to promote your contest and attract more participants.
                  </p>

                  <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-pink-500/10 border border-amber-500/20">
                    <h5 className="font-semibold text-amber-400 mb-3">Banner Features</h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-sm">
                      <div className="p-3 rounded-lg bg-white/5">
                        <Star className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                        <p>Custom Title</p>
                      </div>
                      <div className="p-3 rounded-lg bg-white/5">
                        <Layers className="w-5 h-5 text-pink-400 mx-auto mb-1" />
                        <p>6 Gradient Styles</p>
                      </div>
                      <div className="p-3 rounded-lg bg-white/5">
                        <MousePointer className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                        <p>Custom CTA Button</p>
                      </div>
                      <div className="p-3 rounded-lg bg-white/5">
                        <Eye className="w-5 h-5 text-green-400 mx-auto mb-1" />
                        <p>Active/Inactive Toggle</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <h5 className="font-semibold mb-3">How to Create a Banner</h5>
                    <ol className="text-sm text-slate-400 space-y-2 list-decimal list-inside">
                      <li>Go to <strong className="text-white">Promotions</strong> section</li>
                      <li>Click <strong className="text-pink-400">Create Banner</strong></li>
                      <li>Enter banner title and subtitle</li>
                      <li>Choose a gradient background style</li>
                      <li>Set button text and link (e.g., "/portal/register")</li>
                      <li>Toggle <strong className="text-green-400">Active</strong> to show on user site</li>
                      <li>Banner popup appears on glowingstar.net!</li>
                    </ol>
                  </div>
                </div>
              </GlassCard>
            </div>
          )}

          {/* Security & Fraud */}
          {activeGuide === 'security' && (
            <div className="space-y-6">
              <GlassCard title="Security & Fraud Detection" icon={Shield}>
                <div className="space-y-6">
                  <p className="text-slate-300">
                    The platform includes advanced security features to ensure fair voting.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                      <AlertTriangle className="w-6 h-6 text-red-400 mb-2" />
                      <h5 className="font-semibold text-red-400 mb-2">Fraud Detection</h5>
                      <ul className="text-sm text-slate-400 space-y-1">
                        <li>• IP address tracking</li>
                        <li>• Device fingerprinting</li>
                        <li>• Voting pattern analysis</li>
                        <li>• Automatic flagging</li>
                      </ul>
                    </div>
                    <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                      <Shield className="w-6 h-6 text-green-400 mb-2" />
                      <h5 className="font-semibold text-green-400 mb-2">Protection Features</h5>
                      <ul className="text-sm text-slate-400 space-y-1">
                        <li>• Email OTP verification</li>
                        <li>• Rate limiting</li>
                        <li>• CAPTCHA protection</li>
                        <li>• Admin vote blocking</li>
                      </ul>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <h5 className="font-semibold text-amber-400 mb-2">⚠️ What to Monitor</h5>
                    <ul className="text-sm text-slate-300 space-y-1">
                      <li>• Sudden vote spikes for a single contestant</li>
                      <li>• Multiple votes from same IP range</li>
                      <li>• Votes from suspicious email patterns</li>
                      <li>• Unusual voting times (bot patterns)</li>
                    </ul>
                  </div>
                </div>
              </GlassCard>
            </div>
          )}

          {/* Prize Distribution */}
          {activeGuide === 'prizes' && (
            <div className="space-y-6">
              <GlassCard title="Prize Distribution" icon={Gift}>
                <div className="space-y-6">
                  <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20">
                    <h5 className="font-semibold text-amber-400 mb-3">💰 Default Prize Pool: $35,000</h5>
                    <div className="space-y-2">
                      {[
                        { pos: '🥇 1st', title: 'Grand Winner', amount: '$15,000' },
                        { pos: '🥈 2nd', title: '1st Runner Up', amount: '$8,000' },
                        { pos: '🥉 3rd', title: '2nd Runner Up', amount: '$5,000' },
                        { pos: '4th', title: '3rd Runner Up', amount: '$4,000' },
                        { pos: '5th', title: '4th Runner Up', amount: '$3,000' },
                      ].map((p, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                          <span className="text-sm">{p.pos} - {p.title}</span>
                          <span className="font-bold text-amber-400">{p.amount}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <h5 className="font-semibold mb-3">Prize Distribution Process</h5>
                    <ol className="text-sm text-slate-400 space-y-2 list-decimal list-inside">
                      <li>Contest ends and final votes are counted</li>
                      <li>System ranks contestants by total votes</li>
                      <li>Admin verifies winner identities</li>
                      <li>Prizes distributed via bank transfer / PayPal</li>
                      <li>Winners announced on platform</li>
                    </ol>
                  </div>

                  <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <h5 className="font-semibold text-blue-400 mb-2">💡 Customize Prizes</h5>
                    <p className="text-sm text-slate-300">
                      Go to <strong>Settings</strong> → <strong>Prize Distribution</strong> to customize prize amounts and positions.
                    </p>
                  </div>
                </div>
              </GlassCard>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ DASHBOARD SECTION ============
function DashboardSection({ stats, contestants, votes, rounds }) {
  const activeRound = rounds?.find(r => r.is_active);
  const todayVotes = votes?.filter(v => {
    const voteDate = new Date(v.created_at).toDateString();
    return voteDate === new Date().toDateString();
  }).length || 0;

  const topContestants = [...(contestants || [])]
    .filter(c => c.status === 'approved')
    .sort((a, b) => b.vote_count - a.vote_count)
    .slice(0, 5);

  return (
    <div className="space-y-6" data-testid="dashboard-section">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={Users} 
          label="Total Contestants" 
          value={stats?.total_contestants || 0}
          trend="+12%"
          trendUp={true}
          gradient="from-pink-500 to-rose-500"
        />
        <StatCard 
          icon={Heart} 
          label="Total Votes" 
          value={stats?.total_votes || 0}
          trend="+23%"
          trendUp={true}
          gradient="from-violet-500 to-purple-500"
        />
        <StatCard 
          icon={Zap} 
          label="Votes Today" 
          value={todayVotes}
          trend="+8%"
          trendUp={true}
          gradient="from-cyan-500 to-blue-500"
        />
        <StatCard 
          icon={Clock} 
          label="Pending Approvals" 
          value={stats?.pending_approvals || 0}
          trend=""
          gradient="from-amber-500 to-orange-500"
          highlight={stats?.pending_approvals > 0}
        />
      </div>

      {/* Active Round Banner */}
      {activeRound && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-pink-500/10 to-violet-500/10 border border-pink-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-pink-400 font-medium">Active Round</p>
                <h3 className="text-xl font-bold">{activeRound.name}</h3>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 text-xs font-bold bg-green-500/20 text-green-400 rounded-full border border-green-500/20">
                LIVE
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions + Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <GlassCard title="Quick Actions" icon={Zap}>
            <div className="space-y-2">
              <QuickActionButton icon={UserCheck} label="Approve Pending" count={stats?.pending_approvals} color="green" />
              <QuickActionButton icon={Trophy} label="Manage Rounds" color="violet" />
              <QuickActionButton icon={Shield} label="Security Check" color="cyan" />
              <QuickActionButton icon={Download} label="Export Data" color="amber" />
            </div>
          </GlassCard>
        </div>

        {/* Top Contestants */}
        <div className="lg:col-span-2">
          <GlassCard title="Top Contestants" icon={Crown}>
            <div className="space-y-3">
              {topContestants.length > 0 ? topContestants.map((c, idx) => (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                    idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-black' :
                    idx === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-black' :
                    idx === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white' :
                    'bg-white/10 text-white'
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
                    {c.photos?.[0] ? (
                      <img src={c.photos[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Users className="w-full h-full p-2 text-slate-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{c.full_name}</p>
                    <p className="text-xs text-slate-500">{c.category_name || 'No category'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-pink-400">{formatNumber(c.vote_count)}</p>
                    <p className="text-xs text-slate-500">votes</p>
                  </div>
                </div>
              )) : (
                <p className="text-center text-slate-500 py-8">No approved contestants yet</p>
              )}
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Recent Activity */}
      <GlassCard title="Recent Votes" icon={Activity}>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {votes?.slice(0, 10).map((vote, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center">
                  <Heart className="w-4 h-4 text-pink-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">{vote.email}</p>
                  <p className="text-xs text-slate-500">Cast a vote</p>
                </div>
              </div>
              <span className="text-xs text-slate-500">{formatDate(vote.created_at)}</span>
            </div>
          ))}
          {(!votes || votes.length === 0) && (
            <p className="text-center text-slate-500 py-8">No votes recorded yet</p>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

// ============ CONTESTS SECTION ============
function ContestsSection({
  categories, rounds, categoryForm, setCategoryForm, roundForm, setRoundForm,
  categoryModalOpen, setCategoryModalOpen, roundModalOpen, setRoundModalOpen,
  editingCategory, setEditingCategory, editingRound, setEditingRound,
  handleCategorySubmit, handleDeleteCategory, handleRoundSubmit, handleActivateRound
}) {
  return (
    <div className="space-y-6" data-testid="contests-section">
      {/* Categories */}
      <GlassCard 
        title="Contest Categories" 
        icon={Layers}
        action={
          <Dialog open={categoryModalOpen} onOpenChange={setCategoryModalOpen}>
            <DialogTrigger asChild>
              <Button 
                size="sm" 
                className="bg-gradient-to-r from-pink-500 to-violet-600"
                onClick={() => { setEditingCategory(null); setCategoryForm({ name: '', description: '', is_active: true }); }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#15151f] border-white/10 text-white">
              <DialogHeader>
                <DialogTitle className="font-syne">{editingCategory ? 'Edit' : 'Create'} Category</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCategorySubmit} className="space-y-4">
                <div>
                  <Label className="text-slate-300">Category Name</Label>
                  <Input 
                    value={categoryForm.name} 
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} 
                    className="bg-white/5 border-white/10 text-white mt-1"
                    placeholder="e.g., Ms Health & Fitness"
                    required 
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Description</Label>
                  <Textarea 
                    value={categoryForm.description} 
                    onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} 
                    className="bg-white/5 border-white/10 text-white mt-1"
                    placeholder="Category description..."
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Switch 
                    checked={categoryForm.is_active} 
                    onCheckedChange={(v) => setCategoryForm({ ...categoryForm, is_active: v })} 
                  />
                  <Label className="text-slate-300">Active</Label>
                </div>
                <Button type="submit" className="w-full bg-gradient-to-r from-pink-500 to-violet-600">
                  {editingCategory ? 'Update' : 'Create'} Category
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div key={cat.id} className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-pink-500/30 transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/20 to-violet-500/20 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-pink-400" />
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8 text-slate-400 hover:text-white"
                    onClick={() => { 
                      setEditingCategory(cat); 
                      setCategoryForm({ name: cat.name, description: cat.description, is_active: cat.is_active }); 
                      setCategoryModalOpen(true); 
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8 text-slate-400 hover:text-red-400"
                    onClick={() => handleDeleteCategory(cat.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <h4 className="font-semibold mb-1">{cat.name}</h4>
              <p className="text-sm text-slate-500 mb-3 line-clamp-2">{cat.description || 'No description'}</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">{cat.contestant_count} contestants</span>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                  cat.is_active 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/20' 
                    : 'bg-slate-500/20 text-slate-400 border border-slate-500/20'
                }`}>
                  {cat.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
          {categories.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-500">
              No categories created yet. Click "Add Category" to get started.
            </div>
          )}
        </div>
      </GlassCard>

      {/* Rounds */}
      <GlassCard 
        title="Contest Rounds" 
        icon={Target}
        action={
          <Dialog open={roundModalOpen} onOpenChange={setRoundModalOpen}>
            <DialogTrigger asChild>
              <Button 
                size="sm" 
                className="bg-gradient-to-r from-cyan-500 to-blue-600"
                onClick={() => { 
                  setEditingRound(null); 
                  setRoundForm({ name: '', description: '', max_contestants: '', start_date: '', end_date: '', is_active: false }); 
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Round
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#15151f] border-white/10 text-white">
              <DialogHeader>
                <DialogTitle className="font-syne">{editingRound ? 'Edit' : 'Create'} Round</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleRoundSubmit} className="space-y-4">
                <div>
                  <Label className="text-slate-300">Round Name</Label>
                  <Input 
                    value={roundForm.name} 
                    onChange={(e) => setRoundForm({ ...roundForm, name: e.target.value })} 
                    className="bg-white/5 border-white/10 text-white mt-1"
                    placeholder="e.g., Top 50, Semi Finals"
                    required 
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Description</Label>
                  <Input 
                    value={roundForm.description} 
                    onChange={(e) => setRoundForm({ ...roundForm, description: e.target.value })} 
                    className="bg-white/5 border-white/10 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Max Contestants</Label>
                  <Input 
                    type="number"
                    value={roundForm.max_contestants} 
                    onChange={(e) => setRoundForm({ ...roundForm, max_contestants: e.target.value })} 
                    className="bg-white/5 border-white/10 text-white mt-1"
                    placeholder="e.g., 50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-slate-300">Start Date</Label>
                    <Input 
                      type="date"
                      value={roundForm.start_date} 
                      onChange={(e) => setRoundForm({ ...roundForm, start_date: e.target.value })} 
                      className="bg-white/5 border-white/10 text-white mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">End Date</Label>
                    <Input 
                      type="date"
                      value={roundForm.end_date} 
                      onChange={(e) => setRoundForm({ ...roundForm, end_date: e.target.value })} 
                      className="bg-white/5 border-white/10 text-white mt-1"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-gradient-to-r from-cyan-500 to-blue-600">
                  {editingRound ? 'Update' : 'Create'} Round
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      >
        <div className="space-y-3">
          {rounds.map((round, idx) => (
            <div 
              key={round.id} 
              className={`p-4 rounded-xl border transition-all ${
                round.is_active 
                  ? 'bg-gradient-to-r from-pink-500/10 to-violet-500/10 border-pink-500/30' 
                  : 'bg-white/5 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                    round.is_active 
                      ? 'bg-gradient-to-br from-pink-500 to-violet-600 text-white' 
                      : 'bg-white/10 text-slate-400'
                  }`}>
                    {idx + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{round.name}</h4>
                      {round.is_active && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-green-500 text-white rounded animate-pulse">
                          LIVE
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500">
                      {round.description || 'No description'}
                      {round.max_contestants && ` • Max ${round.max_contestants} contestants`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!round.is_active && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20"
                      onClick={() => handleActivateRound(round.id)}
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Activate
                    </Button>
                  )}
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8 text-slate-400 hover:text-white"
                    onClick={() => { 
                      setEditingRound(round); 
                      setRoundForm({ 
                        name: round.name, 
                        description: round.description, 
                        max_contestants: round.max_contestants?.toString() || '', 
                        start_date: round.start_date || '', 
                        end_date: round.end_date || '', 
                        is_active: round.is_active 
                      }); 
                      setRoundModalOpen(true); 
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {rounds.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              No rounds created yet. Create rounds like "Qualification", "Top 50", "Finals".
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

// ============ CONTESTANTS SECTION ============
function ContestantsSection({
  contestants, categories, rounds, statusFilter, setStatusFilter,
  searchQuery, setSearchQuery, handleStatusChange, handleAssignRound,
  handleDeleteContestant, selectedContestant, setSelectedContestant,
  contestantModalOpen, setContestantModalOpen
}) {
  return (
    <div className="space-y-6" data-testid="contestants-section">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input 
            placeholder="Search contestants..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="pl-10 bg-white/5 border-white/10 text-white"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent className="bg-[#15151f] border-white/10 text-white">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniStatCard label="Total" value={contestants.length} icon={Users} />
        <MiniStatCard label="Pending" value={contestants.filter(c => c.status === 'pending').length} icon={Clock} color="amber" />
        <MiniStatCard label="Approved" value={contestants.filter(c => c.status === 'approved').length} icon={CheckCircle2} color="green" />
        <MiniStatCard label="Rejected" value={contestants.filter(c => c.status === 'rejected').length} icon={XCircle} color="red" />
      </div>

      {/* Contestants Table */}
      <GlassCard title="All Contestants" icon={Users}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Contestant</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Category</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Votes</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Round</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {contestants.map((c) => (
                <tr key={c.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/10 flex-shrink-0">
                        {c.photos?.[0] ? (
                          <img src={c.photos[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Users className="w-full h-full p-2 text-slate-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{c.full_name}</p>
                        <p className="text-xs text-slate-500 truncate">{c.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-400">{c.category_name || '—'}</td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-pink-400">{formatNumber(c.vote_count)}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      c.status === 'approved' ? 'bg-green-500/20 text-green-400 border border-green-500/20' :
                      c.status === 'pending' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20' :
                      'bg-red-500/20 text-red-400 border border-red-500/20'
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <Select value={c.round || ''} onValueChange={(v) => handleAssignRound(c.id, v)}>
                      <SelectTrigger className="w-32 h-8 text-xs bg-white/5 border-white/10 text-white">
                        <SelectValue placeholder="Assign" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#15151f] border-white/10 text-white">
                        {rounds.map((r) => (
                          <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex justify-end gap-1">
                      {c.status === 'pending' && (
                        <>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => handleStatusChange(c.id, 'approved')} 
                            className="h-8 w-8 text-green-400 hover:bg-green-500/20"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => handleStatusChange(c.id, 'rejected')} 
                            className="h-8 w-8 text-red-400 hover:bg-red-500/20"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => window.open(`/${c.slug}`, '_blank')} 
                        className="h-8 w-8 text-slate-400 hover:text-pink-400"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => handleDeleteContestant(c.id)} 
                        className="h-8 w-8 text-slate-400 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {contestants.length === 0 && (
            <p className="text-center text-slate-500 py-12">No contestants found</p>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

// ============ VOTING SECTION ============
function VotingSection({ votes, contestants }) {
  const todayVotes = votes?.filter(v => {
    const voteDate = new Date(v.created_at).toDateString();
    return voteDate === new Date().toDateString();
  }) || [];

  return (
    <div className="space-y-6" data-testid="voting-section">
      {/* Voting Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={Heart} label="Total Votes" value={votes?.length || 0} gradient="from-pink-500 to-rose-500" />
        <StatCard icon={Zap} label="Votes Today" value={todayVotes.length} gradient="from-cyan-500 to-blue-500" />
        <StatCard icon={Users} label="Active Voters" value={new Set(votes?.map(v => v.email)).size} gradient="from-violet-500 to-purple-500" />
        <StatCard icon={Shield} label="Blocked Votes" value={0} gradient="from-amber-500 to-orange-500" />
      </div>

      {/* Voting Controls */}
      <GlassCard title="Voting Controls" icon={Settings}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Voting Status</span>
              <Switch defaultChecked />
            </div>
            <p className="text-xs text-slate-500">Enable or disable voting site-wide</p>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Email OTP Required</span>
              <Switch defaultChecked />
            </div>
            <p className="text-xs text-slate-500">Require email verification for votes</p>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">24-Hour Limit</span>
              <Switch defaultChecked />
            </div>
            <p className="text-xs text-slate-500">One vote per email every 24 hours</p>
          </div>
        </div>
      </GlassCard>

      {/* Recent Votes */}
      <GlassCard title="Recent Vote Activity" icon={Activity}>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {votes?.slice(0, 20).map((vote, idx) => {
            const contestant = contestants?.find(c => c.id === vote.contestant_id);
            return (
              <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-pink-500/20 flex items-center justify-center">
                    <Heart className="w-5 h-5 text-pink-400" />
                  </div>
                  <div>
                    <p className="font-medium">{vote.email}</p>
                    <p className="text-xs text-slate-500">
                      Voted for {contestant?.full_name || 'Unknown contestant'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">{formatDate(vote.created_at)}</p>
                </div>
              </div>
            );
          })}
          {(!votes || votes.length === 0) && (
            <p className="text-center text-slate-500 py-12">No votes recorded yet</p>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

// ============ LEADERBOARD SECTION ============
function LeaderboardSection({ contestants, categories, rounds }) {
  const [leaderboardType, setLeaderboardType] = useState('global');
  
  const sortedContestants = [...(contestants || [])]
    .filter(c => c.status === 'approved')
    .sort((a, b) => b.vote_count - a.vote_count);

  return (
    <div className="space-y-6" data-testid="leaderboard-section">
      {/* Leaderboard Options */}
      <div className="flex flex-wrap gap-2">
        {['global', 'category', 'daily', 'weekly'].map(type => (
          <Button
            key={type}
            size="sm"
            variant={leaderboardType === type ? 'default' : 'outline'}
            className={leaderboardType === type 
              ? 'bg-gradient-to-r from-pink-500 to-violet-600' 
              : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}
            onClick={() => setLeaderboardType(type)}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)} Leaderboard
          </Button>
        ))}
      </div>

      {/* Leaderboard Table */}
      <GlassCard title={`${leaderboardType.charAt(0).toUpperCase() + leaderboardType.slice(1)} Rankings`} icon={Trophy}>
        <div className="space-y-3">
          {sortedContestants.slice(0, 20).map((c, idx) => (
            <div 
              key={c.id} 
              className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                idx < 3 
                  ? 'bg-gradient-to-r from-white/10 to-white/5 border border-white/10' 
                  : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-black shadow-lg shadow-yellow-500/30' :
                idx === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-black' :
                idx === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white' :
                'bg-white/10 text-slate-400'
              }`}>
                {idx + 1}
              </div>
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/10 flex-shrink-0">
                {c.photos?.[0] ? (
                  <img src={c.photos[0]} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Users className="w-full h-full p-3 text-slate-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{c.full_name}</p>
                <p className="text-sm text-slate-500">{c.category_name || 'No category'} • {c.round || 'No round'}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-violet-400">
                  {formatNumber(c.vote_count)}
                </p>
                <p className="text-xs text-slate-500">votes</p>
              </div>
            </div>
          ))}
          {sortedContestants.length === 0 && (
            <p className="text-center text-slate-500 py-12">No approved contestants to rank</p>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

// ============ MEDIA SECTION ============
function MediaSection({ contestants }) {
  const allPhotos = contestants?.flatMap(c => 
    (c.photos || []).map(photo => ({ photo, contestant: c }))
  ) || [];

  return (
    <div className="space-y-6" data-testid="media-section">
      <GlassCard title="Media Gallery" icon={Image}>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {allPhotos.slice(0, 24).map((item, idx) => (
            <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden bg-white/10">
              <img src={item.photo} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                <p className="text-xs font-medium truncate">{item.contestant.full_name}</p>
              </div>
            </div>
          ))}
          {allPhotos.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-500">
              No photos uploaded yet
            </div>
          )}
        </div>
      </GlassCard>

      {/* Media Controls */}
      <GlassCard title="Media Settings" icon={Settings}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <h4 className="font-medium mb-2">Photo Approval</h4>
            <p className="text-sm text-slate-500 mb-3">Require admin approval for uploaded photos</p>
            <Switch defaultChecked />
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <h4 className="font-medium mb-2">Supported Formats</h4>
            <p className="text-sm text-slate-500">JPG, PNG, WebP</p>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <h4 className="font-medium mb-2">Max File Size</h4>
            <p className="text-sm text-slate-500">10 MB per image</p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

// ============ SECURITY SECTION ============
function SecuritySection({ votes }) {
  const uniqueEmails = new Set(votes?.map(v => v.email)).size;

  return (
    <div className="space-y-6" data-testid="security-section">
      {/* Security Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SecurityStatusCard icon={Shield} label="Voting Security" status="Active" statusColor="green" />
        <SecurityStatusCard icon={Mail} label="Email OTP" status="Enabled" statusColor="green" />
        <SecurityStatusCard icon={Clock} label="Rate Limiting" status="Active" statusColor="green" />
        <SecurityStatusCard icon={AlertTriangle} label="Threats Detected" status="0" statusColor="green" />
      </div>

      {/* Security Features */}
      <GlassCard title="Security Features" icon={Lock}>
        <div className="space-y-3">
          {[
            { icon: Mail, label: 'Email OTP Verification', desc: 'All votes require email verification', active: true },
            { icon: Clock, label: '24-Hour Vote Limit', desc: 'One vote per email every 24 hours', active: true },
            { icon: Shield, label: 'Rate Limiting', desc: 'Prevent spam and abuse', active: true },
            { icon: Globe, label: 'IP Monitoring', desc: 'Track suspicious IP patterns', active: true },
            { icon: AlertTriangle, label: 'Bot Protection', desc: 'Detect and block automated voting', active: true },
          ].map((feature, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  feature.active ? 'bg-green-500/20' : 'bg-slate-500/20'
                }`}>
                  <feature.icon className={`w-5 h-5 ${feature.active ? 'text-green-400' : 'text-slate-400'}`} />
                </div>
                <div>
                  <p className="font-medium">{feature.label}</p>
                  <p className="text-sm text-slate-500">{feature.desc}</p>
                </div>
              </div>
              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                feature.active 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/20' 
                  : 'bg-slate-500/20 text-slate-400 border border-slate-500/20'
              }`}>
                {feature.active ? 'Active' : 'Inactive'}
              </span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Fraud Detection */}
      <GlassCard title="Fraud Detection" icon={AlertTriangle}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
            <p className="text-3xl font-bold text-green-400 mb-1">0</p>
            <p className="text-sm text-slate-500">Suspicious IPs</p>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
            <p className="text-3xl font-bold text-green-400 mb-1">0</p>
            <p className="text-sm text-slate-500">Blocked Voters</p>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
            <p className="text-3xl font-bold text-green-400 mb-1">0</p>
            <p className="text-sm text-slate-500">Invalid Votes</p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

// ============ REPORTS SECTION ============
function ReportsSection({ stats, contestants, votes }) {
  return (
    <div className="space-y-6" data-testid="reports-section">
      <GlassCard title="Data & Reporting" icon={FileText}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ReportCard 
            icon={Heart} 
            title="Voting Report" 
            desc="Export all voting data"
            count={votes?.length || 0}
          />
          <ReportCard 
            icon={Users} 
            title="Contestant Report" 
            desc="Export contestant profiles"
            count={contestants?.length || 0}
          />
          <ReportCard 
            icon={Mail} 
            title="Email Subscribers" 
            desc="Export voter email list"
            count={new Set(votes?.map(v => v.email)).size || 0}
          />
        </div>
      </GlassCard>

      {/* Export Options */}
      <GlassCard title="Export Options" icon={Download}>
        <div className="flex flex-wrap gap-3">
          <Button className="bg-green-500/20 text-green-400 border border-green-500/20 hover:bg-green-500/30">
            <FileText className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button className="bg-blue-500/20 text-blue-400 border border-blue-500/20 hover:bg-blue-500/30">
            <FileText className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
          <Button className="bg-red-500/20 text-red-400 border border-red-500/20 hover:bg-red-500/30">
            <FileText className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}

// ============ BANNERS/PROMOTIONS SECTION ============
function BannersSection() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    description: '',
    image_url: '',
    button_text: 'Join Now',
    button_link: '/portal/register',
    background_gradient: 'from-amber-500 via-orange-500 to-pink-500',
    is_active: true,
    display_type: 'popup',
    priority: 1
  });

  const gradientOptions = [
    { value: 'from-amber-500 via-orange-500 to-pink-500', label: 'Sunset Gold' },
    { value: 'from-purple-500 via-pink-500 to-rose-500', label: 'Purple Rose' },
    { value: 'from-blue-500 via-cyan-500 to-teal-500', label: 'Ocean Blue' },
    { value: 'from-green-500 via-emerald-500 to-teal-500', label: 'Emerald' },
    { value: 'from-rose-500 via-red-500 to-orange-500', label: 'Fire Red' },
    { value: 'from-violet-600 via-purple-600 to-indigo-600', label: 'Royal Purple' },
  ];

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const token = localStorage.getItem('lumina_token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/banners`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setBanners(data);
      }
    } catch (error) {
      console.error('Failed to fetch banners:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('lumina_token');
      const url = editingBanner 
        ? `${process.env.REACT_APP_BACKEND_URL}/api/admin/banners/${editingBanner.id}`
        : `${process.env.REACT_APP_BACKEND_URL}/api/admin/banners`;
      
      const response = await fetch(url, {
        method: editingBanner ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success(editingBanner ? 'Banner updated!' : 'Banner created!');
        setModalOpen(false);
        resetForm();
        fetchBanners();
      } else {
        toast.error('Failed to save banner');
      }
    } catch (error) {
      toast.error('Error saving banner');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this banner?')) return;
    try {
      const token = localStorage.getItem('lumina_token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/banners/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        toast.success('Banner deleted');
        fetchBanners();
      }
    } catch (error) {
      toast.error('Failed to delete banner');
    }
  };

  const handleToggle = async (id) => {
    try {
      const token = localStorage.getItem('lumina_token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/banners/${id}/toggle`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        toast.success('Banner status updated');
        fetchBanners();
      }
    } catch (error) {
      toast.error('Failed to toggle banner');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      subtitle: '',
      description: '',
      image_url: '',
      button_text: 'Join Now',
      button_link: '/portal/register',
      background_gradient: 'from-amber-500 via-orange-500 to-pink-500',
      is_active: true,
      display_type: 'popup',
      priority: 1
    });
    setEditingBanner(null);
  };

  const openEditModal = (banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      description: banner.description || '',
      image_url: banner.image_url || '',
      button_text: banner.button_text || 'Join Now',
      button_link: banner.button_link || '/portal/register',
      background_gradient: banner.background_gradient || 'from-amber-500 via-orange-500 to-pink-500',
      is_active: banner.is_active !== false,
      display_type: banner.display_type || 'popup',
      priority: banner.priority || 1
    });
    setModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-pink-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="banners-section">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold">Promotional Banners</h3>
          <p className="text-slate-400 text-sm">Create popup ads and banners for the user site</p>
        </div>
        <Button 
          onClick={() => { resetForm(); setModalOpen(true); }}
          className="bg-gradient-to-r from-pink-500 to-violet-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Banner
        </Button>
      </div>

      {/* Banners Grid */}
      {banners.length === 0 ? (
        <GlassCard title="No Banners Yet" icon={Megaphone}>
          <div className="text-center py-10">
            <Megaphone className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 mb-4">Create your first promotional banner</p>
            <Button onClick={() => setModalOpen(true)} className="bg-gradient-to-r from-amber-500 to-orange-500">
              <Plus className="w-4 h-4 mr-2" />
              Create Banner
            </Button>
          </div>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {banners.map((banner) => (
            <div key={banner.id} className="relative group">
              {/* Banner Preview Card */}
              <div className={`rounded-2xl overflow-hidden shadow-xl bg-gradient-to-br ${banner.background_gradient}`}>
                <div className="p-6 text-center relative">
                  {/* Status Badge */}
                  <div className="absolute top-3 right-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      banner.is_active 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                        : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                    }`}>
                      {banner.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <Crown className="w-10 h-10 text-white/80 mx-auto mb-3" />
                  <h4 className="font-syne text-xl font-bold text-white mb-1">{banner.title}</h4>
                  {banner.subtitle && (
                    <p className="text-white/80 text-sm mb-2">{banner.subtitle}</p>
                  )}
                  {banner.description && (
                    <p className="text-white/60 text-xs line-clamp-2">{banner.description}</p>
                  )}
                  <div className="mt-4">
                    <span className="inline-block px-4 py-2 bg-white/20 rounded-full text-white text-sm font-medium">
                      {banner.button_text}
                    </span>
                  </div>
                </div>

                {/* Actions Overlay */}
                <div className="bg-black/40 backdrop-blur-sm p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/60">Type: {banner.display_type}</span>
                    <span className="text-xs text-white/60">• Priority: {banner.priority}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => handleToggle(banner.id)}
                      className="text-white hover:bg-white/20"
                    >
                      {banner.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => openEditModal(banner)}
                      className="text-white hover:bg-white/20"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => handleDelete(banner.id)}
                      className="text-red-400 hover:bg-red-500/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-[#0f0f15] border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-syne text-xl flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-pink-400" />
              {editingBanner ? 'Edit Banner' : 'Create New Banner'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 mt-4">
            {/* Preview */}
            <div className={`rounded-xl overflow-hidden bg-gradient-to-br ${formData.background_gradient} p-6 text-center`}>
              <Crown className="w-8 h-8 text-white/80 mx-auto mb-2" />
              <h4 className="font-syne text-lg font-bold text-white">{formData.title || 'Banner Title'}</h4>
              {formData.subtitle && <p className="text-white/80 text-sm">{formData.subtitle}</p>}
              <div className="mt-3">
                <span className="inline-block px-4 py-2 bg-white/20 rounded-full text-white text-sm">
                  {formData.button_text}
                </span>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label className="text-slate-300">Banner Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Join Now & Win Big!"
                  required
                  className="bg-white/5 border-white/10 text-white mt-1"
                />
              </div>

              <div className="md:col-span-2">
                <Label className="text-slate-300">Subtitle</Label>
                <Input
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  placeholder="e.g., $35,000 Prize Pool"
                  className="bg-white/5 border-white/10 text-white mt-1"
                />
              </div>

              <div className="md:col-span-2">
                <Label className="text-slate-300">Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Additional details about the promotion..."
                  className="bg-white/5 border-white/10 text-white mt-1"
                  rows={3}
                />
              </div>

              <div>
                <Label className="text-slate-300">Button Text</Label>
                <Input
                  value={formData.button_text}
                  onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
                  placeholder="Join Now"
                  className="bg-white/5 border-white/10 text-white mt-1"
                />
              </div>

              <div>
                <Label className="text-slate-300">Button Link</Label>
                <Input
                  value={formData.button_link}
                  onChange={(e) => setFormData({ ...formData, button_link: e.target.value })}
                  placeholder="/portal/register"
                  className="bg-white/5 border-white/10 text-white mt-1"
                />
              </div>

              <div>
                <Label className="text-slate-300">Background Style</Label>
                <Select 
                  value={formData.background_gradient} 
                  onValueChange={(value) => setFormData({ ...formData, background_gradient: value })}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
                    <SelectValue placeholder="Select gradient" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a25] border-white/10">
                    {gradientOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-white hover:bg-white/10">
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded bg-gradient-to-r ${opt.value}`} />
                          {opt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-slate-300">Priority (1-10)</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                  className="bg-white/5 border-white/10 text-white mt-1"
                />
              </div>

              <div className="md:col-span-2 flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                <div>
                  <p className="font-medium">Active Status</p>
                  <p className="text-sm text-slate-500">Show this banner to users</p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-white/10">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="border-white/20">
                Cancel
              </Button>
              <Button type="submit" className="bg-gradient-to-r from-pink-500 to-violet-600">
                {editingBanner ? 'Update Banner' : 'Create Banner'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ SETTINGS SECTION ============
function SettingsSection() {
  const [contestSettings, setContestSettings] = useState({
    contest_name: '',
    contest_tagline: '',
    contest_description: '',
    contest_rules: '',
    prize_pool: 35000,
    prize_distribution: [],
    max_participants: 100,
    status: 'active'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/contest/settings`);
      const data = await response.json();
      setContestSettings(data);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('lumina_token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/contest/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(contestSettings)
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Contest settings saved successfully!');
      } else {
        toast.error('Failed to save settings');
      }
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updatePrize = (index, field, value) => {
    const newDistribution = [...contestSettings.prize_distribution];
    newDistribution[index] = { ...newDistribution[index], [field]: value };
    setContestSettings({ ...contestSettings, prize_distribution: newDistribution });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-pink-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="settings-section">
      {/* Contest Info Section */}
      <GlassCard title="Contest Information" icon={Trophy}>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300">Contest Name</Label>
              <Input 
                value={contestSettings.contest_name || ''} 
                onChange={(e) => setContestSettings({ ...contestSettings, contest_name: e.target.value })}
                className="bg-white/5 border-white/10 text-white mt-1" 
                placeholder="e.g., Glomer Beauty Contest 2026"
              />
            </div>
            <div>
              <Label className="text-slate-300">Tagline</Label>
              <Input 
                value={contestSettings.contest_tagline || ''} 
                onChange={(e) => setContestSettings({ ...contestSettings, contest_tagline: e.target.value })}
                className="bg-white/5 border-white/10 text-white mt-1" 
                placeholder="e.g., Vote for Your Favorite Star"
              />
            </div>
          </div>

          <div>
            <Label className="text-slate-300">Contest Description</Label>
            <Textarea 
              value={contestSettings.contest_description || ''} 
              onChange={(e) => setContestSettings({ ...contestSettings, contest_description: e.target.value })}
              className="bg-white/5 border-white/10 text-white mt-1 min-h-[120px]" 
              placeholder="Describe your contest in detail - what makes it special, what participants can expect..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300">Total Prize Pool (USD)</Label>
              <Input 
                type="number"
                value={contestSettings.prize_pool || 0} 
                onChange={(e) => setContestSettings({ ...contestSettings, prize_pool: parseFloat(e.target.value) })}
                className="bg-white/5 border-white/10 text-white mt-1" 
              />
            </div>
            <div>
              <Label className="text-slate-300">Max Participants</Label>
              <Input 
                type="number"
                value={contestSettings.max_participants || 100} 
                onChange={(e) => setContestSettings({ ...contestSettings, max_participants: parseInt(e.target.value) })}
                className="bg-white/5 border-white/10 text-white mt-1" 
              />
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Prize Distribution Section */}
      <GlassCard title="Prize Distribution" icon={Award}>
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">${formatNumber(contestSettings.prize_pool || 0)}</p>
                <p className="text-sm text-amber-400">Total Prize Pool</p>
              </div>
            </div>
          </div>

          {contestSettings.prize_distribution?.map((prize, index) => (
            <div key={index} className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-4 mb-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  index === 0 ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-white' :
                  index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-slate-800' :
                  index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white' :
                  'bg-white/10 text-slate-400'
                }`}>
                  {prize.position}
                </div>
                <Input 
                  value={prize.title || ''} 
                  onChange={(e) => updatePrize(index, 'title', e.target.value)}
                  className="bg-white/5 border-white/10 text-white flex-1" 
                  placeholder="Position Title"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-slate-400 text-xs">Prize Amount (USD)</Label>
                  <Input 
                    type="number"
                    value={prize.amount || 0} 
                    onChange={(e) => updatePrize(index, 'amount', parseFloat(e.target.value))}
                    className="bg-white/5 border-white/10 text-white mt-1" 
                  />
                </div>
                <div>
                  <Label className="text-slate-400 text-xs">Description</Label>
                  <Input 
                    value={prize.description || ''} 
                    onChange={(e) => updatePrize(index, 'description', e.target.value)}
                    className="bg-white/5 border-white/10 text-white mt-1" 
                    placeholder="e.g., Cash + Magazine Feature"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Contest Rules Section */}
      <GlassCard title="Contest Rules & Guidelines" icon={FileText}>
        <div>
          <Label className="text-slate-300">Rules & Eligibility</Label>
          <Textarea 
            value={contestSettings.contest_rules || ''} 
            onChange={(e) => setContestSettings({ ...contestSettings, contest_rules: e.target.value })}
            className="bg-white/5 border-white/10 text-white mt-1 min-h-[200px]" 
            placeholder={`Enter contest rules here. Example:

ELIGIBILITY:
• Must be 18 years or older
• Open to all nationalities
• Professional and amateur models welcome

PARTICIPATION RULES:
• Submit clear, high-quality photos
• No heavy filters or editing
• Professional headshots recommended

VOTING RULES:
• One free vote per email per 24 hours
• Paid votes available through our secure platform
• Vote buying or manipulation will result in disqualification

PRIZES:
• All prizes distributed within 30 days of contest end
• Winners must provide valid ID for verification
• Tax obligations are winner's responsibility`}
          />
        </div>
      </GlassCard>

      {/* Voting Rules */}
      <GlassCard title="Voting Configuration" icon={Heart}>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
            <div>
              <p className="font-medium">Email Verification Required</p>
              <p className="text-sm text-slate-500">Votes must be verified via email OTP</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
            <div>
              <p className="font-medium">24-Hour Voting Limit</p>
              <p className="text-sm text-slate-500">One vote per email every 24 hours</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
            <div>
              <p className="font-medium">Paid Voting Enabled</p>
              <p className="text-sm text-slate-500">Allow purchase of vote packages via Stripe</p>
            </div>
            <Switch defaultChecked />
          </div>
        </div>
      </GlassCard>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave}
          disabled={saving}
          className="bg-gradient-to-r from-pink-500 to-violet-600 px-8"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Save Contest Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ============ REUSABLE COMPONENTS ============

function StatCard({ icon: Icon, label, value, trend, trendUp, gradient, highlight }) {
  return (
    <div className={`p-5 rounded-2xl bg-gradient-to-br ${gradient} relative overflow-hidden`}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Icon className="w-5 h-5 text-white" />
          </div>
          {trend && (
            <span className={`flex items-center gap-1 text-xs font-semibold ${trendUp ? 'text-white/80' : 'text-white/60'}`}>
              {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {trend}
            </span>
          )}
        </div>
        <p className="text-white/70 text-sm font-medium">{label}</p>
        <p className="text-3xl font-bold text-white font-syne">{formatNumber(value)}</p>
      </div>
      {highlight && (
        <div className="absolute top-2 right-2">
          <span className="flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </span>
        </div>
      )}
    </div>
  );
}

function MiniStatCard({ label, value, icon: Icon, color = 'pink' }) {
  const colors = {
    pink: 'from-pink-500/20 to-pink-500/10 border-pink-500/20 text-pink-400',
    amber: 'from-amber-500/20 to-amber-500/10 border-amber-500/20 text-amber-400',
    green: 'from-green-500/20 to-green-500/10 border-green-500/20 text-green-400',
    red: 'from-red-500/20 to-red-500/10 border-red-500/20 text-red-400',
  };
  
  return (
    <div className={`p-4 rounded-xl bg-gradient-to-br ${colors[color]} border`}>
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5" />
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-xs text-slate-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

function GlassCard({ title, icon: Icon, children, action }) {
  return (
    <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500/20 to-violet-500/20 flex items-center justify-center">
              <Icon className="w-4 h-4 text-pink-400" />
            </div>
          )}
          <h3 className="font-syne font-semibold">{title}</h3>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function QuickActionButton({ icon: Icon, label, count, color }) {
  const colors = {
    green: 'hover:bg-green-500/20 text-green-400',
    violet: 'hover:bg-violet-500/20 text-violet-400',
    cyan: 'hover:bg-cyan-500/20 text-cyan-400',
    amber: 'hover:bg-amber-500/20 text-amber-400',
  };
  
  return (
    <button className={`w-full flex items-center justify-between p-3 rounded-xl bg-white/5 ${colors[color]} transition-colors`}>
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5" />
        <span className="font-medium text-white">{label}</span>
      </div>
      {count !== undefined && count > 0 && (
        <span className="px-2 py-0.5 text-xs font-bold bg-pink-500 text-white rounded-full">{count}</span>
      )}
    </button>
  );
}

function SecurityStatusCard({ icon: Icon, label, status, statusColor }) {
  const colors = {
    green: 'bg-green-500/20 text-green-400 border-green-500/20',
    amber: 'bg-amber-500/20 text-amber-400 border-amber-500/20',
    red: 'bg-red-500/20 text-red-400 border-red-500/20',
  };
  
  return (
    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
      <div className="flex items-center gap-3 mb-2">
        <Icon className="w-5 h-5 text-slate-400" />
        <span className="text-sm text-slate-400">{label}</span>
      </div>
      <span className={`px-3 py-1 text-sm font-semibold rounded-full ${colors[statusColor]} border`}>
        {status}
      </span>
    </div>
  );
}

function ReportCard({ icon: Icon, title, desc, count }) {
  return (
    <div className="p-5 rounded-xl bg-white/5 border border-white/10 hover:border-pink-500/30 transition-all group cursor-pointer">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/20 to-violet-500/20 flex items-center justify-center">
          <Icon className="w-5 h-5 text-pink-400" />
        </div>
        <div>
          <h4 className="font-semibold">{title}</h4>
          <p className="text-sm text-slate-500">{desc}</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-2xl font-bold text-pink-400">{formatNumber(count)}</span>
        <Button size="sm" variant="ghost" className="text-slate-400 group-hover:text-pink-400">
          <Download className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
