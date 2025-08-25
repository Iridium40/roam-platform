export interface ErrorMapping {
  code: string;
  userMessage: string;
  action?: string;
  severity: "error" | "warning" | "info";
}

export const ERROR_MAPPINGS: ErrorMapping[] = [
  // Authentication errors
  {
    code: "INVALID_LOGIN_CREDENTIALS",
    userMessage: "Invalid email or password. Please check your credentials and try again.",
    action: "Please verify your email and password are correct.",
    severity: "error",
  },
  {
    code: "EMAIL_NOT_CONFIRMED",
    userMessage: "Please check your email and click the confirmation link before signing in.",
    action: "Check your email inbox and spam folder for the confirmation email.",
    severity: "warning",
  },
  {
    code: "TOO_MANY_REQUESTS",
    userMessage: "Too many login attempts. Please wait a few minutes before trying again.",
    action: "Wait 5-10 minutes before attempting to sign in again.",
    severity: "warning",
  },
  {
    code: "USER_ALREADY_REGISTERED",
    userMessage: "An account with this email already exists. Please sign in instead.",
    action: "Use the 'Sign In' option instead of 'Sign Up'.",
    severity: "info",
  },

  // File upload errors
  {
    code: "FILE_TOO_LARGE",
    userMessage: "The file is too large. Please choose a smaller file.",
    action: "Compress the file or choose a smaller version (max 10MB).",
    severity: "error",
  },
  {
    code: "INVALID_FILE_TYPE",
    userMessage: "Invalid file type. Please upload a supported file format.",
    action: "Supported formats: JPG, PNG, PDF, DOC, DOCX (max 10MB each).",
    severity: "error",
  },
  {
    code: "UPLOAD_FAILED",
    userMessage: "File upload failed. Please try again.",
    action: "Check your internet connection and try uploading again.",
    severity: "error",
  },

  // Network errors
  {
    code: "NETWORK_ERROR",
    userMessage: "Network error. Please check your connection and try again.",
    action: "Check your internet connection and refresh the page.",
    severity: "error",
  },
  {
    code: "TIMEOUT_ERROR",
    userMessage: "Request timed out. Please try again.",
    action: "The server is taking longer than expected. Please try again in a moment.",
    severity: "warning",
  },

  // Database errors
  {
    code: "RECORD_NOT_FOUND",
    userMessage: "The requested information was not found.",
    action: "Please refresh the page or contact support if the problem persists.",
    severity: "error",
  },
  {
    code: "DUPLICATE_RECORD",
    userMessage: "This record already exists.",
    action: "Please check if you've already created this item.",
    severity: "warning",
  },
  {
    code: "CONSTRAINT_VIOLATION",
    userMessage: "Invalid data provided. Please check your input.",
    action: "Please review the form and ensure all required fields are filled correctly.",
    severity: "error",
  },

  // Permission errors
  {
    code: "PERMISSION_DENIED",
    userMessage: "You don't have permission to perform this action.",
    action: "Please contact your administrator if you believe this is an error.",
    severity: "error",
  },
  {
    code: "UNAUTHORIZED",
    userMessage: "You are not authorized to access this resource.",
    action: "Please sign in again or contact support.",
    severity: "error",
  },

  // Business logic errors
  {
    code: "BUSINESS_NOT_FOUND",
    userMessage: "Business profile not found.",
    action: "Please complete the business information setup first.",
    severity: "error",
  },
  {
    code: "APPLICATION_NOT_SUBMITTED",
    userMessage: "Application not submitted. Please complete all required steps.",
    action: "Please complete the application process before proceeding.",
    severity: "warning",
  },
  {
    code: "DOCUMENTS_MISSING",
    userMessage: "Required documents are missing.",
    action: "Please upload all required documents before submitting.",
    severity: "warning",
  },

  // Stripe errors
  {
    code: "STRIPE_VERIFICATION_FAILED",
    userMessage: "Identity verification failed. Please try again.",
    action: "Ensure your information matches your government ID and try again.",
    severity: "error",
  },
  {
    code: "STRIPE_ACCOUNT_CREATION_FAILED",
    userMessage: "Payment account setup failed. Please try again.",
    action: "Check your business information and try again.",
    severity: "error",
  },

  // Plaid errors
  {
    code: "PLAID_LINK_FAILED",
    userMessage: "Bank account connection failed. Please try again.",
    action: "Ensure your bank credentials are correct and try again.",
    severity: "error",
  },
  {
    code: "PLAID_TOKEN_EXPIRED",
    userMessage: "Bank connection session expired. Please try again.",
    action: "Click the link again to reconnect your bank account.",
    severity: "warning",
  },
];

export function getUserFriendlyError(error: Error | string, context?: any): ErrorMapping {
  const errorMessage = typeof error === "string" ? error : error.message;
  const errorCode = typeof error === "string" ? error : (error as any).code || error.message;

  // Try to find exact match
  const exactMatch = ERROR_MAPPINGS.find(mapping => 
    mapping.code.toLowerCase() === errorCode.toLowerCase()
  );

  if (exactMatch) {
    return exactMatch;
  }

  // Try to find partial match
  const partialMatch = ERROR_MAPPINGS.find(mapping =>
    errorMessage.toLowerCase().includes(mapping.code.toLowerCase()) ||
    mapping.code.toLowerCase().includes(errorMessage.toLowerCase())
  );

  if (partialMatch) {
    return partialMatch;
  }

  // Default error mapping
  return {
    code: "UNKNOWN_ERROR",
    userMessage: "An unexpected error occurred. Please try again.",
    action: "If the problem persists, please contact support.",
    severity: "error",
  };
}

export function getErrorSeverityColor(severity: "error" | "warning" | "info"): string {
  switch (severity) {
    case "error":
      return "text-red-600 bg-red-50 border-red-200";
    case "warning":
      return "text-yellow-600 bg-yellow-50 border-yellow-200";
    case "info":
      return "text-blue-600 bg-blue-50 border-blue-200";
    default:
      return "text-gray-600 bg-gray-50 border-gray-200";
  }
}

export function getErrorIcon(severity: "error" | "warning" | "info"): string {
  switch (severity) {
    case "error":
      return "🚨";
    case "warning":
      return "⚠️";
    case "info":
      return "ℹ️";
    default:
      return "❓";
  }
}
