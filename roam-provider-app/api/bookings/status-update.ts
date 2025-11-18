import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Safely import notification functions - these may fail in some environments
let sendSMS: any = null;
let notifyProvidersBookingCancelled: any = null;
let notifyProvidersBookingRescheduled: any = null;

try {
  const smsModule = require('../../lib/notifications/sms-service.js');
  sendSMS = smsModule.sendSMS;
} catch (e) {
  console.warn('⚠️ Could not load SMS service module:', e);
}

try {
  const cancelledModule = require('../../lib/notifications/notify-providers-booking-cancelled.js');
  notifyProvidersBookingCancelled = cancelledModule.notifyProvidersBookingCancelled;
} catch (e) {
  console.warn('⚠️ Could not load booking cancelled notification module:', e);
}

try {
  const rescheduledModule = require('../../lib/notifications/notify-providers-booking-rescheduled.js');
  notifyProvidersBookingRescheduled = rescheduledModule.notifyProvidersBookingRescheduled;
} catch (e) {
  console.warn('⚠️ Could not load booking rescheduled notification module:', e);
}

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Email service - inline to avoid module resolution issues in Vercel
const sendEmail = async (to: string, subject: string, html: string): Promise<boolean> => {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY not configured');
      return false;
    }

    const { data, error } = await resend.emails.send({
      from: 'ROAM Provider Support <providersupport@roamyourbestlife.com>',
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error('❌ Resend error:', error);
      return false;
    }

    console.log('✅ Email sent:', data?.id);
    return true;
  } catch (error) {
    console.error('❌ Email error:', error);
    return false;
  }
};

// Email template - inline
const getBookingConfirmationEmail = (
  customerName: string,
  serviceName: string,
  providerName: string,
  bookingDate: string,
  bookingTime: string,
  location: string,
  totalAmount: string
): string => {
  const logoUrl = "https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F993952d908754e5dbe0cceda03eb2224?format=webp&width=200";
  const brandColor = "#4F46E5";
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f9fafb; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; padding: 30px 20px; background: #f5f5f5; border-radius: 8px; margin: -40px -40px 30px -40px; }
        .logo img { max-width: 200px; height: auto; }
        .info-box { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0; }
        .highlight { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid ${brandColor}; margin: 20px 0; }
        .button { display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
        h1, h2, h3 { color: ${brandColor}; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo"><img src="${logoUrl}" alt="ROAM" /></div>
        </div>
        <h1>🎉 Your Booking Has Been Confirmed!</h1>
        <p>Hi ${customerName},</p>
        <p>Great news! Your booking has been confirmed by ${providerName}. We're excited to serve you!</p>
        
        <div class="info-box">
          <h2 style="margin-top: 0;">Booking Details</h2>
          <p style="margin: 10px 0;"><strong>Service:</strong> ${serviceName}</p>
          <p style="margin: 10px 0;"><strong>Provider:</strong> ${providerName}</p>
          <p style="margin: 10px 0;"><strong>Date:</strong> ${bookingDate}</p>
          <p style="margin: 10px 0;"><strong>Time:</strong> ${bookingTime}</p>
          <p style="margin: 10px 0;"><strong>Location:</strong> ${location}</p>
          <p style="margin: 10px 0;"><strong>Total:</strong> $${totalAmount}</p>
        </div>
        
        <div class="highlight">
          <h3>What's Next?</h3>
          <ul style="margin: 10px 0;">
            <li>You'll receive a reminder email 24 hours before your appointment</li>
            <li>If you need to make changes, please contact ${providerName} directly</li>
            <li>Arrive 5-10 minutes early if visiting a business location</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://roamyourbestlife.com/my-bookings" class="button">View My Bookings</a>
        </div>
        
        <p>Looking forward to seeing you!<br><strong>The ROAM Team</strong></p>
        
        <div class="footer">
          <p>Need help? Contact us at <a href="mailto:support@roamyourbestlife.com">support@roamyourbestlife.com</a></p>
          <p>© 2024 ROAM. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Email template for booking completion
const getBookingCompletionEmail = (
  customerName: string,
  serviceName: string,
  providerName: string,
  bookingDate: string,
  bookingTime: string,
  location: string,
  totalAmount: string
): string => {
  const logoUrl = "https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F993952d908754e5dbe0cceda03eb2224?format=webp&width=200";
  const brandColor = "#4F46E5";
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f9fafb; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; padding: 30px 20px; background: #f5f5f5; border-radius: 8px; margin: -40px -40px 30px -40px; }
        .logo img { max-width: 200px; height: auto; }
        .info-box { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0; }
        .highlight { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid ${brandColor}; margin: 20px 0; }
        .button { display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
        h1, h2, h3 { color: ${brandColor}; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo"><img src="${logoUrl}" alt="ROAM" /></div>
        </div>
        <h1>✨ Your Service Has Been Completed!</h1>
        <p>Hi ${customerName},</p>
        <p>Thank you for choosing ROAM! We hope you enjoyed your ${serviceName} service with ${providerName}.</p>
        
        <div class="info-box">
          <h2 style="margin-top: 0;">Service Details</h2>
          <p style="margin: 10px 0;"><strong>Service:</strong> ${serviceName}</p>
          <p style="margin: 10px 0;"><strong>Provider:</strong> ${providerName}</p>
          <p style="margin: 10px 0;"><strong>Date:</strong> ${bookingDate}</p>
          <p style="margin: 10px 0;"><strong>Time:</strong> ${bookingTime}</p>
          <p style="margin: 10px 0;"><strong>Location:</strong> ${location}</p>
          <p style="margin: 10px 0;"><strong>Total:</strong> $${totalAmount}</p>
        </div>
        
        <div class="highlight">
          <h3>What's Next?</h3>
          <ul style="margin: 10px 0;">
            <li>Share your experience by leaving a review</li>
            <li>Book again with ${providerName} or explore other services</li>
            <li>Check your booking history anytime</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://roamyourbestlife.com/my-bookings" class="button">View My Bookings</a>
        </div>
        
        <p>We appreciate your business!<br><strong>The ROAM Team</strong></p>
        
        <div class="footer">
          <p>Need help? Contact us at <a href="mailto:support@roamyourbestlife.com">support@roamyourbestlife.com</a></p>
          <p>© 2024 ROAM. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase credentials:', { 
        hasUrl: !!supabaseUrl, 
        hasKey: !!supabaseServiceKey 
      });
      return res.status(500).json({ 
        error: 'Server configuration error',
        details: 'Missing Supabase credentials'
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = req.body;
    const { 
      bookingId, 
      newStatus, 
      updatedBy, 
      reason, 
      notifyCustomer = true,
      notifyProvider = true 
    } = body;

    // Validate required fields
    if (!bookingId || !newStatus || !updatedBy) {
      console.error('❌ Missing required fields:', { bookingId, newStatus, updatedBy });
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: `bookingId: ${!!bookingId}, newStatus: ${!!newStatus}, updatedBy: ${!!updatedBy}`
      });
    }

    console.log('✅ Updating booking status:', { bookingId, newStatus, updatedBy, timestamp: new Date().toISOString() });

    // Update booking status in Supabase
    console.log('🔍 Executing Supabase update query...');
    const { data: booking, error: updateError } = await supabase
      .from('bookings')
      .update({
        booking_status: newStatus
      })
      .eq('id', bookingId)
      .select(`
        *,
        customer_profiles (
          id,
          first_name,
          last_name,
          email,
          phone,
          user_id
        ),
        providers (
          id,
          first_name,
          last_name,
          email,
          phone,
          user_id
        ),
        business_profiles (
          id,
          business_name,
          contact_email
        ),
        services (
          id,
          name
        )
      `)
      .single();

    if (updateError) {
      console.error('❌ Error updating booking:', {
        error: updateError,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        code: updateError.code,
        bookingId,
        newStatus
      });
      return res.status(500).json({ 
        error: 'Failed to update booking',
        details: updateError.message,
        code: updateError.code
      });
    }

    if (!booking) {
      console.error('❌ No booking returned after update:', { bookingId });
      return res.status(404).json({ 
        error: 'Booking not found or not updated',
        details: `No booking found with ID: ${bookingId}`
      });
    }

    console.log('✅ Booking updated successfully:', { bookingId, newStatus, timestamp: new Date().toISOString() });

    // Note: Status history tracking removed - table doesn't exist in current schema
    // The booking record itself maintains the current status

    // Send notifications based on status change (non-blocking)
    // Don't await - let it run in background
    if (notifyCustomer || notifyProvider) {
      console.log('📧 Queueing notifications for status:', newStatus);
      // Fire and forget - don't block the response
      sendStatusNotifications(booking, newStatus, { notifyCustomer, notifyProvider })
        .catch((notificationError) => {
          console.error('⚠️ Notification error (non-fatal):', notificationError);
        });
    }

    console.log('🎉 Status update completed successfully');
    return res.status(200).json({ 
      success: true, 
      booking,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Status update error (catch block):', {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Queue notifications based on booking status change
 * This is a lightweight approach that just queues notifications without external dependencies
 */
async function sendStatusNotifications(
  booking: any,
  newStatus: string,
  options: { notifyCustomer: boolean; notifyProvider: boolean }
) {
  try {
    const customer = Array.isArray(booking.customer_profiles)
      ? booking.customer_profiles[0]
      : booking.customer_profiles;
    const provider = Array.isArray(booking.providers)
      ? booking.providers[0]
      : booking.providers;

    const business = Array.isArray(booking.business_profiles)
      ? booking.business_profiles[0]
      : booking.business_profiles;

    const service = Array.isArray(booking.services)
      ? booking.services[0]
      : booking.services;

    const bookingDateRaw = booking.booking_date || booking.original_booking_date;
    const startTimeRaw = booking.start_time || booking.booking_time || booking.original_start_time;
    const locationName = business?.business_name || booking.business_name || 'Location';
    const locationAddress = business?.business_address || booking.business_address || booking.service_location;
    const serviceName = service?.name || booking.service_name || 'Service';

    const totalAmountValue =
      (booking.total_amount ?? 0) +
      (booking.service_fee ?? 0) +
      (booking.remaining_balance ?? 0);

    const totalAmountFormatted = totalAmountValue.toFixed(2);

    const customerName = customer
      ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Customer'
      : booking.guest_name || 'Customer';
    const customerEmail = customer?.email || booking.guest_email;

    if (!customer && !provider) {
      console.warn('⚠️ Missing customer and provider data, skipping notifications');
      return;
    }

    // Create a Supabase client for this function
    const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('⚠️ Missing Supabase credentials, skipping notifications');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Format booking data for templates
    const bookingDate = bookingDateRaw ? new Date(bookingDateRaw).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }) : 'Date TBD';
    
    const bookingTime = startTimeRaw ? new Date(`2000-01-01T${startTimeRaw}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }) : 'Time TBD';

    // Determine notification type based on status
    let notificationType: string | null = null;
    let userId: string | null = null;
    let templateVariables: Record<string, any> = {};

    // Notify customer when booking is confirmed/accepted
    if ((newStatus === 'confirmed' || newStatus === 'accepted') && options.notifyCustomer && customer?.user_id) {
      notificationType = 'customer_booking_accepted';
      userId = customer.user_id;
      templateVariables = {
        customer_name: customerName,
        service_name: serviceName,
        provider_name: provider ? `${provider.first_name} ${provider.last_name}` : 'Provider',
        booking_date: bookingDate,
        booking_time: bookingTime,
        booking_location: locationAddress || 'Location TBD',
        total_amount: totalAmountFormatted,
        booking_id: booking.id,
        location_name: locationName,
      };
    }
    // Notify customer when booking is completed
    else if (newStatus === 'completed' && options.notifyCustomer && customer?.user_id) {
      notificationType = 'customer_booking_completed';
      userId = customer.user_id;
      templateVariables = {
        customer_name: customerName,
        service_name: serviceName,
        provider_name: provider ? `${provider.first_name} ${provider.last_name}` : 'Provider',
        provider_id: provider?.id || '',
        booking_id: booking.id,
        booking_date: bookingDate,
        booking_time: bookingTime,
        booking_location: locationAddress || 'Location TBD',
        total_amount: totalAmountFormatted,
        location_name: locationName,
      };
    }
    // Notify providers when booking is cancelled (owners/dispatchers + assigned provider)
    if (newStatus === 'cancelled' && options.notifyProvider && business && notifyProvidersBookingCancelled) {
      try {
        await notifyProvidersBookingCancelled({
          booking: {
            id: booking.id,
            business_id: booking.business_id,
            provider_id: booking.provider_id,
            booking_date: bookingDateRaw || '',
            start_time: startTimeRaw || '',
            cancellation_reason: booking.cancellation_reason,
          },
          service: {
            name: serviceName,
          },
          customer: {
            first_name: customer?.first_name || booking.guest_name?.split(' ')[0] || 'Customer',
            last_name: customer?.last_name || booking.guest_name?.split(' ').slice(1).join(' ') || '',
          },
          business: {
            name: locationName,
            business_address: locationAddress,
          },
        });
      } catch (notificationError) {
        console.error('⚠️ Error sending cancellation notifications (non-fatal):', notificationError);
      }
    }

    // Notify providers when booking is rescheduled (owners/dispatchers + assigned provider)
    // Check if this is a reschedule by looking for reschedule fields
    if (options.notifyProvider && business && notifyProvidersBookingRescheduled && (
      booking.rescheduled_at || 
      booking.reschedule_reason || 
      (booking.original_booking_date && booking.original_booking_date !== booking.booking_date) ||
      (booking.original_start_time && booking.original_start_time !== booking.start_time)
    )) {
      try {
        await notifyProvidersBookingRescheduled({
          booking: {
            id: booking.id,
            business_id: booking.business_id,
            provider_id: booking.provider_id,
            booking_date: booking.booking_date || '',
            start_time: booking.start_time || '',
            original_booking_date: booking.original_booking_date,
            original_start_time: booking.original_start_time,
            reschedule_reason: booking.reschedule_reason,
          },
          service: {
            name: serviceName,
          },
          customer: {
            first_name: customer?.first_name || booking.guest_name?.split(' ')[0] || 'Customer',
            last_name: customer?.last_name || booking.guest_name?.split(' ').slice(1).join(' ') || '',
          },
          business: {
            name: locationName,
            business_address: locationAddress,
          },
        });
      } catch (notificationError) {
        console.error('⚠️ Error sending reschedule notifications (non-fatal):', notificationError);
      }
    }

    // Respect user notification preferences from user_settings
    let emailEnabled = true;
    let smsEnabled = false;

    if (notificationType && userId) {
      try {
        const { data: settings, error: settingsError } = await supabase
          .from('user_settings')
          .select('email_notifications, sms_notifications')
          .eq('user_id', userId)
          .maybeSingle();

        if (settingsError) {
          console.warn('⚠️ Failed to load user notification settings, using defaults (email enabled):', {
            userId,
            error: settingsError.message,
          });
        } else if (settings) {
          // email_notifications defaults to true in schema, but respect explicit false
          if (settings.email_notifications === false) {
            emailEnabled = false;
          }
          if (settings.sms_notifications === true) {
            smsEnabled = true;
          }
        }
      } catch (settingsCatchError) {
        console.warn('⚠️ Error fetching user settings, using defaults (email enabled):', {
          userId,
          error: settingsCatchError instanceof Error ? settingsCatchError.message : String(settingsCatchError),
        });
      }
    }

    const smsConfigured = Boolean(
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      (process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_FROM_NUMBER)
    );

    // Placeholder: SMS delivery not yet implemented
    if (smsEnabled) {
      console.log('ℹ️ SMS notifications requested for booking updates:', {
        userId,
        notificationType,
        smsConfigured,
      });
    }

    // Override contact details with user_settings notification email/phone if provided
    let targetEmail = customerEmail;
    let targetPhone = booking.guest_phone || (customer ? customer.phone : undefined);

    if (notificationType && userId) {
      try {
        const { data: contactSettings, error: contactSettingsError } = await supabase
          .from('user_settings')
          .select('notification_email, notification_phone')
          .eq('user_id', userId)
          .maybeSingle();

        if (contactSettingsError) {
          console.warn('⚠️ Failed to load notification contact overrides:', {
            userId,
            error: contactSettingsError.message,
          });
        } else if (contactSettings) {
          if (contactSettings.notification_email) {
            targetEmail = contactSettings.notification_email;
          }
          if (contactSettings.notification_phone) {
            targetPhone = contactSettings.notification_phone;
          }
        }
      } catch (contactCatchError) {
        console.warn('⚠️ Error retrieving notification contact overrides:', {
          userId,
          error: contactCatchError instanceof Error ? contactCatchError.message : String(contactCatchError),
        });
      }
    }

    // Send notification email if we have a valid type, user, email preference enabled, and recipient email
    if (notificationType && userId && emailEnabled && targetEmail) {
      console.log(`📧 Sending ${notificationType} email to ${targetEmail}`);
      
      try {
        let emailHtml: string | null = null;
        let emailSubject: string | null = null;

        // Send booking confirmation email directly using inline template
        if (notificationType === 'customer_booking_accepted') {
          emailHtml = getBookingConfirmationEmail(
            templateVariables.customer_name,
            templateVariables.service_name,
            templateVariables.provider_name,
            templateVariables.booking_date,
            templateVariables.booking_time,
            templateVariables.booking_location,
            templateVariables.total_amount
          );
          emailSubject = `Booking Confirmed - ${templateVariables.service_name}`;
        } else if (notificationType === 'customer_booking_completed') {
          emailHtml = getBookingCompletionEmail(
            templateVariables.customer_name,
            templateVariables.service_name,
            templateVariables.provider_name,
            templateVariables.booking_date,
            templateVariables.booking_time,
            templateVariables.booking_location,
            templateVariables.total_amount
          );
          emailSubject = `Service Completed - ${templateVariables.service_name}`;
        }

        if (emailHtml && emailSubject) {
          const emailSent = await sendEmail(
            targetEmail,
            emailSubject,
            emailHtml
          );

          if (emailSent) {
            console.log(`✅ ${notificationType} email sent successfully`);
            
            // Log the sent notification
            await supabase
              .from('notification_logs')
              .insert({
                user_id: userId,
                notification_type: notificationType,
                channel: 'email',
                status: 'sent',
                body: JSON.stringify(templateVariables),
                metadata: {
                  booking_id: booking.id,
                  event_type: `booking_${newStatus}`,
                  sent_at: new Date().toISOString(),
                  email_to: targetEmail
                },
              });
          } else {
            console.error(`❌ Failed to send ${notificationType} email`);
            
            // Log the failed notification
            await supabase
              .from('notification_logs')
              .insert({
                user_id: userId,
                notification_type: notificationType,
                channel: 'email',
                status: 'failed',
                body: JSON.stringify(templateVariables),
                metadata: {
                  booking_id: booking.id,
                  event_type: `booking_${newStatus}`,
                  error: 'Email service returned false',
                  email_to: targetEmail
                },
              });
          }
        } else {
          console.warn(`⚠️ No email template defined for notification type: ${notificationType}`);
        }
      } catch (emailError) {
        console.error('❌ Error sending notification email:', emailError);
        
        // Log the failed notification
        await supabase
          .from('notification_logs')
          .insert({
            user_id: userId,
            notification_type: notificationType,
            channel: 'email',
            status: 'failed',
            body: JSON.stringify(templateVariables),
            metadata: {
              booking_id: booking.id,
              event_type: `booking_${newStatus}`,
              error: emailError instanceof Error ? emailError.message : String(emailError),
              email_to: targetEmail
            },
          });
      }
    } else {
      console.log('ℹ️ No notification sent (preference or email missing):', {
        newStatus,
        notificationType,
        userId,
        emailEnabled,
        customerEmail,
      });
    }

    // Send SMS if enabled and configured
    if (notificationType && userId && smsEnabled && smsConfigured && targetPhone && sendSMS) {
      let smsBody: string | null = null;

      switch (notificationType) {
        case 'customer_booking_accepted':
          smsBody = `ROAM: Booking confirmed for ${templateVariables.service_name} on ${templateVariables.booking_date} at ${templateVariables.booking_time}. Location: ${templateVariables.booking_location}. Reply STOP to opt out.`;
          break;
        case 'customer_booking_completed':
          smsBody = `ROAM: Thank you! Your ${templateVariables.service_name} with ${templateVariables.provider_name} on ${templateVariables.booking_date} is complete. We hope you enjoyed your service! Reply STOP to opt out.`;
          break;
        case 'provider_booking_cancelled':
          smsBody = `ROAM: Booking with ${templateVariables.customer_name} on ${templateVariables.booking_date} at ${templateVariables.booking_time} was cancelled. Reason: ${templateVariables.cancellation_reason}. Reply STOP to opt out.`;
          break;
        default:
          smsBody = null;
      }

      if (smsBody) {
        try {
          console.log(`📱 Sending ${notificationType} SMS to ${targetPhone}`);
          const smsResult = await sendSMS({ to: targetPhone, body: smsBody });
          
          console.log(`✅ ${notificationType} SMS sent successfully`);
          
          // Log the sent notification
          await supabase
            .from('notification_logs')
            .insert({
              user_id: userId,
              notification_type: notificationType,
              channel: 'sms',
              status: 'sent',
              body: JSON.stringify(templateVariables),
              metadata: {
                booking_id: booking.id,
                event_type: `booking_${newStatus}`,
                sent_at: new Date().toISOString(),
                phone_to: targetPhone,
                sms_sid: smsResult.sid
              },
            });
        } catch (smsError) {
          console.error('❌ Failed to send SMS notification:', smsError);
          
          // Log the failed notification
          await supabase
            .from('notification_logs')
            .insert({
              user_id: userId,
              notification_type: notificationType,
              channel: 'sms',
              status: 'failed',
              body: JSON.stringify(templateVariables),
              metadata: {
                booking_id: booking.id,
                event_type: `booking_${newStatus}`,
                error: smsError instanceof Error ? smsError.message : String(smsError),
                phone_to: targetPhone
              },
            });
        }
      } else {
        console.log('ℹ️ No SMS template defined for notification type:', notificationType);
      }
    } else if (smsEnabled && !smsConfigured) {
      console.warn('⚠️ SMS notifications enabled but Twilio credentials are missing. Skipping SMS delivery.');
    }

    if (notificationType && userId && !emailEnabled) {
      console.log('ℹ️ Email notifications disabled for user:', { userId, notificationType });
    }

    if (notificationType && userId && !targetEmail) {
      console.log('ℹ️ No email address found for user:', { userId, notificationType });
    }

    if (notificationType && userId && !targetPhone) {
      console.log('ℹ️ No phone number found for user:', { userId, notificationType });
    }

  } catch (error) {
    console.error('❌ Error in sendStatusNotifications:', error);
  }
}
