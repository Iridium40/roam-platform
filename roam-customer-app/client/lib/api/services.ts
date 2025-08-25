// Direct Supabase Services API calls
import { BaseAPI, ApiResponse } from './BaseAPI';
import { ServiceRecord } from '@/types/api';
import { logger } from "../../utils/logger";

class ServicesAPI extends BaseAPI {

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

  async getFeaturedServices(accessToken?: string): Promise<ServiceRecord[]> {
    const response = await fetch(
      `${this.baseURL}/rest/v1/services?is_featured=eq.true&select=*,business_profiles(id,business_name,logo_url)&limit=8`,
      {
        method: "GET",
        headers: this.getHeaders(true, accessToken),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch featured services: ${response.statusText}`);
    }

    return response.json();
  }

  async getPopularServices(accessToken?: string): Promise<ServiceRecord[]> {
    const response = await fetch(
      `${this.baseURL}/rest/v1/services?select=*,business_profiles(id,business_name,logo_url)&order=created_at.desc&limit=12`,
      {
        method: "GET",
        headers: this.getHeaders(true, accessToken),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch popular services: ${response.statusText}`);
    }

    return response.json();
  }

  async getServicesByCategory(category: string, accessToken?: string): Promise<ServiceRecord[]> {
    const response = await fetch(
      `${this.baseURL}/rest/v1/services?category=eq.${category}&select=*,business_profiles(id,business_name,logo_url)`,
      {
        method: "GET",
        headers: this.getHeaders(true, accessToken),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch services by category: ${response.statusText}`);
    }

    return response.json();
  }

  async getServiceById(serviceId: string, accessToken?: string): Promise<ServiceRecord> {
    const response = await fetch(
      `${this.baseURL}/rest/v1/services?id=eq.${serviceId}&select=*,business_profiles(*),providers(*)`,
      {
        method: "GET",
        headers: this.getHeaders(true, accessToken),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch service: ${response.statusText}`);
    }

    const services = await response.json();
    return services[0];
  }

  async searchServices(query: string, accessToken?: string): Promise<ServiceRecord[]> {
    const response = await fetch(
      `${this.baseURL}/rest/v1/services?or=(name.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%)&select=*,business_profiles(id,business_name,logo_url)`,
      {
        method: "GET",
        headers: this.getHeaders(true, accessToken),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to search services: ${response.statusText}`);
    }

    return response.json();
  }

  async getServicesByBusiness(businessId: string, accessToken?: string): Promise<ServiceRecord[]> {
    const response = await fetch(
      `${this.baseURL}/rest/v1/services?business_id=eq.${businessId}&select=*`,
      {
        method: "GET",
        headers: this.getHeaders(true, accessToken),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch business services: ${response.statusText}`);
    }

    return response.json();
  }
}

export const servicesAPI = new ServicesAPI();
