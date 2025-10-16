import React, { useState } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Puzzle, CheckCircle2 } from 'lucide-react';
import { EligibleAddon } from '@/types/addons';

interface EditAddonModalProps {
  addon: EligibleAddon;
  onSave: (data: {
    addon_id: string;
    custom_price: string;
    is_available: boolean;
  }) => Promise<void>;
  onClose: () => void;
  loading: boolean;
}

export function EditAddonModal({
  addon,
  onSave,
  onClose,
  loading,
}: EditAddonModalProps) {
  const [customPrice, setCustomPrice] = useState<string>(
    addon.custom_price?.toString() || '0.00'
  );
  const [isAvailable, setIsAvailable] = useState<boolean>(
    addon.is_available ?? false
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    const price = parseFloat(customPrice);
    if (isNaN(price) || price <= 0) {
      setError('Price must be a valid positive number greater than 0');
      return;
    }

    // If trying to activate without a valid price, show error
    if (isAvailable && price <= 0) {
      setError('A price greater than $0 is required to activate this add-on');
      return;
    }

    try {
      setSaving(true);
      await onSave({
        addon_id: addon.id,
        custom_price: customPrice,
        is_available: isAvailable,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save addon');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {addon.is_configured ? 'Edit Add-on' : 'Configure Add-on'}
          </DialogTitle>
          <DialogDescription>
            Set your custom price and availability for {addon.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-4">
            {/* Addon Info */}
            <div className="rounded-lg border p-4 bg-muted/50">
              <div className="flex items-start space-x-3">
                {addon.image_url ? (
                  <img
                    src={addon.image_url}
                    alt={addon.name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                    <Puzzle className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <h4 className="font-medium">{addon.name}</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {addon.description}
                  </p>
                  {addon.compatible_service_count && addon.compatible_service_count > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {addon.compatible_service_count} compatible service{addon.compatible_service_count !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Custom Price */}
            <div className="space-y-2">
              <Label htmlFor="custom_price">
                Custom Price
                <span className="text-destructive ml-1">*</span>
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="custom_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  className="pl-9"
                  placeholder="0.00"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Set your custom pricing for this add-on
              </p>
            </div>

            {/* Available Status */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="is_available">Availability Status</Label>
                <p className="text-sm text-muted-foreground">
                  Make this add-on available to customers
                </p>
                {parseFloat(customPrice) <= 0 && (
                  <p className="text-xs text-destructive">
                    A price greater than $0 is required to activate
                  </p>
                )}
              </div>
              <Switch
                id="is_available"
                checked={isAvailable}
                onCheckedChange={setIsAvailable}
                disabled={parseFloat(customPrice) <= 0}
              />
            </div>

            {/* Info Box */}
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 p-3">
              <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                <strong>Note:</strong> This add-on will be available for selection with {addon.compatible_service_count || 0} of your active services.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || loading}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
