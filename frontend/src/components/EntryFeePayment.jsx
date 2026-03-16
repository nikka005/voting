import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { entryFeeAPI, contestsAPI } from '../lib/api';
import { toast } from 'sonner';
import {
  CreditCard, DollarSign, Trophy, Sparkles, Check, AlertCircle,
  Loader2, ChevronRight, Shield, Star, Crown
} from 'lucide-react';

export function EntryFeePayment({ onPaymentSuccess }) {
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [contest, setContest] = useState(null);

  useEffect(() => {
    checkPaymentStatus();
  }, []);

  const checkPaymentStatus = async () => {
    try {
      setCheckingStatus(true);
      const [statusRes, contestRes] = await Promise.all([
        entryFeeAPI.getMyStatus().catch(() => ({ data: { status: 'not_paid' } })),
        contestsAPI.getActive().catch(() => ({ data: null }))
      ]);
      setPaymentStatus(statusRes.data);
      setContest(contestRes.data);
      
      // Check URL for payment success
      const urlParams = new URLSearchParams(window.location.search);
      const paymentResult = urlParams.get('payment');
      const sessionId = urlParams.get('session_id');
      
      if (paymentResult === 'success' && sessionId) {
        // Verify payment
        try {
          const verifyRes = await entryFeeAPI.verifyPayment(sessionId);
          if (verifyRes.data.status === 'completed') {
            toast.success('Payment successful! Your entry is confirmed.');
            setPaymentStatus({ status: 'paid', entry_fee_paid: true });
            onPaymentSuccess?.();
          }
        } catch (err) {
          console.error('Payment verification failed:', err);
        }
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);
      } else if (paymentResult === 'cancelled') {
        toast.error('Payment was cancelled');
        window.history.replaceState({}, '', window.location.pathname);
      }
    } catch (err) {
      console.error('Failed to check payment status:', err);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handlePayEntryFee = async () => {
    setLoading(true);
    try {
      const response = await entryFeeAPI.createCheckout(
        contest?.id || 'default',
        window.location.origin
      );
      
      if (response.data.checkout_url) {
        window.location.href = response.data.checkout_url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err) {
      console.error('Payment error:', err);
      toast.error(err.response?.data?.detail || 'Failed to initiate payment');
      setLoading(false);
    }
  };

  if (checkingStatus) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
      </div>
    );
  }

  // If already paid, show success status
  if (paymentStatus?.status === 'paid' || paymentStatus?.entry_fee_paid) {
    return (
      <div className="p-6 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
            <Check className="w-7 h-7 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-green-400">Entry Fee Paid</h3>
            <p className="text-slate-400 text-sm">Your contest entry is confirmed!</p>
          </div>
        </div>
      </div>
    );
  }

  // Show payment required banner
  const entryFee = contest?.entry_fee || 50;

  return (
    <div className="space-y-4">
      {/* Entry Fee Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-pink-500/10 border border-amber-500/20 overflow-hidden relative">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-pink-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
                <Trophy className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">Complete Your Entry</h3>
                <p className="text-slate-400 text-sm">Pay the entry fee to join the contest</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-amber-400">${entryFee}</p>
              <p className="text-xs text-slate-500">One-time entry fee</p>
            </div>
          </div>

          {/* Benefits */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
              <Star className="w-5 h-5 text-amber-400" />
              <span className="text-sm text-slate-300">Appear on voting site</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
              <Crown className="w-5 h-5 text-pink-400" />
              <span className="text-sm text-slate-300">Compete for $35,000 prize</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
              <Sparkles className="w-5 h-5 text-violet-400" />
              <span className="text-sm text-slate-300">Get featured to voters</span>
            </div>
          </div>

          {/* Pay Button */}
          <Button
            onClick={handlePayEntryFee}
            disabled={loading}
            className="w-full h-14 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-lg rounded-xl shadow-lg shadow-amber-500/25"
            data-testid="pay-entry-fee-btn"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5 mr-2" />
                Pay Entry Fee - ${entryFee}
                <ChevronRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>

          {/* Security Note */}
          <div className="flex items-center justify-center gap-2 mt-4 text-slate-500 text-xs">
            <Shield className="w-4 h-4" />
            <span>Secure payment powered by Stripe</span>
          </div>
        </div>
      </div>

      {/* Alert */}
      <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-yellow-400 font-medium text-sm">Payment Required</p>
          <p className="text-slate-400 text-xs mt-1">
            Your profile won't appear on the public voting site until you pay the entry fee.
          </p>
        </div>
      </div>
    </div>
  );
}

export default EntryFeePayment;
