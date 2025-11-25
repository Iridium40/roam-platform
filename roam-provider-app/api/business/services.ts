import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * /api/business/services
 * 
 * Manages business services - services that a business offers to customers.
 * All operations validate that the business is approved for the service's
 * category and subcategory before allowing modifications.
 * 
 * Authorization Flow (for POST):
 * 1. Service must exist and be active
 * 2. Business must be approved for the service's subcategory (business_service_subcategories)
 * 3. Business must be approved for the service's parent category (business_service_categories)
 * 4. Service cannot already be added to the business
 * 
 * Methods:
 * - GET: Fetch business services with pagination and filtering
 * - POST: Add a new service to business (with eligibility validation)
 * - PUT: Update existing business service (price, delivery_type, status)
 * - DELETE: Remove service from business
 */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (!process.env.VITE_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ error: 'Server configuration error' });
    }
    
    const supabase = createClient(
      process.env.VITE_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    if (req.method === 'GET') {
      const { business_id, page = '1', limit = '25', status } = req.query;
      if (!business_id) {
        return res.status(400).json({ error: 'business_id parameter is required' });
      }

      const pageNum = Math.max(parseInt(page as string, 10), 1);
      const limitNum = Math.min(Math.max(parseInt(limit as string, 10), 1), 100);
      let query = supabase
        .from('business_services')
        .select('id, business_id, service_id, business_price, business_duration_minutes, is_active, delivery_type, created_at', { count: 'exact' })
        .eq('business_id', business_id);

      if (status === 'active') query = query.eq('is_active', true);
      if (status === 'inactive') query = query.eq('is_active', false);

      const from = (pageNum - 1) * limitNum;
      const { data: bsRows, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, from + limitNum - 1);

      if (error) {
        return res.status(500).json({ error: 'Failed to fetch services', details: error.message });
      }

      const serviceIds = Array.from(new Set((bsRows || []).map((r: any) => r.service_id)));
      let serviceMap: Record<string, any> = {};
      
      if (serviceIds.length > 0) {
        const { data: services } = await supabase
          .from('services')
          .select('id, name, description, min_price, duration_minutes, image_url')
          .in('id', serviceIds);
        serviceMap = Object.fromEntries((services || []).map((s: any) => [s.id, s]));
      }

      const services = (bsRows || []).map((row: any) => ({
        ...row,
        services: serviceMap[row.service_id] || null
      }));

      const { count: activeCount } = await supabase
        .from('business_services')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', business_id)
        .eq('is_active', true);

      return res.status(200).json({
        business_id,
        services,
        stats: {
          total_services: count || 0,
          active_services: activeCount || 0,
          total_revenue: 0,
          avg_price: services.length > 0 ? 
            services.reduce((sum: number, s: any) => sum + (parseFloat(s.business_price) || 0), 0) / services.length : 0
        },
        pagination: { page: pageNum, limit: limitNum, total: count || 0 }
      });
    }

    // POST - Add a new service to business
    if (req.method === 'POST') {
      const { business_id, service_id, business_price, business_duration_minutes, delivery_type = 'both', is_active = true } = req.body;

      if (!business_id || !service_id) {
        return res.status(400).json({ error: 'business_id and service_id are required' });
      }

      if (!business_price || parseFloat(business_price) <= 0) {
        return res.status(400).json({ error: 'business_price must be greater than 0' });
      }

      // CRITICAL: Validate that the service is eligible for this business
      // Step 1: Get the service's subcategory and default duration
      const { data: service, error: serviceError } = await supabase
        .from('services')
        .select('id, subcategory_id, name, duration_minutes')
        .eq('id', service_id)
        .eq('is_active', true)
        .single();

      if (serviceError || !service) {
        return res.status(404).json({ error: 'Service not found or inactive' });
      }

      // Step 2: Check if business is approved for this subcategory
      const { data: subcategoryApproval, error: subcategoryError } = await supabase
        .from('business_service_subcategories')
        .select('id, category_id')
        .eq('business_id', business_id)
        .eq('subcategory_id', service.subcategory_id)
        .eq('is_active', true)
        .single();

      if (subcategoryError || !subcategoryApproval) {
        return res.status(403).json({ 
          error: 'Business is not approved for this service subcategory',
          details: 'Contact platform administration to get approved for this service category'
        });
      }

      // Step 3: Verify parent category is also approved
      const { data: categoryApproval, error: categoryError } = await supabase
        .from('business_service_categories')
        .select('id')
        .eq('business_id', business_id)
        .eq('category_id', subcategoryApproval.category_id)
        .eq('is_active', true)
        .single();

      if (categoryError || !categoryApproval) {
        return res.status(403).json({ 
          error: 'Business is not approved for the parent service category',
          details: 'Contact platform administration to get approved for this service category'
        });
      }

      // Step 4: Check if service already added
      const { data: existingService } = await supabase
        .from('business_services')
        .select('id')
        .eq('business_id', business_id)
        .eq('service_id', service_id)
        .single();

      if (existingService) {
        return res.status(409).json({ error: 'Service already added to business' });
      }

      // Step 5: Add the service
      // Use custom duration if provided, otherwise use service's default duration
      const finalDuration = business_duration_minutes !== undefined && business_duration_minutes !== null && business_duration_minutes !== ''
        ? parseInt(business_duration_minutes)
        : service.duration_minutes;

      const { data: newService, error: insertError } = await supabase
        .from('business_services')
        .insert({
          business_id,
          service_id,
          business_price: parseFloat(business_price),
          business_duration_minutes: finalDuration,
          delivery_type,
          is_active
        })
        .select(`
          id,
          business_id,
          service_id,
          business_price,
          business_duration_minutes,
          delivery_type,
          is_active,
          created_at,
          services (
            id,
            name,
            description,
            min_price,
            duration_minutes,
            image_url
          )
        `)
        .single();

      if (insertError) {
        console.error('Error inserting business service:', insertError);
        return res.status(500).json({ error: 'Failed to add service', details: insertError.message });
      }

      return res.status(201).json({
        message: 'Service added successfully',
        service: newService
      });
    }

    // PUT - Update an existing business service
    if (req.method === 'PUT') {
      const { business_id, service_id, business_price, business_duration_minutes, delivery_type, is_active } = req.body;

      console.log('🔍 API - PUT /api/business/services received:', {
        business_id,
        service_id,
        business_price,
        business_duration_minutes,
        business_duration_minutes_type: typeof business_duration_minutes,
        delivery_type,
        is_active,
        fullBody: req.body
      });

      if (!business_id || !service_id) {
        return res.status(400).json({ error: 'business_id and service_id are required' });
      }

      // Fetch the service to get default duration if needed
      const { data: serviceData, error: serviceError } = await supabase
        .from('services')
        .select('duration_minutes')
        .eq('id', service_id)
        .single();

      if (serviceError || !serviceData) {
        return res.status(404).json({ error: 'Service not found' });
      }

      const updates: any = {};
      if (business_price !== undefined) {
        const price = parseFloat(business_price);
        if (price <= 0) {
          return res.status(400).json({ error: 'business_price must be greater than 0' });
        }
        updates.business_price = price;
      }
      
      // Handle business_duration_minutes
      if (business_duration_minutes !== undefined && business_duration_minutes !== null && business_duration_minutes !== '') {
        console.log('🔍 API - Processing custom business_duration_minutes:', {
          business_duration_minutes,
          type: typeof business_duration_minutes,
          parsed: parseInt(business_duration_minutes)
        });
        
        const duration = parseInt(business_duration_minutes);
        if (duration <= 0) {
          return res.status(400).json({ error: 'business_duration_minutes must be greater than 0' });
        }
        updates.business_duration_minutes = duration;
        console.log('🔍 API - Added custom duration to updates:', { business_duration_minutes: duration });
      } else {
        // If no custom duration provided, use the service's default duration
        console.log('🔍 API - No custom duration, using service default:', serviceData.duration_minutes);
        updates.business_duration_minutes = serviceData.duration_minutes;
      }
      
      if (delivery_type !== undefined) updates.delivery_type = delivery_type;
      if (is_active !== undefined) updates.is_active = is_active;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No updates provided' });
      }

      console.log('🔍 API - About to update business_services with:', {
        business_id,
        service_id,
        updates,
        updatesKeys: Object.keys(updates)
      });

      // First, check if the business_service record exists
      const { data: existingService, error: checkError } = await supabase
        .from('business_services')
        .select('id')
        .eq('business_id', business_id)
        .eq('service_id', service_id)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking business service existence:', checkError);
        return res.status(500).json({ error: 'Failed to check service', details: checkError.message });
      }

      if (!existingService) {
        console.warn('⚠️ Business service not found:', { business_id, service_id });
        return res.status(404).json({ 
          error: 'Business service not found',
          details: 'This service is not associated with this business. Please add it first.'
        });
      }

      // Perform the update
      const { data: updatedService, error: updateError } = await supabase
        .from('business_services')
        .update(updates)
        .eq('business_id', business_id)
        .eq('service_id', service_id)
        .select(`
          id,
          business_id,
          service_id,
          business_price,
          business_duration_minutes,
          delivery_type,
          is_active,
          created_at,
          services (
            id,
            name,
            description,
            min_price,
            duration_minutes,
            image_url
          )
        `)
        .maybeSingle();

      console.log('🔍 API - Update result:', {
        updatedService,
        updateError,
        success: !updateError && updatedService
      });

      if (updateError) {
        console.error('Error updating business service:', updateError);
        return res.status(500).json({ error: 'Failed to update service', details: updateError.message });
      }

      if (!updatedService) {
        console.error('Update succeeded but no data returned');
        return res.status(500).json({ error: 'Update succeeded but service data not returned' });
      }

      return res.status(200).json({
        message: 'Service updated successfully',
        service: updatedService
      });
    }

    // DELETE - Remove a service from business
    if (req.method === 'DELETE') {
      const { business_id, service_id } = req.query;

      if (!business_id || !service_id) {
        return res.status(400).json({ error: 'business_id and service_id query parameters are required' });
      }

      const { error: deleteError } = await supabase
        .from('business_services')
        .delete()
        .eq('business_id', business_id)
        .eq('service_id', service_id);

      if (deleteError) {
        console.error('Error deleting business service:', deleteError);
        return res.status(500).json({ error: 'Failed to delete service', details: deleteError.message });
      }

      return res.status(200).json({
        message: 'Service removed successfully'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
