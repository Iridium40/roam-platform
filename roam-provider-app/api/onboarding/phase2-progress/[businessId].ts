import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Comprehensive logging to debug businessId extraction
  console.log('=== Phase2 Progress Debug ===');
  console.log('req.url:', req.url);
  console.log('req.query:', JSON.stringify(req.query, null, 2));
  console.log('req.method:', req.method);
  
  // Extract businessId - try multiple methods
  let businessId: string | undefined;
  
  // Method 1: Direct from req.query (standard Vercel file-based routing)
  if (req.query.businessId && typeof req.query.businessId === 'string') {
    businessId = req.query.businessId;
    console.log('✓ Found businessId in req.query.businessId:', businessId);
  }
  
  // Method 2: Extract from URL path if not found
  if (!businessId && req.url) {
    const urlMatch = req.url.match(/\/api\/onboarding\/phase2-progress\/([a-f0-9-]{36}|[^/?]+)/);
    if (urlMatch && urlMatch[1]) {
      businessId = urlMatch[1];
      console.log('✓ Extracted businessId from URL path:', businessId);
    }
  }
  
  // Method 3: Check all query keys for UUID-like values
  if (!businessId) {
    for (const [key, value] of Object.entries(req.query)) {
      const strValue = Array.isArray(value) ? value[0] : String(value);
      if (strValue && /^[a-f0-9-]{36}$/i.test(strValue)) {
        businessId = strValue;
        console.log(`✓ Found businessId in req.query.${key}:`, businessId);
        break;
      }
    }
  }

  if (!businessId || typeof businessId !== 'string') {
    console.error('✗ Failed to extract businessId');
    return res.status(400).json({ 
      error: 'Invalid business ID',
      debug: {
        url: req.url,
        query: req.query,
        extracted: businessId
      }
    });
  }

  if (req.method === 'GET') {
    try {
      const { data: progress, error } = await supabase
        .from('business_setup_progress')
        .select('*')
        .eq('business_id', businessId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching progress:', error);
        return res.status(500).json({ error: 'Failed to fetch progress' });
      }

      // If no progress exists, return default
      if (!progress) {
        return res.status(200).json({
          business_id: businessId,
          current_step: 'welcome',
          welcome_completed: false,
          business_profile_completed: false,
          personal_profile_completed: false,
          business_hours_completed: false,
          staff_management_completed: false,
          banking_payout_completed: false,
          service_pricing_completed: false,
          final_review_completed: false
        });
      }

      return res.status(200).json(progress);
    } catch (error) {
      console.error('Error in phase2-progress handler:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
