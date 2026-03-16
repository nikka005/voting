import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { 
  Star, Mail, Lock, Eye, EyeOff, ArrowRight, 
  Shield, Loader2, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminLogin() {
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
        // Check if user is admin
        if (result.user?.role === 'admin') {
          toast.success('Welcome, Administrator!');
          navigate('/portal/admin');
        } else {
          setError('Access denied. Admin credentials required.');
        }
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 via-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-red-500/30">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-syne text-xl font-bold text-white">Glowing Star</h1>
            <span className="text-[10px] font-semibold text-red-400 tracking-wider">ADMIN ACCESS</span>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
              <Shield className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="font-syne text-2xl font-bold text-white mb-2">Administrator Login</h2>
            <p className="text-slate-500 text-sm">Restricted access - Authorized personnel only</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label className="text-slate-300 font-medium">Admin Email</Label>
              <div className="relative mt-2">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="admin@glowingstar.net"
                  required
                  className="pl-12 h-12 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-red-500 focus:ring-red-500/20"
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
                  className="pl-12 pr-12 h-12 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-red-500 focus:ring-red-500/20"
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
              className="w-full h-12 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-semibold shadow-lg shadow-red-500/25"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>Access Dashboard <ArrowRight className="w-5 h-5 ml-2" /></>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-slate-600 text-xs text-center">
              This area is for platform administrators only.
              <br />Unauthorized access attempts are logged.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
