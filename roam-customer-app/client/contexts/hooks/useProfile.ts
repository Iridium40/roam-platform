import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { logger } from "@/utils/logger";

export const useProfile = () => {
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Update customer profile
  const updateProfile = useCallback(async (customerId: string, updates: any) => {
    try {
      setUpdatingProfile(true);

      const { error } = await supabase
        .from("customer_profiles")
        .update(updates)
        .eq("id", customerId);

      if (error) {
        logger.error("Error updating profile:", error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Profile update failed";
      logger.error("Error in updateProfile:", error);
      return { success: false, error: errorMessage };
    } finally {
      setUpdatingProfile(false);
    }
  }, []);

  // Update user metadata
  const updateUserMetadata = useCallback(async (updates: any) => {
    try {
      setUpdatingProfile(true);

      const { error } = await supabase.auth.updateUser({
        data: updates,
      });

      if (error) {
        logger.error("Error updating user metadata:", error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "User metadata update failed";
      logger.error("Error in updateUserMetadata:", error);
      return { success: false, error: errorMessage };
    } finally {
      setUpdatingProfile(false);
    }
  }, []);

  // Change password
  const changePassword = useCallback(async (newPassword: string) => {
    try {
      setUpdatingProfile(true);

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        logger.error("Error changing password:", error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Password change failed";
      logger.error("Error in changePassword:", error);
      return { success: false, error: errorMessage };
    } finally {
      setUpdatingProfile(false);
    }
  }, []);

  // Delete account
  const deleteAccount = useCallback(async (customerId: string) => {
    try {
      setUpdatingProfile(true);

      // First delete customer profile
      const { error: profileError } = await supabase
        .from("customer_profiles")
        .delete()
        .eq("id", customerId);

      if (profileError) {
        logger.error("Error deleting customer profile:", profileError);
        return { success: false, error: profileError.message };
      }

      // Then delete user account
      const { error: userError } = await supabase.auth.admin.deleteUser(
        (await supabase.auth.getUser()).data.user?.id || ""
      );

      if (userError) {
        logger.error("Error deleting user account:", userError);
        return { success: false, error: userError.message };
      }

      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Account deletion failed";
      logger.error("Error in deleteAccount:", error);
      return { success: false, error: errorMessage };
    } finally {
      setUpdatingProfile(false);
    }
  }, []);

  return {
    updatingProfile,
    updateProfile,
    updateUserMetadata,
    changePassword,
    deleteAccount,
  };
};
