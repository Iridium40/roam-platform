import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ROAMLogo } from "@/components/ui/roam-logo";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  BarChart3,
  Users,
  Building2,
  UserCheck,
  Settings,
  Calendar,
  Star,
  TrendingUp,
  DollarSign,
  Megaphone,
  Bell,
  ChevronDown,
  Menu,
  X,
  RotateCcw,
  Download,
  Gift,
  User,
  LogOut,
  Cog,
  Shield,
  ShieldCheck,
  Briefcase,
  Wrench,
} from "lucide-react";

interface NavItem {
  href: string;
  icon: React.ReactNode;
  label: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface AdminUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  image_url?: string;
}

const navigationSections: NavSection[] = [
  {
    title: "Overview",
    items: [
      {
        href: "/admin",
        icon: <BarChart3 className="w-5 h-5" />,
        label: "Dashboard",
      },
    ],
  },
  {
    title: "Management",
    items: [
      {
        href: "/admin/users",
        icon: <Shield className="w-5 h-5" />,
        label: "Admin Users",
      },
      {
        href: "/admin/customers",
        icon: <Users className="w-5 h-5" />,
        label: "Customers",
      },
      {
        href: "/admin/businesses",
        icon: <Building2 className="w-5 h-5" />,
        label: "Businesses",
      },
      {
        href: "/admin/verification",
        icon: <ShieldCheck className="w-5 h-5" />,
        label: "Verification",
      },
      {
        href: "/admin/providers",
        icon: <Briefcase className="w-5 h-5" />,
        label: "Providers",
      },
      {
        href: "/admin/services",
        icon: <Wrench className="w-5 h-5" />,
        label: "Services",
      },
    ],
  },
  {
    title: "Support",
    items: [
      {
        href: "/admin/bookings",
        icon: <Calendar className="w-5 h-5" />,
        label: "Bookings",
      },
      {
        href: "/admin/promotions",
        icon: <Gift className="w-5 h-5" />,
        label: "Promotions",
      },
      {
        href: "/admin/reviews",
        icon: <Star className="w-5 h-5" />,
        label: "Reviews",
      },
      {
        href: "/admin/announcements",
        icon: <Megaphone className="w-5 h-5" />,
        label: "Announcements",
      },
    ],
  },
  {
    title: "Analytics",
    items: [
      {
        href: "/admin/reports",
        icon: <TrendingUp className="w-5 h-5" />,
        label: "Reports",
      },
      {
        href: "/admin/financial",
        icon: <DollarSign className="w-5 h-5" />,
        label: "Financial",
      },
    ],
  },
  {
    title: "System",
    items: [
      {
        href: "/admin/system-settings",
        icon: <Cog className="w-5 h-5" />,
        label: "System Settings",
      },
    ],
  },
];

// Announcement types and sample data (normally this would come from an API)
type AnnouncementAudience = "customer" | "provider" | "all" | "staff";

interface Announcement {
  id: string;
  title: string;
  content: string;
  is_active: boolean;
  created_at: string;
  start_date?: string;
  end_date?: string;
  announcement_audience: AnnouncementAudience;
  announcement_type: string;
}

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function AdminLayout({
  children,
  title = "Dashboard",
}: AdminLayoutProps) {
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [activeStaffAnnouncements, setActiveStaffAnnouncements] = useState<
    Announcement[]
  >([]);
  const [allAnnouncements, setAllAnnouncements] = useState<Announcement[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch announcements from database
  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching announcements:", error);
        return;
      }

      setAllAnnouncements(data || []);
    } catch (error) {
      console.error("Error in fetchAnnouncements:", error);
    }
  };

  // Check for active announcements targeted at staff or all
  const hasStaffNotifications = React.useMemo(() => {
    const now = new Date();
    return allAnnouncements.some((announcement) => {
      // Must be active
      if (!announcement.is_active) return false;

      // Must be for staff or all
      const isForStaff =
        announcement.announcement_audience === "staff" ||
        announcement.announcement_audience === "all";
      if (!isForStaff) return false;

      // Check if within date range (if dates are specified)
      if (announcement.start_date) {
        const startDate = new Date(announcement.start_date);
        if (now < startDate) return false;
      }

      if (announcement.end_date) {
        const endDate = new Date(announcement.end_date);
        if (now > endDate) return false;
      }

      return true;
    });
  }, [allAnnouncements]);

  const handleNotificationClick = () => {
    // Get active staff announcements and show in modal
    const now = new Date();
    const staffAnnouncements = allAnnouncements.filter((announcement) => {
      // Must be active
      if (!announcement.is_active) return false;

      // Must be for staff or all
      const isForStaff =
        announcement.announcement_audience === "staff" ||
        announcement.announcement_audience === "all";
      if (!isForStaff) return false;

      // Check if within date range (if dates are specified)
      if (announcement.start_date) {
        const startDate = new Date(announcement.start_date);
        if (now < startDate) return false;
      }

      if (announcement.end_date) {
        const endDate = new Date(announcement.end_date);
        if (now > endDate) return false;
      }

      return true;
    });

    setActiveStaffAnnouncements(staffAnnouncements);
    setIsNotificationModalOpen(true);
  };

  const handleProfileClick = () => {
    navigate("/admin/profile");
    setUserDropdownOpen(false);
  };

  const handleSettingsClick = () => {
    navigate("/admin/settings");
    setUserDropdownOpen(false);
  };

  // Fetch admin user profile and settings
  useEffect(() => {
    const fetchAdminUser = async () => {
      if (user?.id) {
        try {
          const { data, error } = await supabase
            .from("admin_users")
            .select("id, first_name, last_name, email, role, image_url")
            .eq("user_id", user.id);

          if (error) {
            return;
          }

          if (data && data.length > 0) {
            setAdminUser(data[0]);
          }
        } catch (err) {
        }
      }
    };

    fetchAdminUser();
  }, [user]);


  // Fetch announcements on component mount
  useEffect(() => {
    fetchAnnouncements();
  }, []);

  // Listen for session expiry events
  useEffect(() => {
    const handleSessionExpired = (event: CustomEvent) => {
      toast({
        title: "Session Expired",
        description:
          event.detail.message ||
          "Your session has expired. Please log in again.",
        variant: "destructive",
      });
    };

    window.addEventListener(
      "auth-session-expired",
      handleSessionExpired as EventListener,
    );

    return () => {
      window.removeEventListener(
        "auth-session-expired",
        handleSessionExpired as EventListener,
      );
    };
  }, [toast]);

  // Helper function to get initials
  const getInitials = () => {
    if (adminUser) {
      return `${adminUser.first_name?.[0] || ""}${adminUser.last_name?.[0] || ""}`.toUpperCase();
    }
    return user?.email?.[0]?.toUpperCase() || "U";
  };

  // Helper function to get display name
  const getDisplayName = () => {
    if (adminUser) {
      return `${adminUser.first_name} ${adminUser.last_name}`;
    }
    return user?.email || "Admin User";
  };


  const handleSignOut = async () => {
    try {
      setUserDropdownOpen(false);

      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Sign out error:", error);
        toast({
          title: "Error",
          description: "Failed to sign out. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "You have been signed out successfully.",
        variant: "default",
      });

      // Navigation will be handled automatically by the ProtectedRoute component
    } catch (err) {
      console.error("Unexpected sign out error:", err);
      toast({
        title: "Error",
        description: "An unexpected error occurred during sign out.",
        variant: "destructive",
      });
    }
  };

  const isActive = (href: string) => {
    return (
      location.pathname === href ||
      (href !== "/admin" && location.pathname.startsWith(href))
    );
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-white border-r border-sidebar-border transition-all duration-300 ease-in-out lg:translate-x-0 w-64",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center p-6 border-b border-sidebar-border">
            <ROAMLogo size="sm" showText={true} />
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-4 overflow-y-auto">
            {navigationSections.map((section) => (
              <div key={section.title} className="mb-8">
                <h3 className="px-6 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {section.title}
                </h3>
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={cn(
                        "flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors relative",
                        isActive(item.href)
                          ? "bg-sidebar-accent text-sidebar-primary before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-sidebar-primary"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      )}
                      onClick={() => setSidebarOpen(false)}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        {/* Top Navigation */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-card px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
            <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={handleNotificationClick}
              title={
                hasStaffNotifications
                  ? "You have new announcements"
                  : "View announcements"
              }
            >
              <Bell className="h-5 w-5" />
              {hasStaffNotifications && (
                <span className="absolute top-0 right-0 h-2 w-2 bg-destructive rounded-full"></span>
              )}
            </Button>

            <DropdownMenu
              open={userDropdownOpen}
              onOpenChange={setUserDropdownOpen}
            >
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-2 cursor-pointer">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={adminUser?.image_url} />
                    <AvatarFallback className="text-xs font-semibold">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline">{getDisplayName()}</span>
                  <ChevronDown className="w-4 h-4" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={handleProfileClick}
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={handleSettingsClick}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:text-destructive"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Notification Modal */}
      <Dialog
        open={isNotificationModalOpen}
        onOpenChange={setIsNotificationModalOpen}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader className="relative">
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Staff Announcements
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-0 right-0 h-6 w-6"
              onClick={() => setIsNotificationModalOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>

          <div className="space-y-4">
            {activeStaffAnnouncements.length > 0 ? (
              activeStaffAnnouncements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-lg">
                      {announcement.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          announcement.announcement_type === "maintenance"
                            ? "bg-orange-100 text-orange-800"
                            : announcement.announcement_type === "feature"
                              ? "bg-blue-100 text-blue-800"
                              : announcement.announcement_type === "update"
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {announcement.announcement_type}
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          announcement.announcement_audience === "staff"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {announcement.announcement_audience}
                      </span>
                    </div>
                  </div>

                  <p className="text-muted-foreground">
                    {announcement.content}
                  </p>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2">
                    <span>
                      Created:{" "}
                      {new Date(announcement.created_at).toLocaleDateString()}
                    </span>
                    {announcement.start_date && (
                      <span>
                        Start:{" "}
                        {new Date(announcement.start_date).toLocaleDateString()}
                      </span>
                    )}
                    {announcement.end_date && (
                      <span>
                        End:{" "}
                        {new Date(announcement.end_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No active announcements for staff at this time.</p>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setIsNotificationModalOpen(false);
                navigate("/admin/announcements");
              }}
            >
              View All Announcements
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdminLayout;
