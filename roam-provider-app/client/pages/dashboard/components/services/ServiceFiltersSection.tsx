import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter } from 'lucide-react';
import { ServiceFilters } from '@/types/services';

interface ServiceFiltersProps {
  filters: ServiceFilters;
  onFiltersChange: (filters: ServiceFilters) => void;
  onRefresh: () => void;
}

export function ServiceFiltersSection({ 
  filters, 
  onFiltersChange, 
  onRefresh 
}: ServiceFiltersProps) {
  const handleSearchChange = (value: string) => {
    onFiltersChange({
      ...filters,
      searchQuery: value,
      page: 1, // Reset to first page on search
    });
  };

  const handleStatusChange = (value: 'all' | 'active' | 'inactive') => {
    onFiltersChange({
      ...filters,
      filterStatus: value,
      page: 1, // Reset to first page on filter change
    });
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search services..."
              value={filters.searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Select
              value={filters.filterStatus}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger className="w-32">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              onClick={onRefresh}
              className="shrink-0"
            >
              Refresh
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}