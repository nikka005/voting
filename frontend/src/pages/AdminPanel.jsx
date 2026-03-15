import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Switch } from '../components/ui/switch';
import { adminAPI, contestantsAPI, categoriesAPI, roundsAPI } from '../lib/api';
import { formatNumber, formatDate } from '../lib/utils';
import { toast } from 'sonner';
import {
  Users,
  Heart,
  Crown,
  Clock,
  Plus,
  Trash2,
  Check,
  X,
  Edit,
  Loader2,
  Search,
  Eye,
  Trophy,
  Sparkles,
  Settings
} from 'lucide-react';

export default function AdminPanel() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [contestants, setContestants] = useState([]);
  const [categories, setCategories] = useState([]);
  const [rounds, setRounds] = useState([]);
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
      const [statsRes, categoriesRes, roundsRes] = await Promise.all([
        adminAPI.getStats(),
        categoriesAPI.getAll(),
        roundsAPI.getAll(),
      ]);
      setStats(statsRes.data);
      setCategories(categoriesRes.data);
      setRounds(roundsRes.data);
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
    if (!isAdmin) {
      navigate('/');
      return;
    }
    fetchData();
  }, [isAdmin, navigate, fetchData]);

  useEffect(() => {
    if (isAdmin) {
      fetchContestants();
    }
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

  const openEditCategory = (cat) => {
    setEditingCategory(cat);
    setCategoryForm({ name: cat.name, description: cat.description, is_active: cat.is_active });
    setCategoryModalOpen(true);
  };

  const handleRoundSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...roundForm,
        max_contestants: roundForm.max_contestants ? parseInt(roundForm.max_contestants) : null,
      };
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

  const openEditRound = (round) => {
    setEditingRound(round);
    setRoundForm({
      name: round.name,
      description: round.description,
      max_contestants: round.max_contestants?.toString() || '',
      start_date: round.start_date || '',
      end_date: round.end_date || '',
      is_active: round.is_active,
    });
    setRoundModalOpen(true);
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
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-syne text-3xl md:text-4xl font-bold text-slate-900">Admin Panel</h1>
              <p className="text-slate-500">Manage your contest platform</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-pink-50 to-rose-50 border-pink-100" data-testid="admin-stat-contestants">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-pink-700">Contestants</CardTitle>
              <Users className="w-5 h-5 text-pink-500" />
            </CardHeader>
            <CardContent>
              <div className="font-syne text-3xl font-bold text-pink-600">{formatNumber(stats?.total_contestants || 0)}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-violet-50 to-purple-50 border-violet-100" data-testid="admin-stat-votes">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-violet-700">Total Votes</CardTitle>
              <Heart className="w-5 h-5 text-violet-500" />
            </CardHeader>
            <CardContent>
              <div className="font-syne text-3xl font-bold text-violet-600">{formatNumber(stats?.total_votes || 0)}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-100" data-testid="admin-stat-categories">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-cyan-700">Categories</CardTitle>
              <Crown className="w-5 h-5 text-cyan-500" />
            </CardHeader>
            <CardContent>
              <div className="font-syne text-3xl font-bold text-cyan-600">{stats?.total_categories || 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100" data-testid="admin-stat-pending">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-amber-700">Pending</CardTitle>
              <Clock className="w-5 h-5 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="font-syne text-3xl font-bold text-amber-600">{stats?.pending_approvals || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="contestants" className="space-y-6">
          <TabsList className="bg-white border border-slate-200 rounded-2xl p-1">
            <TabsTrigger value="contestants" className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-violet-500 data-[state=active]:text-white" data-testid="tab-contestants">
              <Users className="w-4 h-4 mr-2" />
              Contestants
            </TabsTrigger>
            <TabsTrigger value="categories" className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-violet-500 data-[state=active]:text-white" data-testid="tab-categories">
              <Crown className="w-4 h-4 mr-2" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="rounds" className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-violet-500 data-[state=active]:text-white" data-testid="tab-rounds">
              <Trophy className="w-4 h-4 mr-2" />
              Rounds
            </TabsTrigger>
          </TabsList>

          {/* Contestants Tab */}
          <TabsContent value="contestants">
            <Card className="bg-white border-slate-200 shadow-sm rounded-2xl">
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <CardTitle className="font-syne text-slate-900">Manage Contestants</CardTitle>
                  <div className="flex gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-10 rounded-xl bg-slate-50 border-slate-200 w-48"
                        data-testid="contestant-search"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-36 h-10 rounded-xl bg-slate-50 border-slate-200" data-testid="status-filter">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200 rounded-xl">
                        <SelectItem value="all" className="rounded-lg">All Status</SelectItem>
                        <SelectItem value="pending" className="rounded-lg">Pending</SelectItem>
                        <SelectItem value="approved" className="rounded-lg">Approved</SelectItem>
                        <SelectItem value="rejected" className="rounded-lg">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left py-3 px-4 text-slate-500 text-sm font-semibold">Contestant</th>
                        <th className="text-left py-3 px-4 text-slate-500 text-sm font-semibold">Category</th>
                        <th className="text-left py-3 px-4 text-slate-500 text-sm font-semibold">Votes</th>
                        <th className="text-left py-3 px-4 text-slate-500 text-sm font-semibold">Status</th>
                        <th className="text-left py-3 px-4 text-slate-500 text-sm font-semibold">Round</th>
                        <th className="text-right py-3 px-4 text-slate-500 text-sm font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contestants.map((c) => (
                        <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50" data-testid={`contestant-row-${c.id}`}>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100">
                                {c.photos?.[0] && (
                                  <img src={c.photos[0]} alt="" className="w-full h-full object-cover" />
                                )}
                              </div>
                              <div>
                                <p className="text-slate-900 font-semibold">{c.full_name}</p>
                                <p className="text-slate-400 text-xs">{c.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-600">{c.category_name || '-'}</td>
                          <td className="py-3 px-4 font-semibold text-slate-900">{formatNumber(c.vote_count)}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-full ${
                              c.status === 'approved' ? 'bg-green-100 text-green-700' :
                              c.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {c.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <Select
                              value={c.round || ''}
                              onValueChange={(v) => handleAssignRound(c.id, v)}
                            >
                              <SelectTrigger className="w-32 h-8 rounded-lg bg-slate-50 border-slate-200 text-xs">
                                <SelectValue placeholder="Assign" />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-slate-200 rounded-lg">
                                {rounds.map((r) => (
                                  <SelectItem key={r.id} value={r.name} className="text-xs">
                                    {r.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex justify-end gap-1">
                              {c.status === 'pending' && (
                                <>
                                  <Button size="icon" variant="ghost" onClick={() => handleStatusChange(c.id, 'approved')} className="h-8 w-8 text-green-600 hover:bg-green-50" data-testid={`approve-${c.id}`}>
                                    <Check className="w-4 h-4" />
                                  </Button>
                                  <Button size="icon" variant="ghost" onClick={() => handleStatusChange(c.id, 'rejected')} className="h-8 w-8 text-red-600 hover:bg-red-50" data-testid={`reject-${c.id}`}>
                                    <X className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                              <Button size="icon" variant="ghost" onClick={() => window.open(`/${c.slug}`, '_blank')} className="h-8 w-8 text-slate-500 hover:text-pink-600" data-testid={`view-${c.id}`}>
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => handleDeleteContestant(c.id)} className="h-8 w-8 text-red-500 hover:bg-red-50" data-testid={`delete-${c.id}`}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {contestants.length === 0 && (
                    <p className="text-center text-slate-400 py-8">No contestants found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories">
            <Card className="bg-white border-slate-200 shadow-sm rounded-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-syne text-slate-900">Contest Categories</CardTitle>
                  <Dialog open={categoryModalOpen} onOpenChange={setCategoryModalOpen}>
                    <DialogTrigger asChild>
                      <Button className="btn-gradient btn-jelly" onClick={() => { setEditingCategory(null); setCategoryForm({ name: '', description: '', is_active: true }); }} data-testid="add-category-btn">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Category
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white border-slate-200 rounded-2xl">
                      <DialogHeader>
                        <DialogTitle className="font-syne text-slate-900">{editingCategory ? 'Edit' : 'Add'} Category</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleCategorySubmit} className="space-y-4" data-testid="category-form">
                        <div className="space-y-2">
                          <Label className="text-slate-700 font-semibold">Name</Label>
                          <Input
                            value={categoryForm.name}
                            onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                            className="h-11 rounded-xl bg-slate-50 border-slate-200"
                            required
                            data-testid="category-name-input"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-700 font-semibold">Description</Label>
                          <Input
                            value={categoryForm.description}
                            onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                            className="h-11 rounded-xl bg-slate-50 border-slate-200"
                            data-testid="category-desc-input"
                          />
                        </div>
                        <div className="flex items-center gap-3">
                          <Switch checked={categoryForm.is_active} onCheckedChange={(v) => setCategoryForm({ ...categoryForm, is_active: v })} data-testid="category-active-switch" />
                          <Label className="text-slate-700">Active</Label>
                        </div>
                        <Button type="submit" className="w-full h-11 btn-gradient btn-jelly" data-testid="save-category-btn">
                          Save Category
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {categories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl" data-testid={`category-item-${cat.id}`}>
                      <div>
                        <h4 className="text-slate-900 font-semibold">{cat.name}</h4>
                        <p className="text-slate-500 text-sm">{cat.description || 'No description'}</p>
                        <p className="text-slate-400 text-xs mt-1">{cat.contestant_count} contestants</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${cat.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>
                          {cat.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <Button size="icon" variant="ghost" onClick={() => openEditCategory(cat)} className="h-8 w-8 text-slate-500 hover:text-pink-600" data-testid={`edit-category-${cat.id}`}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDeleteCategory(cat.id)} className="h-8 w-8 text-red-500 hover:bg-red-50" data-testid={`delete-category-${cat.id}`}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {categories.length === 0 && (
                    <p className="text-center text-slate-400 py-8">No categories yet. Create one to get started!</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rounds Tab */}
          <TabsContent value="rounds">
            <Card className="bg-white border-slate-200 shadow-sm rounded-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-syne text-slate-900">Contest Rounds</CardTitle>
                  <Dialog open={roundModalOpen} onOpenChange={setRoundModalOpen}>
                    <DialogTrigger asChild>
                      <Button className="btn-gradient btn-jelly" onClick={() => { setEditingRound(null); setRoundForm({ name: '', description: '', max_contestants: '', start_date: '', end_date: '', is_active: false }); }} data-testid="add-round-btn">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Round
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white border-slate-200 rounded-2xl">
                      <DialogHeader>
                        <DialogTitle className="font-syne text-slate-900">{editingRound ? 'Edit' : 'Add'} Round</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleRoundSubmit} className="space-y-4" data-testid="round-form">
                        <div className="space-y-2">
                          <Label className="text-slate-700 font-semibold">Name</Label>
                          <Input
                            value={roundForm.name}
                            onChange={(e) => setRoundForm({ ...roundForm, name: e.target.value })}
                            placeholder="e.g., Top 50, Semi-Finals"
                            className="h-11 rounded-xl bg-slate-50 border-slate-200"
                            required
                            data-testid="round-name-input"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-700 font-semibold">Description</Label>
                          <Input
                            value={roundForm.description}
                            onChange={(e) => setRoundForm({ ...roundForm, description: e.target.value })}
                            className="h-11 rounded-xl bg-slate-50 border-slate-200"
                            data-testid="round-desc-input"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-700 font-semibold">Max Contestants (optional)</Label>
                          <Input
                            type="number"
                            value={roundForm.max_contestants}
                            onChange={(e) => setRoundForm({ ...roundForm, max_contestants: e.target.value })}
                            placeholder="50"
                            className="h-11 rounded-xl bg-slate-50 border-slate-200"
                            data-testid="round-max-input"
                          />
                        </div>
                        <Button type="submit" className="w-full h-11 btn-gradient btn-jelly" data-testid="save-round-btn">
                          Save Round
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {rounds.map((round) => (
                    <div key={round.id} className={`flex items-center justify-between p-4 rounded-xl ${round.is_active ? 'bg-gradient-to-r from-pink-50 to-violet-50 border-2 border-pink-200' : 'bg-slate-50'}`} data-testid={`round-item-${round.id}`}>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-slate-900 font-semibold">{round.name}</h4>
                          {round.is_active && (
                            <span className="px-2.5 py-0.5 text-xs font-bold bg-gradient-to-r from-pink-500 to-violet-500 text-white rounded-full">Active</span>
                          )}
                        </div>
                        <p className="text-slate-500 text-sm">{round.description || 'No description'}</p>
                        {round.max_contestants && (
                          <p className="text-slate-400 text-xs mt-1">Max: {round.max_contestants} contestants</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {!round.is_active && (
                          <Button size="sm" variant="outline" onClick={() => handleActivateRound(round.id)} className="border-pink-300 text-pink-600 hover:bg-pink-50 rounded-lg" data-testid={`activate-round-${round.id}`}>
                            Activate
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => openEditRound(round)} className="h-8 w-8 text-slate-500 hover:text-pink-600" data-testid={`edit-round-${round.id}`}>
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {rounds.length === 0 && (
                    <p className="text-center text-slate-400 py-8">No rounds yet. Create rounds like "Top 50", "Semi-Finals", "Finals"</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
