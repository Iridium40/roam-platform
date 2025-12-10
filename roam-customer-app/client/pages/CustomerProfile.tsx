import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { User, Edit, Save, X, Camera, Mail, Phone, Calendar, Loader2, ArrowLeft, Bell } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Footer } from '@/components/Footer';
import { NotificationPreferences } from '@/components/NotificationPreferences';

export default function CustomerProfile() {
  const { customer } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  type ProfileData = {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    date_of_birth: string;
    bio: string;
    image_url: string;
  };
  
  const [profileData, setProfileData] = useState<ProfileData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    bio: '',
    image_url: '',
  });
  const [originalData, setOriginalData] = useState<ProfileData>(profileData);

  useEffect(() => {
    if (customer) {
      loadProfile();
    }
  }, [customer]);

  const loadProfile = async () => {
    if (!customer) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customer_profiles')
        .select('*')
        .eq('user_id', customer.user_id)
        .single();

      if (error) throw error;
      if (!data) throw new Error('No profile data found');

      const profile: ProfileData = {
        first_name: (data as any).first_name || '',
        last_name: (data as any).last_name || '',
        email: (data as any).email || '',
        phone: (data as any).phone || '',
        date_of_birth: (data as any).date_of_birth || '',
        bio: (data as any).bio || '',
        image_url: (data as any).image_url || '',
      };

      setProfileData(profile);
      setOriginalData(profile);
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to load profile',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!customer) return;

    try {
      setLoading(true);

      const { error } = await supabase
        .from('customer_profiles')
        // @ts-ignore - Supabase update accepts partial objects
        .update({
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          email: profileData.email,
          phone: profileData.phone,
          date_of_birth: profileData.date_of_birth || null,
          bio: profileData.bio || null,
        })
        .eq('user_id', customer.user_id);

      if (error) throw error;

      setOriginalData(profileData);
      setIsEditing(false);

      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setProfileData(originalData);
    setIsEditing(false);
  };

  const handleImageUpload = async (file: File) => {
    if (!customer) return;

    try {
      setUploading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${customer.user_id}-${Date.now()}.${fileExt}`;
      const filePath = `customer-avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('roam-file-storage')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('roam-file-storage')
        .getPublicUrl(filePath);

      // Update profile with new image URL
      const { error: updateError } = await supabase
        .from('customer_profiles')
        // @ts-ignore - Supabase update accepts partial objects
        .update({ image_url: publicUrl })
        .eq('user_id', customer.user_id);

      if (updateError) throw updateError;

      setProfileData({ ...profileData, image_url: publicUrl });
      setOriginalData({ ...originalData, image_url: publicUrl });

      toast({
        title: 'Success',
        description: 'Profile photo updated successfully',
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload profile photo',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const getInitials = () => {
    if (profileData.first_name && profileData.last_name) {
      return `${profileData.first_name.charAt(0)}${profileData.last_name.charAt(0)}`.toUpperCase();
    }
    return 'CU';
  };

  if (loading && !profileData.first_name) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-roam-blue mx-auto mb-4" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back to Home Button */}
        <div className="mb-6">
          <Link to="/booknow">
            <Button
              variant="ghost"
              className="flex items-center gap-2 text-foreground/70 hover:text-foreground hover:bg-accent/50 px-3 py-2 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Settings</h1>
          <p className="text-muted-foreground">
            Manage your personal information and preferences
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Notification Settings
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <div className="flex justify-end mb-4">
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleCancel} disabled={loading}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={loading}>
                    {loading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                </div>
              )}
            </div>

            {/* Profile Card */}
            <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Profile Photo */}
            <div className="flex items-center space-x-6">
              <div className="relative">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={profileData.image_url} alt="Profile" />
                  <AvatarFallback className="bg-roam-blue text-white text-2xl">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                {isEditing && (
                  <button
                    onClick={() => document.getElementById('avatar-upload')?.click()}
                    className="absolute bottom-0 right-0 bg-roam-blue text-white rounded-full p-2 shadow-lg hover:bg-roam-blue/90"
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                  </button>
                )}
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                />
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  {profileData.first_name} {profileData.last_name}
                </h3>
                <p className="text-sm text-muted-foreground">{profileData.email}</p>
              </div>
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  value={profileData.first_name}
                  onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                  disabled={!isEditing}
                  required
                />
              </div>
              <div>
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  value={profileData.last_name}
                  onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                  disabled={!isEditing}
                  required
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    disabled={!isEditing}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    disabled={!isEditing}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
            </div>

            {/* Date of Birth */}
            <div>
              <Label htmlFor="date_of_birth">Date of Birth</Label>
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <Input
                  id="date_of_birth"
                  type="date"
                  value={profileData.date_of_birth}
                  onChange={(e) => setProfileData({ ...profileData, date_of_birth: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
            </div>

            {/* Bio */}
            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={profileData.bio}
                onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                disabled={!isEditing}
                placeholder="Tell us a little about yourself..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>
          </TabsContent>

          {/* Notification Settings Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
              </CardHeader>
              <CardContent>
                <NotificationPreferences />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
