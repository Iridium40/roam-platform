import { toast } from "@/hooks/use-toast";
import { AppError } from "@/lib/errors/AppError";
// import { schemas } from "@shared/validation/schemas";
import { z } from "zod";

export interface APIError {
  code: string;
  message: string;
  details?: any;
  userMessage: string;
}

export interface APIResponse<T = any> {
  data?: T;
  error?: APIError;
  success: boolean;
}

export interface RequestConfig extends RequestInit {
  showErrorToast?: boolean;
  showSuccessToast?: boolean;
  successMessage?: string;
  retryAttempts?: number;
  retryDelay?: number;
  validateResponse?: z.ZodSchema;
  validateRequest?: z.ZodSchema;
}

export class APIClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private retryAttempts: number;
  private retryDelay: number;

  constructor(baseURL: string = "/api") {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      "Content-Type": "application/json",
    };
    this.retryAttempts = 3;
    this.retryDelay = 1000;
  }

  private async request<T>(
    endpoint: string,
    options: RequestConfig = {}
  ): Promise<APIResponse<T>> {
    const {
      showErrorToast = true,
      showSuccessToast = false,
      successMessage,
      retryAttempts = this.retryAttempts,
      retryDelay = this.retryDelay,
      validateResponse,
      validateRequest,
      ...requestOptions
    } = options;

    // Validate request data if schema provided
    if (validateRequest && requestOptions.body) {
      try {
        const body = typeof requestOptions.body === 'string' 
          ? JSON.parse(requestOptions.body) 
          : requestOptions.body;
        validateRequest.parse(body);
      } catch (validationError) {
        const error = AppError.validationError(
          'Request validation failed',
          validationError instanceof z.ZodError ? validationError.errors : undefined
        );
        
        if (showErrorToast) {
          toast({
            title: "Validation Error",
            description: error.userMessage,
            variant: "destructive",
          });
        }
        
        return { error: this.createAPIError(error), success: false };
      }
    }

    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      ...this.defaultHeaders,
      ...requestOptions.headers,
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
      try {
        const response = await fetch(url, {
          ...requestOptions,
          headers,
        });

        const contentType = response.headers.get("content-type") || "";
        let data: any;

        if (contentType.includes("application/json")) {
          data = await response.json();
        } else {
          const text = await response.text();
          data = { message: text };
        }

        if (!response.ok) {
          const error: APIError = {
            code: `HTTP_${response.status}`,
            message: data.error || data.message || `HTTP ${response.status}`,
            details: data,
            userMessage: this.getUserFriendlyError(response.status, data),
          };

          // Don't retry on client errors (4xx)
          if (response.status >= 400 && response.status < 500) {
            if (showErrorToast) {
              toast({
                title: "Error",
                description: error.userMessage,
                variant: "destructive",
              });
            }
            return { error, success: false };
          }

          // Retry on server errors (5xx) and network errors
          lastError = new Error(error.message);
          if (attempt < retryAttempts) {
            await this.delay(retryDelay * Math.pow(2, attempt)); // Exponential backoff
            continue;
          }

          if (showErrorToast) {
            toast({
              title: "Error",
              description: error.userMessage,
              variant: "destructive",
            });
          }
          return { error, success: false };
        }

        // Validate response data if schema provided
        if (validateResponse) {
          try {
            validateResponse.parse(data);
          } catch (validationError) {
            const error = AppError.validationError(
              'Response validation failed',
              validationError instanceof z.ZodError ? validationError.errors : undefined
            );
            
            if (showErrorToast) {
              toast({
                title: "Data Error",
                description: error.userMessage,
                variant: "destructive",
              });
            }
            
            return { error: this.createAPIError(error), success: false };
          }
        }

        if (showSuccessToast && successMessage) {
          toast({
            title: "Success",
            description: successMessage,
          });
        }

        return { data, success: true };
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on validation errors
        if (error instanceof AppError && !error.retryable) {
          if (showErrorToast) {
            toast({
              title: "Error",
              description: error.userMessage,
              variant: "destructive",
            });
          }
          return { error: this.createAPIError(error), success: false };
        }

        // Retry on network errors
        if (attempt < retryAttempts) {
          await this.delay(retryDelay * Math.pow(2, attempt));
          continue;
        }

        const apiError: APIError = {
          code: "NETWORK_ERROR",
          message: error.message || "Network error",
          details: error,
          userMessage: "Network error. Please check your connection and try again.",
        };

        if (showErrorToast) {
          toast({
            title: "Connection Error",
            description: apiError.userMessage,
            variant: "destructive",
          });
        }

        return { error: apiError, success: false };
      }
    }

    // This should never be reached, but just in case
    const apiError: APIError = {
      code: "UNKNOWN_ERROR",
      message: lastError?.message || "Unknown error",
      details: lastError,
      userMessage: "An unexpected error occurred. Please try again.",
    };

    if (showErrorToast) {
      toast({
        title: "Error",
        description: apiError.userMessage,
        variant: "destructive",
      });
    }

    return { error: apiError, success: false };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private createAPIError(appError: AppError): APIError {
    return {
      code: appError.code,
      message: appError.message,
      userMessage: appError.userMessage,
      details: appError.context,
    };
  }

  async get<T>(endpoint: string, config?: RequestConfig): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { method: "GET", ...config });
  }

  async post<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
      ...config,
    });
  }

  async put<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
      ...config,
    });
  }

  async patch<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
      ...config,
    });
  }

  async delete<T>(endpoint: string, config?: RequestConfig): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { method: "DELETE", ...config });
  }

  // File upload helper with progress tracking
  async uploadFile<T>(
    endpoint: string,
    formData: FormData,
    config?: RequestConfig & { onProgress?: (progress: number) => void }
  ): Promise<APIResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const { showErrorToast = true, onProgress, ...requestOptions } = config || {};

    try {
      const xhr = new XMLHttpRequest();
      
      return new Promise((resolve) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable && onProgress) {
            const progress = (event.loaded / event.total) * 100;
            onProgress(progress);
          }
        });

        xhr.addEventListener('load', () => {
          const contentType = xhr.getResponseHeader("content-type") || "";
          let data: any;

          if (contentType.includes("application/json")) {
            data = JSON.parse(xhr.responseText);
          } else {
            data = { message: xhr.responseText };
          }

          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({ data, success: true });
          } else {
            const error: APIError = {
              code: `HTTP_${xhr.status}`,
              message: data.error || data.message || `HTTP ${xhr.status}`,
              details: data,
              userMessage: this.getUserFriendlyError(xhr.status, data),
            };

            if (showErrorToast) {
              toast({
                title: "Upload Error",
                description: error.userMessage,
                variant: "destructive",
              });
            }

            resolve({ error, success: false });
          }
        });

        xhr.addEventListener('error', () => {
          const apiError: APIError = {
            code: "UPLOAD_ERROR",
            message: "Upload failed",
            details: new Error("Network error during upload"),
            userMessage: "File upload failed. Please try again.",
          };

          if (showErrorToast) {
            toast({
              title: "Upload Error",
              description: apiError.userMessage,
              variant: "destructive",
            });
          }

          resolve({ error: apiError, success: false });
        });

        xhr.open("POST", url);
        
        // Set headers (excluding Content-Type for FormData)
        Object.entries(requestOptions.headers || {}).forEach(([key, value]) => {
          if (key.toLowerCase() !== 'content-type') {
            xhr.setRequestHeader(key, value);
          }
        });

        xhr.send(formData);
      });
    } catch (error: any) {
      const apiError: APIError = {
        code: "UPLOAD_ERROR",
        message: error.message || "Upload failed",
        details: error,
        userMessage: "File upload failed. Please try again.",
      };

      if (showErrorToast) {
        toast({
          title: "Upload Error",
          description: apiError.userMessage,
          variant: "destructive",
        });
      }

      return { error: apiError, success: false };
    }
  }

  private getUserFriendlyError(status: number, data: any): string {
    switch (status) {
      case 400:
        return data.userMessage || "Invalid request. Please check your input and try again.";
      case 401:
        return "You are not authorized. Please sign in again.";
      case 403:
        return "Access denied. You don't have permission to perform this action.";
      case 404:
        return "The requested resource was not found.";
      case 409:
        return "This resource already exists or conflicts with existing data.";
      case 422:
        return "Validation failed. Please check your input and try again.";
      case 429:
        return "Too many requests. Please wait a moment and try again.";
      case 500:
        return "Server error. Please try again later.";
      case 502:
      case 503:
      case 504:
        return "Service temporarily unavailable. Please try again later.";
      default:
        return data.userMessage || data.message || "An unexpected error occurred.";
    }
  }

  // Set auth token for subsequent requests
  setAuthToken(token: string | null): void {
    if (token) {
      this.defaultHeaders.Authorization = `Bearer ${token}`;
    } else {
      delete this.defaultHeaders.Authorization;
    }
  }

  // Clear auth token
  clearAuthToken(): void {
    delete this.defaultHeaders.Authorization;
  }

  // Configure retry settings
  setRetryConfig(attempts: number, delay: number): void {
    this.retryAttempts = attempts;
    this.retryDelay = delay;
  }
}

// Create singleton instance
export const apiClient = new APIClient();

// Export for convenience
export default apiClient;
