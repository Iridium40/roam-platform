import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

// Use the correct Supabase URL and service role key
const supabaseUrl = 'https://vssomyuyhicaxsgiaupo.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzc29teXV5aGljYXhzZ2lhdXBvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ1MzcxNSwiZXhwIjoyMDY5MDI5NzE1fQ.54i9VPExknTktnWbyT9Z9rZKvSJOjs9fG60wncLhLlA';



const supabase = createClient(supabaseUrl, supabaseKey);

export async function handleBusinessServiceSubcategories(req: Request, res: Response) {
  try {
    switch (req.method) {
      case 'GET':
        // Fetch business service subcategories
        const businessId = req.query.businessId as string;
        
        if (!businessId) {
          return res.status(400).json({ error: 'businessId is required' });
        }

        const { data: subcategories, error: fetchError } = await supabase
          .from('business_service_subcategories')
          .select(`
            *,
            service_categories (
              id,
              description,
              service_category_type
            ),
            service_subcategories (
              id,
              description,
              service_subcategory_type
            )
          `)
          .eq('business_id', businessId)
          .order('created_at', { ascending: false });

        if (fetchError) {
          console.error('Error fetching business service subcategories:', fetchError);
          return res.status(500).json({ error: fetchError.message });
        }

        return res.status(200).json({ data: subcategories });

      case 'POST':
        // Add new business service subcategory
        const { subcategoryData } = req.body;
        
        if (!subcategoryData) {
          return res.status(400).json({ error: 'subcategoryData is required' });
        }

        const { data: newSubcategory, error: insertError } = await supabase
          .from('business_service_subcategories')
          .insert(subcategoryData)
          .select(`
            *,
            service_categories (
              id,
              description,
              service_category_type
            ),
            service_subcategories (
              id,
              description,
              service_subcategory_type
            )
          `)
          .single();

        if (insertError) {
          console.error('Error adding business service subcategory:', insertError);
          return res.status(500).json({ error: insertError.message });
        }

        return res.status(201).json({ data: newSubcategory });

      case 'DELETE':
        // Remove business service subcategory
        const { subcategoryId } = req.body;
        
        if (!subcategoryId) {
          return res.status(400).json({ error: 'subcategoryId is required' });
        }

        const { error: deleteError } = await supabase
          .from('business_service_subcategories')
          .delete()
          .eq('id', subcategoryId);

        if (deleteError) {
          console.error('Error removing business service subcategory:', deleteError);
          return res.status(500).json({ error: deleteError.message });
        }

        return res.status(200).json({ message: 'Subcategory deleted successfully' });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Unexpected error in business service subcategories API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: errorMessage });
  }
}
