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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageSquare,
  Clock,
  User,
  Mail,
  Tag,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Eye,
  Edit,
  Send,
  RefreshCw,
  Filter,
  Search,
  FileText,
  Users,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format, isValid, parseISO } from "date-fns";

// Status type based on database schema
type SubmissionStatus = "received" | "in_progress" | "responded" | "closed";

interface ContactSubmission {
  id: string;
  from_email: string;
  to_email: string;
  subject: string;
  message: string;
  status: SubmissionStatus;
  created_at: string;
  updated_at: string;
  responded_at?: string;
  responded_by?: string;
  notes?: string;
  category?: string;
  full_name?: string;
  // Joined data from auth.users
  admin_user?: {
    id: string;
    email: string;
    raw_user_meta_data?: {
      first_name?: string;
      last_name?: string;
      full_name?: string;
    };
  };
}

interface SubmissionStats {
  total: number;
  received: number;
  in_progress: number;
  responded: number;
  closed: number;
}

// Create admin Supabase client with service role key for elevated permissions
const createAdminSupabaseClient = () => {
  const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log("Admin client environment check:", {
    hasUrl: !!supabaseUrl,
    hasServiceKey: !!serviceRoleKey,
    url: supabaseUrl?.substring(0, 30) + "..." // Show partial URL for debugging
  });

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn("Missing Supabase credentials for admin client, using regular client");
    return supabase; // Fallback to regular client
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

export default function AdminContactSubmissions() {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<ContactSubmission[]>([]);
  const [stats, setStats] = useState<SubmissionStats>({
    total: 0,
    received: 0,
    in_progress: 0,
    responded: 0,
    closed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<ContactSubmission | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Edit form states
  const [editStatus, setEditStatus] = useState<SubmissionStatus>("received");
  const [editNotes, setEditNotes] = useState("");

  const { toast } = useToast();
  const { user } = useAuth();

  // Safe date formatting function
  const safeFormatDate = (dateString: string | null | undefined, formatStr: string = "MMM dd, yyyy") => {
    if (!dateString) return "N/A";

    try {
      const date = typeof dateString === "string" ? parseISO(dateString) : new Date(dateString);
      if (!isValid(date)) return "Invalid Date";
      return format(date, formatStr);
    } catch (error) {
      console.warn("Date formatting error:", error, "for date:", dateString);
      return "Invalid Date";
    }
  };

  // Fetch contact submissions
  const fetchSubmissions = async () => {
    try {
      setLoading(true);

      // Try admin client first, fallback to regular client if needed
      let clientToUse = supabase;
      try {
        const adminSupabase = createAdminSupabaseClient();
        console.log("Attempting to use admin Supabase client for contact submissions");
        clientToUse = adminSupabase;
      } catch (adminError) {
        console.warn("Admin client creation failed, using regular client:", adminError);
      }

      // First try a simple query without joins to test basic connectivity
      const { data, error } = await clientToUse
        .from("contact_submissions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Ensure all submissions have default values for required fields
      const sanitizedData = (data || []).map(submission => ({
        ...submission,
        status: submission.status || "received",
        full_name: submission.full_name || null,
        category: submission.category || null,
        notes: submission.notes || null
      }));

      setSubmissions(sanitizedData);
      calculateStats(sanitizedData);
    } catch (error: any) {
      console.error("Error fetching contact submissions:", {
        error,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        stack: error?.stack,
        supabaseUrl: import.meta.env.VITE_PUBLIC_SUPABASE_URL,
        hasAnonKey: !!import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY
      });

      // Test basic Supabase connection
      try {
        console.log("Testing basic Supabase connection...");
        const adminSupabase = createAdminSupabaseClient();
        const { data: testData, error: testError } = await adminSupabase
          .from("contact_submissions")
          .select("count", { count: "exact", head: true });
        console.log("Basic connection test:", { testData, testError });
      } catch (testErr) {
        console.error("Basic connection test failed:", testErr);
      }

      toast({
        title: "Error",
        description: `Failed to fetch contact submissions: ${error?.message || JSON.stringify(error)}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const calculateStats = (data: ContactSubmission[]) => {
    const total = data.length;
    const received = data.filter(s => s.status === "received").length;
    const in_progress = data.filter(s => s.status === "in_progress").length;
    const responded = data.filter(s => s.status === "responded").length;
    const closed = data.filter(s => s.status === "closed").length;

    setStats({ total, received, in_progress, responded, closed });
  };

  // Filter submissions based on search and filters
  useEffect(() => {
    let filtered = submissions;

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(s => s.status === statusFilter);
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(s => s.category === categoryFilter);
    }

    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.full_name?.toLowerCase().includes(query) ||
        s.from_email.toLowerCase().includes(query) ||
        s.subject.toLowerCase().includes(query) ||
        s.message.toLowerCase().includes(query)
      );
    }

    setFilteredSubmissions(filtered);
  }, [submissions, statusFilter, categoryFilter, searchQuery]);

  // Update submission status
  const updateSubmissionStatus = async (submissionId: string, newStatus: SubmissionStatus, notes?: string) => {
    // Ensure admin user is authenticated
    if (!user?.id) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to update submissions",
        variant: "destructive",
      });
      return;
    }

    try {
      const updates: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (notes !== undefined) {
        updates.notes = notes;
      }

      if (newStatus === "responded" || newStatus === "closed") {
        updates.responded_at = new Date().toISOString();
        // Set the current admin user as the responder
        if (user?.id) {
          updates.responded_by = user.id;
        }
      }

      const adminSupabase = createAdminSupabaseClient();
      const { error } = await adminSupabase
        .from("contact_submissions")
        .update(updates)
        .eq("id", submissionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Submission updated successfully",
      });

      fetchSubmissions(); // Refresh data
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error("Error updating submission:", error);
      toast({
        title: "Error",
        description: "Failed to update submission",
        variant: "destructive",
      });
    }
  };

  // Handle view submission
  const handleViewSubmission = (submission: ContactSubmission) => {
    setSelectedSubmission(submission);
    setIsViewDialogOpen(true);
  };

  // Handle edit submission
  const handleEditSubmission = (submission: ContactSubmission) => {
    setSelectedSubmission(submission);
    setEditStatus(submission.status);
    setEditNotes(submission.notes || "");
    setIsEditDialogOpen(true);
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status: SubmissionStatus | undefined | null) => {
    switch (status) {
      case "received": return "secondary";
      case "in_progress": return "warning";
      case "responded": return "success";
      case "closed": return "default";
      default: return "secondary";
    }
  };

  // Get category display name
  const getCategoryDisplay = (category?: string) => {
    if (!category) return "General";
    return category.split("_").map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(" ");
  };

  // Table columns
  const columns: Column<ContactSubmission>[] = [
    {
      key: "full_name",
      header: "Name",
      render: (submission) => (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">
            {submission.full_name || "Unknown"}
          </span>
        </div>
      ),
    },
    {
      key: "from_email",
      header: "Email",
      render: (submission) => (
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">{submission.from_email}</span>
        </div>
      ),
    },
    {
      key: "subject",
      header: "Subject",
      render: (submission) => (
        <div className="max-w-xs">
          <span className="font-medium text-sm truncate block">
            {submission.subject}
          </span>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (submission) => (
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">
            {getCategoryDisplay(submission.category)}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (submission) => (
        <ROAMBadge variant={getStatusBadgeVariant(submission.status || "received")}>
          {(submission.status || "received").replace("_", " ").toUpperCase()}
        </ROAMBadge>
      ),
    },
    {
      key: "created_at",
      header: "Submitted",
      render: (submission) => (
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">
            {safeFormatDate(submission.created_at)}
          </span>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (submission) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleViewSubmission(submission)}
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEditSubmission(submission)}
          >
            <Edit className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  useEffect(() => {
    fetchSubmissions();
  }, []);

  return (
    <AdminLayout title="Contact Submissions">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <ROAMStatCard
          title="Total Submissions"
          value={stats.total.toString()}
          icon={<MessageSquare className="w-6 h-6" />}
          trend="neutral"
        />
        <ROAMStatCard
          title="New/Received"
          value={stats.received.toString()}
          icon={<AlertTriangle className="w-6 h-6" />}
          trend="neutral"
        />
        <ROAMStatCard
          title="In Progress"
          value={stats.in_progress.toString()}
          icon={<Clock className="w-6 h-6" />}
          trend="neutral"
        />
        <ROAMStatCard
          title="Responded"
          value={stats.responded.toString()}
          icon={<CheckCircle className="w-6 h-6" />}
          trend="neutral"
        />
        <ROAMStatCard
          title="Closed"
          value={stats.closed.toString()}
          icon={<FileText className="w-6 h-6" />}
          trend="neutral"
        />
      </div>

      {/* Filters and Search */}
      <ROAMCard className="mb-6">
        <ROAMCardHeader>
          <ROAMCardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </ROAMCardTitle>
        </ROAMCardHeader>
        <ROAMCardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search name, email, subject..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="responded">Responded</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-filter">Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="general">General Inquiry</SelectItem>
                  <SelectItem value="booking">Booking Support</SelectItem>
                  <SelectItem value="provider">Provider Questions</SelectItem>
                  <SelectItem value="technical">Technical Issues</SelectItem>
                  <SelectItem value="billing">Billing & Payments</SelectItem>
                  <SelectItem value="feedback">Feedback & Suggestions</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={fetchSubmissions} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </ROAMCardContent>
      </ROAMCard>

      {/* Submissions Table */}
      <ROAMCard>
        <ROAMCardHeader>
          <ROAMCardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Contact Submissions ({filteredSubmissions.length})
            </span>
          </ROAMCardTitle>
        </ROAMCardHeader>
        <ROAMCardContent>
          <ROAMDataTable
            data={filteredSubmissions || []}
            columns={columns}
            loading={loading}
            searchPlaceholder="Search submissions..."
          />
        </ROAMCardContent>
      </ROAMCard>

      {/* View Submission Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Contact Submission Details</DialogTitle>
            <DialogDescription>
              View complete submission information
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Name</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedSubmission.full_name || "Not provided"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Email</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedSubmission.from_email}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Category</Label>
                  <p className="text-sm text-muted-foreground">
                    {getCategoryDisplay(selectedSubmission.category)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <ROAMBadge variant={getStatusBadgeVariant(selectedSubmission.status)}>
                    {selectedSubmission.status.replace("_", " ").toUpperCase()}
                  </ROAMBadge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Submitted</Label>
                  <p className="text-sm text-muted-foreground">
                    {safeFormatDate(selectedSubmission.created_at, "MMM dd, yyyy 'at' hh:mm a")}
                  </p>
                </div>
                {selectedSubmission.responded_at && (
                  <div>
                    <Label className="text-sm font-medium">Responded</Label>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(selectedSubmission.responded_at), "MMM dd, yyyy 'at' hh:mm a")}
                      {selectedSubmission.admin_user && (
                        <span className="block text-xs text-muted-foreground/70 mt-1">
                          by {selectedSubmission.admin_user.raw_user_meta_data?.first_name && selectedSubmission.admin_user.raw_user_meta_data?.last_name
                            ? `${selectedSubmission.admin_user.raw_user_meta_data.first_name} ${selectedSubmission.admin_user.raw_user_meta_data.last_name}`
                            : selectedSubmission.admin_user.raw_user_meta_data?.full_name
                            ? selectedSubmission.admin_user.raw_user_meta_data.full_name
                            : selectedSubmission.admin_user.email}
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium">Subject</Label>
                <p className="text-sm text-muted-foreground">
                  {selectedSubmission.subject}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium">Message</Label>
                <div className="bg-muted p-3 rounded-md">
                  <p className="text-sm whitespace-pre-wrap">
                    {selectedSubmission.message}
                  </p>
                </div>
              </div>

              {selectedSubmission.notes && (
                <div>
                  <Label className="text-sm font-medium">Admin Notes</Label>
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-sm whitespace-pre-wrap">
                      {selectedSubmission.notes}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Submission Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Submission Status</DialogTitle>
            <DialogDescription>
              Change the status and add notes for this submission
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-status">Status</Label>
                <Select value={editStatus} onValueChange={(value) => setEditStatus(value as SubmissionStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="received">Received</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="responded">Responded</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-notes">Admin Notes</Label>
                <Textarea
                  id="edit-notes"
                  placeholder="Add notes about this submission..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => updateSubmissionStatus(selectedSubmission.id, editStatus, editNotes)}
                >
                  Update Submission
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
