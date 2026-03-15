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
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

export default function VotingPage() {
  const { year, slug } = useParams();
  const [contestant, setContestant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [votingModalOpen, setVotingModalOpen] = useState(false);

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
          title: `Vote for ${contestant.full_name} - Lumina Contest`,
          text: `Support ${contestant.full_name} in the Lumina Beauty Contest!`,
          url,
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Voting link copied to clipboard!');
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
          <Loader2 className="w-8 h-8 text-gold animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!contestant) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
          <h1 className="font-serif text-3xl text-white mb-4">Contestant Not Found</h1>
          <p className="text-white/50 mb-6">This contestant may not exist or hasn't been approved yet.</p>
          <Link to="/contestants">
            <Button className="bg-gold hover:bg-gold-light text-black rounded-full">
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
          className="inline-flex items-center text-white/50 hover:text-white transition-colors mb-8"
          data-testid="back-to-contestants"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Contestants
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
          {/* Photo Gallery */}
          <div className="relative">
            <div className="aspect-[3/4] relative overflow-hidden bg-[#0a0a0a]">
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
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                    data-testid="prev-photo-btn"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={nextPhoto}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                    data-testid="next-photo-btn"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                  
                  {/* Photo Indicators */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {photos.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentPhotoIndex(idx)}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          idx === currentPhotoIndex ? 'bg-gold' : 'bg-white/30'
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
              <span className="text-gold text-sm uppercase tracking-widest mb-4">
                {contestant.category_name}
              </span>
            )}

            {/* Name */}
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-white mb-6">
              {contestant.full_name}
            </h1>

            {/* Vote Count */}
            <div className="flex items-center gap-3 mb-8">
              <Heart className="w-6 h-6 text-gold fill-gold" />
              <span className="text-3xl font-bold text-white">{formatNumber(contestant.vote_count)}</span>
              <span className="text-white/50">votes</span>
            </div>

            {/* Vote Button */}
            <Button
              size="lg"
              onClick={() => setVotingModalOpen(true)}
              className="bg-gold hover:bg-gold-light text-black font-bold uppercase tracking-widest rounded-full py-6 text-lg gold-glow btn-scale mb-6"
              data-testid="vote-now-btn"
            >
              Vote Now
            </Button>

            {/* Share Button */}
            <Button
              variant="outline"
              onClick={handleShare}
              className="border-white/20 text-white hover:bg-white/5 rounded-full mb-8"
              data-testid="share-btn"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share Voting Link
            </Button>

            {/* Details */}
            <div className="space-y-4 mb-8">
              {contestant.location && (
                <div className="flex items-center gap-3 text-white/60">
                  <MapPin className="w-5 h-5" />
                  <span>{contestant.location}</span>
                </div>
              )}
              {contestant.age && (
                <div className="flex items-center gap-3 text-white/60">
                  <Calendar className="w-5 h-5" />
                  <span>{contestant.age} years old</span>
                </div>
              )}
            </div>

            {/* Bio */}
            {contestant.bio && (
              <div className="mb-8">
                <h3 className="font-serif text-xl text-white mb-3">About</h3>
                <p className="text-white/60 leading-relaxed">{contestant.bio}</p>
              </div>
            )}

            {/* Social Links */}
            <div className="flex gap-4">
              {contestant.social_instagram && (
                <a
                  href={`https://instagram.com/${contestant.social_instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-gold hover:border-gold/50 transition-colors"
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
                  className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-gold hover:border-gold/50 transition-colors"
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
                  className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-gold hover:border-gold/50 transition-colors"
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
