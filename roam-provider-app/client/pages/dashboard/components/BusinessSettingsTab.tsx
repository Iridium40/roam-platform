import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building,
  Camera,
  Upload,
  Trash2,
  Save,
  Edit,
  Clock,
  MapPin,
  Phone,
  Mail,
  Globe,
  Plus,
  Navigation,
  Home,
  Car,
  Share2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import ShareModal from "@/components/ShareModal";

interface BusinessSettingsTabProps {
  providerData: any;
  business: any;
}

export default function BusinessSettingsTab({
  providerData,
  business,
}: BusinessSettingsTabProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [businessData, setBusinessData] = useState({
    business_name: "",
    business_type: "independent" as const,
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
      saturday: { open: "10:00", close: "15:00", closed: false },
      sunday: { open: "10:00", close: "15:00", closed: true },
    },
  });
  const [isEditing, setIsEditing] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  
  // Business Locations State
  const [locations, setLocations] = useState<any[]>([]);
  const [showAddLocationModal, setShowAddLocationModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<any>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [locationForm, setLocationForm] = useState({
    location_name: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "",
    latitude: "",
    longitude: "",
    is_primary: false,
    offers_mobile_services: false,
    mobile_service_radius: 25,
  });

  // Load business data
  const loadBusinessData = async () => {
    if (!business) return;

    try {
      setLoading(true);
      setBusinessData({
        business_name: business.business_name || "",
        business_type: business.business_type || "independent",
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
          saturday: { open: "10:00", close: "15:00", closed: false },
          sunday: { open: "10:00", close: "15:00", closed: true },
        },
      });
    } catch (error) {
      console.error('Error loading business data:', error);
      toast({
        title: "Error",
        description: "Failed to load business data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Save business data
  const saveBusinessData = async () => {
    if (!business?.id) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('business_profiles')
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
        .eq('id', business.id);

      if (error) throw error;

      toast({
        title: "Business Updated",
        description: "Your business settings have been updated successfully.",
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating business:', error);
      toast({
        title: "Error",
        description: "Failed to update business settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle logo upload
  const handleLogoUpload = async (file: File) => {
    if (!business?.id) return;

    try {
      setLogoUploading(true);
      // TODO: Implement file upload to storage
      // For now, just show a placeholder
      toast({
        title: "Logo Updated",
        description: "Logo upload functionality coming soon.",
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: "Error",
        description: "Failed to upload logo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLogoUploading(false);
    }
  };

  // Handle cover upload
  const handleCoverUpload = async (file: File) => {
    if (!business?.id) return;

    try {
      setCoverUploading(true);
      // TODO: Implement file upload to storage
      // For now, just show a placeholder
      toast({
        title: "Cover Photo Updated",
        description: "Cover photo upload functionality coming soon.",
      });
    } catch (error) {
      console.error('Error uploading cover photo:', error);
      toast({
        title: "Error",
        description: "Failed to upload cover photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCoverUploading(false);
    }
  };

  // Load business locations
  const loadBusinessLocations = async () => {
    if (!business?.id) return;

    try {
      const { data: locationsData, error } = await supabase
        .from('business_locations')
        .select('*')
        .eq('business_id', business.id)
        .eq('is_active', true)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      setLocations(locationsData || []);
    } catch (error) {
      console.error('Error loading business locations:', error);
      toast({
        title: "Error",
        description: "Failed to load business locations",
        variant: "destructive",
      });
    }
  };

  // Add new location
  const addLocation = async () => {
    if (!business?.id) return;

    try {
      const { data, error } = await supabase
        .from('business_locations')
        .insert({
          business_id: business.id,
          location_name: locationForm.location_name,
          address_line1: locationForm.address_line1,
          address_line2: locationForm.address_line2,
          city: locationForm.city,
          state: locationForm.state,
          postal_code: locationForm.postal_code,
          country: locationForm.country,
          latitude: locationForm.latitude ? parseFloat(locationForm.latitude) : null,
          longitude: locationForm.longitude ? parseFloat(locationForm.longitude) : null,
          is_primary: locationForm.is_primary,
          offers_mobile_services: locationForm.offers_mobile_services,
          mobile_service_radius: locationForm.mobile_service_radius,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Location Added",
        description: "Business location has been added successfully.",
      });

      setShowAddLocationModal(false);
      resetLocationForm();
      loadBusinessLocations();
    } catch (error) {
      console.error('Error adding location:', error);
      toast({
        title: "Error",
        description: "Failed to add location. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Update location
  const updateLocation = async () => {
    if (!editingLocation?.id) return;

    try {
      const { error } = await supabase
        .from('business_locations')
        .update({
          location_name: locationForm.location_name,
          address_line1: locationForm.address_line1,
          address_line2: locationForm.address_line2,
          city: locationForm.city,
          state: locationForm.state,
          postal_code: locationForm.postal_code,
          country: locationForm.country,
          latitude: locationForm.latitude ? parseFloat(locationForm.latitude) : null,
          longitude: locationForm.longitude ? parseFloat(locationForm.longitude) : null,
          is_primary: locationForm.is_primary,
          offers_mobile_services: locationForm.offers_mobile_services,
          mobile_service_radius: locationForm.mobile_service_radius,
        })
        .eq('id', editingLocation.id);

      if (error) throw error;

      toast({
        title: "Location Updated",
        description: "Business location has been updated successfully.",
      });

      setShowAddLocationModal(false);
      setEditingLocation(null);
      resetLocationForm();
      loadBusinessLocations();
    } catch (error) {
      console.error('Error updating location:', error);
      toast({
        title: "Error",
        description: "Failed to update location. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Delete location
  const deleteLocation = async (locationId: string) => {
    try {
      const { error } = await supabase
        .from('business_locations')
        .update({ is_active: false })
        .eq('id', locationId);

      if (error) throw error;

      toast({
        title: "Location Deleted",
        description: "Business location has been deleted successfully.",
      });

      loadBusinessLocations();
    } catch (error) {
      console.error('Error deleting location:', error);
      toast({
        title: "Error",
        description: "Failed to delete location. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Reset location form
  const resetLocationForm = () => {
    setLocationForm({
      location_name: "",
      address_line1: "",
      address_line2: "",
      city: "",
      state: "",
      postal_code: "",
      country: "",
      latitude: "",
      longitude: "",
      is_primary: false,
      offers_mobile_services: false,
      mobile_service_radius: 25,
    });
  };

  // Open edit location modal
  const openEditLocationModal = (location: any) => {
    setEditingLocation(location);
    setLocationForm({
      location_name: location.location_name || "",
      address_line1: location.address_line1 || "",
      address_line2: location.address_line2 || "",
      city: location.city || "",
      state: location.state || "",
      postal_code: location.postal_code || "",
      country: location.country || "",
      latitude: location.latitude?.toString() || "",
      longitude: location.longitude?.toString() || "",
      is_primary: location.is_primary || false,
      offers_mobile_services: location.offers_mobile_services || false,
      mobile_service_radius: location.mobile_service_radius || 25,
    });
    setShowAddLocationModal(true);
  };

  // Open add location modal
  const openAddLocationModal = () => {
    setEditingLocation(null);
    resetLocationForm();
    setShowAddLocationModal(true);
  };

  // Generate business share URL
  const getBusinessShareUrl = () => {
    if (!business?.id) return "";
    // This would be the customer-facing URL for the business
    return `${window.location.origin}/business/${business.id}`;
  };

  useEffect(() => {
    loadBusinessData();
    loadBusinessLocations();
  }, [business]);

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Business Settings</h1>
          <p className="text-sm text-gray-600">Loading business data...</p>
        </div>
        <Card className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-32 bg-gray-200 rounded mb-4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Business Settings</h1>
          <p className="text-sm text-gray-600">Manage your business profile and settings</p>
        </div>
        <div className="flex items-center space-x-2 mt-4 sm:mt-0">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={saveBusinessData} disabled={loading}>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Business
            </Button>
          )}
        </div>
      </div>

      {/* Business Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Business Information</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Share Business
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Cover Photo */}
          <div>
            <Label className="text-sm font-medium">Cover Photo</Label>
            <div className="mt-2 relative">
              {businessData.cover_image_url ? (
                <div className="relative">
                  <img
                    src={businessData.cover_image_url}
                    alt="Business Cover"
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2"
                    disabled={coverUploading}
                    onClick={() => document.getElementById('business-cover-upload')?.click()}
                  >
                    <Camera className="w-4 h-4 mr-1" />
                    Change
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-20"
                    onClick={() => setBusinessData({...businessData, cover_image_url: ""})}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('business-cover-upload')?.click()}
                    disabled={coverUploading}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Cover Photo
                  </Button>
                </div>
              )}
              <input
                id="business-cover-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleCoverUpload(file);
                }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Upload a cover image for your business (max 10MB). Recommended size: 1200x400px
            </p>
          </div>

          {/* Logo and Basic Info */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Logo */}
            <div>
              <Label className="text-sm font-medium">Business Logo</Label>
              <div className="mt-2 flex items-center space-x-4">
                <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                  {businessData.logo_url ? (
                    <img
                      src={businessData.logo_url}
                      alt="Business Logo"
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <Building className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={logoUploading}
                    onClick={() => document.getElementById('logo-upload')?.click()}
                  >
                    <Camera className="w-4 h-4 mr-1" />
                    Change Logo
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBusinessData({...businessData, logo_url: ""})}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Remove
                  </Button>
                </div>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLogoUpload(file);
                  }}
                />
              </div>
            </div>

            {/* Basic Information */}
            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="business_name">Business Name</Label>
                  <Input
                    id="business_name"
                    value={businessData.business_name}
                    onChange={(e) => setBusinessData({...businessData, business_name: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="business_type">Business Type</Label>
                  <Select
                    value={businessData.business_type}
                    onValueChange={(value: any) => setBusinessData({...businessData, business_type: value})}
                    disabled={!isEditing}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="independent">Independent</SelectItem>
                      <SelectItem value="small_business">Small Business</SelectItem>
                      <SelectItem value="franchise">Franchise</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contact_email">Contact Email</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={businessData.contact_email}
                    onChange={(e) => setBusinessData({...businessData, contact_email: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={businessData.phone}
                    onChange={(e) => setBusinessData({...businessData, phone: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="website_url">Website</Label>
                <Input
                  id="website_url"
                  type="url"
                  value={businessData.website_url}
                  onChange={(e) => setBusinessData({...businessData, website_url: e.target.value})}
                  disabled={!isEditing}
                  placeholder="https://yourbusiness.com"
                />
              </div>
            </div>
          </div>

          {/* Business Description */}
          <div>
            <Label htmlFor="business_description">Business Description</Label>
            <Textarea
              id="business_description"
              value={businessData.business_description}
              onChange={(e) => setBusinessData({...businessData, business_description: e.target.value})}
              disabled={!isEditing}
              placeholder="Describe your business, services, and what makes you unique..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Business Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Business Hours
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(businessData.business_hours).map(([day, hours]: [string, any]) => (
              <div key={day} className="flex items-center space-x-4">
                <div className="w-24">
                  <Label className="text-sm font-medium capitalize">{day}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={!hours.closed}
                    onChange={(e) => {
                      const newHours = { ...businessData.business_hours };
                      newHours[day as keyof typeof newHours] = {
                        ...hours,
                        closed: !e.target.checked
                      };
                      setBusinessData({ ...businessData, business_hours: newHours });
                    }}
                    disabled={!isEditing}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-600">Open</span>
                </div>
                {!hours.closed && (
                  <div className="flex items-center space-x-2">
                    <Input
                      type="time"
                      value={hours.open}
                      onChange={(e) => {
                        const newHours = { ...businessData.business_hours };
                        newHours[day as keyof typeof newHours] = {
                          ...hours,
                          open: e.target.value
                        };
                        setBusinessData({ ...businessData, business_hours: newHours });
                      }}
                      disabled={!isEditing}
                      className="w-24"
                    />
                    <span className="text-sm text-gray-600">to</span>
                    <Input
                      type="time"
                      value={hours.close}
                      onChange={(e) => {
                        const newHours = { ...businessData.business_hours };
                        newHours[day as keyof typeof newHours] = {
                          ...hours,
                          close: e.target.value
                        };
                        setBusinessData({ ...businessData, business_hours: newHours });
                      }}
                      disabled={!isEditing}
                      className="w-24"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Business Locations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Business Locations
            </div>
            <Button onClick={openAddLocationModal} size="sm">
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
              <Button onClick={openAddLocationModal}>
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
                        onClick={() => openEditLocationModal(location)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteLocation(location.id)}
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

      {/* Add/Edit Location Modal */}
      {showAddLocationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editingLocation ? "Edit Location" : "Add New Location"}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAddLocationModal(false);
                  setEditingLocation(null);
                  resetLocationForm();
                }}
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
                  onChange={(e) => setLocationForm({...locationForm, location_name: e.target.value})}
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
                    onChange={(e) => setLocationForm({...locationForm, address_line1: e.target.value})}
                    placeholder="Street address"
                  />
                </div>
                <div>
                  <Label htmlFor="address_line2">Address Line 2 (Optional)</Label>
                  <Input
                    id="address_line2"
                    value={locationForm.address_line2}
                    onChange={(e) => setLocationForm({...locationForm, address_line2: e.target.value})}
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
                    onChange={(e) => setLocationForm({...locationForm, city: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="state">State/Province</Label>
                  <Input
                    id="state"
                    value={locationForm.state}
                    onChange={(e) => setLocationForm({...locationForm, state: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="postal_code">Postal Code</Label>
                  <Input
                    id="postal_code"
                    value={locationForm.postal_code}
                    onChange={(e) => setLocationForm({...locationForm, postal_code: e.target.value})}
                  />
                </div>
              </div>

              {/* Country */}
              <div>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={locationForm.country}
                  onChange={(e) => setLocationForm({...locationForm, country: e.target.value})}
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
                    onChange={(e) => setLocationForm({...locationForm, latitude: e.target.value})}
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
                    onChange={(e) => setLocationForm({...locationForm, longitude: e.target.value})}
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
                    onChange={(e) => setLocationForm({...locationForm, is_primary: e.target.checked})}
                    className="rounded"
                  />
                  <Label htmlFor="is_primary">Set as primary location</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="offers_mobile_services"
                    checked={locationForm.offers_mobile_services}
                    onChange={(e) => setLocationForm({...locationForm, offers_mobile_services: e.target.checked})}
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
                      onChange={(e) => setLocationForm({...locationForm, mobile_service_radius: parseInt(e.target.value) || 25})}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddLocationModal(false);
                  setEditingLocation(null);
                  resetLocationForm();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={editingLocation ? updateLocation : addLocation}
              >
                {editingLocation ? "Update Location" : "Add Location"}
              </Button>
            </div>
          </div>
        </div>
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
