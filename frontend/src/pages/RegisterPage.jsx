import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Sparkles, Mail, Lock, User, Phone, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await register({
        full_name: formData.full_name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone || undefined,
      });
      toast.success('Registration successful! Complete your profile to start collecting votes.');
      navigate('/dashboard');
    } catch (error) {
      const message = error.response?.data?.detail || 'Registration failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout hideFooter>
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-white rounded-3xl shadow-xl shadow-pink-500/5 border border-slate-100 p-8">
            {/* Logo */}
            <div className="text-center mb-8">
              <Link to="/" className="inline-flex items-center gap-2 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center shadow-lg shadow-pink-500/30">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <span className="font-syne text-2xl font-bold gradient-text-pink">Glamour</span>
              </Link>
              <h1 className="font-syne text-2xl font-bold text-slate-900 mb-2">Join the Competition</h1>
              <p className="text-slate-500">Create your contestant account</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="register-form">
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-slate-700 font-semibold">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="full_name"
                    name="full_name"
                    type="text"
                    value={formData.full_name}
                    onChange={handleChange}
                    placeholder="Your full name"
                    required
                    className="pl-12 h-12 rounded-xl bg-slate-50 border-slate-200 focus:border-pink-500 focus:ring-pink-500/20"
                    data-testid="register-name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 font-semibold">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    required
                    className="pl-12 h-12 rounded-xl bg-slate-50 border-slate-200 focus:border-pink-500 focus:ring-pink-500/20"
                    data-testid="register-email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-slate-700 font-semibold">Phone (Optional)</Label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+1 (555) 000-0000"
                    className="pl-12 h-12 rounded-xl bg-slate-50 border-slate-200 focus:border-pink-500 focus:ring-pink-500/20"
                    data-testid="register-phone"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700 font-semibold">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                    className="pl-12 h-12 rounded-xl bg-slate-50 border-slate-200 focus:border-pink-500 focus:ring-pink-500/20"
                    data-testid="register-password"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-slate-700 font-semibold">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                    className="pl-12 h-12 rounded-xl bg-slate-50 border-slate-200 focus:border-pink-500 focus:ring-pink-500/20"
                    data-testid="register-confirm-password"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 btn-gradient btn-jelly text-base mt-2"
                data-testid="register-submit"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
              </Button>
            </form>

            <p className="text-center text-slate-500 mt-6">
              Already have an account?{' '}
              <Link to="/login" className="text-pink-600 hover:text-pink-700 font-semibold">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
