import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { VotingModal } from '../components/VotingModal';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { contestantsAPI, votingAPI } from '../lib/api';
import { formatNumber, getPlaceholderImage } from '../lib/utils';
import { useVoteUpdates } from '../hooks/useWebSocket';
import { 
  Heart, 
  Share2, 
  Instagram, 
  Facebook, 
  Twitter, 
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trophy,
  Clock,
  Bell,
  Gift,
  Star,
  Zap,
  Award,
  ExternalLink,
  Mail,
  Check,
  CreditCard
} from 'lucide-react';
import { toast } from 'sonner';

export default function VotingPage() {
  const { year, slug } = useParams();
  const [contestant, setContestant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [votingModalOpen, setVotingModalOpen] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [votePackages, setVotePackages] = useState([]);
  const [purchasingPackage, setPurchasingPackage] = useState(null);
  
  // Countdown state
  const [timeLeft, setTimeLeft] = useState({
    days: 15,
    hours: 8,
    minutes: 42,
    seconds: 30
  });

  // Countdown timer effect
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
    const fetchContestant = async () => {
      try {
        const [contestantRes, packagesRes] = await Promise.all([
          contestantsAPI.getBySlug(year, slug),
          votingAPI.getVotePackages()
        ]);
        setContestant(contestantRes.data);
        setVotePackages(packagesRes.data);
      } catch (error) {
        console.error('Failed to fetch contestant:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchContestant();
  }, [year, slug]);

  const handlePurchaseVotes = async (packageId) => {
    if (!contestant?.id) return;
    setPurchasingPackage(packageId);
    try {
      const response = await votingAPI.createCheckout({
        package_id: packageId,
        contestant_id: contestant.id,
        origin_url: window.location.origin
      });
      // Redirect to Stripe checkout
      window.location.href = response.data.checkout_url;
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to start checkout. Please try again.');
      setPurchasingPackage(null);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Vote for ${contestant.full_name} - Glamour Contest`,
          text: `Support ${contestant.full_name} in the Glamour Beauty Contest!`,
          url,
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Voting link copied!');
    }
  };

  const handleVoteSuccess = (newVoteCount) => {
    setContestant(prev => ({ ...prev, vote_count: newVoteCount }));
  };

  const handleNotifySubscribe = (e) => {
    e.preventDefault();
    if (!notifyEmail) {
      toast.error('Please enter your email');
      return;
    }
    // In production, this would call an API
    setSubscribed(true);
    toast.success(`You'll be notified when ${contestant.full_name.split(' ')[0]}'s position changes!`);
  };

  const getRankSuffix = (rank) => {
    if (rank === 1) return 'st';
    if (rank === 2) return 'nd';
    if (rank === 3) return 'rd';
    return 'th';
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!contestant) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
          <div className="w-24 h-24 mb-6 rounded-full bg-pink-100 flex items-center justify-center">
            <Heart className="w-12 h-12 text-amber-400" />
          </div>
          <h1 className="font-syne text-3xl font-bold text-slate-900 mb-4">Contestant Not Found</h1>
          <p className="text-slate-500 mb-6">This contestant may not exist or hasn't been approved yet.</p>
          <Link to="/contestants">
            <Button className="btn-gradient btn-jelly">
              Browse Contestants
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const photos = contestant.photos?.length > 0 ? contestant.photos : [getPlaceholderImage(0)];
  const mainPhoto = photos[selectedPhotoIndex] || photos[0];

  return (
    <Layout>
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-slate-50 via-pink-50/30 to-violet-50/30 border-b border-slate-100">
          <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
            
            {/* Round Badge */}
            {contestant.round && (
              <div className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold rounded-full mb-6 shadow-lg shadow-amber-500/25">
                <Award className="w-4 h-4" />
                {contestant.round}
              </div>
            )}

            {/* Name */}
            <h1 className="font-syne text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight">
              {contestant.full_name}
            </h1>

            {/* Bio */}
            {contestant.bio && (
              <p className="text-lg md:text-xl text-slate-600 max-w-4xl mb-8 leading-relaxed">
                {contestant.bio}
              </p>
            )}

            {/* Share & Social */}
            <div className="flex flex-wrap items-center gap-3 mb-8">
              <button
                onClick={handleShare}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-full text-sm font-semibold text-slate-700 hover:border-amber-300 hover:text-amber-600 transition-all shadow-sm"
                data-testid="share-btn"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white hover:scale-110 transition-transform shadow-md"
              >
                <Facebook className="w-4 h-4" />
              </a>
              {contestant.social_instagram && (
                <a
                  href={`https://instagram.com/${contestant.social_instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 via-red-500 to-yellow-500 flex items-center justify-center text-white hover:scale-110 transition-transform shadow-md"
                  data-testid="instagram-link"
                >
                  <Instagram className="w-4 h-4" />
                </a>
              )}
              {contestant.social_twitter && (
                <a
                  href={`https://twitter.com/${contestant.social_twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white hover:scale-110 transition-transform shadow-md"
                  data-testid="twitter-link"
                >
                  <Twitter className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-10 md:py-16">
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
              
              {/* Left Column - Photo */}
              <div className="lg:col-span-5">
                <div className="sticky top-24">
                  <div className="aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl shadow-amber-500/10 bg-slate-100 mb-4">
                    <img
                      src={mainPhoto}
                      alt={contestant.full_name}
                      className="w-full h-full object-cover"
                      data-testid="contestant-main-photo"
                    />
                  </div>
                  
                  {/* Thumbnail Gallery */}
                  {photos.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {photos.map((photo, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedPhotoIndex(index)}
                          className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden transition-all ${
                            selectedPhotoIndex === index 
                              ? 'ring-3 ring-amber-500 scale-105' 
                              : 'opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={photo} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Voting & Info */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Current Ranking Card */}
                <div className="bg-gradient-to-br from-pink-50 to-violet-50 rounded-3xl p-6 md:p-8 border border-pink-100">
                  <p className="text-slate-500 text-sm mb-2 text-center">Currently</p>
                  <div className="text-center mb-4">
                    <span className="font-syne text-6xl md:text-7xl font-bold gradient-text-gold">
                      {contestant.rank || '—'}{contestant.rank ? getRankSuffix(contestant.rank) : ''}
                    </span>
                  </div>
                  {contestant.round ? (
                    <Link to="/leaderboard" className="flex items-center justify-center gap-1 text-amber-600 hover:text-pink-700 font-medium">
                      in the {contestant.round}
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  ) : contestant.category_name ? (
                    <Link to="/leaderboard" className="flex items-center justify-center gap-1 text-amber-600 hover:text-pink-700 font-medium">
                      in {contestant.category_name}
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  ) : (
                    <p className="text-center text-slate-500">in the competition</p>
                  )}
                </div>

                {/* Main Vote Button */}
                <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-xl shadow-amber-500/5">
                  {/* Limited Time Badge */}
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Zap className="w-5 h-5 text-amber-500" />
                    <span className="text-sm font-bold text-amber-600 uppercase tracking-wide">
                      Free Voting Open
                    </span>
                  </div>
                  
                  <Button
                    size="lg"
                    onClick={() => setVotingModalOpen(true)}
                    className="w-full h-16 md:h-20 text-xl md:text-2xl btn-gradient btn-jelly shadow-pink-lg"
                    data-testid="vote-now-btn"
                  >
                    <Heart className="w-7 h-7 mr-3" />
                    VOTE
                  </Button>
                  
                  <p className="text-center text-slate-500 text-sm mt-4">
                    1 free vote per email every 24 hours
                  </p>

                  {/* Vote Count */}
                  <div className="mt-6 pt-6 border-t border-slate-100">
                    <div className="flex items-center justify-center gap-3">
                      <Trophy className="w-6 h-6 text-amber-500" />
                      <span className="font-syne text-3xl font-bold text-slate-900">{formatNumber(contestant.vote_count)}</span>
                      <span className="text-slate-500">total votes</span>
                    </div>
                  </div>
                </div>

                {/* Countdown Timer */}
                <div className="bg-slate-900 rounded-3xl p-6 md:p-8 text-white">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Clock className="w-5 h-5 text-amber-400" />
                    <span className="text-sm font-bold uppercase tracking-wide text-amber-400">Voting Ends In</span>
                  </div>
                  <div className="grid grid-cols-4 gap-3 text-center">
                    {[
                      { value: timeLeft.days, label: 'Days' },
                      { value: timeLeft.hours, label: 'Hours' },
                      { value: timeLeft.minutes, label: 'Mins' },
                      { value: timeLeft.seconds, label: 'Secs' },
                    ].map((item, idx) => (
                      <div key={idx}>
                        <div className="font-syne text-3xl md:text-4xl font-bold text-white">
                          {String(item.value).padStart(2, '0')}
                        </div>
                        <div className="text-xs text-slate-400 uppercase tracking-wide">{item.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Prize Banner */}
                <div className="bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 rounded-3xl p-6 md:p-8 border border-amber-200">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                      <Gift className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="font-syne text-lg font-bold text-slate-900 mb-2">Grand Prize</h3>
                      <p className="text-slate-600">
                        The winner will be featured on our magazine cover and receive exclusive opportunities!
                        <span className="text-amber-600 font-semibold"> You decide</span> who takes home the crown.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Paid Voting Options */}
                <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200">
                  <div className="flex items-center gap-2 mb-6">
                    <Star className="w-5 h-5 text-orange-500" />
                    <h3 className="font-syne text-lg font-bold text-slate-900">Support with Extra Votes</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {votePackages.length > 0 ? votePackages.map((pkg) => (
                      <button
                        key={pkg.id}
                        onClick={() => handlePurchaseVotes(pkg.id)}
                        disabled={purchasingPackage === pkg.id}
                        className={`relative p-4 rounded-2xl border-2 transition-all text-center group ${
                          pkg.popular 
                            ? 'border-amber-400 bg-pink-50 hover:border-amber-500 hover:bg-pink-100' 
                            : 'border-slate-200 hover:border-amber-300 hover:bg-pink-50'
                        }`}
                      >
                        {pkg.popular && (
                          <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 text-[10px] font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full">
                            POPULAR
                          </span>
                        )}
                        {purchasingPackage === pkg.id ? (
                          <Loader2 className="w-8 h-8 mx-auto text-amber-500 animate-spin" />
                        ) : (
                          <>
                            <div className="font-syne text-2xl font-bold text-slate-900 group-hover:text-amber-600">
                              {pkg.votes}
                            </div>
                            <div className="text-xs text-slate-500">votes</div>
                            <div className="text-sm font-bold text-amber-600 mt-2">${pkg.price}</div>
                          </>
                        )}
                      </button>
                    )) : (
                      <>
                        {[
                          { votes: 10, price: 5 },
                          { votes: 50, price: 20, popular: true },
                          { votes: 100, price: 35 },
                          { votes: 250, price: 75 },
                        ].map((option, idx) => (
                          <div
                            key={idx}
                            className={`p-4 rounded-2xl border-2 text-center ${
                              option.popular ? 'border-amber-400 bg-pink-50' : 'border-slate-200'
                            }`}
                          >
                            <div className="font-syne text-2xl font-bold text-slate-900">{option.votes}</div>
                            <div className="text-xs text-slate-500">votes</div>
                            <div className="text-sm font-bold text-amber-600 mt-2">${option.price}</div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-4 text-slate-500 text-xs">
                    <CreditCard className="w-3 h-3" />
                    <span>Secure payment via Stripe</span>
                  </div>
                </div>

                {/* Notification Signup */}
                <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-3xl p-6 md:p-8 border border-violet-100">
                  <div className="flex items-center gap-2 mb-4">
                    <Bell className="w-5 h-5 text-orange-500" />
                    <h3 className="font-syne text-lg font-bold text-slate-900">Get Notified</h3>
                  </div>
                  <p className="text-slate-600 text-sm mb-4">
                    Get an email when {contestant.full_name.split(' ')[0]}'s position changes in the rankings.
                  </p>
                  {subscribed ? (
                    <div className="flex items-center gap-2 text-green-600 font-medium">
                      <Check className="w-5 h-5" />
                      You're subscribed!
                    </div>
                  ) : (
                    <form onSubmit={handleNotifySubscribe} className="flex gap-2">
                      <Input
                        type="email"
                        placeholder="Enter your email"
                        value={notifyEmail}
                        onChange={(e) => setNotifyEmail(e.target.value)}
                        className="flex-1 h-12 rounded-xl bg-white border-violet-200 focus:border-orange-500"
                      />
                      <Button type="submit" className="h-12 px-6 bg-orange-600 hover:bg-violet-700 rounded-xl">
                        <Mail className="w-4 h-4" />
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Q&A Section */}
        {contestant.qa_items && contestant.qa_items.length > 0 && (
          <section className="py-12 md:py-16 bg-slate-50 border-t border-slate-100">
            <div className="max-w-4xl mx-auto px-4">
              <h2 className="font-syne text-2xl md:text-3xl font-bold text-slate-900 mb-8 text-center">
                Get to Know {contestant.full_name.split(' ')[0]}
              </h2>
              <div className="space-y-6">
                {contestant.qa_items.map((qa, index) => (
                  <div key={index} className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100">
                    <h3 className="font-syne text-lg md:text-xl font-bold text-amber-600 mb-3">
                      {qa.question}
                    </h3>
                    <p className="text-slate-600 leading-relaxed text-lg">
                      {qa.answer}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Photo Gallery */}
        {photos.length > 1 && (
          <section className="py-12 md:py-16 bg-white border-t border-slate-100">
            <div className="max-w-6xl mx-auto px-4">
              <h2 className="font-syne text-2xl md:text-3xl font-bold text-slate-900 mb-8 text-center">Photo Gallery</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {photos.map((photo, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedPhotoIndex(index)}
                    className={`aspect-square rounded-2xl overflow-hidden transition-all hover:scale-105 ${
                      selectedPhotoIndex === index ? 'ring-4 ring-amber-500 shadow-lg' : ''
                    }`}
                  >
                    <img
                      src={photo}
                      alt={`${contestant.full_name} - Photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Bottom CTA */}
        <section className="py-12 md:py-20 bg-gradient-to-br from-amber-500 via-orange-500 to-purple-600">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="font-syne text-3xl md:text-5xl font-bold text-white mb-4">
              Help {contestant.full_name.split(' ')[0]} Win!
            </h2>
            <p className="text-white/80 mb-8 max-w-xl mx-auto text-lg">
              Every vote matters. Your support can help {contestant.full_name} take home the crown!
            </p>
            <Button
              size="lg"
              onClick={() => setVotingModalOpen(true)}
              className="h-16 px-12 text-xl bg-white text-amber-600 hover:bg-white/90 rounded-full font-bold shadow-xl btn-jelly"
              data-testid="bottom-vote-btn"
            >
              <Heart className="w-6 h-6 mr-3 fill-amber-600" />
              Vote Now - It's Free!
            </Button>
          </div>
        </section>
      </div>

      {/* Voting Modal */}
      <VotingModal
        isOpen={votingModalOpen}
        onClose={() => setVotingModalOpen(false)}
        contestant={contestant}
        onVoteSuccess={handleVoteSuccess}
      />
    </Layout>
  );
}
