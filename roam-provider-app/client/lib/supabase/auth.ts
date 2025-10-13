import { supabase, supabaseAdmin } from "./index";
import type { AuthCustomer, AuthProvider } from "@roam/shared/dist/types/auth";

export interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface ProfileUpdateData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  bio?: string;
  imageUrl?: string;
}

export class AuthAPI {
  // Customer Authentication
  static async signUpCustomer(data: SignUpData): Promise<AuthCustomer> {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          first_name: data.firstName,
          last_name: data.lastName,
          phone: data.phone,
        },
      },
    });

    if (authError) {
      throw new Error(this.getUserFriendlyError(authError.message));
    }

    if (!authData.user) {
      throw new Error("Registration failed - no user returned");
    }

    // Create customer profile
    const { data: customerProfile, error: profileError } = await supabase
      .from("customer_profiles")
      .insert({
        user_id: authData.user.id,
        email: data.email,
        first_name: data.firstName,
        last_name: data.lastName,
        phone: data.phone || "",
      })
      .select()
      .single();

    if (profileError) {
      // Clean up auth user if profile creation fails
      await supabase.auth.signOut();
      throw new Error("Failed to create customer profile");
    }

    return {
      id: customerProfile.id,
      user_id: customerProfile.user_id,
      email: customerProfile.email,
      customer_id: customerProfile.id,
      first_name: customerProfile.first_name,
      last_name: customerProfile.last_name,
      phone: customerProfile.phone,
      image_url: customerProfile.image_url,
    };
  }

  static async signInCustomer(data: SignInData): Promise<AuthCustomer> {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (authError) {
      throw new Error(this.getUserFriendlyError(authError.message));
    }

    if (!authData.user) {
      throw new Error("Authentication failed - no user returned");
    }

    // Fetch or create customer profile
    const { data: customerProfile, error: profileError } = await supabase
      .from("customer_profiles")
      .select("*")
      .eq("user_id", authData.user.id)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      throw new Error("Failed to fetch customer profile");
    }

    if (!customerProfile) {
      // Create customer profile if it doesn't exist
      const emailParts = authData.user.email?.split("@")[0] || "";
      const nameParts = emailParts.split(".");

      const { data: createdProfile, error: createError } = await supabase
        .from("customer_profiles")
        .insert({
          user_id: authData.user.id,
          email: authData.user.email || "",
          first_name: nameParts[0] || "Customer",
          last_name: nameParts[1] || "",
          phone: authData.user.phone || "",
        })
        .select()
        .single();

      if (createError) {
        throw new Error("Failed to create customer profile");
      }

      return {
        id: createdProfile.id,
        user_id: createdProfile.user_id,
        email: createdProfile.email,
        customer_id: createdProfile.id,
        first_name: createdProfile.first_name,
        last_name: createdProfile.last_name,
        phone: createdProfile.phone,
        image_url: null,
      };
    }

    return {
      id: customerProfile.id,
      user_id: customerProfile.user_id,
      email: customerProfile.email,
      customer_id: customerProfile.id,
      first_name: customerProfile.first_name,
      last_name: customerProfile.last_name,
      phone: customerProfile.phone,
      image_url: customerProfile.image_url,
    };
  }

  static async signInWithGoogle(): Promise<void> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/home`,
      },
    });

    if (error) {
      throw new Error(`Google sign-in failed: ${error.message}`);
    }
  }

  static async signInWithGoogleIdToken(idToken: string, nonce: string): Promise<AuthCustomer> {
    const { data: authData, error: authError } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
      nonce,
    });

    if (authError) {
      throw new Error(`Google sign-in failed: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error("No user data received from Google");
    }

    return await this.handleOAuthUser(authData.user);
  }

  static async signInWithApple(): Promise<void> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: {
        redirectTo: `${window.location.origin}/home`,
      },
    });

    if (error) {
      throw new Error(`Apple sign-in failed: ${error.message}`);
    }
  }

  static async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Sign out error:", error);
    }
  }

  static async resendVerificationEmail(email: string): Promise<void> {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });

    if (error) {
      throw new Error(`Failed to resend verification email: ${error.message}`);
    }
  }

  static async updateCustomerProfile(customerId: string, data: ProfileUpdateData): Promise<AuthCustomer> {
    const { data: updatedProfile, error } = await supabase
      .from("customer_profiles")
      .update({
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        phone: data.phone,
        date_of_birth: data.dateOfBirth || null,
        bio: data.bio || null,
        image_url: data.imageUrl || null,
      })
      .eq("id", customerId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update profile: ${error.message}`);
    }

    return {
      id: updatedProfile.id,
      user_id: updatedProfile.user_id,
      email: updatedProfile.email,
      customer_id: updatedProfile.id,
      first_name: updatedProfile.first_name,
      last_name: updatedProfile.last_name,
      phone: updatedProfile.phone,
      image_url: updatedProfile.image_url,
    };
  }

  static async uploadCustomerAvatar(customerId: string, file: File): Promise<string> {
    const fileExt = file.name.split(".").pop();
    const fileName = `${customerId}.${fileExt}`;
    const filePath = `customer_avatars/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("customer-avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      throw new Error(`Failed to upload avatar: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from("customer-avatars")
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  }

  // Provider Authentication
  static async getProviderByUserId(userId: string): Promise<AuthProvider | null> {
    console.log("🔍 getProviderByUserId called with userId:", userId);
    
    const { data: providers, error } = await supabase
      .from("providers")
      .select("id, user_id, business_id, location_id, first_name, last_name, email, provider_role, is_active")
      .eq("user_id", userId);

    console.log("🔍 getProviderByUserId result:", { providers, error });

    if (error) {
      console.error("🔍 getProviderByUserId error:", error);
      throw new Error(`Provider lookup failed: ${error.message}`);
    }

    // If no provider record exists, create a basic one
    if (providers.length === 0) {
      console.log("🔍 No provider record found, creating basic provider record");
      
      // Get user data from auth
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error("🔍 No user found in auth context");
        return null;
      }

      // Create basic provider record
      const { data: newProvider, error: createError } = await supabase
        .from("providers")
        .insert({
          user_id: userId,
          first_name: user.user_metadata?.first_name || user.user_metadata?.name?.split(' ')[0] || "Provider",
          last_name: user.user_metadata?.last_name || user.user_metadata?.name?.split(' ').slice(1).join(' ') || "",
          email: user.email,
          provider_role: "provider",
          is_active: true,
        })
        .select("id, user_id, business_id, location_id, first_name, last_name, email, provider_role, is_active")
        .single();

      if (createError) {
        console.error("🔍 Error creating provider record:", createError);
        return null;
      }

      console.log("🔍 Created basic provider record:", newProvider);
      return newProvider;
    }

    // Return the first provider found, regardless of is_active status
    return providers[0];
  }

  // Helper methods
  private static async handleOAuthUser(user: any): Promise<AuthCustomer> {
    const { data: customerProfile, error: profileError } = await supabase
      .from("customer_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      throw new Error("Failed to fetch customer profile");
    }

    if (!customerProfile) {
      // Create customer profile for OAuth user
      const fullName = user.user_metadata?.full_name || user.user_metadata?.name || "";
      const nameParts = fullName.split(" ");
      const firstName = nameParts[0] || "Customer";
      const lastName = nameParts.slice(1).join(" ") || "";

      const { data: createdProfile, error: createError } = await supabase
        .from("customer_profiles")
        .insert({
          user_id: user.id,
          email: user.email || "",
          first_name: firstName,
          last_name: lastName,
          phone: user.phone || "",
          image_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        })
        .select()
        .single();

      if (createError) {
        throw new Error("Failed to create customer profile");
      }

      return {
        id: createdProfile.id,
        user_id: createdProfile.user_id,
        email: createdProfile.email,
        customer_id: createdProfile.id,
        first_name: createdProfile.first_name,
        last_name: createdProfile.last_name,
        phone: createdProfile.phone,
        image_url: createdProfile.image_url,
      };
    }

    return {
      id: customerProfile.id,
      user_id: customerProfile.user_id,
      email: customerProfile.email,
      customer_id: customerProfile.id,
      first_name: customerProfile.first_name,
      last_name: customerProfile.last_name,
      phone: customerProfile.phone,
      image_url: customerProfile.image_url,
    };
  }

  private static getUserFriendlyError(message: string): string {
    if (message === "Invalid login credentials") {
      return "Invalid email or password";
    } else if (message.includes("Email not confirmed")) {
      return "Please check your email and click the confirmation link before signing in.";
    } else if (message.includes("Too many requests")) {
      return "Too many login attempts. Please wait a few minutes before trying again.";
    } else if (message.includes("User already registered")) {
      return "An account with this email already exists. Please sign in instead.";
    } else if (message.includes("Password should be")) {
      return "Password must be at least 6 characters long and contain at least one uppercase letter, one lowercase letter, and one number.";
    }
    return message;
  }
}
