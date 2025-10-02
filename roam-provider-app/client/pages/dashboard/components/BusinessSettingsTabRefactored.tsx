import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Save, X } from "lucide-react";
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
  const [documentsLoading, setDocumentsLoading] = React.useState(false);
  const [locationsLoading, setLocationsLoading] = React.useState(true);

  // Load business locations on mount
  React.useEffect(() => {
    if (business?.id) {
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

  // Document handlers
  const handleDocumentUpload = async (file: File, documentType: string) => {
    // Implementation would upload to Supabase storage and create DB record
    console.log("Uploading document:", file.name, "Type:", documentType);
  };

  const handleDocumentDelete = async (documentId: string) => {
    // Implementation would delete from storage and DB
    console.log("Deleting document:", documentId);
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

  return (
    <div className="space-y-6">
      {/* Header with save/cancel actions */}
      {hasUnsavedChanges && (
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
      )}

      {/* Main content in tabs */}
      <Tabs defaultValue="basic-info" className="w-full">
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