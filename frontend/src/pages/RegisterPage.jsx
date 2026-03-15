import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Crown, Mail, Lock, User, Phone, Loader2 } from 'lucide-react';
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
          {/* Logo */}
          <div className="text-center mb-10">
            <Link to="/" className="inline-flex items-center gap-2 mb-6">
              <Crown className="w-10 h-10 text-gold" />
              <span className="font-serif text-3xl text-white">Lumina</span>
            </Link>
            <h1 className="font-serif text-2xl text-white mb-2">Join the Competition</h1>
            <p className="text-white/50">Create your contestant account</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5" data-testid="register-form">
            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-white/70">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                <Input
                  id="full_name"
                  name="full_name"
                  type="text"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="Your full name"
                  required
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-gold"
                  data-testid="register-name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/70">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  required
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-gold"
                  data-testid="register-email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-white/70">Phone (Optional)</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+1 (555) 000-0000"
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-gold"
                  data-testid="register-phone"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/70">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-gold"
                  data-testid="register-password"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-white/70">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-gold"
                  data-testid="register-confirm-password"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gold hover:bg-gold-light text-black font-bold uppercase tracking-widest rounded-full py-6 gold-glow-hover"
              data-testid="register-submit"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
            </Button>
          </form>

          <p className="text-center text-white/50 mt-8">
            Already have an account?{' '}
            <Link to="/login" className="text-gold hover:text-gold-light transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </Layout>
  );
}
