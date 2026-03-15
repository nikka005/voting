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
  BarChart3,
  Settings,
  Loader2,
  Search,
  Eye,
  Trophy
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

  // Modal states
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [roundModalOpen, setRoundModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingRound, setEditingRound] = useState(null);

  // Form states
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', is_active: true });
  const [roundForm, setRoundForm] = useState({ 
    name: '', description: '', max_contestants: '', start_date: '', end_date: '', is_active: false 
  });

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

  // Category handlers
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

  // Round handlers
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
          <Loader2 className="w-8 h-8 text-gold animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-serif text-3xl md:text-4xl text-white mb-2">Admin Panel</h1>
          <p className="text-white/50">Manage your contest platform</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white/[0.02] border-white/5" data-testid="admin-stat-contestants">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/60">Contestants</CardTitle>
              <Users className="w-5 h-5 text-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{formatNumber(stats?.total_contestants || 0)}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/[0.02] border-white/5" data-testid="admin-stat-votes">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/60">Total Votes</CardTitle>
              <Heart className="w-5 h-5 text-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{formatNumber(stats?.total_votes || 0)}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/[0.02] border-white/5" data-testid="admin-stat-categories">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/60">Categories</CardTitle>
              <Crown className="w-5 h-5 text-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats?.total_categories || 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/[0.02] border-white/5" data-testid="admin-stat-pending">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/60">Pending</CardTitle>
              <Clock className="w-5 h-5 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{stats?.pending_approvals || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="contestants" className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="contestants" className="data-[state=active]:bg-gold data-[state=active]:text-black" data-testid="tab-contestants">
              <Users className="w-4 h-4 mr-2" />
              Contestants
            </TabsTrigger>
            <TabsTrigger value="categories" className="data-[state=active]:bg-gold data-[state=active]:text-black" data-testid="tab-categories">
              <Crown className="w-4 h-4 mr-2" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="rounds" className="data-[state=active]:bg-gold data-[state=active]:text-black" data-testid="tab-rounds">
              <Trophy className="w-4 h-4 mr-2" />
              Rounds
            </TabsTrigger>
          </TabsList>

          {/* Contestants Tab */}
          <TabsContent value="contestants">
            <Card className="bg-white/[0.02] border-white/5">
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <CardTitle className="text-white">Manage Contestants</CardTitle>
                  <div className="flex gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <Input
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-white/5 border-white/10 text-white w-48"
                        data-testid="contestant-search"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-36 bg-white/5 border-white/10 text-white" data-testid="status-filter">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0a0a0a] border-white/10">
                        <SelectItem value="all" className="text-white">All Status</SelectItem>
                        <SelectItem value="pending" className="text-white">Pending</SelectItem>
                        <SelectItem value="approved" className="text-white">Approved</SelectItem>
                        <SelectItem value="rejected" className="text-white">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 px-4 text-white/60 text-sm font-medium">Contestant</th>
                        <th className="text-left py-3 px-4 text-white/60 text-sm font-medium">Category</th>
                        <th className="text-left py-3 px-4 text-white/60 text-sm font-medium">Votes</th>
                        <th className="text-left py-3 px-4 text-white/60 text-sm font-medium">Status</th>
                        <th className="text-left py-3 px-4 text-white/60 text-sm font-medium">Round</th>
                        <th className="text-right py-3 px-4 text-white/60 text-sm font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contestants.map((c) => (
                        <tr key={c.id} className="border-b border-white/5 hover:bg-white/[0.02]" data-testid={`contestant-row-${c.id}`}>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full overflow-hidden bg-white/5">
                                {c.photos?.[0] && (
                                  <img src={c.photos[0]} alt="" className="w-full h-full object-cover" />
                                )}
                              </div>
                              <div>
                                <p className="text-white font-medium">{c.full_name}</p>
                                <p className="text-white/40 text-xs">{c.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-white/60">{c.category_name || '-'}</td>
                          <td className="py-3 px-4 text-white">{formatNumber(c.vote_count)}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex px-2 py-1 text-xs rounded ${
                              c.status === 'approved' ? 'bg-green-500/10 text-green-500' :
                              c.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                              'bg-red-500/10 text-red-500'
                            }`}>
                              {c.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <Select
                              value={c.round || ''}
                              onValueChange={(v) => handleAssignRound(c.id, v)}
                            >
                              <SelectTrigger className="w-32 h-8 bg-white/5 border-white/10 text-white text-xs">
                                <SelectValue placeholder="Assign" />
                              </SelectTrigger>
                              <SelectContent className="bg-[#0a0a0a] border-white/10">
                                {rounds.map((r) => (
                                  <SelectItem key={r.id} value={r.name} className="text-white text-xs">
                                    {r.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex justify-end gap-2">
                              {c.status === 'pending' && (
                                <>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleStatusChange(c.id, 'approved')}
                                    className="h-8 w-8 text-green-500 hover:bg-green-500/10"
                                    data-testid={`approve-${c.id}`}
                                  >
                                    <Check className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleStatusChange(c.id, 'rejected')}
                                    className="h-8 w-8 text-red-500 hover:bg-red-500/10"
                                    data-testid={`reject-${c.id}`}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => window.open(`/${c.slug}`, '_blank')}
                                className="h-8 w-8 text-white/60 hover:text-white"
                                data-testid={`view-${c.id}`}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDeleteContestant(c.id)}
                                className="h-8 w-8 text-red-500 hover:bg-red-500/10"
                                data-testid={`delete-${c.id}`}
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
                    <p className="text-center text-white/40 py-8">No contestants found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories">
            <Card className="bg-white/[0.02] border-white/5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">Contest Categories</CardTitle>
                  <Dialog open={categoryModalOpen} onOpenChange={setCategoryModalOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        className="bg-gold hover:bg-gold-light text-black rounded-full"
                        onClick={() => { setEditingCategory(null); setCategoryForm({ name: '', description: '', is_active: true }); }}
                        data-testid="add-category-btn"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Category
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#0a0a0a] border-white/10">
                      <DialogHeader>
                        <DialogTitle className="text-white">{editingCategory ? 'Edit' : 'Add'} Category</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleCategorySubmit} className="space-y-4" data-testid="category-form">
                        <div className="space-y-2">
                          <Label className="text-white/70">Name</Label>
                          <Input
                            value={categoryForm.name}
                            onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                            className="bg-white/5 border-white/10 text-white"
                            required
                            data-testid="category-name-input"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white/70">Description</Label>
                          <Input
                            value={categoryForm.description}
                            onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                            className="bg-white/5 border-white/10 text-white"
                            data-testid="category-desc-input"
                          />
                        </div>
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={categoryForm.is_active}
                            onCheckedChange={(v) => setCategoryForm({ ...categoryForm, is_active: v })}
                            data-testid="category-active-switch"
                          />
                          <Label className="text-white/70">Active</Label>
                        </div>
                        <Button type="submit" className="w-full bg-gold hover:bg-gold-light text-black" data-testid="save-category-btn">
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
                    <div 
                      key={cat.id} 
                      className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-sm"
                      data-testid={`category-item-${cat.id}`}
                    >
                      <div>
                        <h4 className="text-white font-medium">{cat.name}</h4>
                        <p className="text-white/40 text-sm">{cat.description || 'No description'}</p>
                        <p className="text-white/30 text-xs mt-1">{cat.contestant_count} contestants</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs rounded ${cat.is_active ? 'bg-green-500/10 text-green-500' : 'bg-white/5 text-white/40'}`}>
                          {cat.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditCategory(cat)}
                          className="h-8 w-8 text-white/60 hover:text-white"
                          data-testid={`edit-category-${cat.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="h-8 w-8 text-red-500 hover:bg-red-500/10"
                          data-testid={`delete-category-${cat.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {categories.length === 0 && (
                    <p className="text-center text-white/40 py-8">No categories yet. Create one to get started!</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rounds Tab */}
          <TabsContent value="rounds">
            <Card className="bg-white/[0.02] border-white/5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">Contest Rounds</CardTitle>
                  <Dialog open={roundModalOpen} onOpenChange={setRoundModalOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        className="bg-gold hover:bg-gold-light text-black rounded-full"
                        onClick={() => { setEditingRound(null); setRoundForm({ name: '', description: '', max_contestants: '', start_date: '', end_date: '', is_active: false }); }}
                        data-testid="add-round-btn"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Round
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#0a0a0a] border-white/10">
                      <DialogHeader>
                        <DialogTitle className="text-white">{editingRound ? 'Edit' : 'Add'} Round</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleRoundSubmit} className="space-y-4" data-testid="round-form">
                        <div className="space-y-2">
                          <Label className="text-white/70">Name</Label>
                          <Input
                            value={roundForm.name}
                            onChange={(e) => setRoundForm({ ...roundForm, name: e.target.value })}
                            placeholder="e.g., Top 50, Semi-Finals"
                            className="bg-white/5 border-white/10 text-white"
                            required
                            data-testid="round-name-input"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white/70">Description</Label>
                          <Input
                            value={roundForm.description}
                            onChange={(e) => setRoundForm({ ...roundForm, description: e.target.value })}
                            className="bg-white/5 border-white/10 text-white"
                            data-testid="round-desc-input"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white/70">Max Contestants (optional)</Label>
                          <Input
                            type="number"
                            value={roundForm.max_contestants}
                            onChange={(e) => setRoundForm({ ...roundForm, max_contestants: e.target.value })}
                            placeholder="50"
                            className="bg-white/5 border-white/10 text-white"
                            data-testid="round-max-input"
                          />
                        </div>
                        <Button type="submit" className="w-full bg-gold hover:bg-gold-light text-black" data-testid="save-round-btn">
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
                    <div 
                      key={round.id} 
                      className={`flex items-center justify-between p-4 border rounded-sm ${round.is_active ? 'bg-gold/5 border-gold/30' : 'bg-white/[0.02] border-white/5'}`}
                      data-testid={`round-item-${round.id}`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-white font-medium">{round.name}</h4>
                          {round.is_active && (
                            <span className="px-2 py-0.5 text-xs bg-gold text-black rounded-full">Active</span>
                          )}
                        </div>
                        <p className="text-white/40 text-sm">{round.description || 'No description'}</p>
                        {round.max_contestants && (
                          <p className="text-white/30 text-xs mt-1">Max: {round.max_contestants} contestants</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {!round.is_active && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleActivateRound(round.id)}
                            className="border-gold/50 text-gold hover:bg-gold hover:text-black"
                            data-testid={`activate-round-${round.id}`}
                          >
                            Activate
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditRound(round)}
                          className="h-8 w-8 text-white/60 hover:text-white"
                          data-testid={`edit-round-${round.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {rounds.length === 0 && (
                    <p className="text-center text-white/40 py-8">No rounds yet. Create rounds like "Top 50", "Semi-Finals", "Finals"</p>
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
