import React from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  Menu,
  LogOut,
  Settings,
  User,
  Building,
  Crown,
} from "lucide-react";
import { useAuth } from "@/contexts/auth/AuthProvider";
import type { Provider, BusinessProfile } from "@/lib/database.types";

interface DashboardHeaderProps {
  provider: Provider | null;
  business: BusinessProfile | null;
  onMobileMenuToggle: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  provider,
  business,
  onMobileMenuToggle,
}) => {
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const getRoleBadge = () => {
    if (!provider) return null;

    const roleConfig = {
      owner: { label: "Owner", color: "bg-purple-100 text-purple-800" },
      dispatcher: { label: "Dispatcher", color: "bg-blue-100 text-blue-800" },
      provider: { label: "Provider", color: "bg-green-100 text-green-800" },
    };

    const config = roleConfig[provider.provider_role];
    return (
      <Badge className={config.color}>
        <Crown className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getUserInitials = () => {
    if (!provider) return "U";
    return `${provider.first_name?.[0] || ""}${provider.last_name?.[0] || ""}`.toUpperCase();
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden"
          onClick={onMobileMenuToggle}
        >
          <Menu className="w-5 h-5" />
        </Button>

        {/* Business info */}
        <div className="flex items-center space-x-4">
          <div className="hidden md:flex items-center space-x-2">
            <Building className="w-5 h-5 text-gray-500" />
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {business?.business_name || "Business Dashboard"}
              </h1>
              {business && (
                <p className="text-sm text-gray-500">
                  {business.business_type.replace("_", " ")}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right side - notifications and user menu */}
        <div className="flex items-center space-x-3">
          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
              3
            </span>
          </Button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={provider?.image_url || ""} />
                  <AvatarFallback>{getUserInitials()}</AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium">
                    {provider ? `${provider.first_name} ${provider.last_name}` : "User"}
                  </p>
                  {getRoleBadge()}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem>
                <User className="w-4 h-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
