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
  Trash2,
  Edit,
  Save,
} from "lucide-react";

interface BasicInfoSectionProps {
  businessData: any;
  setBusinessData: (data: any) => void;
  isEditing: boolean;
  onSave: () => void;
  onCancel: () => void;
  onEdit: () => void;
  logoUploading: boolean;
  onLogoUpload: (file: File) => void;
}

export default function BasicInfoSection({
  businessData,
  setBusinessData,
  isEditing,
  onSave,
  onCancel,
  onEdit,
  logoUploading,
  onLogoUpload,
}: BasicInfoSectionProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Building className="w-5 h-5" />
          Business Information
        </CardTitle>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button onClick={onSave} size="sm">
                <Save className="w-4 h-4 mr-1" />
                Save
              </Button>
              <Button onClick={onCancel} variant="outline" size="sm">
                Cancel
              </Button>
            </>
          ) : (
            <Button onClick={onEdit} variant="outline" size="sm">
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Cover Photo */}
          <div className="space-y-4">
            <Label>Cover Photo</Label>
            <div 
              className="relative h-48 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => isEditing && document.getElementById('cover-upload')?.click()}
            >
              {businessData.cover_image_url ? (
                <img
                  src={businessData.cover_image_url}
                  alt="Business Cover"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-white text-center">
                    <Camera className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">Click to add cover photo</p>
                  </div>
                </div>
              )}
              {isEditing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 opacity-0 hover:opacity-100 transition-opacity">
                  <Camera className="w-8 h-8 text-white" />
                </div>
              )}
            </div>
            <input
              id="cover-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onLogoUpload(file);
              }}
            />
          </div>

          {/* Logo and Basic Info */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Logo */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                  {businessData.logo_url ? (
                    <img
                      src={businessData.logo_url}
                      alt="Business Logo"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Building className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={logoUploading || !isEditing}
                    onClick={() => document.getElementById('logo-upload')?.click()}
                  >
                    <Camera className="w-4 h-4 mr-1" />
                    Change Logo
                  </Button>
                  {businessData.logo_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!isEditing}
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
                    disabled={!isEditing}
                    placeholder="Enter business name"
                  />
                </div>
                <div>
                  <Label htmlFor="business_type">Business Type</Label>
                  <Select
                    value={businessData.business_type || ""}
                    onValueChange={(value) => setBusinessData({...businessData, business_type: value})}
                    disabled={!isEditing}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select business type" />
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
                    value={businessData.contact_email || ""}
                    onChange={(e) => setBusinessData({...businessData, contact_email: e.target.value})}
                    disabled={!isEditing}
                    placeholder="contact@business.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={businessData.phone || ""}
                    onChange={(e) => setBusinessData({...businessData, phone: e.target.value})}
                    disabled={!isEditing}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="website_url">Website</Label>
                <Input
                  id="website_url"
                  type="url"
                  value={businessData.website_url || ""}
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
              value={businessData.business_description || ""}
              onChange={(e) => setBusinessData({...businessData, business_description: e.target.value})}
              disabled={!isEditing}
              placeholder="Describe your business, services, and what makes you unique..."
              rows={4}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}