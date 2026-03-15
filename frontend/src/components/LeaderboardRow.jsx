import React from 'react';
import { Link } from 'react-router-dom';
import { formatNumber, getPlaceholderImage } from '../lib/utils';
import { Trophy } from 'lucide-react';

export const LeaderboardRow = ({ entry, maxVotes }) => {
  const { rank, full_name, slug, photo, category_name, vote_count } = entry;
  const imageUrl = photo || getPlaceholderImage(rank - 1);
  const votePercentage = maxVotes > 0 ? (vote_count / maxVotes) * 100 : 0;

  const getRankStyle = () => {
    if (rank === 1) return 'rank-gold text-black';
    if (rank === 2) return 'rank-silver text-black';
    if (rank === 3) return 'rank-bronze text-black';
    return 'bg-white/5 text-white/60';
  };

  const getRowStyle = () => {
    if (rank === 1) return 'bg-gold/5 border-gold/30';
    if (rank === 2) return 'bg-white/3 border-white/10';
    if (rank === 3) return 'bg-orange-900/10 border-orange-700/20';
    return 'border-white/5 hover:border-white/10';
  };

  return (
    <Link
      to={`/${slug}`}
      className={`group flex items-center gap-4 md:gap-6 p-4 md:p-5 border transition-all duration-300 hover:bg-white/5 ${getRowStyle()}`}
      data-testid={`leaderboard-row-${rank}`}
    >
      {/* Rank */}
      <div className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center font-serif text-lg md:text-xl font-bold rounded-full ${getRankStyle()}`}>
        {rank <= 3 ? <Trophy className="w-5 h-5" /> : rank}
      </div>

      {/* Avatar */}
      <div className="w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-gold/50 transition-colors">
        <img
          src={imageUrl}
          alt={full_name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-serif text-lg md:text-xl text-white truncate group-hover:text-gold transition-colors">
          {full_name}
        </h4>
        {category_name && (
          <p className="text-xs text-white/40 uppercase tracking-wider mt-0.5">
            {category_name}
          </p>
        )}
      </div>

      {/* Vote Bar & Count */}
      <div className="w-32 md:w-48 hidden sm:block">
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-gold to-gold-light transition-all duration-500"
            style={{ width: `${votePercentage}%` }}
          />
        </div>
      </div>

      {/* Vote Count */}
      <div className="text-right">
        <span className="font-semibold text-lg md:text-xl text-white">
          {formatNumber(vote_count)}
        </span>
        <span className="text-xs text-white/40 block">votes</span>
      </div>
    </Link>
  );
};

export const LeaderboardRowSkeleton = () => {
  return (
    <div className="flex items-center gap-4 md:gap-6 p-4 md:p-5 border border-white/5">
      <div className="w-10 h-10 md:w-12 md:h-12 rounded-full skeleton" />
      <div className="w-12 h-12 md:w-14 md:h-14 rounded-full skeleton" />
      <div className="flex-1 space-y-2">
        <div className="h-5 w-32 skeleton rounded" />
        <div className="h-3 w-20 skeleton rounded" />
      </div>
      <div className="w-32 md:w-48 hidden sm:block">
        <div className="h-1.5 skeleton rounded-full" />
      </div>
      <div className="w-16 text-right">
        <div className="h-6 skeleton rounded" />
      </div>
    </div>
  );
};

export default LeaderboardRow;
