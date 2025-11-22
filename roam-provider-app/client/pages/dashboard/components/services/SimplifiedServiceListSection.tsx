import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Edit,
  Clock,
  DollarSign,
} from 'lucide-react';
import { EligibleService } from '@/types/services';
import { getDeliveryTypeIcon, getDeliveryTypeLabel } from '@/utils/deliveryTypeHelpers';

interface SimplifiedServiceListSectionProps {
  services: EligibleService[];
  loading: boolean;
  onEdit: (service: EligibleService) => void;
}

export function SimplifiedServiceListSection({
  services,
  loading,
  onEdit,
}: SimplifiedServiceListSectionProps) {

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Eligible Services</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading services...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (services.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Eligible Services</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="bg-muted rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No eligible services found</h3>
            <p className="text-muted-foreground mb-4">
              Your business hasn't been approved for any service categories yet. Contact the ROAM admin platform to request approval for service categories.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Eligible Services ({services.length})</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          All services your business is eligible to provide. Toggle services on/off and set prices and delivery options.
        </p>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Base Price</TableHead>
                <TableHead>Your Price</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Delivery</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((service) => {
                const isConfigured = service.is_configured || service.business_price !== null;
                const isActive = service.business_is_active === true;

                return (
                  <TableRow key={service.id} className={!isConfigured ? 'bg-muted/30' : ''}>
                    <TableCell>
                      <div className="flex items-start space-x-3">
                        {service.image_url && (
                          <img
                            src={service.image_url}
                            alt={service.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        )}
                        <div>
                          <p className="font-medium">{service.name}</p>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {service.description}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-muted-foreground">${service.min_price}</p>
                    </TableCell>
                    <TableCell>
                      {isConfigured && service.business_price ? (
                        <p className="font-medium">${service.business_price}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground">Not set</p>
                      )}
                    </TableCell>
                    <TableCell>
                      {isConfigured && service.business_duration_minutes ? (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{service.business_duration_minutes}m</span>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Not set</p>
                      )}
                    </TableCell>
                    <TableCell>
                      {isConfigured && service.delivery_type ? (
                        <div className="flex items-center gap-2">
                          {getDeliveryTypeIcon(service.delivery_type)}
                          <span className="text-sm">
                            {getDeliveryTypeLabel(service.delivery_type)}
                          </span>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Not set</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={isActive ? 'default' : 'secondary'}
                      >
                        {isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(service)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        {isConfigured ? 'Edit' : 'Configure'}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
