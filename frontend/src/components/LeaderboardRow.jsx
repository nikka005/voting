import React from 'react';
import { Link } from 'react-router-dom';
import { formatNumber, getPlaceholderImage } from '../lib/utils';
import { Crown, TrendingUp } from 'lucide-react';

export const LeaderboardRow = ({ entry, maxVotes }) => {
  const { rank, full_name, slug, photo, category_name, vote_count } = entry;
  const imageUrl = photo || getPlaceholderImage(rank - 1);
  const votePercentage = maxVotes > 0 ? (vote_count / maxVotes) * 100 : 0;

  const getRankBadge = () => {
    if (rank === 1) return 'rank-1';
    if (rank === 2) return 'rank-2';
    if (rank === 3) return 'rank-3';
    return 'bg-slate-100 text-slate-600';
  };

  const getRowStyle = () => {
    if (rank === 1) return 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200';
    if (rank === 2) return 'bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200';
    if (rank === 3) return 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200';
    return 'bg-white border-slate-100 hover:border-pink-200';
  };

  return (
    <Link
      to={`/${slug}`}
      className={`group flex items-center gap-4 md:gap-6 p-4 md:p-5 rounded-2xl border-2 transition-all duration-300 hover:shadow-lg hover:shadow-pink-500/5 ${getRowStyle()}`}
      data-testid={`leaderboard-row-${rank}`}
    >
      {/* Rank */}
      <div className={`w-12 h-12 md:w-14 md:h-14 flex items-center justify-center font-syne text-lg md:text-xl font-bold rounded-2xl ${getRankBadge()}`}>
        {rank <= 3 ? <Crown className="w-6 h-6" /> : rank}
      </div>

      {/* Avatar */}
      <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl overflow-hidden border-2 border-white shadow-lg group-hover:scale-105 transition-transform">
        <img
          src={imageUrl}
          alt={full_name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-syne text-lg md:text-xl font-bold text-slate-900 truncate group-hover:text-pink-600 transition-colors">
          {full_name}
        </h4>
        {category_name && (
          <p className="text-xs font-semibold text-pink-500 uppercase tracking-wider mt-0.5">
            {category_name}
          </p>
        )}
      </div>

      {/* Vote Bar */}
      <div className="w-24 md:w-40 hidden sm:block">
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-pink-500 to-violet-500 rounded-full transition-all duration-700"
            style={{ width: `${votePercentage}%` }}
          />
        </div>
      </div>

      {/* Vote Count */}
      <div className="text-right flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-green-500 hidden md:block" />
        <div>
          <span className="font-syne font-bold text-xl md:text-2xl text-slate-900">
            {formatNumber(vote_count)}
          </span>
          <span className="text-xs text-slate-400 block">votes</span>
        </div>
      </div>
    </Link>
  );
};

export const LeaderboardRowSkeleton = () => {
  return (
    <div className="flex items-center gap-4 md:gap-6 p-4 md:p-5 rounded-2xl bg-white border border-slate-100">
      <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl skeleton" />
      <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl skeleton" />
      <div className="flex-1 space-y-2">
        <div className="h-5 w-32 skeleton rounded-lg" />
        <div className="h-3 w-20 skeleton rounded-lg" />
      </div>
      <div className="w-24 md:w-40 hidden sm:block">
        <div className="h-2 skeleton rounded-full" />
      </div>
      <div className="w-16 text-right">
        <div className="h-7 skeleton rounded-lg" />
      </div>
    </div>
  );
};

export default LeaderboardRow;
