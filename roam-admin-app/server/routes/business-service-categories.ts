import { Request, Response } from 'express';
import { supabase } from '../lib/supabase.js';

export async function handleBusinessServiceCategories(req: Request, res: Response) {
  try {
    switch (req.method) {
      case 'GET':
        // Fetch business service categories
        const businessId = req.query.businessId as string;
        
        if (!businessId) {
          return res.status(400).json({ error: 'businessId is required' });
        }

        const { data: categories, error: fetchError } = await supabase
          .from('business_service_categories')
          .select(`
            *,
            service_categories (
              id,
              description,
              service_category_type
            )
          `)
          .eq('business_id', businessId)
          .order('created_at', { ascending: false });

        if (fetchError) {
          console.error('Error fetching business service categories:', fetchError);
          return res.status(500).json({ error: fetchError.message });
        }

        return res.status(200).json({ data: categories });

      case 'POST':
        // Add new business service category
        const { businessId: postBusinessId, categoryId: postCategoryId } = req.body;
        
        if (!postBusinessId || !postCategoryId) {
          return res.status(400).json({ error: 'businessId and categoryId are required' });
        }

        const { data: newCategory, error: insertError } = await supabase
          .from('business_service_categories')
          .insert({
            business_id: postBusinessId,
            category_id: postCategoryId,
            is_active: true
          })
          .select(`
            *,
            service_categories (
              id,
              description,
              service_category_type
            )
          `)
          .single();

        if (insertError) {
          console.error('Error adding business service category:', insertError);
          return res.status(500).json({ error: insertError.message });
        }

        return res.status(201).json({ data: newCategory });

      case 'DELETE':
        // Remove business service category or all categories for a business
        const { categoryId: deleteCategoryId, businessId: deleteBusinessId } = req.body;
        
        if (!deleteCategoryId && !deleteBusinessId) {
          return res.status(400).json({ error: 'Either categoryId or businessId is required' });
        }

        let deleteError;
        if (deleteBusinessId) {
          // Delete all categories for a business
          const { error } = await supabase
            .from('business_service_categories')
            .delete()
            .eq('business_id', deleteBusinessId);
          deleteError = error;
        } else {
          // Delete a specific category
          const { error } = await supabase
            .from('business_service_categories')
            .delete()
            .eq('id', deleteCategoryId);
          deleteError = error;
        }

        if (deleteError) {
          console.error('Error removing business service category:', deleteError);
          return res.status(500).json({ error: deleteError.message });
        }

        return res.status(200).json({ 
          message: deleteBusinessId 
            ? 'All categories deleted successfully for business' 
            : 'Category deleted successfully' 
        });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Unexpected error in business service categories API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: errorMessage });
  }
}
