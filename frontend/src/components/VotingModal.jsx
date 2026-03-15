import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from './ui/input-otp';
import { votingAPI } from '../lib/api';
import { toast } from 'sonner';
import { Mail, CheckCircle, Loader2, Shield } from 'lucide-react';

export const VotingModal = ({ isOpen, onClose, contestant, onVoteSuccess }) => {
  const [step, setStep] = useState('email'); // email, otp, success
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
      <DialogContent className="bg-[#0a0a0a] border-white/10 sm:max-w-md" data-testid="voting-modal">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-white text-center">
            {step === 'success' ? 'Vote Confirmed!' : `Vote for ${contestant?.full_name}`}
          </DialogTitle>
          <DialogDescription className="text-white/50 text-center">
            {step === 'email' && 'Enter your email to receive a verification code'}
            {step === 'otp' && `We sent a code to ${email}`}
            {step === 'success' && 'Your vote has been recorded'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {step === 'email' && (
            <form onSubmit={handleRequestOTP} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/70">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-gold"
                    data-testid="vote-email-input"
                  />
                </div>
              </div>

              <div className="flex items-start gap-2 text-xs text-white/40">
                <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>Your email is only used for vote verification. One vote per email every 24 hours.</p>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gold hover:bg-gold-light text-black font-bold uppercase tracking-widest rounded-full gold-glow-hover"
                data-testid="request-otp-btn"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Send Verification Code'
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
                    <InputOTPSlot index={0} className="bg-white/5 border-white/10 text-white" />
                    <InputOTPSlot index={1} className="bg-white/5 border-white/10 text-white" />
                    <InputOTPSlot index={2} className="bg-white/5 border-white/10 text-white" />
                    <InputOTPSlot index={3} className="bg-white/5 border-white/10 text-white" />
                    <InputOTPSlot index={4} className="bg-white/5 border-white/10 text-white" />
                    <InputOTPSlot index={5} className="bg-white/5 border-white/10 text-white" />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                onClick={handleVerifyOTP}
                disabled={loading || otp.length !== 6}
                className="w-full bg-gold hover:bg-gold-light text-black font-bold uppercase tracking-widest rounded-full gold-glow-hover"
                data-testid="verify-otp-btn"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Confirm Vote'
                )}
              </Button>

              <button
                onClick={() => setStep('email')}
                className="w-full text-sm text-white/40 hover:text-white/60 transition-colors"
              >
                Use different email
              </button>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-gold/10 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-gold" />
              </div>
              <p className="text-white/70">
                Thank you for supporting <span className="text-white font-semibold">{contestant?.full_name}</span>!
              </p>
              <Button
                onClick={handleClose}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/5 rounded-full px-8"
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
