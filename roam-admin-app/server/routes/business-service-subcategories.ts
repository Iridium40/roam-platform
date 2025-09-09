import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';

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
        const { businessId: postBusinessId, categoryId: postCategoryId, subcategoryId: postSubcategoryId } = req.body;
        
        if (!postBusinessId || !postCategoryId || !postSubcategoryId) {
          return res.status(400).json({ error: 'businessId, categoryId, and subcategoryId are required' });
        }

        const { data: newSubcategory, error: insertError } = await supabase
          .from('business_service_subcategories')
          .insert({
            business_id: postBusinessId,
            category_id: postCategoryId,
            subcategory_id: postSubcategoryId,
            is_active: true
          })
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
        // Remove business service subcategory or all subcategories for a business
        const { subcategoryId: deleteSubcategoryId, businessId: deleteBusinessId } = req.body;
        
        if (!deleteSubcategoryId && !deleteBusinessId) {
          return res.status(400).json({ error: 'Either subcategoryId or businessId is required' });
        }

        let deleteError;
        if (deleteBusinessId) {
          // Delete all subcategories for a business
          const { error } = await supabase
            .from('business_service_subcategories')
            .delete()
            .eq('business_id', deleteBusinessId);
          deleteError = error;
        } else {
          // Delete a specific subcategory
          const { error } = await supabase
            .from('business_service_subcategories')
            .delete()
            .eq('id', deleteSubcategoryId);
          deleteError = error;
        }

        if (deleteError) {
          console.error('Error removing business service subcategory:', deleteError);
          return res.status(500).json({ error: deleteError.message });
        }

        return res.status(200).json({ 
          message: deleteBusinessId 
            ? 'All subcategories deleted successfully for business' 
            : 'Subcategory deleted successfully' 
        });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Unexpected error in business service subcategories API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: errorMessage });
  }
}
