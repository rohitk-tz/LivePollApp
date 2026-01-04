/**
 * API Error Handling
 * 
 * Centralized error types and error handling utilities for REST API communication.
 * Error codes align with backend API contracts specification.
 */

// Error codes from API contracts
export enum ApiErrorCode {
  // Session errors
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  INVALID_STATE = 'INVALID_STATE',
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_ACCESS_CODE = 'INVALID_ACCESS_CODE',
  
  // Poll errors
  POLL_NOT_FOUND = 'POLL_NOT_FOUND',
  INSUFFICIENT_OPTIONS = 'INSUFFICIENT_OPTIONS',
  TOO_MANY_OPTIONS = 'TOO_MANY_OPTIONS',
  SESSION_NOT_ACTIVE = 'SESSION_NOT_ACTIVE',
  ACTIVE_POLL_EXISTS = 'ACTIVE_POLL_EXISTS',
  
  // Vote errors
  PARTICIPANT_NOT_JOINED = 'PARTICIPANT_NOT_JOINED',
  DUPLICATE_VOTE = 'DUPLICATE_VOTE',
  INVALID_OPTION = 'INVALID_OPTION',
  
  // Participant errors
  PARTICIPANT_NOT_FOUND = 'PARTICIPANT_NOT_FOUND',
  
  // General errors
  INVALID_PAYLOAD = 'INVALID_PAYLOAD',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

// API Error Response structure from backend
export interface ApiErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
  timestamp: string;
  path?: string;
}

/**
 * Custom API Error class
 * Extends native Error with structured error information from backend
 */
export class ApiError extends Error {
  public readonly code: ApiErrorCode;
  public readonly statusCode: number;
  public readonly timestamp: string;
  public readonly path?: string;
  public readonly details?: unknown;

  constructor(response: ApiErrorResponse, statusCode: number) {
    super(response.error.message);
    this.name = 'ApiError';
    this.code = response.error.code;
    this.statusCode = statusCode;
    this.timestamp = response.timestamp;
    this.path = response.path;
    this.details = response.error.details;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (typeof (Error as any).captureStackTrace === 'function') {
      (Error as any).captureStackTrace(this, ApiError);
    }
  }

  /**
   * Check if error is a specific error code
   */
  is(code: ApiErrorCode): boolean {
    return this.code === code;
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    switch (this.code) {
      case ApiErrorCode.SESSION_NOT_FOUND:
        return 'Session not found. Please check the session code and try again.';
      case ApiErrorCode.INVALID_ACCESS_CODE:
        return 'Invalid access code. Please check and try again.';
      case ApiErrorCode.INVALID_STATE:
        return 'This action cannot be performed in the current state.';
      case ApiErrorCode.POLL_NOT_FOUND:
        return 'Poll not found.';
      case ApiErrorCode.SESSION_NOT_ACTIVE:
        return 'Session is not active. Please wait for the presenter to start it.';
      case ApiErrorCode.DUPLICATE_VOTE:
        return 'You have already voted on this poll.';
      case ApiErrorCode.PARTICIPANT_NOT_JOINED:
        return 'You must join the session before voting.';
      case ApiErrorCode.INVALID_OPTION:
        return 'Invalid option selected.';
      case ApiErrorCode.ACTIVE_POLL_EXISTS:
        return 'Another poll is already active. Close it before activating a new one.';
      case ApiErrorCode.INSUFFICIENT_OPTIONS:
        return 'Poll must have at least 2 options.';
      case ApiErrorCode.TOO_MANY_OPTIONS:
        return 'Poll cannot have more than 10 options.';
      case ApiErrorCode.INVALID_PAYLOAD:
        return 'Invalid request. Please check your input and try again.';
      case ApiErrorCode.UNAUTHORIZED:
        return 'You are not authorized to perform this action.';
      case ApiErrorCode.PARTICIPANT_NOT_FOUND:
        return 'Participant not found.';
      case ApiErrorCode.INTERNAL_ERROR:
      default:
        return 'An unexpected error occurred. Please try again later.';
    }
  }

  /**
   * Convert error to JSON for logging
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      path: this.path,
      details: this.details,
    };
  }
}

/**
 * Parse fetch response into ApiError if error response
 * @param response - Fetch Response object
 * @returns ApiError if response is error, null otherwise
 */
export async function parseApiError(response: Response): Promise<ApiError | null> {
  if (!response.ok) {
    try {
      const errorData: ApiErrorResponse = await response.json();
      return new ApiError(errorData, response.status);
    } catch {
      // If response doesn't have JSON error format, create generic error
      const genericError: ApiErrorResponse = {
        error: {
          code: ApiErrorCode.INTERNAL_ERROR,
          message: response.statusText || 'Unknown error occurred',
        },
        timestamp: new Date().toISOString(),
      };
      return new ApiError(genericError, response.status);
    }
  }
  return null;
}

/**
 * Type guard to check if error is ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
