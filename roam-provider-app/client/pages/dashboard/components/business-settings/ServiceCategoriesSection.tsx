import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Tags, 
  CheckCircle, 
  Building, 
  Info,
  Calendar,
  Clock
} from "lucide-react";

interface ServiceCategoriesSectionProps {
  serviceEligibility: any;
  eligibilityLoading: boolean;
  eligibilityError: string | null;
  onLoadServiceEligibility: () => void;
}

export default function ServiceCategoriesSection({
  serviceEligibility,
  eligibilityLoading,
  eligibilityError,
  onLoadServiceEligibility,
}: ServiceCategoriesSectionProps) {

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (eligibilityLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Tags className="w-5 h-5 mr-2" />
            Approved Service Categories
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading service eligibility...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (eligibilityError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Tags className="w-5 h-5 mr-2" />
            Approved Service Categories
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Info className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Service Categories</h3>
            <p className="text-gray-600 mb-4">{eligibilityError}</p>
            <Button variant="outline" onClick={onLoadServiceEligibility}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!serviceEligibility || (serviceEligibility.approved_categories?.length === 0 && serviceEligibility.approved_subcategories?.length === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Tags className="w-5 h-5 mr-2" />
            Approved Service Categories
          </CardTitle>
          <p className="text-sm text-gray-600">
            Service categories and subcategories approved by platform administration for your business
          </p>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Tags className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Service Categories Approved</h3>
            <p className="text-gray-600 mb-4">
              Your business doesn't have any approved service categories yet. Contact platform administration to get approved for specific service categories.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">What are service categories?</p>
                  <p>Service categories determine which types of services you can offer to customers. Each category contains specific subcategories that define the exact services available to your business.</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Tags className="w-5 h-5 mr-2" />
          Approved Service Categories
        </CardTitle>
        <p className="text-sm text-gray-600">
          Service categories and subcategories approved by platform administration for your business
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Tags className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-blue-600 font-medium">Categories</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {serviceEligibility.stats?.total_categories || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-green-600 font-medium">Subcategories</p>
                  <p className="text-2xl font-bold text-green-900">
                    {serviceEligibility.stats?.total_subcategories || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Building className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-purple-600 font-medium">Business ID</p>
                  <p className="text-xs font-mono text-purple-900 truncate">
                    {serviceEligibility.business_id?.substring(0, 8)}...
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Last Updated Info */}
          {serviceEligibility.last_updated && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>Last updated: {formatDate(serviceEligibility.last_updated)}</span>
              </div>
            </div>
          )}

          {/* Categories and Subcategories */}
          <div className="space-y-6">
            {serviceEligibility.approved_categories?.map((category: any, index: number) => (
              <div key={category.category_id || index} className="border border-gray-200 rounded-lg p-4">
                {/* Category Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="font-semibold text-lg text-gray-900">
                      {category.category_name || category.service_category_type}
                    </h4>
                    {category.description && (
                      <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                    )}
                  </div>
                  <Badge variant="secondary" className="ml-2">
                    <Calendar className="w-3 h-3 mr-1" />
                    Approved
                  </Badge>
                </div>

                {/* Subcategories */}
                {category.subcategories && category.subcategories.length > 0 ? (
                  <div className="space-y-2">
                    <h5 className="font-medium text-gray-700 text-sm">Approved Subcategories:</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {category.subcategories.map((subcategory: any, subIndex: number) => (
                        <div
                          key={subcategory.subcategory_id || subIndex}
                          className="bg-green-50 border border-green-200 rounded-md p-3"
                        >
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                            <span className="text-sm font-medium text-green-800">
                              {subcategory.subcategory_name || subcategory.service_subcategory_type}
                            </span>
                          </div>
                          {subcategory.description && (
                            <p className="text-xs text-green-600 mt-1">{subcategory.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 italic bg-gray-50 rounded p-3">
                    No subcategories available for this category.
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Additional Info */}
          {serviceEligibility.additional_info && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Additional Information</p>
                  <p>{serviceEligibility.additional_info}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}