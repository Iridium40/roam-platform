import React, { createContext, useContext, useState, useEffect } from "react";
import { AuthAPI, SignUpData, SignInData, ProfileUpdateData } from "@/lib/supabase-utils/auth";
import { StorageAPI } from "@/lib/supabase-utils/storage";
import { apiClient } from "@/lib/api/client";
import { toast } from "@/hooks/use-toast";
import type { AuthCustomer } from "@roam/shared/dist/types/auth";

interface CustomerAuthContextType {
  customer: AuthCustomer | null;
  loading: boolean;
  signUp: (data: SignUpData) => Promise<void>;
  signIn: (data: SignInData) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithGoogleIdToken: (idToken: string, nonce: string) => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<void>;
  updateProfile: (data: ProfileUpdateData) => Promise<void>;
  uploadAvatar: (file: File) => Promise<string>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

export const useCustomerAuth = () => {
  const context = useContext(CustomerAuthContext);
  if (context === undefined) {
    throw new Error("useCustomerAuth must be used within a CustomerAuthProvider");
  }
  return context;
};

interface CustomerAuthProviderProps {
  children: React.ReactNode;
}

export const CustomerAuthProvider: React.FC<CustomerAuthProviderProps> = ({ children }) => {
  const [customer, setCustomer] = useState<AuthCustomer | null>(null);
  const [loading, setLoading] = useState(true);

  const clearStoredData = () => {
    localStorage.removeItem("roam_customer");
    localStorage.removeItem("roam_access_token");
    localStorage.removeItem("roam_user_type");
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Try to restore session from localStorage first
        const storedCustomer = localStorage.getItem("roam_customer");
        const storedToken = localStorage.getItem("roam_access_token");

        if (storedCustomer && storedToken) {
          const customerData = JSON.parse(storedCustomer);
          
          // Set auth token for API client
          apiClient.setAuthToken(storedToken);
          
          if (customerData.user_id) {
            setCustomer(customerData);
            setLoading(false);
            return;
          } else {
            clearStoredData();
          }
        }

        // Try to get current session from Supabase
        const { data: { session } } = await import("@/lib/supabase").then(m => m.supabase.auth.getSession());
        
        if (session?.user) {
          // If we have a session, just fetch the customer profile directly
          const { data: customerProfile, error: profileError } = await import("@/lib/supabase").then(m => m.supabase
            .from("customer_profiles")
            .select("*")
            .eq("user_id", session.user.id)
            .single());

          if (profileError && profileError.code !== "PGRST116") {
            console.error("Failed to fetch customer profile:", profileError);
            clearStoredData();
            return;
          }

          if (customerProfile) {
            const customerData = {
              id: customerProfile.id,
              user_id: customerProfile.user_id,
              email: customerProfile.email,
              customer_id: customerProfile.id,
              first_name: customerProfile.first_name,
              last_name: customerProfile.last_name,
              phone: customerProfile.phone,
              image_url: customerProfile.image_url,
            };
            
            setCustomer(customerData);
            localStorage.setItem("roam_customer", JSON.stringify(customerData));
            localStorage.setItem("roam_access_token", session.access_token);
            localStorage.setItem("roam_user_type", "customer");
            apiClient.setAuthToken(session.access_token);
          } else {
            clearStoredData();
          }
        } else {
          clearStoredData();
        }
      } catch (error) {
        console.error("Error during auth initialization:", error);
        clearStoredData();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const signUp = async (data: SignUpData) => {
    setLoading(true);
    try {
      const customerData = await AuthAPI.signUpCustomer(data);
      
      setCustomer(customerData);
      localStorage.setItem("roam_customer", JSON.stringify(customerData));
      localStorage.setItem("roam_user_type", "customer");
      
      // Set auth token if session is available
      const { data: { session } } = await import("@/lib/supabase").then(m => m.supabase.auth.getSession());
      if (session?.access_token) {
        localStorage.setItem("roam_access_token", session.access_token);
        apiClient.setAuthToken(session.access_token);
      }

      toast({
        title: "Registration Successful",
        description: "Welcome! Your account has been created.",
      });
    } catch (error) {
      console.error("Sign up error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (data: SignInData) => {
    setLoading(true);
    try {
      const customerData = await AuthAPI.signInCustomer(data);
      
      setCustomer(customerData);
      localStorage.setItem("roam_customer", JSON.stringify(customerData));
      localStorage.setItem("roam_user_type", "customer");
      
      // Set auth token
      const { data: { session } } = await import("@/lib/supabase").then(m => m.supabase.auth.getSession());
      if (session?.access_token) {
        localStorage.setItem("roam_access_token", session.access_token);
        apiClient.setAuthToken(session.access_token);
      }
    } catch (error) {
      console.error("Sign in error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      await AuthAPI.signInWithGoogle();
    } catch (error) {
      console.error("Google sign in error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogleIdToken = async (idToken: string, nonce: string) => {
    setLoading(true);
    try {
      const customerData = await AuthAPI.signInWithGoogleIdToken(idToken, nonce);
      
      setCustomer(customerData);
      localStorage.setItem("roam_customer", JSON.stringify(customerData));
      localStorage.setItem("roam_user_type", "customer");
      
      // Set auth token
      const { data: { session } } = await import("@/lib/supabase").then(m => m.supabase.auth.getSession());
      if (session?.access_token) {
        localStorage.setItem("roam_access_token", session.access_token);
        apiClient.setAuthToken(session.access_token);
      }
    } catch (error) {
      console.error("Google ID token sign in error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithApple = async () => {
    setLoading(true);
    try {
      await AuthAPI.signInWithApple();
    } catch (error) {
      console.error("Apple sign in error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      setCustomer(null);
      clearStoredData();
      apiClient.clearAuthToken();
      await AuthAPI.signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setLoading(false);
    }
  };

  const resendVerificationEmail = async (email: string) => {
    try {
      await AuthAPI.resendVerificationEmail(email);
      toast({
        title: "Verification Email Sent",
        description: "Please check your email for the verification link.",
      });
    } catch (error) {
      console.error("Error resending verification email:", error);
      throw error;
    }
  };

  const updateProfile = async (data: ProfileUpdateData) => {
    if (!customer) {
      throw new Error("No customer logged in");
    }

    try {
      const updatedCustomer = await AuthAPI.updateCustomerProfile(customer.id, data);
      
      setCustomer(updatedCustomer);
      localStorage.setItem("roam_customer", JSON.stringify(updatedCustomer));

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      console.error("Error updating customer profile:", error);
      throw error;
    }
  };

  const uploadAvatar = async (file: File): Promise<string> => {
    if (!customer) {
      throw new Error("No customer logged in");
    }

    try {
      const result = await StorageAPI.uploadCustomerAvatar(customer.id, file);
      
      // Update customer profile with new avatar URL
      await updateProfile({
        firstName: customer.first_name,
        lastName: customer.last_name,
        email: customer.email,
        phone: customer.phone || "",
        imageUrl: result.publicUrl,
      });

      return result.publicUrl;
    } catch (error) {
      console.error("Error uploading customer avatar:", error);
      throw error;
    }
  };

  const refreshUser = async () => {
    if (!customer) return;

    try {
      const { data: customerProfile, error } = await import("@/lib/supabase").then(m => 
        m.supabase
          .from("customer_profiles")
          .select("*")
          .eq("id", customer.id)
          .single()
      );

      if (error) {
        console.error("Error refreshing customer profile:", error);
        return;
      }

      const updatedCustomerData = {
        id: customerProfile.id,
        user_id: customerProfile.user_id,
        email: customerProfile.email,
        customer_id: customerProfile.id,
        first_name: customerProfile.first_name,
        last_name: customerProfile.last_name,
        phone: customerProfile.phone,
        image_url: customerProfile.image_url,
      };

      setCustomer(updatedCustomerData);
      localStorage.setItem("roam_customer", JSON.stringify(updatedCustomerData));
    } catch (error) {
      console.error("Error refreshing user:", error);
    }
  };

  const isAuthenticated = !!customer;

  return (
    <CustomerAuthContext.Provider
      value={{
        customer,
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        signInWithGoogleIdToken,
        signInWithApple,
        signOut,
        resendVerificationEmail,
        updateProfile,
        uploadAvatar,
        refreshUser,
        isAuthenticated,
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
};
