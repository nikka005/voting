import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Switch } from '../components/ui/switch';
import { adminAPI, contestantsAPI, categoriesAPI, roundsAPI } from '../lib/api';
import { formatNumber, formatDate } from '../lib/utils';
import { toast } from 'sonner';
import {
  Users, Heart, Crown, Clock, Plus, Trash2, Check, X, Edit, Loader2, Search,
  Eye, Trophy, Sparkles, Settings, BarChart3, TrendingUp, Globe, Shield,
  Mail, Bell, Image, Download, Activity, AlertTriangle, UserCheck, UserX,
  Calendar, ChevronRight, MoreVertical, RefreshCw
} from 'lucide-react';

export default function AdminPanel() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [contestants, setContestants] = useState([]);
  const [categories, setCategories] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [votes, setVotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [roundModalOpen, setRoundModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingRound, setEditingRound] = useState(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', is_active: true });
  const [roundForm, setRoundForm] = useState({ name: '', description: '', max_contestants: '', start_date: '', end_date: '', is_active: false });

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, categoriesRes, roundsRes, votesRes] = await Promise.all([
        adminAPI.getStats(),
        categoriesAPI.getAll(),
        roundsAPI.getAll(),
        adminAPI.getVotes({ limit: 20 }),
      ]);
      setStats(statsRes.data);
      setCategories(categoriesRes.data);
      setRounds(roundsRes.data);
      setVotes(votesRes.data);
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
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

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await categoriesAPI.update(editingCategory.id, categoryForm);
        toast.success('Category updated');
      } else {
        await categoriesAPI.create(categoryForm);
        toast.success('Category created');
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
    if (!window.confirm('Delete this category?')) return;
    try {
      await categoriesAPI.delete(id);
      toast.success('Category deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete category');
    }
  };

  const handleRoundSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...roundForm, max_contestants: roundForm.max_contestants ? parseInt(roundForm.max_contestants) : null };
      if (editingRound) {
        await roundsAPI.update(editingRound.id, data);
        toast.success('Round updated');
      } else {
        await roundsAPI.create(data);
        toast.success('Round created');
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
      toast.success('Round assigned');
      fetchContestants();
    } catch (error) {
      toast.error('Failed to assign round');
    }
  };

  const handleDeleteContestant = async (id) => {
    if (!window.confirm('Delete this contestant permanently?')) return;
    try {
      await adminAPI.deleteContestant(id);
      toast.success('Contestant deleted');
      fetchContestants();
      fetchData();
    } catch (error) {
      toast.error('Failed to delete contestant');
    }
  };

  if (loading) {
    return (
      <Layout isManagement>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout isManagement>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-syne text-2xl font-bold text-slate-900">Admin Dashboard</h1>
            <p className="text-slate-500 text-sm">Manage your contest platform</p>
          </div>
          <Button onClick={() => fetchData()} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <Card className="bg-gradient-to-br from-pink-500 to-rose-500 border-0 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-xs font-medium">Total Contestants</p>
                  <p className="font-syne text-2xl font-bold">{formatNumber(stats?.total_contestants || 0)}</p>
                </div>
                <Users className="w-8 h-8 text-white/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-violet-500 to-purple-500 border-0 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-xs font-medium">Total Votes</p>
                  <p className="font-syne text-2xl font-bold">{formatNumber(stats?.total_votes || 0)}</p>
                </div>
                <Heart className="w-8 h-8 text-white/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-cyan-500 to-blue-500 border-0 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-xs font-medium">Categories</p>
                  <p className="font-syne text-2xl font-bold">{stats?.total_categories || 0}</p>
                </div>
                <Crown className="w-8 h-8 text-white/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500 to-orange-500 border-0 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-xs font-medium">Pending Approval</p>
                  <p className="font-syne text-2xl font-bold">{stats?.pending_approvals || 0}</p>
                </div>
                <Clock className="w-8 h-8 text-white/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[
            { icon: UserCheck, label: 'Approve Pending', count: stats?.pending_approvals, color: 'text-green-600 bg-green-50', action: () => setStatusFilter('pending') },
            { icon: Trophy, label: 'Active Round', value: stats?.active_round || 'None', color: 'text-violet-600 bg-violet-50' },
            { icon: Shield, label: 'Voting Status', value: 'Active', color: 'text-cyan-600 bg-cyan-50' },
            { icon: Activity, label: 'System Health', value: 'Healthy', color: 'text-green-600 bg-green-50' },
          ].map((item, idx) => (
            <button key={idx} onClick={item.action} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 hover:border-slate-200 transition-colors text-left">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.color}`}>
                <item.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500">{item.label}</p>
                <p className="font-semibold text-slate-900">{item.count !== undefined ? item.count : item.value}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="contestants" className="space-y-4">
          <TabsList className="bg-white border border-slate-200 rounded-xl p-1 h-auto flex-wrap">
            <TabsTrigger value="contestants" className="rounded-lg data-[state=active]:bg-pink-500 data-[state=active]:text-white text-sm py-2">
              <Users className="w-4 h-4 mr-1.5" />Contestants
            </TabsTrigger>
            <TabsTrigger value="categories" className="rounded-lg data-[state=active]:bg-pink-500 data-[state=active]:text-white text-sm py-2">
              <Crown className="w-4 h-4 mr-1.5" />Categories
            </TabsTrigger>
            <TabsTrigger value="rounds" className="rounded-lg data-[state=active]:bg-pink-500 data-[state=active]:text-white text-sm py-2">
              <Trophy className="w-4 h-4 mr-1.5" />Rounds
            </TabsTrigger>
            <TabsTrigger value="votes" className="rounded-lg data-[state=active]:bg-pink-500 data-[state=active]:text-white text-sm py-2">
              <Heart className="w-4 h-4 mr-1.5" />Votes
            </TabsTrigger>
            <TabsTrigger value="security" className="rounded-lg data-[state=active]:bg-pink-500 data-[state=active]:text-white text-sm py-2">
              <Shield className="w-4 h-4 mr-1.5" />Security
            </TabsTrigger>
          </TabsList>

          {/* Contestants Tab */}
          <TabsContent value="contestants">
            <Card className="bg-white border-slate-200">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <CardTitle className="font-syne text-lg">Contestant Management</CardTitle>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9 w-40 rounded-lg bg-slate-50 border-slate-200 text-sm" />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-32 h-9 rounded-lg bg-slate-50 border-slate-200 text-sm">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200 rounded-lg">
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-y border-slate-100">
                      <tr>
                        <th className="text-left py-2.5 px-4 text-slate-500 font-medium">Contestant</th>
                        <th className="text-left py-2.5 px-4 text-slate-500 font-medium">Category</th>
                        <th className="text-left py-2.5 px-4 text-slate-500 font-medium">Votes</th>
                        <th className="text-left py-2.5 px-4 text-slate-500 font-medium">Status</th>
                        <th className="text-left py-2.5 px-4 text-slate-500 font-medium">Round</th>
                        <th className="text-right py-2.5 px-4 text-slate-500 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {contestants.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                                {c.photos?.[0] && <img src={c.photos[0]} alt="" className="w-full h-full object-cover" />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-slate-900 font-medium truncate">{c.full_name}</p>
                                <p className="text-slate-400 text-xs truncate">{c.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-slate-600">{c.category_name || '—'}</td>
                          <td className="py-2.5 px-4 font-semibold text-slate-900">{formatNumber(c.vote_count)}</td>
                          <td className="py-2.5 px-4">
                            <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                              c.status === 'approved' ? 'bg-green-100 text-green-700' :
                              c.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                            }`}>{c.status}</span>
                          </td>
                          <td className="py-2.5 px-4">
                            <Select value={c.round || ''} onValueChange={(v) => handleAssignRound(c.id, v)}>
                              <SelectTrigger className="w-28 h-7 rounded text-xs bg-slate-50 border-slate-200">
                                <SelectValue placeholder="Assign" />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-slate-200 rounded-lg">
                                {rounds.map((r) => (
                                  <SelectItem key={r.id} value={r.name} className="text-xs">{r.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="flex justify-end gap-1">
                              {c.status === 'pending' && (
                                <>
                                  <Button size="icon" variant="ghost" onClick={() => handleStatusChange(c.id, 'approved')} className="h-7 w-7 text-green-600 hover:bg-green-50">
                                    <Check className="w-4 h-4" />
                                  </Button>
                                  <Button size="icon" variant="ghost" onClick={() => handleStatusChange(c.id, 'rejected')} className="h-7 w-7 text-red-600 hover:bg-red-50">
                                    <X className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                              <Button size="icon" variant="ghost" onClick={() => window.open(`/${c.slug}`, '_blank')} className="h-7 w-7 text-slate-500 hover:text-pink-600">
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => handleDeleteContestant(c.id)} className="h-7 w-7 text-red-500 hover:bg-red-50">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {contestants.length === 0 && <p className="text-center text-slate-400 py-8">No contestants found</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories">
            <Card className="bg-white border-slate-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-syne text-lg">Contest Categories</CardTitle>
                  <Dialog open={categoryModalOpen} onOpenChange={setCategoryModalOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="btn-gradient" onClick={() => { setEditingCategory(null); setCategoryForm({ name: '', description: '', is_active: true }); }}>
                        <Plus className="w-4 h-4 mr-1.5" />Add Category
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white border-slate-200 rounded-2xl">
                      <DialogHeader>
                        <DialogTitle className="font-syne">{editingCategory ? 'Edit' : 'Add'} Category</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleCategorySubmit} className="space-y-4">
                        <div>
                          <Label className="text-slate-700 text-sm font-medium">Name</Label>
                          <Input value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} className="h-10 rounded-lg bg-slate-50 border-slate-200 mt-1" required />
                        </div>
                        <div>
                          <Label className="text-slate-700 text-sm font-medium">Description</Label>
                          <Input value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} className="h-10 rounded-lg bg-slate-50 border-slate-200 mt-1" />
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch checked={categoryForm.is_active} onCheckedChange={(v) => setCategoryForm({ ...categoryForm, is_active: v })} />
                          <Label className="text-slate-700 text-sm">Active</Label>
                        </div>
                        <Button type="submit" className="w-full btn-gradient">Save Category</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <h4 className="text-slate-900 font-medium text-sm">{cat.name}</h4>
                        <p className="text-slate-500 text-xs">{cat.description || 'No description'} • {cat.contestant_count} contestants</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${cat.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>
                          {cat.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <Button size="icon" variant="ghost" onClick={() => { setEditingCategory(cat); setCategoryForm({ name: cat.name, description: cat.description, is_active: cat.is_active }); setCategoryModalOpen(true); }} className="h-7 w-7 text-slate-500">
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDeleteCategory(cat.id)} className="h-7 w-7 text-red-500 hover:bg-red-50">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {categories.length === 0 && <p className="text-center text-slate-400 py-6 text-sm">No categories yet</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rounds Tab */}
          <TabsContent value="rounds">
            <Card className="bg-white border-slate-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-syne text-lg">Contest Rounds</CardTitle>
                  <Dialog open={roundModalOpen} onOpenChange={setRoundModalOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="btn-gradient" onClick={() => { setEditingRound(null); setRoundForm({ name: '', description: '', max_contestants: '', start_date: '', end_date: '', is_active: false }); }}>
                        <Plus className="w-4 h-4 mr-1.5" />Add Round
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white border-slate-200 rounded-2xl">
                      <DialogHeader>
                        <DialogTitle className="font-syne">{editingRound ? 'Edit' : 'Add'} Round</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleRoundSubmit} className="space-y-4">
                        <div>
                          <Label className="text-slate-700 text-sm font-medium">Name</Label>
                          <Input value={roundForm.name} onChange={(e) => setRoundForm({ ...roundForm, name: e.target.value })} placeholder="e.g., Top 50, Finals" className="h-10 rounded-lg bg-slate-50 border-slate-200 mt-1" required />
                        </div>
                        <div>
                          <Label className="text-slate-700 text-sm font-medium">Description</Label>
                          <Input value={roundForm.description} onChange={(e) => setRoundForm({ ...roundForm, description: e.target.value })} className="h-10 rounded-lg bg-slate-50 border-slate-200 mt-1" />
                        </div>
                        <div>
                          <Label className="text-slate-700 text-sm font-medium">Max Contestants</Label>
                          <Input type="number" value={roundForm.max_contestants} onChange={(e) => setRoundForm({ ...roundForm, max_contestants: e.target.value })} placeholder="50" className="h-10 rounded-lg bg-slate-50 border-slate-200 mt-1" />
                        </div>
                        <Button type="submit" className="w-full btn-gradient">Save Round</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {rounds.map((round, idx) => (
                    <div key={round.id} className={`flex items-center justify-between p-3 rounded-lg ${round.is_active ? 'bg-pink-50 border border-pink-200' : 'bg-slate-50'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${round.is_active ? 'bg-pink-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                          {idx + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-slate-900 font-medium text-sm">{round.name}</h4>
                            {round.is_active && <span className="px-1.5 py-0.5 text-[10px] font-bold bg-pink-500 text-white rounded">ACTIVE</span>}
                          </div>
                          <p className="text-slate-500 text-xs">{round.description || 'No description'}{round.max_contestants && ` • Max ${round.max_contestants}`}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!round.is_active && (
                          <Button size="sm" variant="outline" onClick={() => handleActivateRound(round.id)} className="h-7 text-xs border-pink-300 text-pink-600 hover:bg-pink-50">
                            Activate
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => { setEditingRound(round); setRoundForm({ name: round.name, description: round.description, max_contestants: round.max_contestants?.toString() || '', start_date: round.start_date || '', end_date: round.end_date || '', is_active: round.is_active }); setRoundModalOpen(true); }} className="h-7 w-7 text-slate-500">
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {rounds.length === 0 && <p className="text-center text-slate-400 py-6 text-sm">No rounds yet. Create rounds like "Top 50", "Finals"</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Votes Tab */}
          <TabsContent value="votes">
            <Card className="bg-white border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="font-syne text-lg">Recent Votes Activity</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {votes.map((vote, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Heart className="w-4 h-4 text-pink-500" />
                        <div>
                          <p className="text-slate-900 text-sm font-medium">{vote.email}</p>
                          <p className="text-slate-500 text-xs">Voted for contestant</p>
                        </div>
                      </div>
                      <p className="text-slate-400 text-xs">{formatDate(vote.created_at)}</p>
                    </div>
                  ))}
                  {votes.length === 0 && <p className="text-center text-slate-400 py-6 text-sm">No votes yet</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-white border-slate-200">
                <CardHeader className="pb-3">
                  <CardTitle className="font-syne text-lg flex items-center gap-2">
                    <Shield className="w-5 h-5 text-green-500" />Voting Security
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-slate-700">Email OTP Verification</span>
                    </div>
                    <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Active</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-slate-700">24-Hour Vote Limit</span>
                    </div>
                    <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Active</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-slate-700">Rate Limiting</span>
                    </div>
                    <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Active</span>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border-slate-200">
                <CardHeader className="pb-3">
                  <CardTitle className="font-syne text-lg flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />Fraud Detection
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-700">Suspicious IPs</span>
                    <span className="text-sm font-semibold text-slate-900">0</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-700">Blocked Voters</span>
                    <span className="text-sm font-semibold text-slate-900">0</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-700">Invalid Votes Removed</span>
                    <span className="text-sm font-semibold text-slate-900">0</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
