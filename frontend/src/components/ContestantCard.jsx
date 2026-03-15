import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ArrowUpRight } from 'lucide-react';
import { Button } from './ui/button';
import { formatNumber, getPlaceholderImage } from '../lib/utils';

export const ContestantCard = ({ contestant, showVoteButton = true }) => {
  const { id, full_name, slug, photos, category_name, vote_count } = contestant;
  const imageUrl = photos?.[0] || getPlaceholderImage(0);

  return (
    <div 
      className="contestant-card group"
      data-testid={`contestant-card-${id}`}
    >
      {/* Image Container */}
      <div className="relative aspect-[3/4] overflow-hidden">
        <img
          src={imageUrl}
          alt={full_name}
          className="contestant-image w-full h-full object-cover transition-transform duration-700"
          loading="lazy"
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Category Badge */}
        {category_name && (
          <div className="absolute top-4 left-4 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full text-xs font-bold text-pink-600 shadow-sm">
            {category_name}
          </div>
        )}

        {/* Vote Count */}
        <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-sm">
          <Heart className="w-4 h-4 text-pink-500 fill-pink-500" />
          <span className="text-sm font-bold text-slate-900">{formatNumber(vote_count)}</span>
        </div>

        {/* Content Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <h3 className="font-syne text-xl md:text-2xl font-bold text-white mb-3 drop-shadow-lg">
            {full_name}
          </h3>
          
          {showVoteButton && (
            <div className="flex gap-2">
              <Link to={`/${slug}`} className="flex-1">
                <Button 
                  className="w-full btn-gradient btn-jelly"
                  data-testid={`vote-btn-${id}`}
                >
                  Vote Now
                </Button>
              </Link>
              <Link to={`/${slug}`}>
                <Button 
                  variant="secondary"
                  size="icon"
                  className="bg-white/90 hover:bg-white text-pink-600 rounded-full shadow-sm"
                  data-testid={`view-btn-${id}`}
                >
                  <ArrowUpRight className="w-5 h-5" />
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
    <div className="rounded-3xl overflow-hidden bg-white border border-slate-100">
      <div className="aspect-[3/4] skeleton" />
    </div>
  );
};

export default ContestantCard;
