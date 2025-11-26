import { VercelRequest, VercelResponse } from '@vercel/node';
import { createSupabaseClient, validateEnvironment } from './_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Validate environment variables
  const envError = validateEnvironment();
  if (envError) {
    console.error('Environment validation failed:', envError);
    return res.status(500).json(envError);
  }

  // Initialize Supabase client
  const supabase = createSupabaseClient();
  if (!supabase) {
    return res.status(500).json({ 
      error: 'Failed to initialize database connection',
      details: 'Could not create Supabase client'
    });
  }

  try {
    switch (req.method) {
      case 'GET':
        const { businessId } = req.query;
        
        if (!businessId) {
          return res.status(400).json({ error: 'Business ID is required' });
        }

        const { data, error } = await supabase
          .from('business_service_categories')
          .select(`
            id,
            business_id,
            category_id,
            is_active,
            created_at,
            updated_at,
            service_categories (
              id,
              service_category_type,
              description
            )
          `)
          .eq('business_id', businessId)
          .eq('is_active', true);

        if (error) {
          console.error('Error fetching business service categories:', error);
          return res.status(500).json({ error: error.message });
        }

        return res.status(200).json({ data: data || [] });

      case 'POST':
        const { businessId: postBusinessId, categoryId } = req.body;
        
        if (!postBusinessId || !categoryId) {
          return res.status(400).json({ error: 'Business ID and category ID are required' });
        }

        const { data: insertData, error: insertError } = await supabase
          .from('business_service_categories')
          .insert([{
            business_id: postBusinessId,
            category_id: categoryId,
            is_active: true
          }])
          .select();

        if (insertError) {
          console.error('Error inserting business service category:', insertError);
          return res.status(500).json({ error: insertError.message });
        }

        return res.status(201).json({ data: insertData });

      case 'DELETE':
        const { businessId: deleteBusinessId } = req.body;
        
        if (!deleteBusinessId) {
          return res.status(400).json({ error: 'Business ID is required' });
        }

        const { error: deleteError } = await supabase
          .from('business_service_categories')
          .delete()
          .eq('business_id', deleteBusinessId);

        if (deleteError) {
          console.error('Error deleting business service categories:', deleteError);
          return res.status(500).json({ error: deleteError.message });
        }

        return res.status(200).json({ message: 'Business service categories deleted successfully' });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Unexpected error in business service categories API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: errorMessage });
  }
}