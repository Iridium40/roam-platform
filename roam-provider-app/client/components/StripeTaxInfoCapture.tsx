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
  contactName: string;
  contactEmail: string;
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
      contactName: '',
      contactEmail: '',
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
  const [hasExistingTaxInfo, setHasExistingTaxInfo] = useState(false);

  // Load existing tax info via API (uses service_role to bypass RLS)
  useEffect(() => {
    const loadTaxInfo = async () => {
      try {
        setLoading(true);
        
        // Load tax info via API endpoint (uses service_role)
        const res = await fetch(`/api/business/tax-info?business_id=${businessId}`);
        if (!res.ok) {
          if (res.status === 404 || res.status === 500) {
            // No tax info exists yet, that's okay
            return;
          }
          throw new Error(`Failed to load tax info: ${res.statusText}`);
        }

        const { tax_info: taxData } = await res.json();

        if (taxData) {
          setHasExistingTaxInfo(true);
          setTaxInfo({
            businessType: taxData.business_entity_type || 'llc',
            companyName: taxData.legal_business_name || '',
            contactName: taxData.tax_contact_name || '',
            contactEmail: taxData.tax_contact_email || '',
            // Tax ID is not returned for security reasons - user must re-enter it
            taxId: '',
            taxIdType: taxData.tax_id_type || 'EIN',
            address: {
              line1: taxData.tax_address_line1 || '',
              line2: taxData.tax_address_line2 || '',
              city: taxData.tax_city || '',
              state: taxData.tax_state || '',
              postalCode: taxData.tax_postal_code || '',
              country: taxData.tax_country || 'US',
            },
            phone: taxData.tax_contact_phone || '',
            website: '', // Not in schema
            description: '', // Not in schema
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
    if (!taxInfo.contactName.trim()) {
      setError('Contact name is required');
      return false;
    }
    if (!taxInfo.contactEmail.trim()) {
      setError('Contact email is required');
      return false;
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(taxInfo.contactEmail)) {
      setError('Please enter a valid email address');
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

      // Convert tax_id_type to uppercase to match schema constraint ('EIN' or 'SSN')
      const taxIdTypeUpper = taxInfo.taxIdType.toUpperCase() === 'EIN' ? 'EIN' : 
                              taxInfo.taxIdType.toUpperCase() === 'SSN' ? 'SSN' : 
                              'EIN'; // Default to EIN

      // Ensure business_entity_type matches schema enum values exactly
      const businessEntityType = ['sole_proprietorship', 'partnership', 'llc', 'corporation', 'non_profit']
        .includes(taxInfo.businessType) ? taxInfo.businessType : 'llc';

      // Save via API endpoint (uses service_role to bypass RLS)
      const res = await fetch('/api/business/tax-info', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_id: businessId,
          business_entity_type: businessEntityType,
          legal_business_name: taxInfo.companyName,
          tax_contact_name: taxInfo.contactName,
          tax_contact_email: taxInfo.contactEmail,
          tax_id: taxInfo.taxId,
          tax_id_type: taxIdTypeUpper,
          tax_address_line1: taxInfo.address.line1,
          tax_address_line2: taxInfo.address.line2 || null,
          tax_city: taxInfo.address.city,
          tax_state: taxInfo.address.state,
          tax_postal_code: taxInfo.address.postalCode,
          tax_country: taxInfo.address.country || 'US',
          tax_contact_phone: taxInfo.phone || null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.details || `Failed to save tax info: ${res.statusText}`);
      }

      toast({
        title: "Tax Information Saved",
        description: "Your business and tax information has been saved successfully. You can now connect your Stripe account.",
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

          {/* Contact Name */}
          <div className="space-y-2">
            <Label htmlFor="contactName">Contact Name (Full Name) *</Label>
            <Input
              id="contactName"
              value={taxInfo.contactName}
              onChange={(e) => updateTaxInfo('contactName', e.target.value)}
              placeholder="John Doe"
              required
            />
            <p className="text-sm text-muted-foreground">
              Legal name of the primary contact for tax and business correspondence
            </p>
          </div>

          {/* Contact Email */}
          <div className="space-y-2">
            <Label htmlFor="contactEmail">Business Contact Email *</Label>
            <Input
              id="contactEmail"
              type="email"
              value={taxInfo.contactEmail}
              onChange={(e) => updateTaxInfo('contactEmail', e.target.value)}
              placeholder="business@example.com"
              required
            />
            <p className="text-sm text-muted-foreground">
              This email will be used for Stripe Connect account setup and tax correspondence
            </p>
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
                className={hasExistingTaxInfo && !taxInfo.taxId.trim() ? 'border-red-500' : ''}
              />
              {hasExistingTaxInfo && !taxInfo.taxId.trim() && (
                <Alert className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    For security reasons, the Tax ID is not stored in a retrievable format. 
                    Please re-enter your Tax ID to save any changes.
                  </AlertDescription>
                </Alert>
              )}
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
                <Select
                  value={taxInfo.address.state}
                  onValueChange={(value) => updateAddress('state', value)}
                >
                  <SelectTrigger id="state">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AL">Alabama</SelectItem>
                    <SelectItem value="AK">Alaska</SelectItem>
                    <SelectItem value="AZ">Arizona</SelectItem>
                    <SelectItem value="AR">Arkansas</SelectItem>
                    <SelectItem value="CA">California</SelectItem>
                    <SelectItem value="CO">Colorado</SelectItem>
                    <SelectItem value="CT">Connecticut</SelectItem>
                    <SelectItem value="DE">Delaware</SelectItem>
                    <SelectItem value="FL">Florida</SelectItem>
                    <SelectItem value="GA">Georgia</SelectItem>
                    <SelectItem value="HI">Hawaii</SelectItem>
                    <SelectItem value="ID">Idaho</SelectItem>
                    <SelectItem value="IL">Illinois</SelectItem>
                    <SelectItem value="IN">Indiana</SelectItem>
                    <SelectItem value="IA">Iowa</SelectItem>
                    <SelectItem value="KS">Kansas</SelectItem>
                    <SelectItem value="KY">Kentucky</SelectItem>
                    <SelectItem value="LA">Louisiana</SelectItem>
                    <SelectItem value="ME">Maine</SelectItem>
                    <SelectItem value="MD">Maryland</SelectItem>
                    <SelectItem value="MA">Massachusetts</SelectItem>
                    <SelectItem value="MI">Michigan</SelectItem>
                    <SelectItem value="MN">Minnesota</SelectItem>
                    <SelectItem value="MS">Mississippi</SelectItem>
                    <SelectItem value="MO">Missouri</SelectItem>
                    <SelectItem value="MT">Montana</SelectItem>
                    <SelectItem value="NE">Nebraska</SelectItem>
                    <SelectItem value="NV">Nevada</SelectItem>
                    <SelectItem value="NH">New Hampshire</SelectItem>
                    <SelectItem value="NJ">New Jersey</SelectItem>
                    <SelectItem value="NM">New Mexico</SelectItem>
                    <SelectItem value="NY">New York</SelectItem>
                    <SelectItem value="NC">North Carolina</SelectItem>
                    <SelectItem value="ND">North Dakota</SelectItem>
                    <SelectItem value="OH">Ohio</SelectItem>
                    <SelectItem value="OK">Oklahoma</SelectItem>
                    <SelectItem value="OR">Oregon</SelectItem>
                    <SelectItem value="PA">Pennsylvania</SelectItem>
                    <SelectItem value="RI">Rhode Island</SelectItem>
                    <SelectItem value="SC">South Carolina</SelectItem>
                    <SelectItem value="SD">South Dakota</SelectItem>
                    <SelectItem value="TN">Tennessee</SelectItem>
                    <SelectItem value="TX">Texas</SelectItem>
                    <SelectItem value="UT">Utah</SelectItem>
                    <SelectItem value="VT">Vermont</SelectItem>
                    <SelectItem value="VA">Virginia</SelectItem>
                    <SelectItem value="WA">Washington</SelectItem>
                    <SelectItem value="WV">West Virginia</SelectItem>
                    <SelectItem value="WI">Wisconsin</SelectItem>
                    <SelectItem value="WY">Wyoming</SelectItem>
                    <SelectItem value="DC">District of Columbia</SelectItem>
                  </SelectContent>
                </Select>
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
          disabled={saving || !taxInfo.taxId.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
