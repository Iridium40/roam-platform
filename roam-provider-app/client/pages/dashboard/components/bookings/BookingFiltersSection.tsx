import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Search, MessageCircle, Users, RefreshCw } from "lucide-react";

interface BookingFiltersSectionProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedStatusFilter: string;
  setSelectedStatusFilter: (status: string) => void;
  showUnreadOnly: boolean;
  setShowUnreadOnly: (show: boolean) => void;
  showUnassignedOnly?: boolean;
  setShowUnassignedOnly?: (show: boolean) => void;
  canViewUnassigned?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  viewType?: "list" | "week" | "month";
  setViewType?: (type: "list" | "week" | "month") => void;
}

export default function BookingFiltersSection({
  searchQuery,
  setSearchQuery,
  selectedStatusFilter,
  setSelectedStatusFilter,
  showUnreadOnly,
  setShowUnreadOnly,
  showUnassignedOnly,
  setShowUnassignedOnly,
  canViewUnassigned = false,
  onRefresh,
  isRefreshing = false,
  viewType = "list",
  setViewType,
}: BookingFiltersSectionProps) {
  return (
    <div className="space-y-3">
      {/* Row 1: Search Bar + Status Dropdown */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search Bookings"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="sm:w-48">
          <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
              <SelectItem value="no_show">No Show</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 2: Unread Only + Unassigned Only + View Dropdown + Refresh */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant={showUnreadOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setShowUnreadOnly(!showUnreadOnly)}
          className="whitespace-nowrap"
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Unread
        </Button>
        {canViewUnassigned && setShowUnassignedOnly && (
          <Button
            variant={showUnassignedOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setShowUnassignedOnly(!showUnassignedOnly)}
            className="hidden sm:inline-flex whitespace-nowrap"
          >
            <Users className="w-4 h-4 mr-2" />
            Unassigned
          </Button>
        )}
        {setViewType && (
          <Select value={viewType} onValueChange={(value: "list" | "week" | "month") => setViewType(value)}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue>
                View: {viewType.charAt(0).toUpperCase() + viewType.slice(1)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="list">List</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
            </SelectContent>
          </Select>
        )}
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="whitespace-nowrap"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        )}
      </div>
    </div>
  );
}