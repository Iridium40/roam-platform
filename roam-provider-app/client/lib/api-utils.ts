/**
 * Utility functions for API calls with consistent error handling
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  status: number;
}

/**
 * Safe API call wrapper that handles response parsing and common errors
 */
export async function safeApiCall<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  let response: Response;

  try {
    response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    console.log(`API Call: ${options.method || 'GET'} ${url}`);
    console.log(`Response status: ${response.status} ${response.statusText}`);

  } catch (fetchError) {
    console.error('Fetch failed:', fetchError);
    return {
      success: false,
      error: 'Network error or server unreachable',
      status: 0,
    };
  }

  // Read response body once and handle all logic based on that
  let responseText: string;
  let data: any = null;

  try {
    responseText = await response.text();
    console.log(`Response length: ${responseText?.length || 0} characters`);

    // Parse JSON if response has content
    if (responseText && responseText.trim()) {
      try {
        data = JSON.parse(responseText);
        console.log('Successfully parsed response JSON');
      } catch (parseError) {
        console.error('Failed to parse JSON response:', parseError);
        console.error('Raw response:', responseText);

        // If it's an error response and we can't parse JSON, use status text
        return {
          success: false,
          error: response.ok
            ? 'Server returned invalid JSON response'
            : `Server error (${response.status}): ${response.statusText}`,
          status: response.status,
        };
      }
    }
  } catch (readError) {
    console.error('Failed to read response text:', readError);
    return {
      success: false,
      error: 'Failed to read server response',
      status: response.status,
    };
  }

  // Handle error responses (non-2xx status codes)
  if (!response.ok) {
    const errorMessage = data?.error || data?.message || responseText || `Server error (${response.status}): ${response.statusText}`;
    console.error('API Error:', errorMessage);

    return {
      success: false,
      error: errorMessage,
      status: response.status,
      data: data, // Include data for error details
    };
  }

  // Success response
  console.log('API Success:', { status: response.status, hasData: !!data });
  return {
    success: true,
    data: data,
    status: response.status,
  };
}

/**
 * Specific wrapper for POST requests with JSON body
 */
export async function postJson<T = any>(
  url: string,
  body: any,
  headers?: Record<string, string>
): Promise<ApiResponse<T>> {
  return safeApiCall<T>(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

/**
 * Specific wrapper for PUT requests with JSON body
 */
export async function putJson<T = any>(
  url: string,
  body: any,
  headers?: Record<string, string>
): Promise<ApiResponse<T>> {
  return safeApiCall<T>(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

/**
 * Specific wrapper for GET requests
 */
export async function getJson<T = any>(
  url: string,
  headers?: Record<string, string>
): Promise<ApiResponse<T>> {
  return safeApiCall<T>(url, {
    method: 'GET',
    headers,
  });
}

/**
 * Handle common error cases with user-friendly messages
 */
export function getErrorMessage(error: any, fallback = 'An unexpected error occurred'): string {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  if (error?.error) {
    return error.error;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  return fallback;
}
