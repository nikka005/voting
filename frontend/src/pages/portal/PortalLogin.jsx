import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { 
  Star, Mail, Lock, Eye, EyeOff, ArrowRight, 
  Globe, Shield, Users, Loader2, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

export default function PortalLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login(formData.email, formData.password);
      if (result.success) {
        toast.success('Welcome back!');
        navigate('/portal');
      } else {
        setError(result.error || 'Invalid credentials');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 flex">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
      </div>

      {/* Left Side - Branding */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-12 relative z-10">
        <div className="max-w-lg">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Star className="w-6 h-6 text-white fill-white" />
            </div>
            <div>
              <h1 className="font-syne text-2xl font-bold text-white">Glowing Star</h1>
              <span className="text-xs font-semibold text-amber-400">MANAGEMENT PORTAL</span>
            </div>
          </div>

          <h2 className="font-syne text-4xl font-bold text-white mb-4">
            Welcome to the<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
              Management Portal
            </span>
          </h2>
          <p className="text-lg text-slate-400 mb-8">
            Access your dashboard to manage your contest profile or administer the platform.
          </p>

          <div className="space-y-4">
            {[
              { icon: Shield, text: 'Admin Panel - Full platform control' },
              { icon: Users, text: 'Contestant Dashboard - Manage your profile' },
              { icon: Globe, text: 'glowingstar.net - Management domain' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 text-slate-300">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                  <item.icon className="w-4 h-4 text-amber-400" />
                </div>
                {item.text}
              </div>
            ))}
          </div>

          <div className="mt-12 pt-8 border-t border-white/10">
            <p className="text-slate-500 text-sm mb-2">Not a contestant yet?</p>
            <Link to="/portal/register" className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-2">
              Join the Contest <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative z-10">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 flex items-center justify-center">
              <Star className="w-5 h-5 text-white fill-white" />
            </div>
            <div>
              <h1 className="font-syne font-bold text-white">Glowing Star</h1>
              <span className="text-[10px] font-semibold text-amber-400">PORTAL</span>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8">
            <div className="text-center mb-8">
              <h2 className="font-syne text-2xl font-bold text-white mb-2">Sign In</h2>
              <p className="text-slate-400">Access your management dashboard</p>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
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
                    placeholder="••••••••"
                    required
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

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-600 hover:to-violet-700 text-white font-semibold shadow-lg shadow-pink-500/25"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>Sign In <ArrowRight className="w-5 h-5 ml-2" /></>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-white/10 text-center">
              <p className="text-slate-400 text-sm">
                New contestant?{' '}
                <Link to="/portal/register" className="text-pink-400 hover:text-pink-300 font-semibold">
                  Register here
                </Link>
              </p>
            </div>

            {/* Demo Credentials */}
            <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-amber-400 text-xs font-semibold mb-2">Demo Credentials:</p>
              <p className="text-amber-300/70 text-xs">Admin: admin@glowingstar.net / admin123</p>
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
    </div>
  );
}
