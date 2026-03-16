import React, { useState, useEffect } from 'react';
import { X, Sparkles, ArrowRight, Gift, Crown, Star } from 'lucide-react';
import { Button } from './ui/button';
import { Link } from 'react-router-dom';

export default function PromoBannerPopup() {
  const [banners, setBanners] = useState([]);
  const [currentBanner, setCurrentBanner] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    fetchBanners();
  }, []);

  useEffect(() => {
    // Show popup after 2 seconds if there's an active banner
    if (banners.length > 0) {
      const dismissed = sessionStorage.getItem('banner_dismissed');
      if (!dismissed) {
        const timer = setTimeout(() => {
          setCurrentBanner(banners[0]);
          setIsVisible(true);
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [banners]);

  const fetchBanners = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/banners/active`);
      if (response.ok) {
        const data = await response.json();
        setBanners(data.filter(b => b.display_type === 'popup'));
      }
    } catch (error) {
      console.error('Failed to fetch banners:', error);
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsClosing(false);
      sessionStorage.setItem('banner_dismissed', 'true');
    }, 300);
  };

  if (!isVisible || !currentBanner) return null;

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Banner Content */}
      <div className={`relative w-full max-w-2xl transform ${isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'} transition-all duration-300`}>
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute -top-3 -right-3 z-10 w-10 h-10 rounded-full bg-white shadow-xl flex items-center justify-center hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5 text-slate-600" />
        </button>

        {/* Main Banner Card */}
        <div className={`relative overflow-hidden rounded-3xl shadow-2xl bg-gradient-to-br ${currentBanner.background_gradient || 'from-amber-500 via-orange-500 to-pink-500'}`}>
          {/* Decorative Elements */}
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute bottom-10 right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
          </div>

          {/* Sparkle Decorations */}
          <div className="absolute top-6 right-20">
            <Sparkles className="w-6 h-6 text-white/40 animate-pulse" />
          </div>
          <div className="absolute bottom-16 left-10">
            <Star className="w-5 h-5 text-white/30 animate-pulse" style={{ animationDelay: '0.5s' }} />
          </div>
          <div className="absolute top-20 left-20">
            <Star className="w-4 h-4 text-white/20 animate-pulse" style={{ animationDelay: '1s' }} />
          </div>

          {/* Content */}
          <div className="relative p-8 sm:p-12 text-center">
            {/* Icon */}
            <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-6 shadow-lg">
              {currentBanner.display_type === 'popup' ? (
                <Crown className="w-10 h-10 text-white" />
              ) : (
                <Gift className="w-10 h-10 text-white" />
              )}
            </div>

            {/* Title */}
            <h2 className="font-syne text-3xl sm:text-4xl font-bold text-white mb-3 drop-shadow-lg">
              {currentBanner.title}
            </h2>

            {/* Subtitle */}
            {currentBanner.subtitle && (
              <p className="text-xl sm:text-2xl font-semibold text-white/90 mb-4">
                {currentBanner.subtitle}
              </p>
            )}

            {/* Description */}
            {currentBanner.description && (
              <p className="text-white/80 mb-8 max-w-md mx-auto leading-relaxed">
                {currentBanner.description}
              </p>
            )}

            {/* CTA Button */}
            <Link to={currentBanner.button_link || '/portal/register'} onClick={handleClose}>
              <Button 
                size="lg" 
                className="h-14 px-10 text-lg bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-full shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all"
              >
                {currentBanner.button_text || 'Join Now'}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>

            {/* Secondary Text */}
            <p className="text-white/60 text-sm mt-6">
              Limited time offer • Don't miss out!
            </p>
          </div>

          {/* Bottom Gradient Bar */}
          <div className="h-1 bg-gradient-to-r from-white/0 via-white/30 to-white/0" />
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fade-out {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        .animate-fade-out {
          animation: fade-out 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
