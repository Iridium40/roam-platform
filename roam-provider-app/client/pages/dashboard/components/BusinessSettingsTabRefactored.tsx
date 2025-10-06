import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Save, X, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

// Import our modular components
import BasicInfoSection from "./business-settings/BasicInfoSection";
import BusinessHoursSection from "./business-settings/BusinessHoursSection";
import ServiceCategoriesSection from "./business-settings/ServiceCategoriesSection";
import { DocumentsSection } from "./business-settings/DocumentsSection";
import { LocationsSection } from "./business-settings/LocationsSection";

// Import the custom hook
import { useBusinessSettings } from "./business-settings/hooks/useBusinessSettings";

interface BusinessSettingsTabProps {
  providerData?: any;
  business: any;
  onBusinessUpdate?: (updatedBusiness: any) => void;
}

export function BusinessSettingsTab({ providerData, business, onBusinessUpdate }: BusinessSettingsTabProps) {
  const { toast } = useToast();
  const {
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
  } = useBusinessSettings(business);

  // State for documents and locations
  const [documents, setDocuments] = React.useState([]);
  const [locations, setLocations] = React.useState([]);
  const [documentsLoading, setDocumentsLoading] = React.useState(true);
  const [locationsLoading, setLocationsLoading] = React.useState(true);
  
  // Track active tab
  const [activeTab, setActiveTab] = React.useState("basic-info");

  // Load business documents and locations on mount
  React.useEffect(() => {
    if (business?.id) {
      loadBusinessDocuments();
      loadBusinessLocations();
    }
  }, [business?.id]);

  // Load business locations
  const loadBusinessLocations = async () => {
    if (!business?.id) return;

    setLocationsLoading(true);
    try {
      const { data, error } = await supabase
        .from('business_locations')
        .select('*')
        .eq('business_id', business.id)
        .order('is_primary', { ascending: false })
        .order('location_name', { ascending: true });

      if (error) {
        console.error('Error loading business locations:', error);
        toast({
          title: "Error",
          description: "Failed to load business locations",
          variant: "destructive",
        });
      } else {
        setLocations(data || []);
        console.log(`Loaded ${data?.length || 0} business locations`);
      }
    } catch (err) {
      console.error('Unexpected error loading locations:', err);
      toast({
        title: "Error",
        description: "An unexpected error occurred while loading locations",
        variant: "destructive",
      });
    } finally {
      setLocationsLoading(false);
    }
  };

  // Load business documents
  const loadBusinessDocuments = async () => {
    if (!business?.id) return;

    setDocumentsLoading(true);
    try {
      const response = await fetch(`/api/business/documents?business_id=${business.id}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load documents: ${response.statusText}`);
      }

      const data = await response.json();
      setDocuments(data.documents || []);
      console.log(`Loaded ${data.documents?.length || 0} business documents`);
    } catch (err) {
      console.error('Error loading business documents:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to load business documents",
        variant: "destructive",
      });
    } finally {
      setDocumentsLoading(false);
    }
  };

  // Document handlers
  const handleDocumentUpload = async (file: File, documentType: string) => {
    if (!business?.id) return;

    setDocumentsLoading(true);
    try {
      // Step 1: Upload file to Supabase storage
      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const fileName = `${documentType}_${timestamp}.${fileExt}`;
      const filePath = `provider-documents/${business.id}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('provider-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Step 2: Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('provider-documents')
        .getPublicUrl(filePath);

      // Step 3: Save document metadata to database via API
      const response = await fetch('/api/business/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_id: business.id,
          document_type: documentType,
          document_name: file.name,
          file_url: publicUrl,
          file_size_bytes: file.size,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save document metadata');
      }

      toast({
        title: "Success",
        description: "Document uploaded successfully",
      });

      // Reload documents
      await loadBusinessDocuments();
    } catch (err) {
      console.error('Error uploading document:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to upload document",
        variant: "destructive",
      });
      throw err;
    } finally {
      setDocumentsLoading(false);
    }
  };

  const handleDocumentDelete = async (documentId: string) => {
    if (!business?.id) return;

    try {
      const response = await fetch(`/api/business/documents?business_id=${business.id}&document_id=${documentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete document');
      }

      toast({
        title: "Success",
        description: "Document deleted successfully",
      });

      // Reload documents
      await loadBusinessDocuments();
    } catch (err) {
      console.error('Error deleting document:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete document",
        variant: "destructive",
      });
      throw err;
    }
  };

  // Location handlers  
  const handleLocationAdd = async (locationData: any) => {
    if (!business?.id) return;

    try {
      // Check if this will be the first location (make it primary by default)
      const isPrimary = locations.length === 0;

      const { data, error } = await supabase
        .from('business_locations')
        .insert({
          business_id: business.id,
          ...locationData,
          is_primary: isPrimary,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Location added successfully",
      });

      await loadBusinessLocations(); // Reload locations
    } catch (err) {
      console.error('Error adding location:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to add location",
        variant: "destructive",
      });
      throw err;
    }
  };

  const handleLocationUpdate = async (locationId: string, locationData: any) => {
    try {
      const { error } = await supabase
        .from('business_locations')
        .update(locationData)
        .eq('id', locationId)
        .eq('business_id', business.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Location updated successfully",
      });

      await loadBusinessLocations(); // Reload locations
    } catch (err) {
      console.error('Error updating location:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update location",
        variant: "destructive",
      });
      throw err;
    }
  };

  const handleLocationDelete = async (locationId: string) => {
    try {
      // Check if this is the primary location
      const location = locations.find(loc => loc.id === locationId);
      if (location?.is_primary && locations.length > 1) {
        toast({
          title: "Cannot Delete",
          description: "Cannot delete primary location. Set another location as primary first.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('business_locations')
        .delete()
        .eq('id', locationId)
        .eq('business_id', business.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Location deleted successfully",
      });

      await loadBusinessLocations(); // Reload locations
    } catch (err) {
      console.error('Error deleting location:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete location",
        variant: "destructive",
      });
      throw err;
    }
  };

  const handleLocationSetPrimary = async (locationId: string) => {
    try {
      // First, unset all primary flags for this business
      await supabase
        .from('business_locations')
        .update({ is_primary: false })
        .eq('business_id', business.id);

      // Then set the selected location as primary
      const { error } = await supabase
        .from('business_locations')
        .update({ is_primary: true })
        .eq('id', locationId)
        .eq('business_id', business.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Primary location updated successfully",
      });

      await loadBusinessLocations(); // Reload locations
    } catch (err) {
      console.error('Error setting primary location:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to set primary location",
        variant: "destructive",
      });
      throw err;
    }
  };

  const hasUnsavedChanges = isEditing;
  
  // Tabs that support editing
  const editableTabs = ['basic-info', 'hours'];
  const isEditableTab = editableTabs.includes(activeTab);

  return (
    <div className="space-y-6">
      {/* Header with Edit or Save/Cancel actions */}
      {hasUnsavedChanges ? (
        <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Unsaved Changes</Badge>
            <span className="text-sm text-muted-foreground">
              You have unsaved changes to your business settings.
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={cancelEditing}
              disabled={loading}
            >
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={saveBusinessSettings}
              disabled={loading}
            >
              <Save className="w-4 h-4 mr-1" />
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Business Settings</h2>
            <p className="text-sm text-gray-600">Manage your business information and preferences</p>
          </div>
          {isEditableTab && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Edit className="w-4 h-4 mr-1" />
              Edit Settings
            </Button>
          )}
        </div>
      )}

      {/* Main content in tabs */}
      <Tabs defaultValue="basic-info" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="basic-info">Basic Info</TabsTrigger>
          <TabsTrigger value="hours">Hours</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
        </TabsList>

        <TabsContent value="basic-info" className="space-y-6">
          <BasicInfoSection
            businessData={businessData}
            setBusinessData={setBusinessData}
            isEditing={isEditing}
            onSave={saveBusinessSettings}
            onCancel={cancelEditing}
            onEdit={() => setIsEditing(true)}
            logoUploading={logoUploading}
            onLogoUpload={handleLogoUpload}
          />
        </TabsContent>

        <TabsContent value="hours" className="space-y-6">
          <BusinessHoursSection
            businessData={businessData}
            setBusinessData={setBusinessData}
            isEditing={isEditing}
            onSave={saveBusinessSettings}
            onCancel={cancelEditing}
            onEdit={() => setIsEditing(true)}
          />
        </TabsContent>

        <TabsContent value="services" className="space-y-6">
          <ServiceCategoriesSection
            serviceEligibility={serviceEligibility}
            eligibilityLoading={eligibilityLoading}
            eligibilityError={eligibilityError}
            onLoadServiceEligibility={loadServiceEligibility}
          />
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <DocumentsSection
            businessId={business?.id}
            documents={documents}
            uploading={documentsLoading}
            onDocumentUpload={handleDocumentUpload}
            onDocumentDelete={handleDocumentDelete}
          />
        </TabsContent>

        <TabsContent value="locations" className="space-y-6">
          <LocationsSection
            businessId={business?.id}
            locations={locations}
            loading={locationsLoading}
            onLocationAdd={handleLocationAdd}
            onLocationUpdate={handleLocationUpdate}
            onLocationDelete={handleLocationDelete}
            onLocationSetPrimary={handleLocationSetPrimary}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}