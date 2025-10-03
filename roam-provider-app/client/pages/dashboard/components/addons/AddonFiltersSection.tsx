import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, RefreshCw } from 'lucide-react';
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
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
      {/* Search */}
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search add-ons..."
          value={filters.searchQuery}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              searchQuery: e.target.value,
              page: 1, // Reset to first page on search
            })
          }
          className="pl-9"
        />
      </div>

      <div className="flex gap-2 items-center">
        {/* Status Filter */}
        <Select
          value={filters.filterStatus}
          onValueChange={(value: 'all' | 'active' | 'inactive') =>
            onFiltersChange({
              ...filters,
              filterStatus: value,
              page: 1, // Reset to first page on filter change
            })
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Add-ons</SelectItem>
            <SelectItem value="active">Available</SelectItem>
            <SelectItem value="inactive">Unavailable</SelectItem>
          </SelectContent>
        </Select>

        {/* Refresh Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          title="Refresh add-ons"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
