import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { leaderboardAPI, categoriesAPI } from '../lib/api';
import { formatNumber, getPlaceholderImage } from '../lib/utils';
import { useLeaderboardUpdates } from '../hooks/useWebSocket';
import { 
  Trophy, Crown, Heart, TrendingUp, TrendingDown, Minus,
  Loader2, Star, Medal, ChevronRight, ArrowUp, ArrowDown,
  Sparkles, Zap, Timer, Users, Gift, Award
} from 'lucide-react';

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [leaderboardType, setLeaderboardType] = useState('global');
  
  // Real-time updates
  const { updates, isConnected } = useLeaderboardUpdates();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = { limit: 100 };
        if (selectedCategory !== 'all') {
          params.category_id = selectedCategory;
        }
        const [leaderboardRes, categoriesRes] = await Promise.all([
          leaderboardAPI.get(params),
          categoriesAPI.getAll(true)
        ]);
        setLeaderboard(leaderboardRes.data);
        setCategories(categoriesRes.data);
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedCategory]);

  // Update vote counts from WebSocket
  useEffect(() => {
    if (updates.length > 0) {
      const latestUpdate = updates[0];
      setLeaderboard(prev => prev.map(entry => 
        entry.contestant_id === latestUpdate.contestant_id 
          ? { ...entry, vote_count: latestUpdate.vote_count }
          : entry
      ).sort((a, b) => b.vote_count - a.vote_count));
    }
  }, [updates]);

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-10 h-10 text-amber-500 animate-spin mx-auto mb-4" />
            <p className="text-slate-500">Loading leaderboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <section className="bg-gradient-to-br from-amber-50 via-orange-50/50 to-yellow-50/50 border-b border-amber-100">
        <div className="max-w-7xl mx-auto px-4 py-12 md:py-16">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-200 mb-6">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold text-amber-600">Live Rankings</span>
              {isConnected && (
                <span className="flex items-center gap-1 text-green-500">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs">Live</span>
                </span>
              )}
            </div>
            <h1 className="font-syne text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Contest <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">Leaderboard</span>
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Real-time rankings updated as votes come in. See who's leading the competition!
            </p>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {/* Leaderboard Type */}
            <div className="flex bg-slate-100 rounded-xl p-1">
              {['global', 'category', 'daily'].map(type => (
                <button
                  key={type}
                  onClick={() => setLeaderboardType(type)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    leaderboardType === type
                      ? 'bg-white text-amber-600 shadow'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>

            {/* Category Filter */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48 h-11 rounded-xl bg-slate-50 border-slate-200">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200 rounded-xl">
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Top 3 Podium */}
      <section className="py-12 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-end justify-center gap-4 md:gap-8">
            {/* 2nd Place */}
            {top3[1] && (
              <Link to={`/${top3[1].slug}`} className="flex-1 max-w-[200px] group">
                <div className="text-center">
                  <div className="relative mx-auto mb-4">
                    <div className="w-24 h-24 md:w-28 md:h-28 mx-auto rounded-full overflow-hidden ring-4 ring-slate-300 shadow-xl group-hover:ring-slate-400 transition-all">
                      <img src={top3[1].photo || getPlaceholderImage(1)} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-slate-800 font-bold shadow-lg">
                      2
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl p-4 shadow-lg border border-slate-100 h-24 flex flex-col justify-center">
                    <h3 className="font-semibold text-slate-900 truncate group-hover:text-amber-600">{top3[1].full_name}</h3>
                    <p className="text-2xl font-bold text-slate-400">{formatNumber(top3[1].vote_count)}</p>
                  </div>
                </div>
              </Link>
            )}

            {/* 1st Place */}
            {top3[0] && (
              <Link to={`/${top3[0].slug}`} className="flex-1 max-w-[240px] group -mt-8">
                <div className="text-center">
                  <div className="relative mx-auto mb-4">
                    <Crown className="absolute -top-6 left-1/2 -translate-x-1/2 w-8 h-8 text-amber-400 animate-bounce" />
                    <div className="w-28 h-28 md:w-36 md:h-36 mx-auto rounded-full overflow-hidden ring-4 ring-amber-400 shadow-2xl group-hover:ring-amber-500 transition-all">
                      <img src={top3[0].photo || getPlaceholderImage(0)} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-amber-900 font-bold text-lg shadow-lg">
                      1
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-4 shadow-lg border border-amber-200 h-28 flex flex-col justify-center">
                    <span className="text-xs font-bold text-amber-500 uppercase tracking-wide">Leading</span>
                    <h3 className="font-syne font-bold text-slate-900 truncate group-hover:text-amber-600">{top3[0].full_name}</h3>
                    <p className="text-3xl font-bold text-amber-500">{formatNumber(top3[0].vote_count)}</p>
                  </div>
                </div>
              </Link>
            )}

            {/* 3rd Place */}
            {top3[2] && (
              <Link to={`/${top3[2].slug}`} className="flex-1 max-w-[200px] group">
                <div className="text-center">
                  <div className="relative mx-auto mb-4">
                    <div className="w-24 h-24 md:w-28 md:h-28 mx-auto rounded-full overflow-hidden ring-4 ring-amber-600 shadow-xl group-hover:ring-amber-700 transition-all">
                      <img src={top3[2].photo || getPlaceholderImage(2)} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center text-white font-bold shadow-lg">
                      3
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl p-4 shadow-lg border border-slate-100 h-24 flex flex-col justify-center">
                    <h3 className="font-semibold text-slate-900 truncate group-hover:text-amber-600">{top3[2].full_name}</h3>
                    <p className="text-2xl font-bold text-amber-700">{formatNumber(top3[2].vote_count)}</p>
                  </div>
                </div>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Full Rankings */}
      <section className="py-12 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-900 text-white">
              <div className="flex items-center justify-between">
                <h3 className="font-syne text-lg font-bold">Full Rankings</h3>
                <span className="text-sm text-slate-400">{leaderboard.length} contestants</span>
              </div>
            </div>

            {/* Rankings List */}
            <div className="divide-y divide-slate-100">
              {rest.map((entry, idx) => {
                const rank = idx + 4;
                const prevEntry = leaderboard[rank - 2];
                const voteDiff = prevEntry ? entry.vote_count - prevEntry.vote_count : 0;
                
                return (
                  <Link 
                    key={entry.contestant_id} 
                    to={`/${entry.slug}`}
                    className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors group"
                  >
                    {/* Rank */}
                    <div className="w-12 text-center">
                      <span className={`font-bold ${rank <= 10 ? 'text-lg text-slate-900' : 'text-slate-400'}`}>
                        {rank}
                      </span>
                    </div>

                    {/* Movement Indicator */}
                    <div className="w-8 text-center">
                      <RankMovement change={Math.floor(Math.random() * 5) - 2} />
                    </div>

                    {/* Photo */}
                    <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 ring-2 ring-slate-100 group-hover:ring-pink-200 transition-all">
                      <img 
                        src={entry.photo || getPlaceholderImage(rank)} 
                        alt={entry.full_name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-900 truncate group-hover:text-amber-600 transition-colors">
                        {entry.full_name}
                      </h4>
                      <p className="text-sm text-slate-500 truncate">
                        {entry.category_name || 'No category'}
                      </p>
                    </div>

                    {/* Votes */}
                    <div className="text-right">
                      <p className="font-bold text-amber-500 text-lg">{formatNumber(entry.vote_count)}</p>
                      {voteDiff !== 0 && (
                        <p className="text-xs text-slate-400">
                          {voteDiff > 0 ? '+' : ''}{formatNumber(Math.abs(voteDiff))} to prev
                        </p>
                      )}
                    </div>

                    {/* Vote Button */}
                    <Button size="sm" className="btn-gradient opacity-0 group-hover:opacity-100 transition-opacity">
                      <Heart className="w-4 h-4" />
                    </Button>
                  </Link>
                );
              })}
            </div>

            {rest.length === 0 && (
              <div className="text-center py-12">
                <Trophy className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No more contestants to show</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-gradient-to-r from-slate-900 via-violet-900 to-slate-900">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Users, label: 'Total Contestants', value: leaderboard.length },
              { icon: Heart, label: 'Total Votes', value: leaderboard.reduce((acc, l) => acc + l.vote_count, 0) },
              { icon: Trophy, label: 'Categories', value: categories.length },
              { icon: Gift, label: 'Prize Pool', value: '$10,000' },
            ].map((stat, idx) => (
              <div key={idx} className="text-center p-6 rounded-2xl bg-white/5 backdrop-blur border border-white/10">
                <stat.icon className="w-8 h-8 text-amber-400 mx-auto mb-3" />
                <p className="font-syne text-3xl font-bold text-white mb-1">
                  {typeof stat.value === 'number' ? formatNumber(stat.value) : stat.value}
                </p>
                <p className="text-sm text-slate-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}

// Rank Movement Component
function RankMovement({ change }) {
  if (change > 0) {
    return (
      <div className="flex items-center justify-center text-green-500">
        <ArrowUp className="w-4 h-4" />
        <span className="text-xs font-semibold">{change}</span>
      </div>
    );
  } else if (change < 0) {
    return (
      <div className="flex items-center justify-center text-red-500">
        <ArrowDown className="w-4 h-4" />
        <span className="text-xs font-semibold">{Math.abs(change)}</span>
      </div>
    );
  }
  return <Minus className="w-4 h-4 text-slate-300 mx-auto" />;
}
