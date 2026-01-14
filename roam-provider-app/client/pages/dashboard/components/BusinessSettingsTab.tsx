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
  Shield,
  Eye,
  Tags,
  CheckCircle,
  Calendar,
  Info,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import ShareModal from "@/components/ShareModal";
import BusinessDocumentUploadForm from "@/components/BusinessDocumentUploadForm";
import CoverImageEditor from "@/components/CoverImageEditor";

// Geocoding helper function
async function geocodeAddress(address: {
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}): Promise<{ latitude: number; longitude: number } | null> {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    console.warn("Google Maps API key not configured, skipping geocoding");
    return null;
  }

  try {
    const addressParts = [
      address.address_line1,
      address.address_line2,
      address.city,
      address.state,
      address.postal_code,
      address.country,
    ].filter(Boolean);
    
    const fullAddress = addressParts.join(", ");
    const encodedAddress = encodeURIComponent(fullAddress);
    
    console.log("Geocoding address:", fullAddress);
    
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`
    );
    
    if (!response.ok) {
      console.error("Geocoding API request failed:", response.status);
      return null;
    }
    
    const data = await response.json();
    
    if (data.status === "OK" && data.results?.length > 0) {
      const location = data.results[0].geometry.location;
      console.log("Geocoding successful:", { lat: location.lat, lng: location.lng });
      return { latitude: location.lat, longitude: location.lng };
    } else {
      console.warn("Geocoding returned no results:", data.status);
      return null;
    }
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

interface BusinessSettingsTabProps {
  providerData: any;
  business: any;
}

interface ServiceCategory {
  id: string;
  service_category_type: string;
  description?: string;
  is_active: boolean;
}

interface ServiceSubcategory {
  id: string;
  service_subcategory_type: string;
  description?: string;
  is_active: boolean;
}

interface BusinessServiceCategory {
  id: string;
  business_id: string;
  category_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  service_categories?: ServiceCategory;
}

interface BusinessServiceSubcategory {
  id: string;
  business_id: string;
  subcategory_id: string;
  category_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  service_subcategories?: ServiceSubcategory;
  service_categories?: ServiceCategory;
}

interface ServiceEligibilityData {
  business_id: string;
  approved_categories: BusinessServiceCategory[];
  approved_subcategories: BusinessServiceSubcategory[];
  subcategories_by_category: Record<string, BusinessServiceSubcategory[]>;
  stats: {
    total_categories: number;
    total_subcategories: number;
    categories_with_subcategories: number;
    available_services_count: number;
    last_updated: number | null;
  };
  last_fetched: string;
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
  const [coverImagePosition, setCoverImagePosition] = useState(50); // 0-100, 50 is center
  
  // Business Locations State
  const [locations, setLocations] = useState<any[]>([]);
  const [showAddLocationModal, setShowAddLocationModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<any>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDocumentUploadModal, setShowDocumentUploadModal] = useState(false);
  const [businessDocuments, setBusinessDocuments] = useState<any[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);

  // Service Eligibility State
  const [serviceEligibility, setServiceEligibility] = useState<ServiceEligibilityData | null>(null);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [eligibilityError, setEligibilityError] = useState<string | null>(null);
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

  // Load service eligibility data
  const loadServiceEligibility = async (checkMounted?: () => boolean) => {
    if (!business?.id) {
      console.warn('loadServiceEligibility: No business ID available');
      return;
    }

    try {
      setEligibilityLoading(true);
      setEligibilityError(null);

      console.log('Loading service eligibility for business:', business.id);

      // Get the access token from localStorage or Supabase session
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token || localStorage.getItem('roam_access_token');

      console.log('Service eligibility auth debug:', {
        hasSession: !!session,
        hasSessionToken: !!session?.access_token,
        hasStoredToken: !!localStorage.getItem('roam_access_token'),
        tokenSource: session?.access_token ? 'session' : 'localStorage',
        tokenLength: accessToken?.length,
        businessId: business.id
      });

      if (!accessToken) {
        throw new Error('Authentication required. Please sign in again.');
      }

      const response = await fetch(`/api/business/service-eligibility?business_id=${business.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      // Check if component is still mounted before proceeding
      if (checkMounted && !checkMounted()) {
        console.log('Component unmounted, aborting service eligibility load');
        return;
      }

      // Check if response is ok before trying to parse JSON
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

        // Try to parse error response if it's JSON
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          // If we can't parse the error response, use the status text
          console.warn('Could not parse error response:', parseError);
        }

        throw new Error(errorMessage);
      }

      // Parse the successful response
      const responseData = await response.json();

      if (!responseData) {
        throw new Error('No data received from server');
      }

      // Check if component is still mounted before setting state
      if (checkMounted && !checkMounted()) {
        console.log('Component unmounted, not setting service eligibility state');
        return;
      }

      console.log('Service eligibility loaded successfully:', {
        businessId: responseData.business_id,
        categoriesCount: responseData.approved_categories?.length || 0,
        subcategoriesCount: responseData.approved_subcategories?.length || 0,
        debug: responseData._debug
      });

      // Ensure required fields exist with defaults
      const normalizedData = {
        business_id: responseData.business_id || business.id,
        approved_categories: responseData.approved_categories || [],
        approved_subcategories: responseData.approved_subcategories || [],
        subcategories_by_category: responseData.subcategories_by_category || {},
        stats: {
          total_categories: 0,
          total_subcategories: 0,
          categories_with_subcategories: 0,
          available_services_count: 0,
          last_updated: null,
          ...responseData.stats
        },
        last_fetched: responseData.last_fetched || new Date().toISOString()
      };

      setServiceEligibility(normalizedData);

    } catch (error) {
      console.error('Error loading service eligibility:', error);

      // Check if component is still mounted before setting error state
      if (checkMounted && !checkMounted()) {
        console.log('Component unmounted, not setting error state');
        return;
      }

      const errorMessage = error instanceof Error ? error.message : 'Failed to load service eligibility';
      setEligibilityError(errorMessage);

      toast({
        title: "Error",
        description: "Failed to load service eligibility data.",
        variant: "destructive",
      });
    } finally {
      // Always set loading to false if component is still mounted
      if (!checkMounted || checkMounted()) {
        setEligibilityLoading(false);
      }
    }
  };

  // Load business documents
  const loadBusinessDocuments = async () => {
    if (!business?.id) return;

    try {
      setDocumentsLoading(true);
      const { data, error } = await supabase
        .from('business_documents')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading business documents:', error);
        toast({
          title: "Error",
          description: "Failed to load business documents.",
          variant: "destructive",
        });
        return;
      }

      setBusinessDocuments(data || []);
    } catch (error) {
      console.error('Error loading business documents:', error);
      toast({
        title: "Error",
        description: "Failed to load business documents.",
        variant: "destructive",
      });
    } finally {
      setDocumentsLoading(false);
    }
  };

  // Load business data
  const loadBusinessData = async () => {
    if (!business) return;

    const defaultHours = {
      monday: { open: "09:00", close: "17:00", closed: false },
      tuesday: { open: "09:00", close: "17:00", closed: false },
      wednesday: { open: "09:00", close: "17:00", closed: false },
      thursday: { open: "09:00", close: "17:00", closed: false },
      friday: { open: "09:00", close: "17:00", closed: false },
      saturday: { open: "10:00", close: "15:00", closed: false },
      sunday: { open: "10:00", close: "15:00", closed: true },
    };

    try {
      setLoading(true);
      
      // Fetch business hours from API for proper format transformation
      let businessHours = defaultHours;
      try {
        const hoursResponse = await fetch(`/api/business/hours?business_id=${business.id}`);
        if (hoursResponse.ok) {
          const hoursData = await hoursResponse.json();
          if (hoursData.business_hours) {
            businessHours = hoursData.business_hours;
          }
        }
      } catch (hoursError) {
        console.warn('Failed to fetch business hours from API, using defaults:', hoursError);
      }
      
      setBusinessData({
        business_name: business.business_name || "",
        business_type: business.business_type || "independent",
        contact_email: business.contact_email || "",
        phone: business.phone || "",
        website_url: business.website_url || "",
        business_description: business.business_description || "",
        logo_url: business.logo_url || "",
        cover_image_url: business.cover_image_url || "",
        business_hours: businessHours,
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
      
      // Update business profile (excluding business_hours)
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
        })
        .eq('id', business.id);

      if (error) throw error;

      // Save business hours using dedicated API endpoint for proper format transformation
      const hoursResponse = await fetch('/api/business/hours', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_id: business.id,
          business_hours: businessData.business_hours,
        }),
      });

      if (!hoursResponse.ok) {
        const errorData = await hoursResponse.json();
        console.error("Error updating business hours:", errorData);
        toast({
          title: "Warning",
          description: "Business settings updated, but failed to update hours. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Business Updated",
        description: "Your business settings have been updated successfully.",
      });
      setIsEditing(false);
      
      // Reload the page to reflect changes
      setTimeout(() => {
        window.location.reload();
      }, 1000);
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
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${business.id}-${Date.now()}.${fileExt}`;
      const filePath = `business-logo/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('roam-file-storage')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('roam-file-storage')
        .getPublicUrl(filePath);

      // Save the logo URL to the database
      const { error: updateError } = await supabase
        .from('business_profiles')
        .update({ logo_url: publicUrl })
        .eq('id', business.id);

      if (updateError) throw updateError;

      setBusinessData(prev => ({ ...prev, logo_url: publicUrl }));

      toast({
        title: "Success",
        description: "Logo uploaded and saved successfully.",
      });
      
      // Reload the page to reflect changes
      setTimeout(() => {
        window.location.reload();
      }, 1000);
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
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${business.id}-${Date.now()}.${fileExt}`;
      const filePath = `business-cover-image/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('roam-file-storage')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('roam-file-storage')
        .getPublicUrl(filePath);

      // Save the cover image URL to the database
      const { error: updateError } = await supabase
        .from('business_profiles')
        .update({ cover_image_url: publicUrl })
        .eq('id', business.id);

      if (updateError) throw updateError;

      setBusinessData(prev => ({ ...prev, cover_image_url: publicUrl }));

      toast({
        title: "Success",
        description: "Cover photo uploaded and saved successfully.",
      });
      
      // Reload the page to reflect changes
      setTimeout(() => {
        window.location.reload();
      }, 1000);
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
      // Geocode the address to get lat/long
      let latitude: number | null = locationForm.latitude ? parseFloat(locationForm.latitude) : null;
      let longitude: number | null = locationForm.longitude ? parseFloat(locationForm.longitude) : null;
      
      // If no coordinates provided, try to geocode
      if (!latitude || !longitude) {
        const coordinates = await geocodeAddress({
          address_line1: locationForm.address_line1,
          address_line2: locationForm.address_line2,
          city: locationForm.city,
          state: locationForm.state,
          postal_code: locationForm.postal_code,
          country: locationForm.country,
        });
        
        if (coordinates) {
          latitude = coordinates.latitude;
          longitude = coordinates.longitude;
        }
      }

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
          latitude,
          longitude,
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
      // Geocode the address to get lat/long
      let latitude: number | null = locationForm.latitude ? parseFloat(locationForm.latitude) : null;
      let longitude: number | null = locationForm.longitude ? parseFloat(locationForm.longitude) : null;
      
      // If no coordinates provided, try to geocode
      if (!latitude || !longitude) {
        const coordinates = await geocodeAddress({
          address_line1: locationForm.address_line1,
          address_line2: locationForm.address_line2,
          city: locationForm.city,
          state: locationForm.state,
          postal_code: locationForm.postal_code,
          country: locationForm.country,
        });
        
        if (coordinates) {
          latitude = coordinates.latitude;
          longitude = coordinates.longitude;
        }
      }

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
          latitude,
          longitude,
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

  // Handle document upload submission
  const handleDocumentUpload = async () => {
    try {
      toast({
        title: "Documents Updated",
        description: "Your business documents have been updated successfully.",
      });
      setShowDocumentUploadModal(false);
      // Reload documents after upload
      await loadBusinessDocuments();
    } catch (error) {
      console.error('Error updating documents:', error);
      toast({
        title: "Error",
        description: "Failed to update documents. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleViewDocument = (document: any) => {
    window.open(document.file_url, '_blank');
  };

  const getDocumentTypeLabel = (documentType: string) => {
    const labels: { [key: string]: string } = {
      drivers_license: 'Driver\'s License',
      proof_of_address: 'Proof of Address',
      liability_insurance: 'Liability Insurance',
      professional_license: 'Professional License',
      professional_certificate: 'Professional Certificate',
      business_license: 'Business License'
    };
    return labels[documentType] || documentType;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: { [key: string]: { color: string; label: string } } = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      verified: { color: 'bg-green-100 text-green-800', label: 'Verified' },
      rejected: { color: 'bg-red-100 text-red-800', label: 'Rejected' },
      under_review: { color: 'bg-blue-100 text-blue-800', label: 'Under Review' }
    };
    return statusConfig[status] || { color: 'bg-gray-100 text-gray-800', label: 'Unknown' };
  };

  // Generate business share URL
  const getBusinessShareUrl = () => {
    if (!business?.id) return "";
    // This should point to the customer app where customers can view services and book
    // In production, this would be the actual customer app domain
    const customerAppUrl = import.meta.env.VITE_CUSTOMER_APP_URL || 
      window.location.origin.replace('5179', '5174') || 
      'http://localhost:5174';
    return `${customerAppUrl}/business/${business.id}`;
  };

  useEffect(() => {
    let mounted = true;
    const checkMounted = () => mounted;

    const loadData = async () => {
      if (!mounted) return;

      // Load business data first
      await loadBusinessData();

      if (!mounted) return;
      await loadBusinessLocations();

      if (!mounted) return;
      await loadBusinessDocuments();

      if (!mounted) return;
      await loadServiceEligibility(checkMounted);
    };

    if (business?.id) {
      loadData();
    }

    return () => {
      mounted = false;
    };
  }, [business?.id]); // Changed dependency to business?.id instead of entire business object

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
          {/* Cover Photo with Position Controls */}
          <CoverImageEditor
            imageUrl={businessData.cover_image_url}
            imagePosition={coverImagePosition}
            onPositionChange={async (pos) => {
              setCoverImagePosition(pos);
              // Save to database
              if (business?.id) {
                try {
                  await supabase
                    .from("business_profiles")
                    .update({ cover_image_position: pos })
                    .eq("id", business.id);
                } catch (err) {
                  console.error("Error saving cover position:", err);
                }
              }
            }}
            onFileSelect={(file) => handleCoverUpload(file)}
            onRemove={() => setBusinessData({...businessData, cover_image_url: ""})}
            uploading={coverUploading}
            label="Cover Photo"
            helpText="Recommended size: 1200x400px • Use arrows to adjust position"
            height="h-44 sm:h-56 lg:h-64"
          />

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
                  type="text"
                  value={businessData.website_url}
                  onChange={(e) => setBusinessData({...businessData, website_url: e.target.value})}
                  disabled={!isEditing}
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
              value={businessData.business_description}
              onChange={(e) => setBusinessData({...businessData, business_description: e.target.value})}
              disabled={!isEditing}
              placeholder="Describe your business, services, and what makes you unique..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Approved Service Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Tags className="w-5 h-5 mr-2" />
            Approved Service Categories
          </CardTitle>
          <p className="text-sm text-gray-600">
            Service categories and subcategories approved by platform administration for your business
          </p>
        </CardHeader>
        <CardContent>
          {eligibilityLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading service eligibility...</p>
            </div>
          ) : eligibilityError ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Info className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Service Categories</h3>
              <p className="text-gray-600 mb-4">{eligibilityError}</p>
              <Button variant="outline" onClick={() => loadServiceEligibility()}>
                Try Again
              </Button>
            </div>
          ) : !serviceEligibility || (serviceEligibility.approved_categories.length === 0 && serviceEligibility.approved_subcategories.length === 0) ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Tags className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Service Categories Approved</h3>
              <p className="text-gray-600 mb-4">
                Your business doesn't have any approved service categories yet. Contact platform administration to get approved for specific service categories.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">What are service categories?</p>
                    <p>Service categories determine which types of services you can offer to customers. Each category contains specific subcategories that define the exact services available to your business.</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Tags className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-blue-600 font-medium">Categories</p>
                      <p className="text-2xl font-bold text-blue-900">{serviceEligibility.stats.total_categories}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-green-600 font-medium">Subcategories</p>
                      <p className="text-2xl font-bold text-green-900">{serviceEligibility.stats.total_subcategories}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <Building className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-purple-600 font-medium">Available Services</p>
                      <p className="text-2xl font-bold text-purple-900">{serviceEligibility.stats.available_services_count}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Last Updated Info */}
              {serviceEligibility.stats.last_updated && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Last updated: {new Date(serviceEligibility.stats.last_updated).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              )}

              {/* Categories and Subcategories */}
              <div className="space-y-4">
                {Object.entries(serviceEligibility.subcategories_by_category || {}).map(([categoryId, subcats]: [string, any[]]) => {
                  const category = subcats?.[0]?.service_categories;
                  const derivedFromSubcategory = subcats?.[0]?.service_subcategories?.service_categories;
                  const categoryItem = { id: categoryId, service_categories: category } as any;
                  // category derived above
                  const approvedCategory = serviceEligibility.approved_categories.find((c: any) => c?.service_categories?.id === categoryId)?.service_categories;
                  const displayCategory = category || derivedFromSubcategory || approvedCategory || null;

                  const subcategoriesForThisCategory = subcats || [];

                  return (
                    <div key={categoryItem.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Category Header */}
                      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-gray-900 text-lg">
                              {displayCategory?.description || displayCategory?.service_category_type || 'Category'}
                            </h4>
                            {displayCategory?.description && (
                              <p className="text-sm text-gray-600 mt-1">{displayCategory.description}</p>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                              Approved
                            </span>
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                              {subcategoriesForThisCategory.length} subcategories
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Subcategories */}
                      {subcategoriesForThisCategory.length > 0 && (
                        <div className="p-4">
                          <h5 className="text-sm font-medium text-gray-700 mb-3">Approved Subcategories:</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {subcategoriesForThisCategory.map((subcategoryItem) => {
                              const subcategory = subcategoryItem.service_subcategories;
                              if (!subcategory) return null;

                              return (
                                <div
                                  key={subcategoryItem.id}
                                  className="bg-white border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <h6 className="font-medium text-gray-900 text-sm">
                                        {subcategory.description || subcategory.service_subcategory_type}
                                      </h6>
                                      {subcategory.description && (
                                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                          {subcategory.description}
                                        </p>
                                      )}
                                    </div>
                                    <CheckCircle className="w-4 h-4 text-green-600 ml-2 flex-shrink-0" />
                                  </div>
                                  <div className="text-xs text-gray-500 mt-2">
                                    Approved on {new Date(subcategoryItem.created_at).toLocaleDateString()}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* No Subcategories Message */}
                      {subcategoriesForThisCategory.length === 0 && (
                        <div className="p-4 text-center">
                          <p className="text-sm text-gray-500">
                            No specific subcategories approved for this category yet.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Additional Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Service Category Management</p>
                    <p>
                      These service categories are managed by platform administration. To request additional categories or subcategories,
                      please contact support. Only approved categories will allow you to add related services to your business offering.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
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

      {/* Business Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              Business Documents
            </div>
            <Button 
              onClick={() => setShowDocumentUploadModal(true)} 
              size="sm"
              variant="outline"
            >
              <Upload className="w-4 h-4 mr-2" />
              Update Documents
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {documentsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-roam-blue mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading documents...</p>
            </div>
          ) : businessDocuments.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Business Documents</h3>
              <p className="text-gray-600 mb-4">
                Upload and manage your business verification documents including licenses, 
                insurance certificates, and professional credentials.
              </p>
              <div className="space-y-2 text-sm text-gray-500">
                <p>• Professional licenses and certifications</p>
                <p>• Business registration documents</p>
                <p>��� Liability insurance certificates</p>
                <p>• Proof of address and identification</p>
              </div>
              <Button 
                onClick={() => setShowDocumentUploadModal(true)}
                className="mt-4"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Documents
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {businessDocuments.map((document) => (
                <div key={document.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-semibold text-gray-900">
                          {document.document_name}
                        </h4>
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadge(document.verification_status).color}`}>
                          {getStatusBadge(document.verification_status).label}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        <p><strong>Type:</strong> {getDocumentTypeLabel(document.document_type)}</p>
                        {document.file_size_bytes && (
                          <p><strong>Size:</strong> {(document.file_size_bytes / 1024 / 1024).toFixed(2)} MB</p>
                        )}
                        {document.expiry_date && (
                          <p><strong>Expires:</strong> {new Date(document.expiry_date).toLocaleDateString()}</p>
                        )}
                        {document.rejection_reason && (
                          <p className="text-red-600"><strong>Rejection Reason:</strong> {document.rejection_reason}</p>
                        )}
                        <p><strong>Uploaded:</strong> {new Date(document.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDocument(document)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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

      {/* Document Upload Modal */}
      {showDocumentUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Update Business Documents</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDocumentUploadModal(false)}
              >
                ×
              </Button>
            </div>
            
            <BusinessDocumentUploadForm
              businessId={business?.id || ""}
              existingDocuments={businessDocuments}
              onUploadComplete={handleDocumentUpload}
              onCancel={() => setShowDocumentUploadModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
