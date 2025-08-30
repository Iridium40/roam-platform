import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client with service role key for admin operations
const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ContactSubmissionData {
  name: string;
  email: string;
  subject: string;
  message: string;
  category: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const submissionData: ContactSubmissionData = req.body;

    // Validate required fields
    const requiredFields: (keyof ContactSubmissionData)[] = [
      "name",
      "email",
      "subject",
      "message",
    ];
    
    for (const field of requiredFields) {
      if (!submissionData[field] || !submissionData[field].trim()) {
        return res
          .status(400)
          .json({ error: `Missing required field: ${field}` });
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(submissionData.email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    console.log("Processing contact submission from:", submissionData.email);

    // Create contact submission record using the new schema
    const { data: submission, error: submissionError } = await supabase
      .from("contact_submissions")
      .insert({
        from_email: submissionData.email,
        to_email: "contactus@roamyourbestlife.com",
        subject: submissionData.subject,
        message: submissionData.message,
        full_name: submissionData.name,
        category: submissionData.category,
        status: "received",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (submissionError) {
      console.error("Error creating contact submission:", submissionError);
      return res.status(500).json({
        error: "Failed to submit contact form",
        details: submissionError.message,
      });
    }

    console.log("Contact submission created successfully:", submission.id);

    // TODO: Send email notification to support team
    // This would integrate with your email service (Resend, SendGrid, etc.)
    try {
      // Placeholder for email sending logic
      console.log("📧 Email notification would be sent to support team");
      console.log("📧 Auto-reply would be sent to:", submissionData.email);
    } catch (emailError) {
      // Log email error but don't fail the submission
      console.error("Error sending email notifications:", emailError);
    }

    return res.status(201).json({
      success: true,
      submissionId: submission.id,
      message: "Contact form submitted successfully. We'll get back to you within 24 hours.",
    });

  } catch (error: any) {
    console.error("Contact submission error:", error);
    return res.status(500).json({
      error: error.message || "Internal server error",
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
}
