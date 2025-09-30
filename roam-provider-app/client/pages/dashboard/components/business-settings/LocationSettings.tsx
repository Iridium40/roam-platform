import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MapPin,
  Plus,
  Edit,
  Trash2,
  Car,
} from "lucide-react";

interface Location {
  id: string;
  location_name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  latitude?: string;
  longitude?: string;
  is_primary: boolean;
  offers_mobile_services: boolean;
  mobile_service_radius: number;
}

interface LocationForm {
  location_name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  latitude: string;
  longitude: string;
  is_primary: boolean;
  offers_mobile_services: boolean;
  mobile_service_radius: number;
}

interface LocationSettingsProps {
  locations: Location[];
  onAddLocation: () => void;
  onEditLocation: (location: Location) => void;
  onDeleteLocation: (locationId: string) => void;
}

interface LocationModalProps {
  isOpen: boolean;
  editingLocation: Location | null;
  locationForm: LocationForm;
  onLocationFormChange: (form: LocationForm) => void;
  onClose: () => void;
  onSave: () => void;
}

const LocationModal: React.FC<LocationModalProps> = ({
  isOpen,
  editingLocation,
  locationForm,
  onLocationFormChange,
  onClose,
  onSave,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {editingLocation ? "Edit Location" : "Add New Location"}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            ×
          </Button>
        </div>
        
        <div className="space-y-4">
          {/* Location Name */}
          <div>
            <Label htmlFor="location_name">Location Name</Label>
            <Input
              id="location_name"
              value={locationForm.location_name}
              onChange={(e) => onLocationFormChange({...locationForm, location_name: e.target.value})}
              placeholder="e.g., Main Office, Downtown Branch"
            />
          </div>

          {/* Address */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="address_line1">Address Line 1</Label>
              <Input
                id="address_line1"
                value={locationForm.address_line1}
                onChange={(e) => onLocationFormChange({...locationForm, address_line1: e.target.value})}
                placeholder="Street address"
              />
            </div>
            <div>
              <Label htmlFor="address_line2">Address Line 2 (Optional)</Label>
              <Input
                id="address_line2"
                value={locationForm.address_line2}
                onChange={(e) => onLocationFormChange({...locationForm, address_line2: e.target.value})}
                placeholder="Apartment, suite, etc."
              />
            </div>
          </div>

          {/* City, State, Postal Code */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={locationForm.city}
                onChange={(e) => onLocationFormChange({...locationForm, city: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="state">State/Province</Label>
              <Input
                id="state"
                value={locationForm.state}
                onChange={(e) => onLocationFormChange({...locationForm, state: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="postal_code">Postal Code</Label>
              <Input
                id="postal_code"
                value={locationForm.postal_code}
                onChange={(e) => onLocationFormChange({...locationForm, postal_code: e.target.value})}
              />
            </div>
          </div>

          {/* Country */}
          <div>
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              value={locationForm.country}
              onChange={(e) => onLocationFormChange({...locationForm, country: e.target.value})}
              placeholder="e.g., United States"
            />
          </div>

          {/* Coordinates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="latitude">Latitude (Optional)</Label>
              <Input
                id="latitude"
                type="number"
                step="any"
                value={locationForm.latitude}
                onChange={(e) => onLocationFormChange({...locationForm, latitude: e.target.value})}
                placeholder="e.g., 40.7128"
              />
            </div>
            <div>
              <Label htmlFor="longitude">Longitude (Optional)</Label>
              <Input
                id="longitude"
                type="number"
                step="any"
                value={locationForm.longitude}
                onChange={(e) => onLocationFormChange({...locationForm, longitude: e.target.value})}
                placeholder="e.g., -74.0060"
              />
            </div>
          </div>

          {/* Location Settings */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_primary"
                checked={locationForm.is_primary}
                onChange={(e) => onLocationFormChange({...locationForm, is_primary: e.target.checked})}
                className="rounded"
              />
              <Label htmlFor="is_primary">Set as primary location</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="offers_mobile_services"
                checked={locationForm.offers_mobile_services}
                onChange={(e) => onLocationFormChange({...locationForm, offers_mobile_services: e.target.checked})}
                className="rounded"
              />
              <Label htmlFor="offers_mobile_services">Offers mobile services</Label>
            </div>

            {locationForm.offers_mobile_services && (
              <div>
                <Label htmlFor="mobile_service_radius">Mobile Service Radius (miles)</Label>
                <Input
                  id="mobile_service_radius"
                  type="number"
                  min="1"
                  max="100"
                  value={locationForm.mobile_service_radius}
                  onChange={(e) => onLocationFormChange({...locationForm, mobile_service_radius: parseInt(e.target.value) || 25})}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end space-x-2 mt-6">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button onClick={onSave}>
            {editingLocation ? "Update Location" : "Add Location"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export const LocationSettings: React.FC<LocationSettingsProps> = ({
  locations,
  onAddLocation,
  onEditLocation,
  onDeleteLocation,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <MapPin className="w-5 h-5 mr-2" />
            Business Locations
          </div>
          <Button onClick={onAddLocation} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Location
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {locations.length === 0 ? (
          <div className="text-center py-8">
            <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Locations Added</h3>
            <p className="text-gray-600 mb-4">
              Add your business locations to help customers find you and understand your service areas.
            </p>
            <Button onClick={onAddLocation}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Location
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {locations.map((location) => (
              <div key={location.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-semibold text-gray-900">
                        {location.location_name || "Unnamed Location"}
                      </h4>
                      {location.is_primary && (
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                          Primary
                        </span>
                      )}
                      {location.offers_mobile_services && (
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center">
                          <Car className="w-3 h-3 mr-1" />
                          Mobile
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>{location.address_line1}</p>
                      {location.address_line2 && <p>{location.address_line2}</p>}
                      <p>
                        {location.city}, {location.state} {location.postal_code}
                      </p>
                      <p>{location.country}</p>
                      {location.offers_mobile_services && (
                        <p className="text-xs text-gray-500">
                          Service radius: {location.mobile_service_radius} miles
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEditLocation(location)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDeleteLocation(location.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export { LocationModal };