import { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: Request, res: Response) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, token } = req.body;

    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Email is required" });
    }

    // Validate Turnstile token
    if (!token || typeof token !== "string") {
      return res.status(400).json({ error: "Verification token is required" });
    }

    // Verify Turnstile token with Cloudflare
    const verificationResponse = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          secret: process.env.TURNSTILE_SECRET_KEY,
          response: token,
        }),
      }
    );

    const verificationResult = await verificationResponse.json();

    if (!verificationResult.success) {
      console.error("Turnstile verification failed:", verificationResult);
      return res.status(400).json({ error: "Verification failed. Please try again." });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Verify email with Emailable
    if (process.env.EMAILABLE_API_KEY) {
      try {
        const emailableResponse = await fetch(
          `https://api.emailable.com/v1/verify?email=${encodeURIComponent(email)}&api_key=${process.env.EMAILABLE_API_KEY}`
        );

        if (!emailableResponse.ok) {
          console.error(`Emailable API error: ${emailableResponse.status} ${emailableResponse.statusText}`);
          // Continue with subscription if API call fails
        } else {
          const emailableResult = await emailableResponse.json();

          // Reject invalid emails based on Emailable verification
          if (emailableResult.state === "undeliverable" || emailableResult.state === "risky") {
            console.log(`Email rejected by Emailable: ${email} - state: ${emailableResult.state}`);
            return res.status(400).json({ 
              error: "Please enter a valid email address" 
            });
          }

          // Log verification result for monitoring
          console.log(`Email verified by Emailable: ${email} - state: ${emailableResult.state}`);
        }
      } catch (emailableError) {
        console.error("Emailable verification error:", emailableError);
        // Continue with subscription even if Emailable verification fails
        // to avoid blocking legitimate users due to service issues
      }
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.VITE_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if email already exists in newsletter_subscribers table
    const { data: existingSubscriber, error: checkError } = await supabase
      .from("newsletter_subscribers")
      .select("id, email")
      .eq("email", email.toLowerCase())
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116 is "not found" which is expected for new subscribers
      console.error("Error checking existing subscriber:", checkError);
      return res.status(500).json({ error: "Database error" });
    }

    if (existingSubscriber) {
      // Email already subscribed
      return res.status(200).json({ 
        message: "You're already subscribed to our newsletter!",
        alreadySubscribed: true 
      });
    }

    // Insert new subscriber
    const { data: newSubscriber, error: insertError } = await supabase
      .from("newsletter_subscribers")
      .insert([
        {
          email: email.toLowerCase(),
          subscribed_at: new Date().toISOString(),
          source: "marketing_landing",
          status: "active",
        },
      ])
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting subscriber:", insertError);
      return res.status(500).json({ error: "Failed to subscribe" });
    }

    // Send welcome email using Resend
    try {
      await resend.emails.send({
        from: "ROAM <hello@roamyourbestlife.com>",
        to: email,
        subject: "Welcome to ROAM - We're Launching Soon! 🚀",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Welcome to ROAM</title>
            </head>
            <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #0EA5E9 0%, #06B6D4 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
                <img src="https://roamyourbestlife.com/logo-email.png" alt="ROAM Logo" style="width: 200px; height: auto; margin-bottom: 20px;" />
                <h1 style="color: white; margin: 0; font-size: 32px; font-weight: bold;">Welcome to ROAM!</h1>
                <p style="color: white; font-size: 18px; margin: 10px 0 0 0;">We're launching soon 🎉</p>
              </div>
              
              <div style="background: #f9fafb; padding: 30px 20px; border-radius: 0 0 10px 10px;">
                <p style="font-size: 16px; margin-bottom: 20px;">Hi there,</p>
                
                <p style="font-size: 16px; margin-bottom: 20px;">
                  Thank you for registering your interest in ROAM! You're now on the list to be among the first to know when we launch our revolutionary wellness platform.
                </p>
                
                <p style="font-size: 16px; margin-bottom: 20px;">
                  <strong>What's ROAM?</strong><br>
                  ROAM is a curated marketplace of mobile, in-studio, and virtual wellness services created for the 30A lifestyle. From IV therapy and massage to aesthetics and performance coaching, every experience is delivered by a licensed professional vetted by our local team.
                </p>
                
                <div style="background: white; border-left: 4px solid #0EA5E9; padding: 15px; margin: 20px 0; border-radius: 5px;">
                  <p style="margin: 0; font-size: 14px; color: #555;">
                    <strong>Coming Soon:</strong><br>
                    • Premium mobile wellness services<br>
                    • Vetted, licensed professionals<br>
                    • Seamless booking experience<br>
                    • Services delivered anywhere you are
                  </p>
                </div>
                
                <p style="font-size: 16px; margin-bottom: 20px;">
                  We'll keep you updated on our launch progress and notify you as soon as ROAM goes live!
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://roamyourbestlife.com" 
                     style="display: inline-block; background: linear-gradient(135deg, #0EA5E9 0%, #06B6D4 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                    Visit Our Website
                  </a>
                </div>
                
                <p style="font-size: 16px; margin-bottom: 20px;">
                  Stay tuned for more updates!
                </p>
                
                <p style="font-size: 16px; margin-bottom: 5px;">
                  Best regards,<br>
                  <strong>The ROAM Team</strong>
                </p>
              </div>
              
              <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
                <p style="margin: 5px 0;">© ${new Date().getFullYear()} ROAM. All rights reserved.</p>
                <p style="margin: 5px 0;">
                  <a href="https://roamyourbestlife.com" style="color: #0EA5E9; text-decoration: none;">roamyourbestlife.com</a>
                </p>
                <p style="margin: 15px 0 5px 0; font-size: 11px; color: #999;">
                  You received this email because you signed up for ROAM launch updates.
                </p>
              </div>
            </body>
          </html>
        `,
      });
    } catch (emailError) {
      console.error("Error sending welcome email:", emailError);
      // Don't fail the request if email fails - subscriber is already saved
    }

    return res.status(200).json({
      message: "Successfully subscribed! Check your email for a confirmation.",
      subscriber: newSubscriber,
    });
  } catch (error) {
    console.error("Subscription error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

