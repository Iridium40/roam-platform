import { createClient } from '@supabase/supabase-js';
import { createNotificationService } from '@roam/shared';

export const runtime = 'edge';

// Initialize Supabase client for Edge Runtime
const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(request: Request) {
  try {
    const body = await request.json();
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
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update booking status in Supabase
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
          email
        )
      `)
      .single();

    if (updateError) {
      console.error('Error updating booking:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update booking' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create status update record
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
      console.error('Error creating status history:', historyError);
    }

    // Send notifications using shared service (non-blocking)
    // Wrap in try-catch to prevent notification failures from breaking status update
    try {
      const notificationService = createNotificationService();
      
      // Run notification async without blocking the response
      notificationService.sendBookingStatusUpdate(
        booking,
        newStatus,
        notifyCustomer,
        notifyProvider
      ).then((results) => {
        console.log('✅ Notification results:', results);
      }).catch((error) => {
        console.error('⚠️ Notification error (non-blocking):', error);
        // Don't throw - notifications are optional
      });
    } catch (error) {
      console.error('⚠️ Notification service initialization error:', error);
      // Continue anyway - notification failure shouldn't block status update
    }

    return new Response(JSON.stringify({ 
      success: true, 
      booking
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Status update error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
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
