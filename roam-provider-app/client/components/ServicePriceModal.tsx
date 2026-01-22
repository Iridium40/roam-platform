import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DollarSign, AlertCircle, Info, MapPin, Building2, Video, RefreshCw } from 'lucide-react';

interface ServicePriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (price: number, deliveryType: string) => void;
  serviceName: string;
  minPrice?: number;
  currentPrice?: number;
  currentDeliveryType?: string;
  currency?: string;
  pricingType?: 'fixed' | 'deposit'; // 'fixed' = min_price is minimum total, 'deposit' = min_price is deposit amount
}

export default function ServicePriceModal({
  isOpen,
  onClose,
  onConfirm,
  serviceName,
  minPrice = 0,
  currentPrice,
  currentDeliveryType,
  currency = 'USD',
  pricingType = 'fixed'
}: ServicePriceModalProps) {
  const isDepositService = pricingType === 'deposit';
  const [price, setPrice] = useState<string>(currentPrice?.toString() || '');
  const [deliveryType, setDeliveryType] = useState<string>(currentDeliveryType || '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPrice(currentPrice?.toString() || '');
      // Only use currentDeliveryType if editing, otherwise require user to select
      setDeliveryType(currentDeliveryType || '');
      setError(null);
    }
  }, [isOpen, currentPrice, currentDeliveryType]);

  const handlePriceChange = (value: string) => {
    // Allow only numbers and decimal point
    const sanitized = value.replace(/[^\d.]/g, '');
    
    // Prevent multiple decimal points
    const parts = sanitized.split('.');
    if (parts.length > 2) {
      return;
    }
    
    // Limit to 2 decimal places
    if (parts[1] && parts[1].length > 2) {
      return;
    }
    
    setPrice(sanitized);
    setError(null);
  };

  const handleConfirm = () => {
    const numPrice = parseFloat(price);
    
    if (!price || isNaN(numPrice)) {
      setError('Please enter a valid price');
      return;
    }
    
    if (numPrice < 0) {
      setError('Price cannot be negative');
      return;
    }
    
    if (minPrice && numPrice < minPrice) {
      setError(`Price must be at least $${minPrice}`);
      return;
    }
    
    if (numPrice > 999999) {
      setError('Price is too high. Maximum is $999,999');
      return;
    }
    
    if (!deliveryType) {
      setError('Please select a service location');
      return;
    }
    
    onConfirm(numPrice, deliveryType);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isDepositService ? 'bg-gradient-to-br from-amber-500 to-amber-600' : 'bg-gradient-to-br from-roam-blue to-blue-600'}`}>
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className={`text-xl ${isDepositService ? 'text-amber-700' : 'text-roam-blue'}`}>
                {isDepositService ? 'Set Deposit Price' : 'Set Service Price'}
              </DialogTitle>
              <DialogDescription className="text-foreground/70">
                {serviceName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Deposit Service Notice */}
          {isDepositService && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-amber-700 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-900">Deposit-Based Pricing</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Customers pay this deposit at booking. You collect the remaining balance at the time of service.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Price Input */}
          <div className="space-y-2">
            <Label htmlFor="price" className="text-base font-medium">
              {isDepositService ? 'Your Deposit Price' : 'Your Price'}
            </Label>
            <div className="relative">
              <DollarSign className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDepositService ? 'text-amber-600' : 'text-foreground/50'}`} />
              <Input
                id="price"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={price}
                onChange={(e) => handlePriceChange(e.target.value)}
                onKeyDown={handleKeyDown}
                className={`pl-10 text-lg font-semibold ${error ? 'border-red-500 focus-visible:ring-red-500' : isDepositService ? 'border-amber-300 focus-visible:ring-amber-500' : ''}`}
                autoFocus
              />
            </div>
            
            {/* Live Preview */}
            {price && !error && !isNaN(parseFloat(price)) && (
              <p className={`text-sm font-medium ${isDepositService ? 'text-amber-700' : 'text-roam-blue'}`}>
                {isDepositService ? 'Deposit: ' : 'Price: '}{formatCurrency(parseFloat(price))}
              </p>
            )}
          </div>

          {/* Delivery Type Selector */}
          <div className="space-y-2">
            <Label htmlFor="deliveryType" className="text-base font-medium">
              Service Location
            </Label>
            <Select value={deliveryType} onValueChange={setDeliveryType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select service location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="business_location">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-roam-blue" />
                    <div className="text-left">
                      <div className="font-medium">Business</div>
                      <div className="text-xs text-foreground/60">Customer comes to your location</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="customer_location">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-roam-blue" />
                    <div className="text-left">
                      <div className="font-medium">Customer</div>
                      <div className="text-xs text-foreground/60">Travel to customer's location</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="both_locations">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-roam-blue" />
                    <div className="text-left">
                      <div className="font-medium">Both</div>
                      <div className="text-xs text-foreground/60">Business and mobile options</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="virtual">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-roam-blue" />
                    <div className="text-left">
                      <div className="font-medium">Virtual</div>
                      <div className="text-xs text-foreground/60">Online/remote service</div>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Minimum Price / Deposit Info */}
          {minPrice > 0 && (
            <Alert className={isDepositService ? "border-amber-200 bg-amber-50" : "border-blue-200 bg-blue-50"}>
              <Info className={`h-4 w-4 ${isDepositService ? "text-amber-600" : "text-blue-600"}`} />
              <AlertDescription className={isDepositService ? "text-amber-800" : "text-blue-800"}>
                {isDepositService ? (
                  <>
                    <strong>Required Deposit:</strong> {formatCurrency(minPrice)}
                    <p className="text-xs mt-1">
                      This deposit amount will be collected at booking. Your price is the total service cost - the remaining balance will be collected via Add More Services.
                    </p>
                  </>
                ) : (
                  <>
                    <strong>Minimum price:</strong> {formatCurrency(minPrice)}
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Error Message */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Pricing Tips */}
          <div className="bg-accent/30 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-sm text-foreground/90">💡 Pricing Tips</h4>
            <ul className="text-sm text-foreground/70 space-y-1">
              <li>• Consider your experience and market rates</li>
              <li>• Include your costs and desired profit margin</li>
              <li>• You can adjust prices anytime after setup</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            className="flex-1 sm:flex-none bg-roam-blue hover:bg-roam-blue/90"
            disabled={!price || !deliveryType || !!error}
          >
            Confirm Price
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

