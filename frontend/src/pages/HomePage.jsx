import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { contestantsAPI, categoriesAPI, leaderboardAPI } from '../lib/api';
import { formatNumber, getPlaceholderImage } from '../lib/utils';
import { 
  Heart, Search, Trophy, Clock, Star, Sparkles, ChevronRight, 
  ArrowUpRight, TrendingUp, Users, Award, Gift, Zap, Play,
  CheckCircle, Mail, Shield, Globe, Crown, Timer, ArrowRight,
  Flame, Instagram, Facebook, Twitter
} from 'lucide-react';

export default function HomePage() {
  const [contestants, setContestants] = useState([]);
  const [categories, setCategories] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Countdown state
  const [timeLeft, setTimeLeft] = useState({
    days: 15, hours: 8, minutes: 42, seconds: 30
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        let { days, hours, minutes, seconds } = prev;
        seconds--;
        if (seconds < 0) { seconds = 59; minutes--; }
        if (minutes < 0) { minutes = 59; hours--; }
        if (hours < 0) { hours = 23; days--; }
        if (days < 0) { days = 0; hours = 0; minutes = 0; seconds = 0; }
        return { days, hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [contestantsRes, categoriesRes, leaderboardRes] = await Promise.all([
          contestantsAPI.getAll({ status: 'approved', limit: 12 }),
          categoriesAPI.getAll(true),
          leaderboardAPI.get({ limit: 10 })
        ]);
        setContestants(contestantsRes.data);
        setCategories(categoriesRes.data);
        setLeaderboard(leaderboardRes.data);
        // Mock trending (in production, this would be a separate API)
        setTrending(contestantsRes.data.slice(0, 4));
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <Layout>
      {/* ============ HERO SECTION ============ */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-gradient-to-br from-slate-50 via-pink-50/50 to-violet-50/50">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-pink-300/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-violet-300/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-200/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-16 sm:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Text */}
            <div className="text-center lg:text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-pink-500/10 to-violet-500/10 border border-pink-200 mb-6">
                <Sparkles className="w-4 h-4 text-pink-500" />
                <span className="text-sm font-semibold text-pink-600">2026 Beauty Contest is LIVE</span>
              </div>

              <h1 className="font-syne text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-slate-900 mb-6 leading-tight">
                Vote for Your
                <span className="block gradient-text">Favorite Star</span>
              </h1>

              <p className="text-lg sm:text-xl text-slate-600 mb-8 max-w-xl mx-auto lg:mx-0">
                Join thousands of voters in the world's most prestigious beauty contest. 
                Your vote decides who takes home the <span className="font-semibold text-pink-600">Grand Prize</span>.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link to="/contestants">
                  <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-lg btn-gradient btn-jelly shadow-pink-lg">
                    <Heart className="w-5 h-5 mr-2" />
                    Vote Now
                  </Button>
                </Link>
                <Link to="/portal/register">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 text-lg border-2 border-slate-200 hover:border-pink-300 hover:bg-pink-50">
                    <Star className="w-5 h-5 mr-2" />
                    Join Contest
                  </Button>
                </Link>
              </div>

              {/* Stats */}
              <div className="flex items-center justify-center lg:justify-start gap-8 mt-10">
                <div className="text-center">
                  <p className="font-syne text-3xl font-bold text-slate-900">{formatNumber(contestants.length)}+</p>
                  <p className="text-sm text-slate-500">Contestants</p>
                </div>
                <div className="w-px h-12 bg-slate-200" />
                <div className="text-center">
                  <p className="font-syne text-3xl font-bold text-slate-900">{formatNumber(leaderboard.reduce((acc, l) => acc + l.vote_count, 0))}+</p>
                  <p className="text-sm text-slate-500">Total Votes</p>
                </div>
                <div className="w-px h-12 bg-slate-200" />
                <div className="text-center">
                  <p className="font-syne text-3xl font-bold text-slate-900">$10K</p>
                  <p className="text-sm text-slate-500">Grand Prize</p>
                </div>
              </div>
            </div>

            {/* Right Column - Featured Contestant Cards */}
            <div className="relative hidden lg:block">
              <div className="relative">
                {/* Main Card */}
                {contestants[0] && (
                  <Link to={`/${contestants[0].slug}`} className="block">
                    <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-pink-500/20 transform hover:scale-[1.02] transition-transform">
                      <img 
                        src={contestants[0].photos?.[0] || getPlaceholderImage(0)} 
                        alt={contestants[0].full_name}
                        className="w-full aspect-[3/4] object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-6">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-pink-500 text-white text-xs font-bold mb-3">
                          <Crown className="w-3 h-3" /> #1 LEADING
                        </span>
                        <h3 className="font-syne text-2xl font-bold text-white mb-1">{contestants[0].full_name}</h3>
                        <div className="flex items-center gap-2 text-white/80">
                          <Heart className="w-4 h-4 text-pink-400" />
                          <span className="font-semibold">{formatNumber(contestants[0].vote_count)} votes</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                )}

                {/* Floating Cards */}
                {contestants[1] && (
                  <Link to={`/${contestants[1].slug}`} className="absolute -right-8 top-20 w-48 rounded-2xl overflow-hidden shadow-xl transform hover:scale-105 transition-transform">
                    <img src={contestants[1].photos?.[0] || getPlaceholderImage(1)} alt="" className="w-full aspect-square object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white text-sm font-semibold truncate">{contestants[1].full_name}</p>
                      <p className="text-white/70 text-xs">{formatNumber(contestants[1].vote_count)} votes</p>
                    </div>
                  </Link>
                )}

                {contestants[2] && (
                  <Link to={`/${contestants[2].slug}`} className="absolute -left-8 bottom-20 w-40 rounded-2xl overflow-hidden shadow-xl transform hover:scale-105 transition-transform">
                    <img src={contestants[2].photos?.[0] || getPlaceholderImage(2)} alt="" className="w-full aspect-square object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white text-sm font-semibold truncate">{contestants[2].full_name}</p>
                      <p className="text-white/70 text-xs">{formatNumber(contestants[2].vote_count)} votes</p>
                    </div>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce">
          <p className="text-xs text-slate-500 mb-2">Scroll to explore</p>
          <ChevronRight className="w-5 h-5 text-slate-400 rotate-90" />
        </div>
      </section>

      {/* ============ COUNTDOWN TIMER ============ */}
      <section className="py-8 bg-gradient-to-r from-slate-900 via-violet-900 to-slate-900">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center">
                <Timer className="w-6 h-6 text-pink-400" />
              </div>
              <div>
                <p className="text-sm text-pink-400 font-semibold uppercase tracking-wide">Current Round</p>
                <p className="text-xl font-bold text-white">Qualification Round</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 md:gap-4">
              <p className="text-sm text-slate-400 mr-2">Ends in:</p>
              {[
                { value: timeLeft.days, label: 'Days' },
                { value: timeLeft.hours, label: 'Hours' },
                { value: timeLeft.minutes, label: 'Mins' },
                { value: timeLeft.seconds, label: 'Secs' },
              ].map((item, idx) => (
                <div key={idx} className="text-center">
                  <div className="w-16 h-16 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
                    <span className="font-syne text-2xl font-bold text-white">
                      {String(item.value).padStart(2, '0')}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase">{item.label}</p>
                </div>
              ))}
            </div>

            <Link to="/leaderboard">
              <Button variant="outline" className="border-pink-500/50 text-pink-400 hover:bg-pink-500/10">
                View Leaderboard <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ============ TRENDING CONTESTANTS ============ */}
      <section className="py-16 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-5 h-5 text-orange-500" />
                <span className="text-sm font-bold text-orange-500 uppercase tracking-wide">Trending Now</span>
              </div>
              <h2 className="font-syne text-3xl md:text-4xl font-bold text-slate-900">Fastest Rising Stars</h2>
            </div>
            <Link to="/contestants" className="hidden md:flex items-center gap-2 text-pink-600 hover:text-pink-700 font-semibold">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {trending.map((c, idx) => (
              <Link key={c.id} to={`/${c.slug}`} className="group">
                <div className="relative rounded-2xl overflow-hidden bg-white shadow-lg hover:shadow-xl transition-all">
                  <div className="aspect-[3/4] overflow-hidden">
                    <img 
                      src={c.photos?.[0] || getPlaceholderImage(idx)} 
                      alt={c.full_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-orange-500 text-white text-xs font-bold">
                      <TrendingUp className="w-3 h-3" /> +{Math.floor(Math.random() * 50) + 10}%
                    </span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="font-semibold text-white truncate">{c.full_name}</h3>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-white/70 text-sm">{formatNumber(c.vote_count)} votes</span>
                      <span className="text-white/70 text-sm">#{idx + 1}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============ LEADERBOARD PREVIEW ============ */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Leaderboard */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <span className="text-sm font-bold text-amber-500 uppercase tracking-wide">Live Rankings</span>
              </div>
              <h2 className="font-syne text-3xl md:text-4xl font-bold text-slate-900 mb-8">Current Leaderboard</h2>

              <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
                {/* Top 3 */}
                <div className="grid grid-cols-3 gap-4 p-6 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100">
                  {leaderboard.slice(0, 3).map((entry, idx) => (
                    <Link key={entry.contestant_id} to={`/${entry.slug}`} className="text-center group">
                      <div className={`relative w-16 h-16 mx-auto mb-2 rounded-full overflow-hidden ring-4 ${
                        idx === 0 ? 'ring-amber-400' : idx === 1 ? 'ring-slate-300' : 'ring-amber-600'
                      }`}>
                        <img src={entry.photo || getPlaceholderImage(idx)} alt="" className="w-full h-full object-cover" />
                        <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          idx === 0 ? 'bg-amber-400 text-amber-900' : idx === 1 ? 'bg-slate-300 text-slate-700' : 'bg-amber-600 text-white'
                        }`}>
                          {idx + 1}
                        </div>
                      </div>
                      <p className="font-semibold text-slate-900 text-sm truncate group-hover:text-pink-600">{entry.full_name}</p>
                      <p className="text-xs text-slate-500">{formatNumber(entry.vote_count)}</p>
                    </Link>
                  ))}
                </div>

                {/* Rest of leaderboard */}
                <div className="divide-y divide-slate-100">
                  {leaderboard.slice(3, 10).map((entry, idx) => (
                    <Link key={entry.contestant_id} to={`/${entry.slug}`} className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors">
                      <span className="w-8 text-center font-bold text-slate-400">{idx + 4}</span>
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100">
                        <img src={entry.photo || getPlaceholderImage(idx + 3)} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{entry.full_name}</p>
                        <p className="text-xs text-slate-500">{entry.category_name || 'No category'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-pink-500">{formatNumber(entry.vote_count)}</p>
                        <p className="text-xs text-slate-400">votes</p>
                      </div>
                    </Link>
                  ))}
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100">
                  <Link to="/leaderboard">
                    <Button variant="outline" className="w-full border-pink-200 text-pink-600 hover:bg-pink-50">
                      View Full Leaderboard <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* How Voting Works */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-cyan-500" />
                <span className="text-sm font-bold text-cyan-500 uppercase tracking-wide">Simple Process</span>
              </div>
              <h2 className="font-syne text-3xl md:text-4xl font-bold text-slate-900 mb-8">How Voting Works</h2>

              <div className="space-y-6">
                {[
                  { icon: Search, title: 'Find Your Favorite', desc: 'Browse contestants and discover amazing talents' },
                  { icon: Mail, title: 'Enter Your Email', desc: 'Provide your email to receive a verification code' },
                  { icon: Shield, title: 'Verify with OTP', desc: 'Enter the 6-digit code sent to your email' },
                  { icon: Heart, title: 'Vote Counted!', desc: 'Your vote is recorded instantly. Vote again in 24 hours!' },
                ].map((step, idx) => (
                  <div key={idx} className="flex gap-4 p-4 rounded-2xl bg-white shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center text-white font-bold">
                      {idx + 1}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-1">{step.title}</h4>
                      <p className="text-sm text-slate-500">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Prize Banner */}
              <div className="mt-8 p-6 rounded-3xl bg-gradient-to-r from-amber-400 to-orange-500 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                    <Gift className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-syne text-xl font-bold mb-2">Grand Prize</h3>
                    <p className="text-white/90">
                      The winner receives a <strong>$10,000 cash prize</strong>, magazine feature, 
                      and exclusive brand partnerships!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ CATEGORIES ============ */}
      {categories.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-10">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Award className="w-5 h-5 text-violet-500" />
                <span className="text-sm font-bold text-violet-500 uppercase tracking-wide">Contest Categories</span>
              </div>
              <h2 className="font-syne text-3xl md:text-4xl font-bold text-slate-900">Browse by Category</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {categories.map((cat, idx) => (
                <Link 
                  key={cat.id} 
                  to={`/contestants?category=${cat.id}`}
                  className="group p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 hover:from-pink-50 hover:to-violet-50 border border-slate-100 hover:border-pink-200 transition-all text-center"
                >
                  <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Crown className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="font-semibold text-slate-900 group-hover:text-pink-600 mb-1">{cat.name}</h3>
                  <p className="text-sm text-slate-500">{cat.contestant_count} contestants</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============ FEATURED CONTESTANTS ============ */}
      <section className="py-16 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-5 h-5 text-pink-500" />
                <span className="text-sm font-bold text-pink-500 uppercase tracking-wide">Featured</span>
              </div>
              <h2 className="font-syne text-3xl md:text-4xl font-bold text-slate-900">Meet Our Contestants</h2>
            </div>
            <Link to="/contestants" className="hidden md:flex items-center gap-2 text-pink-600 hover:text-pink-700 font-semibold">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {contestants.slice(0, 8).map((c, idx) => (
              <Link key={c.id} to={`/${c.slug}`}>
                <ContestantCard contestant={c} rank={idx + 1} />
              </Link>
            ))}
          </div>

          <div className="text-center mt-10 md:hidden">
            <Link to="/contestants">
              <Button className="btn-gradient btn-jelly">
                View All Contestants <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ============ CONTEST TIMELINE ============ */}
      <section className="py-16 bg-slate-900">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-pink-400" />
              <span className="text-sm font-bold text-pink-400 uppercase tracking-wide">Contest Timeline</span>
            </div>
            <h2 className="font-syne text-3xl md:text-4xl font-bold text-white">Round Progress</h2>
          </div>

          <div className="relative">
            {/* Progress Line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-700 -translate-x-1/2 hidden md:block" />
            
            <div className="space-y-8">
              {[
                { round: 'Qualification', status: 'active', date: 'Mar 1 - Mar 30', desc: 'Open voting for all contestants' },
                { round: 'Top 100', status: 'upcoming', date: 'Apr 1 - Apr 15', desc: 'Top 100 advance to next round' },
                { round: 'Top 50', status: 'upcoming', date: 'Apr 16 - Apr 30', desc: 'Semi-final selection' },
                { round: 'Finals', status: 'upcoming', date: 'May 1 - May 15', desc: 'Winner announcement' },
              ].map((round, idx) => (
                <div key={idx} className={`relative flex flex-col md:flex-row items-center gap-4 ${idx % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                  <div className={`flex-1 p-6 rounded-2xl ${round.status === 'active' ? 'bg-gradient-to-r from-pink-500/20 to-violet-500/20 border border-pink-500/30' : 'bg-slate-800'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {round.status === 'active' && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
                      <span className={`text-xs font-bold uppercase ${round.status === 'active' ? 'text-green-400' : 'text-slate-500'}`}>
                        {round.status === 'active' ? 'Current Round' : 'Upcoming'}
                      </span>
                    </div>
                    <h3 className="font-syne text-xl font-bold text-white mb-1">{round.round}</h3>
                    <p className="text-slate-400 text-sm mb-2">{round.date}</p>
                    <p className="text-slate-300 text-sm">{round.desc}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm z-10 ${
                    round.status === 'active' 
                      ? 'bg-gradient-to-r from-pink-500 to-violet-500 text-white' 
                      : 'bg-slate-700 text-slate-400'
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 hidden md:block" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ CTA SECTION ============ */}
      <section className="py-20 bg-gradient-to-r from-pink-500 via-violet-500 to-cyan-500">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="font-syne text-3xl md:text-5xl font-bold text-white mb-6">
            Ready to Make Your Voice Heard?
          </h2>
          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
            Join thousands of voters and help crown the next beauty icon. Every vote counts!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/contestants">
              <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-lg bg-white text-pink-600 hover:bg-slate-100">
                <Heart className="w-5 h-5 mr-2" />
                Start Voting
              </Button>
            </Link>
            <Link to="/portal/register">
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 text-lg border-2 border-white text-white hover:bg-white/10">
                <Star className="w-5 h-5 mr-2" />
                Join as Contestant
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}

// Contestant Card Component
function ContestantCard({ contestant, rank }) {
  return (
    <div className="group relative rounded-2xl overflow-hidden bg-white shadow-lg hover:shadow-xl transition-all card-hover">
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
        'bg-white/90 text-slate-700'
      }`}>
        {rank}
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80" />
      
      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h3 className="font-syne text-lg font-bold text-white truncate">{contestant.full_name}</h3>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-1 text-white/80 text-sm">
            <Heart className="w-3 h-3 text-pink-400" />
            <span>{formatNumber(contestant.vote_count)}</span>
          </div>
          <span className="px-2 py-0.5 bg-white/20 rounded-full text-white text-xs backdrop-blur-sm">
            {contestant.category_name || 'Contest'}
          </span>
        </div>
      </div>

      {/* Hover Vote Button */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <div className="px-6 py-3 bg-gradient-to-r from-pink-500 to-violet-500 rounded-full text-white font-semibold flex items-center gap-2 transform scale-90 group-hover:scale-100 transition-transform">
          <Heart className="w-4 h-4" />
          Vote Now
        </div>
      </div>
    </div>
  );
}
