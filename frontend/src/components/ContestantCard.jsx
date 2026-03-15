import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';
import { formatNumber, getPlaceholderImage } from '../lib/utils';

export const ContestantCard = ({ contestant, showVoteButton = true }) => {
  const { id, full_name, slug, photos, category_name, vote_count } = contestant;
  const imageUrl = photos?.[0] || getPlaceholderImage(0);

  return (
    <div 
      className="contestant-card group relative overflow-hidden bg-[#0a0a0a] border border-white/5"
      data-testid={`contestant-card-${id}`}
    >
      {/* Gold border on hover */}
      <div className="card-border absolute inset-0 border-2 border-gold opacity-0 transition-opacity duration-300 pointer-events-none z-10" />
      
      {/* Image Container */}
      <div className="relative aspect-[3/4] overflow-hidden">
        <img
          src={imageUrl}
          alt={full_name}
          className="card-image w-full h-full object-cover transition-transform duration-500"
          loading="lazy"
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
        
        {/* Category Badge */}
        {category_name && (
          <div className="absolute top-4 left-4 px-3 py-1 bg-black/60 backdrop-blur-sm border border-white/10 text-xs text-white/80 tracking-wider uppercase">
            {category_name}
          </div>
        )}

        {/* Vote Count */}
        <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 bg-black/60 backdrop-blur-sm border border-white/10">
          <Heart className="w-3.5 h-3.5 text-gold fill-gold" />
          <span className="text-sm font-semibold text-white">{formatNumber(vote_count)}</span>
        </div>

        {/* Content Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
          <h3 className="font-serif text-xl md:text-2xl text-white mb-3 tracking-tight">
            {full_name}
          </h3>
          
          {showVoteButton && (
            <div className="flex gap-2">
              <Link to={`/${slug}`} className="flex-1">
                <Button 
                  className="w-full bg-gold hover:bg-gold-light text-black font-bold uppercase tracking-widest rounded-full btn-scale gold-glow-hover"
                  data-testid={`vote-btn-${id}`}
                >
                  Vote Now
                </Button>
              </Link>
              <Link to={`/${slug}`}>
                <Button 
                  variant="outline" 
                  size="icon"
                  className="border-white/20 text-white hover:bg-white/10 rounded-full"
                  data-testid={`view-btn-${id}`}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const ContestantCardSkeleton = () => {
  return (
    <div className="bg-[#0a0a0a] border border-white/5 overflow-hidden">
      <div className="aspect-[3/4] skeleton" />
    </div>
  );
};

export default ContestantCard;
