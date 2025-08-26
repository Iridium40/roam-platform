import { createClient } from '@supabase/supabase-js';

// For development, use direct environment variable access
const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://vssomyuyhicaxsgiaupo.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndobmtveHdnb2xia21wbmN6eXdwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTU1MjQ3OSwiZXhwIjoyMDcxMTI4NDc5fQ.9o48A-HxMvvn54GUTbtAIxEsklkIjPtuLtG-63T2t-o';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export interface BusinessServiceSubcategory {
  id: string;
  business_id: string;
  category_id: string;
  subcategory_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServiceCategory {
  id: string;
  service_category_type: string;
  description: string;
}

export interface ServiceSubcategory {
  id: string;
  service_subcategory_type: string;
  description: string;
}

export interface BusinessServiceSubcategoryWithRelations extends BusinessServiceSubcategory {
  service_categories: ServiceCategory;
  service_subcategories: ServiceSubcategory;
}

export class BusinessServiceSubcategoriesService {
  /**
   * Fetch business service subcategories for a specific business
   */
  static async getBusinessServiceSubcategories(businessId: string): Promise<BusinessServiceSubcategoryWithRelations[]> {
    const { data, error } = await supabase
      .from('business_service_subcategories')
      .select(`
        *,
        service_categories (
          id,
          service_category_type,
          description
        ),
        service_subcategories (
          id,
          service_subcategory_type,
          description
        )
      `)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching business service subcategories:', error);
      throw new Error(error.message);
    }

    return data || [];
  }

  /**
   * Add a new business service subcategory
   */
  static async addBusinessServiceSubcategory(subcategoryData: {
    business_id: string;
    category_id: string;
    subcategory_id: string;
    is_active?: boolean;
  }): Promise<BusinessServiceSubcategory> {
    const { data, error } = await supabase
      .from('business_service_subcategories')
      .insert([{
        ...subcategoryData,
        is_active: subcategoryData.is_active ?? true,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error adding business service subcategory:', error);
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Remove a business service subcategory
   */
  static async removeBusinessServiceSubcategory(subcategoryId: string): Promise<void> {
    const { error } = await supabase
      .from('business_service_subcategories')
      .delete()
      .eq('id', subcategoryId);

    if (error) {
      console.error('Error removing business service subcategory:', error);
      throw new Error(error.message);
    }
  }

  /**
   * Fetch available service categories
   */
  static async getAvailableServiceCategories(): Promise<ServiceCategory[]> {
    const { data, error } = await supabase
      .from('service_categories')
      .select('id, service_category_type, description')
      .eq('is_active', true)
      .order('service_category_type', { ascending: true });

    if (error) {
      console.error('Error fetching available service categories:', error);
      throw new Error(error.message);
    }

    return data || [];
  }

  /**
   * Fetch available service subcategories
   */
  static async getAvailableServiceSubcategories(): Promise<ServiceSubcategory[]> {
    const { data, error } = await supabase
      .from('service_subcategories')
      .select('id, category_id, service_subcategory_type, description')
      .eq('is_active', true)
      .order('service_subcategory_type', { ascending: true });

    if (error) {
      console.error('Error fetching available service subcategories:', error);
      throw new Error(error.message);
    }

    return data || [];
  }

  /**
   * Fetch business service categories for a specific business
   */
  static async getBusinessServiceCategories(businessId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('business_service_categories')
      .select(`
        *,
        service_categories (
          id,
          service_category_type,
          description
        )
      `)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching business service categories:', error);
      throw new Error(error.message);
    }

    return data || [];
  }

  /**
   * Add a new business service category
   */
  static async addBusinessServiceCategory(categoryData: {
    business_id: string;
    category_id: string;
    is_active?: boolean;
  }): Promise<any> {
    const { data, error } = await supabase
      .from('business_service_categories')
      .insert([{
        ...categoryData,
        is_active: categoryData.is_active ?? true,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error adding business service category:', error);
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Remove a business service category
   */
  static async removeBusinessServiceCategory(categoryId: string): Promise<void> {
    const { error } = await supabase
      .from('business_service_categories')
      .delete()
      .eq('id', categoryId);

    if (error) {
      console.error('Error removing business service category:', error);
      throw new Error(error.message);
    }
  }
}
