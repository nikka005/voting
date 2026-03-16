import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Layout } from '../../components/Layout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Progress } from '../../components/ui/progress';
import { Switch } from '../../components/ui/switch';
import { contestantsAPI, categoriesAPI, leaderboardAPI, entryFeeAPI } from '../../lib/api';
import { formatNumber, formatDate } from '../../lib/utils';
import { useVoteUpdates } from '../../hooks/useWebSocket';
import { toast } from 'sonner';
import { EntryFeePayment } from '../../components/EntryFeePayment';
import {
  User, Heart, Link as LinkIcon, Camera, Instagram, Facebook, Twitter,
  MapPin, Calendar, Copy, Check, Trash2, Upload, Loader2, AlertCircle,
  Sparkles, Plus, MessageCircle, ExternalLink, Trophy, TrendingUp,
  TrendingDown, Share2, QrCode, Globe, BarChart3, Eye, Bell, Clock,
  Settings, HelpCircle, Mail, Shield, ChevronRight, Award, Star,
  Target, Zap, ArrowUpRight, ArrowDownRight, Users, CheckCircle2,
  Smartphone, Send, MessageSquare, Lock, LogOut, CreditCard
} from 'lucide-react';

// ============ CONTESTANT DASHBOARD - PREMIUM LIGHT WEB3 DESIGN ============

export default function ContestantDashboard() {
  const { user, isContestant, logout } = useAuth();
  const navigate = useNavigate();
  
  // Real-time WebSocket updates
  const { lastVoteUpdate, isConnected } = useVoteUpdates();
  
  // Core States
  const [profile, setProfile] = useState(null);
  const [categories, setCategories] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [entryFeePaid, setEntryFeePaid] = useState(false);
  
  // UI States
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showQRCode, setShowQRCode] = useState(false);
  
  // Form States
  const [formData, setFormData] = useState({
    full_name: '',
    bio: '',
    location: '',
    age: '',
    category_id: '',
    social_instagram: '',
    social_facebook: '',
    social_twitter: '',
    social_tiktok: '',
    profession: '',
    achievements: '',
  });
  const [qaItems, setQaItems] = useState([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');

  // Fetch Profile
  const fetchProfile = useCallback(async () => {
    try {
      const [profileRes, categoriesRes, leaderboardRes, paymentStatusRes] = await Promise.all([
        contestantsAPI.getMyProfile(),
        categoriesAPI.getAll(true),
        leaderboardAPI.get({ limit: 10 }),
        entryFeeAPI.getMyStatus().catch(() => ({ data: { entry_fee_paid: false } })),
      ]);
      setProfile(profileRes.data);
      setCategories(categoriesRes.data);
      setLeaderboard(leaderboardRes.data);
      setEntryFeePaid(paymentStatusRes.data?.entry_fee_paid || profileRes.data?.entry_fee_paid || false);
      
      // Set form data
      setFormData({
        full_name: profileRes.data.full_name || '',
        bio: profileRes.data.bio || '',
        location: profileRes.data.location || '',
        age: profileRes.data.age?.toString() || '',
        category_id: profileRes.data.category_id || '',
        social_instagram: profileRes.data.social_instagram || '',
        social_facebook: profileRes.data.social_facebook || '',
        social_twitter: profileRes.data.social_twitter || '',
        social_tiktok: profileRes.data.social_tiktok || '',
        profession: profileRes.data.profession || '',
        achievements: profileRes.data.achievements || '',
      });
      setQaItems(profileRes.data.qa_items || []);
      
      // Mock notifications
      setNotifications([
        { id: 1, type: 'vote', message: 'You received 5 new votes today!', time: '2 hours ago', read: false },
        { id: 2, type: 'milestone', message: 'Congratulations! You reached 100 votes!', time: '1 day ago', read: true },
        { id: 3, type: 'round', message: 'New round "Top 50" has started', time: '2 days ago', read: true },
      ]);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isContestant) {
      navigate('/');
      return;
    }
    fetchProfile();
  }, [isContestant, navigate, fetchProfile]);

  // Handle real-time vote updates for this contestant
  useEffect(() => {
    if (lastVoteUpdate && profile && lastVoteUpdate.contestant_id === profile.id) {
      setProfile(prev => ({
        ...prev,
        vote_count: lastVoteUpdate.vote_count
      }));
      
      // Show toast notification for new vote
      toast.success(`You received a new vote! Total: ${lastVoteUpdate.vote_count}`, {
        icon: '🌟'
      });
    }
  }, [lastVoteUpdate, profile?.id]);

  // Handlers
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleAddQA = () => {
    if (!newQuestion.trim() || !newAnswer.trim()) {
      toast.error('Please enter both question and answer');
      return;
    }
    setQaItems([...qaItems, { question: newQuestion.trim(), answer: newAnswer.trim() }]);
    setNewQuestion('');
    setNewAnswer('');
    toast.success('Q&A added! Don\'t forget to save.');
  };

  const handleRemoveQA = (index) => {
    setQaItems(qaItems.filter((_, i) => i !== index));
    toast.success('Q&A removed! Don\'t forget to save.');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updateData = {
        ...formData,
        age: formData.age ? parseInt(formData.age) : null,
        category_id: formData.category_id || null,
        qa_items: qaItems,
      };
      const response = await contestantsAPI.updateMyProfile(updateData);
      setProfile(response.data);
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB');
      return;
    }
    setUploading(true);
    try {
      await contestantsAPI.uploadPhoto(file);
      await fetchProfile();
      toast.success('Photo uploaded successfully!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (index) => {
    try {
      await contestantsAPI.deletePhoto(index);
      await fetchProfile();
      toast.success('Photo deleted');
    } catch (error) {
      toast.error('Failed to delete photo');
    }
  };

  const copyVotingLink = async () => {
    const link = `https://glowingstar.vote/${profile?.slug}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Voting link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareToSocial = (platform) => {
    const link = `https://glowingstar.vote/${profile?.slug}`;
    const text = `Vote for ${profile?.full_name} in the Glowing Star Contest!`;
    const urls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text + ' ' + link)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`,
    };
    window.open(urls[platform], '_blank');
  };

  // Calculate stats
  const getRank = () => {
    const idx = leaderboard.findIndex(l => l.contestant_id === profile?.id);
    return idx >= 0 ? idx + 1 : null;
  };

  const getProfileCompletion = () => {
    if (!profile) return 0;
    let completed = 0;
    const fields = ['full_name', 'bio', 'location', 'age', 'category_id'];
    fields.forEach(f => { if (profile[f]) completed++; });
    if (profile.photos?.length > 0) completed++;
    if (profile.social_instagram || profile.social_facebook || profile.social_twitter) completed++;
    return Math.round((completed / 7) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-pink-50/30 to-violet-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center shadow-lg shadow-pink-500/30">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <Loader2 className="w-8 h-8 text-pink-500 animate-spin mx-auto" />
          <p className="text-slate-500 mt-4">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const currentRank = getRank();
  const profileCompletion = getProfileCompletion();

  // Navigation items
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'gallery', label: 'Gallery', icon: Camera },
    { id: 'voting-link', label: 'Voting Link', icon: LinkIcon },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: notifications.filter(n => !n.read).length },
    { id: 'support', label: 'Support', icon: HelpCircle },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-pink-50/20 to-violet-50/20">
      {/* ============ SIDEBAR ============ */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white/80 backdrop-blur-xl border-r border-slate-200/50 z-50 hidden lg:block" data-testid="contestant-sidebar">
        {/* Logo */}
        <div className="p-6 border-b border-slate-100">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center shadow-lg shadow-pink-500/25">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-syne font-bold text-lg text-slate-900">Glowing Star</h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gradient-to-r from-pink-100 to-violet-100 text-pink-600">
                CONTESTANT
              </span>
            </div>
          </Link>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-pink-100 to-violet-100 flex-shrink-0">
              {profile?.photos?.[0] ? (
                <img src={profile.photos[0]} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-full h-full p-3 text-pink-400" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-900 truncate">{profile?.full_name}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              data-testid={`nav-${item.id}`}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === item.id
                  ? 'bg-gradient-to-r from-pink-500 to-violet-500 text-white shadow-lg shadow-pink-500/25'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5" />
                {item.label}
              </div>
              {item.badge > 0 && (
                <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                  activeTab === item.id ? 'bg-white/20 text-white' : 'bg-pink-500 text-white'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100">
          <button
            onClick={() => { logout(); navigate('/'); }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* ============ MOBILE HEADER ============ */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-syne font-bold text-slate-900">Glowing Star</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('notifications')}
              className="relative p-2 text-slate-600 hover:text-pink-600"
            >
              <Bell className="w-5 h-5" />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-pink-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </button>
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-pink-100">
              {profile?.photos?.[0] ? (
                <img src={profile.photos[0]} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-full h-full p-1.5 text-pink-400" />
              )}
            </div>
          </div>
        </div>
        {/* Mobile Tab Bar */}
        <div className="flex gap-1 mt-3 overflow-x-auto pb-1 -mx-4 px-4">
          {navItems.slice(0, 6).map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                activeTab === item.id
                  ? 'bg-gradient-to-r from-pink-500 to-violet-500 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {/* ============ MAIN CONTENT ============ */}
      <main className="lg:ml-64 min-h-screen pt-32 lg:pt-0">
        <div className="p-4 lg:p-8 max-w-6xl mx-auto">
          
          {/* ============ DASHBOARD TAB ============ */}
          {activeTab === 'dashboard' && (
            <DashboardTab 
              profile={profile} 
              currentRank={currentRank} 
              profileCompletion={profileCompletion}
              leaderboard={leaderboard}
              copyVotingLink={copyVotingLink}
              copied={copied}
              setActiveTab={setActiveTab}
            />
          )}

          {/* ============ PROFILE TAB ============ */}
          {activeTab === 'profile' && (
            <ProfileTab
              formData={formData}
              handleChange={handleChange}
              handleSelectChange={handleSelectChange}
              categories={categories}
              qaItems={qaItems}
              newQuestion={newQuestion}
              setNewQuestion={setNewQuestion}
              newAnswer={newAnswer}
              setNewAnswer={setNewAnswer}
              handleAddQA={handleAddQA}
              handleRemoveQA={handleRemoveQA}
              handleSave={handleSave}
              saving={saving}
            />
          )}

          {/* ============ GALLERY TAB ============ */}
          {activeTab === 'gallery' && (
            <GalleryTab
              profile={profile}
              handlePhotoUpload={handlePhotoUpload}
              handleDeletePhoto={handleDeletePhoto}
              uploading={uploading}
            />
          )}

          {/* ============ VOTING LINK TAB ============ */}
          {activeTab === 'voting-link' && (
            <VotingLinkTab
              profile={profile}
              copyVotingLink={copyVotingLink}
              copied={copied}
              shareToSocial={shareToSocial}
              showQRCode={showQRCode}
              setShowQRCode={setShowQRCode}
            />
          )}

          {/* ============ ANALYTICS TAB ============ */}
          {activeTab === 'analytics' && (
            <AnalyticsTab profile={profile} />
          )}

          {/* ============ LEADERBOARD TAB ============ */}
          {activeTab === 'leaderboard' && (
            <LeaderboardTab 
              leaderboard={leaderboard} 
              profile={profile}
              currentRank={currentRank}
            />
          )}

          {/* ============ NOTIFICATIONS TAB ============ */}
          {activeTab === 'notifications' && (
            <NotificationsTab 
              notifications={notifications}
              setNotifications={setNotifications}
            />
          )}

          {/* ============ SUPPORT TAB ============ */}
          {activeTab === 'support' && (
            <SupportTab />
          )}

          {/* ============ SETTINGS TAB ============ */}
          {activeTab === 'settings' && (
            <SettingsTab user={user} logout={logout} navigate={navigate} />
          )}
        </div>
      </main>
    </div>
  );
}

// ============ DASHBOARD TAB ============
function DashboardTab({ profile, currentRank, profileCompletion, leaderboard, copyVotingLink, copied, setActiveTab }) {
  return (
    <div className="space-y-6" data-testid="dashboard-tab">
      {/* Welcome Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="font-syne text-2xl lg:text-3xl font-bold text-slate-900">
            Welcome back, {profile?.full_name?.split(' ')[0]}!
          </h1>
          <p className="text-slate-500">Here's your contest performance overview</p>
        </div>
        <Button onClick={() => setActiveTab('voting-link')} className="btn-gradient btn-jelly">
          <Share2 className="w-4 h-4 mr-2" />
          Share Voting Link
        </Button>
      </div>

      {/* Profile Completion */}
      {profileCompletion < 100 && (
        <GlassCard className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-slate-900">Complete Your Profile</h3>
                <span className="text-sm font-bold text-amber-600">{profileCompletion}%</span>
              </div>
              <Progress value={profileCompletion} className="h-2 bg-amber-100" />
              <p className="text-sm text-slate-500 mt-2">
                A complete profile attracts more votes!
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setActiveTab('profile')} className="border-amber-300 text-amber-700 hover:bg-amber-100">
              Complete
            </Button>
          </div>
        </GlassCard>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Heart}
          label="Total Votes"
          value={formatNumber(profile?.vote_count || 0)}
          trend="+12%"
          trendUp={true}
          gradient="from-pink-500 to-rose-500"
        />
        <StatCard
          icon={Trophy}
          label="Current Rank"
          value={currentRank ? `#${currentRank}` : '—'}
          trend={currentRank && currentRank <= 10 ? 'Top 10!' : ''}
          gradient="from-amber-500 to-orange-500"
        />
        <StatCard
          icon={Zap}
          label="Votes Today"
          value={Math.floor(Math.random() * 10)}
          trend="+5"
          trendUp={true}
          gradient="from-violet-500 to-purple-500"
        />
        <StatCard
          icon={Eye}
          label="Profile Views"
          value={Math.floor(Math.random() * 100) + 50}
          trend="+23%"
          trendUp={true}
          gradient="from-cyan-500 to-blue-500"
        />
      </div>

      {/* Quick Actions + Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <GlassCard title="Quick Actions" icon={Zap} className="lg:col-span-1">
          <div className="space-y-2">
            <QuickActionBtn icon={Share2} label="Share Voting Link" onClick={copyVotingLink} />
            <QuickActionBtn icon={Camera} label="Upload New Photo" onClick={() => setActiveTab('gallery')} />
            <QuickActionBtn icon={User} label="Edit Profile" onClick={() => setActiveTab('profile')} />
            <QuickActionBtn icon={BarChart3} label="View Analytics" onClick={() => setActiveTab('analytics')} />
          </div>
        </GlassCard>

        {/* Contest Status */}
        <GlassCard title="Contest Status" icon={Award} className="lg:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-pink-50 to-violet-50 border border-pink-100">
              <p className="text-sm text-slate-500 mb-1">Current Round</p>
              <p className="font-syne text-xl font-bold text-slate-900">{profile?.round || 'Qualification'}</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100">
              <p className="text-sm text-slate-500 mb-1">Status</p>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                  profile?.status === 'approved' 
                    ? 'bg-green-100 text-green-700 border border-green-200' 
                    : profile?.status === 'pending'
                    ? 'bg-amber-100 text-amber-700 border border-amber-200'
                    : 'bg-red-100 text-red-700 border border-red-200'
                }`}>
                  {profile?.status?.charAt(0).toUpperCase() + profile?.status?.slice(1)}
                </span>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100">
              <p className="text-sm text-slate-500 mb-1">Category</p>
              <p className="font-semibold text-slate-900">{profile?.category_name || 'Not selected'}</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100">
              <p className="text-sm text-slate-500 mb-1">Voting Link</p>
              <button onClick={copyVotingLink} className="flex items-center gap-2 text-violet-600 hover:text-violet-700 font-medium">
                <span className="truncate max-w-[120px]">{profile?.slug}</span>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Leaderboard Preview */}
      <GlassCard title="Leaderboard Preview" icon={Trophy} action={
        <Button size="sm" variant="ghost" onClick={() => setActiveTab('leaderboard')} className="text-pink-600">
          View All <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      }>
        <div className="space-y-2">
          {leaderboard.slice(0, 5).map((entry, idx) => (
            <div 
              key={entry.contestant_id} 
              className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                entry.contestant_id === profile?.id 
                  ? 'bg-gradient-to-r from-pink-50 to-violet-50 border border-pink-200' 
                  : 'hover:bg-slate-50'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-black' :
                idx === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-black' :
                idx === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white' :
                'bg-slate-100 text-slate-600'
              }`}>
                {idx + 1}
              </div>
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                {entry.photo ? (
                  <img src={entry.photo} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-full h-full p-2 text-slate-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${entry.contestant_id === profile?.id ? 'text-pink-600' : 'text-slate-900'}`}>
                  {entry.full_name} {entry.contestant_id === profile?.id && '(You)'}
                </p>
                <p className="text-xs text-slate-500">{entry.category_name || 'No category'}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-pink-500">{formatNumber(entry.vote_count)}</p>
                <p className="text-xs text-slate-400">votes</p>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

// ============ PROFILE TAB ============
function ProfileTab({ formData, handleChange, handleSelectChange, categories, qaItems, newQuestion, setNewQuestion, newAnswer, setNewAnswer, handleAddQA, handleRemoveQA, handleSave, saving }) {
  return (
    <div className="space-y-6" data-testid="profile-tab">
      <div>
        <h1 className="font-syne text-2xl font-bold text-slate-900">Profile Management</h1>
        <p className="text-slate-500">Create a professional public profile to attract more votes</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Info */}
          <GlassCard title="Basic Information" icon={User}>
            <div className="space-y-4">
              <div>
                <Label className="text-slate-700 font-semibold">Full Name</Label>
                <Input name="full_name" value={formData.full_name} onChange={handleChange}
                  className="mt-1 h-11 rounded-xl bg-white border-slate-200" />
              </div>
              <div>
                <Label className="text-slate-700 font-semibold">Category</Label>
                <Select value={formData.category_id} onValueChange={(v) => handleSelectChange('category_id', v)}>
                  <SelectTrigger className="mt-1 h-11 rounded-xl bg-white border-slate-200">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 rounded-xl">
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-700 font-semibold">Location</Label>
                  <Input name="location" value={formData.location} onChange={handleChange}
                    placeholder="City, Country" className="mt-1 h-11 rounded-xl bg-white border-slate-200" />
                </div>
                <div>
                  <Label className="text-slate-700 font-semibold">Age</Label>
                  <Input name="age" type="number" value={formData.age} onChange={handleChange}
                    placeholder="25" className="mt-1 h-11 rounded-xl bg-white border-slate-200" />
                </div>
              </div>
              <div>
                <Label className="text-slate-700 font-semibold">Profession / Talent</Label>
                <Input name="profession" value={formData.profession} onChange={handleChange}
                  placeholder="e.g., Model, Actress, Fitness Coach" className="mt-1 h-11 rounded-xl bg-white border-slate-200" />
              </div>
            </div>
          </GlassCard>

          {/* Bio & Story */}
          <GlassCard title="Bio & Personal Story" icon={MessageCircle}>
            <div className="space-y-4">
              <div>
                <Label className="text-slate-700 font-semibold">Biography</Label>
                <Textarea name="bio" value={formData.bio} onChange={handleChange}
                  placeholder="Tell your story... This appears at the top of your voting page."
                  rows={4} className="mt-1 rounded-xl bg-white border-slate-200 resize-none" />
              </div>
              <div>
                <Label className="text-slate-700 font-semibold">Achievements</Label>
                <Textarea name="achievements" value={formData.achievements} onChange={handleChange}
                  placeholder="Awards, titles, accomplishments..."
                  rows={3} className="mt-1 rounded-xl bg-white border-slate-200 resize-none" />
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Social Media */}
        <GlassCard title="Social Media Links" icon={Globe}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative">
              <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-pink-500" />
              <Input name="social_instagram" value={formData.social_instagram} onChange={handleChange}
                placeholder="Instagram username" className="pl-12 h-11 rounded-xl bg-white border-slate-200" />
            </div>
            <div className="relative">
              <Facebook className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-600" />
              <Input name="social_facebook" value={formData.social_facebook} onChange={handleChange}
                placeholder="Facebook username" className="pl-12 h-11 rounded-xl bg-white border-slate-200" />
            </div>
            <div className="relative">
              <Twitter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-800" />
              <Input name="social_twitter" value={formData.social_twitter} onChange={handleChange}
                placeholder="Twitter/X username" className="pl-12 h-11 rounded-xl bg-white border-slate-200" />
            </div>
            <div className="relative">
              <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black" />
              <Input name="social_tiktok" value={formData.social_tiktok} onChange={handleChange}
                placeholder="TikTok username" className="pl-12 h-11 rounded-xl bg-white border-slate-200" />
            </div>
          </div>
        </GlassCard>

        {/* Q&A Section */}
        <GlassCard title="Q&A Section" icon={MessageSquare}>
          <p className="text-sm text-slate-500 mb-4">
            Add questions and answers that will appear on your voting page (like "What fuels your passion?")
          </p>
          
          {qaItems.length > 0 && (
            <div className="space-y-3 mb-4">
              {qaItems.map((qa, index) => (
                <div key={index} className="p-4 bg-gradient-to-r from-pink-50 to-violet-50 rounded-xl relative group border border-pink-100">
                  <h4 className="font-semibold text-pink-600 text-sm mb-1">{qa.question}</h4>
                  <p className="text-slate-600 text-sm">{qa.answer}</p>
                  <button onClick={() => handleRemoveQA(index)}
                    className="absolute top-2 right-2 p-1 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3 p-4 border-2 border-dashed border-slate-200 rounded-xl">
            <Input value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Question (e.g., What fuels your passion?)"
              className="h-10 rounded-lg bg-white border-slate-200" />
            <Textarea value={newAnswer} onChange={(e) => setNewAnswer(e.target.value)}
              placeholder="Your answer..." rows={3}
              className="rounded-lg bg-white border-slate-200 resize-none" />
            <Button type="button" onClick={handleAddQA} variant="outline"
              className="w-full border-pink-200 text-pink-600 hover:bg-pink-50">
              <Plus className="w-4 h-4 mr-2" /> Add Q&A
            </Button>
          </div>
        </GlassCard>

        {/* Save Button */}
        <Button type="submit" disabled={saving} className="w-full h-12 btn-gradient btn-jelly text-base">
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save All Changes'}
        </Button>
      </form>
    </div>
  );
}

// ============ GALLERY TAB ============
function GalleryTab({ profile, handlePhotoUpload, handleDeletePhoto, uploading }) {
  return (
    <div className="space-y-6" data-testid="gallery-tab">
      <div>
        <h1 className="font-syne text-2xl font-bold text-slate-900">Photo Gallery</h1>
        <p className="text-slate-500">Upload multiple photos to showcase on your voting page</p>
      </div>

      <GlassCard title="Upload Photos" icon={Camera}>
        <label className="block cursor-pointer">
          <div className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-pink-200 hover:border-pink-400 bg-pink-50/50 rounded-2xl transition-colors">
            {uploading ? (
              <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center shadow-lg">
                  <Upload className="w-8 h-8 text-white" />
                </div>
                <div className="text-center">
                  <p className="text-pink-600 font-semibold">Click to upload photos</p>
                  <p className="text-sm text-slate-500">JPG, PNG, WebP • Max 10MB</p>
                </div>
              </>
            )}
          </div>
          <input type="file" accept="image/*" onChange={handlePhotoUpload}
            className="hidden" disabled={uploading} />
        </label>
      </GlassCard>

      <GlassCard title="Your Photos" icon={Camera}>
        {profile?.photos?.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {profile.photos.map((photo, index) => (
              <div key={index} className="relative group aspect-square rounded-xl overflow-hidden shadow-lg">
                <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button onClick={() => handleDeletePhoto(index)}
                    className="p-2 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                {index === 0 && (
                  <span className="absolute top-2 left-2 px-2 py-1 text-[10px] font-bold bg-pink-500 text-white rounded-full">
                    MAIN
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Camera className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No photos uploaded yet</p>
            <p className="text-sm text-slate-400">Upload photos to showcase on your voting page</p>
          </div>
        )}
      </GlassCard>
    </div>
  );
}

// ============ VOTING LINK TAB ============
function VotingLinkTab({ profile, copyVotingLink, copied, shareToSocial, showQRCode, setShowQRCode }) {
  const votingUrl = `https://glowingstar.vote/${profile?.slug}`;
  
  return (
    <div className="space-y-6" data-testid="voting-link-tab">
      <div>
        <h1 className="font-syne text-2xl font-bold text-slate-900">Voting Link Generator</h1>
        <p className="text-slate-500">Share your unique voting link to collect more votes</p>
      </div>

      {/* Main Voting Link */}
      <GlassCard className="bg-gradient-to-r from-pink-50 to-violet-50 border-pink-200">
        <div className="text-center p-4">
          <p className="text-sm text-slate-500 mb-3">Your Unique Voting Link</p>
          <div className="flex items-center justify-center gap-2 p-4 bg-white rounded-xl border border-pink-200 mb-4">
            <LinkIcon className="w-5 h-5 text-pink-500" />
            <code className="text-lg font-mono text-slate-900 break-all">{votingUrl}</code>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={copyVotingLink} className="btn-gradient btn-jelly">
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </Button>
            <Button variant="outline" onClick={() => setShowQRCode(!showQRCode)}
              className="border-pink-200 text-pink-600 hover:bg-pink-50">
              <QrCode className="w-4 h-4 mr-2" />
              {showQRCode ? 'Hide' : 'Show'} QR Code
            </Button>
            {profile?.status === 'approved' && (
              <a href={votingUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="border-violet-200 text-violet-600 hover:bg-violet-50">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Preview Page
                </Button>
              </a>
            )}
          </div>
        </div>
      </GlassCard>

      {/* QR Code */}
      {showQRCode && (
        <GlassCard title="QR Code" icon={QrCode}>
          <div className="flex flex-col items-center p-6">
            <div className="w-48 h-48 bg-white p-4 rounded-xl shadow-lg border border-slate-200">
              {/* Simple QR Code placeholder - would use qrcode library in production */}
              <div className="w-full h-full bg-gradient-to-br from-pink-100 to-violet-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <QrCode className="w-16 h-16 text-pink-500 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">QR Code</p>
                </div>
              </div>
            </div>
            <p className="text-sm text-slate-500 mt-4">Scan to vote directly</p>
          </div>
        </GlassCard>
      )}

      {/* Social Share */}
      <GlassCard title="Share to Social Media" icon={Share2}>
        <p className="text-sm text-slate-500 mb-4">
          Share your voting link directly to social media platforms
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <SocialShareBtn platform="instagram" onClick={() => shareToSocial('instagram')} label="Instagram"
            gradient="from-pink-500 via-red-500 to-yellow-500" icon={Instagram} />
          <SocialShareBtn platform="facebook" onClick={() => shareToSocial('facebook')} label="Facebook"
            gradient="from-blue-600 to-blue-700" icon={Facebook} />
          <SocialShareBtn platform="twitter" onClick={() => shareToSocial('twitter')} label="Twitter/X"
            gradient="from-slate-800 to-slate-900" icon={Twitter} />
          <SocialShareBtn platform="whatsapp" onClick={() => shareToSocial('whatsapp')} label="WhatsApp"
            gradient="from-green-500 to-green-600" icon={Send} />
        </div>
      </GlassCard>

      {/* Promotion Tips */}
      <GlassCard title="Promotion Tips" icon={Zap}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { tip: 'Share daily on Instagram Stories', icon: Instagram },
            { tip: 'Ask friends and family to vote', icon: Users },
            { tip: 'Post in relevant Facebook groups', icon: Facebook },
            { tip: 'Tweet with trending hashtags', icon: Twitter },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-100 to-violet-100 flex items-center justify-center">
                <item.icon className="w-5 h-5 text-pink-500" />
              </div>
              <p className="text-sm text-slate-700">{item.tip}</p>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

// ============ ANALYTICS TAB ============
function AnalyticsTab({ profile }) {
  return (
    <div className="space-y-6" data-testid="analytics-tab">
      <div>
        <h1 className="font-syne text-2xl font-bold text-slate-900">Vote Analytics</h1>
        <p className="text-slate-500">Track your vote performance in real time</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniStatCard label="Total Votes" value={formatNumber(profile?.vote_count || 0)} icon={Heart} color="pink" />
        <MiniStatCard label="This Week" value={Math.floor(Math.random() * 50)} icon={Calendar} color="violet" />
        <MiniStatCard label="Today" value={Math.floor(Math.random() * 10)} icon={Zap} color="cyan" />
        <MiniStatCard label="Profile Views" value={Math.floor(Math.random() * 200) + 100} icon={Eye} color="amber" />
      </div>

      {/* Vote Chart Placeholder */}
      <GlassCard title="Weekly Vote Trend" icon={TrendingUp}>
        <div className="h-64 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl">
          <div className="text-center">
            <BarChart3 className="w-16 h-16 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Vote analytics chart</p>
            <p className="text-sm text-slate-400">Coming soon...</p>
          </div>
        </div>
      </GlassCard>

      {/* Traffic Sources */}
      <GlassCard title="Traffic Sources" icon={Globe}>
        <div className="space-y-3">
          {[
            { source: 'Direct Link', percent: 45, color: 'bg-pink-500' },
            { source: 'Instagram', percent: 30, color: 'bg-gradient-to-r from-pink-500 to-yellow-500' },
            { source: 'Facebook', percent: 15, color: 'bg-blue-600' },
            { source: 'Twitter', percent: 10, color: 'bg-slate-800' },
          ].map((item, idx) => (
            <div key={idx}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">{item.source}</span>
                <span className="font-semibold text-slate-900">{item.percent}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.percent}%` }} />
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

// ============ LEADERBOARD TAB ============
function LeaderboardTab({ leaderboard, profile, currentRank }) {
  return (
    <div className="space-y-6" data-testid="leaderboard-tab">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-syne text-2xl font-bold text-slate-900">Leaderboard</h1>
          <p className="text-slate-500">See your position among all contestants</p>
        </div>
        <Link to="/leaderboard">
          <Button variant="outline" className="border-pink-200 text-pink-600 hover:bg-pink-50">
            <ExternalLink className="w-4 h-4 mr-2" />
            View Public Leaderboard
          </Button>
        </Link>
      </div>

      {/* Your Position */}
      <GlassCard className="bg-gradient-to-r from-pink-500 to-violet-500 text-white border-0">
        <div className="flex items-center justify-between p-4">
          <div>
            <p className="text-white/70 text-sm">Your Current Position</p>
            <p className="font-syne text-4xl font-bold">#{currentRank || '—'}</p>
          </div>
          <div className="text-right">
            <p className="text-white/70 text-sm">Total Votes</p>
            <p className="font-syne text-4xl font-bold">{formatNumber(profile?.vote_count || 0)}</p>
          </div>
        </div>
      </GlassCard>

      {/* Full Leaderboard */}
      <GlassCard title="Top 10 Contestants" icon={Trophy}>
        <div className="space-y-2">
          {leaderboard.map((entry, idx) => (
            <div 
              key={entry.contestant_id} 
              className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                entry.contestant_id === profile?.id 
                  ? 'bg-gradient-to-r from-pink-100 to-violet-100 border-2 border-pink-300' 
                  : 'hover:bg-slate-50 border border-transparent'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-black shadow-lg' :
                idx === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-black' :
                idx === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white' :
                'bg-slate-100 text-slate-600'
              }`}>
                {idx + 1}
              </div>
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                {entry.photo ? (
                  <img src={entry.photo} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-full h-full p-2 text-slate-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold truncate ${entry.contestant_id === profile?.id ? 'text-pink-600' : 'text-slate-900'}`}>
                  {entry.full_name} {entry.contestant_id === profile?.id && '(You)'}
                </p>
                <p className="text-sm text-slate-500">{entry.category_name || 'No category'}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-pink-500">{formatNumber(entry.vote_count)}</p>
                <p className="text-xs text-slate-400">votes</p>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

// ============ NOTIFICATIONS TAB ============
function NotificationsTab({ notifications, setNotifications }) {
  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
    toast.success('All notifications marked as read');
  };

  const getIcon = (type) => {
    switch (type) {
      case 'vote': return Heart;
      case 'milestone': return Award;
      case 'round': return Trophy;
      default: return Bell;
    }
  };

  return (
    <div className="space-y-6" data-testid="notifications-tab">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-syne text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-slate-500">Stay updated with your contest activity</p>
        </div>
        <Button variant="outline" size="sm" onClick={markAllRead} className="border-slate-200">
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Mark All Read
        </Button>
      </div>

      <GlassCard>
        <div className="space-y-2">
          {notifications.map((notif) => {
            const Icon = getIcon(notif.type);
            return (
              <div key={notif.id} className={`flex items-start gap-4 p-4 rounded-xl transition-all ${
                !notif.read ? 'bg-pink-50 border border-pink-100' : 'hover:bg-slate-50'
              }`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  notif.type === 'vote' ? 'bg-pink-100 text-pink-500' :
                  notif.type === 'milestone' ? 'bg-amber-100 text-amber-500' :
                  'bg-violet-100 text-violet-500'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className={`text-sm ${!notif.read ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
                    {notif.message}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">{notif.time}</p>
                </div>
                {!notif.read && (
                  <div className="w-2 h-2 rounded-full bg-pink-500 mt-2" />
                )}
              </div>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
}

// ============ SUPPORT TAB ============
function SupportTab() {
  const [ticket, setTicket] = useState({ subject: '', message: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    toast.success('Support ticket submitted! We\'ll get back to you soon.');
    setTicket({ subject: '', message: '' });
  };

  return (
    <div className="space-y-6" data-testid="support-tab">
      <div>
        <h1 className="font-syne text-2xl font-bold text-slate-900">Support Center</h1>
        <p className="text-slate-500">Need help? We're here for you</p>
      </div>

      {/* Contact Form */}
      <GlassCard title="Submit a Ticket" icon={MessageSquare}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-slate-700 font-semibold">Subject</Label>
            <Input value={ticket.subject} onChange={(e) => setTicket({ ...ticket, subject: e.target.value })}
              placeholder="What do you need help with?" className="mt-1 h-11 rounded-xl bg-white border-slate-200" required />
          </div>
          <div>
            <Label className="text-slate-700 font-semibold">Message</Label>
            <Textarea value={ticket.message} onChange={(e) => setTicket({ ...ticket, message: e.target.value })}
              placeholder="Describe your issue in detail..." rows={5}
              className="mt-1 rounded-xl bg-white border-slate-200 resize-none" required />
          </div>
          <Button type="submit" className="btn-gradient btn-jelly">
            <Send className="w-4 h-4 mr-2" />
            Submit Ticket
          </Button>
        </form>
      </GlassCard>

      {/* FAQ */}
      <GlassCard title="Frequently Asked Questions" icon={HelpCircle}>
        <div className="space-y-3">
          {[
            { q: 'How do I get more votes?', a: 'Share your voting link on social media, ask friends and family, and keep your profile updated!' },
            { q: 'When does voting end?', a: 'Check the countdown timer on your voting page for the exact deadline.' },
            { q: 'Can I change my category?', a: 'Yes, you can change your category in the Profile section before the round ends.' },
            { q: 'How are winners selected?', a: 'Winners are selected based on the total vote count at the end of each round.' },
          ].map((item, idx) => (
            <div key={idx} className="p-4 bg-slate-50 rounded-xl">
              <h4 className="font-semibold text-slate-900 mb-1">{item.q}</h4>
              <p className="text-sm text-slate-600">{item.a}</p>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

// ============ SETTINGS TAB ============
function SettingsTab({ user, logout, navigate }) {
  return (
    <div className="space-y-6" data-testid="settings-tab">
      <div>
        <h1 className="font-syne text-2xl font-bold text-slate-900">Account Settings</h1>
        <p className="text-slate-500">Manage your account preferences</p>
      </div>

      {/* Account Info */}
      <GlassCard title="Account Information" icon={User}>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-sm text-slate-500">Email</p>
                <p className="font-medium text-slate-900">{user?.email}</p>
              </div>
            </div>
            <Button size="sm" variant="outline" className="border-slate-200">Change</Button>
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-sm text-slate-500">Password</p>
                <p className="font-medium text-slate-900">••••••••</p>
              </div>
            </div>
            <Button size="sm" variant="outline" className="border-slate-200">Change</Button>
          </div>
        </div>
      </GlassCard>

      {/* Notification Settings */}
      <GlassCard title="Notification Settings" icon={Bell}>
        <div className="space-y-4">
          {[
            { label: 'Vote notifications', desc: 'Get notified when you receive votes', defaultChecked: true },
            { label: 'Milestone alerts', desc: 'Get alerts when you reach vote milestones', defaultChecked: true },
            { label: 'Round updates', desc: 'Get notified about round changes', defaultChecked: true },
            { label: 'Email newsletters', desc: 'Receive promotional emails', defaultChecked: false },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div>
                <p className="font-medium text-slate-900">{item.label}</p>
                <p className="text-sm text-slate-500">{item.desc}</p>
              </div>
              <Switch defaultChecked={item.defaultChecked} />
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Privacy */}
      <GlassCard title="Privacy" icon={Shield}>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
            <div>
              <p className="font-medium text-slate-900">Public Profile</p>
              <p className="text-sm text-slate-500">Allow your profile to be visible on the public site</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
            <div>
              <p className="font-medium text-slate-900">Show Vote Count</p>
              <p className="text-sm text-slate-500">Display your vote count on your public profile</p>
            </div>
            <Switch defaultChecked />
          </div>
        </div>
      </GlassCard>

      {/* Danger Zone */}
      <GlassCard title="Danger Zone" icon={AlertCircle} className="border-red-200">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-100">
            <div>
              <p className="font-medium text-red-700">Logout</p>
              <p className="text-sm text-red-600">Sign out of your account</p>
            </div>
            <Button size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-100"
              onClick={() => { logout(); navigate('/'); }}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

// ============ REUSABLE COMPONENTS ============

function GlassCard({ children, title, icon: Icon, action, className = '' }) {
  return (
    <div className={`bg-white/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 shadow-xl shadow-slate-200/20 overflow-hidden ${className}`}>
      {title && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-100 to-violet-100 flex items-center justify-center">
                <Icon className="w-4 h-4 text-pink-500" />
              </div>
            )}
            <h3 className="font-syne font-semibold text-slate-900">{title}</h3>
          </div>
          {action}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, trend, trendUp, gradient }) {
  return (
    <div className={`p-5 rounded-2xl bg-gradient-to-br ${gradient} text-white relative overflow-hidden`}>
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Icon className="w-5 h-5 text-white" />
          </div>
          {trend && (
            <span className="flex items-center gap-1 text-xs font-semibold text-white/80">
              {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {trend}
            </span>
          )}
        </div>
        <p className="text-white/70 text-sm">{label}</p>
        <p className="font-syne text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}

function MiniStatCard({ label, value, icon: Icon, color = 'pink' }) {
  const colors = {
    pink: 'from-pink-50 to-pink-100 border-pink-200 text-pink-600',
    violet: 'from-violet-50 to-violet-100 border-violet-200 text-violet-600',
    cyan: 'from-cyan-50 to-cyan-100 border-cyan-200 text-cyan-600',
    amber: 'from-amber-50 to-amber-100 border-amber-200 text-amber-600',
  };
  return (
    <div className={`p-4 rounded-xl bg-gradient-to-br ${colors[color]} border`}>
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5" />
        <div>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          <p className="text-xs text-slate-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function QuickActionBtn({ icon: Icon, label, onClick }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-pink-50 text-slate-700 hover:text-pink-600 transition-colors text-left">
      <Icon className="w-5 h-5" />
      <span className="font-medium text-sm">{label}</span>
      <ChevronRight className="w-4 h-4 ml-auto" />
    </button>
  );
}

function SocialShareBtn({ platform, onClick, label, gradient, icon: Icon }) {
  return (
    <button onClick={onClick}
      className={`flex flex-col items-center gap-2 p-4 rounded-xl bg-gradient-to-br ${gradient} text-white hover:scale-105 transition-transform shadow-lg`}>
      <Icon className="w-6 h-6" />
      <span className="text-xs font-semibold">{label}</span>
    </button>
  );
}
