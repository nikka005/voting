import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { ContestantCard, ContestantCardSkeleton } from '../components/ContestantCard';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { contestantsAPI, categoriesAPI } from '../lib/api';
import { Search, Users, Filter } from 'lucide-react';

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
          <div className="text-center mb-12">
            <span className="text-gold text-sm uppercase tracking-widest mb-4 block">2026 Competition</span>
            <h1 className="font-serif text-4xl md:text-6xl text-white mb-4">Our Contestants</h1>
            <p className="text-white/50 max-w-xl mx-auto">
              Discover talented individuals from around the world competing for glory
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
              <Input
                type="text"
                placeholder="Search contestants..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-gold"
                data-testid="search-input"
              />
            </div>
            <Select value={categoryFilter} onValueChange={handleCategoryChange}>
              <SelectTrigger className="w-full sm:w-48 bg-white/5 border-white/10 text-white" data-testid="category-filter">
                <Filter className="w-4 h-4 mr-2 text-white/50" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent className="bg-[#0a0a0a] border-white/10">
                <SelectItem value="all" className="text-white hover:bg-white/5">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id} className="text-white hover:bg-white/5">
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
              <Users className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <h3 className="font-serif text-2xl text-white mb-2">No Contestants Found</h3>
              <p className="text-white/50">
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
