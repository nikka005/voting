import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { LeaderboardRow, LeaderboardRowSkeleton } from '../components/LeaderboardRow';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { leaderboardAPI, categoriesAPI, roundsAPI } from '../lib/api';
import { Trophy, Sparkles, TrendingUp } from 'lucide-react';

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [categories, setCategories] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [roundFilter, setRoundFilter] = useState('all');

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [categoriesRes, roundsRes] = await Promise.all([
          categoriesAPI.getAll(true),
          roundsAPI.getAll(),
        ]);
        setCategories(categoriesRes.data);
        setRounds(roundsRes.data);
      } catch (error) {
        console.error('Failed to fetch filters:', error);
      }
    };
    fetchFilters();
  }, []);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const params = { limit: 50 };
        if (categoryFilter && categoryFilter !== 'all') params.category_id = categoryFilter;
        if (roundFilter && roundFilter !== 'all') params.round_name = roundFilter;

        const response = await leaderboardAPI.get(params);
        setLeaderboard(response.data);
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [categoryFilter, roundFilter]);

  const maxVotes = leaderboard.length > 0 ? leaderboard[0].vote_count : 0;

  return (
    <Layout>
      {/* Header */}
      <section className="pt-8 pb-12 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Hero Banner */}
          <div className="relative mb-12 p-8 md:p-12 rounded-3xl bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 overflow-hidden text-center">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVHJhbnNmb3JtPSJyb3RhdGUoNDUpIj48cmVjdCB3aWR0aD0iMiIgaGVpZ2h0PSI0MCIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCBmaWxsPSJ1cmwoI2EpIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+')] opacity-30" />
            <div className="relative z-10">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Trophy className="w-10 h-10 text-white" />
              </div>
              <h1 className="font-syne text-3xl md:text-5xl font-bold text-white mb-3">Leaderboard</h1>
              <p className="text-white/80 max-w-xl mx-auto flex items-center justify-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Real-time rankings updated live
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-56 h-12 rounded-xl bg-white border-slate-200 shadow-sm" data-testid="leaderboard-category-filter">
                <Sparkles className="w-4 h-4 mr-2 text-pink-500" />
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

            {rounds.length > 0 && (
              <Select value={roundFilter} onValueChange={setRoundFilter}>
                <SelectTrigger className="w-full sm:w-56 h-12 rounded-xl bg-white border-slate-200 shadow-sm" data-testid="leaderboard-round-filter">
                  <SelectValue placeholder="All Rounds" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 rounded-xl">
                  <SelectItem value="all" className="rounded-lg">All Rounds</SelectItem>
                  {rounds.map((round) => (
                    <SelectItem key={round.id} value={round.name} className="rounded-lg">
                      {round.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </section>

      {/* Leaderboard */}
      <section className="pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-3">
            {loading ? (
              Array(10).fill(0).map((_, i) => <LeaderboardRowSkeleton key={i} />)
            ) : leaderboard.length > 0 ? (
              leaderboard.map((entry) => (
                <LeaderboardRow key={entry.contestant_id} entry={entry} maxVotes={maxVotes} />
              ))
            ) : (
              <div className="text-center py-20">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-amber-100 flex items-center justify-center">
                  <Trophy className="w-12 h-12 text-amber-400" />
                </div>
                <h3 className="font-syne text-2xl font-bold text-slate-900 mb-2">No Rankings Yet</h3>
                <p className="text-slate-500">
                  Be the first to vote and help contestants climb the leaderboard!
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
}
