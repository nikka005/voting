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
  MapPin, 
  Calendar,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
  Copy,
  Check
} from 'lucide-react';
import { toast } from 'sonner';

export default function VotingPage() {
  const { year, slug } = useParams();
  const [contestant, setContestant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
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

  const nextPhoto = () => {
    if (contestant?.photos?.length > 1) {
      setCurrentPhotoIndex((prev) => (prev + 1) % contestant.photos.length);
    }
  };

  const prevPhoto = () => {
    if (contestant?.photos?.length > 1) {
      setCurrentPhotoIndex((prev) => 
        prev === 0 ? contestant.photos.length - 1 : prev - 1
      );
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!contestant) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
          <div className="w-24 h-24 mb-6 rounded-full bg-pink-100 flex items-center justify-center">
            <Sparkles className="w-12 h-12 text-pink-400" />
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
  const currentPhoto = photos[currentPhotoIndex];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Back Button */}
        <Link 
          to="/contestants" 
          className="inline-flex items-center text-slate-500 hover:text-pink-600 transition-colors mb-8 font-medium"
          data-testid="back-to-contestants"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Contestants
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
          {/* Photo Gallery */}
          <div className="relative">
            <div className="aspect-[3/4] relative overflow-hidden rounded-3xl bg-slate-100 shadow-2xl shadow-pink-500/10">
              <img
                src={currentPhoto}
                alt={contestant.full_name}
                className="w-full h-full object-cover"
                data-testid="contestant-photo"
              />
              
              {/* Photo Navigation */}
              {photos.length > 1 && (
                <>
                  <button
                    onClick={prevPhoto}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-slate-700 hover:bg-white shadow-lg transition-all"
                    data-testid="prev-photo-btn"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={nextPhoto}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-slate-700 hover:bg-white shadow-lg transition-all"
                    data-testid="next-photo-btn"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                  
                  {/* Photo Indicators */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-white/80 backdrop-blur-sm rounded-full px-3 py-2">
                    {photos.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentPhotoIndex(idx)}
                        className={`w-2.5 h-2.5 rounded-full transition-all ${
                          idx === currentPhotoIndex ? 'bg-pink-500 scale-125' : 'bg-slate-300'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Info Section */}
          <div className="flex flex-col">
            {/* Category Badge */}
            {contestant.category_name && (
              <span className="inline-flex items-center gap-1 w-fit px-4 py-1.5 mb-4 text-sm font-bold uppercase tracking-wider text-pink-600 bg-pink-100 rounded-full">
                <Sparkles className="w-3.5 h-3.5" />
                {contestant.category_name}
              </span>
            )}

            {/* Name */}
            <h1 className="font-syne text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-6">
              {contestant.full_name}
            </h1>

            {/* Vote Count */}
            <div className="flex items-center gap-4 mb-8 p-5 bg-gradient-to-r from-pink-50 to-violet-50 rounded-2xl border border-pink-100">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center shadow-lg shadow-pink-500/30">
                <Heart className="w-7 h-7 text-white fill-white" />
              </div>
              <div>
                <span className="font-syne text-4xl font-bold gradient-text">{formatNumber(contestant.vote_count)}</span>
                <span className="text-slate-500 block text-sm">total votes</span>
              </div>
            </div>

            {/* Vote Button */}
            <Button
              size="lg"
              onClick={() => setVotingModalOpen(true)}
              className="btn-gradient py-7 text-lg btn-jelly shadow-pink-lg mb-4"
              data-testid="vote-now-btn"
            >
              <Heart className="w-5 h-5 mr-2" />
              Vote Now
            </Button>

            {/* Share Button */}
            <Button
              variant="outline"
              onClick={handleShare}
              className="border-2 border-slate-200 text-slate-700 hover:border-pink-300 hover:text-pink-600 rounded-full mb-8"
              data-testid="share-btn"
            >
              {copied ? <Check className="w-4 h-4 mr-2 text-green-500" /> : <Share2 className="w-4 h-4 mr-2" />}
              {copied ? 'Link Copied!' : 'Share Voting Link'}
            </Button>

            {/* Details */}
            <div className="space-y-3 mb-8">
              {contestant.location && (
                <div className="flex items-center gap-3 text-slate-600">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-slate-500" />
                  </div>
                  <span className="font-medium">{contestant.location}</span>
                </div>
              )}
              {contestant.age && (
                <div className="flex items-center gap-3 text-slate-600">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-slate-500" />
                  </div>
                  <span className="font-medium">{contestant.age} years old</span>
                </div>
              )}
            </div>

            {/* Bio */}
            {contestant.bio && (
              <div className="mb-8 p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="font-syne text-lg font-bold text-slate-900 mb-3">About</h3>
                <p className="text-slate-600 leading-relaxed">{contestant.bio}</p>
              </div>
            )}

            {/* Social Links */}
            <div className="flex gap-3">
              {contestant.social_instagram && (
                <a
                  href={`https://instagram.com/${contestant.social_instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center text-white hover:scale-110 transition-transform shadow-lg"
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
                  className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white hover:scale-110 transition-transform shadow-lg"
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
                  className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white hover:scale-110 transition-transform shadow-lg"
                  data-testid="twitter-link"
                >
                  <Twitter className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>
        </div>
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
