import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Edit,
  Trash2,
  MoreHorizontal,
  Clock,
  DollarSign,
} from 'lucide-react';
import { BusinessService } from '@/types/services';
import { getDeliveryTypeIcon, getDeliveryTypeLabel } from '@/utils/deliveryTypeHelpers';

// Helper function to format subcategory names (e.g., "iv_therapy" -> "IV Therapy")
const formatSubcategoryName = (name: string | undefined): string => {
  if (!name) return '';
  
  return name
    .split('_')
    .map(word => word.toUpperCase())
    .join(' ');
};

interface ServiceListSectionProps {
  services: BusinessService[];
  loading: boolean;
  onToggleStatus: (serviceId: string, isActive: boolean) => Promise<void>;
  onEdit: (service: BusinessService) => void;
  onDelete: (serviceId: string) => Promise<void>;
}

export function ServiceListSection({
  services,
  loading,
  onToggleStatus,
  onEdit,
  onDelete,
}: ServiceListSectionProps) {

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Services</CardTitle>
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
          <CardTitle>Your Services</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="bg-muted rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No services found</h3>
            <p className="text-muted-foreground mb-4">
              You haven't added any services yet. Add your first service to start offering services to customers.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Services ({services.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Delivery</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((service) => (
                <TableRow key={service.id}>
                  <TableCell>
                    <div className="flex items-start space-x-3">
                      {service.services?.image_url && (
                        <img
                          src={service.services.image_url}
                          alt={service.services.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      )}
                      <div>
                        <p className="font-medium">{service.services?.name}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {service.services?.description}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Badge variant="secondary">
                        {formatSubcategoryName(service.services?.service_subcategories?.service_categories?.service_category_type)}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        {formatSubcategoryName(service.services?.service_subcategories?.service_subcategory_type)}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium">${service.business_price}</p>
                      {service.services?.min_price && service.business_price !== service.services.min_price && (
                        <p className="text-xs text-muted-foreground">
                          Base: ${service.services.min_price}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{service.business_duration_minutes}m</span>
                      </div>
                      {service.services?.duration_minutes && service.business_duration_minutes !== service.services.duration_minutes && (
                        <p className="text-xs text-muted-foreground">
                          Platform: {service.services.duration_minutes}m
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getDeliveryTypeIcon(service.delivery_type)}
                      <span className="text-sm">
                        {getDeliveryTypeLabel(service.delivery_type)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={service.is_active}
                        onCheckedChange={(checked) =>
                          onToggleStatus(service.id, checked)
                        }
                      />
                      <Badge
                        variant={service.is_active ? 'default' : 'secondary'}
                      >
                        {service.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => onEdit(service)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDelete(service.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}