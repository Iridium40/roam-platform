import { useState, useEffect, useRef } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import {
  ROAMCard,
  ROAMCardHeader,
  ROAMCardTitle,
  ROAMCardContent,
} from "@/components/ui/roam-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit,
  Save,
  X,
  Camera,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  permissions: any[]; // jsonb field
  is_active: boolean;
  created_at: string;
  image_url?: string;
  first_name?: string;
  last_name?: string;
  role: string;
}

export default function AdminProfile() {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { user } = useAuth();

  // Form state for editing
  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    role: "",
    is_active: true,
    image_url: "",
  });

  // Fetch admin user profile
  const fetchAdminUser = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.id) {
        setError("No authenticated user found");
        return;
      }

      const { data, error } = await supabase
        .from("admin_users")
        .select("*")
        .eq("user_id", user.id);

      if (error) {
        console.error(
          "Error fetching admin user - table may not exist or user not found",
        );
        setError("Admin profile not available - using default profile");
        // Create a default admin user object
        const defaultAdmin = {
          id: user.id,
          user_id: user.id,
          email: user.email || "",
          first_name: "",
          last_name: "",
          permissions: [],
          is_active: true,
          role: "admin",
          created_at: new Date().toISOString(),
        };
        setAdminUser(defaultAdmin);
        setEditForm({
          first_name: "",
          last_name: "",
          email: user.email || "",
          role: "admin",
          is_active: true,
          image_url: "",
        });
        return;
      }

      if (!data || data.length === 0) {
        // No admin user found, create default
        const defaultAdmin = {
          id: user.id,
          user_id: user.id,
          email: user.email || "",
          first_name: "",
          last_name: "",
          permissions: [],
          is_active: true,
          role: "admin",
          created_at: new Date().toISOString(),
        };
        setAdminUser(defaultAdmin);
        setEditForm({
          first_name: "",
          last_name: "",
          email: user.email || "",
          role: "admin",
          is_active: true,
          image_url: "",
        });
        return;
      }

      const adminData = Array.isArray(data) ? data[0] : data;

      setAdminUser(adminData);
      // Initialize edit form with current data
      setEditForm({
        first_name: adminData.first_name || "",
        last_name: adminData.last_name || "",
        email: adminData.email || "",
        role: adminData.role || "",
        is_active: adminData.is_active ?? true,
        image_url: adminData.image_url || "",
      });
    } catch (error: any) {
      setError("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  // Save profile changes
  const saveProfile = async () => {
    try {
      setSaving(true);
      setError(null);

      const { error } = await supabase
        .from("admin_users")
        .update({
          first_name: editForm.first_name,
          last_name: editForm.last_name,
          email: editForm.email,
          role: editForm.role,
          is_active: editForm.is_active,
          image_url: editForm.image_url,
        })
        .eq("user_id", user?.id);

      if (error) throw error;

      setSuccessMessage("Profile updated successfully");
      setTimeout(() => setSuccessMessage(null), 3000);
      setIsEditing(false);
      await fetchAdminUser();
    } catch (error: any) {
      const errorMessage =
        error?.message || error?.error?.message || JSON.stringify(error);
      setError(`Error updating profile: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  // Avatar upload function
  const uploadAvatar = async (file: File) => {
    try {
      setAvatarUploading(true);
      setError(null);

      if (!user?.id) {
        setError("No authenticated user found");
        return;
      }

      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError("Please select a valid image file");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size must be less than 5MB");
        return;
      }

      // Create unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatar-admin-user/${fileName}`;

      // Convert file to base64
      const reader = new FileReader();
      const fileDataPromise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const base64String = reader.result as string;
          const base64Data = base64String.split(',')[1]; // Remove data:image/...;base64, prefix
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const fileData = await fileDataPromise;

      // Upload via server-side endpoint (uses service role key to bypass RLS)
      const uploadResponse = await fetch('/api/storage/upload-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileData,
          fileName,
          filePath,
          mimeType: file.type,
          adminUserId: adminUser?.id,
          userId: user.id,
          imageType: 'admin-avatar'
        }),
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const uploadResult = await uploadResponse.json();

      if (!uploadResult.success || !uploadResult.publicUrl) {
        throw new Error('Failed to get image URL from upload response');
      }

      const publicUrl = uploadResult.publicUrl;

      // Update or create admin user record with new image URL

      // First try to update existing record
      const { data: updateResult, error: updateError } = await supabase
        .from("admin_users")
        .update({ image_url: publicUrl })
        .eq("user_id", user.id)
        .select();


      if (updateError) {
        console.error("Update error:", {
          message: updateError.message,
          code: updateError.code,
          details: updateError.details,
          hint: updateError.hint,
        });
        const errorMessage =
          updateError.message ||
          JSON.stringify(updateError) ||
          "Unknown update error";
        setError(`Failed to update profile: ${errorMessage}`);
        return;
      }

      // If no rows were updated, create a new admin user record
      if (!updateResult || updateResult.length === 0) {

        const { data: insertResult, error: insertError } = await supabase
          .from("admin_users")
          .insert({
            user_id: user.id,
            email: user.email || "",
            image_url: publicUrl,
            role: "admin",
            is_active: true,
            permissions: [],
          })
          .select();


        if (insertError) {
          console.error("Insert error:", {
            message: insertError.message,
            code: insertError.code,
            details: insertError.details,
            hint: insertError.hint,
          });
          const errorMessage =
            insertError.message ||
            JSON.stringify(insertError) ||
            "Unknown insert error";
          setError(`Failed to create admin profile: ${errorMessage}`);
          return;
        }

        // Update local state with new admin user
        if (insertResult && insertResult.length > 0) {
          setAdminUser(insertResult[0]);
        }
      }

      // Update local state with cache-busting URL
      const cacheBustedUrl = `${publicUrl}?t=${Date.now()}`;
      if (adminUser) {
        setAdminUser({ ...adminUser, image_url: cacheBustedUrl });
        setEditForm({ ...editForm, image_url: cacheBustedUrl });
      }


      setSuccessMessage("Avatar updated successfully");
      setTimeout(() => setSuccessMessage(null), 3000);

      // Force refresh admin user data from database
      await fetchAdminUser();
    } catch (err: any) {
      const errorMessage =
        err?.message || JSON.stringify(err) || "Unknown error occurred";
      setError(`Failed to upload avatar: ${errorMessage}`);
    } finally {
      setAvatarUploading(false);
    }
  };

  // Avatar remove function
  const removeAvatar = async () => {
    try {
      setAvatarUploading(true);
      setError(null);

      if (!user?.id || !adminUser?.image_url) {
        return;
      }

      // Extract file path from URL
      const url = new URL(adminUser.image_url);
      const pathParts = url.pathname.split("/");
      const filePath = pathParts.slice(-2).join("/"); // Get "avatar-admin-user/filename"

      // Remove from Supabase storage
      const { error: deleteError } = await supabase.storage
        .from("roam-file-storage")
        .remove([filePath]);

      if (deleteError) {
        // Continue even if file deletion fails (file might not exist)
      }

      // Update admin user record to remove image URL
      const { error: updateError } = await supabase
        .from("admin_users")
        .update({ image_url: null })
        .eq("user_id", user.id);

      if (updateError) {
        const errorMessage =
          updateError.message ||
          JSON.stringify(updateError) ||
          "Unknown update error";
        setError(`Failed to update profile: ${errorMessage}`);
        return;
      }

      // Update local state
      if (adminUser) {
        setAdminUser({ ...adminUser, image_url: undefined });
        setEditForm({ ...editForm, image_url: "" });
      }

      setSuccessMessage("Avatar removed successfully");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      const errorMessage =
        err?.message || JSON.stringify(err) || "Unknown error occurred";
      setError(`Failed to remove avatar: ${errorMessage}`);
    } finally {
      setAvatarUploading(false);
    }
  };

  // Handle file input change
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadAvatar(file);
    }
    // Reset input value so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
    if (adminUser) {
      setEditForm({
        first_name: adminUser.first_name || "",
        last_name: adminUser.last_name || "",
        email: adminUser.email || "",
        role: adminUser.role || "",
        is_active: adminUser.is_active ?? true,
        image_url: adminUser.image_url || "",
      });
    }
  };

  const getInitials = () => {
    if (adminUser) {
      return `${adminUser.first_name?.[0] || ""}${
        adminUser.last_name?.[0] || ""
      }`.toUpperCase();
    }
    return user?.email?.[0]?.toUpperCase() || "U";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  useEffect(() => {
    fetchAdminUser();
  }, [user]);

  if (loading) {
    return (
      <AdminLayout title="Profile">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-roam-blue" />
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error && !adminUser) {
    return (
      <AdminLayout title="Profile">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Failed to Load Profile
              </h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md">
                {error}
              </p>
              <Button onClick={fetchAdminUser} variant="outline">
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
    <AdminLayout title="Profile">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">My Profile</h1>
            <p className="text-muted-foreground mt-1">
              Manage your account settings and personal information
            </p>
          </div>
          <div className="flex gap-3">
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)} size="sm">
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button onClick={cancelEditing} variant="outline" size="sm">
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={saveProfile} disabled={saving} size="sm">
                  {saving ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
            <CheckCircle className="w-5 h-5" />
            <span>{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            <AlertTriangle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Overview */}
          <div className="lg:col-span-1">
            <ROAMCard>
              <ROAMCardHeader>
                <ROAMCardTitle>Profile Overview</ROAMCardTitle>
              </ROAMCardHeader>
              <ROAMCardContent>
                <div className="text-center space-y-4">
                  <div className="relative">
                    <Avatar className="w-24 h-24 mx-auto">
                      <AvatarImage
                        src={adminUser?.image_url}
                        onError={(e) => {
                          console.error(
                            "Avatar image failed to load:",
                            adminUser?.image_url,
                          );
                        }}
                        onLoad={() => {
                          console.log(
                            "Avatar image loaded successfully:",
                            adminUser?.image_url,
                          );
                        }}
                      />
                      <AvatarFallback className="text-lg">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>

                    {/* Hidden file input */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="image/*"
                      className="hidden"
                    />

                    {/* Upload button */}
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute bottom-0 right-1/2 transform translate-x-1/2 translate-y-1/2 rounded-full"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={avatarUploading}
                    >
                      {avatarUploading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4" />
                      )}
                    </Button>

                    {/* Remove button - only show if avatar exists */}
                    {adminUser?.image_url && (
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute top-0 right-1/2 transform translate-x-1/2 -translate-y-1/2 rounded-full"
                        onClick={removeAvatar}
                        disabled={avatarUploading}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold">
                      {adminUser?.first_name} {adminUser?.last_name}
                    </h3>
                    <p className="text-muted-foreground">{adminUser?.email}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {adminUser?.role || "Administrator"}
                    </p>
                  </div>

                  <div className="pt-4 border-t space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Status:</span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          adminUser?.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {adminUser?.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    {adminUser?.hire_date && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Joined:</span>
                        <span>{formatDate(adminUser.hire_date)}</span>
                      </div>
                    )}
                    {adminUser?.last_login && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Last Login:
                        </span>
                        <span>{formatDate(adminUser.last_login)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </ROAMCardContent>
            </ROAMCard>
          </div>

          {/* Profile Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <ROAMCard>
              <ROAMCardHeader>
                <ROAMCardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Personal Information
                </ROAMCardTitle>
              </ROAMCardHeader>
              <ROAMCardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="first_name">First Name</Label>
                    {isEditing ? (
                      <Input
                        id="first_name"
                        value={editForm.first_name}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            first_name: e.target.value,
                          })
                        }
                        placeholder="Enter first name"
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1">
                        {adminUser?.first_name || "Not provided"}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="last_name">Last Name</Label>
                    {isEditing ? (
                      <Input
                        id="last_name"
                        value={editForm.last_name}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            last_name: e.target.value,
                          })
                        }
                        placeholder="Enter last name"
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1">
                        {adminUser?.last_name || "Not provided"}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {adminUser?.email}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Email cannot be changed from profile
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="role">Role</Label>
                    {isEditing ? (
                      <Select
                        value={editForm.role}
                        onValueChange={(value) =>
                          setEditForm({ ...editForm, role: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="support">Support</SelectItem>
                          <SelectItem value="analyst">Analyst</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1">
                        {adminUser?.role
                          ? adminUser.role.charAt(0).toUpperCase() +
                            adminUser.role.slice(1)
                          : "Not provided"}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="is_active">Account Status</Label>
                    {isEditing ? (
                      <div className="flex items-center space-x-2 mt-1">
                        <Switch
                          id="is_active"
                          checked={editForm.is_active}
                          onCheckedChange={(checked) =>
                            setEditForm({ ...editForm, is_active: checked })
                          }
                        />
                        <Label htmlFor="is_active" className="text-sm">
                          Active Account
                        </Label>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1">
                        {adminUser?.is_active ? "Active" : "Inactive"}
                      </p>
                    )}
                  </div>
                </div>
              </ROAMCardContent>
            </ROAMCard>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
