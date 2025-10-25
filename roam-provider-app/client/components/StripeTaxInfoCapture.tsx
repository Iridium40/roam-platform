import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Building2,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  Info,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface TaxInfoData {
  businessType: string;
  companyName: string;
  taxId: string;
  taxIdType: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  phone: string;
  website?: string;
  description?: string;
}

interface StripeTaxInfoCaptureProps {
  businessId: string;
  userId: string;
  onComplete: (data: TaxInfoData) => void;
  onBack?: () => void;
  initialData?: TaxInfoData;
  className?: string;
}

export default function StripeTaxInfoCapture({
  businessId,
  userId,
  onComplete,
  onBack,
  initialData,
  className = ""
}: StripeTaxInfoCaptureProps) {
  const { toast } = useToast();
  const [taxInfo, setTaxInfo] = useState<TaxInfoData>(
    initialData || {
      businessType: 'llc',
      companyName: '',
      taxId: '',
      taxIdType: 'ein',
      address: {
        line1: '',
        line2: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'US',
      },
      phone: '',
      website: '',
      description: '',
    }
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing tax info
  useEffect(() => {
    const loadTaxInfo = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('business_stripe_tax_info')
          .select('*')
          .eq('business_id', businessId)
          .single();

        if (data && !error) {
          setTaxInfo({
            businessType: data.business_type || 'llc',
            companyName: data.company_name || '',
            taxId: data.tax_id || '',
            taxIdType: data.tax_id_type || 'ein',
            address: {
              line1: data.address_line1 || '',
              line2: data.address_line2 || '',
              city: data.city || '',
              state: data.state || '',
              postalCode: data.postal_code || '',
              country: data.country || 'US',
            },
            phone: data.phone || '',
            website: data.website || '',
            description: data.description || '',
          });
        }
      } catch (error) {
        console.error('Error loading tax info:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTaxInfo();
  }, [businessId]);

  const updateTaxInfo = (field: keyof TaxInfoData, value: any) => {
    setTaxInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateAddress = (field: keyof TaxInfoData['address'], value: string) => {
    setTaxInfo(prev => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value
      }
    }));
  };

  const validateForm = () => {
    if (!taxInfo.companyName.trim()) {
      setError('Company name is required');
      return false;
    }
    if (!taxInfo.taxId.trim()) {
      setError('Tax ID is required');
      return false;
    }
    if (!taxInfo.address.line1.trim()) {
      setError('Address is required');
      return false;
    }
    if (!taxInfo.address.city.trim()) {
      setError('City is required');
      return false;
    }
    if (!taxInfo.address.state.trim()) {
      setError('State is required');
      return false;
    }
    if (!taxInfo.address.postalCode.trim()) {
      setError('Postal code is required');
      return false;
    }
    if (!taxInfo.phone.trim()) {
      setError('Phone number is required');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      setError(null);

      const { error } = await supabase
        .from('business_stripe_tax_info')
        .upsert({
          business_id: businessId,
          business_type: taxInfo.businessType,
          company_name: taxInfo.companyName,
          tax_id: taxInfo.taxId,
          tax_id_type: taxInfo.taxIdType,
          address_line1: taxInfo.address.line1,
          address_line2: taxInfo.address.line2,
          city: taxInfo.address.city,
          state: taxInfo.address.state,
          postal_code: taxInfo.address.postalCode,
          country: taxInfo.address.country,
          phone: taxInfo.phone,
          website: taxInfo.website,
          description: taxInfo.description,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: "Tax Information Saved",
        description: "Your business tax information has been saved successfully.",
      });

      onComplete(taxInfo);
    } catch (error) {
      console.error('Error saving tax info:', error);
      setError(error instanceof Error ? error.message : 'Failed to save tax information');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading tax information...</span>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Business Tax Information
          </CardTitle>
          <p className="text-sm text-gray-600">
            This information is required for Stripe Connect and tax compliance.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Business Type */}
          <div className="space-y-2">
            <Label htmlFor="businessType">Business Type</Label>
            <Select
              value={taxInfo.businessType}
              onValueChange={(value) => updateTaxInfo('businessType', value)}
            >
              <SelectTrigger id="businessType">
                <SelectValue placeholder="Select business type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individual/Sole Proprietor</SelectItem>
                <SelectItem value="llc">LLC</SelectItem>
                <SelectItem value="corporation">Corporation</SelectItem>
                <SelectItem value="partnership">Partnership</SelectItem>
                <SelectItem value="non_profit">Non-Profit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Company Name */}
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name *</Label>
            <Input
              id="companyName"
              value={taxInfo.companyName}
              onChange={(e) => updateTaxInfo('companyName', e.target.value)}
              placeholder="Enter your company name"
              required
            />
          </div>

          {/* Tax ID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="taxIdType">Tax ID Type</Label>
              <Select
                value={taxInfo.taxIdType}
                onValueChange={(value) => updateTaxInfo('taxIdType', value)}
              >
                <SelectTrigger id="taxIdType">
                  <SelectValue placeholder="Select tax ID type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ein">EIN (Employer Identification Number)</SelectItem>
                  <SelectItem value="ssn">SSN (Social Security Number)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxId">Tax ID *</Label>
              <Input
                id="taxId"
                value={taxInfo.taxId}
                onChange={(e) => updateTaxInfo('taxId', e.target.value)}
                placeholder={taxInfo.taxIdType === 'ein' ? 'XX-XXXXXXX' : 'XXX-XX-XXXX'}
                required
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Business Address</Label>
            
            <div className="space-y-2">
              <Label htmlFor="addressLine1">Address Line 1 *</Label>
              <Input
                id="addressLine1"
                value={taxInfo.address.line1}
                onChange={(e) => updateAddress('line1', e.target.value)}
                placeholder="Street address"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="addressLine2">Address Line 2</Label>
              <Input
                id="addressLine2"
                value={taxInfo.address.line2}
                onChange={(e) => updateAddress('line2', e.target.value)}
                placeholder="Apartment, suite, unit, etc. (optional)"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={taxInfo.address.city}
                  onChange={(e) => updateAddress('city', e.target.value)}
                  placeholder="City"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  value={taxInfo.address.state}
                  onChange={(e) => updateAddress('state', e.target.value)}
                  placeholder="State"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code *</Label>
                <Input
                  id="postalCode"
                  value={taxInfo.address.postalCode}
                  onChange={(e) => updateAddress('postalCode', e.target.value)}
                  placeholder="ZIP code"
                  required
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Contact Information</Label>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                value={taxInfo.phone}
                onChange={(e) => updateTaxInfo('phone', e.target.value)}
                placeholder="(XXX) XXX-XXXX"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website (Optional)</Label>
              <Input
                id="website"
                value={taxInfo.website}
                onChange={(e) => updateTaxInfo('website', e.target.value)}
                placeholder="https://your-website.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Business Description (Optional)</Label>
              <Input
                id="description"
                value={taxInfo.description}
                onChange={(e) => updateTaxInfo('description', e.target.value)}
                placeholder="Brief description of your business"
              />
            </div>
          </div>

          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              This information is used for Stripe Connect account creation and tax compliance. 
              All data is encrypted and securely stored.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between">
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
        )}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Save Tax Information
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
