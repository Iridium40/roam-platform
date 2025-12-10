import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  User,
  Camera,
  Upload,
  Trash2,
  Save,
  Edit,
  Loader2,
  CheckCircle,
  Settings,
  Bell,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { ImageStorageService } from "@/utils/image/imageStorage";
import type { ImageType } from "@/utils/image/imageTypes";
import UserSettingsSection from "./UserSettingsSection";
import { NotificationPreferences } from "@/components/NotificationPreferences";

interface ProfileTabProps {
  providerData: any;
  business: any;
}

export default function ProfileTab({
  providerData,
  business,
}: ProfileTabProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    bio: "",
    profile_image_url: "",
    cover_image_url: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [profilePhotoUploading, setProfilePhotoUploading] = useState(false);
  const [coverPhotoUploading, setCoverPhotoUploading] = useState(false);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const [coverPhotoPreview, setCoverPhotoPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{
    profile: { uploading: boolean; uploaded: boolean; error?: string };
    cover: { uploading: boolean; uploaded: boolean; error?: string };
  }>({
    profile: { uploading: false, uploaded: false },
    cover: { uploading: false, uploaded: false },
  });

  // Load profile data
  const loadProfileData = async () => {
    if (!providerData) return;

    try {
      setLoading(true);
      setProfileData({
        first_name: providerData.first_name || "",
        last_name: providerData.last_name || "",
        email: providerData.email || "",
        phone: providerData.phone || "",
        bio: providerData.bio || "",
        profile_image_url: providerData.image_url || "",
        cover_image_url: providerData.cover_image_url || "",
      });
    } catch (error) {
      console.error('Error loading profile data:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Save profile data
  const saveProfileData = async () => {
    if (!providerData?.id) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('providers')
        .update({
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          email: profileData.email,
          phone: profileData.phone,
          bio: profileData.bio,
          image_url: profileData.profile_image_url,
          cover_image_url: profileData.cover_image_url,
        })
        .eq('id', providerData.id);

      if (error) throw error;

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
      setIsEditing(false);
      
      // Reload the page to reflect changes
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle profile photo upload
  const handleProfilePhotoUpload = async (file: File) => {
    if (!providerData?.id || !providerData?.user_id) return;

    try {
      setProfilePhotoUploading(true);
      setUploadProgress(prev => ({
        ...prev,
        profile: { uploading: true, uploaded: false, error: undefined }
      }));

      // Validate file
      const validation = await ImageStorageService.validateImage(file, 'provider_avatar');
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Create preview
      const preview = ImageStorageService.generatePreviewUrl(file);
      setProfilePhotoPreview(preview);

      // Upload to storage
      const result = await ImageStorageService.uploadImageWithFallback(
        file,
        'provider_avatar',
        providerData.business_id || providerData.id,
        providerData.user_id
      );

      if (!result.success || !result.publicUrl) {
        throw new Error(result.error || 'Upload failed');
      }

      // Update profile data in state
      setProfileData(prev => ({
        ...prev,
        profile_image_url: result.publicUrl!
      }));

      // Update database
      const { error } = await supabase
        .from('providers')
        .update({ image_url: result.publicUrl })
        .eq('id', providerData.id);

      if (error) throw error;

      setUploadProgress(prev => ({
        ...prev,
        profile: { uploading: false, uploaded: true }
      }));

      toast({
        title: "Profile Photo Updated",
        description: "Your profile photo has been uploaded successfully.",
      });
      
      // Reload the page to reflect changes
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      setUploadProgress(prev => ({
        ...prev,
        profile: { 
          uploading: false, 
          uploaded: false, 
          error: error instanceof Error ? error.message : 'Upload failed'
        }
      }));
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload profile photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProfilePhotoUploading(false);
    }
  };

  // Handle cover photo upload
  const handleCoverPhotoUpload = async (file: File) => {
    if (!providerData?.id || !providerData?.user_id) return;

    try {
      setCoverPhotoUploading(true);
      setUploadProgress(prev => ({
        ...prev,
        cover: { uploading: true, uploaded: false, error: undefined }
      }));

      // Validate file
      const validation = await ImageStorageService.validateImage(file, 'provider_cover');
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Create preview
      const preview = ImageStorageService.generatePreviewUrl(file);
      setCoverPhotoPreview(preview);

      // Upload to storage
      const result = await ImageStorageService.uploadImageWithFallback(
        file,
        'provider_cover',
        providerData.business_id || providerData.id,
        providerData.user_id
      );

      if (!result.success || !result.publicUrl) {
        throw new Error(result.error || 'Upload failed');
      }

      // Update profile data in state
      setProfileData(prev => ({
        ...prev,
        cover_image_url: result.publicUrl!
      }));

      // Update database
      const { error } = await supabase
        .from('providers')
        .update({ cover_image_url: result.publicUrl })
        .eq('id', providerData.id);

      if (error) throw error;

      setUploadProgress(prev => ({
        ...prev,
        cover: { uploading: false, uploaded: true }
      }));

      toast({
        title: "Cover Photo Updated",
        description: "Your cover photo has been uploaded successfully.",
      });
      
      // Reload the page to reflect changes
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error uploading cover photo:', error);
      setUploadProgress(prev => ({
        ...prev,
        cover: { 
          uploading: false, 
          uploaded: false, 
          error: error instanceof Error ? error.message : 'Upload failed'
        }
      }));
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload cover photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCoverPhotoUploading(false);
    }
  };

  // Handle removing profile photo
  const handleRemoveProfilePhoto = () => {
    if (profilePhotoPreview) {
      ImageStorageService.cleanupPreviewUrl(profilePhotoPreview);
      setProfilePhotoPreview(null);
    }
    setProfileData(prev => ({ ...prev, profile_image_url: "" }));
    setUploadProgress(prev => ({
      ...prev,
      profile: { uploading: false, uploaded: false }
    }));
  };

  // Handle removing cover photo
  const handleRemoveCoverPhoto = () => {
    if (coverPhotoPreview) {
      ImageStorageService.cleanupPreviewUrl(coverPhotoPreview);
      setCoverPhotoPreview(null);
    }
    setProfileData(prev => ({ ...prev, cover_image_url: "" }));
    setUploadProgress(prev => ({
      ...prev,
      cover: { uploading: false, uploaded: false }
    }));
  };

  useEffect(() => {
    loadProfileData();
  }, [providerData]);

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-sm text-gray-600">Loading profile data...</p>
        </div>
        <Card className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-32 bg-gray-200 rounded mb-4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
        <p className="text-sm text-gray-600">Manage your profile information and preferences</p>
      </div>

      {/* Profile Content */}
      <div className="space-y-6">
            {/* Edit Profile Header */}
            <div className="flex items-center justify-end space-x-2">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button onClick={saveProfileData} disabled={loading}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </>
              ) : (
                <Button onClick={() => setIsEditing(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              )}
            </div>

            {/* Profile Information Card */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
          {/* Cover Photo */}
          <div>
            <Label className="text-sm font-medium">Cover Photo</Label>
            <div className="mt-2 relative">
              {profileData.cover_image_url ? (
                <div className="relative">
                  <img
                    src={profileData.cover_image_url}
                    alt="Cover"
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  {isEditing && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute top-2 right-2"
                        disabled={coverPhotoUploading}
                        onClick={() => document.getElementById('cover-upload')?.click()}
                      >
                        <Camera className="w-4 h-4 mr-1" />
                        Change
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute top-2 right-20"
                        onClick={() => setProfileData({...profileData, cover_image_url: ""})}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                  {isEditing ? (
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById('cover-upload')?.click()}
                      disabled={coverPhotoUploading}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Cover Photo
                    </Button>
                  ) : (
                    <p className="text-sm text-gray-500">No cover photo uploaded</p>
                  )}
                </div>
              )}
              <input
                id="cover-upload"
                type="file"
                accept="image/*"
                className="hidden"
                disabled={!isEditing}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleCoverPhotoUpload(file);
                }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {isEditing 
                ? "Upload a cover image for your profile (max 50MB). Recommended size: 1200x400px"
                : "Click 'Edit Profile' to change your cover photo"
              }
            </p>
          </div>

          {/* Profile Photo and Basic Info */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Photo */}
            <div>
              <Label className="text-sm font-medium">Profile Photo</Label>
              <div className="mt-2 flex items-center space-x-4">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={profileData.profile_image_url} />
                  <AvatarFallback>
                    {profileData.first_name?.[0]}{profileData.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                {isEditing && (
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={profilePhotoUploading}
                      onClick={() => document.getElementById('profile-upload')?.click()}
                    >
                      <Camera className="w-4 h-4 mr-1" />
                      Change Photo
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setProfileData({...profileData, profile_image_url: ""})}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                )}
                <input
                  id="profile-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={!isEditing}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleProfilePhotoUpload(file);
                  }}
                />
              </div>
              {!isEditing && (
                <p className="text-xs text-gray-500 mt-2">
                  Click 'Edit Profile' to change your photo
                </p>
              )}
            </div>

            {/* Basic Information */}
            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={profileData.first_name}
                    onChange={(e) => setProfileData({...profileData, first_name: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={profileData.last_name}
                    onChange={(e) => setProfileData({...profileData, last_name: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                  disabled={!isEditing}
                />
              </div>
            </div>
          </div>

          {/* Bio */}
          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={profileData.bio}
              onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
              disabled={!isEditing}
              placeholder="Tell customers about yourself, your experience, and what makes you unique..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

        {/* Notification Settings */}
        {providerData?.user_id && providerData?.id && (
          <UserSettingsSection 
            userId={providerData.user_id} 
            providerId={providerData.id} 
          />
        )}

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="w-5 h-5" />
              <span>Notification Preferences</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <NotificationPreferences />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
