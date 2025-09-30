import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, TrendingUp, Users, Star, Info } from "lucide-react";

interface ServiceCategory {
  id: string;
  description?: string;
  service_category_type?: string;
}

interface ServiceSubcategory {
  id: string;
  description?: string;
  service_subcategory_type?: string;
  created_at: string;
  category_id?: string;
  category?: ServiceCategory;
}

interface SubcategoryItem {
  id: string;
  service_subcategories: ServiceSubcategory;
  created_at: string;
}

interface CategoryItem {
  id: string;
  service_categories: ServiceCategory;
}

interface ApprovedCategory {
  service_categories: ServiceCategory;
}

interface ServiceEligibilityData {
  approved_categories: ApprovedCategory[];
  approved_subcategories: SubcategoryItem[];
  stats?: {
    total_categories: number;
    total_subcategories: number;
    available_services: number;
  };
}

interface ServiceSettingsProps {
  serviceEligibility: ServiceEligibilityData | null;
  serviceEligibilityLoading: boolean;
  serviceEligibilityError: string | null;
}

export default function ServiceSettings({
  serviceEligibility,
  serviceEligibilityLoading,
  serviceEligibilityError
}: ServiceSettingsProps) {
  // Group subcategories by category ID
  const subcategories_by_category = React.useMemo(() => {
    if (!serviceEligibility?.approved_subcategories) return {};
    
    return serviceEligibility.approved_subcategories.reduce((acc, subcategoryItem) => {
      const categoryId = subcategoryItem.service_subcategories?.category_id || 'uncategorized';
      if (!acc[categoryId]) {
        acc[categoryId] = [];
      }
      acc[categoryId].push(subcategoryItem);
      return acc;
    }, {} as Record<string, SubcategoryItem[]>);
  }, [serviceEligibility?.approved_subcategories]);

  // Get unique category IDs from both approved categories and subcategories
  const categoryIds = React.useMemo(() => {
    const ids = new Set<string>();
    
    // Add category IDs from approved categories
    serviceEligibility?.approved_categories?.forEach((item) => {
      if (item.service_categories?.id) {
        ids.add(item.service_categories.id);
      }
    });
    
    // Add category IDs from subcategories
    Object.keys(subcategories_by_category).forEach(categoryId => {
      if (categoryId !== 'uncategorized') {
        ids.add(categoryId);
      }
    });
    
    return Array.from(ids);
  }, [serviceEligibility?.approved_categories, subcategories_by_category]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <TrendingUp className="w-5 h-5 mr-2" />
          Service Categories
        </CardTitle>
      </CardHeader>
      <CardContent>
        {serviceEligibilityLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-roam-blue mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading service eligibility...</p>
          </div>
        ) : serviceEligibilityError ? (
          <div className="text-center py-8">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">Error loading service eligibility: {serviceEligibilityError}</p>
            </div>
          </div>
        ) : !serviceEligibility ? (
          <div className="text-center py-8">
            <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Service Categories</h3>
            <p className="text-gray-600">
              Your approved service categories will appear here once processed by our team.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Service Eligibility Stats */}
            {serviceEligibility.stats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-800">Categories</p>
                      <p className="text-2xl font-bold text-blue-900">
                        {serviceEligibility.stats.total_categories}
                      </p>
                    </div>
                    <Users className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-800">Subcategories</p>
                      <p className="text-2xl font-bold text-green-900">
                        {serviceEligibility.stats.total_subcategories}
                      </p>
                    </div>
                    <Star className="w-8 h-8 text-green-600" />
                  </div>
                </div>
                
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-800">Available Services</p>
                      <p className="text-2xl font-bold text-purple-900">
                        {serviceEligibility.stats.available_services}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-purple-600" />
                  </div>
                </div>
              </div>
            )}

            {/* Service Categories List */}
            <div className="space-y-4">
              {categoryIds.map((categoryId) => {
                const subcats = subcategories_by_category[categoryId] || [];
                
                // Find the category data
                let category: ServiceCategory | null = null;
                let derivedFromSubcategory: ServiceCategory | null = null;
                
                // First try to find from approved categories
                const approvedCategoryItem = serviceEligibility.approved_categories.find(
                  (c: any) => c?.service_categories?.id === categoryId
                );
                if (approvedCategoryItem) {
                  category = approvedCategoryItem.service_categories;
                }
                
                // If not found, derive from subcategory
                if (!category && subcats.length > 0) {
                  const firstSubcat = subcats[0];
                  if (firstSubcat?.service_subcategories?.category) {
                    derivedFromSubcategory = firstSubcat.service_subcategories.category;
                  }
                }
                
                const categoryItem = { id: categoryId, service_categories: category } as any;
                const approvedCategory = serviceEligibility.approved_categories.find(
                  (c: any) => c?.service_categories?.id === categoryId
                )?.service_categories;
                const displayCategory = category || derivedFromSubcategory || approvedCategory || null;
                
                const subcategoriesForThisCategory = subcats || [];

                return (
                  <div key={categoryItem.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Category Header */}
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900 text-lg">
                            {displayCategory?.description || displayCategory?.service_category_type || 'Category'}
                          </h4>
                          {displayCategory?.description && (
                            <p className="text-sm text-gray-600 mt-1">{displayCategory.description}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                            Approved
                          </span>
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                            {subcategoriesForThisCategory.length} subcategories
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Subcategories */}
                    {subcategoriesForThisCategory.length > 0 && (
                      <div className="p-4">
                        <h5 className="text-sm font-medium text-gray-700 mb-3">Approved Subcategories:</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {subcategoriesForThisCategory.map((subcategoryItem) => {
                            const subcategory = subcategoryItem.service_subcategories;
                            if (!subcategory) return null;

                            return (
                              <div
                                key={subcategoryItem.id}
                                className="bg-white border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h6 className="font-medium text-gray-900 text-sm">
                                      {subcategory.description || subcategory.service_subcategory_type}
                                    </h6>
                                    {subcategory.description && (
                                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                        {subcategory.description}
                                      </p>
                                    )}
                                  </div>
                                  <CheckCircle className="w-4 h-4 text-green-600 ml-2 flex-shrink-0" />
                                </div>
                                <div className="text-xs text-gray-500 mt-2">
                                  Approved on {new Date(subcategoryItem.created_at).toLocaleDateString()}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* No Subcategories Message */}
                    {subcategoriesForThisCategory.length === 0 && (
                      <div className="p-4 text-center">
                        <p className="text-sm text-gray-500">
                          No specific subcategories approved for this category yet.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Additional Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Service Category Management</p>
                  <p>
                    These service categories are managed by platform administration. To request additional categories or subcategories,
                    please contact support. Only approved categories will allow you to add related services to your business offering.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}