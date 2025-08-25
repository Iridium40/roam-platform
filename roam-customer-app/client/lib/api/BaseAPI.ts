import { logger } from '../../utils/logger';

export interface ApiResponse<T = any> {
  data: T | null;
  error: string | null;
  status: number;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

export abstract class BaseAPI {
  protected baseURL: string;
  protected apiKey: string;

  constructor() {
    this.baseURL = import.meta.env.VITE_PUBLIC_SUPABASE_URL || '';
    this.apiKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY || '';
    
    if (!this.baseURL || !this.apiKey) {
      logger.warn('API credentials not properly configured');
    }
  }

  protected async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}/rest/v1/${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'apikey': this.apiKey,
      'Authorization': `Bearer ${this.apiKey}`,
    };

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      logger.debug(`API Request: ${options.method || 'GET'} ${endpoint}`);
      
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      logger.debug(`API Response: ${endpoint}`, { status: response.status });
      
      return {
        data,
        error: null,
        status: response.status,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`API Error: ${endpoint}`, { error: errorMessage });
      
      return {
        data: null,
        error: errorMessage,
        status: 500,
      };
    }
  }

  protected async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request<T>(`${endpoint}${queryString}`);
  }

  protected async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  protected async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  protected async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

  protected async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}
