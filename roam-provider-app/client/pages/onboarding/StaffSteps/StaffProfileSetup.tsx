import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, Camera, ArrowRight, Loader2, AlertCircle, Upload, X } from 'lucide-react';
import { ImageStorageService } from '@/utils/image/imageStorage';
import type { ImageType } from '@/utils/image/imageTypes';

interface InvitationData {
  businessId: string;
  email: string;
  role: string;
}

interface ProfileData {
  bio: string;
  professionalTitle?: string;
  yearsExperience?: number;
  avatarUrl?: string;
  coverImageUrl?: string;
}

interface StaffProfileSetupProps {
  invitationData: InvitationData;
  role: 'dispatcher' | 'provider';
  initialData: Partial<ProfileData>;
  onComplete: (data: ProfileData) => void;
  onBack: () => void;
}

export default function StaffProfileSetup({
  invitationData,
  role,
  initialData,
  onComplete,
  onBack,
}: StaffProfileSetupProps) {
  const isProvider = role === 'provider';
  
  const [formData, setFormData] = useState<ProfileData>({
    bio: initialData.bio || '',
    professionalTitle: initialData.professionalTitle || '',
    yearsExperience: initialData.yearsExperience || 0,
    avatarUrl: initialData.avatarUrl || '',
    coverImageUrl: initialData.coverImageUrl || '',
  });
  
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialData.avatarUrl || null);
  const [coverPreview, setCoverPreview] = useState<string | null>(initialData.coverImageUrl || null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: keyof ProfileData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleImageUpload = async (file: File, type: 'avatar' | 'cover') => {
    const imageType: ImageType = type === 'avatar' ? 'provider_avatar' : 'provider_cover';
    const setUploading = type === 'avatar' ? setUploadingAvatar : setUploadingCover;
    const setPreview = type === 'avatar' ? setAvatarPreview : setCoverPreview;

    try {
      setUploading(true);

      // Validate image
      const validation = await ImageStorageService.validateImage(file, imageType);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Create preview
      const preview = ImageStorageService.generatePreviewUrl(file);
      setPreview(preview);

      // Upload to storage
      const result = await ImageStorageService.uploadImage(
        file,
        imageType,
        invitationData.businessId,
        invitationData.email // use email as identifier since user doesn't exist yet
      );

      if (!result.success || !result.publicUrl) {
        throw new Error(result.error || 'Upload failed');
      }

      // Update form data
      const field = type === 'avatar' ? 'avatarUrl' : 'coverImageUrl';
      setFormData(prev => ({ ...prev, [field]: result.publicUrl }));

    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      setErrors(prev => ({
        ...prev,
        [type]: error instanceof Error ? error.message : 'Upload failed'
      }));
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (type: 'avatar' | 'cover') => {
    const setPreview = type === 'avatar' ? setAvatarPreview : setCoverPreview;
    const field = type === 'avatar' ? 'avatarUrl' : 'coverImageUrl';
    
    setPreview(null);
    setFormData(prev => ({ ...prev, [field]: '' }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (isProvider) {
      if (!formData.professionalTitle?.trim()) {
        newErrors.professionalTitle = 'Professional title is required';
      }
      if (!formData.bio?.trim()) {
        newErrors.bio = 'Bio is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onComplete(formData);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl text-purple-600">
              {isProvider ? 'Your Professional Profile' : 'Your Profile'}
            </CardTitle>
            <p className="text-foreground/70">
              {isProvider ? 'Showcase your expertise and experience' : 'Add a photo and bio'}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Upload */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Profile Photo {isProvider && <span className="text-xs text-foreground/60">(Recommended)</span>}
            </Label>
            <div className="flex items-center gap-4">
              <div className="relative">
                {avatarPreview ? (
                  <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200">
                    <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage('avatar')}
                      className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300">
                    {uploadingAvatar ? (
                      <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                    ) : (
                      <User className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                )}
              </div>
              
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingAvatar}
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) handleImageUpload(file, 'avatar');
                    };
                    input.click();
                  }}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {avatarPreview ? 'Change Photo' : 'Upload Photo'}
                </Button>
                <p className="text-xs text-foreground/60 mt-1">
                  JPG, PNG or WebP (max 5MB)
                </p>
                {errors.avatar && (
                  <p className="text-xs text-red-500 mt-1">{errors.avatar}</p>
                )}
              </div>
            </div>
          </div>

          {/* Cover Image (Provider only) */}
          {isProvider && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Camera className="w-4 h-4" />
                Cover Image <span className="text-xs text-foreground/60">(Optional)</span>
              </Label>
              <div className="relative">
                {coverPreview ? (
                  <div className="relative w-full h-40 rounded-lg overflow-hidden border-2 border-gray-200">
                    <img src={coverPreview} alt="Cover preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage('cover')}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="w-full h-40 rounded-lg bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300">
                    {uploadingCover ? (
                      <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                    ) : (
                      <div className="text-center">
                        <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">Upload cover image</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {!coverPreview && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingCover}
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) handleImageUpload(file, 'cover');
                    };
                    input.click();
                  }}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Cover Image
                </Button>
              )}
              {errors.cover && (
                <p className="text-xs text-red-500">{errors.cover}</p>
              )}
            </div>
          )}

          {/* Professional Title (Provider only) */}
          {isProvider && (
            <div className="space-y-2">
              <Label htmlFor="professionalTitle">
                Professional Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="professionalTitle"
                value={formData.professionalTitle}
                onChange={(e) => handleChange('professionalTitle', e.target.value)}
                placeholder="e.g., Licensed Massage Therapist, Senior Stylist"
                className={errors.professionalTitle ? 'border-red-500' : ''}
              />
              {errors.professionalTitle && (
                <p className="text-xs text-red-500">{errors.professionalTitle}</p>
              )}
            </div>
          )}

          {/* Years of Experience (Provider only) */}
          {isProvider && (
            <div className="space-y-2">
              <Label htmlFor="yearsExperience">
                Years of Experience
              </Label>
              <Input
                id="yearsExperience"
                type="number"
                min="0"
                max="50"
                value={formData.yearsExperience}
                onChange={(e) => handleChange('yearsExperience', parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
          )}

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">
              Bio {isProvider && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => handleChange('bio', e.target.value)}
              placeholder={isProvider 
                ? "Tell clients about your experience, specialties, and approach to service..."
                : "Tell us a bit about yourself (optional)..."
              }
              rows={4}
              className={errors.bio ? 'border-red-500' : ''}
            />
            {errors.bio && (
              <p className="text-xs text-red-500">{errors.bio}</p>
            )}
            <p className="text-xs text-foreground/60">
              {isProvider 
                ? 'This will be shown to clients when they view your profile'
                : 'This will be visible to your team'
              }
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
            >
              Back
            </Button>
            
            <Button
              type="submit"
              className="bg-roam-blue hover:bg-roam-blue/90"
              disabled={uploadingAvatar || uploadingCover}
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

