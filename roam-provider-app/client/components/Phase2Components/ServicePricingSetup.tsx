import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DollarSign,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Loader2,
  Info,
  Star,
  Clock,
  Users,
  Settings,
  Package,
  Car,
  Building,
  Video,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import ServicePriceModal from '@/components/ServicePriceModal';
import { getAuthHeaders } from '@/lib/api/authUtils';

interface EligibleService {
  id: string;
  name: string;
  description: string;
  min_price: number;
  duration_minutes: number;
  image_url?: string;
  is_active: boolean;
  subcategory_id: string;
  service_subcategories?: {
    service_subcategory_type: string;
    service_categories?: {
      service_category_type: string;
    };
  };
  is_configured?: boolean;
  business_price?: number;
  delivery_type?: string;
}

interface BusinessService {
  id: string;
  business_id: string;
  service_id: string;
  business_price: number;
  is_active: boolean;
  delivery_type?: string;
}

interface EligibleAddon {
  id: string;
  name: string;
  description: string;
  image_url?: string;
  is_active: boolean;
  custom_price?: number | null;
}

interface BusinessAddon {
  id: string;
  business_id: string;
  addon_id: string;
  custom_price: number | null;
  is_available: boolean;
}

interface ServiceAddon {
  id: string;
  name: string;
  description: string;
  price: number;
  isActive: boolean;
  compatible_service_id?: string;
  compatible_service_name?: string;
}

interface ServicePricingData {
  business_services: BusinessService[];
  business_addons: BusinessAddon[];
  eligible_services: EligibleService[];
  eligible_addons: EligibleAddon[];
  service_addon_map: Record<string, string[]>;
  pricingModel: 'fixed'; // Fixed to 'fixed' only
  currency: 'USD'; // Fixed to 'USD' only
  taxRate: number;
}

interface ServicePricingSetupProps {
  businessId: string;
  userId: string;
  onComplete: (data: ServicePricingData) => void;
  onBack?: () => void;
  initialData?: ServicePricingData;
  className?: string;
}

// Platform defaults - no longer configurable
const PLATFORM_PRICING_MODEL = 'fixed';
const PLATFORM_CURRENCY = 'USD';

export default function ServicePricingSetup({
  businessId,
  userId,
  onComplete,
  onBack,
  initialData,
  className = ""
}: ServicePricingSetupProps) {
  const [pricingData, setPricingData] = useState<ServicePricingData>(
    initialData || {
      business_services: [],
      business_addons: [],
      eligible_services: [],
      eligible_addons: [],
      service_addon_map: {},
      pricingModel: PLATFORM_PRICING_MODEL,
      currency: PLATFORM_CURRENCY,
      taxRate: 0,
    }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [selectedServiceForPricing, setSelectedServiceForPricing] = useState<EligibleService | null>(null);
  const [businessType, setBusinessType] = useState<string | null>(null);
  const [ownerAlsoProvider, setOwnerAlsoProvider] = useState<boolean>(false);

  const updatePricingData = (field: keyof ServicePricingData, value: any) => {
    setPricingData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Helper function to get delivery type icon and label
  const getDeliveryTypeInfo = (deliveryType: string) => {
    switch (deliveryType) {
      case 'business_location':
        return { icon: Building, label: 'Business', color: 'text-blue-600' };
      case 'customer_location':
        return { icon: Car, label: 'Mobile', color: 'text-green-600' };
      case 'virtual':
        return { icon: Video, label: 'Virtual', color: 'text-purple-600' };
      case 'both_locations':
        return { icon: RefreshCw, label: 'Both', color: 'text-orange-600' };
      default:
        return { icon: Car, label: 'Unknown', color: 'text-gray-600' };
    }
  };

  // Fetch eligible services and addons for the business
  const fetchEligibleServices = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use cached auth headers (much faster - no Supabase call needed)
      const headers = await getAuthHeaders();

      // Use the same API endpoint as ServicesTab.tsx
      const response = await fetch(`/api/business-eligible-services?business_id=${businessId}`, { headers });

      if (!response.ok) {
        throw new Error(`Failed to fetch eligible services: ${response.statusText}`);
      }

      const { eligible_services, eligible_addons } = await response.json();
      console.log('Eligible services data:', { eligible_services, eligible_addons });

      // Get current business services and addons
      const { data: currentBusinessServices } = await supabase
        .from('business_services')
        .select('*')
        .eq('business_id', businessId);

      const { data: currentBusinessAddons } = await supabase
        .from('business_addons')
        .select('*')
        .eq('business_id', businessId);

      // Update pricing data with fetched information
      setPricingData(prev => ({
        ...prev,
        eligible_services: eligible_services || [],
        eligible_addons: eligible_addons || [],
        service_addon_map: {}, // Initialize empty for now
        business_services: currentBusinessServices || [],
        business_addons: currentBusinessAddons || [],
      }));

    } catch (error) {
      console.error('Error fetching eligible services:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch eligible services');
    } finally {
      setLoading(false);
    }
  };

  // Load eligible services on component mount
  useEffect(() => {
    fetchEligibleServices();
  }, [businessId]);

  // Load business type (used for auto-assign logic + messaging)
  useEffect(() => {
    const loadBusinessType = async () => {
      try {
        const { data, error } = await supabase
          .from("business_profiles")
          .select("business_type")
          .eq("id", businessId)
          .single();

        if (!error) {
          setBusinessType(data?.business_type || null);
        }
      } catch {
        // non-fatal
      }
    };

    loadBusinessType();
  }, [businessId]);

  // Open price modal for a service
  const openPriceModal = (eligibleService: EligibleService) => {
    setSelectedServiceForPricing(eligibleService);
    setShowPriceModal(true);
  };

  // Handle price confirmation from modal
  const handlePriceConfirm = async (businessPrice: number, deliveryType: string) => {
    if (!selectedServiceForPricing) return;

    try {
      setLoading(true);
      setError(null);

      // Use the same API endpoint as ServicesTab.tsx
      const response = await fetch('/api/business/services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_id: businessId,
          service_id: selectedServiceForPricing.id,
          business_price: businessPrice,
          delivery_type: deliveryType,
          is_active: true,
          // Non-independent: if owner chooses they also provide services, auto-assign services to them
          assign_to_owner_provider: businessType !== 'independent' && ownerAlsoProvider,
          owner_user_id: userId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add service');
      }

      const { service } = await response.json();

      // Update local state with the new service
      setPricingData(prev => ({
        ...prev,
        business_services: [...prev.business_services, service]
      }));
      
      setSelectedServiceForPricing(null);

    } catch (error) {
      console.error('Error adding business service:', error);
      setError(error instanceof Error ? error.message : 'Failed to add service');
    } finally {
      setLoading(false);
    }
  };

  // Legacy function for backward compatibility
  const addBusinessService = async (serviceId: string, businessPrice: number, deliveryType: string = 'customer_location') => {
    try {
      const { data, error } = await supabase
        .from('business_services')
        .insert({
          business_id: businessId,
          service_id: serviceId,
          business_price: businessPrice,
          is_active: true,
          delivery_type: deliveryType
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setPricingData(prev => ({
        ...prev,
        business_services: [...prev.business_services, data]
      }));

      return data;
    } catch (error) {
      console.error('Error adding business service:', error);
      setError(error instanceof Error ? error.message : 'Failed to add service');
      throw error;
    }
  };

  // Update a business service
  const updateBusinessService = async (serviceId: string, updates: Partial<BusinessService>) => {
    try {
      const { data, error } = await supabase
        .from('business_services')
        .update(updates)
        .eq('business_id', businessId)
        .eq('service_id', serviceId)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setPricingData(prev => ({
        ...prev,
        business_services: prev.business_services.map(bs => 
          bs.service_id === serviceId ? { ...bs, ...updates } : bs
        )
      }));

      return data;
    } catch (error) {
      console.error('Error updating business service:', error);
      setError(error instanceof Error ? error.message : 'Failed to update service');
      throw error;
    }
  };

  // Remove a business service
  const removeBusinessService = async (serviceId: string) => {
    try {
      const { error } = await supabase
        .from('business_services')
        .delete()
        .eq('business_id', businessId)
        .eq('service_id', serviceId);

      if (error) throw error;

      // Update local state
      setPricingData(prev => ({
        ...prev,
        business_services: prev.business_services.filter(bs => bs.service_id !== serviceId)
      }));
    } catch (error) {
      console.error('Error removing business service:', error);
      setError(error instanceof Error ? error.message : 'Failed to remove service');
      throw error;
    }
  };

  // Open addon price modal
  const openAddonPriceModal = (eligibleAddon: EligibleAddon) => {
    setSelectedAddonForPricing(eligibleAddon);
    setShowAddonPriceModal(true);
  };

  // Handle addon price confirmation from modal
  const handleAddonPriceConfirm = async (customPrice: number | null) => {
    if (!selectedAddonForPricing) return;

    try {
      setLoading(true);
      setError(null);

      // Use the new API endpoint
      const response = await fetch('/api/business/addons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_id: businessId,
          addon_id: selectedAddonForPricing.id,
          custom_price: customPrice,
          is_available: true
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add addon');
      }

      const { addon } = await response.json();

      // Update local state with the new addon
      setPricingData(prev => ({
        ...prev,
        business_addons: [...prev.business_addons, addon]
      }));

      setSelectedAddonForPricing(null);
    } catch (error) {
      console.error('Error adding business addon:', error);
      setError(error instanceof Error ? error.message : 'Failed to add addon');
    } finally {
      setLoading(false);
    }
  };

  // Legacy function for backward compatibility
  const addBusinessAddon = async (addonId: string, customPrice: number | null = null) => {
    try {
      const { data, error } = await supabase
        .from('business_addons')
        .insert({
          business_id: businessId,
          addon_id: addonId,
          custom_price: customPrice,
          is_available: true
        })
        .select()
        .single();

      if (error) throw error;

      // For independent businesses, auto-assign addon to owner
      const { data: businessProfile } = await supabase
        .from('business_profiles')
        .select('business_type')
        .eq('id', businessId)
        .single();

      if (businessProfile?.business_type === 'independent') {
        // Find the owner provider
        const { data: ownerProvider } = await supabase
          .from('providers')
          .select('id')
          .eq('business_id', businessId)
          .eq('provider_role', 'owner')
          .eq('is_active', true)
          .maybeSingle();

        if (ownerProvider) {
          // Auto-assign addon to owner
          const { error: assignError } = await supabase
            .from('provider_addons')
            .upsert({
              provider_id: ownerProvider.id,
              addon_id: addonId,
              is_active: true
            }, {
              onConflict: 'provider_id,addon_id',
              ignoreDuplicates: false
            });

          if (assignError) {
            console.error('Error auto-assigning addon to owner:', assignError);
          } else {
            console.log(`Auto-assigned addon ${addonId} to owner ${ownerProvider.id} for independent business`);
          }
        }
      }

      // Update local state
      setPricingData(prev => ({
        ...prev,
        business_addons: [...prev.business_addons, data]
      }));

      return data;
    } catch (error) {
      console.error('Error adding business addon:', error);
      setError(error instanceof Error ? error.message : 'Failed to add addon');
      throw error;
    }
  };

  // Update a business addon
  const updateBusinessAddon = async (addonId: string, updates: Partial<BusinessAddon>) => {
    try {
      const { data, error } = await supabase
        .from('business_addons')
        .update(updates)
        .eq('business_id', businessId)
        .eq('addon_id', addonId)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setPricingData(prev => ({
        ...prev,
        business_addons: prev.business_addons.map(ba => 
          ba.addon_id === addonId ? { ...ba, ...updates } : ba
        )
      }));

      return data;
    } catch (error) {
      console.error('Error updating business addon:', error);
      setError(error instanceof Error ? error.message : 'Failed to update addon');
      throw error;
    }
  };

  // Remove a business addon
  const removeBusinessAddon = async (addonId: string) => {
    try {
      const { error } = await supabase
        .from('business_addons')
        .delete()
        .eq('business_id', businessId)
        .eq('addon_id', addonId);

      if (error) throw error;

      // Update local state
      setPricingData(prev => ({
        ...prev,
        business_addons: prev.business_addons.filter(ba => ba.addon_id !== addonId)
      }));
    } catch (error) {
      console.error('Error removing business addon:', error);
      setError(error instanceof Error ? error.message : 'Failed to remove addon');
      throw error;
    }
  };

  const completionPercentage = () => {
    let completed = 0;
    const total = 2; // tax rate, at least one service (pricing model and currency are fixed)

    if (pricingData.taxRate >= 0) completed++;
    if (pricingData.business_services.length > 0) completed++;

    return Math.round((completed / total) * 100);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Save service pricing data to database
      const response = await fetch('/api/onboarding/save-phase2-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_id: businessId,
          step: 'service_pricing',
          data: pricingData
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save service pricing data');
      }

      // Call the onComplete callback
      onComplete(pricingData);
    } catch (error) {
      console.error('Error saving service pricing data:', error);
      setError(error instanceof Error ? error.message : 'Failed to save service pricing data');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = () => {
    return completionPercentage() === 100;
  };

  return (
    <div className={`max-w-6xl mx-auto ${className}`}>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-roam-blue to-blue-600 rounded-full flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl text-roam-blue">
                Service Pricing
              </CardTitle>
              <p className="text-foreground/70">
                Configure your eligible services with custom pricing
              </p>
            </div>
          </div>

          {/* Information Alerts */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Tip #1:</strong> Services are based on your business qualifications. 
              You can adjust pricing and availability anytime from your dashboard.
            </AlertDescription>
          </Alert>

          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Tip #2:</strong> Don't see a service you provide? You can request the ROAM team 
              to add it after completing onboarding, and it will become available for you to choose.
            </AlertDescription>
          </Alert>

          {/* Owner service assignment */}
          {businessType === "independent" && (
            <Alert className="border-emerald-200 bg-emerald-50">
              <CheckCircle className="h-4 w-4 text-emerald-700" />
              <AlertDescription className="text-emerald-800">
                <strong>Independent business:</strong> Every service you add here will automatically be assigned to you (since you’re the only provider).
              </AlertDescription>
            </Alert>
          )}

          {businessType && businessType !== "independent" && (
            <div className="rounded-lg border p-4 bg-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Will you also provide services (not just be the owner)?
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    If yes, we’ll auto-assign the services you add here to your staff profile. You can adjust later in <span className="font-medium">Business Settings → Staff</span>.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-gray-600">No</Label>
                  <Switch checked={ownerAlsoProvider} onCheckedChange={setOwnerAlsoProvider} />
                  <Label className="text-sm text-gray-600">Yes</Label>
                </div>
              </div>

              {ownerAlsoProvider && (
                <Alert className="border-blue-200 bg-blue-50 mt-3">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    We’ll assign your selected business services to you now. You can refine your personal service list later in <strong>Business Settings → Staff</strong>.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Setup Progress</span>
              <span>{completionPercentage()}% Complete</span>
            </div>
            <Progress value={completionPercentage()} className="w-full" />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {loading && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Loading eligible services and addons...
              </AlertDescription>
            </Alert>
          )}



          {/* Available Services */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">Available Services</Label>
              <Badge variant="outline" className="text-sm">
                {pricingData.business_services.length} Configured
              </Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {pricingData.eligible_services.map((eligibleService) => {
                const businessService = pricingData.business_services.find(bs => bs.service_id === eligibleService.id);
                const isConfigured = !!businessService;
                
                return (
                  <Card key={eligibleService.id} className={`p-4 ${isConfigured ? 'border-green-200 bg-green-50/30' : 'border-dashed'}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h4 className="font-semibold">{eligibleService.name}</h4>
                          {isConfigured ? (
                            <Badge className="bg-green-600 hover:bg-green-600 text-white">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Added
                            </Badge>
                          ) : (
                            <Badge variant="outline">Available</Badge>
                          )}
                        </div>
                        <p className="text-gray-600 mb-2 text-sm">{eligibleService.description}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                          {isConfigured && businessService ? (
                            <>
                              <span className="flex items-center gap-1 font-medium text-green-700">
                                <DollarSign className="w-4 h-4" />
                                ${businessService.business_price}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {eligibleService.duration_minutes} min
                              </span>
                              {businessService.delivery_type && (() => {
                                const deliveryInfo = getDeliveryTypeInfo(businessService.delivery_type);
                                const DeliveryIcon = deliveryInfo.icon;
                                return (
                                  <span className={`flex items-center gap-1 font-medium ${deliveryInfo.color}`}>
                                    <DeliveryIcon className="w-4 h-4" />
                                    {deliveryInfo.label}
                                  </span>
                                );
                              })()}
                            </>
                          ) : (
                            <>
                              <span className="flex items-center gap-1">
                                <DollarSign className="w-4 h-4" />
                                ${eligibleService.min_price} (min)
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {eligibleService.duration_minutes} min
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {isConfigured ? (
                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Create a service object with current price and delivery type for editing
                              const serviceWithCurrentData = {
                                ...eligibleService,
                                business_price: businessService?.business_price,
                                delivery_type: businessService?.delivery_type || 'business_location'
                              };
                              openPriceModal(serviceWithCurrentData);
                            }}
                            className="h-9"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeBusinessService(eligibleService.id)}
                            className="text-red-600 border-red-300 hover:bg-red-50 h-9"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => openPriceModal(eligibleService)}
                          className="bg-roam-blue hover:bg-roam-blue/90 flex-shrink-0 h-9"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-6">
            {onBack && (
              <Button variant="outline" onClick={onBack}>
                Back
              </Button>
            )}
            
            <Button
              onClick={handleSubmit}
              disabled={loading || !canSubmit()}
              className="bg-roam-blue hover:bg-roam-blue/90 ml-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Continue to Banking & Payouts
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Service Price Modal */}
      <ServicePriceModal
        isOpen={showPriceModal}
        onClose={() => {
          setShowPriceModal(false);
          setSelectedServiceForPricing(null);
        }}
        onConfirm={handlePriceConfirm}
        serviceName={selectedServiceForPricing?.name || ''}
        minPrice={selectedServiceForPricing?.min_price}
        currentPrice={selectedServiceForPricing?.business_price}
        currentDeliveryType={selectedServiceForPricing?.delivery_type}
        currency={pricingData.currency}
      />
    </div>
  );
}
