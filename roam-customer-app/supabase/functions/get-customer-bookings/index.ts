// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get query parameters
    const url = new URL(req.url)
    const customerId = url.searchParams.get('customerId')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const page = parseInt(url.searchParams.get('page') || '0')
    const offset = page * limit

    if (!customerId) {
      return new Response(
        JSON.stringify({ error: 'customerId is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Use the working SQL query
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        providers!left (
          id,
          first_name,
          last_name,
          email,
          phone,
          image_url,
          business_id,
          average_rating
        ),
        services!left (
          id,
          name,
          description,
          min_price,
          duration_minutes
        ),
        business_services!left (
          business_duration_minutes
        ),
        customer_profiles!left (
          id,
          first_name,
          last_name,
          email,
          phone
        )
      `)
      .eq('customer_id', customerId)
      .order('booking_date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Database error:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Transform the data to match the expected format
    const transformedBookings = (data || []).map((booking) => ({
      ...booking,
      service_name: booking.services?.name || "Service",
      service: booking.services?.name || "Service",
      serviceId: booking.service_id,
      provider: {
        id: booking.providers?.id,
        name: `${booking.providers?.first_name || ""} ${booking.providers?.last_name || ""}`.trim(),
        firstName: booking.providers?.first_name,
        lastName: booking.providers?.last_name,
        email: booking.providers?.email,
        phone: booking.providers?.phone,
        image: booking.providers?.image_url,
        rating: booking.providers?.average_rating || 0,
      },
      providers: booking.providers,
      customer_profiles: booking.customer_profiles,
      date: booking.booking_date,
      time: booking.start_time,
      status: booking.booking_status,
      deliveryType: booking.delivery_type,
      location: "Location TBD",
      locationDetails: null,
      price: booking.total_amount ? `$${booking.total_amount}` : "Price TBD",
      duration: booking.business_services?.[0]?.business_duration_minutes 
        ? `${booking.business_services[0].business_duration_minutes} min` 
        : booking.services?.duration_minutes 
        ? `${booking.services.duration_minutes} min` 
        : "60 min",
      notes: booking.admin_notes,
      bookingReference: booking.booking_reference,
      reschedule_count: booking.reschedule_count || 0,
      original_booking_date: booking.original_booking_date,
      original_start_time: booking.original_start_time,
      reschedule_reason: booking.reschedule_reason,
    }))

    return new Response(
      JSON.stringify({ 
        data: transformedBookings,
        count: transformedBookings.length,
        page,
        limit
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get-customer-bookings' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
