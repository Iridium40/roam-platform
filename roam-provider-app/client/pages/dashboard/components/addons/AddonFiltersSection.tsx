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
import { AddonFilters } from '@/types/addons';

interface AddonFiltersSectionProps {
  filters: AddonFilters;
  onFiltersChange: (filters: AddonFilters) => void;
  onRefresh: () => void;
}

export function AddonFiltersSection({
  filters,
  onFiltersChange,
  onRefresh,
}: AddonFiltersSectionProps) {
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
              placeholder="Search add-ons..."
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
                <SelectItem value="all">All Add-ons</SelectItem>
                <SelectItem value="active">Available</SelectItem>
                <SelectItem value="inactive">Unavailable</SelectItem>
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
