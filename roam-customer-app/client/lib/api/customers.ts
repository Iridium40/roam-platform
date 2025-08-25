// Direct Supabase Customers API calls
import { BaseAPI, ApiResponse } from './BaseAPI';
import { CustomerRecord, CustomerProfile } from '@/types/api';
import { logger } from "../../utils/logger";

class CustomersAPI extends BaseAPI {

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

  async getCustomerById(customerId: string, accessToken?: string): Promise<CustomerRecord> {
    const response = await fetch(
      `${this.baseURL}/rest/v1/customer_profiles?id=eq.${customerId}&select=*`,
      {
        method: "GET",
        headers: this.getHeaders(true, accessToken),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch customer: ${response.statusText}`);
    }

    const customers = await response.json();
    return customers[0];
  }

  async getCustomerByUserId(userId: string, accessToken?: string): Promise<CustomerRecord> {
    const response = await fetch(
      `${this.baseURL}/rest/v1/customer_profiles?user_id=eq.${userId}&select=*`,
      {
        method: "GET",
        headers: this.getHeaders(true, accessToken),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch customer by user ID: ${response.statusText}`);
    }

    const customers = await response.json();
    return customers[0];
  }

  async updateCustomer(
    customerId: string,
    updates: Partial<CustomerRecord>,
    accessToken?: string
  ): Promise<void> {
    const response = await fetch(
      `${this.baseURL}/rest/v1/customer_profiles?id=eq.${customerId}`,
      {
        method: "PATCH",
        headers: this.getHeaders(true, accessToken),
        body: JSON.stringify(updates),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to update customer: ${response.statusText}`);
    }
  }

  async createCustomer(
    customerData: Omit<CustomerRecord, "id">,
    accessToken?: string
  ): Promise<CustomerRecord> {
    const response = await fetch(
      `${this.baseURL}/rest/v1/customer_profiles`,
      {
        method: "POST",
        headers: this.getHeaders(true, accessToken),
        body: JSON.stringify(customerData),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to create customer: ${response.statusText}`);
    }

    return response.json();
  }

  async getCustomerFavorites(customerId: string, accessToken?: string): Promise<any[]> {
    const response = await fetch(
      `${this.baseURL}/rest/v1/customer_favorites?customer_id=eq.${customerId}&select=*,services(*),business_profiles(*)`,
      {
        method: "GET",
        headers: this.getHeaders(true, accessToken),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch customer favorites: ${response.statusText}`);
    }

    return response.json();
  }

  async addToFavorites(
    customerId: string,
    serviceId: string,
    accessToken?: string
  ): Promise<void> {
    const response = await fetch(
      `${this.baseURL}/rest/v1/customer_favorites`,
      {
        method: "POST",
        headers: this.getHeaders(true, accessToken),
        body: JSON.stringify({
          customer_id: customerId,
          service_id: serviceId,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to add to favorites: ${response.statusText}`);
    }
  }

  async removeFromFavorites(
    customerId: string,
    serviceId: string,
    accessToken?: string
  ): Promise<void> {
    const response = await fetch(
      `${this.baseURL}/rest/v1/customer_favorites?customer_id=eq.${customerId}&service_id=eq.${serviceId}`,
      {
        method: "DELETE",
        headers: this.getHeaders(true, accessToken),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to remove from favorites: ${response.statusText}`);
    }
  }
}

export const customersAPI = new CustomersAPI();
