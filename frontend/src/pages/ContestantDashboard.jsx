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
  AlertCircle,
  Sparkles
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
          <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
        </div>
      </Layout>
    );
  }

  const statusStyles = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    approved: 'bg-green-100 text-green-700 border-green-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center shadow-lg shadow-pink-500/30">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-syne text-3xl md:text-4xl font-bold text-slate-900">My Dashboard</h1>
              <p className="text-slate-500">Manage your profile and track your progress</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-pink-50 to-rose-50 border-pink-100" data-testid="votes-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-pink-700">Total Votes</CardTitle>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-500/30">
                <Heart className="w-5 h-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="font-syne text-4xl font-bold gradient-text">{formatNumber(profile?.vote_count || 0)}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-violet-50 to-purple-50 border-violet-100" data-testid="status-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-violet-700">Status</CardTitle>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <span className={`inline-flex px-4 py-1.5 text-sm font-bold rounded-full border ${statusStyles[profile?.status] || ''}`}>
                {profile?.status?.charAt(0).toUpperCase() + profile?.status?.slice(1)}
              </span>
              {profile?.status === 'pending' && (
                <p className="text-xs text-violet-600 mt-2">Your profile is under review</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-100" data-testid="voting-link-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-cyan-700">Voting Link</CardTitle>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <LinkIcon className="w-5 h-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <code className="text-xs text-cyan-700 bg-cyan-100 px-3 py-1.5 rounded-lg truncate max-w-[180px] font-mono">
                  {profile?.slug}
                </code>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={copyVotingLink}
                  className="h-8 w-8 text-cyan-600 hover:text-cyan-700 hover:bg-cyan-100"
                  data-testid="copy-link-btn"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profile Form */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900 font-syne">
                <User className="w-5 h-5 text-pink-500" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4" data-testid="profile-form">
                <div className="space-y-2">
                  <Label className="text-slate-700 font-semibold">Full Name</Label>
                  <Input
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:border-pink-500"
                    data-testid="profile-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 font-semibold">Category</Label>
                  <Select value={formData.category_id} onValueChange={(v) => handleSelectChange('category_id', v)}>
                    <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200" data-testid="profile-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 rounded-xl">
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id} className="rounded-lg">
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      Location
                    </Label>
                    <Input
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      placeholder="City, Country"
                      className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:border-pink-500"
                      data-testid="profile-location"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      Age
                    </Label>
                    <Input
                      name="age"
                      type="number"
                      value={formData.age}
                      onChange={handleChange}
                      placeholder="25"
                      className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:border-pink-500"
                      data-testid="profile-age"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 font-semibold">Bio</Label>
                  <Textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    placeholder="Tell your story..."
                    rows={4}
                    className="rounded-xl bg-slate-50 border-slate-200 focus:border-pink-500 resize-none"
                    data-testid="profile-bio"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-slate-700 font-semibold">Social Media</Label>
                  <div className="relative">
                    <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-500" />
                    <Input
                      name="social_instagram"
                      value={formData.social_instagram}
                      onChange={handleChange}
                      placeholder="Instagram username"
                      className="pl-12 h-11 rounded-xl bg-slate-50 border-slate-200 focus:border-pink-500"
                      data-testid="profile-instagram"
                    />
                  </div>
                  <div className="relative">
                    <Facebook className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
                    <Input
                      name="social_facebook"
                      value={formData.social_facebook}
                      onChange={handleChange}
                      placeholder="Facebook username"
                      className="pl-12 h-11 rounded-xl bg-slate-50 border-slate-200 focus:border-pink-500"
                      data-testid="profile-facebook"
                    />
                  </div>
                  <div className="relative">
                    <Twitter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700" />
                    <Input
                      name="social_twitter"
                      value={formData.social_twitter}
                      onChange={handleChange}
                      placeholder="Twitter/X username"
                      className="pl-12 h-11 rounded-xl bg-slate-50 border-slate-200 focus:border-pink-500"
                      data-testid="profile-twitter"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={saving}
                  className="w-full h-11 btn-gradient btn-jelly"
                  data-testid="save-profile-btn"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Changes'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Photos */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900 font-syne">
                <Camera className="w-5 h-5 text-pink-500" />
                Photos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Upload Button */}
              <label className="block mb-4">
                <div className="flex items-center justify-center gap-2 p-6 border-2 border-dashed border-pink-200 hover:border-pink-400 bg-pink-50/50 cursor-pointer transition-colors rounded-2xl">
                  {uploading ? (
                    <Loader2 className="w-6 h-6 text-pink-500 animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-pink-500" />
                      <span className="text-pink-600 font-semibold">Upload Photo</span>
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
                  <div key={index} className="relative group aspect-square rounded-2xl overflow-hidden">
                    <img
                      src={photo}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => handleDeletePhoto(index)}
                      className="absolute top-2 right-2 p-2 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      data-testid={`delete-photo-${index}`}
                    >
                      <Trash2 className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ))}
              </div>

              {(!profile?.photos || profile.photos.length === 0) && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-pink-100 flex items-center justify-center">
                    <Camera className="w-8 h-8 text-pink-400" />
                  </div>
                  <p className="text-slate-500">No photos uploaded yet. Add photos to attract more votes!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
