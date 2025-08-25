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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Users,
  UserCheck,
  UserX,
  Shield,
  Eye,
  Edit,
  MoreHorizontal,
  TrendingUp,
  Mail,
  Calendar,
  Clock,
  MapPin,
  Plus,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type UserRole = "admin" | "manager" | "support" | "analyst";

interface User {
  id: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  image_url: string | null;
  permissions: any[] | null;
}

const sampleUsers: User[] = [
  {
    id: "1",
    user_id: "auth-user-1",
    first_name: "John",
    last_name: "Doe",
    email: "john.doe@company.com",
    role: "admin",
    is_active: true,
    created_at: "2023-06-01T00:00:00Z",
    image_url: null,
    permissions: ["full_access", "user_management"],
  },
  {
    id: "2",
    user_id: "auth-user-2",
    first_name: "Sarah",
    last_name: "Johnson",
    email: "sarah.j@company.com",
    role: "manager",
    is_active: true,
    created_at: "2023-08-15T00:00:00Z",
    image_url: null,
    permissions: ["user_management", "content_management"],
  },
  {
    id: "3",
    user_id: "auth-user-3",
    first_name: "Mike",
    last_name: "Wilson",
    email: "mike.wilson@company.com",
    role: "support",
    is_active: true,
    created_at: "2023-09-20T00:00:00Z",
    image_url: null,
    permissions: ["view_reports", "customer_support"],
  },
  {
    id: "4",
    user_id: "auth-user-4",
    first_name: "Emma",
    last_name: "Davis",
    email: "emma.davis@company.com",
    role: "analyst",
    is_active: true,
    created_at: "2023-11-10T00:00:00Z",
    image_url: null,
    permissions: ["analytics", "reports"],
  },
  {
    id: "5",
    user_id: "auth-user-5",
    first_name: "Alex",
    last_name: "Chen",
    email: "alex.chen@company.com",
    role: "support",
    is_active: false,
    created_at: "2023-12-01T00:00:00Z",
    image_url: null,
    permissions: ["customer_support"],
  },
];

const getRoleBadgeVariant = (role: UserRole) => {
  switch (role) {
    case "admin":
      return "danger" as const;
    case "manager":
      return "warning" as const;
    case "support":
      return "success" as const;
    case "analyst":
      return "secondary" as const;
    default:
      return "secondary" as const;
  }
};

const getStatusBadgeVariant = (isActive: boolean) => {
  return isActive ? ("success" as const) : ("secondary" as const);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getRolePermissions = (role: UserRole): string[] => {
  switch (role) {
    case "admin":
      return [
        "Full System Access",
        "User Management",
        "Business Management",
        "Financial Reports",
        "System Settings",
        "Data Export",
        "Security Logs",
        "API Access",
      ];
    case "manager":
      return [
        "User Management",
        "Business Management",
        "Customer Support",
        "Reports Access",
        "Content Management",
        "Moderate Reviews",
      ];
    case "support":
      return [
        "Customer Support",
        "View User Data",
        "Basic Reports",
        "Ticket Management",
      ];
    case "analyst":
      return [
        "View Reports",
        "Data Analytics",
        "Performance Metrics",
        "Business Intelligence",
        "Export Data",
      ];
    default:
      return [];
  }
};

const formatLastLogin = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60),
  );

  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  } else if (diffInHours < 168) {
    return `${Math.floor(diffInHours / 24)}d ago`;
  } else {
    return formatDate(dateString);
  }
};

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isUserDetailsOpen, setIsUserDetailsOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState({
    first_name: "",
    last_name: "",
    role: "" as UserRole,
    is_active: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  // Fetch users from Supabase
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("admin_users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching users:", error);
        setError("Failed to fetch users from database. Using sample data.");
        setUsers(sampleUsers);
      } else {
        setUsers(data || []);
      }
    } catch (err) {
      console.error("Error connecting to database:", err);
      setError("Failed to connect to database. Using sample data.");
      setUsers(sampleUsers);
    } finally {
      setLoading(false);
    }
  };

  // Update user function
  const updateUser = async () => {
    if (!userToEdit) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("admin_users")
        .update({
          first_name: editFormData.first_name.trim(),
          last_name: editFormData.last_name.trim(),
          role: editFormData.role,
          is_active: editFormData.is_active,
        })
        .eq("id", userToEdit.id);

      if (error) {
        console.error("Error updating user:", error);
        alert(
          `Error updating user: ${error?.message || error?.error?.message || JSON.stringify(error)}`,
        );
      } else {
        setIsEditModalOpen(false);
        setUserToEdit(null);
        await fetchUsers(); // Refresh the users list
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      alert(`Unexpected error: ${err}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Filter users based on selected filters
  const filteredUsers = users.filter((user) => {
    const roleMatch = roleFilter === "all" || user.role === roleFilter;
    const statusMatch =
      statusFilter === "all" ||
      (statusFilter === "active" && user.is_active) ||
      (statusFilter === "inactive" && !user.is_active);

    return roleMatch && statusMatch;
  });

  const userStats = {
    total: users.length,
    active: users.filter((u) => u.is_active).length,
    admins: users.filter((u) => u.role === "admin").length,
    managers: users.filter((u) => u.role === "manager").length,
  };

  const columns: Column[] = [
    {
      key: "first_name",
      header: "User",
      sortable: true,
      render: (value: string, row: User) => {
        const fullName =
          `${row.first_name || ""} ${row.last_name || ""}`.trim() || "N/A";
        const initials =
          fullName !== "N/A"
            ? fullName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
            : "NA";

        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-full flex items-center justify-center text-white font-semibold text-sm">
              {initials}
            </div>
            <div>
              <div className="font-medium text-foreground">{fullName}</div>
              <div className="text-sm text-muted-foreground">{row.email}</div>
            </div>
          </div>
        );
      },
    },
    {
      key: "role",
      header: "Role",
      sortable: true,
      render: (value: UserRole) => (
        <ROAMBadge variant={getRoleBadgeVariant(value)} className="capitalize">
          {value}
        </ROAMBadge>
      ),
    },
    {
      key: "is_active",
      header: "Status",
      sortable: true,
      render: (value: boolean) => (
        <ROAMBadge
          variant={getStatusBadgeVariant(value)}
          className="capitalize"
        >
          {value ? "Active" : "Inactive"}
        </ROAMBadge>
      ),
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
      render: (value: any, row: User) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              setSelectedUser(row);
              setIsUserDetailsOpen(true);
            }}
            title="View User"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              setUserToEdit(row);
              setEditFormData({
                first_name: row.first_name || "",
                last_name: row.last_name || "",
                role: row.role || "support",
                is_active: row.is_active ?? true,
              });
              setIsEditModalOpen(true);
            }}
            title="Edit User"
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout title="Users">
      <div className="space-y-4 md:space-y-8">
        {/* Stats Overview */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ROAMStatCard
            title="Total Users"
            value={userStats.total}
            icon={<Users className="w-5 h-5" />}
            changeText="5 new this month"
            changeType="positive"
            changeIcon={<TrendingUp className="w-3 h-3" />}
          />

          <ROAMStatCard
            title="Active Users"
            value={userStats.active}
            icon={<UserCheck className="w-5 h-5" />}
            changeText={`${Math.round((userStats.active / userStats.total) * 100)}% of total`}
            changeType="positive"
          />

          <ROAMStatCard
            title="Administrators"
            value={userStats.admins}
            icon={<Shield className="w-5 h-5" />}
            changeText="System Admins"
            changeType="neutral"
          />

          <ROAMStatCard
            title="Managers"
            value={userStats.managers}
            icon={<UserX className="w-5 h-5" />}
            changeText="Management team"
            changeType="neutral"
          />
        </div>

        <div className="space-y-4">
          {/* Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center bg-muted/30 p-3 sm:p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as "all" | UserStatus)
                }
                className="px-3 py-1 border border-border rounded-md text-sm bg-background"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Role:</label>
              <select
                value={roleFilter}
                onChange={(e) =>
                  setRoleFilter(e.target.value as "all" | UserRole)
                }
                className="px-3 py-1 border border-border rounded-md text-sm bg-background"
              >
                <option value="all">All</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="support">Support</option>
                <option value="analyst">Analyst</option>
              </select>
            </div>

            <div className="text-sm text-muted-foreground sm:ml-auto w-full sm:w-auto text-center sm:text-left">
              {loading
                ? "Loading..."
                : `Showing ${filteredUsers.length} of ${users.length} users`}
              {error && (
                <div className="text-orange-600 text-xs mt-1">{error}</div>
              )}
            </div>
          </div>

          {/* Users Table */}
          <ROAMDataTable
            title="Admin Users"
            columns={columns}
            data={loading ? [] : filteredUsers}
            searchable={true}
            filterable={false}
            addable={false}
            onAdd={() => setIsCreateModalOpen(true)}
            pageSize={10}
          />
        </div>
      </div>

      {/* User Details Modal */}
      <Dialog open={isUserDetailsOpen} onOpenChange={setIsUserDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-full flex items-center justify-center text-white font-semibold">
                {selectedUser
                  ? `${selectedUser.first_name?.[0] || ""}${selectedUser.last_name?.[0] || ""}`.toUpperCase() ||
                    "NA"
                  : "NA"}
              </div>
              User Details -{" "}
              {selectedUser
                ? `${selectedUser.first_name || ""} ${selectedUser.last_name || ""}`.trim() ||
                  "N/A"
                : "N/A"}
            </DialogTitle>
            <DialogDescription>
              View detailed information about this admin user including their
              profile, permissions, and activity.
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ROAMCard>
                  <ROAMCardHeader>
                    <ROAMCardTitle className="text-base">
                      Basic Information
                    </ROAMCardTitle>
                  </ROAMCardHeader>
                  <ROAMCardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Full Name
                        </div>
                        <div className="font-medium">
                          {`${selectedUser.first_name || ""} ${selectedUser.last_name || ""}`.trim() ||
                            "N/A"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Email
                        </div>
                        <div className="font-medium">{selectedUser.email}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Shield className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Role
                        </div>
                        <ROAMBadge
                          variant={getRoleBadgeVariant(selectedUser.role)}
                          className="mt-1"
                        >
                          {selectedUser.role.toUpperCase()}
                        </ROAMBadge>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <UserCheck className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Status
                        </div>
                        <ROAMBadge
                          variant={getStatusBadgeVariant(
                            selectedUser.is_active,
                          )}
                          className="mt-1"
                        >
                          {selectedUser.is_active ? "ACTIVE" : "INACTIVE"}
                        </ROAMBadge>
                      </div>
                    </div>
                  </ROAMCardContent>
                </ROAMCard>

                <ROAMCard>
                  <ROAMCardHeader>
                    <ROAMCardTitle className="text-base">
                      Activity Information
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
                          {new Date(selectedUser.created_at).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            },
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Last Login
                        </div>
                        <div className="font-medium">
                          {new Date(selectedUser.last_login).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          User ID
                        </div>
                        <div className="font-medium font-mono text-sm">
                          {selectedUser.id}
                        </div>
                      </div>
                    </div>
                  </ROAMCardContent>
                </ROAMCard>
              </div>

              {/* Permissions Summary */}
              <ROAMCard>
                <ROAMCardHeader>
                  <ROAMCardTitle className="text-base">
                    Role Permissions
                  </ROAMCardTitle>
                </ROAMCardHeader>
                <ROAMCardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {getRolePermissions(selectedUser.role).map(
                      (permission, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 p-2 bg-muted/50 rounded-md"
                        >
                          <div className="w-2 h-2 bg-roam-success rounded-full" />
                          <span className="text-sm">{permission}</span>
                        </div>
                      ),
                    )}
                  </div>
                </ROAMCardContent>
              </ROAMCard>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create User Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-roam-blue" />
              Create New User
            </DialogTitle>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              // Handle create user logic here
              setIsCreateModalOpen(false);
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" placeholder="Enter full name" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select required>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="support">Support</SelectItem>
                  <SelectItem value="analyst">Analyst</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select defaultValue="active" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-roam-blue hover:bg-roam-blue/90"
              >
                Create User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-roam-blue" />
              Edit User - {userToEdit?.name}
            </DialogTitle>
          </DialogHeader>

          {userToEdit && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                updateUser();
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-first-name">First Name</Label>
                  <Input
                    id="edit-first-name"
                    value={editFormData.first_name || ""}
                    onChange={(e) =>
                      setEditFormData((prev) => ({
                        ...prev,
                        first_name: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-last-name">Last Name</Label>
                  <Input
                    id="edit-last-name"
                    value={editFormData.last_name || ""}
                    onChange={(e) =>
                      setEditFormData((prev) => ({
                        ...prev,
                        last_name: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email">Email Address</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={userToEdit.email || ""}
                  readOnly
                  className="bg-gray-50 text-gray-500 cursor-not-allowed"
                  title="Email cannot be modified"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select
                  value={editFormData.role || "support"}
                  onValueChange={(value) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      role: value as UserRole,
                    }))
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="support">Support</SelectItem>
                    <SelectItem value="analyst">Analyst</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="edit-is-active"
                    checked={editFormData.is_active ?? true}
                    onChange={(e) =>
                      setEditFormData((prev) => ({
                        ...prev,
                        is_active: e.target.checked,
                      }))
                    }
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="edit-is-active">Active User</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Inactive users cannot access the admin panel
                </p>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setUserToEdit(null);
                    setEditFormData({
                      first_name: "",
                      last_name: "",
                      role: "support",
                      is_active: true,
                    });
                  }}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-roam-blue hover:bg-roam-blue/90"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
