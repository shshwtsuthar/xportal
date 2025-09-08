import { toast } from "sonner";

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: any;
}

export class ErrorHandler {
  static handle(error: any, context: string = "Operation"): void {
    console.error(`[${context}] Error:`, error);

    let errorMessage = "An unexpected error occurred";
    let errorDetails: any = null;

    // Handle different error types
    if (error?.message) {
      errorMessage = error.message;
    } else if (typeof error === "string") {
      errorMessage = error;
    }

    // Handle Supabase errors
    if (error?.error) {
      errorMessage = error.error.message || errorMessage;
      errorDetails = error.error;
    }

    // Handle network errors
    if (error?.name === "TypeError" && error?.message?.includes("fetch")) {
      errorMessage = "Network error. Please check your connection and try again.";
    }

    // Handle validation errors
    if (error?.details) {
      errorDetails = error.details;
      if (Array.isArray(error.details)) {
        errorMessage = error.details.map((d: any) => d.message).join(", ");
      }
    }

    // Show user-friendly error message
    toast.error(`${context} failed: ${errorMessage}`);

    // Log detailed error for debugging
    if (errorDetails) {
      console.error(`[${context}] Error details:`, errorDetails);
    }
  }

  static handleApiError(error: any, context: string = "API call"): void {
    // Handle specific HTTP status codes
    if (error?.status) {
      switch (error.status) {
        case 400:
          this.handle(error, `${context} - Bad Request`);
          break;
        case 401:
          this.handle(error, `${context} - Unauthorized`);
          break;
        case 403:
          this.handle(error, `${context} - Forbidden`);
          break;
        case 404:
          this.handle(error, `${context} - Not Found`);
          break;
        case 422:
          this.handle(error, `${context} - Validation Error`);
          break;
        case 500:
          this.handle(error, `${context} - Server Error`);
          break;
        default:
          this.handle(error, `${context} - HTTP ${error.status}`);
      }
    } else {
      this.handle(error, context);
    }
  }

  static handleFormError(error: any, context: string = "Form submission"): void {
    // Handle form-specific errors
    if (error?.issues) {
      // Zod validation errors
      const errorMessages = error.issues.map((issue: any) => 
        `${issue.path.join('.')}: ${issue.message}`
      );
      toast.error(`${context} failed: ${errorMessages.join(", ")}`);
    } else {
      this.handle(error, context);
    }
  }

  static handleNetworkError(error: any, context: string = "Network request"): void {
    if (error?.name === "AbortError") {
      toast.error(`${context} was cancelled`);
    } else if (error?.message?.includes("timeout")) {
      toast.error(`${context} timed out. Please try again.`);
    } else {
      this.handle(error, context);
    }
  }
}

// Utility function for async error handling
export const withErrorHandling = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context: string = "Operation"
) => {
  return async (...args: T): Promise<R | null> => {
    try {
      return await fn(...args);
    } catch (error) {
      ErrorHandler.handle(error, context);
      return null;
    }
  };
};

// Utility function for form submission error handling
export const withFormErrorHandling = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context: string = "Form submission"
) => {
  return async (...args: T): Promise<R | null> => {
    try {
      return await fn(...args);
    } catch (error) {
      ErrorHandler.handleFormError(error, context);
      return null;
    }
  };
};
