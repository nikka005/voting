import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { ContestantCard, ContestantCardSkeleton } from '../components/ContestantCard';
import { Button } from '../components/ui/button';
import { contestantsAPI, categoriesAPI, leaderboardAPI } from '../lib/api';
import { ArrowRight, Crown, Users, Trophy, Shield, Star } from 'lucide-react';

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
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1761437855598-011cf89b2ad4?crop=entropy&cs=srgb&fm=jpg&q=85')`,
          }}
        />
        <div className="hero-overlay absolute inset-0" />
        
        {/* Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
          <div className="animate-fade-in-up opacity-0 stagger-1">
            <span className="inline-block px-4 py-1.5 mb-6 text-xs uppercase tracking-[0.3em] text-gold border border-gold/30 bg-gold/5">
              2026 Global Competition
            </span>
          </div>
          
          <h1 className="animate-fade-in-up opacity-0 stagger-2 font-serif text-5xl sm:text-6xl lg:text-8xl text-white leading-[0.9] tracking-tight mb-6">
            Where Beauty<br />
            <span className="gold-text italic">Meets Excellence</span>
          </h1>
          
          <p className="animate-fade-in-up opacity-0 stagger-3 text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10 font-light">
            Join the world's premier beauty and talent competition. Vote for your favorites, 
            support rising stars, and be part of something extraordinary.
          </p>
          
          <div className="animate-fade-in-up opacity-0 stagger-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/contestants">
              <Button 
                size="lg" 
                className="bg-gold hover:bg-gold-light text-black font-bold uppercase tracking-widest rounded-full px-10 py-6 text-base gold-glow btn-scale"
                data-testid="hero-vote-btn"
              >
                Vote Now
              </Button>
            </Link>
            <Link to="/register">
              <Button 
                size="lg" 
                variant="outline"
                className="border-white/20 text-white hover:bg-white/5 rounded-full px-10 py-6 text-base"
                data-testid="hero-join-btn"
              >
                Join Competition
              </Button>
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border border-white/20 rounded-full flex items-start justify-center p-2">
            <div className="w-1 h-2 bg-gold rounded-full" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-32 px-4 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl md:text-5xl text-white mb-4">Why Lumina?</h2>
            <p className="text-white/50 max-w-xl mx-auto">The most trusted platform for international beauty competitions</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {[
              { icon: Shield, title: 'Secure Voting', desc: 'OTP-verified voting ensures fair and transparent results' },
              { icon: Star, title: 'Global Platform', desc: 'Contestants from around the world compete for recognition' },
              { icon: Trophy, title: 'Real Prizes', desc: 'Winners receive prestigious awards and opportunities' },
            ].map((feature, idx) => (
              <div 
                key={idx}
                className="group p-8 bg-white/[0.02] border border-white/5 hover:border-gold/30 transition-all duration-300"
                data-testid={`feature-${idx}`}
              >
                <feature.icon className="w-10 h-10 text-gold mb-6 group-hover:scale-110 transition-transform" />
                <h3 className="font-serif text-xl text-white mb-3">{feature.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Top Contestants Section */}
      <section className="py-20 md:py-32 px-4 bg-gradient-to-b from-transparent via-gold/[0.02] to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12 gap-4">
            <div>
              <span className="text-gold text-sm uppercase tracking-widest mb-2 block">Leading the Competition</span>
              <h2 className="font-serif text-3xl md:text-5xl text-white">Top Contestants</h2>
            </div>
            <Link to="/leaderboard">
              <Button variant="ghost" className="text-white/60 hover:text-gold group" data-testid="view-leaderboard-btn">
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
              <div className="col-span-full text-center py-16 text-white/40">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No contestants yet. Be the first to join!</p>
                <Link to="/register">
                  <Button className="mt-4 bg-gold hover:bg-gold-light text-black rounded-full">
                    Register Now
                  </Button>
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
              <h2 className="font-serif text-3xl md:text-5xl text-white mb-4">Contest Categories</h2>
              <p className="text-white/50">Explore competitions across different categories</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/contestants?category=${cat.id}`}
                  className="group p-6 bg-white/[0.02] border border-white/5 hover:border-gold/30 transition-all text-center"
                  data-testid={`category-${cat.id}`}
                >
                  <Crown className="w-8 h-8 text-gold mx-auto mb-3 group-hover:scale-110 transition-transform" />
                  <h3 className="font-serif text-lg text-white mb-1">{cat.name}</h3>
                  <p className="text-sm text-white/40">{cat.contestant_count} contestants</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-20 md:py-32 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="p-12 md:p-16 glass border-gold/20 gold-glow">
            <Crown className="w-14 h-14 text-gold mx-auto mb-6" />
            <h2 className="font-serif text-3xl md:text-5xl text-white mb-4">
              Ready to Compete?
            </h2>
            <p className="text-white/60 mb-8 max-w-lg mx-auto">
              Join thousands of contestants worldwide. Create your profile, 
              share your story, and let the world vote for you.
            </p>
            <Link to="/register">
              <Button 
                size="lg"
                className="bg-gold hover:bg-gold-light text-black font-bold uppercase tracking-widest rounded-full px-12 py-6 gold-glow-hover btn-scale"
                data-testid="cta-register-btn"
              >
                Start Your Journey
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
