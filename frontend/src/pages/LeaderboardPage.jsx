import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { LeaderboardRow, LeaderboardRowSkeleton } from '../components/LeaderboardRow';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { leaderboardAPI, categoriesAPI, roundsAPI } from '../lib/api';
import { Trophy, Filter } from 'lucide-react';

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
          <div className="text-center mb-12">
            <Trophy className="w-14 h-14 text-gold mx-auto mb-4" />
            <h1 className="font-serif text-4xl md:text-6xl text-white mb-4">Leaderboard</h1>
            <p className="text-white/50 max-w-xl mx-auto">
              Real-time rankings of our top contestants
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48 bg-white/5 border-white/10 text-white" data-testid="leaderboard-category-filter">
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

            {rounds.length > 0 && (
              <Select value={roundFilter} onValueChange={setRoundFilter}>
                <SelectTrigger className="w-full sm:w-48 bg-white/5 border-white/10 text-white" data-testid="leaderboard-round-filter">
                  <SelectValue placeholder="All Rounds" />
                </SelectTrigger>
                <SelectContent className="bg-[#0a0a0a] border-white/10">
                  <SelectItem value="all" className="text-white hover:bg-white/5">All Rounds</SelectItem>
                  {rounds.map((round) => (
                    <SelectItem key={round.id} value={round.name} className="text-white hover:bg-white/5">
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
          <div className="space-y-2">
            {loading ? (
              Array(10).fill(0).map((_, i) => <LeaderboardRowSkeleton key={i} />)
            ) : leaderboard.length > 0 ? (
              leaderboard.map((entry) => (
                <LeaderboardRow key={entry.contestant_id} entry={entry} maxVotes={maxVotes} />
              ))
            ) : (
              <div className="text-center py-20">
                <Trophy className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <h3 className="font-serif text-2xl text-white mb-2">No Rankings Yet</h3>
                <p className="text-white/50">
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
