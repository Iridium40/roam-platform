import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Edit, Save, X, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import ShareModal from "@/components/ShareModal";
import { GeneralSettings } from "./business-settings/GeneralSettings";
import ServiceSettings from "./ServiceSettings";
import BusinessHours from "./BusinessHours";
import DocumentSettings from "./DocumentSettings";
import { LocationSettings } from "./business-settings/LocationSettings";

interface BusinessData {
  id: string;
  business_name: string;
  business_type: "independent" | "small_business" | "franchise" | "enterprise" | "other";
  business_description: string;
  phone: string;
  contact_email: string;
  website_url: string;
  cover_image_url: string;
  logo_url: string;
  business_hours: {
    [day: string]: {
      open: string;
      close: string;
      closed: boolean;
    };
  };
}

interface BusinessSettingsTabProps {
  business: BusinessData;
  onBusinessUpdate: (updatedBusiness: BusinessData) => void;
}

export default function BusinessSettingsTab({ business, onBusinessUpdate }: BusinessSettingsTabProps) {
  const { toast } = useToast();
  
  // State management
  const [isEditing, setIsEditing] = useState(false);
  const [businessData, setBusinessData] = useState<BusinessData>(business);
  const [locations, setLocations] = useState<any[]>([]);
  const [businessDocuments, setBusinessDocuments] = useState<any[]>([]);
  const [serviceEligibility, setServiceEligibility] = useState<any>(null);
  
  // Loading states
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [serviceEligibilityLoading, setServiceEligibilityLoading] = useState(false);
  const [locationsLoading, setLocationsLoading] = useState(false);
  
  // Error states
  const [serviceEligibilityError, setServiceEligibilityError] = useState<string | null>(null);
  
  // Modal states
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDocumentUploadModal, setShowDocumentUploadModal] = useState(false);

  // Load data on component mount
  useEffect(() => {
    if (business?.id) {
      loadBusinessDocuments();
      loadServiceEligibility();
      loadLocations();
    }
  }, [business?.id]);

  // Sync business data when prop changes
  useEffect(() => {
    setBusinessData(business);
  }, [business]);

  // Data loading functions
  const loadBusinessDocuments = async () => {
    setDocumentsLoading(true);
    try {
      const { data, error } = await supabase
        .from('business_documents')
        .select('*')
        .eq('business_id', business.id);
      
      if (error) throw error;
      setBusinessDocuments(data || []);
    } catch (error) {
      console.error('Error loading business documents:', error);
      toast({
        title: "Error",
        description: "Failed to load business documents",
        variant: "destructive",
      });
    } finally {
      setDocumentsLoading(false);
    }
  };

  const loadServiceEligibility = async () => {
    setServiceEligibilityLoading(true);
    setServiceEligibilityError(null);
    try {
      const { data, error } = await (supabase as any)
        .rpc('get_business_service_eligibility', { business_id: business.id });
      
      if (error) throw error;
      setServiceEligibility(data);
    } catch (error) {
      console.error('Error loading service eligibility:', error);
      setServiceEligibilityError('Failed to load service eligibility');
    } finally {
      setServiceEligibilityLoading(false);
    }
  };

  const loadLocations = async () => {
    setLocationsLoading(true);
    try {
      const { data, error } = await supabase
        .from('business_locations')
        .select('*')
        .eq('business_id', business.id)
        .order('is_primary', { ascending: false });
      
      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error('Error loading locations:', error);
      toast({
        title: "Error",
        description: "Failed to load business locations",
        variant: "destructive",
      });
    } finally {
      setLocationsLoading(false);
    }
  };

  // Save business data
  const saveBusinessData = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('businesses')
        .update({
          business_name: businessData.business_name,
          business_type: businessData.business_type,
          business_description: businessData.business_description,
          phone: businessData.phone,
          contact_email: businessData.contact_email,
          website_url: businessData.website_url,
          cover_image_url: businessData.cover_image_url,
          logo_url: businessData.logo_url,
          business_hours: businessData.business_hours,
        })
        .eq('id', business.id)
        .select()
        .single();

      if (error) throw error;

      onBusinessUpdate(data);
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Business information updated successfully",
      });
    } catch (error) {
      console.error('Error saving business data:', error);
      toast({
        title: "Error",
        description: "Failed to save business information",
        variant: "destructive",
      });
    }
  };

  const cancelEditing = () => {
    setBusinessData(business);
    setIsEditing(false);
  };

  // File upload handlers
  const handleCoverPhotoUpload = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `cover-${business.id}-${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('business-assets')
        .upload(fileName, file);

      if (error) throw error;

      const { data: publicData } = supabase.storage
        .from('business-assets')
        .getPublicUrl(fileName);

      setBusinessData({ ...businessData, cover_image_url: publicData.publicUrl });
      
      toast({
        title: "Success",
        description: "Cover photo uploaded successfully",
      });
    } catch (error) {
      console.error('Error uploading cover photo:', error);
      toast({
        title: "Error",
        description: "Failed to upload cover photo",
        variant: "destructive",
      });
    }
  };

  const handleLogoUpload = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${business.id}-${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('business-assets')
        .upload(fileName, file);

      if (error) throw error;

      const { data: publicData } = supabase.storage
        .from('business-assets')
        .getPublicUrl(fileName);

      setBusinessData({ ...businessData, logo_url: publicData.publicUrl });
      
      toast({
        title: "Success",
        description: "Logo uploaded successfully",
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: "Error",
        description: "Failed to upload logo",
        variant: "destructive",
      });
    }
  };

  // Document handlers
  const handleDocumentUpload = () => {
    loadBusinessDocuments();
    setShowDocumentUploadModal(false);
    toast({
      title: "Success",
      description: "Documents updated successfully",
    });
  };

  const handleViewDocument = (document: any) => {
    // Implement document viewing logic
    console.log('View document:', document);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return { label: 'Approved', color: 'bg-green-100 text-green-800' };
      case 'pending':
        return { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' };
      case 'rejected':
        return { label: 'Rejected', color: 'bg-red-100 text-red-800' };
      default:
        return { label: 'Unknown', color: 'bg-gray-100 text-gray-800' };
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      license: 'Professional License',
      insurance: 'Insurance Certificate',
      registration: 'Business Registration',
      identification: 'Identification',
      other: 'Other Document'
    };
    return labels[type] || type;
  };

  const getBusinessShareUrl = () => {
    return `${window.location.origin}/provider/${business.id}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Business Settings</h2>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setShowShareModal(true)}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share Profile
          </Button>
          {isEditing ? (
            <>
              <Button variant="outline" onClick={cancelEditing}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={saveBusinessData}>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* General Settings */}
      <GeneralSettings
        businessData={businessData}
        onBusinessDataChange={setBusinessData}
        isEditing={isEditing}
        logoUploading={false}
        coverUploading={false}
        onCoverUpload={handleCoverPhotoUpload}
        onLogoUpload={handleLogoUpload}
        onShareClick={() => setShowShareModal(true)}
      />

      {/* Service Settings */}
      <ServiceSettings
        serviceEligibility={serviceEligibility}
        serviceEligibilityLoading={serviceEligibilityLoading}
        serviceEligibilityError={serviceEligibilityError}
      />

      {/* Business Hours */}
      <BusinessHours
        businessHours={businessData.business_hours}
        onBusinessHoursChange={(newHours) => 
          setBusinessData({ ...businessData, business_hours: newHours })
        }
        isEditing={isEditing}
      />

      {/* Document Settings */}
      <DocumentSettings
        businessDocuments={businessDocuments}
        documentsLoading={documentsLoading}
        businessId={business.id}
        showDocumentUploadModal={showDocumentUploadModal}
        onShowDocumentUploadModal={setShowDocumentUploadModal}
        onDocumentUpload={handleDocumentUpload}
        onViewDocument={handleViewDocument}
        getStatusBadge={getStatusBadge}
        getDocumentTypeLabel={getDocumentTypeLabel}
      />

      {/* Location Settings - simplified for now */}
      {!locationsLoading && (
        <LocationSettings
          locations={locations}
          onAddLocation={() => {}}
          onEditLocation={() => {}}
          onDeleteLocation={() => {}}
        />
      )}

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        businessName={businessData.business_name || "Your Business"}
        businessDescription={businessData.business_description || "Professional services you can trust"}
        pageUrl={getBusinessShareUrl()}
      />
    </div>
  );
}