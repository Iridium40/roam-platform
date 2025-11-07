import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { notificationService } from '../../lib/notifications/notification-service';

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
          phone
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

    // Send notifications based on status change
    if (notifyCustomer || notifyProvider) {
      console.log('📧 Sending notifications for status:', newStatus);
      await sendStatusNotifications(booking, newStatus, { notifyCustomer, notifyProvider });
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
 * Send appropriate notifications based on booking status change
 */
async function sendStatusNotifications(
  booking: any,
  newStatus: string,
  options: { notifyCustomer: boolean; notifyProvider: boolean }
) {
  try {
    const customer = booking.customer_profiles;
    const provider = booking.providers;
    const business = booking.business_profiles;

    if (!customer || !provider) {
      console.warn('⚠️ Missing customer or provider data, skipping notifications');
      return;
    }

    // Format booking data for templates
    const bookingDate = new Date(booking.booking_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const bookingTime = new Date(`2000-01-01T${booking.booking_time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    // Notify customer when booking is accepted
    if (newStatus === 'accepted' && options.notifyCustomer && customer.user_id) {
      console.log('📧 Sending acceptance notification to customer');
      await notificationService.send({
        userId: customer.user_id,
        notificationType: 'customer_booking_accepted',
        templateVariables: {
          customer_name: customer.first_name,
          service_name: booking.service_name || 'Service',
          provider_name: `${provider.first_name} ${provider.last_name}`,
          booking_date: bookingDate,
          booking_time: bookingTime,
          booking_location: booking.service_location || 'Location TBD',
          total_amount: booking.total_amount?.toFixed(2) || '0.00',
          booking_id: booking.id,
        },
        metadata: {
          booking_id: booking.id,
          event_type: 'booking_accepted',
        },
      });
    }

    // Notify customer when booking is completed
    if (newStatus === 'completed' && options.notifyCustomer && customer.user_id) {
      console.log('📧 Sending completion notification to customer');
      await notificationService.send({
        userId: customer.user_id,
        notificationType: 'customer_booking_completed',
        templateVariables: {
          customer_name: customer.first_name,
          service_name: booking.service_name || 'Service',
          provider_name: `${provider.first_name} ${provider.last_name}`,
          provider_id: provider.id,
          booking_id: booking.id,
        },
        metadata: {
          booking_id: booking.id,
          event_type: 'booking_completed',
        },
      });
    }

    // Notify provider when booking is cancelled
    if (newStatus === 'cancelled' && options.notifyProvider && provider.user_id) {
      console.log('📧 Sending cancellation notification to provider');
      await notificationService.send({
        userId: provider.user_id,
        notificationType: 'provider_booking_cancelled',
        templateVariables: {
          provider_name: provider.first_name,
          customer_name: `${customer.first_name} ${customer.last_name}`,
          service_name: booking.service_name || 'Service',
          booking_date: bookingDate,
          booking_time: bookingTime,
          cancellation_reason: booking.cancellation_reason || 'No reason provided',
        },
        metadata: {
          booking_id: booking.id,
          event_type: 'booking_cancelled',
        },
      });
    }

    console.log('✅ Notifications sent successfully');
  } catch (error) {
    // Don't fail the request if notifications fail - log and continue
    console.error('⚠️ Notification error (non-fatal):', error);
  }
}

// Webhook endpoint for external status updates - removed for Vercel compatibility
// export async function PUT(request: NextRequest) {
//   try {
//     const body = await request.json();
//     const { bookingId, status, source } = body;

//     // Validate webhook signature if needed
//     // const signature = request.headers.get('x-webhook-signature');
//     // if (!verifyWebhookSignature(signature, body)) {
//     //   return new Response('Invalid signature', { status: 401 });
//     // }

//     // Process external status update
//     const response = await POST(request);
//     return response;

//   } catch (error) {
//     console.error('Webhook error:', error);
//     return new Response('Webhook processing failed', { status: 500 });
//   }
// }
