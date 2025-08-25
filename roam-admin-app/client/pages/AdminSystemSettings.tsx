import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import {
  ROAMCard,
  ROAMCardHeader,
  ROAMCardTitle,
  ROAMCardContent,
} from "@/components/ui/roam-card";
import { ROAMBadge } from "@/components/ui/roam-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings,
  Database,
  Mail,
  Shield,
  Globe,
  CreditCard,
  Key,
  Server,
  RefreshCw,
  AlertTriangle,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  Edit,
  X,
  Plus,
  Image,
  Upload,
  Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface SystemConfig {
  id: string;
  config_key: string;
  config_value: string | null;
  description: string | null;
  data_type: string;
  is_public: boolean;
  config_group: string | null;
  is_encrypted: boolean;
  created_at: string;
  updated_at: string;
}

interface GroupedConfigs {
  [group: string]: SystemConfig[];
}

const getGroupIcon = (group: string) => {
  switch (group?.toLowerCase()) {
    case "database":
      return <Database className="w-5 h-5" />;
    case "email":
      return <Mail className="w-5 h-5" />;
    case "authentication":
      return <Shield className="w-5 h-5" />;
    case "api":
      return <Globe className="w-5 h-5" />;
    case "payment":
      return <CreditCard className="w-5 h-5" />;
    case "storage":
      return <Server className="w-5 h-5" />;
    case "brand":
      return <Globe className="w-5 h-5" />;
    default:
      return <Settings className="w-5 h-5" />;
  }
};

const getGroupColor = (group: string) => {
  switch (group?.toLowerCase()) {
    case "database":
      return "bg-blue-500/10 text-blue-600 border-blue-200";
    case "email":
      return "bg-green-500/10 text-green-600 border-green-200";
    case "authentication":
      return "bg-red-500/10 text-red-600 border-red-200";
    case "api":
      return "bg-purple-500/10 text-purple-600 border-purple-200";
    case "payment":
      return "bg-yellow-500/10 text-yellow-600 border-yellow-200";
    case "storage":
      return "bg-indigo-500/10 text-indigo-600 border-indigo-200";
    case "brand":
      return "bg-orange-500/10 text-orange-600 border-orange-200";
    default:
      return "bg-gray-500/10 text-gray-600 border-gray-200";
  }
};

function AdminSystemSettings() {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>(
    {},
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editingConfigs, setEditingConfigs] = useState<Record<string, boolean>>(
    {},
  );
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Brand-specific state
  const [uploadingImages, setUploadingImages] = useState<
    Record<string, boolean>
  >({});
  const [imagePreview, setImagePreview] = useState<Record<string, string>>({});

  // New setting image upload state
  const [uploadingNewImage, setUploadingNewImage] = useState(false);
  const [newImagePreview, setNewImagePreview] = useState<string>("");

  // Form state for adding new configuration
  const [newConfigData, setNewConfigData] = useState({
    config_key: "",
    config_value: "",
    description: "",
    data_type: "string",
    is_public: false,
    config_group: "",
    is_encrypted: false,
  });

  const dataTypes = [
    "string",
    "number",
    "boolean",
    "json",
    "password",
    "url",
    "email",
    "image",
  ];
  const configGroups = [
    "Database",
    "API",
    "Authentication",
    "Email",
    "Storage",
    "Payment",
    "Brand",
    "General",
  ];

  // Fetch system configs from Supabase
  const fetchSystemConfigs = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("system_config")
        .select("*")
        .order("config_group", { ascending: true })
        .order("config_key", { ascending: true });

      if (error) {
        console.error("Error fetching system configs:", error);
        setError(
          `System Config Query Error: ${error.message}. You may need to create RLS policy: CREATE POLICY "Allow anon read access" ON public.system_config FOR SELECT USING (true);`,
        );
        return;
      }

      console.log(`Fetched ${data?.length || 0} system configs`);
      setConfigs(data || []);

      // Initialize edited values with current values
      const initialValues: Record<string, string> = {};
      data?.forEach((config) => {
        initialValues[config.id] = config.config_value || "";
      });
      setEditedValues(initialValues);
    } catch (error) {
      console.error("Error in fetchSystemConfigs:", error);
      setError("Failed to fetch system configuration data");
    } finally {
      setLoading(false);
    }
  };

  const saveConfigValue = async (config: SystemConfig) => {
    try {
      setSaving((prev) => ({ ...prev, [config.id]: true }));

      const { error } = await supabase
        .from("system_config")
        .update({
          config_value: editedValues[config.id],
          updated_at: new Date().toISOString(),
        })
        .eq("id", config.id);

      if (error) throw error;

      setSuccessMessage(`${config.config_key} updated successfully`);
      setTimeout(() => setSuccessMessage(null), 3000);

      // Exit edit mode and refresh data
      setEditingConfigs((prev) => ({ ...prev, [config.id]: false }));
      await fetchSystemConfigs();
    } catch (error: any) {
      console.error("Error saving config:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setSaving((prev) => ({ ...prev, [config.id]: false }));
    }
  };

  const startEditing = (config: SystemConfig) => {
    setEditingConfigs((prev) => ({ ...prev, [config.id]: true }));
  };

  const cancelEditing = (config: SystemConfig) => {
    setEditingConfigs((prev) => ({ ...prev, [config.id]: false }));
    // Reset to original value
    setEditedValues((prev) => ({
      ...prev,
      [config.id]: config.config_value || "",
    }));
  };

  const createNewConfig = async () => {
    try {
      if (!newConfigData.config_key.trim()) {
        alert("Please provide a configuration key");
        return;
      }

      const { error } = await supabase
        .from("system_config")
        .insert([newConfigData]);

      if (error) throw error;

      setSuccessMessage("New configuration created successfully");
      setTimeout(() => setSuccessMessage(null), 3000);

      setIsAddModalOpen(false);
      resetNewConfigForm();
      await fetchSystemConfigs();
    } catch (error: any) {
      console.error("Error creating config:", error);
      alert(`Error: ${error.message}`);
    }
  };

  const resetNewConfigForm = () => {
    setNewConfigData({
      config_key: "",
      config_value: "",
      description: "",
      data_type: "string",
      is_public: false,
      config_group: "",
      is_encrypted: false,
    });
    // Clear image upload state
    setNewImagePreview("");
    setUploadingNewImage(false);
  };

  const refreshData = async () => {
    await fetchSystemConfigs();
  };

  const toggleSensitiveVisibility = (configId: string) => {
    setShowSensitive((prev) => ({
      ...prev,
      [configId]: !prev[configId],
    }));
  };

  const handleValueChange = (configId: string, value: string) => {
    setEditedValues((prev) => ({
      ...prev,
      [configId]: value,
    }));
  };

  const hasChanges = (config: SystemConfig) => {
    return editedValues[config.id] !== (config.config_value || "");
  };

  // Image upload function for brand assets
  const handleImageUpload = async (file: File, configKey: string) => {
    try {
      setUploadingImages((prev) => ({ ...prev, [configKey]: true }));

      // Create file path
      const fileExt = file.name.split(".").pop();
      const fileName = `${configKey}-${Date.now()}.${fileExt}`;
      const filePath = `brand-assets/${fileName}`;

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from("roam-file-storage")
        .upload(filePath, file);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("roam-file-storage").getPublicUrl(filePath);

      // Update or create the config entry
      const existingConfig = configs.find((c) => c.config_key === configKey);

      if (existingConfig) {
        // Update existing config
        const { error: updateError } = await supabase
          .from("system_config")
          .update({
            config_value: publicUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingConfig.id);

        if (updateError) throw updateError;
      } else {
        // Create new config
        const { error: insertError } = await supabase
          .from("system_config")
          .insert({
            config_key: configKey,
            config_value: publicUrl,
            description:
              configKey === "site_favicon"
                ? "Site favicon URL"
                : "Site logo URL",
            data_type: "url",
            is_public: true,
            config_group: "Brand",
            is_encrypted: false,
          });

        if (insertError) throw insertError;
      }

      // Set preview
      setImagePreview((prev) => ({ ...prev, [configKey]: publicUrl }));

      // Refresh configs to show updated data
      await fetchSystemConfigs();

      setSuccessMessage(
        `${configKey === "site_favicon" ? "Favicon" : "Logo"} uploaded successfully!`,
      );
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      console.error("Error uploading image:", error);
      setError(
        `Failed to upload ${configKey === "site_favicon" ? "favicon" : "logo"}: ${error.message}`,
      );
      setTimeout(() => setError(null), 5000);
    } finally {
      setUploadingImages((prev) => ({ ...prev, [configKey]: false }));
    }
  };

  // Remove image function
  const handleImageRemove = async (configKey: string) => {
    try {
      const config = configs.find((c) => c.config_key === configKey);
      if (!config) return;

      // Remove from storage if URL exists
      if (config.config_value) {
        const urlParts = config.config_value.split("/");
        const fileName = urlParts[urlParts.length - 1];
        const filePath = `brand-assets/${fileName}`;

        await supabase.storage.from("roam-file-storage").remove([filePath]);
      }

      // Update config to null
      const { error } = await supabase
        .from("system_config")
        .update({
          config_value: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", config.id);

      if (error) throw error;

      // Clear preview
      setImagePreview((prev) => ({ ...prev, [configKey]: "" }));

      // Refresh configs
      await fetchSystemConfigs();

      setSuccessMessage(
        `${configKey === "site_favicon" ? "Favicon" : "Logo"} removed successfully!`,
      );
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      console.error("Error removing image:", error);
      setError(
        `Failed to remove ${configKey === "site_favicon" ? "favicon" : "logo"}: ${error.message}`,
      );
      setTimeout(() => setError(null), 5000);
    }
  };

  // Image upload function for new settings
  const handleNewSettingImageUpload = async (file: File) => {
    try {
      setUploadingNewImage(true);

      // Create file path
      const fileExt = file.name.split(".").pop();
      const fileName = `${newConfigData.config_key || "new-setting"}-${Date.now()}.${fileExt}`;
      const filePath = `system-settings/${fileName}`;

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from("roam-file-storage")
        .upload(filePath, file);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("roam-file-storage").getPublicUrl(filePath);

      // Set the URL as the config value
      setNewConfigData((prev) => ({ ...prev, config_value: publicUrl }));
      setNewImagePreview(publicUrl);

      setSuccessMessage("Image uploaded successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      console.error("Error uploading image:", error);
      setError(`Failed to upload image: ${error.message}`);
      setTimeout(() => setError(null), 5000);
    } finally {
      setUploadingNewImage(false);
    }
  };

  // Remove new setting image
  const handleNewSettingImageRemove = async () => {
    try {
      if (newConfigData.config_value) {
        const urlParts = newConfigData.config_value.split("/");
        const fileName = urlParts[urlParts.length - 1];
        const filePath = `system-settings/${fileName}`;

        await supabase.storage.from("roam-file-storage").remove([filePath]);
      }

      setNewConfigData((prev) => ({ ...prev, config_value: "" }));
      setNewImagePreview("");

      setSuccessMessage("Image removed successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      console.error("Error removing image:", error);
      setError(`Failed to remove image: ${error.message}`);
      setTimeout(() => setError(null), 5000);
    }
  };

  useEffect(() => {
    fetchSystemConfigs();
  }, []);

  // Group configs by config_group
  const groupedConfigs: GroupedConfigs = configs.reduce((acc, config) => {
    const group = config.config_group || "General";
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(config);
    return acc;
  }, {} as GroupedConfigs);

  const renderConfigValue = (config: SystemConfig) => {
    const isEditing = editingConfigs[config.id];
    const isBoolean = config.data_type === "boolean";
    const isSensitive = config.is_encrypted || config.data_type === "password";
    const currentValue = editedValues[config.id] || "";

    // Read-only display
    if (!isEditing) {
      if (isBoolean) {
        return (
          <div className="flex items-center space-x-2">
            <Switch checked={currentValue === "true"} disabled={true} />
            <span className="text-sm text-muted-foreground">
              {currentValue === "true" ? "Enabled" : "Disabled"}
            </span>
          </div>
        );
      }

      if (isSensitive) {
        return (
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground">
              {showSensitive[config.id] ? currentValue : "••••••••"}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => toggleSensitiveVisibility(config.id)}
            >
              {showSensitive[config.id] ? (
                <EyeOff className="h-3 w-3" />
              ) : (
                <Eye className="h-3 w-3" />
              )}
            </Button>
          </div>
        );
      }

      return (
        <span className="text-sm text-muted-foreground font-mono">
          {currentValue || <span className="italic">No value set</span>}
        </span>
      );
    }

    // Edit mode
    if (isBoolean) {
      return (
        <div className="flex items-center space-x-2">
          <Switch
            id={config.id}
            checked={currentValue === "true"}
            onCheckedChange={(checked) =>
              handleValueChange(config.id, checked ? "true" : "false")
            }
          />
          <Label htmlFor={config.id} className="text-sm">
            {currentValue === "true" ? "Enabled" : "Disabled"}
          </Label>
        </div>
      );
    }

    if (config.data_type === "json") {
      return (
        <Textarea
          value={currentValue}
          onChange={(e) => handleValueChange(config.id, e.target.value)}
          placeholder="Enter JSON configuration"
          rows={4}
          className="font-mono text-sm"
        />
      );
    }

    return (
      <div className="relative">
        <Input
          type={isSensitive && !showSensitive[config.id] ? "password" : "text"}
          value={currentValue}
          onChange={(e) => handleValueChange(config.id, e.target.value)}
          placeholder={`Enter ${config.data_type} value`}
          className={isSensitive ? "pr-10" : ""}
        />
        {isSensitive && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6"
            onClick={() => toggleSensitiveVisibility(config.id)}
          >
            {showSensitive[config.id] ? (
              <EyeOff className="h-3 w-3" />
            ) : (
              <Eye className="h-3 w-3" />
            )}
          </Button>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <AdminLayout title="System Settings">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-roam-blue" />
            <p className="text-muted-foreground">Loading system settings...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="System Settings">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Failed to Load System Settings
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
    <AdminLayout title="System Settings">
      <div className="space-y-8">
        {/* Header with Action Buttons */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">System Settings</h1>
            <p className="text-muted-foreground mt-1">
              Manage system configuration and application settings
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setIsAddModalOpen(true)}
              variant="default"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Setting
            </Button>
            <Button onClick={refreshData} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Settings
            </Button>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
            <CheckCircle className="w-5 h-5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Settings Groups */}
        <div className="space-y-6">
          {Object.entries(groupedConfigs).map(([group, groupConfigs]) => (
            <ROAMCard key={group}>
              <ROAMCardHeader>
                <ROAMCardTitle className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getGroupColor(group)}`}>
                    {getGroupIcon(group)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{group} Settings</h3>
                    <p className="text-sm text-muted-foreground font-normal">
                      {groupConfigs.length} configuration
                      {groupConfigs.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </ROAMCardTitle>
              </ROAMCardHeader>
              <ROAMCardContent>
                {group.toLowerCase() === "brand" ? (
                  // Special Brand Settings UI
                  <div className="space-y-6">
                    {/* Favicon Upload */}
                    <div className="p-4 border border-border rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <Label className="text-sm font-medium">
                            Site Favicon
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            Upload a favicon for your site (recommended: 32x32px
                            ICO or PNG)
                          </p>
                        </div>
                        <ROAMBadge variant="outline" size="sm">
                          <Image className="w-3 h-3 mr-1" />
                          Image
                        </ROAMBadge>
                      </div>

                      <div className="flex items-center gap-4">
                        {(() => {
                          const faviconConfig = configs.find(
                            (c) => c.config_key === "site_favicon",
                          );
                          const currentFavicon =
                            imagePreview.site_favicon ||
                            faviconConfig?.config_value;

                          return currentFavicon ? (
                            <div className="flex items-center gap-3">
                              <img
                                src={currentFavicon}
                                alt="Current favicon"
                                className="w-8 h-8 border border-border rounded"
                              />
                              <div className="text-sm text-muted-foreground">
                                Current favicon
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleImageRemove("site_favicon")
                                }
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              No favicon set
                            </div>
                          );
                        })()}

                        <div className="flex-1" />

                        <div className="relative">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload(file, "site_favicon");
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            disabled={uploadingImages.site_favicon}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={uploadingImages.site_favicon}
                          >
                            {uploadingImages.site_favicon ? (
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Upload className="w-4 h-4 mr-2" />
                            )}
                            Upload Favicon
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Logo Upload */}
                    <div className="p-4 border border-border rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <Label className="text-sm font-medium">
                            Site Logo
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            Upload a logo for your site (recommended: PNG with
                            transparent background)
                          </p>
                        </div>
                        <ROAMBadge variant="outline" size="sm">
                          <Image className="w-3 h-3 mr-1" />
                          Image
                        </ROAMBadge>
                      </div>

                      <div className="flex items-center gap-4">
                        {(() => {
                          const logoConfig = configs.find(
                            (c) => c.config_key === "site_logo",
                          );
                          const currentLogo =
                            imagePreview.site_logo || logoConfig?.config_value;

                          return currentLogo ? (
                            <div className="flex items-center gap-3">
                              <img
                                src={currentLogo}
                                alt="Current logo"
                                className="h-12 max-w-24 object-contain border border-border rounded"
                              />
                              <div className="text-sm text-muted-foreground">
                                Current logo
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleImageRemove("site_logo")}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              No logo set
                            </div>
                          );
                        })()}

                        <div className="flex-1" />

                        <div className="relative">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload(file, "site_logo");
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            disabled={uploadingImages.site_logo}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={uploadingImages.site_logo}
                          >
                            {uploadingImages.site_logo ? (
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Upload className="w-4 h-4 mr-2" />
                            )}
                            Upload Logo
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Regular config rendering
                  <div className="space-y-6">
                    {groupConfigs.map((config) => (
                      <div
                        key={config.id}
                        className="space-y-3 p-4 border border-border rounded-lg"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <Label
                              htmlFor={config.id}
                              className="text-sm font-medium"
                            >
                              {config.config_key
                                .replace(/_/g, " ")
                                .replace(/\b\w/g, (l) => l.toUpperCase())}
                            </Label>
                            {config.description && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {config.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <ROAMBadge variant="outline" size="sm">
                              {config.data_type}
                            </ROAMBadge>
                            {config.is_public && (
                              <ROAMBadge variant="secondary" size="sm">
                                <Globe className="w-3 h-3 mr-1" />
                                Public
                              </ROAMBadge>
                            )}
                            {config.is_encrypted && (
                              <ROAMBadge variant="warning" size="sm">
                                <Key className="w-3 h-3 mr-1" />
                                Encrypted
                              </ROAMBadge>
                            )}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              {renderConfigValue(config)}
                            </div>

                            {!editingConfigs[config.id] && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEditing(config)}
                              >
                                <Edit className="w-3 h-3 mr-2" />
                                Edit
                              </Button>
                            )}
                          </div>

                          {editingConfigs[config.id] && (
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => cancelEditing(config)}
                              >
                                <X className="w-3 h-3 mr-2" />
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => saveConfigValue(config)}
                                disabled={saving[config.id]}
                              >
                                {saving[config.id] ? (
                                  <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                                ) : (
                                  <Save className="w-3 h-3 mr-2" />
                                )}
                                Save Changes
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ROAMCardContent>
            </ROAMCard>
          ))}
        </div>

        {configs.length === 0 && (
          <div className="text-center py-12">
            <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No System Settings Found
            </h3>
            <p className="text-muted-foreground">
              No configuration settings are currently available.
            </p>
          </div>
        )}

        {/* Add New Setting Modal */}
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-roam-blue" />
                Add New System Setting
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="new_config_key">Configuration Key *</Label>
                <Input
                  id="new_config_key"
                  value={newConfigData.config_key}
                  onChange={(e) =>
                    setNewConfigData({
                      ...newConfigData,
                      config_key: e.target.value,
                    })
                  }
                  placeholder="e.g., database_url, api_key, smtp_host"
                />
              </div>

              <div>
                <Label htmlFor="new_config_value">Configuration Value</Label>
                {newConfigData.data_type === "password" ||
                newConfigData.is_encrypted ? (
                  <Input
                    id="new_config_value"
                    type="password"
                    value={newConfigData.config_value}
                    onChange={(e) =>
                      setNewConfigData({
                        ...newConfigData,
                        config_value: e.target.value,
                      })
                    }
                    placeholder="Enter sensitive value"
                  />
                ) : newConfigData.data_type === "json" ? (
                  <Textarea
                    id="new_config_value"
                    value={newConfigData.config_value}
                    onChange={(e) =>
                      setNewConfigData({
                        ...newConfigData,
                        config_value: e.target.value,
                      })
                    }
                    placeholder="Enter JSON configuration"
                    rows={4}
                    className="font-mono text-sm"
                  />
                ) : newConfigData.data_type === "image" ? (
                  <div className="space-y-3">
                    {/* Image Upload Interface */}
                    <div className="p-4 border border-border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-sm font-medium">
                          Upload Image
                        </Label>
                        <ROAMBadge variant="outline" size="sm">
                          <Image className="w-3 h-3 mr-1" />
                          Image File
                        </ROAMBadge>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Image Preview */}
                        {newImagePreview ? (
                          <div className="flex items-center gap-3">
                            <img
                              src={newImagePreview}
                              alt="Uploaded image"
                              className="h-16 max-w-24 object-contain border border-border rounded"
                            />
                            <div className="text-sm text-muted-foreground">
                              Image uploaded
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleNewSettingImageRemove}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            No image selected
                          </div>
                        )}

                        <div className="flex-1" />

                        {/* Upload Button */}
                        <div className="relative">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleNewSettingImageUpload(file);
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            disabled={uploadingNewImage}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={uploadingNewImage}
                          >
                            {uploadingNewImage ? (
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Upload className="w-4 h-4 mr-2" />
                            )}
                            {newImagePreview ? "Replace Image" : "Upload Image"}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* URL Display (read-only) */}
                    <div>
                      <Label className="text-sm text-muted-foreground">
                        Image URL (auto-generated)
                      </Label>
                      <Input
                        value={newConfigData.config_value}
                        readOnly
                        placeholder="URL will be generated after upload"
                        className="mt-1 bg-gray-50 text-sm"
                      />
                    </div>
                  </div>
                ) : (
                  <Input
                    id="new_config_value"
                    value={newConfigData.config_value}
                    onChange={(e) =>
                      setNewConfigData({
                        ...newConfigData,
                        config_value: e.target.value,
                      })
                    }
                    placeholder="Enter configuration value"
                  />
                )}
              </div>

              <div>
                <Label htmlFor="new_description">Description</Label>
                <Textarea
                  id="new_description"
                  value={newConfigData.description}
                  onChange={(e) =>
                    setNewConfigData({
                      ...newConfigData,
                      description: e.target.value,
                    })
                  }
                  placeholder="Describe what this configuration is used for"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="new_data_type">Data Type</Label>
                  <Select
                    value={newConfigData.data_type}
                    onValueChange={(value) =>
                      setNewConfigData({ ...newConfigData, data_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dataTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="new_config_group">Configuration Group</Label>
                  <Select
                    value={newConfigData.config_group}
                    onValueChange={(value) =>
                      setNewConfigData({
                        ...newConfigData,
                        config_group: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select group" />
                    </SelectTrigger>
                    <SelectContent>
                      {configGroups.map((group) => (
                        <SelectItem key={group} value={group}>
                          {group}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="new_is_public"
                    checked={newConfigData.is_public}
                    onChange={(e) =>
                      setNewConfigData({
                        ...newConfigData,
                        is_public: e.target.checked,
                      })
                    }
                  />
                  <Label htmlFor="new_is_public">Public Access</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="new_is_encrypted"
                    checked={newConfigData.is_encrypted}
                    onChange={(e) =>
                      setNewConfigData({
                        ...newConfigData,
                        is_encrypted: e.target.checked,
                      })
                    }
                  />
                  <Label htmlFor="new_is_encrypted">Encrypted/Sensitive</Label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    resetNewConfigForm();
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={createNewConfig}>
                  <Plus className="w-3 h-3 mr-2" />
                  Create Setting
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

export default AdminSystemSettings;
