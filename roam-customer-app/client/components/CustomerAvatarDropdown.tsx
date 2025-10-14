import React from "react";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  User,
  Settings,
  CreditCard,
  Heart,
  MapPin,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export const CustomerAvatarDropdown: React.FC = () => {
  const { customer, signOut } = useAuth();

  if (!customer) return null;

  // Generate initials from customer name
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const initials = getInitials(customer.first_name, customer.last_name);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-10 w-10 rounded-full border border-foreground/10 p-0">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={
                customer.image_url ||
                `https://api.dicebear.com/7.x/initials/svg?seed=${customer.first_name}${customer.last_name}`
              }
              alt={`${customer.first_name} ${customer.last_name}`}
            />
            <AvatarFallback className="bg-roam-blue text-white text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end" forceMount>
        <div className="flex items-center justify-start gap-2 p-2">
          <Avatar className="h-12 w-12">
            <AvatarImage
              src={
                customer.image_url ||
                `https://api.dicebear.com/7.x/initials/svg?seed=${customer.first_name}${customer.last_name}`
              }
              alt={`${customer.first_name} ${customer.last_name}`}
            />
            <AvatarFallback className="bg-roam-blue text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col space-y-1 leading-none">
            <p className="font-medium">
              {customer.first_name} {customer.last_name}
            </p>
            <p className="text-sm text-foreground/60">{customer.email}</p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            to="/customer/favorites"
            className="w-full flex items-center cursor-pointer"
          >
            <Heart className="mr-2 h-4 w-4" />
            <span>My Favorites</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            to="/customer/locations"
            className="w-full flex items-center cursor-pointer"
          >
            <MapPin className="mr-2 h-4 w-4" />
            <span>My Locations</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            to="/customer/transactions"
            className="w-full flex items-center cursor-pointer"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            <span>Transaction History</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            to="/customer/profile"
            className="w-full flex items-center cursor-pointer"
          >
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            to="/customer/settings"
            className="w-full flex items-center cursor-pointer"
          >
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="w-full flex items-center cursor-pointer text-red-600 focus:text-red-600"
          onClick={signOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
