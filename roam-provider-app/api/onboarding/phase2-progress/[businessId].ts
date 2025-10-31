import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Extract businessId from URL path (most reliable)
  let businessId: string | undefined;
  
  if (req.url) {
    const urlMatch = req.url.match(/\/api\/onboarding\/phase2-progress\/([a-f0-9-]{36}|[^/?]+)/);
    if (urlMatch && urlMatch[1]) {
      businessId = urlMatch[1];
    }
  }
  
  // Fallback to query param
  if (!businessId && req.query.businessId) {
    businessId = Array.isArray(req.query.businessId) ? req.query.businessId[0] : req.query.businessId as string;
  }

  if (!businessId || typeof businessId !== 'string') {
    console.error('Phase2 progress - Business ID extraction failed:', {
      query: req.query,
      url: req.url
    });
    return res.status(400).json({ error: 'Invalid business ID' });
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
