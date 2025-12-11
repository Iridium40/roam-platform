import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

// Import our modular components
import BasicInfoSection from "./business-settings/BasicInfoSection";
import BusinessHoursSection from "./business-settings/BusinessHoursSection";
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
    hasChanges,
    loading,
    logoUploading,
    coverUploading,
    
    // Actions
    saveBusinessSettings,
    handleLogoUpload,
    handleCoverUpload,
  } = useBusinessSettings(business);

  // State for documents and locations
  const [documents, setDocuments] = React.useState([]);
  const [locations, setLocations] = React.useState([]);
  const [documentsLoading, setDocumentsLoading] = React.useState(true);
  const [locationsLoading, setLocationsLoading] = React.useState(true);

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
      // Convert file to base64 for server transmission
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            // Remove the data URL prefix to get just the base64
            const base64 = reader.result.split(',')[1];
            resolve(base64);
          } else {
            reject(new Error('Failed to convert file to base64'));
          }
        };
        reader.onerror = error => reject(error);
      });

      // Upload via server endpoint to avoid RLS policy issues
      const response = await fetch('/api/business/upload-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_id: business.id,
          document_type: documentType,
          document_name: file.name,
          file: base64,
          file_type: file.type,
          file_size: file.size,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || `Upload failed with status ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
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

  return (
    <div className="space-y-6">

      {/* Main content in tabs */}
      <Tabs defaultValue="basic-info" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic-info">Basic Info</TabsTrigger>
          <TabsTrigger value="hours">Hours</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
        </TabsList>

        <TabsContent value="basic-info" className="space-y-6">
          <BasicInfoSection
            businessData={businessData}
            setBusinessData={setBusinessData}
            hasChanges={hasChanges}
            loading={loading}
            onSave={saveBusinessSettings}
            logoUploading={logoUploading}
            coverUploading={coverUploading}
            onLogoUpload={handleLogoUpload}
            onCoverUpload={handleCoverUpload}
          />
        </TabsContent>

        <TabsContent value="hours" className="space-y-6">
          <BusinessHoursSection
            businessData={businessData}
            setBusinessData={setBusinessData}
            hasChanges={hasChanges}
            loading={loading}
            onSave={saveBusinessSettings}
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