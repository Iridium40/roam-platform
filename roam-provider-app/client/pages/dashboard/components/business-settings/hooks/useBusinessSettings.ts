import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

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

  // UI state
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);

  // Service eligibility state
  const [serviceEligibility, setServiceEligibility] = useState<ServiceEligibility | null>(null);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [eligibilityError, setEligibilityError] = useState<string | null>(null);

  // Load business data
  useEffect(() => {
    if (business) {
      setBusinessData({
        id: business.id,
        business_name: business.business_name || "",
        business_type: business.business_type || "",
        contact_email: business.contact_email || "",
        phone: business.phone || "",
        website_url: business.website_url || "",
        business_description: business.business_description || "",
        logo_url: business.logo_url || "",
        cover_image_url: business.cover_image_url || "",
        business_hours: business.business_hours || {
          monday: { open: "09:00", close: "17:00", closed: false },
          tuesday: { open: "09:00", close: "17:00", closed: false },
          wednesday: { open: "09:00", close: "17:00", closed: false },
          thursday: { open: "09:00", close: "17:00", closed: false },
          friday: { open: "09:00", close: "17:00", closed: false },
          saturday: { open: "09:00", close: "17:00", closed: false },
          sunday: { open: "09:00", close: "17:00", closed: true },
        },
      });
    }
  }, [business]);

  // Load service eligibility
  const loadServiceEligibility = async () => {
    if (!business?.id) return;

    setEligibilityLoading(true);
    setEligibilityError(null);

    try {
      const response = await fetch(`/api/business/service-eligibility?business_id=${business.id}`);
      
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

  // Save business settings
  const saveBusinessSettings = async () => {
    if (!business?.id) return false;

    setLoading(true);
    
    try {
      const { error } = await (supabase as any)
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
          business_hours: businessData.business_hours,
        })
        .eq("id", business.id);

      if (error) {
        console.error("Error updating business settings:", error);
        toast({
          title: "Error",
          description: "Failed to update business settings. Please try again.",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Success",
        description: "Your business settings have been updated successfully.",
      });
      
      setIsEditing(false);
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
      const fileExt = file.name.split('.').pop();
      const fileName = `${business.id}-logo-${Date.now()}.${fileExt}`;
      const filePath = `business-assets/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('business-images')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('business-images')
        .getPublicUrl(filePath);

      setBusinessData(prev => ({ ...prev, logo_url: publicUrl }));

      toast({
        title: "Success",
        description: "Logo uploaded successfully.",
      });
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      toast({
        title: "Error",
        description: "Failed to upload logo. Please try again.",
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
      const fileExt = file.name.split('.').pop();
      const fileName = `${business.id}-cover-${Date.now()}.${fileExt}`;
      const filePath = `business-assets/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('business-images')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('business-images')
        .getPublicUrl(filePath);

      setBusinessData(prev => ({ ...prev, cover_image_url: publicUrl }));

      toast({
        title: "Success",
        description: "Cover photo uploaded successfully.",
      });
    } catch (error: any) {
      console.error("Error uploading cover photo:", error);
      toast({
        title: "Error",
        description: "Failed to upload cover photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCoverUploading(false);
    }
  };

  // Cancel editing
  const cancelEditing = () => {
    if (business) {
      setBusinessData({
        id: business.id,
        business_name: business.business_name || "",
        business_type: business.business_type || "",
        contact_email: business.contact_email || "",
        phone: business.phone || "",
        website_url: business.website_url || "",
        business_description: business.business_description || "",
        logo_url: business.logo_url || "",
        cover_image_url: business.cover_image_url || "",
        business_hours: business.business_hours || businessData.business_hours,
      });
    }
    setIsEditing(false);
  };

  return {
    // Business data
    businessData,
    setBusinessData,
    
    // UI state
    isEditing,
    setIsEditing,
    loading,
    logoUploading,
    coverUploading,
    
    // Service eligibility
    serviceEligibility,
    eligibilityLoading,
    eligibilityError,
    loadServiceEligibility,
    
    // Actions
    saveBusinessSettings,
    cancelEditing,
    handleLogoUpload,
    handleCoverUpload,
  };
}