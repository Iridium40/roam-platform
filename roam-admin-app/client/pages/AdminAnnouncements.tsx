import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { ROAMDataTable, Column } from "@/components/ui/roam-data-table";
import {
  ROAMCard,
  ROAMCardHeader,
  ROAMCardTitle,
  ROAMCardContent,
} from "@/components/ui/roam-card";
import { ROAMStatCard } from "@/components/ui/roam-stat-card";
import { ROAMBadge } from "@/components/ui/roam-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Megaphone,
  Users,
  UserCheck,
  Building2,
  Shield,
  Calendar,
  Clock,
  Eye,
  Edit,
  Plus,
  RefreshCw,
  Trash2,
  MoreHorizontal,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

type AnnouncementAudience = "customer" | "provider" | "all" | "staff" | "business";
type AnnouncementType =
  | "general"
  | "maintenance"
  | "promotional"
  | "update"
  | "alert"
  | "feature"
  | "news";

interface Announcement {
  id: string;
  title: string;
  content: string;
  is_active: boolean;
  created_at: string;
  start_date?: string;
  end_date?: string;
  announcement_audience: AnnouncementAudience;
  announcement_type: AnnouncementType;
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatEnumDisplay = (value: string) => {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const getAnnouncementTypeVariant = (type: AnnouncementType) => {
  switch (type) {
    case "alert":
      return "danger" as const;
    case "maintenance":
      return "warning" as const;
    case "promotional":
      return "success" as const;
    case "feature":
      return "primary" as const;
    case "update":
      return "secondary" as const;
    case "news":
      return "outline" as const;
    case "general":
    default:
      return "secondary" as const;
  }
};

const getAudienceIcon = (audience: AnnouncementAudience) => {
  switch (audience) {
    case "customer":
      return <Users className="w-4 h-4" />;
    case "provider":
      return <UserCheck className="w-4 h-4" />;
    case "staff":
      return <Shield className="w-4 h-4" />;
    case "all":
    default:
      return <Building2 className="w-4 h-4" />;
  }
};

export default function AdminAnnouncements() {
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnnouncement, setSelectedAnnouncement] =
    useState<Announcement | null>(null);
  const [isAnnouncementDetailsOpen, setIsAnnouncementDetailsOpen] =
    useState(false);
  const [isCreateEditOpen, setIsCreateEditOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] =
    useState<Announcement | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] =
    useState<Announcement | null>(null);

  // Form state for create/edit
  const [formData, setFormData] = useState<Partial<Announcement>>({
    title: "",
    content: "",
    start_date: "",
    end_date: "",
    announcement_audience: "all" as AnnouncementAudience,
    announcement_type: "general" as AnnouncementType,
    is_active: true,
  });

  // Filter state
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  // Fetch announcements from Supabase
  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching announcements:", error);
        setError(
          `Announcements Query Error: ${error.message}. You may need to create RLS policy: CREATE POLICY "Allow anon read access" ON public.announcements FOR SELECT USING (true);`,
        );
        return;
      }

      console.log(`Fetched ${data?.length || 0} announcements`);
      setAnnouncements(data || []);
    } catch (error) {
      console.error("Error in fetchAnnouncements:", error);
      setError("Failed to fetch announcements data");
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    await fetchAnnouncements();
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  // CRUD handlers
  const handleCreateEdit = async () => {
    if (!formData.title?.trim() || !formData.content?.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (title and content)",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingAnnouncement) {
        // Update existing announcement
        const { error } = await supabase
          .from("announcements")
          .update({
            title: formData.title,
            content: formData.content,
            start_date: formData.start_date || null,
            end_date: formData.end_date || null,
            announcement_audience: formData.announcement_audience,
            announcement_type: formData.announcement_type,
            is_active: formData.is_active,
          })
          .eq("id", editingAnnouncement.id);

        if (error) {
          console.error("Error updating announcement:", error);
          toast({
            title: "Error",
            description: `Failed to update announcement: ${error?.message || "Unknown error"}`,
            variant: "destructive",
          });
          return;
        }
        console.log("Announcement updated successfully");
        toast({
          title: "Success",
          description: "Announcement updated successfully!",
          variant: "default",
        });
      } else {
        // Create new announcement
        const { error } = await supabase.from("announcements").insert([
          {
            title: formData.title,
            content: formData.content,
            start_date: formData.start_date || null,
            end_date: formData.end_date || null,
            announcement_audience: formData.announcement_audience,
            announcement_type: formData.announcement_type,
            is_active: formData.is_active,
          },
        ]);

        if (error) {
          console.error("Error creating announcement:", error);
          toast({
            title: "Error",
            description: `Failed to create announcement: ${error?.message || "Unknown error"}`,
            variant: "destructive",
          });
          return;
        }
        console.log("Announcement created successfully");
        toast({
          title: "Success",
          description: "Announcement created successfully!",
          variant: "default",
        });
      }

      setIsCreateEditOpen(false);
      setEditingAnnouncement(null);
      resetForm();
      await fetchAnnouncements(); // Refresh the announcements list
    } catch (err) {
      console.error("Unexpected error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      toast({
        title: "Error",
        description: `Unexpected error: ${errorMessage}`,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      start_date: "",
      end_date: "",
      announcement_audience: "all" as AnnouncementAudience,
      announcement_type: "general" as AnnouncementType,
      is_active: true,
    });
  };

  const openCreateModal = () => {
    setEditingAnnouncement(null);
    resetForm();
    setIsCreateEditOpen(true);
  };

  const openEditModal = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      start_date: announcement.start_date || "",
      end_date: announcement.end_date || "",
      announcement_audience: announcement.announcement_audience,
      announcement_type: announcement.announcement_type,
      is_active: announcement.is_active,
    });
    setIsCreateEditOpen(true);
  };

  const handleDeleteAnnouncement = (announcement: Announcement) => {
    setAnnouncementToDelete(announcement);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!announcementToDelete) return;

    try {
      const { error } = await supabase
        .from("announcements")
        .delete()
        .eq("id", announcementToDelete.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Announcement "${announcementToDelete.title}" has been deleted successfully!`,
        variant: "default",
      });
      setIsDeleteConfirmOpen(false);
      setAnnouncementToDelete(null);
      await fetchAnnouncements();
    } catch (error: any) {
      console.error("Error deleting announcement:", error);
      toast({
        title: "Error",
        description: `Failed to delete announcement: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const cancelDelete = () => {
    setIsDeleteConfirmOpen(false);
    setAnnouncementToDelete(null);
  };

  // Filter announcements based on status
  const filteredAnnouncements = announcements.filter((announcement) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "active") return announcement.is_active;
    if (statusFilter === "inactive") return !announcement.is_active;
    return true;
  });

  const announcementStats = {
    totalAnnouncements: announcements.length,
    activeAnnouncements: announcements.filter((a) => a.is_active).length,
    scheduledAnnouncements: announcements.filter(
      (a) => a.start_date && new Date(a.start_date) > new Date(),
    ).length,
    alertAnnouncements: announcements.filter(
      (a) => a.announcement_type === "alert",
    ).length,
    customerAnnouncements: announcements.filter(
      (a) =>
        a.announcement_audience === "customer" ||
        a.announcement_audience === "all",
    ).length,
    providerAnnouncements: announcements.filter(
      (a) =>
        a.announcement_audience === "provider" ||
        a.announcement_audience === "all",
    ).length,
  };

  const announcementColumns: Column[] = [
    {
      key: "title",
      header: "Announcement",
      sortable: true,
      render: (value: string, row: Announcement) => (
        <div className="space-y-1">
          <div className="font-medium text-foreground">{value}</div>
          <div className="flex items-center gap-2">
            <ROAMBadge
              variant={getAnnouncementTypeVariant(row.announcement_type)}
              size="sm"
            >
              {formatEnumDisplay(row.announcement_type)}
            </ROAMBadge>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              {getAudienceIcon(row.announcement_audience)}
              <span>{formatEnumDisplay(row.announcement_audience)}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "content",
      header: "Content Preview",
      render: (value: string) => (
        <div className="max-w-md">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {value.length > 80 ? `${value.substring(0, 80)}...` : value}
          </p>
        </div>
      ),
    },
    {
      key: "schedule",
      header: "Schedule",
      render: (value: any, row: Announcement) => (
        <div className="space-y-1">
          {row.start_date && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-3 h-3 text-roam-blue" />
              <span>Starts: {formatDate(row.start_date)}</span>
            </div>
          )}
          {row.end_date && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>Ends: {formatDate(row.end_date)}</span>
            </div>
          )}
          {!row.start_date && !row.end_date && (
            <span className="text-sm text-muted-foreground">No schedule</span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (value: any, row: Announcement) => {
        const now = new Date();
        let status = "active";
        let variant: "success" | "warning" | "secondary" = "success";

        if (!row.is_active) {
          status = "inactive";
          variant = "secondary";
        } else if (row.start_date && new Date(row.start_date) > now) {
          status = "scheduled";
          variant = "warning";
        } else if (row.end_date && new Date(row.end_date) < now) {
          status = "expired";
          variant = "secondary";
        }

        return (
          <ROAMBadge variant={variant}>{formatEnumDisplay(status)}</ROAMBadge>
        );
      },
    },
    {
      key: "created_at",
      header: "Created",
      sortable: true,
      render: (value: string) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(value)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (value: any, row: Announcement) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              setSelectedAnnouncement(row);
              setIsAnnouncementDetailsOpen(true);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => openEditModal(row)}
            title="Edit Announcement"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => handleDeleteAnnouncement(row)}
            title="Delete Announcement"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <AdminLayout title="Announcements">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-roam-blue" />
            <p className="text-muted-foreground">Loading announcements...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="Announcements">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Failed to Load Announcements
              </h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md">
                {error}
              </p>
              <Button onClick={refreshData} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Announcements">
      <div className="space-y-8">
        {/* Header with Refresh Button */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Announcements Management</h1>
          <Button onClick={refreshData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Data
          </Button>
        </div>

        {/* Announcement Overview */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <ROAMCard>
            <ROAMCardHeader>
              <ROAMCardTitle>Announcement Types</ROAMCardTitle>
            </ROAMCardHeader>
            <ROAMCardContent>
              <div className="space-y-4">
                {[
                  "general",
                  "maintenance",
                  "promotional",
                  "update",
                  "alert",
                  "feature",
                  "news",
                ].map((type) => (
                  <div key={type} className="flex justify-between items-center">
                    <span className="text-sm font-medium">
                      {formatEnumDisplay(type)}
                    </span>
                    <span className="text-lg font-bold">
                      {
                        announcements.filter(
                          (a) => a.announcement_type === type,
                        ).length
                      }
                    </span>
                  </div>
                ))}
              </div>
            </ROAMCardContent>
          </ROAMCard>

          <ROAMCard>
            <ROAMCardHeader>
              <ROAMCardTitle>Audience Breakdown</ROAMCardTitle>
            </ROAMCardHeader>
            <ROAMCardContent>
              <div className="space-y-4">
                {["all", "customer", "provider", "staff"].map((audience) => (
                  <div
                    key={audience}
                    className="flex justify-between items-center"
                  >
                    <div className="flex items-center gap-2">
                      {getAudienceIcon(audience as AnnouncementAudience)}
                      <span className="text-sm font-medium">
                        {formatEnumDisplay(audience)}
                      </span>
                    </div>
                    <span className="text-lg font-bold">
                      {
                        announcements.filter(
                          (a) => a.announcement_audience === audience,
                        ).length
                      }
                    </span>
                  </div>
                ))}
              </div>
            </ROAMCardContent>
          </ROAMCard>

          <ROAMCard>
            <ROAMCardHeader>
              <ROAMCardTitle>Recent Activity</ROAMCardTitle>
            </ROAMCardHeader>
            <ROAMCardContent>
              <div className="space-y-3">
                {announcements.slice(0, 3).map((announcement) => (
                  <div
                    key={announcement.id}
                    className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border"
                  >
                    <Megaphone className="w-4 h-4 text-roam-blue mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {announcement.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(announcement.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ROAMCardContent>
          </ROAMCard>
        </div>

        {/* Filter Controls */}
        <div className="flex gap-4 items-center bg-muted/30 p-4 rounded-lg">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "all" | "active" | "inactive")
              }
              className="px-3 py-1 border border-border rounded-md text-sm bg-background"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="text-sm text-muted-foreground ml-auto">
            Showing {filteredAnnouncements.length} of {announcements.length}{" "}
            announcements
          </div>
        </div>

        {/* Main Data Table */}
        <ROAMDataTable
          title="All Announcements"
          columns={announcementColumns}
          data={filteredAnnouncements}
          searchable={true}
          filterable={false}
          addable={true}
          onAdd={openCreateModal}
          onRowClick={(announcement) =>
            console.log("View announcement:", announcement)
          }
          pageSize={10}
        />
      </div>

      {/* Announcement Details Modal */}
      <Dialog
        open={isAnnouncementDetailsOpen}
        onOpenChange={setIsAnnouncementDetailsOpen}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="w-6 h-6 text-roam-blue" />
              Announcement Details - {selectedAnnouncement?.title}
            </DialogTitle>
            <DialogDescription>
              View detailed information about this announcement including
              content, targeting, and delivery status.
            </DialogDescription>
          </DialogHeader>

          {selectedAnnouncement && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:gap-6">
                <ROAMCard>
                  <ROAMCardHeader>
                    <ROAMCardTitle className="text-base">
                      Announcement Information
                    </ROAMCardTitle>
                  </ROAMCardHeader>
                  <ROAMCardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Megaphone className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Title
                        </div>
                        <div className="font-medium">
                          {selectedAnnouncement.title}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {getAudienceIcon(
                        selectedAnnouncement.announcement_audience,
                      )}
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Audience
                        </div>
                        <div className="font-medium">
                          {formatEnumDisplay(
                            selectedAnnouncement.announcement_audience,
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <ROAMBadge
                        variant={getAnnouncementTypeVariant(
                          selectedAnnouncement.announcement_type,
                        )}
                      >
                        {formatEnumDisplay(
                          selectedAnnouncement.announcement_type,
                        )}
                      </ROAMBadge>
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Type
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Status
                        </div>
                        <ROAMBadge
                          variant={
                            selectedAnnouncement.is_active
                              ? "success"
                              : "secondary"
                          }
                        >
                          {selectedAnnouncement.is_active
                            ? "Active"
                            : "Inactive"}
                        </ROAMBadge>
                      </div>
                    </div>
                  </ROAMCardContent>
                </ROAMCard>

                <ROAMCard>
                  <ROAMCardHeader>
                    <ROAMCardTitle className="text-base">
                      Schedule & Timing
                    </ROAMCardTitle>
                  </ROAMCardHeader>
                  <ROAMCardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Created
                        </div>
                        <div className="font-medium">
                          {formatDateTime(selectedAnnouncement.created_at)}
                        </div>
                      </div>
                    </div>

                    {selectedAnnouncement.start_date && (
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-roam-blue" />
                        <div>
                          <div className="text-sm text-muted-foreground">
                            Start Date
                          </div>
                          <div className="font-medium">
                            {formatDate(selectedAnnouncement.start_date)}
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedAnnouncement.end_date && (
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-roam-warning" />
                        <div>
                          <div className="text-sm text-muted-foreground">
                            End Date
                          </div>
                          <div className="font-medium">
                            {formatDate(selectedAnnouncement.end_date)}
                          </div>
                        </div>
                      </div>
                    )}

                    {!selectedAnnouncement.start_date &&
                      !selectedAnnouncement.end_date && (
                        <div className="text-center py-4 text-muted-foreground">
                          <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No specific schedule set</p>
                        </div>
                      )}
                  </ROAMCardContent>
                </ROAMCard>
              </div>

              <ROAMCard>
                <ROAMCardHeader>
                  <ROAMCardTitle className="text-base">
                    Announcement Content
                  </ROAMCardTitle>
                </ROAMCardHeader>
                <ROAMCardContent>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm leading-relaxed">
                      {selectedAnnouncement.content}
                    </p>
                  </div>
                </ROAMCardContent>
              </ROAMCard>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Announcement Modal */}
      <Dialog open={isCreateEditOpen} onOpenChange={setIsCreateEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-lg flex items-center justify-center text-white">
                {editingAnnouncement ? (
                  <Edit className="w-4 h-4" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </div>
              {editingAnnouncement
                ? "Edit Announcement"
                : "Create New Announcement"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Basic Information
              </h3>

              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Enter announcement title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Content *</Label>
                <Textarea
                  id="content"
                  value={formData.content || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      content: e.target.value,
                    }))
                  }
                  placeholder="Enter announcement content..."
                  rows={4}
                />
              </div>
            </div>

            {/* Dates */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Schedule
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="datetime-local"
                    value={formData.start_date || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        start_date: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="datetime-local"
                    value={formData.end_date || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        end_date: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            {/* Configuration */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Configuration
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="audience">Audience</Label>
                  <Select
                    value={formData.announcement_audience || "all"}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        announcement_audience: value as AnnouncementAudience,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select audience" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="customer">Customers</SelectItem>
                      <SelectItem value="provider">Providers</SelectItem>
                      <SelectItem value="business">Businesses</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={formData.announcement_type || "general"}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        announcement_type: value as AnnouncementType,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="promotional">Promotional</SelectItem>
                      <SelectItem value="update">Update</SelectItem>
                      <SelectItem value="alert">Alert</SelectItem>
                      <SelectItem value="feature">Feature</SelectItem>
                      <SelectItem value="news">News</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Status
              </h3>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active ?? true}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      is_active: e.target.checked,
                    }))
                  }
                  className="rounded border-gray-300"
                />
                <Label htmlFor="is_active">Active Announcement</Label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => setIsCreateEditOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateEdit}
                disabled={!formData.title?.trim() || !formData.content?.trim()}
                className="min-w-[120px]"
              >
                {editingAnnouncement
                  ? "Update Announcement"
                  : "Create Announcement"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              Delete Announcement
            </DialogTitle>
          </DialogHeader>

          {announcementToDelete && (
            <div className="space-y-4">
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <p className="text-sm">
                  Are you sure you want to delete{" "}
                  <strong>"{announcementToDelete.title}"</strong>?
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  ⚠️ This action cannot be undone. The announcement will be
                  permanently removed from the database.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={cancelDelete}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={confirmDelete}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Announcement
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
