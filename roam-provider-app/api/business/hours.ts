import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * /api/business/hours
 * 
 * Manages business operating hours stored as JSONB in business_profiles table.
 * Handles conversion between database format (capitalized days) and frontend format (lowercase).
 * 
 * Database format: { "Monday": { "open": "09:00", "close": "17:00" } }
 * Frontend format: { "monday": { "open": "09:00", "close": "17:00", "closed": false } }
 * 
 * Methods:
 * - GET: Fetch business hours for a business
 * - PUT: Update business hours for a business
 */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');

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

    // GET - Fetch business hours
    if (req.method === 'GET') {
      const { business_id } = req.query;

      if (!business_id || typeof business_id !== 'string') {
        return res.status(400).json({ error: 'business_id parameter is required' });
      }

      const { data: business, error: businessError } = await supabase
        .from('business_profiles')
        .select('id, business_name, business_hours')
        .eq('id', business_id)
        .single();

      if (businessError || !business) {
        return res.status(404).json({ error: 'Business not found' });
      }

      // Transform database format to frontend format
      const dbHours = business.business_hours || {};
      const frontendHours = transformDbToFrontend(dbHours);

      return res.status(200).json({
        business_id: business.id,
        business_name: business.business_name,
        business_hours: frontendHours
      });
    }

    // PUT - Update business hours
    if (req.method === 'PUT') {
      const { business_id, business_hours } = req.body;

      if (!business_id) {
        return res.status(400).json({ error: 'business_id is required' });
      }

      if (!business_hours || typeof business_hours !== 'object') {
        return res.status(400).json({ error: 'business_hours object is required' });
      }

      // Validate business exists
      const { data: business, error: businessError } = await supabase
        .from('business_profiles')
        .select('id')
        .eq('id', business_id)
        .single();

      if (businessError || !business) {
        return res.status(404).json({ error: 'Business not found' });
      }

      // Transform frontend format to database format
      const dbHours = transformFrontendToDb(business_hours);

      // Update business hours
      const { data: updatedBusiness, error: updateError } = await supabase
        .from('business_profiles')
        .update({ business_hours: dbHours })
        .eq('id', business_id)
        .select('id, business_name, business_hours')
        .single();

      if (updateError) {
        console.error('Error updating business hours:', updateError);
        return res.status(500).json({ 
          error: 'Failed to update business hours', 
          details: updateError.message 
        });
      }

      // Transform back to frontend format for response
      const frontendHours = transformDbToFrontend(updatedBusiness.business_hours || {});

      return res.status(200).json({
        message: 'Business hours updated successfully',
        business_id: updatedBusiness.id,
        business_name: updatedBusiness.business_name,
        business_hours: frontendHours
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

/**
 * Transform database format to frontend format
 * DB: { "Monday": { "open": "09:00", "close": "17:00" } }
 * Frontend: { "monday": { "open": "09:00", "close": "17:00", "closed": false } }
 */
function transformDbToFrontend(dbHours: Record<string, any>): Record<string, any> {
  const defaultHours = {
    monday: { open: "09:00", close: "17:00", closed: false },
    tuesday: { open: "09:00", close: "17:00", closed: false },
    wednesday: { open: "09:00", close: "17:00", closed: false },
    thursday: { open: "09:00", close: "17:00", closed: false },
    friday: { open: "09:00", close: "17:00", closed: false },
    saturday: { open: "09:00", close: "17:00", closed: false },
    sunday: { open: "09:00", close: "17:00", closed: true },
  };

  const frontendHours: Record<string, any> = { ...defaultHours };

  // Convert capitalized day names to lowercase and add 'closed' field
  Object.entries(dbHours).forEach(([day, hours]: [string, any]) => {
    const lowercaseDay = day.toLowerCase();
    if (frontendHours[lowercaseDay]) {
      frontendHours[lowercaseDay] = {
        open: hours.open || "09:00",
        close: hours.close || "17:00",
        closed: hours.closed !== undefined ? hours.closed : false
      };
    }
  });

  return frontendHours;
}

/**
 * Transform frontend format to database format
 * Frontend: { "monday": { "open": "09:00", "close": "17:00", "closed": false } }
 * DB: { "Monday": { "open": "09:00", "close": "17:00", "closed": false } }
 */
function transformFrontendToDb(frontendHours: Record<string, any>): Record<string, any> {
  const dbHours: Record<string, any> = {};

  Object.entries(frontendHours).forEach(([day, hours]: [string, any]) => {
    // Capitalize first letter
    const capitalizedDay = day.charAt(0).toUpperCase() + day.slice(1);
    
    // Save all days with their closed status
    dbHours[capitalizedDay] = {
      open: hours.open,
      close: hours.close,
      closed: hours.closed !== undefined ? hours.closed : false
    };
  });

  return dbHours;
}
