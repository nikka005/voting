import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { XCircle, ArrowLeft, RefreshCw, HelpCircle } from 'lucide-react';
import { Button } from '../components/ui/button';

export default function PaymentFailedPage() {
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') || 'vote'; // 'vote' or 'entry'
  const contestantId = searchParams.get('contestant_id');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl p-8 border border-slate-700/50 shadow-2xl text-center">
          {/* Failed Icon */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
            <XCircle className="w-10 h-10 text-red-500" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-white mb-2">Payment Failed</h1>
          <p className="text-slate-400 mb-6">
            {type === 'entry' 
              ? "We couldn't process your entry fee payment. No charges were made."
              : "We couldn't process your vote purchase. No charges were made."
            }
          </p>

          {/* Possible Reasons */}
          <div className="bg-slate-700/30 rounded-xl p-4 mb-6 text-left">
            <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              Possible Reasons
            </h3>
            <ul className="text-sm text-slate-400 space-y-1">
              <li>• Insufficient funds in your account</li>
              <li>• Card was declined by your bank</li>
              <li>• Payment session expired</li>
              <li>• Network connectivity issues</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {type === 'entry' ? (
              <Link to="/portal/dashboard">
                <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </Link>
            ) : contestantId ? (
              <Link to={`/contestant/${contestantId}`}>
                <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </Link>
            ) : (
              <Link to="/contestants">
                <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </Link>
            )}

            <Link to="/">
              <Button variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-700">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>

          {/* Support Link */}
          <p className="mt-6 text-sm text-slate-500">
            Need help? <a href="mailto:support@glowingstar.net" className="text-amber-400 hover:underline">Contact Support</a>
          </p>
        </div>
      </div>
    </div>
  );
}
