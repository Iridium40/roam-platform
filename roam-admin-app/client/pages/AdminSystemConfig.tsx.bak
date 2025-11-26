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
  Settings,
  Key,
  Database,
  Shield,
  Globe,
  Lock,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Plus,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

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

const dataTypes = [
  "string",
  "number",
  "boolean",
  "json",
  "password",
  "url",
  "email",
];
const configGroups = [
  "Database",
  "API",
  "Authentication",
  "Email",
  "Storage",
  "Payment",
  "General",
];

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
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

export default function AdminSystemConfig() {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedConfig, setSelectedConfig] = useState<SystemConfig | null>(
    null,
  );
  const [isConfigDetailsOpen, setIsConfigDetailsOpen] = useState(false);
  const [isCreateEditOpen, setIsCreateEditOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SystemConfig | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<SystemConfig | null>(
    null,
  );
  const [showSensitiveValues, setShowSensitiveValues] = useState<
    Record<string, boolean>
  >({});

  // Form state for create/edit
  const [formData, setFormData] = useState<Partial<SystemConfig>>({
    config_key: "",
    config_value: "",
    description: "",
    data_type: "string",
    is_public: false,
    config_group: "",
    is_encrypted: false,
  });

  // Filter state
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [publicFilter, setPublicFilter] = useState<
    "all" | "public" | "private"
  >("all");

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

      setConfigs(data || []);
    } catch (error) {
      console.error("Error in fetchSystemConfigs:", error);
      setError("Failed to fetch system configuration data");
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    await fetchSystemConfigs();
  };

  useEffect(() => {
    fetchSystemConfigs();
  }, []);

  // CRUD handlers
  const handleCreateEdit = async () => {
    if (!formData.config_key?.trim()) {
      alert("Please provide a configuration key");
      return;
    }

    try {
      if (editingConfig) {
        const response = await fetch(`/api/system-config/${editingConfig.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: editingConfig.id,
            config_value: formData.config_value,
            description: formData.description,
            data_type: formData.data_type,
            is_public: formData.is_public,
            config_group: formData.config_group,
            is_encrypted: formData.is_encrypted,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to update config');
        }
        alert("Configuration updated successfully!");
      } else {
        const response = await fetch('/api/system-config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            config_key: formData.config_key,
            config_value: formData.config_value,
            description: formData.description,
            data_type: formData.data_type,
            is_public: formData.is_public,
            config_group: formData.config_group,
            is_encrypted: formData.is_encrypted,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to create config');
        }
        alert("Configuration created successfully!");
      }

      setIsCreateEditOpen(false);
      setEditingConfig(null);
      resetForm();
      await fetchSystemConfigs();
    } catch (error: any) {
      console.error("Error saving config:", error);
      alert(`Error: ${error.message}`);
    }
  };

  const resetForm = () => {
    setFormData({
      config_key: "",
      config_value: "",
      description: "",
      data_type: "string",
      is_public: false,
      config_group: "",
      is_encrypted: false,
    });
  };

  const openCreateModal = () => {
    setEditingConfig(null);
    resetForm();
    setIsCreateEditOpen(true);
  };

  const openEditModal = (config: SystemConfig) => {
    setEditingConfig(config);
    setFormData({
      config_key: config.config_key,
      config_value: config.config_value || "",
      description: config.description || "",
      data_type: config.data_type,
      is_public: config.is_public,
      config_group: config.config_group || "",
      is_encrypted: config.is_encrypted,
    });
    setIsCreateEditOpen(true);
  };

  const handleDeleteConfig = (config: SystemConfig) => {
    setConfigToDelete(config);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!configToDelete) return;

    try {
      const { error } = await supabase
        .from("system_config")
        .delete()
        .eq("id", configToDelete.id);

      if (error) throw error;

      alert(
        `Configuration "${configToDelete.config_key}" has been deleted successfully!`,
      );
      setIsDeleteConfirmOpen(false);
      setConfigToDelete(null);
      await fetchSystemConfigs();
    } catch (error: any) {
      console.error("Error deleting config:", error);
      alert(`Error: ${error.message}`);
    }
  };

  const cancelDelete = () => {
    setIsDeleteConfirmOpen(false);
    setConfigToDelete(null);
  };

  const toggleSensitiveValue = (configId: string) => {
    setShowSensitiveValues((prev) => ({
      ...prev,
      [configId]: !prev[configId],
    }));
  };

  // Filter configs
  const filteredConfigs = configs.filter((config) => {
    if (groupFilter !== "all" && config.config_group !== groupFilter)
      return false;
    if (publicFilter === "public" && !config.is_public) return false;
    if (publicFilter === "private" && config.is_public) return false;
    return true;
  });

  const configStats = {
    totalConfigs: configs.length,
    publicConfigs: configs.filter((c) => c.is_public).length,
    encryptedConfigs: configs.filter((c) => c.is_encrypted).length,
    groups: new Set(configs.map((c) => c.config_group).filter(Boolean)).size,
  };

  const renderConfigValue = (config: SystemConfig) => {
    if (config.is_encrypted || config.data_type === "password") {
      const isVisible = showSensitiveValues[config.id];
      return (
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm">
            {isVisible ? config.config_value : "••••••••"}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => toggleSensitiveValue(config.id)}
          >
            {isVisible ? (
              <EyeOff className="h-3 w-3" />
            ) : (
              <Eye className="h-3 w-3" />
            )}
          </Button>
        </div>
      );
    }

    if (config.data_type === "boolean") {
      return (
        <ROAMBadge
          variant={config.config_value === "true" ? "success" : "secondary"}
        >
          {config.config_value}
        </ROAMBadge>
      );
    }

    return (
      <span className="font-mono text-sm max-w-xs truncate">
        {config.config_value || (
          <span className="text-muted-foreground italic">null</span>
        )}
      </span>
    );
  };

  const configColumns: Column[] = [
    {
      key: "config_key",
      header: "Configuration",
      sortable: true,
      render: (value: string, row: SystemConfig) => (
        <div className="space-y-1">
          <div className="font-medium text-foreground">{value}</div>
          <div className="flex items-center gap-2">
            {row.config_group && (
              <ROAMBadge variant="outline" size="sm">
                {row.config_group}
              </ROAMBadge>
            )}
            <ROAMBadge variant="secondary" size="sm">
              {row.data_type}
            </ROAMBadge>
          </div>
        </div>
      ),
    },
    {
      key: "config_value",
      header: "Value",
      render: (value: any, row: SystemConfig) => renderConfigValue(row),
    },
    {
      key: "description",
      header: "Description",
      render: (value: string) => (
        <div className="max-w-md">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {value || <span className="italic">No description</span>}
          </p>
        </div>
      ),
    },
    {
      key: "security",
      header: "Security",
      render: (value: any, row: SystemConfig) => (
        <div className="flex items-center gap-2">
          <ROAMBadge variant={row.is_public ? "warning" : "success"} size="sm">
            {row.is_public ? (
              <>
                <Globe className="w-3 h-3 mr-1" />
                Public
              </>
            ) : (
              <>
                <Shield className="w-3 h-3 mr-1" />
                Private
              </>
            )}
          </ROAMBadge>
          {row.is_encrypted && (
            <ROAMBadge variant="secondary" size="sm">
              <Lock className="w-3 h-3 mr-1" />
              Encrypted
            </ROAMBadge>
          )}
        </div>
      ),
    },
    {
      key: "updated_at",
      header: "Last Updated",
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
      render: (value: any, row: SystemConfig) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              setSelectedConfig(row);
              setIsConfigDetailsOpen(true);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => openEditModal(row)}
            title="Edit Configuration"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => handleDeleteConfig(row)}
            title="Delete Configuration"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <AdminLayout title="System Configuration">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-roam-blue" />
            <p className="text-muted-foreground">
              Loading system configurations...
            </p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="System Configuration">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Failed to Load System Configuration
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
    <AdminLayout title="System Configuration">
      <div className="space-y-8">
        {/* Header with Refresh Button */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">
            System Configuration Management
          </h1>
          <Button onClick={refreshData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Data
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ROAMStatCard
            title="Total Configurations"
            value={configStats.totalConfigs}
            icon={<Settings className="w-5 h-5" />}
            changeText={`${configStats.groups} groups`}
            changeType="neutral"
          />

          <ROAMStatCard
            title="Public Configs"
            value={configStats.publicConfigs}
            icon={<Globe className="w-5 h-5" />}
            changeText="Publicly accessible"
            changeType="warning"
          />

          <ROAMStatCard
            title="Encrypted Configs"
            value={configStats.encryptedConfigs}
            icon={<Lock className="w-5 h-5" />}
            changeText="Sensitive data"
            changeType="positive"
          />

          <ROAMStatCard
            title="Configuration Groups"
            value={configStats.groups}
            icon={<Database className="w-5 h-5" />}
            changeText="Organized categories"
            changeType="neutral"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex gap-4 items-center bg-muted/30 p-4 rounded-lg">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Group:</label>
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="px-3 py-1 border border-border rounded-md text-sm bg-background"
            >
              <option value="all">All Groups</option>
              {configGroups.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Visibility:</label>
            <select
              value={publicFilter}
              onChange={(e) =>
                setPublicFilter(e.target.value as "all" | "public" | "private")
              }
              className="px-3 py-1 border border-border rounded-md text-sm bg-background"
            >
              <option value="all">All</option>
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>

          <div className="text-sm text-muted-foreground ml-auto">
            Showing {filteredConfigs.length} of {configs.length} configurations
          </div>
        </div>

        {/* Main Data Table */}
        <ROAMDataTable
          title="System Configurations"
          columns={configColumns}
          data={filteredConfigs}
          searchable={true}
          filterable={false}
          addable={true}
          onAdd={openCreateModal}
          pageSize={15}
        />
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={isCreateEditOpen} onOpenChange={setIsCreateEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-roam-blue" />
              {editingConfig
                ? "Edit Configuration"
                : "Create New Configuration"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="config_key">Configuration Key *</Label>
              <Input
                id="config_key"
                value={formData.config_key}
                onChange={(e) =>
                  setFormData({ ...formData, config_key: e.target.value })
                }
                placeholder="e.g., database_url, api_key, smtp_host"
                disabled={!!editingConfig}
              />
            </div>

            <div>
              <Label htmlFor="config_value">Configuration Value</Label>
              {formData.data_type === "password" || formData.is_encrypted ? (
                <Input
                  id="config_value"
                  type="password"
                  value={formData.config_value}
                  onChange={(e) =>
                    setFormData({ ...formData, config_value: e.target.value })
                  }
                  placeholder="Enter sensitive value"
                />
              ) : (
                <Textarea
                  id="config_value"
                  value={formData.config_value}
                  onChange={(e) =>
                    setFormData({ ...formData, config_value: e.target.value })
                  }
                  placeholder="Enter configuration value"
                  rows={3}
                />
              )}
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe what this configuration is used for"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="data_type">Data Type</Label>
                <Select
                  value={formData.data_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, data_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dataTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {formatEnumDisplay(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="config_group">Configuration Group</Label>
                <Select
                  value={formData.config_group}
                  onValueChange={(value) =>
                    setFormData({ ...formData, config_group: value })
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
                  id="is_public"
                  checked={formData.is_public}
                  onChange={(e) =>
                    setFormData({ ...formData, is_public: e.target.checked })
                  }
                />
                <Label htmlFor="is_public">Public Access</Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_encrypted"
                  checked={formData.is_encrypted}
                  onChange={(e) =>
                    setFormData({ ...formData, is_encrypted: e.target.checked })
                  }
                />
                <Label htmlFor="is_encrypted">Encrypted/Sensitive</Label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsCreateEditOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateEdit}>
                {editingConfig
                  ? "Update Configuration"
                  : "Create Configuration"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Confirm Deletion
            </DialogTitle>
          </DialogHeader>

          {configToDelete && (
            <div className="space-y-4">
              <p>Are you sure you want to delete this configuration?</p>
              <div className="bg-muted p-3 rounded-md">
                <p className="font-medium">{configToDelete.config_key}</p>
                <p className="text-sm text-muted-foreground">
                  {configToDelete.description || "No description"}
                </p>
              </div>
              <p className="text-sm text-destructive">
                This action cannot be undone and may affect system
                functionality.
              </p>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={cancelDelete}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={confirmDelete}>
                  Delete Configuration
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
