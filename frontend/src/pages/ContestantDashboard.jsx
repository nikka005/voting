import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { contestantsAPI, categoriesAPI } from '../lib/api';
import { formatNumber } from '../lib/utils';
import { toast } from 'sonner';
import {
  User,
  Heart,
  Link as LinkIcon,
  Camera,
  Instagram,
  Facebook,
  Twitter,
  MapPin,
  Calendar,
  Copy,
  Check,
  Trash2,
  Upload,
  Loader2,
  AlertCircle
} from 'lucide-react';

export default function ContestantDashboard() {
  const { user, isContestant } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    bio: '',
    location: '',
    age: '',
    category_id: '',
    social_instagram: '',
    social_facebook: '',
    social_twitter: '',
  });

  const fetchProfile = useCallback(async () => {
    try {
      const [profileRes, categoriesRes] = await Promise.all([
        contestantsAPI.getMyProfile(),
        categoriesAPI.getAll(true),
      ]);
      setProfile(profileRes.data);
      setCategories(categoriesRes.data);
      setFormData({
        full_name: profileRes.data.full_name || '',
        bio: profileRes.data.bio || '',
        location: profileRes.data.location || '',
        age: profileRes.data.age?.toString() || '',
        category_id: profileRes.data.category_id || '',
        social_instagram: profileRes.data.social_instagram || '',
        social_facebook: profileRes.data.social_facebook || '',
        social_twitter: profileRes.data.social_twitter || '',
      });
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isContestant) {
      navigate('/');
      return;
    }
    fetchProfile();
  }, [isContestant, navigate, fetchProfile]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const updateData = {
        ...formData,
        age: formData.age ? parseInt(formData.age) : null,
        category_id: formData.category_id || null,
      };
      const response = await contestantsAPI.updateMyProfile(updateData);
      setProfile(response.data);
      toast.success('Profile updated successfully!');
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to update profile';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      await contestantsAPI.uploadPhoto(file);
      await fetchProfile();
      toast.success('Photo uploaded successfully!');
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to upload photo';
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (index) => {
    try {
      await contestantsAPI.deletePhoto(index);
      await fetchProfile();
      toast.success('Photo deleted');
    } catch (error) {
      toast.error('Failed to delete photo');
    }
  };

  const copyVotingLink = async () => {
    if (profile?.voting_link) {
      await navigator.clipboard.writeText(profile.voting_link);
      setCopied(true);
      toast.success('Voting link copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-gold animate-spin" />
        </div>
      </Layout>
    );
  }

  const statusColor = {
    pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    approved: 'bg-green-500/10 text-green-500 border-green-500/20',
    rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-serif text-3xl md:text-4xl text-white mb-2">My Dashboard</h1>
          <p className="text-white/50">Manage your profile and track your progress</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stats Cards */}
          <Card className="bg-white/[0.02] border-white/5" data-testid="votes-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/60">Total Votes</CardTitle>
              <Heart className="w-5 h-5 text-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{formatNumber(profile?.vote_count || 0)}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/[0.02] border-white/5" data-testid="status-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/60">Status</CardTitle>
              <AlertCircle className="w-5 h-5 text-white/40" />
            </CardHeader>
            <CardContent>
              <span className={`inline-flex px-3 py-1 text-sm rounded-full border ${statusColor[profile?.status] || ''}`}>
                {profile?.status?.charAt(0).toUpperCase() + profile?.status?.slice(1)}
              </span>
              {profile?.status === 'pending' && (
                <p className="text-xs text-white/40 mt-2">Your profile is under review</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/[0.02] border-white/5" data-testid="voting-link-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/60">Voting Link</CardTitle>
              <LinkIcon className="w-5 h-5 text-white/40" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <code className="text-xs text-gold bg-gold/10 px-2 py-1 rounded truncate max-w-[180px]">
                  {profile?.slug}
                </code>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={copyVotingLink}
                  className="h-8 w-8 text-white/60 hover:text-gold"
                  data-testid="copy-link-btn"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Profile Form */}
          <Card className="bg-white/[0.02] border-white/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <User className="w-5 h-5 text-gold" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4" data-testid="profile-form">
                <div className="space-y-2">
                  <Label className="text-white/70">Full Name</Label>
                  <Input
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    className="bg-white/5 border-white/10 text-white"
                    data-testid="profile-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white/70">Category</Label>
                  <Select 
                    value={formData.category_id} 
                    onValueChange={(v) => handleSelectChange('category_id', v)}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white" data-testid="profile-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0a0a0a] border-white/10">
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id} className="text-white">
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white/70">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      Location
                    </Label>
                    <Input
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      placeholder="City, Country"
                      className="bg-white/5 border-white/10 text-white"
                      data-testid="profile-location"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/70">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Age
                    </Label>
                    <Input
                      name="age"
                      type="number"
                      value={formData.age}
                      onChange={handleChange}
                      placeholder="25"
                      className="bg-white/5 border-white/10 text-white"
                      data-testid="profile-age"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-white/70">Bio</Label>
                  <Textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    placeholder="Tell your story..."
                    rows={4}
                    className="bg-white/5 border-white/10 text-white resize-none"
                    data-testid="profile-bio"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-white/70">Social Media</Label>
                  <div className="relative">
                    <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <Input
                      name="social_instagram"
                      value={formData.social_instagram}
                      onChange={handleChange}
                      placeholder="Instagram username"
                      className="pl-10 bg-white/5 border-white/10 text-white"
                      data-testid="profile-instagram"
                    />
                  </div>
                  <div className="relative">
                    <Facebook className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <Input
                      name="social_facebook"
                      value={formData.social_facebook}
                      onChange={handleChange}
                      placeholder="Facebook username"
                      className="pl-10 bg-white/5 border-white/10 text-white"
                      data-testid="profile-facebook"
                    />
                  </div>
                  <div className="relative">
                    <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <Input
                      name="social_twitter"
                      value={formData.social_twitter}
                      onChange={handleChange}
                      placeholder="Twitter/X username"
                      className="pl-10 bg-white/5 border-white/10 text-white"
                      data-testid="profile-twitter"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-gold hover:bg-gold-light text-black font-semibold rounded-full"
                  data-testid="save-profile-btn"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Changes'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Photos */}
          <Card className="bg-white/[0.02] border-white/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Camera className="w-5 h-5 text-gold" />
                Photos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Upload Button */}
              <label className="block mb-4">
                <div className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-white/10 hover:border-gold/50 cursor-pointer transition-colors rounded-sm">
                  {uploading ? (
                    <Loader2 className="w-5 h-5 text-gold animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-white/50" />
                      <span className="text-white/50">Upload Photo</span>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={uploading}
                  data-testid="photo-upload-input"
                />
              </label>

              {/* Photo Grid */}
              <div className="grid grid-cols-2 gap-4">
                {profile?.photos?.map((photo, index) => (
                  <div key={index} className="relative group aspect-square">
                    <img
                      src={photo}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => handleDeletePhoto(index)}
                      className="absolute top-2 right-2 p-2 bg-red-500/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      data-testid={`delete-photo-${index}`}
                    >
                      <Trash2 className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ))}
              </div>

              {(!profile?.photos || profile.photos.length === 0) && (
                <p className="text-center text-white/40 py-8">
                  No photos uploaded yet. Add photos to attract more votes!
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
