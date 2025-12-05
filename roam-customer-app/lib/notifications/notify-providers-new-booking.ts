/**
 * Notify providers when a new booking is created
 * 
 * Logic:
 * - If booking.provider_id is null: Notify all providers with provider_role = 'owner' or 'dispatcher' for the business
 * - If booking.provider_id is set: Notify that specific provider
 * 
 * Uses direct Resend email sending for reliability and simplicity
 */

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

const getSupabaseServiceClient = () => {
  if (!process.env.VITE_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase configuration missing');
  }
  
  return createClient(
    process.env.VITE_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
};

export interface BookingNotificationData {
  booking: {
    id: string;
    business_id: string;
    provider_id: string | null;
    booking_date: string;
    start_time: string;
    total_amount: number;
    special_instructions?: string | null;
  };
  service: {
    name: string;
  };
  customer: {
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
  };
  business: {
    name: string;
    business_address?: string;
  };
}

/**
 * Notify providers about a new booking
 * This sends notifications via the provider app's notification API
 */
export async function notifyProvidersNewBooking(data: BookingNotificationData): Promise<void> {
  const supabase = getSupabaseServiceClient();
  
  try {
    const { booking, service, customer, business } = data;
    
    // Determine which providers to notify
    let providersToNotify: Array<{ id: string; user_id: string; provider_role: string }> = [];

    if (booking.provider_id) {
      // Booking is assigned to a specific provider - notify that provider
      console.log(`📋 Booking assigned to provider ${booking.provider_id}, notifying assigned provider`);
      
      const { data: assignedProvider, error: providerError } = await supabase
        .from('providers')
        .select('id, user_id, provider_role, is_active')
        .eq('id', booking.provider_id)
        .eq('is_active', true)
        .single();

      if (providerError || !assignedProvider) {
        console.error('❌ Error fetching assigned provider:', providerError);
        // Fallback: notify owners/dispatchers if assigned provider not found
        console.log('⚠️ Assigned provider not found, falling back to owners/dispatchers');
      } else {
        providersToNotify = [assignedProvider];
      }
    }

    // If no assigned provider or assigned provider not found, notify owners and dispatchers
    if (providersToNotify.length === 0) {
      console.log(`📋 Booking not assigned, notifying owners and dispatchers for business ${booking.business_id}`);
      
      const { data: businessProviders, error: providersError } = await supabase
        .from('providers')
        .select('id, user_id, provider_role, is_active')
        .eq('business_id', booking.business_id)
        .eq('is_active', true)
        .in('provider_role', ['owner', 'dispatcher']);

      if (providersError) {
        console.error('❌ Error fetching business providers:', providersError);
        throw providersError;
      }

      if (!businessProviders || businessProviders.length === 0) {
        console.warn(`⚠️ No owners or dispatchers found for business ${booking.business_id}`);
        return;
      }

      providersToNotify = businessProviders;
    }

    console.log(`📧 Notifying ${providersToNotify.length} provider(s) about new booking ${booking.id}`);

    // Format booking date and time
    const bookingDate = booking.booking_date 
      ? new Date(booking.booking_date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'Date TBD';
    
    const bookingTime = booking.start_time
      ? new Date(`2000-01-01T${booking.start_time}`).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
      : 'Time TBD';

    const customerName = `${customer.first_name} ${customer.last_name}`.trim();
    const location = business.business_address || 'Location TBD';
    const totalAmount = booking.total_amount?.toFixed(2) || '0.00';
    const specialInstructions = booking.special_instructions || 'None';

    // Get base URL for logo
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.PROVIDER_APP_API_URL || 'https://provider.roamyourbestlife.com';

    // Send email directly to each provider via Resend
    const notificationPromises = providersToNotify.map(async (provider) => {
      try {
        // Get provider email from database
        const { data: providerData } = await supabase
          .from('providers')
          .select('email, notification_email')
          .eq('id', provider.id)
          .single();

        const providerEmail = providerData?.notification_email || providerData?.email;

        if (!providerEmail) {
          console.warn(`⚠️ No email found for provider ${provider.id}, skipping notification`);
          return;
        }

        const providerRoleLabel = provider.provider_role === 'owner' 
          ? 'Owner' 
          : provider.provider_role === 'dispatcher' 
          ? 'Dispatcher' 
          : 'Provider';

        console.log(`📧 Sending new booking email to ${providerRoleLabel} (${provider.id}): ${providerEmail}`);

        // Build HTML email
        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <div style="background-color: #2C5F7D; padding: 30px 20px; text-align: center;">
      <img src="${baseUrl}/logo-email.png" alt="ROAM Logo" style="max-width: 200px; height: auto;">
    </div>
    
    <div style="padding: 40px 30px;">
      <div style="color: #F4A300; font-size: 24px; font-weight: bold; margin: 0 0 20px 0;">🔔 New Booking Request!</div>
      
      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Hi ${providerRoleLabel},</p>
      
      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">You have a new booking request for <strong>${business.name}</strong>.</p>
      
      <div style="background-color: #FFF8E1; border-left: 4px solid #F4A300; padding: 20px; margin: 30px 0; border-radius: 4px;">
        <div style="color: #F57F17; font-weight: bold; font-size: 14px; margin-bottom: 5px;">Service:</div>
        <div style="color: #333333; font-size: 16px; margin-bottom: 15px;">${service.name}</div>
        
        <div style="color: #F57F17; font-weight: bold; font-size: 14px; margin-bottom: 5px;">Customer:</div>
        <div style="color: #333333; font-size: 16px; margin-bottom: 15px;">${customerName}</div>
        
        <div style="color: #F57F17; font-weight: bold; font-size: 14px; margin-bottom: 5px;">Date:</div>
        <div style="color: #333333; font-size: 16px; margin-bottom: 15px;">${bookingDate}</div>
        
        <div style="color: #F57F17; font-weight: bold; font-size: 14px; margin-bottom: 5px;">Time:</div>
        <div style="color: #333333; font-size: 16px; margin-bottom: 15px;">${bookingTime}</div>
        
        <div style="color: #F57F17; font-weight: bold; font-size: 14px; margin-bottom: 5px;">Location:</div>
        <div style="color: #333333; font-size: 16px; margin-bottom: 15px;">${location}</div>
        
        <div style="color: #F57F17; font-weight: bold; font-size: 14px; margin-bottom: 5px;">Total Amount:</div>
        <div style="color: #333333; font-size: 16px; margin-bottom: 15px;">$${totalAmount}</div>
        
        <div style="color: #F57F17; font-weight: bold; font-size: 14px; margin-bottom: 5px;">Special Instructions:</div>
        <div style="color: #333333; font-size: 16px;">${specialInstructions}</div>
      </div>
      
      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Please log in to your provider dashboard to review and accept or decline this booking request.</p>
      
      <div style="text-align: center;">
        <a href="https://provider.roamyourbestlife.com/bookings" style="display: inline-block; padding: 15px 30px; background-color: #F4A300; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0;">View Booking</a>
      </div>
      
      <div style="border-top: 1px solid #e0e0e0; margin: 30px 0;"></div>
      
      <p style="color: #666666; font-size: 14px; line-height: 1.6; margin-bottom: 10px;">
        <strong>Booking ID:</strong> ${booking.id}
      </p>
      <p style="color: #666666; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
        For questions or issues, contact ROAM support.
      </p>
    </div>
    
    <div style="background-color: #f8f9fa; padding: 30px; text-align: center; color: #666666; font-size: 14px;">
      <p style="margin: 0 0 10px 0;"><strong>ROAM - Your Best Life. Everywhere.</strong></p>
      <p style="margin: 0 0 10px 0;">
        Need help? Contact us at 
        <a href="mailto:support@roamyourbestlife.com" style="color: #2C5F7D;">support@roamyourbestlife.com</a>
      </p>
      <p style="margin: 0; font-size: 12px; color: #999999;">
        © 2024 ROAM. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
        `;

        // Send email via Resend
        const { data: emailData, error: emailError } = await resend.emails.send({
          from: 'ROAM Support <support@roamyourbestlife.com>',
          to: [providerEmail],
          subject: `New Booking Request - ${service.name}`,
          html: emailHtml,
          text: `New Booking Request!

Hi ${providerRoleLabel},

You have a new booking request for ${business.name}.

BOOKING DETAILS:
Service: ${service.name}
Customer: ${customerName}
Date: ${bookingDate}
Time: ${bookingTime}
Location: ${location}
Total Amount: $${totalAmount}
Special Instructions: ${specialInstructions}

Please log in to your provider dashboard to review and accept or decline this booking request.

View booking: https://provider.roamyourbestlife.com/bookings

Booking ID: ${booking.id}

For questions or issues, contact ROAM support at support@roamyourbestlife.com.

Best regards,
The ROAM Team

© 2024 ROAM. All rights reserved.`,
        });

        if (emailError) {
          console.error(`❌ Error sending email to provider ${provider.id}:`, emailError);
          throw emailError;
        }

        console.log(`✅ Email sent to provider ${provider.id} (${providerRoleLabel}):`, {
          email: providerEmail,
          resendId: emailData?.id,
        });
      } catch (error) {
        console.error(`❌ Failed to notify provider ${provider.id}:`, error);
        // Continue with other providers even if one fails
      }
    });

    await Promise.allSettled(notificationPromises);
    console.log(`✅ Completed notifying providers for booking ${booking.id}`);
  } catch (error) {
    console.error('❌ Error in notifyProvidersNewBooking:', error);
    // Don't throw - notifications are non-critical
  }
}

