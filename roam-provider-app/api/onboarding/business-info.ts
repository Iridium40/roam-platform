import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface BusinessInfoData {
  businessName: string;
  businessType:
    | "independent"
    | "small_business"
    | "franchise"
    | "enterprise"
    | "other";
  contactEmail: string;
  phone: string;
  serviceCategories: string[];
  serviceSubcategories: string[];
  businessHours: { [key: string]: { open: string; close: string } };
  businessAddress: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  website?: string;
  socialMedia?: any;
  businessDescription?: string;
  yearsExperience: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("Received business info request body:", req.body);
    console.log("Request body keys:", Object.keys(req.body));
    
    const {
      userId,
      businessData,
    }: { userId: string; businessData: BusinessInfoData } = req.body;

    console.log("Extracted userId:", userId);
    console.log("Extracted businessData keys:", businessData ? Object.keys(businessData) : "No businessData");

    if (!userId || !businessData) {
      console.log("Missing required fields - userId:", !!userId, "businessData:", !!businessData);
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate required fields
    const requiredFields = [
      "businessName",
      "businessType",
      "contactEmail",
      "phone",
      "serviceCategories",
    ];
    for (const field of requiredFields) {
      const value = businessData[field as keyof BusinessInfoData];
      // For arrays, check if they exist and have length
      if (field === "serviceCategories") {
        if (!Array.isArray(value) || value.length === 0) {
          console.log("Service categories validation failed:", value);
          return res
            .status(400)
            .json({ error: `Missing required field: ${field}. At least one service category must be selected.` });
        }
      } else if (!value) {
        console.log(`Field ${field} validation failed:`, value);
        return res
          .status(400)
          .json({ error: `Missing required field: ${field}` });
      }
    }
    
    // Log the categories and subcategories being processed
    console.log("Service categories to be saved:", businessData.serviceCategories);
    console.log("Service subcategories to be saved:", businessData.serviceSubcategories);

    // Check if user exists
    let userData;
    try {
      const result = await supabase.auth.admin.getUserById(userId);
      userData = result.data;
      if (result.error) {
        console.error("Error fetching user:", result.error);
        return res.status(404).json({ error: "User not found" });
      }
    } catch (error) {
      console.error("User lookup error:", error);
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    if (!userData.user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if business profile already exists for this user
    // Look through providers table to find business owned by this user
    const { data: existingProvider } = await supabase
      .from("providers")
      .select("business_id")
      .eq("user_id", userId)
      .eq("provider_role", "owner")
      .single();

    let existingBusiness = null;
    if (existingProvider) {
      const { data: businessData } = await supabase
        .from("business_profiles")
        .select("id")
        .eq("id", existingProvider.business_id)
        .single();
      existingBusiness = businessData;
    }

    let businessProfileData;

    if (existingBusiness) {
      // Update existing business profile
      const { data: updatedBusiness, error: updateError } = await supabase
        .from("business_profiles")
        .update({
          business_name: businessData.businessName,
          business_type: businessData.businessType,
          contact_email: businessData.contactEmail,
          phone: businessData.phone,
          business_hours: businessData.businessHours,
          website_url: businessData.website,
          social_media: businessData.socialMedia || [],
          business_description: businessData.businessDescription,
          setup_step: 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingBusiness.id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating business profile:", updateError);
        return res
          .status(500)
          .json({ error: "Failed to update business information" });
      }

      businessProfileData = updatedBusiness;

      console.log("=== UPDATING EXISTING BUSINESS - CATEGORIES ===");
      console.log("Existing Business ID:", existingBusiness.id);
      console.log("Service categories from form:", businessData.serviceCategories);

      // Handle service categories - update associations
      if (
        businessData.serviceCategories &&
        businessData.serviceCategories.length > 0
      ) {
        console.log("Deleting existing categories...");
        // First, remove existing service category associations
        const { error: deleteError } = await supabase
          .from("business_service_categories")
          .delete()
          .eq("business_id", existingBusiness.id);

        if (deleteError) {
          console.error("Error deleting existing categories:", deleteError);
        } else {
          console.log("Existing categories deleted successfully");
        }

        // Create new service category associations using category IDs
        const categoryInserts = businessData.serviceCategories.map(
          (categoryId) => ({
            business_id: existingBusiness.id,
            category_id: categoryId,
            is_active: true,
          }),
        );

        console.log("Creating new category associations:", categoryInserts);

        const { data: categoryData, error: categoryError } = await supabase
          .from("business_service_categories")
          .insert(categoryInserts)
          .select();

        if (categoryError) {
          console.error(
            "❌ Error updating service category associations:",
            categoryError,
          );
          console.error("Category error details:", {
            message: categoryError.message,
            details: categoryError.details,
            hint: categoryError.hint,
            code: categoryError.code
          });
          // Continue anyway - categories can be updated later
        } else {
          console.log("✅ Categories updated successfully:", categoryData);
        }
      } else {
        console.log("⚠️ No categories to update (array empty or missing)");
      }

      console.log("=== UPDATING EXISTING BUSINESS - SUBCATEGORIES ===");
      console.log("Service subcategories from form:", businessData.serviceSubcategories);

      // Handle service subcategories - update associations
      if (
        businessData.serviceSubcategories &&
        businessData.serviceSubcategories.length > 0
      ) {
        console.log("Deleting existing subcategories...");
        // First, remove existing service subcategory associations
        const { error: deleteSubError } = await supabase
          .from("business_service_subcategories")
          .delete()
          .eq("business_id", existingBusiness.id);

        if (deleteSubError) {
          console.error("Error deleting existing subcategories:", deleteSubError);
        } else {
          console.log("Existing subcategories deleted successfully");
        }

        // Create new service subcategory associations using subcategory IDs
        // First, fetch the subcategory details to get their category_ids
        const { data: subcategoryDetails, error: fetchError } = await supabase
          .from("service_subcategories")
          .select("id, category_id")
          .in("id", businessData.serviceSubcategories);

        if (fetchError) {
          console.error("❌ Error fetching subcategory details:", fetchError);
          console.error("Fetch error details:", {
            message: fetchError.message,
            details: fetchError.details,
            hint: fetchError.hint,
            code: fetchError.code
          });
        } else {
          console.log("Fetched subcategory details:", subcategoryDetails);
          
          const subcategoryInserts = subcategoryDetails.map((subcategory) => ({
            business_id: existingBusiness.id,
            category_id: subcategory.category_id,
            subcategory_id: subcategory.id,
            is_active: true,
          }));

          console.log("Creating new subcategory associations:", subcategoryInserts);

          const { data: subcategoryData, error: subcategoryError } = await supabase
            .from("business_service_subcategories")
            .insert(subcategoryInserts)
            .select();

          if (subcategoryError) {
            console.error(
              "❌ Error updating service subcategory associations:",
              subcategoryError,
            );
            console.error("Subcategory error details:", {
              message: subcategoryError.message,
              details: subcategoryError.details,
              hint: subcategoryError.hint,
              code: subcategoryError.code
            });
            // Continue anyway - subcategories can be updated later
          } else {
            console.log("✅ Subcategories updated successfully:", subcategoryData);
          }
        }
      } else {
        console.log("⚠️ No subcategories to update (array empty or missing)");
      }
    } else {
      // Create new business profile
      const { data: newBusiness, error: createError } = await supabase
        .from("business_profiles")
        .insert({
          business_name: businessData.businessName,
          business_type: businessData.businessType,
          contact_email: businessData.contactEmail,
          phone: businessData.phone,
          business_hours: businessData.businessHours,
          website_url: businessData.website,
          social_media: businessData.socialMedia || [],
          business_description: businessData.businessDescription,
          verification_status: "pending",
          is_active: false,
          setup_step: 1,
          setup_completed: false,
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating business profile:", createError);
        return res
          .status(500)
          .json({ error: "Failed to create business profile" });
      }

      businessProfileData = newBusiness;

      // Handle service categories - create associations if they exist
      if (
        businessData.serviceCategories &&
        businessData.serviceCategories.length > 0
      ) {
        console.log("=== CREATING SERVICE CATEGORY ASSOCIATIONS ===");
        console.log("Business ID:", businessProfileData.id);
        console.log("Category IDs:", businessData.serviceCategories);
        
        // Create new service category associations using category IDs
        const categoryInserts = businessData.serviceCategories.map(
          (categoryId) => ({
            business_id: businessProfileData.id,
            category_id: categoryId,
            is_active: true,
          }),
        );

        console.log("Category inserts to be created:", categoryInserts);

        const { data: categoryData, error: categoryError } = await supabase
          .from("business_service_categories")
          .insert(categoryInserts)
          .select();

        if (categoryError) {
          console.error(
            "❌ Error creating service category associations:",
            categoryError,
          );
          console.error("Category error details:", {
            message: categoryError.message,
            details: categoryError.details,
            hint: categoryError.hint,
            code: categoryError.code
          });
          // Continue anyway - categories can be added later
        } else {
          console.log("✅ Service categories created successfully:", categoryData);
        }
      } else {
        console.log("⚠️ No service categories to create or array is empty");
      }

      // Handle service subcategories - create associations if they exist
      if (
        businessData.serviceSubcategories &&
        businessData.serviceSubcategories.length > 0
      ) {
        console.log("=== CREATING SERVICE SUBCATEGORY ASSOCIATIONS ===");
        console.log("Business ID:", businessProfileData.id);
        console.log("Subcategory IDs:", businessData.serviceSubcategories);
        
        // Create new service subcategory associations using subcategory IDs
        // First, fetch the subcategory details to get their category_ids
        const { data: subcategoryDetails, error: fetchError } = await supabase
          .from("service_subcategories")
          .select("id, category_id")
          .in("id", businessData.serviceSubcategories);

        if (fetchError) {
          console.error("❌ Error fetching subcategory details:", fetchError);
          console.error("Fetch error details:", {
            message: fetchError.message,
            details: fetchError.details,
            hint: fetchError.hint,
            code: fetchError.code
          });
        } else {
          console.log("Fetched subcategory details:", subcategoryDetails);
          
          const subcategoryInserts = subcategoryDetails.map((subcategory) => ({
            business_id: businessProfileData.id,
            category_id: subcategory.category_id,
            subcategory_id: subcategory.id,
            is_active: true,
          }));

          console.log("Subcategory inserts to be created:", subcategoryInserts);

          const { data: subcategoryData, error: subcategoryError } = await supabase
            .from("business_service_subcategories")
            .insert(subcategoryInserts)
            .select();

          if (subcategoryError) {
            console.error(
              "❌ Error creating service subcategory associations:",
              subcategoryError,
            );
            console.error("Subcategory error details:", {
              message: subcategoryError.message,
              details: subcategoryError.details,
              hint: subcategoryError.hint,
              code: subcategoryError.code
            });
            // Continue anyway - subcategories can be added later
          } else {
            console.log("✅ Service subcategories created successfully:", subcategoryData);
          }
        }
      } else {
        console.log("⚠️ No service subcategories to create or array is empty");
      }

      // Create default business location
      const { error: locationError } = await supabase
        .from("business_locations")
        .insert({
          business_id: businessProfileData.id,
          location_name: "Main Location",
          address_line1: businessData.businessAddress.addressLine1,
          address_line2: businessData.businessAddress.addressLine2,
          city: businessData.businessAddress.city,
          state: businessData.businessAddress.state,
          postal_code: businessData.businessAddress.postalCode,
          country: businessData.businessAddress.country,
          is_primary: true,
          is_active: true,
        });

      if (locationError) {
        console.error("Error creating business location:", locationError);
        // Continue anyway - location can be added later
      }

      // Create or update provider record
      // First check if a provider record exists for this user
      const { data: existingProvider, error: existingProviderError } =
        await supabase
          .from("providers")
          .select("*")
          .eq("user_id", userId)
          .single();

      let providerError = null;
      if (existingProvider) {
        // Get user info for names
        const userInfo = await supabase.auth.admin.getUserById(userId);
        const firstName =
          userInfo.data.user?.user_metadata?.first_name || "Provider";
        const lastName = userInfo.data.user?.user_metadata?.last_name || "";

        // Update existing provider record
        const { error: updateProviderError } = await supabase
          .from("providers")
          .update({
            business_id: businessProfileData.id,
            first_name: firstName,
            last_name: lastName,
            email: businessData.contactEmail,
            phone: businessData.phone,
            provider_role: "owner",
            verification_status: "pending",
            background_check_status: "under_review",
            is_active: false,
            business_managed: true,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        providerError = updateProviderError;
        console.log("Updated existing provider record for user:", userId);
      } else {
        // Get user info for names
        const userInfo = await supabase.auth.admin.getUserById(userId);
        const firstName =
          userInfo.data.user?.user_metadata?.first_name || "Provider";
        const lastName = userInfo.data.user?.user_metadata?.last_name || "";

        // Create new provider record
        const { error: createProviderError } = await supabase
          .from("providers")
          .insert({
            user_id: userId,
            business_id: businessProfileData.id,
            first_name: firstName,
            last_name: lastName,
            email: businessData.contactEmail,
            phone: businessData.phone,
            provider_role: "owner",
            verification_status: "pending",
            background_check_status: "under_review",
            is_active: false,
            business_managed: true,
          });

        providerError = createProviderError;
        console.log("Created new provider record for user:", userId);
      }

      if (providerError) {
        console.error("Error creating/updating provider:", providerError);
        // This is actually critical - return error if provider relationship can't be established
        return res.status(500).json({
          error: "Failed to establish business ownership relationship",
          details: providerError.message,
        });
      }
    }

    // Update business address
    const { error: addressError } = await supabase
      .from("business_locations")
      .upsert(
        {
          business_id: businessProfileData.id,
          location_name: "Main Location",
          address_line1: businessData.businessAddress.addressLine1,
          address_line2: businessData.businessAddress.addressLine2,
          city: businessData.businessAddress.city,
          state: businessData.businessAddress.state,
          postal_code: businessData.businessAddress.postalCode,
          country: businessData.businessAddress.country,
          is_primary: true,
          is_active: true,
        },
        {
          onConflict: "business_id",
        },
      );

    if (addressError) {
      console.error("Error updating business address:", addressError);
    }

    // Validate businessProfileData before returning
    if (!businessProfileData || !businessProfileData.id) {
      console.error(
        "Business profile data is missing or invalid:",
        businessProfileData,
      );
      return res.status(500).json({
        error: "Failed to create or update business profile",
        details: "Business profile data is missing",
      });
    }

    console.log("Business profile operation successful:", {
      id: businessProfileData.id,
      name: businessProfileData.business_name,
      dataType: typeof businessProfileData,
      hasData: !!businessProfileData,
    });

    const responseData = {
      success: true,
      business: businessProfileData,
    };

    console.log("Sending response:", JSON.stringify(responseData, null, 2));

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Business info submission error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
