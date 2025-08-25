// Direct Supabase Businesses API calls
import { BaseAPI, ApiResponse } from './BaseAPI';
import { BusinessRecord, BusinessLocation } from '@/types/api';
import { logger } from "../../utils/logger";

class BusinessesAPI extends BaseAPI {

  constructor() {
    super();
  }

  private getHeaders(useAuthToken = false, accessToken?: string): Record<string, string> {
    const headers: Record<string, string> = {
      apikey: this.apiKey,
      "Content-Type": "application/json",
    };

    if (useAuthToken && accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    } else {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  async getFeaturedBusinesses(accessToken?: string): Promise<BusinessRecord[]> {
    const response = await fetch(
      `${this.baseURL}/rest/v1/business_profiles?is_featured=eq.true&select=*,business_locations(location_name,city,state)&limit=12`,
      {
        method: "GET",
        headers: this.getHeaders(true, accessToken),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch featured businesses: ${response.statusText}`);
    }

    return response.json();
  }

  async getBusinessById(businessId: string, accessToken?: string): Promise<BusinessRecord> {
    const response = await fetch(
      `${this.baseURL}/rest/v1/business_profiles?id=eq.${businessId}&select=*,business_locations(*),services(*),providers(*)`,
      {
        method: "GET",
        headers: this.getHeaders(true, accessToken),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch business: ${response.statusText}`);
    }

    const businesses = await response.json();
    return businesses[0];
  }

  async searchBusinesses(query: string, accessToken?: string): Promise<BusinessRecord[]> {
    const response = await fetch(
      `${this.baseURL}/rest/v1/business_profiles?or=(business_name.ilike.%${query}%,business_description.ilike.%${query}%,business_type.ilike.%${query}%)&select=*,business_locations(location_name,city,state)`,
      {
        method: "GET",
        headers: this.getHeaders(true, accessToken),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to search businesses: ${response.statusText}`);
    }

    return response.json();
  }

  async getBusinessesByType(businessType: string, accessToken?: string): Promise<BusinessRecord[]> {
    const response = await fetch(
      `${this.baseURL}/rest/v1/business_profiles?business_type=eq.${businessType}&select=*,business_locations(location_name,city,state)`,
      {
        method: "GET",
        headers: this.getHeaders(true, accessToken),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch businesses by type: ${response.statusText}`);
    }

    return response.json();
  }

  async getVerifiedBusinesses(accessToken?: string): Promise<BusinessRecord[]> {
    const response = await fetch(
      `${this.baseURL}/rest/v1/business_profiles?verification_status=eq.verified&select=*,business_locations(location_name,city,state)`,
      {
        method: "GET",
        headers: this.getHeaders(true, accessToken),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch verified businesses: ${response.statusText}`);
    }

    return response.json();
  }

  async updateBusiness(
    businessId: string,
    updates: Partial<BusinessRecord>,
    accessToken?: string
  ): Promise<void> {
    const response = await fetch(
      `${this.baseURL}/rest/v1/business_profiles?id=eq.${businessId}`,
      {
        method: "PATCH",
        headers: this.getHeaders(true, accessToken),
        body: JSON.stringify(updates),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to update business: ${response.statusText}`);
    }
  }
}

export const businessesAPI = new BusinessesAPI();
