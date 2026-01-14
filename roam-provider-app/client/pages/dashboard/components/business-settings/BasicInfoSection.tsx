import React from "react";
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
  Trash2,
  Save,
  Loader2,
} from "lucide-react";
import CoverImageEditor from "@/components/CoverImageEditor";

interface BasicInfoSectionProps {
  businessData: any;
  setBusinessData: (data: any) => void;
  hasChanges: boolean;
  loading: boolean;
  onSave: () => void;
  logoUploading: boolean;
  coverUploading: boolean;
  coverImagePosition?: number;
  onCoverPositionChange?: (position: number) => void;
  onLogoUpload: (file: File) => void;
  onCoverUpload: (file: File) => void;
}

export default function BasicInfoSection({
  businessData,
  setBusinessData,
  hasChanges,
  loading,
  onSave,
  logoUploading,
  coverUploading,
  coverImagePosition = 50,
  onCoverPositionChange,
  onLogoUpload,
  onCoverUpload,
}: BasicInfoSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="w-5 h-5" />
          Business Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Cover Photo with Position Controls */}
          <CoverImageEditor
            imageUrl={businessData.cover_image_url}
            imagePosition={coverImagePosition}
            onPositionChange={onCoverPositionChange}
            onFileSelect={onCoverUpload}
            onRemove={() => setBusinessData({...businessData, cover_image_url: ""})}
            uploading={coverUploading}
            label="Cover Photo"
            helpText="Recommended size: 1200x400px • Use arrows to adjust position"
          />

          {/* Logo and Basic Info */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Logo */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
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
                  {businessData.logo_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setBusinessData({...businessData, logo_url: ""})}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Remove
                    </Button>
                  )}
                </div>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onLogoUpload(file);
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
                    value={businessData.business_name || ""}
                    onChange={(e) => setBusinessData({...businessData, business_name: e.target.value})}
                    placeholder="Enter business name"
                  />
                </div>
                <div>
                  <Label htmlFor="business_type">Business Type</Label>
                  <Select
                    value={businessData.business_type || ""}
                    onValueChange={(value) => setBusinessData({...businessData, business_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select business type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="independent">Independent</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
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
                    value={businessData.contact_email || ""}
                    onChange={(e) => setBusinessData({...businessData, contact_email: e.target.value})}
                    placeholder="contact@business.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={businessData.phone || ""}
                    onChange={(e) => setBusinessData({...businessData, phone: e.target.value})}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="website_url">Website</Label>
                <Input
                  id="website_url"
                  type="text"
                  value={businessData.website_url || ""}
                  onChange={(e) => setBusinessData({...businessData, website_url: e.target.value})}
                  placeholder="yourbusiness.com"
                />
              </div>
            </div>
          </div>

          {/* Business Description */}
          <div>
            <Label htmlFor="business_description">Business Description</Label>
            <Textarea
              id="business_description"
              value={businessData.business_description || ""}
              onChange={(e) => setBusinessData({...businessData, business_description: e.target.value})}
              placeholder="Describe your business, services, and what makes you unique..."
              rows={4}
            />
          </div>

          {/* Save Button */}
          <Button
            onClick={onSave}
            disabled={loading || !hasChanges}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}