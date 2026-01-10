import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  Image as ImageIcon,
  X,
  CheckCircle,
  AlertCircle,
  Building,
  Camera,
  ArrowRight,
  Loader2,
  Info,
} from "lucide-react";
import { ImageStorageService } from "@/utils/image/imageStorage";
import { IMAGE_REQUIREMENTS, ImageType } from "@/utils/image/imageTypes";

interface BusinessProfileData {
  logoUrl?: string;
  coverImageUrl?: string;
}

interface BusinessProfileSetupProps {
  businessId: string;
  userId: string;
  onComplete: (data: BusinessProfileData) => void;
  onBack?: () => void;
  initialData?: Partial<BusinessProfileData>;
  className?: string;
}

interface ImageUpload {
  file: File | null;
  preview: string | null;
  uploading: boolean;
  uploaded: boolean;
  url?: string;
  error?: string;
}

export default function BusinessProfileSetupSimplified({
  businessId,
  userId,
  onComplete,
  onBack,
  initialData,
  className = "",
}: BusinessProfileSetupProps) {
  const [formData, setFormData] = useState<BusinessProfileData>({
    logoUrl: initialData?.logoUrl,
    coverImageUrl: initialData?.coverImageUrl,
  });

  // Load existing business info from Phase 1 (read-only display)
  const [businessInfo, setBusinessInfo] = useState<{
    businessName: string;
    businessDescription: string;
    website: string;
    socialMedia: any;
  }>({
    businessName: "",
    businessDescription: "",
    website: "",
    socialMedia: {},
  });

  const [logoUpload, setLogoUpload] = useState<ImageUpload>({
    file: null,
    preview: null,
    uploading: false,
    uploaded: false,
  });

  const [coverUpload, setCoverUpload] = useState<ImageUpload>({
    file: null,
    preview: null,
    uploading: false,
    uploaded: false,
  });

  const [loading, setLoading] = useState(false);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load existing data when businessId becomes available
  useEffect(() => {
    if (businessId) {
      loadExistingData();
    }
  }, [businessId]);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      if (logoUpload.preview)
        ImageStorageService.cleanupPreviewUrl(logoUpload.preview);
      if (coverUpload.preview)
        ImageStorageService.cleanupPreviewUrl(coverUpload.preview);
    };
  }, [logoUpload.preview, coverUpload.preview]);

  const loadExistingData = async () => {
    try {
      setLoadingInfo(true);
      // Try the onboarding-specific endpoint first, fallback to regular endpoint
      let response = await fetch(`/api/onboarding/business-profile/${businessId}`);
      if (!response.ok) {
        response = await fetch(`/api/business/profile/${businessId}`);
      }
      
      if (response.ok) {
        const data = await response.json();
        setBusinessInfo({
          businessName: data.businessName || data.business_name || "",
          businessDescription: data.detailedDescription || data.business_description || "",
          website: data.websiteUrl || data.website || "",
          socialMedia: data.socialMediaLinks || data.social_media || {},
        });
        
        // Load existing images if any
        if (data.logoUrl || data.logo_url) {
          setFormData((prev) => ({ ...prev, logoUrl: data.logoUrl || data.logo_url }));
        }
        if (data.coverImageUrl || data.cover_image_url) {
          setFormData((prev) => ({ ...prev, coverImageUrl: data.coverImageUrl || data.cover_image_url }));
        }
      }
    } catch (error) {
      console.log("No existing business profile data found");
    } finally {
      setLoadingInfo(false);
    }
  };

  const handleImageSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
    imageType: "logo" | "cover",
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const uploadState = imageType === "logo" ? logoUpload : coverUpload;
    const setUploadState =
      imageType === "logo" ? setLogoUpload : setCoverUpload;
    const uploadType: ImageType =
      imageType === "logo" ? "business_logo" : "business_cover";

    // Clean up previous preview
    if (uploadState.preview) {
      ImageStorageService.cleanupPreviewUrl(uploadState.preview);
    }

    // Validate image
    const validation = await ImageStorageService.validateImage(file, uploadType);

    if (!validation.isValid) {
      setUploadState({
        file: null,
        preview: null,
        uploading: false,
        uploaded: false,
        error: validation.errors.join(", "),
      });
      return;
    }

    // Create preview
    const preview = ImageStorageService.generatePreviewUrl(file);

    setUploadState({
      file,
      preview,
      uploading: false,
      uploaded: false,
      error:
        validation.warnings.length > 0
          ? validation.warnings.join(", ")
          : undefined,
    });
  };

  const uploadImage = async (imageType: "logo" | "cover") => {
    const uploadState = imageType === "logo" ? logoUpload : coverUpload;
    const setUploadState =
      imageType === "logo" ? setLogoUpload : setCoverUpload;
    const uploadType: ImageType =
      imageType === "logo" ? "business_logo" : "business_cover";

    if (!uploadState.file) return;

    setUploadState((prev) => ({ ...prev, uploading: true, error: undefined }));

    try {
      const result = await ImageStorageService.uploadImageWithFallback(
        uploadState.file,
        uploadType,
        businessId,
        userId,
      );

      if (result.success && result.publicUrl) {
        setUploadState((prev) => ({
          ...prev,
          uploading: false,
          uploaded: true,
          url: result.publicUrl,
        }));

        // Update form data
        const field = imageType === "logo" ? "logoUrl" : "coverImageUrl";
        setFormData((prev) => ({
          ...prev,
          [field]: result.publicUrl,
        }));
      } else {
        setUploadState((prev) => ({
          ...prev,
          uploading: false,
          error: result.error || "Upload failed",
        }));
      }
    } catch (error) {
      setUploadState((prev) => ({
        ...prev,
        uploading: false,
        error: error instanceof Error ? error.message : "Upload failed",
      }));
    }
  };

  const removeImage = (imageType: "logo" | "cover") => {
    const uploadState = imageType === "logo" ? logoUpload : coverUpload;
    const setUploadState =
      imageType === "logo" ? setLogoUpload : setCoverUpload;

    if (uploadState.preview) {
      ImageStorageService.cleanupPreviewUrl(uploadState.preview);
    }

    setUploadState({
      file: null,
      preview: null,
      uploading: false,
      uploaded: false,
    });

    // Clear from form data
    const field = imageType === "logo" ? "logoUrl" : "coverImageUrl";
    setFormData((prev) => ({
      ...prev,
      [field]: undefined,
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      // Upload any pending images
      if (logoUpload.file && !logoUpload.uploaded) {
        await uploadImage("logo");
      }
      if (coverUpload.file && !coverUpload.uploaded) {
        await uploadImage("cover");
      }

      // Save business profile data using onboarding endpoint (no auth required during Phase 2)
      const profileResponse = await fetch(`/api/onboarding/business-profile/${businessId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: businessInfo.businessName || "",
          detailedDescription: businessInfo.businessDescription || "",
          websiteUrl: businessInfo.website || "",
          socialMediaLinks: businessInfo.socialMedia || {},
          logoUrl: formData.logoUrl || undefined,
          coverImageUrl: formData.coverImageUrl || undefined,
        }),
      });

      if (!profileResponse.ok) {
        const errorData = await profileResponse.json().catch(() => ({ error: 'Failed to save business profile' }));
        throw new Error(errorData.error || "Failed to save business profile");
      }

      // Mark step as completed
      const progressResponse = await fetch("/api/onboarding/save-phase2-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: businessId,
          step: "business_profile",
          data: formData,
        }),
      });

      if (!progressResponse.ok) {
        console.error("Failed to save progress, but profile was saved");
        // Don't throw here - profile was saved successfully
      }

      onComplete(formData);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to save business profile",
      );
    } finally {
      setLoading(false);
    }
  };

  const canSkip = () => {
    // Allow skipping if images are optional
    return true;
  };

  const completionPercentage = () => {
    let completed = 0;
    const total = 2; // logo, cover

    if (formData.logoUrl || logoUpload.uploaded) completed++;
    if (formData.coverImageUrl || coverUpload.uploaded) completed++;

    return Math.round((completed / total) * 100);
  };

  if (loadingInfo) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-roam-blue" />
      </div>
    );
  }

  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-roam-blue/10 rounded-full flex items-center justify-center">
              <Building className="w-6 h-6 text-roam-blue" />
            </div>
            <div>
              <CardTitle className="text-2xl text-roam-blue">
                Business Profile Setup
              </CardTitle>
              <p className="text-foreground/70">
                Add your business branding and visual identity
              </p>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Profile Completion</span>
              <Badge variant="outline">
                {completionPercentage()}% Complete
              </Badge>
            </div>
            <Progress value={completionPercentage()} className="h-2" />
          </div>
        </CardHeader>

        <CardContent className="space-y-8">
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Display existing business info from Phase 1 */}
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Your Business Information (from Phase 1):</strong>
              <div className="mt-2 space-y-1">
                <p><strong>Name:</strong> {businessInfo.businessName}</p>
                {businessInfo.businessDescription && (
                  <p><strong>Description:</strong> {businessInfo.businessDescription.substring(0, 100)}...</p>
                )}
                {businessInfo.website && (
                  <p><strong>Website:</strong> {businessInfo.website}</p>
                )}
                {businessInfo.socialMedia && Object.keys(businessInfo.socialMedia).length > 0 && (
                  <p><strong>Social Media:</strong> {Object.keys(businessInfo.socialMedia).join(", ")}</p>
                )}
              </div>
              <p className="mt-2 text-sm italic">These details were collected in Phase 1 and can be updated later in your business settings.</p>
            </AlertDescription>
          </Alert>

          {/* Business Logo Upload */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-semibold">Business Logo</p>
                  <p className="text-sm text-foreground/70">
                    Square logo (512x512px recommended) • Max 2MB • JPG, PNG, WebP
                  </p>
                </div>
                <Badge variant="secondary">Optional</Badge>
              </div>
            </div>

            <div className="flex items-start gap-6">
              <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 relative overflow-hidden">
                {logoUpload.preview || formData.logoUrl ? (
                  <>
                    <img
                      src={logoUpload.preview || formData.logoUrl}
                      alt="Business Logo"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => removeImage("logo")}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <div className="text-center">
                    <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">Logo</p>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-3">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      document.getElementById("logo-upload")?.click()
                    }
                    disabled={logoUpload.uploading}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Choose Logo
                  </Button>

                  {logoUpload.file && !logoUpload.uploaded && (
                    <Button
                      onClick={() => uploadImage("logo")}
                      disabled={logoUpload.uploading}
                      className="bg-roam-blue hover:bg-roam-blue/90"
                    >
                      {logoUpload.uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        "Upload"
                      )}
                    </Button>
                  )}
                </div>

                {logoUpload.uploaded && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">Logo uploaded successfully</span>
                  </div>
                )}

                {logoUpload.error && (
                  <Alert className="border-amber-200 bg-amber-50">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800">
                      {logoUpload.error}
                    </AlertDescription>
                  </Alert>
                )}

                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageSelect(e, "logo")}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Business Cover Image */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-semibold">Business Cover Image</p>
                  <p className="text-sm text-foreground/70">
                    Banner image (1200x400px recommended) • Max 5MB • JPG, PNG, WebP
                  </p>
                </div>
                <Badge variant="secondary">Optional</Badge>
              </div>
            </div>

            <div className="space-y-4">
              <div className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 relative overflow-hidden">
                {coverUpload.preview || formData.coverImageUrl ? (
                  <>
                    <img
                      src={coverUpload.preview || formData.coverImageUrl}
                      alt="Business Cover"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => removeImage("cover")}
                      className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <div className="text-center">
                    <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Upload cover image</p>
                    <p className="text-xs text-gray-400">
                      1200x400px recommended
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    document.getElementById("cover-upload")?.click()
                  }
                  disabled={coverUpload.uploading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Choose Cover Image
                </Button>

                {coverUpload.file && !coverUpload.uploaded && (
                  <Button
                    onClick={() => uploadImage("cover")}
                    disabled={coverUpload.uploading}
                    className="bg-roam-blue hover:bg-roam-blue/90"
                  >
                    {coverUpload.uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      "Upload"
                    )}
                  </Button>
                )}
              </div>

              {coverUpload.uploaded && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">
                    Cover image uploaded successfully
                  </span>
                </div>
              )}

              {coverUpload.error && (
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    {coverUpload.error}
                  </AlertDescription>
                </Alert>
              )}

              <input
                id="cover-upload"
                type="file"
                accept="image/*"
                onChange={(e) => handleImageSelect(e, "cover")}
                className="hidden"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-6">
            {onBack && (
              <Button variant="outline" onClick={onBack}>
                Back
              </Button>
            )}

            <div className="flex gap-2 ml-auto">
              {canSkip() && (
                <Button
                  variant="ghost"
                  onClick={() => onComplete(formData)}
                  disabled={loading}
                >
                  Skip for Now
                </Button>
              )}
              
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="bg-roam-blue hover:bg-roam-blue/90"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Continue to Personal Profile
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
