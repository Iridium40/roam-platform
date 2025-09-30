import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// Initialize Supabase admin client
const supabaseAdmin = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Validate environment variables
if (!process.env.VITE_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables:', {
    VITE_PUBLIC_SUPABASE_URL: !!process.env.VITE_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY
  });
}

// GET /api/business/services - Get all business services for a business (paginated and optimized)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('business_id');
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '25', 10), 1), 100);
    const status = searchParams.get('status'); // 'active' | 'inactive' | null

    if (!businessId) {
      return NextResponse.json(
        { error: 'business_id parameter is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Base query for business services (no heavy joins)
    let baseQuery = supabaseAdmin
      .from('business_services')
      .select('id, business_id, service_id, business_price, is_active, delivery_type, created_at', { count: 'exact' })
      .eq('business_id', businessId);

    if (status === 'active') baseQuery = baseQuery.eq('is_active', true);
    if (status === 'inactive') baseQuery = baseQuery.eq('is_active', false);

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: bsRows, error: bsError, count: totalCount } = await baseQuery
      .order('created_at', { ascending: false })
      .range(from, to);

    if (bsError) {
      console.error('Error fetching business services:', bsError);
      return NextResponse.json(
        { error: 'Failed to fetch business services', details: bsError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    const serviceIds = Array.from(new Set((bsRows || []).map((r: any) => r.service_id))).filter(Boolean);

    // Fetch service details separately to avoid deep join overhead
    let serviceDetailsMap: Record<string, any> = {};
    if (serviceIds.length > 0) {
      const { data: serviceDetails, error: svcError } = await supabaseAdmin
        .from('services')
        .select(`
          id,
          name,
          description,
          min_price,
          duration_minutes,
          image_url,
          service_subcategories (
            service_subcategory_type,
            service_categories (
              service_category_type
            )
          )
        `)
        .in('id', serviceIds);

      if (svcError) {
        console.error('Error fetching service details:', svcError);
      } else {
        serviceDetailsMap = Object.fromEntries((serviceDetails || []).map((s: any) => [s.id, s]));
      }
    }

    const services = (bsRows || []).map((row: any) => ({
      ...row,
      services: serviceDetailsMap[row.service_id] || null
    }));

    // Stats (fast counts)
    const activeCountPromise = supabaseAdmin
      .from('business_services')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('is_active', true);

    const [{ count: activeCount }] = await Promise.all([activeCountPromise]);

    const stats = {
      total_services: totalCount || 0,
      active_services: activeCount || 0,
      total_revenue: 0,
      avg_price: services.length > 0 ? services.reduce((sum: number, s: any) => sum + (s.business_price || 0), 0) / services.length : 0
    };

    return NextResponse.json({
      business_id: businessId,
      services,
      stats,
      pagination: { page, limit, total: totalCount || 0 }
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error in GET /api/business/services:', error);
    console.error('Request URL:', request.url);
    console.error('Environment check:', {
      supabase_url: !!process.env.VITE_PUBLIC_SUPABASE_URL,
      service_role_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    });
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error',
        api_endpoint: '/api/business/services',
        timestamp: new Date().toISOString()
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST /api/business/services - Add a new business service
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { business_id, service_id, business_price, delivery_type = 'customer_location', is_active = true } = body;

    // Validate required fields
    if (!business_id || !service_id || business_price === undefined) {
      return NextResponse.json(
        { error: 'business_id, service_id, and business_price are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate price
    if (typeof business_price !== 'number' || business_price <= 0) {
      return NextResponse.json(
        { error: 'business_price must be a positive number' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if service exists and get minimum price
    const { data: service, error: serviceError } = await supabaseAdmin
      .from('services')
      .select('id, name, min_price')
      .eq('id', service_id)
      .single();

    if (serviceError || !service) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Validate minimum price
    if (business_price < service.min_price) {
      return NextResponse.json(
        { error: `Price must be at least $${service.min_price} for ${service.name}` },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if business service already exists
    const { data: existingService, error: existingError } = await supabaseAdmin
      .from('business_services')
      .select('id')
      .eq('business_id', business_id)
      .eq('service_id', service_id)
      .single();

    if (existingService) {
      return NextResponse.json(
        { error: 'Service already added to business' },
        { status: 409, headers: corsHeaders }
      );
    }

    // Insert new business service
    const { data: newBusinessService, error: insertError } = await supabaseAdmin
      .from('business_services')
      .insert({
        business_id,
        service_id,
        business_price,
        delivery_type,
        is_active
      })
      .select(`
        *,
        services:service_id (
          id,
          name,
          description,
          min_price,
          duration_minutes,
          image_url,
          service_subcategories (
            service_subcategory_type,
            service_categories (
              service_category_type
            )
          )
        )
      `)
      .single();

    if (insertError) {
      console.error('Error inserting business service:', insertError);
      return NextResponse.json(
        { error: 'Failed to add service', details: insertError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      message: 'Service added successfully',
      service: newBusinessService
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error in POST /api/business/services:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// PUT /api/business/services - Update an existing business service
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { business_id, service_id, business_price, delivery_type, is_active } = body;

    // Validate required fields
    if (!business_id || !service_id) {
      return NextResponse.json(
        { error: 'business_id and service_id are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate price if provided
    if (business_price !== undefined) {
      if (typeof business_price !== 'number' || business_price <= 0) {
        return NextResponse.json(
          { error: 'business_price must be a positive number' },
          { status: 400, headers: corsHeaders }
        );
      }

      // Check minimum price requirement
      const { data: service, error: serviceError } = await supabaseAdmin
        .from('services')
        .select('min_price, name')
        .eq('id', service_id)
        .single();

      if (serviceError || !service) {
        return NextResponse.json(
          { error: 'Service not found' },
          { status: 404, headers: corsHeaders }
        );
      }

      if (business_price < service.min_price) {
        return NextResponse.json(
          { error: `Price must be at least $${service.min_price} for ${service.name}` },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Build update object
    const updates: any = {};
    if (business_price !== undefined) updates.business_price = business_price;
    if (delivery_type !== undefined) updates.delivery_type = delivery_type;
    if (is_active !== undefined) updates.is_active = is_active;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update provided' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Update business service
    const { data: updatedService, error: updateError } = await supabaseAdmin
      .from('business_services')
      .update(updates)
      .eq('business_id', business_id)
      .eq('service_id', service_id)
      .select(`
        *,
        services:service_id (
          id,
          name,
          description,
          min_price,
          duration_minutes,
          image_url,
          service_subcategories (
            service_subcategory_type,
            service_categories (
              service_category_type
            )
          )
        )
      `)
      .single();

    if (updateError) {
      console.error('Error updating business service:', updateError);
      return NextResponse.json(
        { error: 'Failed to update service', details: updateError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!updatedService) {
      return NextResponse.json(
        { error: 'Business service not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      message: 'Service updated successfully',
      service: updatedService
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error in PUT /api/business/services:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// DELETE /api/business/services - Remove a business service
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('business_id');
    const serviceId = searchParams.get('service_id');

    if (!businessId || !serviceId) {
      return NextResponse.json(
        { error: 'business_id and service_id parameters are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if there are any active bookings for this service
    const { data: activeBookings, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('business_id', businessId)
      .eq('service_id', serviceId)
      .in('booking_status', ['pending', 'confirmed', 'in_progress']);

    if (bookingsError) {
      console.error('Error checking active bookings:', bookingsError);
      return NextResponse.json(
        { error: 'Failed to check active bookings' },
        { status: 500, headers: corsHeaders }
      );
    }

    if (activeBookings && activeBookings.length > 0) {
      return NextResponse.json(
        { error: 'Cannot remove service with active bookings. Please complete or cancel existing bookings first.' },
        { status: 409, headers: corsHeaders }
      );
    }

    // Delete business service
    const { error: deleteError } = await supabaseAdmin
      .from('business_services')
      .delete()
      .eq('business_id', businessId)
      .eq('service_id', serviceId);

    if (deleteError) {
      console.error('Error deleting business service:', deleteError);
      return NextResponse.json(
        { error: 'Failed to remove service', details: deleteError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      message: 'Service removed successfully'
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error in DELETE /api/business/services:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return new NextResponse('ok', { headers: corsHeaders });
}
