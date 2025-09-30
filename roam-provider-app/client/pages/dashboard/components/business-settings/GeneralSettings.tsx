import React, { useState } from "react";
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
  Share2,
} from "lucide-react";

interface GeneralSettingsProps {
  businessData: {
    business_name: string;
    business_type: "independent" | "small_business" | "franchise" | "enterprise" | "other";
    contact_email: string;
    phone: string;
    website_url: string;
    business_description: string;
    logo_url: string;
    cover_image_url: string;
  };
  isEditing: boolean;
  logoUploading: boolean;
  coverUploading: boolean;
  onBusinessDataChange: (data: any) => void;
  onLogoUpload: (file: File) => void;
  onCoverUpload: (file: File) => void;
  onShareClick: () => void;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({
  businessData,
  isEditing,
  logoUploading,
  coverUploading,
  onBusinessDataChange,
  onLogoUpload,
  onCoverUpload,
  onShareClick,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Business Information</span>
          <Button
            variant="outline"
            size="sm"
            onClick={onShareClick}
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
                  onClick={() => onBusinessDataChange({...businessData, cover_image_url: ""})}
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
                if (file) onCoverUpload(file);
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
                  onClick={() => onBusinessDataChange({...businessData, logo_url: ""})}
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
                  value={businessData.business_name}
                  onChange={(e) => onBusinessDataChange({...businessData, business_name: e.target.value})}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label htmlFor="business_type">Business Type</Label>
                <Select
                  value={businessData.business_type}
                  onValueChange={(value: any) => onBusinessDataChange({...businessData, business_type: value})}
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
                  onChange={(e) => onBusinessDataChange({...businessData, contact_email: e.target.value})}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={businessData.phone}
                  onChange={(e) => onBusinessDataChange({...businessData, phone: e.target.value})}
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
                onChange={(e) => onBusinessDataChange({...businessData, website_url: e.target.value})}
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
            onChange={(e) => onBusinessDataChange({...businessData, business_description: e.target.value})}
            disabled={!isEditing}
            placeholder="Describe your business, services, and what makes you unique..."
            rows={4}
          />
        </div>
      </CardContent>
    </Card>
  );
};