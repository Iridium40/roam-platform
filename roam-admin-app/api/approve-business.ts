import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Proxy endpoint to call the provider app's approve-application API
 * This creates proper approval records in the application_approvals table
 * Updated: Now properly populates application_approvals audit trail
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { businessId, adminUserId, approvalNotes, sendEmail = true } = req.body;

    if (!businessId || !adminUserId) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["businessId", "adminUserId"],
      });
    }

    console.log("Proxying approval request to provider app:", {
      businessId,
      adminUserId,
      approvalNotes,
      sendEmail,
    });

    // Call the provider app's approve-application API with timeout
    const providerAppUrl = process.env.VITE_PROVIDER_APP_URL || "https://www.roamprovider.com";
    
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 second timeout
    
    let approvalResponse;
    try {
      approvalResponse = await fetch(
        `${providerAppUrl}/api/admin/approve-application`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            businessId,
            adminUserId,
            approvalNotes,
            sendEmail,
          }),
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error("Provider app request timed out after 25 seconds");
        return res.status(504).json({
          error: "Request timeout",
          details: "The approval request took too long to complete. Please try again.",
        });
      }
      throw fetchError;
    }

    console.log("Provider app response status:", approvalResponse.status);

    if (!approvalResponse.ok) {
      const errorText = await approvalResponse.text();
      console.error("Provider app approval error (raw):", errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { error: errorText };
      }
      
      console.error("Provider app approval error (parsed):", errorData);
      return res.status(approvalResponse.status).json({
        error: errorData.error || "Failed to approve application",
        details: errorData.details || errorText || null,
      });
    }

    const approvalResult = await approvalResponse.json();
    console.log("Approval successful:", approvalResult);

    return res.status(200).json(approvalResult);
  } catch (error) {
    console.error("Error in approve-business proxy:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

