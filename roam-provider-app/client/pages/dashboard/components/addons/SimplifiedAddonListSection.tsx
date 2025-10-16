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
  Puzzle,
  DollarSign,
  CheckCircle2,
} from 'lucide-react';
import { EligibleAddon } from '@/types/addons';

interface SimplifiedAddonListSectionProps {
  addons: EligibleAddon[];
  loading: boolean;
  onEdit: (addon: EligibleAddon) => void;
}

export function SimplifiedAddonListSection({
  addons,
  loading,
  onEdit,
}: SimplifiedAddonListSectionProps) {

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Eligible Add-ons</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading add-ons...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (addons.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Eligible Add-ons</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="bg-muted rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Puzzle className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No eligible add-ons found</h3>
            <p className="text-muted-foreground mb-4">
              No add-ons are available for your configured services yet.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Eligible Add-ons ({addons.length})</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          All add-ons compatible with your active services. Configure pricing and availability.
        </p>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Add-on</TableHead>
                <TableHead>Compatible Services</TableHead>
                <TableHead>Custom Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {addons.map((addon) => {
                const isConfigured = addon.is_configured || addon.custom_price !== null;
                const isAvailable = addon.is_available === true;

                return (
                  <TableRow key={addon.id} className={!isConfigured ? 'bg-muted/30' : ''}>
                    <TableCell>
                      <div className="flex items-start space-x-3">
                        {addon.image_url ? (
                          <img
                            src={addon.image_url}
                            alt={addon.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                            <Puzzle className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{addon.name}</p>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {addon.description}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-sm">
                          {addon.compatible_service_count || 0} service{addon.compatible_service_count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {isConfigured && addon.custom_price ? (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <p className="font-medium">{addon.custom_price}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Not set</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={isAvailable ? 'default' : 'secondary'}
                      >
                        {isAvailable ? 'Available' : 'Unavailable'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(addon)}
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
