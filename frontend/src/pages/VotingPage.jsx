import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { VotingModal } from '../components/VotingModal';
import { Button } from '../components/ui/button';
import { contestantsAPI } from '../lib/api';
import { formatNumber, getPlaceholderImage } from '../lib/utils';
import { 
  Heart, 
  Share2, 
  Instagram, 
  Facebook, 
  Twitter, 
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trophy,
  Copy,
  Check,
  QrCode,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

export default function VotingPage() {
  const { year, slug } = useParams();
  const [contestant, setContestant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [votingModalOpen, setVotingModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchContestant = async () => {
      try {
        const response = await contestantsAPI.getBySlug(year, slug);
        setContestant(response.data);
      } catch (error) {
        console.error('Failed to fetch contestant:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchContestant();
  }, [year, slug]);

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
      setCopied(true);
      toast.success('Voting link copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleVoteSuccess = (newVoteCount) => {
    setContestant(prev => ({ ...prev, vote_count: newVoteCount }));
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
          <Loader2 className="w-10 h-10 text-pink-500 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!contestant) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
          <div className="w-24 h-24 mb-6 rounded-full bg-pink-100 flex items-center justify-center">
            <Heart className="w-12 h-12 text-pink-400" />
          </div>
          <h1 className="font-syne text-3xl font-bold text-slate-900 mb-4">Contestant Not Found</h1>
          <p className="text-slate-500 mb-6">This contestant may not exist or hasn't been approved yet.</p>
          <Link to="/contestants">
            <Button className="btn-gradient btn-jelly">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Contestants
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
      <div className="min-h-screen">
        {/* Hero Section - Similar to mshealthandfit */}
        <section className="relative bg-gradient-to-br from-pink-50 via-white to-violet-50">
          <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
            {/* Back Link */}
            <Link 
              to="/contestants" 
              className="inline-flex items-center text-slate-500 hover:text-pink-600 transition-colors mb-6 font-medium text-sm"
              data-testid="back-to-contestants"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Contestants
            </Link>

            {/* Round Badge */}
            {contestant.round && (
              <div className="inline-block px-4 py-1.5 bg-gradient-to-r from-pink-500 to-violet-500 text-white text-sm font-bold rounded-full mb-4">
                {contestant.round}
              </div>
            )}

            {/* Name */}
            <h1 className="font-syne text-4xl md:text-6xl lg:text-7xl font-bold text-slate-900 mb-4 leading-tight">
              {contestant.full_name}
            </h1>

            {/* Bio */}
            {contestant.bio && (
              <p className="text-lg md:text-xl text-slate-600 max-w-3xl mb-6 leading-relaxed">
                {contestant.bio}
              </p>
            )}

            {/* Share Buttons */}
            <div className="flex items-center gap-3 mb-8">
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full text-sm font-medium text-slate-600 hover:border-pink-300 hover:text-pink-600 transition-all shadow-sm"
                data-testid="share-btn"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Share2 className="w-4 h-4" />}
                Share
              </button>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-blue-600 hover:border-blue-300 transition-colors shadow-sm"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <button
                onClick={() => toast.info('QR Code feature coming soon!')}
                className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:border-pink-300 transition-colors shadow-sm"
              >
                <QrCode className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
              {/* Main Photo */}
              <div className="relative">
                <div className="aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl shadow-pink-500/10 bg-slate-100">
                  <img
                    src={mainPhoto}
                    alt={contestant.full_name}
                    className="w-full h-full object-cover"
                    data-testid="contestant-main-photo"
                  />
                </div>
              </div>

              {/* Voting Panel */}
              <div className="flex flex-col">
                {/* Rank Card */}
                <div className="bg-white rounded-3xl shadow-xl shadow-pink-500/5 border border-slate-100 p-6 md:p-8 mb-6">
                  <div className="text-center mb-6">
                    <p className="text-slate-500 text-sm mb-2">Currently</p>
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-syne text-5xl md:text-6xl font-bold gradient-text">
                        {contestant.rank || '—'}{contestant.rank ? getRankSuffix(contestant.rank) : ''}
                      </span>
                    </div>
                    {contestant.round && (
                      <Link to="/leaderboard" className="inline-flex items-center gap-1 text-sm text-pink-600 hover:text-pink-700 mt-2 font-medium">
                        in the {contestant.round}
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                    {contestant.category_name && !contestant.round && (
                      <Link to="/leaderboard" className="inline-flex items-center gap-1 text-sm text-pink-600 hover:text-pink-700 mt-2 font-medium">
                        in {contestant.category_name}
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>

                  {/* Vote Button */}
                  <Button
                    size="lg"
                    onClick={() => setVotingModalOpen(true)}
                    className="w-full h-16 text-xl btn-gradient btn-jelly shadow-pink-lg"
                    data-testid="vote-now-btn"
                  >
                    <Heart className="w-6 h-6 mr-3" />
                    VOTE
                  </Button>

                  {/* Vote Count */}
                  <div className="mt-6 text-center">
                    <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-pink-50 to-violet-50 rounded-2xl">
                      <Trophy className="w-5 h-5 text-amber-500" />
                      <span className="font-syne text-2xl font-bold text-slate-900">{formatNumber(contestant.vote_count)}</span>
                      <span className="text-slate-500">votes</span>
                    </div>
                  </div>
                </div>

                {/* Prize Info Card */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl border border-amber-100 p-6 mb-6">
                  <p className="text-slate-700 text-center">
                    <span className="font-bold">You decide</span> who will be featured and take home the grand prize!
                  </p>
                </div>

                {/* Social Links */}
                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                  <h3 className="font-syne font-bold text-slate-900 mb-4">Connect</h3>
                  <div className="flex gap-3">
                    {contestant.social_instagram && (
                      <a
                        href={`https://instagram.com/${contestant.social_instagram}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500 flex items-center justify-center text-white hover:scale-110 transition-transform shadow-lg"
                        data-testid="instagram-link"
                      >
                        <Instagram className="w-5 h-5" />
                      </a>
                    )}
                    {contestant.social_facebook && (
                      <a
                        href={`https://facebook.com/${contestant.social_facebook}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white hover:scale-110 transition-transform shadow-lg"
                        data-testid="facebook-link"
                      >
                        <Facebook className="w-5 h-5" />
                      </a>
                    )}
                    {contestant.social_twitter && (
                      <a
                        href={`https://twitter.com/${contestant.social_twitter}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center text-white hover:scale-110 transition-transform shadow-lg"
                        data-testid="twitter-link"
                      >
                        <Twitter className="w-5 h-5" />
                      </a>
                    )}
                    {!contestant.social_instagram && !contestant.social_facebook && !contestant.social_twitter && (
                      <p className="text-slate-400 text-sm">No social links added</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Q&A Section */}
        {contestant.qa_items && contestant.qa_items.length > 0 && (
          <section className="py-12 md:py-16 bg-white">
            <div className="max-w-4xl mx-auto px-4">
              <div className="space-y-8">
                {contestant.qa_items.map((qa, index) => (
                  <div key={index} className="border-b border-slate-100 pb-8 last:border-0">
                    <h3 className="font-syne text-lg md:text-xl font-bold text-pink-600 mb-3">
                      {qa.question}
                    </h3>
                    <p className="text-slate-600 leading-relaxed">
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
          <section className="py-12 md:py-16 bg-slate-50">
            <div className="max-w-6xl mx-auto px-4">
              <h2 className="font-syne text-2xl md:text-3xl font-bold text-slate-900 mb-8 text-center">Photo Gallery</h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4">
                {photos.map((photo, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedPhotoIndex(index)}
                    className={`aspect-square rounded-xl overflow-hidden transition-all ${
                      selectedPhotoIndex === index 
                        ? 'ring-4 ring-pink-500 scale-105 shadow-lg' 
                        : 'hover:scale-105 hover:shadow-md'
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
        <section className="py-12 md:py-16 bg-gradient-to-br from-pink-500 via-violet-500 to-purple-600">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="font-syne text-2xl md:text-4xl font-bold text-white mb-4">
              Help {contestant.full_name.split(' ')[0]} Win!
            </h2>
            <p className="text-white/80 mb-8 max-w-xl mx-auto">
              Every vote counts. Support {contestant.full_name} by casting your vote today!
            </p>
            <Button
              size="lg"
              onClick={() => setVotingModalOpen(true)}
              className="h-14 px-12 text-lg bg-white text-pink-600 hover:bg-white/90 rounded-full font-bold shadow-xl btn-jelly"
              data-testid="bottom-vote-btn"
            >
              <Heart className="w-5 h-5 mr-2 fill-pink-600" />
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
