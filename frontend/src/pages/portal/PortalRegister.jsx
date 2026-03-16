import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { 
  Star, Mail, Lock, Eye, EyeOff, ArrowRight, User,
  Globe, Trophy, Heart, Loader2, AlertCircle, CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

export default function PortalRegister() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await register(formData.full_name, formData.email, formData.password);
      if (result.success) {
        toast.success('Registration successful! Welcome to Glowing Star!');
        navigate('/portal');
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch (err) {
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    { icon: Star, text: 'Create your contestant profile' },
    { icon: Heart, text: 'Receive votes from fans worldwide' },
    { icon: Trophy, text: 'Compete for $10,000 grand prize' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-amber-950 to-slate-900 flex">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-20 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
      </div>

      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative z-10">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 flex items-center justify-center">
              <Star className="w-5 h-5 text-white fill-white" />
            </div>
            <div>
              <h1 className="font-syne font-bold text-white">Glowing Star</h1>
              <span className="text-[10px] font-semibold text-amber-400">JOIN CONTEST</span>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8">
            <div className="text-center mb-8">
              <h2 className="font-syne text-2xl font-bold text-white mb-2">Join the Contest</h2>
              <p className="text-slate-400">Create your contestant account</p>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-slate-300 font-medium">Full Name</Label>
                <div className="relative mt-2">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <Input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    placeholder="Jessica Smith"
                    required
                    data-testid="register-name"
                    className="pl-12 h-12 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-pink-500 focus:ring-pink-500/20"
                  />
                </div>
              </div>

              <div>
                <Label className="text-slate-300 font-medium">Email Address</Label>
                <div className="relative mt-2">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <Input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    required
                    data-testid="register-email"
                    className="pl-12 h-12 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-pink-500 focus:ring-pink-500/20"
                  />
                </div>
              </div>

              <div>
                <Label className="text-slate-300 font-medium">Password</Label>
                <div className="relative mt-2">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Min 6 characters"
                    required
                    data-testid="register-password"
                    className="pl-12 pr-12 h-12 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-pink-500 focus:ring-pink-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <Label className="text-slate-300 font-medium">Confirm Password</Label>
                <div className="relative mt-2">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm your password"
                    required
                    data-testid="register-confirm-password"
                    className="pl-12 h-12 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-pink-500 focus:ring-pink-500/20"
                  />
                  {formData.confirmPassword && formData.password === formData.confirmPassword && (
                    <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                  )}
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                data-testid="register-submit"
                className="w-full h-12 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-600 hover:to-violet-700 text-white font-semibold shadow-lg shadow-pink-500/25 mt-6"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>Create Account <ArrowRight className="w-5 h-5 ml-2" /></>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-white/10 text-center">
              <p className="text-slate-400 text-sm">
                Already have an account?{' '}
                <Link to="/portal/login" className="text-pink-400 hover:text-pink-300 font-semibold">
                  Sign in
                </Link>
              </p>
            </div>
          </div>

          {/* Back to Voting Site */}
          <div className="mt-6 text-center">
            <a href="/" className="text-slate-500 hover:text-slate-300 text-sm flex items-center justify-center gap-2">
              <Globe className="w-4 h-4" />
              Back to Voting Site
            </a>
          </div>
        </div>
      </div>

      {/* Right Side - Benefits */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-12 relative z-10">
        <div className="max-w-lg">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center shadow-lg shadow-pink-500/30">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-syne text-2xl font-bold text-white">Glamour</h1>
              <span className="text-xs font-semibold text-pink-400">2026 BEAUTY CONTEST</span>
            </div>
          </div>

          <h2 className="font-syne text-4xl font-bold text-white mb-4">
            Start Your Journey to
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-violet-400">
              Stardom
            </span>
          </h2>
          <p className="text-lg text-slate-400 mb-8">
            Join thousands of contestants competing for the ultimate beauty title and amazing prizes.
          </p>

          <div className="space-y-4 mb-8">
            {benefits.map((item, idx) => (
              <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500/20 to-violet-500/20 flex items-center justify-center">
                  <item.icon className="w-6 h-6 text-pink-400" />
                </div>
                <span className="text-white font-medium">{item.text}</span>
              </div>
            ))}
          </div>

          {/* Prize Banner */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <Trophy className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-amber-400 text-sm font-semibold">Grand Prize</p>
                <p className="text-2xl font-bold text-white">$10,000</p>
                <p className="text-slate-400 text-sm">+ Magazine Feature</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
