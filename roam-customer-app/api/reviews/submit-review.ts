import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      booking_id,
      overall_rating,
      service_rating,
      communication_rating,
      punctuality_rating,
      review_text,
      business_id,
      provider_id,
    } = req.body;

    if (!booking_id) {
      return res.status(400).json({ error: "booking_id is required" });
    }

    if (!overall_rating || overall_rating < 1 || overall_rating > 5) {
      return res.status(400).json({ error: "overall_rating must be between 1 and 5" });
    }

    console.log("[reviews/submit-review] Submitting review for booking:", booking_id);

    // Check if a review already exists for this booking
    const { data: existingReview, error: checkError } = await supabase
      .from("reviews")
      .select("id")
      .eq("booking_id", booking_id)
      .maybeSingle();

    if (checkError && checkError.code !== "PGRST116") {
      console.error("[reviews/submit-review] Error checking for existing review:", checkError);
      return res.status(500).json({
        error: "Failed to check for existing review",
        details: checkError.message,
      });
    }

    if (existingReview) {
      console.log("[reviews/submit-review] Review already exists for booking:", booking_id);
      return res.status(409).json({
        error: "Review already exists for this booking",
      });
    }

    // Insert the review
    const { data: review, error: insertError } = await supabase
      .from("reviews")
      .insert({
        booking_id,
        overall_rating,
        service_rating: service_rating ?? overall_rating,
        communication_rating: communication_rating ?? overall_rating,
        punctuality_rating: punctuality_rating ?? overall_rating,
        review_text: review_text || null,
        business_id: business_id ?? null,
        provider_id: provider_id ?? null,
        is_approved: false, // Reviews start as not approved (pending moderation)
        is_featured: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[reviews/submit-review] Error inserting review:", insertError);
      return res.status(500).json({
        error: "Failed to submit review",
        details: insertError.message,
      });
    }

    console.log("[reviews/submit-review] Review submitted successfully:", review.id);

    return res.status(200).json({
      success: true,
      review,
    });

  } catch (err) {
    console.error("[reviews/submit-review] Unexpected error:", err);
    return res.status(500).json({
      error: "Internal server error",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
