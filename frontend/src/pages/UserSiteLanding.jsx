import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { 
  Star, Trophy, Users, Clock, Gift, ChevronRight, Check, 
  Heart, Crown, Sparkles, Award, Timer, Calendar, 
  ChevronDown, X, Mail, User, MapPin, Camera, Loader2,
  Play, Target, Zap, Shield, HelpCircle, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import PromoBannerPopup from '../components/PromoBannerPopup';

// Contest Configuration
const CONTEST_CONFIG = {
  registrationDeadline: new Date('2026-04-15T23:59:59'),
  maxParticipants: 100,
  prizePool: 35000,
  prizes: [
    { position: 1, title: 'Grand Winner', amount: 15000, icon: Crown },
    { position: 2, title: '1st Runner Up', amount: 8000, icon: Award },
    { position: 3, title: '2nd Runner Up', amount: 5000, icon: Trophy },
    { position: 4, title: '3rd Runner Up', amount: 4000, icon: Star },
    { position: 5, title: '4th Runner Up', amount: 3000, icon: Gift },
  ]
};

export default function UserSiteLanding() {
  const [participantCount, setParticipantCount] = useState(0);
  const [prizeModalOpen, setPrizeModalOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [loading, setLoading] = useState(true);

  // Countdown Timer
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const difference = CONTEST_CONFIG.registrationDeadline - now;
      
      if (difference > 0) {
        return {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        };
      }
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch participant count
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/contestants?status=approved&limit=1`);
        const data = await response.json();
        // Get total count from API or estimate
        const statsRes = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/stats`);
        if (statsRes.ok) {
          const stats = await statsRes.json();
          setParticipantCount(stats.total_contestants || 0);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const progressPercentage = Math.min((participantCount / CONTEST_CONFIG.maxParticipants) * 100, 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-pink-50">
      {/* Promotional Banner Popup */}
      <PromoBannerPopup />
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-amber-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-200">
                <Star className="w-5 h-5 sm:w-6 sm:h-6 text-white fill-white" />
              </div>
              <div>
                <h1 className="font-syne text-lg sm:text-xl font-bold text-slate-900">Glowing Star</h1>
                <span className="text-[10px] sm:text-xs font-semibold text-amber-600">BEAUTY CONTEST 2026</span>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <Link to="/portal/login">
                <Button variant="ghost" className="text-slate-600 hover:text-amber-600 text-sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/portal/register">
                <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-200 text-sm px-4 sm:px-6">
                  Join Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-amber-200/40 to-orange-200/40 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-br from-pink-200/40 to-purple-200/40 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-yellow-100/30 to-amber-100/30 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-200 mb-6 sm:mb-8">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-semibold text-amber-700">Registration Now Open • Limited Spots</span>
            </div>

            {/* Title */}
            <h1 className="font-syne text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-slate-900 mb-6 leading-tight">
              Become the Next
              <span className="block bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 bg-clip-text text-transparent">
                Glowing Star
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
              Join the world's most prestigious online beauty contest. Compete for <span className="font-bold text-amber-600">$35,000</span> in prizes and gain international recognition.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Link to="/portal/register">
                <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-xl shadow-amber-200 rounded-full">
                  <Crown className="w-5 h-5 mr-2" />
                  Join Contest Now
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => setPrizeModalOpen(true)}
                className="w-full sm:w-auto h-14 px-8 text-lg border-2 border-amber-300 text-amber-700 hover:bg-amber-50 rounded-full"
              >
                <Gift className="w-5 h-5 mr-2" />
                View Prizes
              </Button>
            </div>

            {/* Countdown Timer */}
            <div className="bg-white/60 backdrop-blur-xl rounded-3xl border border-amber-100 p-6 sm:p-8 shadow-xl shadow-amber-100/50 max-w-2xl mx-auto">
              <p className="text-sm sm:text-base font-semibold text-slate-500 mb-4 flex items-center justify-center gap-2">
                <Timer className="w-4 h-4 text-amber-500" />
                Registration Closes In
              </p>
              <div className="grid grid-cols-4 gap-3 sm:gap-4">
                {[
                  { value: timeLeft.days, label: 'Days' },
                  { value: timeLeft.hours, label: 'Hours' },
                  { value: timeLeft.minutes, label: 'Minutes' },
                  { value: timeLeft.seconds, label: 'Seconds' },
                ].map((item, idx) => (
                  <div key={idx} className="text-center">
                    <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-3 sm:p-4 shadow-lg shadow-amber-200">
                      <span className="font-syne text-2xl sm:text-4xl font-bold text-white">
                        {String(item.value).padStart(2, '0')}
                      </span>
                    </div>
                    <span className="text-xs sm:text-sm text-slate-500 mt-2 block">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Participant Progress Section */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 rounded-3xl p-6 sm:p-10 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjEiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIi8+PC9nPjwvc3ZnPg==')] opacity-50" />
            
            <div className="relative">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Users className="w-6 h-6 text-amber-400" />
                <h3 className="font-syne text-xl sm:text-2xl font-bold text-white">Limited Participant Slots</h3>
              </div>
              
              <div className="mb-4">
                <span className="font-syne text-5xl sm:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
                  {participantCount}
                </span>
                <span className="text-2xl sm:text-3xl text-white/60 font-bold"> / {CONTEST_CONFIG.maxParticipants}</span>
              </div>
              
              <p className="text-amber-200/80 mb-6">contestants have joined</p>
              
              {/* Progress Bar */}
              <div className="h-4 bg-white/10 rounded-full overflow-hidden max-w-md mx-auto">
                <div 
                  className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 rounded-full transition-all duration-1000"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              
              <p className="text-white/60 text-sm mt-4">
                Only <span className="text-amber-400 font-bold">{CONTEST_CONFIG.maxParticipants - participantCount}</span> spots remaining!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-white to-amber-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 border border-purple-200 mb-4">
              <Play className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-semibold text-purple-700">Simple Process</span>
            </div>
            <h2 className="font-syne text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Join the contest in 5 simple steps and start your journey to stardom
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 sm:gap-4">
            {[
              { step: 1, icon: User, title: 'Register', desc: 'Create your account and apply for the contest' },
              { step: 2, icon: Camera, title: 'Create Profile', desc: 'Upload photos and complete your contestant profile' },
              { step: 3, icon: Heart, title: 'Get Approved', desc: 'Our team reviews and approves your application' },
              { step: 4, icon: Zap, title: 'Share & Vote', desc: 'Share your voting link and collect votes' },
              { step: 5, icon: Trophy, title: 'Win Prizes', desc: 'Top contestants win cash prizes and fame' },
            ].map((item, idx) => (
              <div key={idx} className="relative">
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-lg shadow-slate-100/50 hover:shadow-xl hover:border-amber-200 transition-all text-center h-full">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center mx-auto mb-4">
                    <item.icon className="w-8 h-8 text-amber-600" />
                  </div>
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                    {item.step}
                  </div>
                  <h4 className="font-syne font-bold text-slate-900 mb-2">{item.title}</h4>
                  <p className="text-sm text-slate-500">{item.desc}</p>
                </div>
                {idx < 4 && (
                  <div className="hidden md:block absolute top-1/2 -right-2 transform -translate-y-1/2 z-10">
                    <ChevronRight className="w-4 h-4 text-amber-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contest Timeline Section */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-100 border border-pink-200 mb-4">
              <Calendar className="w-4 h-4 text-pink-600" />
              <span className="text-sm font-semibold text-pink-700">Contest Phases</span>
            </div>
            <h2 className="font-syne text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Contest Timeline
            </h2>
          </div>

          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-amber-400 via-pink-400 to-purple-400" />

            {[
              { phase: 'Registration', date: 'Now - April 15', desc: 'Submit your application and create your profile', status: 'active', color: 'amber' },
              { phase: 'Voting Round', date: 'April 16 - May 15', desc: 'Collect votes from supporters worldwide', status: 'upcoming', color: 'pink' },
              { phase: 'Semi-Finals', date: 'May 16 - May 25', desc: 'Top 20 contestants compete for the finals', status: 'upcoming', color: 'purple' },
              { phase: 'Grand Finale', date: 'May 30', desc: 'Top 5 battle for the crown and grand prize', status: 'upcoming', color: 'violet' },
            ].map((item, idx) => (
              <div key={idx} className={`relative flex items-center mb-8 ${idx % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                <div className={`flex-1 ${idx % 2 === 0 ? 'md:pr-12 md:text-right' : 'md:pl-12'} pl-20 md:pl-0`}>
                  <div className={`bg-white rounded-2xl p-6 border shadow-lg ${
                    item.status === 'active' 
                      ? 'border-amber-200 shadow-amber-100/50' 
                      : 'border-slate-100 shadow-slate-100/50'
                  }`}>
                    {item.status === 'active' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold mb-3">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        Currently Active
                      </span>
                    )}
                    <h4 className="font-syne text-xl font-bold text-slate-900 mb-1">{item.phase}</h4>
                    <p className={`text-sm font-semibold text-${item.color}-500 mb-2`}>{item.date}</p>
                    <p className="text-slate-500 text-sm">{item.desc}</p>
                  </div>
                </div>
                {/* Timeline Dot */}
                <div className={`absolute left-6 md:left-1/2 md:-translate-x-1/2 w-5 h-5 rounded-full border-4 border-white shadow-lg ${
                  item.status === 'active' 
                    ? 'bg-gradient-to-br from-amber-400 to-orange-500' 
                    : 'bg-slate-300'
                }`} />
                <div className="flex-1 hidden md:block" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-amber-50/50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 border border-amber-200 mb-4">
              <HelpCircle className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-semibold text-amber-700">Common Questions</span>
            </div>
            <h2 className="font-syne text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: 'Who can participate in Glowing Star?',
                a: 'Anyone 18 years or older can participate regardless of nationality or gender. Both professional models and aspiring talents are welcome to join.'
              },
              {
                q: 'How does voting work?',
                a: 'Each email address can cast one free vote every 24 hours. Votes must be verified via email OTP. Supporters can also purchase vote packages to boost their favorite contestants.'
              },
              {
                q: 'How are winners selected?',
                a: 'Winners are determined by total votes received during each round. The competition progresses through multiple rounds (Top 100 → Top 50 → Top 20 → Top 10 → Top 5 → Winner), with eliminations at each stage.'
              },
              {
                q: 'When will I receive my prize if I win?',
                a: 'All prizes are distributed within 30 days of contest completion via bank transfer or PayPal. Winners must verify their identity with a government-issued ID.'
              },
              {
                q: 'Can I participate from any country?',
                a: 'Yes! Glowing Star is an international contest open to participants from all countries. Just ensure you have a valid email address and can receive international transfers.'
              },
              {
                q: 'What photos should I upload?',
                a: 'Upload clear, high-quality photos. Professional headshots and full-body shots work best. Avoid heavy filters or excessive editing. Photos must be recent (within the last 12 months).'
              },
            ].map((item, idx) => (
              <FAQItem key={idx} question={item.q} answer={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl" />
        </div>
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-8 shadow-xl shadow-amber-500/30">
            <Crown className="w-10 h-10 text-white" />
          </div>
          
          <h2 className="font-syne text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Shine?
          </h2>
          <p className="text-lg sm:text-xl text-white/70 mb-10 max-w-2xl mx-auto">
            Don't miss your chance to compete for $35,000 in prizes and become the next Glowing Star!
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/portal/register">
              <Button size="lg" className="w-full sm:w-auto h-14 px-10 text-lg bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white shadow-xl shadow-amber-500/30 rounded-full">
                Join Contest Now
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
          
          <p className="text-white/50 text-sm mt-6">
            Only {CONTEST_CONFIG.maxParticipants - participantCount} spots remaining
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <Star className="w-5 h-5 text-white fill-white" />
              </div>
              <div>
                <h3 className="font-syne font-bold text-slate-900">Glowing Star</h3>
                <p className="text-xs text-slate-500">Beauty Contest 2026</p>
              </div>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-slate-500">
              <a href="/portal/login" className="hover:text-amber-600 transition-colors">Contestant Login</a>
              <a href="https://glowingstar.vote" className="hover:text-amber-600 transition-colors">Voting Site</a>
              <a href="#faq" className="hover:text-amber-600 transition-colors">FAQ</a>
            </div>
            
            <p className="text-sm text-slate-400">
              © 2026 Glowing Star. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Prize Pool Modal */}
      <Dialog open={prizeModalOpen} onOpenChange={setPrizeModalOpen}>
        <DialogContent className="bg-white border-amber-100 max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-syne text-2xl text-center flex items-center justify-center gap-2">
              <Trophy className="w-6 h-6 text-amber-500" />
              $35,000 Prize Pool
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-6">
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 mb-6 text-center">
              <span className="font-syne text-5xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                $35,000
              </span>
              <p className="text-slate-600 mt-2">Total Prize Pool</p>
            </div>
            
            <div className="space-y-3">
              {CONTEST_CONFIG.prizes.map((prize, idx) => (
                <div key={idx} className={`flex items-center gap-4 p-4 rounded-xl ${
                  idx === 0 ? 'bg-gradient-to-r from-amber-100 to-yellow-50 border border-amber-200' :
                  idx === 1 ? 'bg-gradient-to-r from-slate-100 to-slate-50 border border-slate-200' :
                  idx === 2 ? 'bg-gradient-to-r from-orange-100 to-amber-50 border border-orange-200' :
                  'bg-slate-50 border border-slate-100'
                }`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    idx === 0 ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-white' :
                    idx === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-slate-800' :
                    idx === 2 ? 'bg-gradient-to-br from-amber-600 to-orange-600 text-white' :
                    'bg-slate-200 text-slate-600'
                  }`}>
                    <prize.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{prize.title}</p>
                  </div>
                  <span className="font-syne text-xl font-bold text-slate-900">
                    ${prize.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
            
            <div className="mt-6 pt-6 border-t border-slate-100 text-center">
              <Link to="/portal/register">
                <Button className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-full">
                  Join Contest Now
                </Button>
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// FAQ Item Component
function FAQItem({ question, answer }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
      >
        <span className="font-semibold text-slate-900 pr-4">{question}</span>
        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="px-6 pb-5">
          <p className="text-slate-600 leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
}
