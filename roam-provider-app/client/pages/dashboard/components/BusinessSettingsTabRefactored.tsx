import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Save, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

  // Mock data for documents and locations - these would come from API calls
  const [documents, setDocuments] = React.useState([]);
  const [locations, setLocations] = React.useState([]);
  const [documentsLoading, setDocumentsLoading] = React.useState(false);
  const [locationsLoading, setLocationsLoading] = React.useState(false);

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
    // Implementation would create location in DB
    console.log("Adding location:", locationData);
  };

  const handleLocationUpdate = async (locationId: string, locationData: any) => {
    // Implementation would update location in DB
    console.log("Updating location:", locationId, locationData);
  };

  const handleLocationDelete = async (locationId: string) => {
    // Implementation would delete location from DB
    console.log("Deleting location:", locationId);
  };

  const handleLocationSetPrimary = async (locationId: string) => {
    // Implementation would set location as primary
    console.log("Setting primary location:", locationId);
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