import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { EmailService } from '../_lib/emailService';
import { ROAM_EMAIL_TEMPLATES } from '../_lib/emailTemplates';

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

    // Create status update record
    console.log('📝 Creating status history record...');
    const { error: historyError } = await supabase
      .from('booking_status_history')
      .insert({
        booking_id: bookingId,
        status: newStatus,
        changed_by: updatedBy,
        reason: reason,
        changed_at: new Date().toISOString()
      });

    if (historyError) {
      console.error('⚠️ Error creating status history (non-fatal):', {
        error: historyError,
        message: historyError.message,
        bookingId
      });
      // Don't fail the request if history insert fails
    } else {
      console.log('✅ Status history created');
    }

    // Send notifications based on status change (non-blocking)
    if (notifyCustomer || notifyProvider) {
      console.log('📧 Queuing notifications for status:', newStatus);
      // Queue notifications asynchronously - don't await or block the response
      sendStatusNotifications(booking, newStatus, { notifyCustomer, notifyProvider })
        .catch(error => {
          console.error('⚠️ Notification error (non-fatal):', error);
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
    const customer = booking.customer_profiles;
    const provider = booking.providers;

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
    const bookingDate = booking.booking_date ? new Date(booking.booking_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }) : 'Date TBD';
    
    const bookingTime = booking.booking_time ? new Date(`2000-01-01T${booking.booking_time}`).toLocaleTimeString('en-US', {
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
        customer_name: customer.first_name || 'Customer',
        service_name: booking.service_name || 'Service',
        provider_name: provider ? `${provider.first_name} ${provider.last_name}` : 'Provider',
        booking_date: bookingDate,
        booking_time: bookingTime,
        booking_location: booking.service_location || 'Location TBD',
        total_amount: booking.total_amount?.toFixed(2) || '0.00',
        booking_id: booking.id,
      };
    }
    // Notify customer when booking is completed
    else if (newStatus === 'completed' && options.notifyCustomer && customer?.user_id) {
      notificationType = 'customer_booking_completed';
      userId = customer.user_id;
      templateVariables = {
        customer_name: customer.first_name || 'Customer',
        service_name: booking.service_name || 'Service',
        provider_name: provider ? `${provider.first_name} ${provider.last_name}` : 'Provider',
        provider_id: provider?.id || '',
        booking_id: booking.id,
      };
    }
    // Notify provider when booking is cancelled
    else if (newStatus === 'cancelled' && options.notifyProvider && provider?.user_id) {
      notificationType = 'provider_booking_cancelled';
      userId = provider.user_id;
      templateVariables = {
        provider_name: provider.first_name || 'Provider',
        customer_name: customer ? `${customer.first_name} ${customer.last_name}` : 'Customer',
        service_name: booking.service_name || 'Service',
        booking_date: bookingDate,
        booking_time: bookingTime,
        cancellation_reason: booking.cancellation_reason || 'No reason provided',
      };
    }

    // Send notification email if we have a valid type and user
    if (notificationType && userId && customer?.email) {
      console.log(`📧 Sending ${notificationType} email to ${customer.email}`);
      
      try {
        // Send booking confirmation email directly using email template
        if (notificationType === 'customer_booking_accepted') {
          const emailHtml = ROAM_EMAIL_TEMPLATES.bookingConfirmed(
            templateVariables.customer_name,
            templateVariables.service_name,
            templateVariables.provider_name,
            templateVariables.booking_date,
            templateVariables.booking_time,
            templateVariables.booking_location,
            templateVariables.total_amount
          );

          const emailSent = await EmailService.sendEmail({
            to: customer.email,
            subject: `Booking Confirmed - ${templateVariables.service_name}`,
            html: emailHtml,
            text: `Your booking for ${templateVariables.service_name} with ${templateVariables.provider_name} on ${templateVariables.booking_date} at ${templateVariables.booking_time} has been confirmed!`
          });

          if (emailSent) {
            console.log('✅ Booking confirmation email sent successfully');
            
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
                  email_to: customer.email
                },
              });
          } else {
            console.error('❌ Failed to send booking confirmation email');
            
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
                  email_to: customer.email
                },
              });
          }
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
              email_to: customer.email
            },
          });
      }
    } else {
      console.log('ℹ️ No notification needed for status:', newStatus);
    }
  } catch (error) {
    // Don't fail the request if notifications fail - log and continue
    console.error('⚠️ Notification error (non-fatal):', error);
  }
}
