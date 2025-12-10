import * as React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ROAMInput } from "./roam-form-field";
import { ChevronLeft, ChevronRight, Search, Filter, Plus } from "lucide-react";

export interface Column {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
}

export interface ROAMDataTableProps {
  title?: string;
  columns: Column[];
  data: any[];
  searchable?: boolean;
  filterable?: boolean;
  addable?: boolean;
  onAdd?: () => void;
  onRowClick?: (row: any) => void;
  pageSize?: number;
  className?: string;
}

export function ROAMDataTable({
  title,
  columns,
  data,
  searchable = true,
  filterable = true,
  addable = true,
  onAdd,
  onRowClick,
  pageSize = 10,
  className,
}: ROAMDataTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);

  // Filter data based on search term
  const filteredData = React.useMemo(() => {
    if (!searchTerm) return data;

    return data.filter((row) =>
      Object.values(row).some((value) =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    );
  }, [data, searchTerm]);

  // Sort data
  const sortedData = React.useMemo(() => {
    if (!sortConfig) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  }, [filteredData, sortConfig]);

  // Paginate data
  const paginatedData = React.useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  const handleSort = (columnKey: string) => {
    const column = columns.find((col) => col.key === columnKey);
    if (!column?.sortable) return;

    setSortConfig((current) => {
      if (current?.key === columnKey) {
        return {
          key: columnKey,
          direction: current.direction === "asc" ? "desc" : "asc",
        };
      }
      return { key: columnKey, direction: "asc" };
    });
  };

  const getSortIcon = (columnKey: string) => {
    if (!sortConfig || sortConfig.key !== columnKey) return null;
    return sortConfig.direction === "asc" ? "↑" : "↓";
  };

  return (
    <div
      className={cn(
        "bg-card rounded-lg border border-border w-full overflow-x-auto",
        className,
      )}
    >
      {/* Header */}
      {(title || searchable || filterable || addable) && (
        <div className="flex flex-col gap-4 p-4 sm:p-6 border-b border-border">
          {title && (
            <h2 className="text-lg sm:text-xl font-semibold text-foreground">{title}</h2>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {searchable && (
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <ROAMInput
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:min-w-[200px]"
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              {filterable && (
                <Button variant="outline" size="sm" className="flex-1 sm:flex-initial">
                  <Filter className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Filter</span>
                </Button>
              )}

              {addable && (
                <Button
                  size="sm"
                  onClick={onAdd}
                  className="bg-roam-blue hover:bg-roam-blue/90 flex-1 sm:flex-initial"
                >
                  <Plus className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Add New</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Table - Desktop View */}
      <div className="hidden md:block overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        <table className="w-full min-w-[1000px]">
          <thead>
            <tr className="bg-muted border-b border-border">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "px-4 lg:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider",
                    column.sortable && "cursor-pointer hover:text-foreground",
                  )}
                  onClick={() => handleSort(column.key)}
                >
                  <div className="flex items-center gap-1">
                    {column.header}
                    {getSortIcon(column.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginatedData.map((row, index) => (
              <tr
                key={index}
                className={cn(
                  "hover:bg-muted/50 transition-colors",
                  onRowClick && "cursor-pointer",
                )}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className="px-4 lg:px-6 py-4 text-sm text-foreground whitespace-nowrap"
                  >
                    {column.render
                      ? column.render(row[column.key], row)
                      : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {paginatedData.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No data found</p>
          </div>
        )}
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden divide-y divide-border">
        {paginatedData.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No data found</p>
          </div>
        ) : (
          paginatedData.map((row, index) => (
            <div
              key={index}
              className={cn(
                "p-4 space-y-3 hover:bg-muted/50 transition-colors",
                onRowClick && "cursor-pointer active:bg-muted",
              )}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((column) => (
                <div key={column.key} className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {column.header}
                  </span>
                  <div className="text-sm text-foreground break-words">
                    {column.render
                      ? column.render(row[column.key], row)
                      : row[column.key]}
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-4 border-t border-border bg-muted/50">
          <div className="text-xs sm:text-sm text-muted-foreground order-2 sm:order-1">
            Showing {(currentPage - 1) * pageSize + 1}-
            {Math.min(currentPage * pageSize, sortedData.length)} of{" "}
            {sortedData.length} results
          </div>

          <div className="flex items-center gap-2 order-1 sm:order-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8"
            >
              <ChevronLeft className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Previous</span>
            </Button>

            <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
              Page {currentPage} of {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-8"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-4 h-4 sm:ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ROAMDataTable;
