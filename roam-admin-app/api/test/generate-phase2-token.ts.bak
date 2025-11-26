import { VercelRequest, VercelResponse } from "@vercel/node";
import { TokenService } from "../../server/services/tokenService.js";
import { supabase } from "../../server/lib/supabase.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { businessId, userId } = req.body;

    if (!businessId) {
      return res.status(400).json({ error: "businessId is required" });
    }

    console.log("🔑 Generating Phase 2 token for business:", businessId);

    // Get business owner's user_id if not provided
    let ownerUserId: string = userId || businessId;
    
    if (!userId) {
      try {
        const { data: ownerProvider, error: ownerError } = await supabase
          .from("providers")
          .select("user_id")
          .eq("business_id", businessId)
          .eq("provider_role", "owner")
          .single();

        if (!ownerError && ownerProvider?.user_id) {
          ownerUserId = ownerProvider.user_id;
          console.log("✅ Found business owner user_id:", ownerUserId);
        } else {
          console.warn("⚠️ Business owner not found, using businessId as userId:", ownerError);
        }
      } catch (error) {
        console.error("Error fetching business owner:", error);
      }
    }

    // Generate token using TokenService (includes issuer/audience)
    const token = TokenService.generatePhase2Token(businessId, ownerUserId);
    const phase2Url = TokenService.generatePhase2URL(businessId, ownerUserId);
    const expirationDate = TokenService.getTokenExpirationDate();

    console.log("✅ Token generated successfully");
    console.log("🔗 Phase 2 URL:", phase2Url);
    console.log("⏰ Expires:", expirationDate);

    return res.status(200).json({
      success: true,
      businessId,
      userId: ownerUserId,
      token,
      phase2Url,
      expirationDate,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      message: "Phase 2 token generated successfully",
    });
  } catch (error) {
    console.error("❌ Token generation error:", error);
    return res.status(500).json({
      error: "Failed to generate token",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

