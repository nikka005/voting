import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { ContestantCard, ContestantCardSkeleton } from '../components/ContestantCard';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { contestantsAPI, categoriesAPI } from '../lib/api';
import { Search, Users, Sparkles } from 'lucide-react';

export default function ContestantsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [contestants, setContestants] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || 'all');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = { status: 'approved' };
        if (search) params.search = search;
        if (categoryFilter && categoryFilter !== 'all') params.category_id = categoryFilter;

        const [contestantsRes, categoriesRes] = await Promise.all([
          contestantsAPI.getAll(params),
          categoriesAPI.getAll(true),
        ]);
        setContestants(contestantsRes.data);
        setCategories(categoriesRes.data);
      } catch (error) {
        console.error('Failed to fetch contestants:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [search, categoryFilter]);

  const handleSearchChange = (value) => {
    setSearch(value);
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set('search', value);
    } else {
      params.delete('search');
    }
    setSearchParams(params);
  };

  const handleCategoryChange = (value) => {
    setCategoryFilter(value);
    const params = new URLSearchParams(searchParams);
    if (value && value !== 'all') {
      params.set('category', value);
    } else {
      params.delete('category');
    }
    setSearchParams(params);
  };

  return (
    <Layout>
      {/* Header */}
      <section className="pt-8 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Hero Banner */}
          <div className="relative mb-12 p-8 md:p-12 rounded-3xl bg-gradient-to-r from-pink-500 via-violet-500 to-cyan-500 overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVHJhbnNmb3JtPSJyb3RhdGUoNDUpIj48cmVjdCB3aWR0aD0iMiIgaGVpZ2h0PSI0MCIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCBmaWxsPSJ1cmwoI2EpIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+')] opacity-30" />
            <div className="relative z-10 text-center">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 mb-4 text-xs font-bold uppercase tracking-wider text-white/90 bg-white/20 rounded-full backdrop-blur-sm">
                <Sparkles className="w-3 h-3" />
                2026 Competition
              </span>
              <h1 className="font-syne text-3xl md:text-5xl font-bold text-white mb-3">Our Amazing Contestants</h1>
              <p className="text-white/80 max-w-xl mx-auto">
                Discover talented individuals from around the world. Cast your vote and support your favorites!
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                type="text"
                placeholder="Search contestants..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-12 h-12 rounded-xl bg-white border-slate-200 shadow-sm focus:border-pink-500 focus:ring-pink-500/20"
                data-testid="search-input"
              />
            </div>
            <Select value={categoryFilter} onValueChange={handleCategoryChange}>
              <SelectTrigger className="w-full sm:w-56 h-12 rounded-xl bg-white border-slate-200 shadow-sm" data-testid="category-filter">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200 rounded-xl">
                <SelectItem value="all" className="rounded-lg">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id} className="rounded-lg">
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Contestants Grid */}
      <section className="pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array(8).fill(0).map((_, i) => <ContestantCardSkeleton key={i} />)}
            </div>
          ) : contestants.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {contestants.map((contestant) => (
                <ContestantCard key={contestant.id} contestant={contestant} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-pink-100 flex items-center justify-center">
                <Users className="w-12 h-12 text-pink-400" />
              </div>
              <h3 className="font-syne text-2xl font-bold text-slate-900 mb-2">No Contestants Found</h3>
              <p className="text-slate-500">
                {search || categoryFilter !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Be the first to join the competition!'
                }
              </p>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
