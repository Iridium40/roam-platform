import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "react-router-dom";

// Import our modular components
import BasicInfoSection from "./business-settings/BasicInfoSection";
import BusinessHoursSection from "./business-settings/BusinessHoursSection";
import { DocumentsSection } from "./business-settings/DocumentsSection";
import { LocationsSection } from "./business-settings/LocationsSection";
import ServicesTab from "./ServicesTabSimplified";

// Import the custom hook
import { useBusinessSettings } from "./business-settings/hooks/useBusinessSettings";

interface BusinessSettingsTabProps {
  providerData?: any;
  business: any;
  onBusinessUpdate?: (updatedBusiness: any) => void;
}

export function BusinessSettingsTab({ providerData, business, onBusinessUpdate }: BusinessSettingsTabProps) {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
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
    handleCoverPositionChange,
  } = useBusinessSettings(business);

  const providerRole = providerData?.provider_role;
  const canEditBusinessSettings = providerRole !== "dispatcher"; // dispatchers: services only

  const visibleTabs = [
    ...(canEditBusinessSettings ? [{ value: "basic-info", label: "Basic Info" }] : []),
    { value: "services", label: "Services" },
    ...(canEditBusinessSettings ? [{ value: "hours", label: "Hours" }] : []),
    ...(canEditBusinessSettings ? [{ value: "documents", label: "Documents" }] : []),
    ...(canEditBusinessSettings ? [{ value: "locations", label: "Locations" }] : []),
  ] as const;

  const requestedTab = searchParams.get("tab") || "";
  const defaultTab = visibleTabs[0]?.value || "services";
  const activeSubtab = (visibleTabs as readonly { value: string; label: string }[]).some(t => t.value === requestedTab)
    ? requestedTab
    : defaultTab;

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
      // Validate file size (50MB max)
      const maxSize = 50 * 1024 * 1024; // 50MB in bytes
      if (file.size > maxSize) {
        throw new Error(`File size exceeds 50MB limit. Maximum allowed size is 50MB.`);
      }

      // Sanitize filename for storage
      const sanitizeFileName = (filename: string) => {
        return filename
          .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special characters with underscores
          .replace(/_+/g, '_') // Replace multiple underscores with single
          .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
      };

      const sanitizedFileName = sanitizeFileName(file.name);
      const fileExt = file.name.split('.').pop() || 'pdf';
      const timestamp = Date.now();
      const uniqueFileName = `${documentType}_${timestamp}.${fileExt}`;
      const storagePath = `provider-documents/${business.id}/${uniqueFileName}`;

      // Upload directly to Supabase storage (bypasses Vercel body size limit)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('roam-file-storage')
        .upload(storagePath, file, {
          contentType: file.type || 'application/pdf',
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('roam-file-storage')
        .getPublicUrl(storagePath);

      if (!urlData || !urlData.publicUrl) {
        throw new Error('Failed to get public URL');
      }

      // Create document record in database
      const { data: documentData, error: dbError } = await supabase
        .from('business_documents')
        .insert({
          business_id: business.id,
          document_type: documentType,
          document_name: file.name,
          file_url: urlData.publicUrl,
          file_size_bytes: file.size,
          verification_status: 'pending'
        })
        .select()
        .single();

      if (dbError) {
        console.error("Database error:", dbError);
        // Try to clean up uploaded file
        await supabase.storage
          .from('roam-file-storage')
          .remove([storagePath]);
        
        throw new Error(`Failed to create document record: ${dbError.message}`);
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
      <Tabs
        value={activeSubtab}
        onValueChange={(value) => {
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.set("tab", value);
            return next;
          }, { replace: true });
        }}
        className="w-full"
      >
        <TabsList
          className="grid w-full"
          style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, minmax(0, 1fr))` }}
        >
          {visibleTabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="data-[state=active]:bg-[#f88221] data-[state=active]:text-white"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {canEditBusinessSettings && (
        <TabsContent value="basic-info" className="space-y-6">
          <BasicInfoSection
            businessData={businessData}
            setBusinessData={setBusinessData}
            hasChanges={hasChanges}
            loading={loading}
            onSave={saveBusinessSettings}
            logoUploading={logoUploading}
            coverUploading={coverUploading}
            coverImagePosition={businessData.cover_image_position || 50}
            onCoverPositionChange={handleCoverPositionChange}
            onLogoUpload={handleLogoUpload}
            onCoverUpload={handleCoverUpload}
          />
        </TabsContent>
        )}

        <TabsContent value="services" className="space-y-6 mt-6">
          <ServicesTab providerData={providerData} business={business} />
        </TabsContent>

        {canEditBusinessSettings && (
        <TabsContent value="hours" className="space-y-6">
          <BusinessHoursSection
            businessData={businessData}
            setBusinessData={setBusinessData}
            hasChanges={hasChanges}
            loading={loading}
            onSave={saveBusinessSettings}
          />
        </TabsContent>
        )}

        {canEditBusinessSettings && (
        <TabsContent value="documents" className="space-y-6">
          <DocumentsSection
            businessId={business?.id}
            documents={documents}
            uploading={documentsLoading}
            onDocumentUpload={handleDocumentUpload}
            onDocumentDelete={handleDocumentDelete}
          />
        </TabsContent>
        )}

        {canEditBusinessSettings && (
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
        )}
      </Tabs>
    </div>
  );
}