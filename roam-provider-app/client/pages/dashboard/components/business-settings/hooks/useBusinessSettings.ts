import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { ImageStorageService } from "@/utils/image/imageStorage";
import type { ImageType } from "@/utils/image/imageTypes";

interface BusinessData {
  id?: string;
  business_name: string;
  business_type: string;
  contact_email: string;
  phone: string;
  website_url: string;
  business_description: string;
  logo_url: string;
  cover_image_url: string;
  business_hours: {
    monday: { open: string; close: string; closed: boolean };
    tuesday: { open: string; close: string; closed: boolean };
    wednesday: { open: string; close: string; closed: boolean };
    thursday: { open: string; close: string; closed: boolean };
    friday: { open: string; close: string; closed: boolean };
    saturday: { open: string; close: string; closed: boolean };
    sunday: { open: string; close: string; closed: boolean };
  };
}

interface ServiceEligibility {
  business_id: string;
  approved_categories: any[];
  approved_subcategories: any[];
  stats: {
    total_categories: number;
    total_subcategories: number;
  };
  last_updated?: string;
  additional_info?: string;
}

export function useBusinessSettings(business: any) {
  const { toast } = useToast();
  
  // Business data state
  const [businessData, setBusinessData] = useState<BusinessData>({
    business_name: "",
    business_type: "",
    contact_email: "",
    phone: "",
    website_url: "",
    business_description: "",
    logo_url: "",
    cover_image_url: "",
    business_hours: {
      monday: { open: "09:00", close: "17:00", closed: false },
      tuesday: { open: "09:00", close: "17:00", closed: false },
      wednesday: { open: "09:00", close: "17:00", closed: false },
      thursday: { open: "09:00", close: "17:00", closed: false },
      friday: { open: "09:00", close: "17:00", closed: false },
      saturday: { open: "09:00", close: "17:00", closed: false },
      sunday: { open: "09:00", close: "17:00", closed: true },
    },
  });

  // Original data for change detection
  const [originalBusinessData, setOriginalBusinessData] = useState<BusinessData>({
    business_name: "",
    business_type: "",
    contact_email: "",
    phone: "",
    website_url: "",
    business_description: "",
    logo_url: "",
    cover_image_url: "",
    business_hours: {
      monday: { open: "09:00", close: "17:00", closed: false },
      tuesday: { open: "09:00", close: "17:00", closed: false },
      wednesday: { open: "09:00", close: "17:00", closed: false },
      thursday: { open: "09:00", close: "17:00", closed: false },
      friday: { open: "09:00", close: "17:00", closed: false },
      saturday: { open: "09:00", close: "17:00", closed: false },
      sunday: { open: "09:00", close: "17:00", closed: true },
    },
  });

  // UI state
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);

  // Service eligibility state
  const [serviceEligibility, setServiceEligibility] = useState<ServiceEligibility | null>(null);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [eligibilityError, setEligibilityError] = useState<string | null>(null);

  // Load business data (excluding hours - those are loaded separately via API)
  useEffect(() => {
    if (business) {
      const newData = {
        id: business.id,
        business_name: business.business_name || "",
        business_type: business.business_type || "",
        contact_email: business.contact_email || "",
        phone: business.phone || "",
        website_url: business.website_url || "",
        business_description: business.business_description || "",
        logo_url: business.logo_url || "",
        cover_image_url: business.cover_image_url || "",
      };
      setBusinessData(prev => ({
        ...prev, // Preserve existing hours from loadBusinessHours()
        ...newData,
      }));
      setOriginalBusinessData(prev => ({
        ...prev, // Preserve existing hours
        ...newData,
      }));
    }
  }, [business]);

  // Detect changes by comparing current data with original
  useEffect(() => {
    const hasChangesDetected =
      businessData.business_name !== originalBusinessData.business_name ||
      businessData.business_type !== originalBusinessData.business_type ||
      businessData.contact_email !== originalBusinessData.contact_email ||
      businessData.phone !== originalBusinessData.phone ||
      businessData.website_url !== originalBusinessData.website_url ||
      businessData.business_description !== originalBusinessData.business_description ||
      businessData.logo_url !== originalBusinessData.logo_url ||
      businessData.cover_image_url !== originalBusinessData.cover_image_url ||
      JSON.stringify(businessData.business_hours) !== JSON.stringify(originalBusinessData.business_hours);

    setHasChanges(hasChangesDetected);
  }, [businessData, originalBusinessData]);

  // Load service eligibility
  const loadServiceEligibility = async () => {
    if (!business?.id) return;

    setEligibilityLoading(true);
    setEligibilityError(null);

    try {
      // Use cached auth headers
      const { getAuthHeaders } = await import('@/lib/api/authUtils');
      const headers = await getAuthHeaders();

      const response = await fetch(`/api/business/service-eligibility?business_id=${business.id}`, { headers });
      
      if (!response.ok) {
        throw new Error(`Failed to load service eligibility: ${response.statusText}`);
      }

      const data = await response.json();
      setServiceEligibility(data);
    } catch (error: any) {
      console.error("Error loading service eligibility:", error);
      setEligibilityError(error.message || "Failed to load service eligibility");
    } finally {
      setEligibilityLoading(false);
    }
  };

  // Load service eligibility on mount
  useEffect(() => {
    loadServiceEligibility();
  }, [business?.id]);

  // Load business hours from API
  const loadBusinessHours = async () => {
    if (!business?.id) return;

    try {
      const response = await fetch(`/api/business/hours?business_id=${business.id}`);
      
      if (!response.ok) {
        console.error('Failed to load business hours:', response.statusText);
        return;
      }

      const data = await response.json();
      
      if (data.business_hours) {
        setBusinessData(prev => ({
          ...prev,
          business_hours: data.business_hours,
        }));
        setOriginalBusinessData(prev => ({
          ...prev,
          business_hours: data.business_hours,
        }));
      }
    } catch (error: any) {
      console.error("Error loading business hours:", error);
    }
  };

  // Load business hours on mount
  useEffect(() => {
    loadBusinessHours();
  }, [business?.id]);

  // Save business settings
  const saveBusinessSettings = async () => {
    if (!business?.id) return false;

    setLoading(true);
    
    try {
      // Update basic business profile fields
      const { error: profileError } = await (supabase as any)
        .from("business_profiles")
        .update({
          business_name: businessData.business_name,
          business_type: businessData.business_type,
          contact_email: businessData.contact_email,
          phone: businessData.phone,
          website_url: businessData.website_url,
          business_description: businessData.business_description,
          logo_url: businessData.logo_url,
          cover_image_url: businessData.cover_image_url,
        })
        .eq("id", business.id);

      if (profileError) {
        console.error("Error updating business profile:", profileError);
        toast({
          title: "Error",
          description: "Failed to update business settings. Please try again.",
          variant: "destructive",
        });
        return false;
      }

      // Update business hours using dedicated API endpoint
      const hoursResponse = await fetch('/api/business/hours', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_id: business.id,
          business_hours: businessData.business_hours,
        }),
      });

      if (!hoursResponse.ok) {
        const errorData = await hoursResponse.json();
        console.error("Error updating business hours:", errorData);
        toast({
          title: "Warning",
          description: "Business settings updated, but failed to update hours. Please try again.",
          variant: "destructive",
        });
        return false;
      }

      // Reload hours from database to ensure UI reflects saved state
      await loadBusinessHours();

      // Update original data to reflect saved state
      setOriginalBusinessData(JSON.parse(JSON.stringify(businessData)));
      setHasChanges(false);

      toast({
        title: "Success",
        description: "Your business settings have been updated successfully.",
      });
      
      return true;
    } catch (error: any) {
      console.error("Error updating business settings:", error);
      toast({
        title: "Error",
        description: "Failed to update business settings. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Handle logo upload
  const handleLogoUpload = async (file: File) => {
    if (!business?.id) return;

    setLogoUploading(true);

    try {
      // Validate file using ImageStorageService
      const validation = await ImageStorageService.validateImage(file, 'business_logo');
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Upload using ImageStorageService with fallback (same as ProfileTab)
      const result = await ImageStorageService.uploadImageWithFallback(
        file,
        'business_logo',
        business.id
      );

      if (!result.success || !result.publicUrl) {
        throw new Error(result.error || 'Upload failed');
      }

      // Update local state
      setBusinessData(prev => ({ ...prev, logo_url: result.publicUrl! }));

      // Save to database immediately
      const { error: updateError } = await (supabase as any)
        .from("business_profiles")
        .update({ logo_url: result.publicUrl })
        .eq("id", business.id);

      if (updateError) {
        console.error("Error saving logo URL to database:", updateError);
        throw new Error("Failed to save logo URL to database");
      }

      toast({
        title: "Success",
        description: "Logo uploaded successfully.",
      });
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload logo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLogoUploading(false);
    }
  };

  // Handle cover photo upload
  const handleCoverUpload = async (file: File) => {
    if (!business?.id) return;

    setCoverUploading(true);

    try {
      // Validate file using ImageStorageService
      const validation = await ImageStorageService.validateImage(file, 'business_cover');
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Upload using ImageStorageService with fallback (same as ProfileTab)
      const result = await ImageStorageService.uploadImageWithFallback(
        file,
        'business_cover',
        business.id
      );

      if (!result.success || !result.publicUrl) {
        throw new Error(result.error || 'Upload failed');
      }

      // Update local state
      setBusinessData(prev => ({ ...prev, cover_image_url: result.publicUrl! }));

      // Save to database immediately
      const { error: updateError } = await (supabase as any)
        .from("business_profiles")
        .update({ cover_image_url: result.publicUrl })
        .eq("id", business.id);

      if (updateError) {
        console.error("Error saving cover image URL to database:", updateError);
        throw new Error("Failed to save cover image URL to database");
      }

      toast({
        title: "Success",
        description: "Cover photo uploaded successfully.",
      });
    } catch (error: any) {
      console.error("Error uploading cover photo:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload cover photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCoverUploading(false);
    }
  };

  // Reset changes to original values
  const resetChanges = () => {
    setBusinessData(JSON.parse(JSON.stringify(originalBusinessData)));
    setHasChanges(false);
  };

  return {
    // Business data
    businessData,
    setBusinessData,
    
    // UI state
    hasChanges,
    loading,
    logoUploading,
    coverUploading,
    
    // Service eligibility
    serviceEligibility,
    eligibilityLoading,
    eligibilityError,
    loadServiceEligibility,
    
    // Business hours
    loadBusinessHours,
    
    // Actions
    saveBusinessSettings,
    resetChanges,
    handleLogoUpload,
    handleCoverUpload,
  };
}