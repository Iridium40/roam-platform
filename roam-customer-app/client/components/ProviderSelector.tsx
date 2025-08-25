import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Users,
  Star,
  Calendar,
  UserCheck,
  Shuffle,
  CheckCircle,
} from 'lucide-react';

interface Provider {
  id: string;
  first_name: string;
  last_name: string;
  bio?: string;
  experience_years?: number;
  specialties?: string[];
  image_url?: string;
  average_rating?: number;
  total_reviews?: number;
}

interface ProviderSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  providers: Provider[];
  serviceName: string;
  onConfirm: (selectedProviderId: string | null) => void;
  selectedProviderId?: string | null;
}

export function ProviderSelector({
  isOpen,
  onClose,
  providers,
  serviceName,
  onConfirm,
  selectedProviderId = null,
}: ProviderSelectorProps) {
  const [tempSelectedProvider, setTempSelectedProvider] = useState<string | null>(selectedProviderId);

  const handleConfirm = () => {
    onConfirm(tempSelectedProvider);
    onClose();
  };

  const handleCancel = () => {
    setTempSelectedProvider(selectedProviderId);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5" />
            Select Provider Preference
          </DialogTitle>
          <DialogDescription>
            Choose your preferred provider for <strong>{serviceName}</strong> or select "No Preference" 
            to let the business assign the best available provider.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <RadioGroup
            value={tempSelectedProvider || 'no-preference'}
            onValueChange={(value) => setTempSelectedProvider(value === 'no-preference' ? null : value)}
            className="space-y-3"
          >
            {/* No Preference Option */}
            <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
              <RadioGroupItem value="no-preference" id="no-preference" />
              <Label htmlFor="no-preference" className="flex items-center gap-3 cursor-pointer flex-1">
                <div className="w-12 h-12 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-full flex items-center justify-center">
                  <Shuffle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="font-semibold">No Preference</div>
                  <div className="text-sm text-foreground/60">
                    Let the business assign the best available provider
                  </div>
                </div>
              </Label>
            </div>

            {/* Provider Options */}
            {providers.map((provider) => (
              <div
                key={provider.id}
                className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <RadioGroupItem value={provider.id} id={provider.id} />
                <Label htmlFor={provider.id} className="flex items-center gap-4 cursor-pointer flex-1">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={provider.image_url || undefined} />
                    <AvatarFallback className="text-sm">
                      {provider.first_name[0]}{provider.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">
                          {provider.first_name} {provider.last_name}
                        </div>
                        {provider.bio && (
                          <div className="text-sm text-foreground/70 line-clamp-1 max-w-md">
                            {provider.bio}
                          </div>
                        )}
                      </div>
                      
                      <div className="text-right">
                        {provider.average_rating && (
                          <div className="flex items-center gap-1 mb-1">
                            <Star className="w-4 h-4 text-roam-warning fill-current" />
                            <span className="text-sm font-semibold">
                              {provider.average_rating}
                            </span>
                            <span className="text-xs text-foreground/60">
                              ({provider.total_reviews || 0})
                            </span>
                          </div>
                        )}
                        {provider.experience_years && (
                          <div className="text-xs text-foreground/60">
                            {provider.experience_years} years exp.
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {provider.specialties && provider.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {provider.specialties.slice(0, 3).map((specialty, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {specialty}
                          </Badge>
                        ))}
                        {provider.specialties.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{provider.specialties.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup>

          {providers.length === 0 && (
            <Card className="p-6 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="font-semibold mb-2">No Providers Available</h3>
              <p className="text-sm text-foreground/60">
                This business hasn't added any providers yet.
              </p>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} className="bg-roam-blue hover:bg-roam-blue/90">
            <CheckCircle className="w-4 h-4 mr-2" />
            Confirm Selection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Compact version for inline selection
interface ProviderSelectorInlineProps {
  providers: Provider[];
  selectedProviderId: string | null;
  onProviderSelect: (providerId: string | null) => void;
  className?: string;
}

export function ProviderSelectorInline({
  providers,
  selectedProviderId,
  onProviderSelect,
  className = '',
}: ProviderSelectorInlineProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label className="text-sm font-medium">Preferred Provider (Optional)</Label>
      <RadioGroup
        value={selectedProviderId || 'no-preference'}
        onValueChange={(value) => onProviderSelect(value === 'no-preference' ? null : value)}
        className="grid grid-cols-1 gap-2"
      >
        {/* No Preference Option */}
        <div className="flex items-center space-x-2 p-2 border rounded hover:bg-accent/30 transition-colors">
          <RadioGroupItem value="no-preference" id="inline-no-preference" />
          <Label htmlFor="inline-no-preference" className="flex items-center gap-2 cursor-pointer text-sm">
            <Shuffle className="w-4 h-4 text-roam-blue" />
            No Preference (Business Choice)
          </Label>
        </div>

        {/* Provider Options */}
        {providers.slice(0, 3).map((provider) => (
          <div
            key={provider.id}
            className="flex items-center space-x-2 p-2 border rounded hover:bg-accent/30 transition-colors"
          >
            <RadioGroupItem value={provider.id} id={`inline-${provider.id}`} />
            <Label htmlFor={`inline-${provider.id}`} className="flex items-center gap-2 cursor-pointer text-sm flex-1">
              <Avatar className="h-6 w-6">
                <AvatarImage src={provider.image_url || undefined} />
                <AvatarFallback className="text-xs">
                  {provider.first_name[0]}{provider.last_name[0]}
                </AvatarFallback>
              </Avatar>
              <span>{provider.first_name} {provider.last_name}</span>
              {provider.average_rating && (
                <div className="flex items-center gap-1 ml-auto">
                  <Star className="w-3 h-3 text-roam-warning fill-current" />
                  <span className="text-xs">{provider.average_rating}</span>
                </div>
              )}
            </Label>
          </div>
        ))}

        {providers.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-roam-blue hover:text-roam-blue text-xs justify-start"
            onClick={() => {/* This would open the full selector modal */}}
          >
            <Users className="w-3 h-3 mr-1" />
            View All {providers.length} Providers
          </Button>
        )}
      </RadioGroup>
    </div>
  );
}
