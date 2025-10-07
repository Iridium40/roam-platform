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
import { DollarSign, AlertCircle, Package } from 'lucide-react';

interface AddonPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (price: number | null) => void;
  addonName: string;
  currentPrice?: number | null;
  currency?: string;
}

export default function AddonPriceModal({
  isOpen,
  onClose,
  onConfirm,
  addonName,
  currentPrice,
  currency = 'USD'
}: AddonPriceModalProps) {
  const [price, setPrice] = useState<string>(currentPrice?.toString() || '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPrice(currentPrice?.toString() || '');
      setError(null);
    }
  }, [isOpen, currentPrice]);

  const handlePriceChange = (value: string) => {
    // Allow only numbers and decimal point
    const sanitized = value.replace(/[^\d.]/g, '');
    
    // Ensure only one decimal point
    const parts = sanitized.split('.');
    if (parts.length > 2) {
      return;
    }
    
    setPrice(sanitized);
    setError(null);
  };

  const handleConfirm = () => {
    // Require a price value
    if (!price || price.trim() === '') {
      setError('Please enter a price for this addon');
      return;
    }

    const numPrice = parseFloat(price);
    
    if (isNaN(numPrice)) {
      setError('Please enter a valid price');
      return;
    }
    
    if (numPrice < 0) {
      setError('Price cannot be negative');
      return;
    }
    
    if (numPrice > 999999) {
      setError('Price is too high. Maximum is $999,999');
      return;
    }
    
    onConfirm(numPrice);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-roam-blue/10">
              <Package className="h-6 w-6 text-roam-blue" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-2xl text-roam-blue mb-2">
                Set Addon Price
              </DialogTitle>
              <DialogDescription className="text-base">
                {addonName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Price Input */}
          <div className="space-y-2">
            <Label htmlFor="addon-price" className="text-base font-medium">
              Your Price
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/50" />
              <Input
                id="addon-price"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={price}
                onChange={(e) => handlePriceChange(e.target.value)}
                onKeyDown={handleKeyDown}
                className={`pl-10 text-lg font-semibold ${error ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                autoFocus
              />
            </div>
            
            {/* Live Preview */}
            {price && !error && !isNaN(parseFloat(price)) && (
              <p className="text-sm text-roam-blue font-medium">
                Price: {formatCurrency(parseFloat(price))}
              </p>
            )}
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            className="bg-roam-blue hover:bg-roam-blue/90"
          >
            Confirm Price
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

