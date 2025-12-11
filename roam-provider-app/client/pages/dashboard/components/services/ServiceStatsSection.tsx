import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, CheckCircle } from 'lucide-react';
import { ServiceStats } from '@/types/services';

interface ServiceStatsProps {
  stats: ServiceStats;
}

export function ServiceStatsSection({ stats }: ServiceStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Services</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_services}</div>
          <p className="text-xs text-muted-foreground">
            Services offered by your business
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Services</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.active_services}</div>
          <p className="text-xs text-muted-foreground">
            Currently available to customers
          </p>
        </CardContent>
      </Card>
    </div>
  );
}