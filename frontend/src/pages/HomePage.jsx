import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { ContestantCard, ContestantCardSkeleton } from '../components/ContestantCard';
import { Button } from '../components/ui/button';
import { contestantsAPI, categoriesAPI, leaderboardAPI } from '../lib/api';
import { ArrowRight, Sparkles, Users, Trophy, Shield, Star, Zap, Heart } from 'lucide-react';

export default function HomePage() {
  const [topContestants, setTopContestants] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [contestantsRes, categoriesRes] = await Promise.all([
          leaderboardAPI.get({ limit: 6 }),
          categoriesAPI.getAll(true),
        ]);
        setTopContestants(contestantsRes.data);
        setCategories(categoriesRes.data);
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
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Floating 3D Orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-[600px] h-[600px] bg-gradient-to-br from-pink-300/30 to-violet-300/30 rounded-full blur-3xl -top-40 -right-40 animate-pulse" />
          <div className="absolute w-[500px] h-[500px] bg-gradient-to-br from-cyan-300/20 to-blue-300/20 rounded-full blur-3xl -bottom-40 -left-40 animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute w-[300px] h-[300px] bg-gradient-to-br from-yellow-200/30 to-orange-200/30 rounded-full blur-2xl top-1/2 left-1/4 animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
          <div className="animate-fade-in-up stagger-1">
            <span className="inline-flex items-center gap-2 px-5 py-2 mb-8 text-sm font-bold uppercase tracking-wider text-pink-600 bg-pink-100 rounded-full">
              <Zap className="w-4 h-4" />
              2026 Global Competition
            </span>
          </div>
          
          <h1 className="animate-fade-in-up stagger-2 font-syne text-5xl sm:text-6xl lg:text-8xl font-bold text-slate-900 leading-[0.95] tracking-tight mb-6">
            Vote for Your
            <br />
            <span className="gradient-text">Favorite Star</span>
          </h1>
          
          <p className="animate-fade-in-up stagger-3 text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-10">
            Join the world's most exciting beauty competition. Support amazing contestants, 
            cast your vote, and help crown the next champion!
          </p>
          
          <div className="animate-fade-in-up stagger-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/contestants">
              <Button 
                size="lg" 
                className="btn-gradient px-10 py-6 text-lg btn-jelly shadow-pink-lg"
                data-testid="hero-vote-btn"
              >
                <Heart className="w-5 h-5 mr-2" />
                Vote Now
              </Button>
            </Link>
            <Link to="/register">
              <Button 
                size="lg" 
                variant="outline"
                className="px-10 py-6 text-lg border-2 border-slate-200 text-slate-700 hover:border-pink-300 hover:text-pink-600 rounded-full"
                data-testid="hero-join-btn"
              >
                Join Competition
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="animate-fade-in-up stagger-5 mt-16 flex flex-wrap justify-center gap-8 md:gap-16">
            {[
              { label: 'Active Voters', value: '50K+' },
              { label: 'Contestants', value: '500+' },
              { label: 'Total Votes', value: '1M+' },
            ].map((stat, idx) => (
              <div key={idx} className="text-center">
                <p className="font-syne text-3xl md:text-4xl font-bold gradient-text">{stat.value}</p>
                <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-32 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-pink-500 text-sm font-bold uppercase tracking-widest">Why Choose Us</span>
            <h2 className="font-syne text-3xl md:text-5xl font-bold text-slate-900 mt-3">The Ultimate Voting Experience</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {[
              { icon: Shield, title: 'Secure Voting', desc: 'OTP-verified voting ensures every vote counts fairly', color: 'from-pink-500 to-rose-500' },
              { icon: Star, title: 'Global Platform', desc: 'Contestants from around the world compete for glory', color: 'from-violet-500 to-purple-500' },
              { icon: Trophy, title: 'Amazing Prizes', desc: 'Winners receive recognition and exciting opportunities', color: 'from-cyan-500 to-blue-500' },
            ].map((feature, idx) => (
              <div 
                key={idx}
                className="group p-8 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-pink-500/10 transition-all duration-500 card-hover"
                data-testid={`feature-${idx}`}
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-syne text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-500 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Top Contestants Section */}
      <section className="py-20 md:py-32 px-4 bg-gradient-to-b from-pink-50/50 via-violet-50/30 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12 gap-4">
            <div>
              <span className="text-pink-500 text-sm font-bold uppercase tracking-widest">Leading the Race</span>
              <h2 className="font-syne text-3xl md:text-5xl font-bold text-slate-900 mt-3">Top Contestants</h2>
            </div>
            <Link to="/leaderboard">
              <Button variant="ghost" className="text-pink-600 hover:text-pink-700 hover:bg-pink-50 group font-semibold" data-testid="view-leaderboard-btn">
                View Full Leaderboard
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              Array(6).fill(0).map((_, i) => <ContestantCardSkeleton key={i} />)
            ) : topContestants.length > 0 ? (
              topContestants.map((entry) => (
                <ContestantCard
                  key={entry.contestant_id}
                  contestant={{
                    id: entry.contestant_id,
                    full_name: entry.full_name,
                    slug: entry.slug,
                    photos: entry.photo ? [entry.photo] : [],
                    category_name: entry.category_name,
                    vote_count: entry.vote_count,
                  }}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-16">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-pink-100 flex items-center justify-center">
                  <Users className="w-10 h-10 text-pink-400" />
                </div>
                <p className="text-slate-500 mb-4">No contestants yet. Be the first to join!</p>
                <Link to="/register">
                  <Button className="btn-gradient btn-jelly">Register Now</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      {categories.length > 0 && (
        <section className="py-20 md:py-32 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <span className="text-pink-500 text-sm font-bold uppercase tracking-widest">Explore</span>
              <h2 className="font-syne text-3xl md:text-5xl font-bold text-slate-900 mt-3">Contest Categories</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {categories.map((cat, idx) => (
                <Link
                  key={cat.id}
                  to={`/contestants?category=${cat.id}`}
                  className="group p-6 bg-white rounded-3xl border border-slate-100 hover:border-pink-200 hover:shadow-lg hover:shadow-pink-500/10 transition-all text-center card-hover"
                  data-testid={`category-${cat.id}`}
                >
                  <div className={`w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${
                    ['from-pink-500 to-rose-500', 'from-violet-500 to-purple-500', 'from-cyan-500 to-blue-500', 'from-amber-500 to-orange-500'][idx % 4]
                  } flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-syne text-lg font-bold text-slate-900 mb-1">{cat.name}</h3>
                  <p className="text-sm text-slate-500">{cat.contestant_count} contestants</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-20 md:py-32 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative p-12 md:p-16 rounded-[2.5rem] bg-gradient-to-br from-pink-500 via-violet-500 to-cyan-500 overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
            
            <div className="relative z-10 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h2 className="font-syne text-3xl md:text-5xl font-bold text-white mb-4">
                Ready to Shine?
              </h2>
              <p className="text-white/80 mb-8 max-w-lg mx-auto text-lg">
                Join thousands of amazing contestants. Create your profile and let the world vote for you!
              </p>
              <Link to="/register">
                <Button 
                  size="lg"
                  className="bg-white text-pink-600 hover:bg-white/90 font-bold rounded-full px-12 py-6 text-lg shadow-xl btn-jelly"
                  data-testid="cta-register-btn"
                >
                  Start Your Journey
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
