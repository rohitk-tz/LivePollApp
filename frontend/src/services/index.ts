/**
 * Frontend Services - Main Exports
 * 
 * Centralized exports for all communication layer services
 */

// REST API Client
export { sessionApi, pollApi, participantApi, voteApi } from './api';

// WebSocket Service
export { websocketService } from './websocket';
export type { WebSocketConnectionOptions, WebSocketCallbacks } from './websocket';

// Error Handling
export {
  ApiError,
  ApiErrorCode,
  parseApiError,
  isApiError
} from './errors';
export type { ApiErrorResponse } from './errors';
