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
import {
  Users,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Eye,
  Edit,
  TrendingUp,
  Shield,
  ShieldCheck,
  Calendar,
  MessageSquare,
  MapPin,
  Home,
  Clock,
  CreditCard,
  User,
  CalendarDays,
} from "lucide-react";

interface CustomerProfile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  date_of_birth: string | null;
  image_url: string | null;
  bio: string | null;
  email_notifications: boolean;
  sms_notifications: boolean;
  email_verified: boolean;
  phone_verified: boolean;
  auth_email: string | null;
  last_sign_in_at: string | null;
}

interface CustomerLocation {
  id: string;
  customer_id: string;
  location_name: string;
  street_address: string;
  unit_number: string | null;
  city: string;
  state: string;
  zip_code: string;
  latitude: number | null;
  longitude: number | null;
  is_primary: boolean;
  is_active: boolean;
  access_instructions: string | null;
  created_at: string;
  location_type: string;
}

type BookingStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";
type PaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "refunded"
  | "partially_refunded";
type DeliveryType = "business" | "customer" | "mobile";

interface CustomerBooking {
  id: string;
  customer_id: string;
  provider_id: string;
  service_id: string;
  booking_date: string;
  start_time: string;
  total_amount: number;
  created_at: string;
  booking_status: BookingStatus;
  payment_status: PaymentStatus;
  delivery_type: DeliveryType;
  guest_name?: string;
  cancelled_at?: string;
  booking_reference?: string;
  providers?: {
    id: string;
    first_name: string;
    last_name: string;
    business_profiles?: {
      id: string;
      business_name: string;
    };
  };
  services?: {
    id: string;
    name: string;
    duration_minutes: number;
    min_price: number;
  };
}

const sampleCustomers: CustomerProfile[] = [
  {
    id: "1",
    user_id: "user_1",
    first_name: "Alice",
    last_name: "Johnson",
    email: "alice.johnson@email.com",
    phone: "+1-555-0123",
    is_active: true,
    created_at: "2023-12-01T00:00:00Z",
    date_of_birth: "1990-05-15",
    email_notifications: true,
    sms_notifications: true,
    email_verified: true,
    phone_verified: true,
    auth_email: "alice.johnson@email.com",
    last_sign_in_at: "2024-01-15T14:30:00Z",
  },
  {
    id: "2",
    user_id: "user_2",
    first_name: "Bob",
    last_name: "Smith",
    email: "bob.smith@email.com",
    phone: "+1-555-0124",
    is_active: true,
    created_at: "2023-11-15T00:00:00Z",
    date_of_birth: "1985-08-22",
    email_notifications: true,
    sms_notifications: false,
    email_verified: true,
    phone_verified: false,
    auth_email: "bob.smith@email.com",
    last_sign_in_at: "2024-01-10T09:15:00Z",
  },
  {
    id: "3",
    user_id: "user_3",
    first_name: "Carol",
    last_name: "Davis",
    email: "carol.davis@email.com",
    phone: null,
    is_active: true,
    created_at: "2024-01-10T00:00:00Z",
    date_of_birth: "1992-12-03",
    email_notifications: true,
    sms_notifications: false,
    email_verified: false,
    phone_verified: false,
    auth_email: "carol.davis@email.com",
    last_sign_in_at: null,
  },
  {
    id: "4",
    user_id: "user_4",
    first_name: "David",
    last_name: "Wilson",
    email: "david.wilson@email.com",
    phone: "+1-555-0126",
    is_active: false,
    created_at: "2023-10-05T00:00:00Z",
    date_of_birth: "1988-03-17",
    email_notifications: false,
    sms_notifications: false,
    email_verified: true,
    phone_verified: true,
    auth_email: "david.wilson@email.com",
    last_sign_in_at: "2023-12-20T16:45:00Z",
  },
  {
    id: "5",
    user_id: "user_5",
    first_name: "Emma",
    last_name: "Brown",
    email: "emma.brown@email.com",
    phone: "+1-555-0127",
    is_active: true,
    created_at: "2024-01-08T00:00:00Z",
    date_of_birth: "1995-07-09",
    email_notifications: true,
    sms_notifications: true,
    email_verified: true,
    phone_verified: true,
    auth_email: "emma.brown@email.com",
    last_sign_in_at: "2024-01-14T11:20:00Z",
  },
];

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const calculateAge = (birthDate: string) => {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
};

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [customerLocations, setCustomerLocations] = useState<
    CustomerLocation[]
  >([]);
  const [customerBookings, setCustomerBookings] = useState<CustomerBooking[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerProfile | null>(null);
  const [isCustomerDetailsOpen, setIsCustomerDetailsOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  // Fetch customers, locations, and bookings from Supabase
  useEffect(() => {
    fetchCustomers();
    fetchCustomerLocations();
    fetchCustomerBookings();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("Fetching customers from API...");

      const response = await fetch(`/api/customers?status=${statusFilter}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch customers');
      }

      if (!result.success) {
        throw new Error(result.error || 'API returned unsuccessful response');
      }

      console.log(`Successfully fetched ${result.data?.length || 0} customers`);
      setCustomers(result.data || []);
      
      if (result.data?.length === 0) {
        setError("No customer records found.");
      }
    } catch (err) {
      console.error("Error fetching customers:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(`Failed to load customers: ${errorMessage}`);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerLocations = async () => {
    try {
      console.log("Fetching customer locations from API...");

      const response = await fetch('/api/customers/locations');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch customer locations');
      }

      if (!result.success) {
        throw new Error(result.error || 'API returned unsuccessful response');
      }

      console.log(`Successfully fetched ${result.data?.length || 0} customer locations`);
      setCustomerLocations(result.data || []);
    } catch (err) {
      console.error("Error fetching customer locations:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      console.warn(`Customer Locations Error: ${errorMessage}`);
      setCustomerLocations([]);
    }
  };

  const fetchCustomerBookings = async () => {
    try {
      console.log("Fetching customer bookings from API...");

      const response = await fetch('/api/customers/bookings');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch customer bookings');
      }

      if (!result.success) {
        throw new Error(result.error || 'API returned unsuccessful response');
      }

      console.log(`Successfully fetched ${result.data?.length || 0} customer bookings`);
      setCustomerBookings(result.data || []);
    } catch (err) {
      console.error("Error fetching customer bookings:", err);
      setCustomerBookings([]);
    }
  };

  // Toggle customer active status
  const toggleCustomerStatus = async (
    customerId: string,
    newStatus: boolean,
  ) => {
    try {
      const response = await fetch('/api/customers/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId,
          isActive: newStatus,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update customer status');
      }

      if (!result.success) {
        throw new Error(result.error || 'API returned unsuccessful response');
      }

      console.log(`Customer ${customerId} status updated to ${newStatus ? "active" : "inactive"}`);
      await fetchCustomers(); // Refresh the customers list
    } catch (err) {
      console.error("Error updating customer status:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      alert(`Error updating customer status: ${errorMessage}`);
    }
  };

  // Filter customers based on selected filters
  const filteredCustomers = customers.filter((customer) => {
    const statusMatch =
      statusFilter === "all" ||
      (statusFilter === "active" && customer.is_active) ||
      (statusFilter === "inactive" && !customer.is_active);

    return statusMatch;
  });

  const customerStats = {
    total: customers.length,
    active: customers.filter((c) => c.is_active).length,
    verified: customers.filter((c) => c.email_verified && c.phone_verified)
      .length,
    newThisMonth: customers.filter((c) => {
      const createdDate = new Date(c.created_at);
      const now = new Date();
      return (
        createdDate.getMonth() === now.getMonth() &&
        createdDate.getFullYear() === now.getFullYear()
      );
    }).length,
  };

  const columns: Column[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      render: (value: string, row: CustomerProfile) => {
        const fullName =
          `${row.first_name || ""} ${row.last_name || ""}`.trim() || "N/A";
        const initials =
          row.first_name?.[0] && row.last_name?.[0]
            ? `${row.first_name[0]}${row.last_name[0]}`.toUpperCase()
            : "NA";

        return (
          <div className="flex items-center gap-3">
            {row.image_url ? (
              <img
                src={row.image_url}
                alt={`${fullName} avatar`}
                className="w-10 h-10 rounded-full object-cover border-2 border-roam-blue/20"
                onError={(e) => {
                  // Fallback to initials on image load error
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  if (target.nextElementSibling) {
                    (target.nextElementSibling as HTMLElement).style.display =
                      "flex";
                  }
                }}
              />
            ) : null}
            <div
              className={`w-10 h-10 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-full flex items-center justify-center text-white font-semibold text-sm ${row.image_url ? "hidden" : ""}`}
            >
              {initials}
            </div>
            <div>
              <div className="font-medium text-foreground">{fullName}</div>
              <div className="text-sm text-muted-foreground">
                {row.email || "No email"}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: "contact",
      header: "Contact",
      render: (value: any, row: CustomerProfile) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="w-3 h-3" />
            <span
              className={
                row.email_verified
                  ? "text-roam-success"
                  : "text-muted-foreground"
              }
            >
              {row.email_verified ? "Verified" : "Unverified"}
            </span>
          </div>
          {row.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-3 h-3" />
              <span
                className={
                  row.phone_verified
                    ? "text-roam-success"
                    : "text-muted-foreground"
                }
              >
                {row.phone_verified ? "Verified" : "Unverified"}
              </span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (value: any, row: CustomerProfile) => (
        <ROAMBadge variant={row.is_active ? "success" : "secondary"}>
          {row.is_active ? "Active" : "Inactive"}
        </ROAMBadge>
      ),
    },
    {
      key: "notifications",
      header: "Preferences",
      render: (value: any, row: CustomerProfile) => (
        <div className="flex gap-1">
          {row.email_notifications && (
            <ROAMBadge variant="outline" size="sm" title="Email Notifications">
              📧
            </ROAMBadge>
          )}
          {row.sms_notifications && (
            <ROAMBadge variant="outline" size="sm" title="SMS Notifications">
              📱
            </ROAMBadge>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (value: any, row: CustomerProfile) => (
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              setSelectedCustomer(row);
              setIsCustomerDetailsOpen(true);
            }}
            title="View Customer"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${
              row.is_active
                ? "text-roam-warning hover:text-roam-warning"
                : "text-roam-success hover:text-roam-success"
            }`}
            onClick={() => toggleCustomerStatus(row.id, !row.is_active)}
            title={row.is_active ? "Deactivate Customer" : "Activate Customer"}
          >
            {row.is_active ? (
              <UserX className="h-4 w-4" />
            ) : (
              <UserCheck className="h-4 w-4" />
            )}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout title="Customers">
      <div className="space-y-8">
        {/* Stats Overview */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ROAMStatCard
            title="Total Customers"
            value={customerStats.total}
            icon={<Users className="w-5 h-5" />}
            changeText={`${customerStats.newThisMonth} new this month`}
            changeType="positive"
            changeIcon={<TrendingUp className="w-3 h-3" />}
          />

          <ROAMStatCard
            title="Active Customers"
            value={customerStats.active}
            icon={<UserCheck className="w-5 h-5" />}
            changeText={`${Math.round((customerStats.active / customerStats.total) * 100)}% of total`}
            changeType="positive"
          />

          <ROAMStatCard
            title="Fully Verified"
            value={customerStats.verified}
            icon={<ShieldCheck className="w-5 h-5" />}
            changeText="Email & Phone verified"
            changeType="neutral"
          />

          <ROAMStatCard
            title="New This Month"
            value={customerStats.newThisMonth}
            icon={<Calendar className="w-5 h-5" />}
            changeText="Recent signups"
            changeType="positive"
          />
        </div>

        <div className="space-y-4">
          {/* Filter Controls */}
          <div className="flex gap-4 items-center bg-muted/30 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value as "all" | "active" | "inactive",
                  )
                }
                className="px-3 py-1 border border-border rounded-md text-sm bg-background"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="text-sm text-muted-foreground ml-auto">
              {loading
                ? "Loading..."
                : `Showing ${filteredCustomers.length} of ${customers.length} customers`}
              {error && (
                <div className="text-orange-600 text-xs mt-1">{error}</div>
              )}
            </div>
          </div>

          {/* Customers Table */}
          <ROAMDataTable
            title="Customers"
            columns={columns}
            data={loading ? [] : filteredCustomers}
            searchable={true}
            filterable={false}
            addable={false}
            onRowClick={(customer) => console.log("View customer:", customer)}
            pageSize={10}
          />
        </div>
      </div>

      {/* Customer Details Modal */}
      <Dialog
        open={isCustomerDetailsOpen}
        onOpenChange={setIsCustomerDetailsOpen}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-full flex items-center justify-center text-white font-semibold">
                {selectedCustomer?.first_name?.[0] &&
                selectedCustomer?.last_name?.[0]
                  ? `${selectedCustomer.first_name[0]}${selectedCustomer.last_name[0]}`.toUpperCase()
                  : "NA"}
              </div>
              Customer Details -{" "}
              {selectedCustomer
                ? `${selectedCustomer.first_name || ""} ${selectedCustomer.last_name || ""}`.trim() ||
                  "N/A"
                : "N/A"}
            </DialogTitle>
            <DialogDescription>
              View detailed customer information including profile, contact
              details, and booking history.
            </DialogDescription>
          </DialogHeader>

          {selectedCustomer && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ROAMCard>
                  <ROAMCardHeader>
                    <ROAMCardTitle className="text-base">
                      Personal Information
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
                          {`${selectedCustomer.first_name || ""} ${selectedCustomer.last_name || ""}`.trim() ||
                            "N/A"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Contact Email
                        </div>
                        <div className="font-medium">
                          {selectedCustomer.email || "No email provided"}
                        </div>
                        <ROAMBadge
                          variant={
                            selectedCustomer.email_verified
                              ? "success"
                              : "secondary"
                          }
                          size="sm"
                          className="mt-1"
                        >
                          {selectedCustomer.email_verified
                            ? "Verified"
                            : "Unverified"}
                        </ROAMBadge>
                      </div>
                    </div>

                    {selectedCustomer.auth_email && (
                      <div className="flex items-center gap-3">
                        <Shield className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm text-muted-foreground">
                            Login Email
                          </div>
                          <div className="font-medium">
                            {selectedCustomer.auth_email}
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedCustomer.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm text-muted-foreground">
                            Phone
                          </div>
                          <div className="font-medium">
                            {selectedCustomer.phone}
                          </div>
                          <ROAMBadge
                            variant={
                              selectedCustomer.phone_verified
                                ? "success"
                                : "secondary"
                            }
                            size="sm"
                            className="mt-1"
                          >
                            {selectedCustomer.phone_verified
                              ? "Verified"
                              : "Unverified"}
                          </ROAMBadge>
                        </div>
                      </div>
                    )}

                    {selectedCustomer.date_of_birth && (
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm text-muted-foreground">
                            Date of Birth
                          </div>
                          <div className="font-medium">
                            {new Date(
                              selectedCustomer.date_of_birth,
                            ).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}{" "}
                            ({calculateAge(selectedCustomer.date_of_birth)}{" "}
                            years old)
                          </div>
                        </div>
                      </div>
                    )}
                  </ROAMCardContent>
                </ROAMCard>

                <ROAMCard>
                  <ROAMCardHeader>
                    <ROAMCardTitle className="text-base">
                      Account Status
                    </ROAMCardTitle>
                  </ROAMCardHeader>
                  <ROAMCardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <UserCheck className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Account Status
                        </div>
                        <ROAMBadge
                          variant={
                            selectedCustomer.is_active ? "success" : "secondary"
                          }
                          className="mt-1"
                        >
                          {selectedCustomer.is_active ? "Active" : "Inactive"}
                        </ROAMBadge>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Member Since
                        </div>
                        <div className="font-medium">
                          {new Date(
                            selectedCustomer.created_at,
                          ).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
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
                          {selectedCustomer.last_sign_in_at
                            ? new Date(
                                selectedCustomer.last_sign_in_at,
                              ).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })
                            : "Never"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Shield className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          User ID
                        </div>
                        <div className="font-medium font-mono text-sm">
                          {selectedCustomer.user_id}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Verification Status
                        </div>
                        <div className="mt-1">
                          {selectedCustomer.email_verified &&
                          selectedCustomer.phone_verified ? (
                            <ROAMBadge variant="success">
                              Fully Verified
                            </ROAMBadge>
                          ) : selectedCustomer.email_verified ||
                            selectedCustomer.phone_verified ? (
                            <ROAMBadge variant="warning">
                              Partially Verified
                            </ROAMBadge>
                          ) : (
                            <ROAMBadge variant="secondary">
                              Unverified
                            </ROAMBadge>
                          )}
                        </div>
                      </div>
                    </div>
                  </ROAMCardContent>
                </ROAMCard>
              </div>

              {/* Communication Preferences */}
              <ROAMCard>
                <ROAMCardHeader>
                  <ROAMCardTitle className="text-base">
                    Communication Preferences
                  </ROAMCardTitle>
                </ROAMCardHeader>
                <ROAMCardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedCustomer.email_notifications ? "bg-roam-success/10" : "bg-muted"}`}
                      >
                        <Mail
                          className={`w-4 h-4 ${selectedCustomer.email_notifications ? "text-roam-success" : "text-muted-foreground"}`}
                        />
                      </div>
                      <div>
                        <div className="text-sm font-medium">
                          Email Notifications
                        </div>
                        <ROAMBadge
                          variant={
                            selectedCustomer.email_notifications
                              ? "success"
                              : "secondary"
                          }
                          size="sm"
                        >
                          {selectedCustomer.email_notifications
                            ? "Enabled"
                            : "Disabled"}
                        </ROAMBadge>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedCustomer.sms_notifications ? "bg-roam-success/10" : "bg-muted"}`}
                      >
                        <MessageSquare
                          className={`w-4 h-4 ${selectedCustomer.sms_notifications ? "text-roam-success" : "text-muted-foreground"}`}
                        />
                      </div>
                      <div>
                        <div className="text-sm font-medium">
                          SMS Notifications
                        </div>
                        <ROAMBadge
                          variant={
                            selectedCustomer.sms_notifications
                              ? "success"
                              : "secondary"
                          }
                          size="sm"
                        >
                          {selectedCustomer.sms_notifications
                            ? "Enabled"
                            : "Disabled"}
                        </ROAMBadge>
                      </div>
                    </div>

                  </div>
                </ROAMCardContent>
              </ROAMCard>

              {/* Customer Bookings */}
              <ROAMCard>
                <ROAMCardHeader>
                  <ROAMCardTitle className="text-base flex items-center gap-2">
                    <CalendarDays className="w-4 h-4" />
                    Booking History
                  </ROAMCardTitle>
                </ROAMCardHeader>
                <ROAMCardContent>
                  {(() => {
                    const currentCustomerBookings = customerBookings.filter(
                      (booking) => booking.customer_id === selectedCustomer.id,
                    );

                    const activeBookings = currentCustomerBookings.filter(
                      (booking) =>
                        ["pending", "confirmed", "in_progress"].includes(
                          booking.booking_status,
                        ),
                    );

                    const completedBookings = currentCustomerBookings.filter(
                      (booking) => booking.booking_status === "completed",
                    );

                    const lastBooking = completedBookings.sort(
                      (a, b) =>
                        new Date(b.booking_date).getTime() -
                        new Date(a.booking_date).getTime(),
                    )[0];

                    return (
                      <div className="space-y-6">
                        {/* Active Bookings */}
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            Active Bookings ({activeBookings.length})
                          </h4>
                          {activeBookings.length > 0 ? (
                            <div className="space-y-3">
                              {activeBookings.map((booking) => (
                                <div
                                  key={booking.id}
                                  className="p-3 border rounded-lg bg-muted/20"
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <div>
                                      <div className="font-medium text-sm">
                                        {booking.services?.name || "Service"}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        with {booking.providers?.first_name}{" "}
                                        {booking.providers?.last_name}
                                        {booking.providers?.business_profiles
                                          ?.business_name && (
                                          <span>
                                            {" "}
                                            •{" "}
                                            {
                                              booking.providers
                                                .business_profiles.business_name
                                            }
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <ROAMBadge
                                      variant={
                                        booking.booking_status === "confirmed"
                                          ? "success"
                                          : booking.booking_status === "pending"
                                            ? "warning"
                                            : booking.booking_status ===
                                                "in_progress"
                                              ? "default"
                                              : "secondary"
                                      }
                                      size="sm"
                                    >
                                      {booking.booking_status.replace("_", " ")}
                                    </ROAMBadge>
                                  </div>
                                  <div className="grid grid-cols-3 gap-3 text-xs">
                                    <div>
                                      <div className="text-muted-foreground">
                                        Date & Time
                                      </div>
                                      <div className="font-medium">
                                        {new Date(
                                          booking.booking_date,
                                        ).toLocaleDateString("en-US", {
                                          month: "short",
                                          day: "numeric",
                                          year: "numeric",
                                        })}{" "}
                                        at {booking.start_time}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-muted-foreground">
                                        Amount
                                      </div>
                                      <div className="font-medium flex items-center gap-1">
                                        <CreditCard className="w-3 h-3" />$
                                        {booking.total_amount.toFixed(2)}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-muted-foreground">
                                        Reference
                                      </div>
                                      <div className="font-medium font-mono text-xs">
                                        {booking.booking_reference || "N/A"}
                                      </div>
                                    </div>
                                  </div>
                                  {booking.delivery_type && (
                                    <div className="mt-2 pt-2 border-t">
                                      <div className="text-xs text-muted-foreground capitalize">
                                        {booking.delivery_type} service
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-4 text-muted-foreground text-sm">
                              <Clock className="w-6 h-6 mx-auto mb-2 opacity-50" />
                              <p>No active bookings</p>
                            </div>
                          )}
                        </div>

                        {/* Last Completed Booking */}
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                            <Calendar className="w-3 h-3" />
                            Last Booking
                          </h4>
                          {lastBooking ? (
                            <div className="p-3 border rounded-lg">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <div className="font-medium text-sm">
                                    {lastBooking.services?.name || "Service"}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    with {lastBooking.providers?.first_name}{" "}
                                    {lastBooking.providers?.last_name}
                                    {lastBooking.providers?.business_profiles
                                      ?.business_name && (
                                      <span>
                                        {" "}
                                        •{" "}
                                        {
                                          lastBooking.providers
                                            .business_profiles.business_name
                                        }
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <ROAMBadge variant="success" size="sm">
                                  Completed
                                </ROAMBadge>
                              </div>
                              <div className="grid grid-cols-3 gap-3 text-xs">
                                <div>
                                  <div className="text-muted-foreground">
                                    Date
                                  </div>
                                  <div className="font-medium">
                                    {new Date(
                                      lastBooking.booking_date,
                                    ).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">
                                    Amount
                                  </div>
                                  <div className="font-medium flex items-center gap-1">
                                    <CreditCard className="w-3 h-3" />$
                                    {lastBooking.total_amount.toFixed(2)}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">
                                    Reference
                                  </div>
                                  <div className="font-medium font-mono text-xs">
                                    {lastBooking.booking_reference || "N/A"}
                                  </div>
                                </div>
                              </div>
                              {lastBooking.services?.duration_minutes && (
                                <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                                  Duration:{" "}
                                  {lastBooking.services.duration_minutes}{" "}
                                  minutes
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-4 text-muted-foreground text-sm">
                              <Calendar className="w-6 h-6 mx-auto mb-2 opacity-50" />
                              <p>No completed bookings found</p>
                            </div>
                          )}
                        </div>

                        {/* Booking Summary */}
                        {currentCustomerBookings.length > 0 && (
                          <div className="pt-4 border-t">
                            <div className="grid grid-cols-3 gap-4 text-center">
                              <div>
                                <div className="text-lg font-bold text-roam-blue">
                                  {currentCustomerBookings.length}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Total Bookings
                                </div>
                              </div>
                              <div>
                                <div className="text-lg font-bold text-roam-success">
                                  {
                                    currentCustomerBookings.filter(
                                      (b) => b.booking_status === "completed",
                                    ).length
                                  }
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Completed
                                </div>
                              </div>
                              <div>
                                <div className="text-lg font-bold text-roam-warning">
                                  $
                                  {currentCustomerBookings
                                    .filter(
                                      (b) => b.booking_status === "completed",
                                    )
                                    .reduce((sum, b) => sum + b.total_amount, 0)
                                    .toFixed(2)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Total Spent
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </ROAMCardContent>
              </ROAMCard>

              {/* Customer Locations */}
              <ROAMCard>
                <ROAMCardHeader>
                  <ROAMCardTitle className="text-base flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Customer Locations
                  </ROAMCardTitle>
                </ROAMCardHeader>
                <ROAMCardContent>
                  {(() => {
                    const currentCustomerLocations = customerLocations.filter(
                      (location) =>
                        location.customer_id === selectedCustomer.user_id,
                    );

                    return currentCustomerLocations.length > 0 ? (
                      <div className="space-y-4">
                        {currentCustomerLocations.map((location) => (
                          <div
                            key={location.id}
                            className="p-4 border rounded-lg space-y-3"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <Home className="w-4 h-4 text-roam-blue" />
                                <div>
                                  <div className="font-medium text-foreground">
                                    {location.location_name}
                                  </div>
                                  <div className="text-sm text-muted-foreground capitalize">
                                    {location.location_type}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {location.is_primary && (
                                  <ROAMBadge variant="default" size="sm">
                                    Primary
                                  </ROAMBadge>
                                )}
                                <ROAMBadge
                                  variant={
                                    location.is_active ? "success" : "secondary"
                                  }
                                  size="sm"
                                >
                                  {location.is_active ? "Active" : "Inactive"}
                                </ROAMBadge>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <div className="font-medium text-muted-foreground">
                                  Address
                                </div>
                                <div className="text-foreground">
                                  {location.street_address}
                                  {location.unit_number &&
                                    `, ${location.unit_number}`}
                                </div>
                                <div className="text-foreground">
                                  {location.city}, {location.state}{" "}
                                  {location.zip_code}
                                </div>
                              </div>

                              <div>
                                <div className="font-medium text-muted-foreground">
                                  Created
                                </div>
                                <div className="text-foreground">
                                  {new Date(
                                    location.created_at,
                                  ).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </div>
                                {location.latitude && location.longitude && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Coordinates: {location.latitude.toFixed(6)},{" "}
                                    {location.longitude.toFixed(6)}
                                  </div>
                                )}
                              </div>
                            </div>

                            {location.access_instructions && (
                              <div className="pt-2 border-t">
                                <div className="font-medium text-muted-foreground text-sm">
                                  Access Instructions
                                </div>
                                <div className="text-sm text-foreground mt-1">
                                  {location.access_instructions}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No locations found for this customer</p>
                      </div>
                    );
                  })()}
                </ROAMCardContent>
              </ROAMCard>

              {/* Additional Information */}
              {selectedCustomer.bio && (
                <ROAMCard>
                  <ROAMCardHeader>
                    <ROAMCardTitle className="text-base">Bio</ROAMCardTitle>
                  </ROAMCardHeader>
                  <ROAMCardContent>
                    <p className="text-sm leading-relaxed">
                      {selectedCustomer.bio}
                    </p>
                  </ROAMCardContent>
                </ROAMCard>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
