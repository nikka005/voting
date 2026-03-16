import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Loader2, CheckCircle2, XCircle, Heart, Sparkles, ArrowLeft, ExternalLink } from 'lucide-react';
import { votingAPI } from '../lib/api';
import { formatNumber } from '../lib/utils';
import { toast } from 'sonner';

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState('checking');
  const [result, setResult] = useState(null);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      return;
    }

    const checkPaymentStatus = async (attempts = 0) => {
      const maxAttempts = 5;
      const pollInterval = 2000;

      if (attempts >= maxAttempts) {
        setStatus('timeout');
        return;
      }

      try {
        const response = await votingAPI.getCheckoutStatus(sessionId);
        
        if (response.data.payment_status === 'paid') {
          setResult(response.data);
          setStatus('success');
          toast.success(`${response.data.votes_added} votes added successfully!`);
          return;
        } else if (response.data.status === 'expired') {
          setStatus('expired');
          return;
        }

        // Continue polling
        setTimeout(() => checkPaymentStatus(attempts + 1), pollInterval);
      } catch (error) {
        console.error('Error checking payment status:', error);
        setStatus('error');
      }
    };

    checkPaymentStatus();
  }, [sessionId]);

  return (
    <Layout>
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
          {status === 'checking' && (
            <Card className="bg-white/70 backdrop-blur-xl border-slate-200/50 shadow-xl text-center">
              <CardContent className="pt-12 pb-8 px-8">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-pink-100 to-violet-100 flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
                </div>
                <h1 className="font-syne text-2xl font-bold text-slate-900 mb-2">Processing Payment</h1>
                <p className="text-slate-500">Please wait while we verify your payment...</p>
              </CardContent>
            </Card>
          )}

          {status === 'success' && result && (
            <Card className="bg-white/70 backdrop-blur-xl border-green-200 shadow-xl text-center overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-500" />
              <CardContent className="pt-12 pb-8 px-8">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/30">
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
                <h1 className="font-syne text-2xl font-bold text-slate-900 mb-2">Payment Successful!</h1>
                <p className="text-slate-500 mb-6">{result.message}</p>
                
                <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200 mb-6">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Heart className="w-6 h-6 text-amber-500" />
                    <span className="text-3xl font-bold text-amber-500">+{result.votes_added}</span>
                  </div>
                  <p className="text-sm text-slate-600">votes added</p>
                  {result.new_vote_count && (
                    <p className="text-xs text-slate-500 mt-2">
                      New total: <span className="font-semibold">{formatNumber(result.new_vote_count)} votes</span>
                    </p>
                  )}
                </div>

                <Button onClick={() => navigate('/')} className="w-full btn-gradient btn-jelly">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </CardContent>
            </Card>
          )}

          {status === 'error' && (
            <Card className="bg-white/70 backdrop-blur-xl border-red-200 shadow-xl text-center overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-red-500 to-rose-500" />
              <CardContent className="pt-12 pb-8 px-8">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center shadow-lg shadow-red-500/30">
                  <XCircle className="w-10 h-10 text-white" />
                </div>
                <h1 className="font-syne text-2xl font-bold text-slate-900 mb-2">Payment Failed</h1>
                <p className="text-slate-500 mb-6">
                  We couldn't verify your payment. If you were charged, please contact support.
                </p>
                <Button onClick={() => navigate('/')} variant="outline" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </CardContent>
            </Card>
          )}

          {status === 'expired' && (
            <Card className="bg-white/70 backdrop-blur-xl border-amber-200 shadow-xl text-center overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-amber-500 to-orange-500" />
              <CardContent className="pt-12 pb-8 px-8">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
                <h1 className="font-syne text-2xl font-bold text-slate-900 mb-2">Session Expired</h1>
                <p className="text-slate-500 mb-6">
                  Your payment session has expired. Please try again.
                </p>
                <Button onClick={() => navigate('/')} variant="outline" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </CardContent>
            </Card>
          )}

          {status === 'timeout' && (
            <Card className="bg-white/70 backdrop-blur-xl border-slate-200 shadow-xl text-center overflow-hidden">
              <CardContent className="pt-12 pb-8 px-8">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-100 flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-slate-400" />
                </div>
                <h1 className="font-syne text-2xl font-bold text-slate-900 mb-2">Still Processing</h1>
                <p className="text-slate-500 mb-6">
                  Your payment is still being processed. Please check back later.
                </p>
                <Button onClick={() => window.location.reload()} className="w-full btn-gradient btn-jelly mb-3">
                  Refresh Status
                </Button>
                <Button onClick={() => navigate('/')} variant="outline" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
