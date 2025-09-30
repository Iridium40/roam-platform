import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MapPin, Plus, Edit, Trash2, Navigation } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BusinessLocation {
  id: string;
  business_id: string;
  location_name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  latitude?: number;
  longitude?: number;
  is_active: boolean;
  is_primary: boolean;
  offers_mobile_services: boolean;
  mobile_service_radius?: number;
}

interface LocationsSectionProps {
  businessId: string;
  locations: BusinessLocation[];
  loading: boolean;
  onLocationAdd: (locationData: Partial<BusinessLocation>) => Promise<void>;
  onLocationUpdate: (locationId: string, locationData: Partial<BusinessLocation>) => Promise<void>;
  onLocationDelete: (locationId: string) => Promise<void>;
  onLocationSetPrimary: (locationId: string) => Promise<void>;
}

interface LocationFormData {
  location_name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  offers_mobile_services: boolean;
  mobile_service_radius: number;
}

const DEFAULT_FORM_DATA: LocationFormData = {
  location_name: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  postal_code: "",
  country: "US",
  offers_mobile_services: false,
  mobile_service_radius: 10,
};

export function LocationsSection({
  businessId,
  locations,
  loading,
  onLocationAdd,
  onLocationUpdate,
  onLocationDelete,
  onLocationSetPrimary,
}: LocationsSectionProps) {
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [editingLocation, setEditingLocation] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState<LocationFormData>(DEFAULT_FORM_DATA);
  const [submitting, setSubmitting] = React.useState(false);

  const resetForm = () => {
    setFormData(DEFAULT_FORM_DATA);
    setShowAddForm(false);
    setEditingLocation(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingLocation) {
        await onLocationUpdate(editingLocation, formData);
      } else {
        await onLocationAdd(formData);
      }
      resetForm();
    } catch (error) {
      console.error("Error saving location:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (location: BusinessLocation) => {
    setFormData({
      location_name: location.location_name || "",
      address_line1: location.address_line1 || "",
      address_line2: location.address_line2 || "",
      city: location.city || "",
      state: location.state || "",
      postal_code: location.postal_code || "",
      country: location.country || "US",
      offers_mobile_services: location.offers_mobile_services || false,
      mobile_service_radius: location.mobile_service_radius || 10,
    });
    setEditingLocation(location.id);
    setShowAddForm(true);
  };

  const handleDelete = async (locationId: string) => {
    if (window.confirm("Are you sure you want to delete this location?")) {
      await onLocationDelete(locationId);
    }
  };

  const primaryLocation = locations.find(loc => loc.is_primary);
  const secondaryLocations = locations.filter(loc => !loc.is_primary);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Locations</CardTitle>
        <CardDescription>
          Manage your business locations and service areas. You can have multiple locations and offer mobile services.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Primary Location */}
        {primaryLocation && (
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Primary Location
            </h3>
            <LocationCard
              location={primaryLocation}
              isPrimary={true}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onSetPrimary={onLocationSetPrimary}
            />
          </div>
        )}

        {/* Secondary Locations */}
        {secondaryLocations.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3">Additional Locations</h3>
            <div className="space-y-3">
              {secondaryLocations.map((location) => (
                <LocationCard
                  key={location.id}
                  location={location}
                  isPrimary={false}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onSetPrimary={onLocationSetPrimary}
                />
              ))}
            </div>
          </div>
        )}

        {/* No Locations Message */}
        {locations.length === 0 && (
          <Alert>
            <MapPin className="h-4 w-4" />
            <AlertDescription>
              You haven't added any business locations yet. Add your primary location to help customers find you.
            </AlertDescription>
          </Alert>
        )}

        {/* Add Location Button */}
        {!showAddForm && (
          <Button onClick={() => setShowAddForm(true)} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add {locations.length === 0 ? "Primary" : "Another"} Location
          </Button>
        )}

        {/* Add/Edit Location Form */}
        {showAddForm && (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-lg">
                {editingLocation ? "Edit Location" : "Add New Location"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="location_name">Location Name</Label>
                    <Input
                      id="location_name"
                      value={formData.location_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, location_name: e.target.value }))}
                      placeholder="e.g., Main Office, Downtown Studio"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="address_line1">Street Address</Label>
                    <Input
                      id="address_line1"
                      value={formData.address_line1}
                      onChange={(e) => setFormData(prev => ({ ...prev, address_line1: e.target.value }))}
                      placeholder="123 Main Street"
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="address_line2">Address Line 2 (Optional)</Label>
                    <Input
                      id="address_line2"
                      value={formData.address_line2}
                      onChange={(e) => setFormData(prev => ({ ...prev, address_line2: e.target.value }))}
                      placeholder="Suite 100"
                    />
                  </div>

                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="New York"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="state">State/Province</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                      placeholder="NY"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="postal_code">ZIP/Postal Code</Label>
                    <Input
                      id="postal_code"
                      value={formData.postal_code}
                      onChange={(e) => setFormData(prev => ({ ...prev, postal_code: e.target.value }))}
                      placeholder="10001"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                      placeholder="US"
                      required
                    />
                  </div>
                </div>

                {/* Mobile Services */}
                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="offers_mobile_services">Offer Mobile Services</Label>
                      <p className="text-sm text-muted-foreground">
                        Travel to customer locations from this address
                      </p>
                    </div>
                    <Switch
                      id="offers_mobile_services"
                      checked={formData.offers_mobile_services}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, offers_mobile_services: checked }))}
                    />
                  </div>

                  {formData.offers_mobile_services && (
                    <div>
                      <Label htmlFor="mobile_service_radius">Service Radius (miles)</Label>
                      <Input
                        id="mobile_service_radius"
                        type="number"
                        min="1"
                        max="100"
                        value={formData.mobile_service_radius}
                        onChange={(e) => setFormData(prev => ({ ...prev, mobile_service_radius: parseInt(e.target.value) || 10 }))}
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Saving..." : editingLocation ? "Update Location" : "Add Location"}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}

// Location Card Component
function LocationCard({
  location,
  isPrimary,
  onEdit,
  onDelete,
  onSetPrimary,
}: {
  location: BusinessLocation;
  isPrimary: boolean;
  onEdit: (location: BusinessLocation) => void;
  onDelete: (locationId: string) => void;
  onSetPrimary: (locationId: string) => void;
}) {
  const formatAddress = (location: BusinessLocation) => {
    const parts = [
      location.address_line1,
      location.address_line2,
      location.city,
      location.state,
      location.postal_code,
    ].filter(Boolean);
    return parts.join(", ");
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{location.location_name || "Unnamed Location"}</h4>
            {isPrimary && <Badge variant="default">Primary</Badge>}
            {!location.is_active && <Badge variant="secondary">Inactive</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">{formatAddress(location)}</p>
          {location.offers_mobile_services && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Navigation className="w-3 h-3" />
              Mobile services within {location.mobile_service_radius} miles
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(location)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          {!isPrimary && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSetPrimary(location.id)}
                title="Set as primary location"
              >
                <MapPin className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(location.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}