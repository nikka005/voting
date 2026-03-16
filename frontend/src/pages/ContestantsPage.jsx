import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { contestantsAPI, categoriesAPI } from '../lib/api';
import { formatNumber, getPlaceholderImage } from '../lib/utils';
import { 
  Search, Heart, Filter, SlidersHorizontal, Grid, List,
  ChevronDown, Loader2, Trophy, TrendingUp, Clock, Star,
  MapPin, Crown, X
} from 'lucide-react';

export default function ContestantsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [contestants, setContestants] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all');
  const [sortBy, setSortBy] = useState('votes');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [contestantsRes, categoriesRes] = await Promise.all([
          contestantsAPI.getAll({ status: 'approved', limit: 100 }),
          categoriesAPI.getAll(true)
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
  }, []);

  // Filter and sort contestants
  const filteredContestants = useMemo(() => {
    let result = [...contestants];
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.full_name.toLowerCase().includes(query) ||
        c.location?.toLowerCase().includes(query) ||
        c.bio?.toLowerCase().includes(query)
      );
    }
    
    // Category filter
    if (selectedCategory && selectedCategory !== 'all') {
      result = result.filter(c => c.category_id === selectedCategory);
    }
    
    // Sorting
    switch (sortBy) {
      case 'votes':
        result.sort((a, b) => b.vote_count - a.vote_count);
        break;
      case 'newest':
        result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
      case 'name':
        result.sort((a, b) => a.full_name.localeCompare(b.full_name));
        break;
      case 'trending':
        // Mock trending - in production use actual trending data
        result.sort((a, b) => b.vote_count - a.vote_count);
        break;
      default:
        break;
    }
    
    return result;
  }, [contestants, searchQuery, selectedCategory, sortBy]);

  const handleCategoryChange = (value) => {
    setSelectedCategory(value);
    if (value !== 'all') {
      setSearchParams({ category: value });
    } else {
      setSearchParams({});
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSortBy('votes');
    setSearchParams({});
  };

  const hasActiveFilters = searchQuery || selectedCategory !== 'all';

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-10 h-10 text-pink-500 animate-spin mx-auto mb-4" />
            <p className="text-slate-500">Loading contestants...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <section className="bg-gradient-to-br from-slate-50 via-pink-50/30 to-violet-50/30 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 py-12 md:py-16">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-pink-500/10 to-violet-500/10 border border-pink-200 mb-6">
              <Star className="w-4 h-4 text-pink-500" />
              <span className="text-sm font-semibold text-pink-600">{filteredContestants.length} Contestants</span>
            </div>
            <h1 className="font-syne text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Browse <span className="gradient-text">Contestants</span>
            </h1>
            <p className="text-lg text-slate-600">
              Discover amazing talents and cast your vote for your favorites
            </p>
          </div>
        </div>
      </section>

      {/* Filters Bar */}
      <section className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search by name or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 rounded-xl bg-slate-50 border-slate-200 focus:border-pink-300 focus:ring-pink-200"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Desktop Filters */}
            <div className="hidden md:flex items-center gap-3">
              {/* Category Filter */}
              <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                <SelectTrigger className="w-48 h-12 rounded-xl bg-slate-50 border-slate-200">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-slate-400" />
                    <SelectValue placeholder="All Categories" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 rounded-xl">
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-44 h-12 rounded-xl bg-slate-50 border-slate-200">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-slate-400" />
                    <SelectValue placeholder="Sort by" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 rounded-xl">
                  <SelectItem value="votes">Most Votes</SelectItem>
                  <SelectItem value="trending">Trending</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="name">A-Z</SelectItem>
                </SelectContent>
              </Select>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  onClick={clearFilters}
                  className="text-pink-600 hover:text-pink-700 hover:bg-pink-50"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>

            {/* Mobile Filter Toggle */}
            <div className="flex md:hidden items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className={`flex-1 h-12 rounded-xl ${showFilters ? 'bg-pink-50 border-pink-300' : ''}`}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
                {hasActiveFilters && (
                  <span className="ml-2 w-5 h-5 rounded-full bg-pink-500 text-white text-xs flex items-center justify-center">
                    {(searchQuery ? 1 : 0) + (selectedCategory !== 'all' ? 1 : 0)}
                  </span>
                )}
              </Button>
              <div className="flex border border-slate-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-3 ${viewMode === 'grid' ? 'bg-pink-50 text-pink-600' : 'text-slate-400'}`}
                >
                  <Grid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-3 ${viewMode === 'list' ? 'bg-pink-50 text-pink-600' : 'text-slate-400'}`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Filters Dropdown */}
          {showFilters && (
            <div className="md:hidden mt-4 p-4 bg-slate-50 rounded-xl space-y-4">
              <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                <SelectTrigger className="w-full h-12 rounded-xl bg-white">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent className="bg-white rounded-xl">
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full h-12 rounded-xl bg-white">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent className="bg-white rounded-xl">
                  <SelectItem value="votes">Most Votes</SelectItem>
                  <SelectItem value="trending">Trending</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="name">A-Z</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button onClick={clearFilters} variant="outline" className="w-full">
                  Clear All Filters
                </Button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Results */}
      <section className="py-8 md:py-12 bg-slate-50 min-h-[60vh]">
        <div className="max-w-7xl mx-auto px-4">
          {/* Results Count */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-slate-600">
              Showing <span className="font-semibold text-slate-900">{filteredContestants.length}</span> contestants
            </p>
            <div className="hidden md:flex border border-slate-200 rounded-xl overflow-hidden bg-white">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-4 py-2 ${viewMode === 'grid' ? 'bg-pink-50 text-pink-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 ${viewMode === 'list' ? 'bg-pink-50 text-pink-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Contestants Grid/List */}
          {filteredContestants.length > 0 ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                {filteredContestants.map((contestant, idx) => (
                  <ContestantCard key={contestant.id} contestant={contestant} rank={idx + 1} />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredContestants.map((contestant, idx) => (
                  <ContestantListItem key={contestant.id} contestant={contestant} rank={idx + 1} />
                ))}
              </div>
            )
          ) : (
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-100 flex items-center justify-center">
                <Search className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="font-syne text-xl font-bold text-slate-900 mb-2">No contestants found</h3>
              <p className="text-slate-500 mb-6">Try adjusting your search or filters</p>
              <Button onClick={clearFilters} className="btn-gradient">
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}

// Grid Card Component
function ContestantCard({ contestant, rank }) {
  return (
    <Link to={`/${contestant.slug}`} className="group">
      <div className="relative rounded-2xl overflow-hidden bg-white shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1">
        <div className="aspect-[3/4] overflow-hidden">
          <img 
            src={contestant.photos?.[0] || getPlaceholderImage(rank)} 
            alt={contestant.full_name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        </div>
        
        {/* Rank Badge */}
        <div className={`absolute top-3 left-3 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shadow-lg ${
          rank === 1 ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-amber-900' :
          rank === 2 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-slate-800' :
          rank === 3 ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white' :
          'bg-white/90 backdrop-blur text-slate-700'
        }`}>
          {rank}
        </div>

        {/* Quick Vote Badge */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="px-3 py-1.5 bg-gradient-to-r from-pink-500 to-violet-500 rounded-full text-white text-xs font-semibold flex items-center gap-1 shadow-lg">
            <Heart className="w-3 h-3" />
            Vote
          </div>
        </div>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        
        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="font-syne text-lg font-bold text-white truncate mb-1">{contestant.full_name}</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-white/80 text-sm">
              <Heart className="w-3.5 h-3.5 text-pink-400" />
              <span className="font-medium">{formatNumber(contestant.vote_count)}</span>
            </div>
            {contestant.location && (
              <div className="flex items-center gap-1 text-white/60 text-xs">
                <MapPin className="w-3 h-3" />
                <span className="truncate max-w-[80px]">{contestant.location}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

// List Item Component
function ContestantListItem({ contestant, rank }) {
  return (
    <Link to={`/${contestant.slug}`} className="block">
      <div className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow hover:shadow-lg transition-all hover:-translate-y-0.5">
        {/* Rank */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold flex-shrink-0 ${
          rank === 1 ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-amber-900' :
          rank === 2 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-slate-800' :
          rank === 3 ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white' :
          'bg-slate-100 text-slate-600'
        }`}>
          {rank}
        </div>

        {/* Photo */}
        <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
          <img 
            src={contestant.photos?.[0] || getPlaceholderImage(rank)} 
            alt={contestant.full_name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 truncate">{contestant.full_name}</h3>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            {contestant.category_name && (
              <span className="px-2 py-0.5 bg-pink-50 text-pink-600 rounded-full text-xs">
                {contestant.category_name}
              </span>
            )}
            {contestant.location && (
              <span className="flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3" />
                {contestant.location}
              </span>
            )}
          </div>
        </div>

        {/* Votes */}
        <div className="text-right flex-shrink-0">
          <p className="font-bold text-pink-500 text-lg">{formatNumber(contestant.vote_count)}</p>
          <p className="text-xs text-slate-400">votes</p>
        </div>

        {/* Vote Button */}
        <Button size="sm" className="btn-gradient flex-shrink-0">
          <Heart className="w-4 h-4 mr-1" />
          Vote
        </Button>
      </div>
    </Link>
  );
}
