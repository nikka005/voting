import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from './ui/input-otp';
import { votingAPI } from '../lib/api';
import { toast } from 'sonner';
import { Mail, CheckCircle, Loader2, Shield, Sparkles, PartyPopper } from 'lucide-react';

export const VotingModal = ({ isOpen, onClose, contestant, onVoteSuccess }) => {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    setLoading(true);
    try {
      const response = await votingAPI.requestOTP({
        email,
        contestant_id: contestant.id,
      });
      toast.success(response.data.message);
      setStep('otp');
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to send OTP';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      toast.error('Please enter the complete 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await votingAPI.verifyAndVote({
        email,
        contestant_id: contestant.id,
        otp,
      });
      toast.success(response.data.message);
      setStep('success');
      if (onVoteSuccess) {
        onVoteSuccess(response.data.new_vote_count);
      }
    } catch (error) {
      const message = error.response?.data?.detail || 'Invalid OTP';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('email');
    setEmail('');
    setOtp('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-white border-slate-200 sm:max-w-md rounded-3xl" data-testid="voting-modal">
        <DialogHeader>
          <DialogTitle className="font-syne text-2xl font-bold text-center gradient-text">
            {step === 'success' ? 'Vote Confirmed!' : `Vote for ${contestant?.full_name}`}
          </DialogTitle>
          <DialogDescription className="text-slate-500 text-center">
            {step === 'email' && 'Enter your email to receive a verification code'}
            {step === 'otp' && `We sent a code to ${email}`}
            {step === 'success' && 'Your vote has been recorded'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {step === 'email' && (
            <form onSubmit={handleRequestOTP} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 font-semibold">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="pl-12 h-12 rounded-xl bg-slate-50 border-slate-200 focus:border-pink-500 focus:ring-pink-500/20"
                    data-testid="vote-email-input"
                  />
                </div>
              </div>

              <div className="flex items-start gap-2 text-xs text-slate-500 bg-pink-50 p-3 rounded-xl">
                <Shield className="w-4 h-4 mt-0.5 flex-shrink-0 text-pink-500" />
                <p>Your email is only used for vote verification. One vote per email every 24 hours.</p>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 btn-gradient btn-jelly text-base"
                data-testid="request-otp-btn"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Send Verification Code
                  </>
                )}
              </Button>
            </form>
          )}

          {step === 'otp' && (
            <div className="space-y-6">
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={setOtp}
                  data-testid="otp-input"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className="w-12 h-14 text-xl rounded-xl bg-slate-50 border-slate-200" />
                    <InputOTPSlot index={1} className="w-12 h-14 text-xl rounded-xl bg-slate-50 border-slate-200" />
                    <InputOTPSlot index={2} className="w-12 h-14 text-xl rounded-xl bg-slate-50 border-slate-200" />
                    <InputOTPSlot index={3} className="w-12 h-14 text-xl rounded-xl bg-slate-50 border-slate-200" />
                    <InputOTPSlot index={4} className="w-12 h-14 text-xl rounded-xl bg-slate-50 border-slate-200" />
                    <InputOTPSlot index={5} className="w-12 h-14 text-xl rounded-xl bg-slate-50 border-slate-200" />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                onClick={handleVerifyOTP}
                disabled={loading || otp.length !== 6}
                className="w-full h-12 btn-gradient btn-jelly text-base"
                data-testid="verify-otp-btn"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Confirm Vote
                  </>
                )}
              </Button>

              <button
                onClick={() => setStep('email')}
                className="w-full text-sm text-slate-500 hover:text-pink-600 transition-colors"
              >
                Use different email
              </button>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center space-y-6">
              <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-pink-100 to-violet-100 flex items-center justify-center animate-bounce-in">
                <PartyPopper className="w-12 h-12 text-pink-500" />
              </div>
              <div>
                <p className="text-slate-600 mb-2">
                  Thank you for supporting
                </p>
                <p className="font-syne text-xl font-bold gradient-text">{contestant?.full_name}</p>
              </div>
              <Button
                onClick={handleClose}
                variant="outline"
                className="border-pink-200 text-pink-600 hover:bg-pink-50 rounded-full px-8"
                data-testid="close-success-btn"
              >
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VotingModal;
