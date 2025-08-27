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
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

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

  useEffect(() => {
    loadBusinessData();
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
          <CardTitle>Business Information</CardTitle>
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
    </div>
  );
}
