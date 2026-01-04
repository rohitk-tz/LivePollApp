/**
 * Type definitions for the Realtime module.
 * This module provides WebSocket-based real-time event broadcasting.
 */

/**
 * Standard WebSocket event format for all real-time messages.
 * All events broadcast through WebSocket must conform to this structure.
 */
export interface WebSocketEvent<T = unknown> {
  /** Unique identifier for event replay and ordering */
  eventId: string;
  
  /** Event type identifier (e.g., "poll:activated", "vote:accepted") */
  eventType: string;
  
  /** ISO timestamp when the event was emitted */
  timestamp: string;
  
  /** Session ID for routing to session-based rooms */
  sessionId: string;
  
  /** Event-specific payload data */
  payload: T;
}

/**
 * Connection status for tracking client connection state.
 */
export enum ConnectionStatus {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  RECONNECTING = 'RECONNECTING',
  ERROR = 'ERROR'
}

/**
 * Session room representation for managing session-based broadcasting.
 */
export interface SessionRoom {
  /** Unique session identifier */
  sessionId: string;
  
  /** Set of connected socket IDs in this session */
  socketIds: Set<string>;
  
  /** Number of active participants in the session room */
  participantCount: number;
}

/**
 * Client connection metadata.
 */
export interface ClientConnection {
  /** Socket ID from Socket.IO */
  socketId: string;
  
  /** Session the client is subscribed to */
  sessionId: string;
  
  /** Optional participant ID (if authenticated) */
  participantId?: string;
  
  /** Connection status */
  status: ConnectionStatus;
  
  /** Timestamp when connection was established */
  connectedAt: Date;
  
  /** Last event ID received (for replay) */
  lastEventId?: string;
}

/**
 * Configuration options for Socket.IO server.
 */
export interface RealtimeServerConfig {
  /** CORS allowed origins */
  corsOrigins: string[];
  
  /** Heartbeat interval in milliseconds (default: 30000) */
  heartbeatInterval?: number;
  
  /** Connection timeout in milliseconds (default: 60000) */
  connectionTimeout?: number;
  
  /** Enable event replay (requires Redis) */
  enableEventReplay?: boolean;
}

/**
 * Event broadcaster interface for publishing domain events.
 */
export interface IEventBroadcaster {
  /**
   * Broadcast an event to all clients in a session room.
   */
  broadcast(sessionId: string, event: WebSocketEvent): Promise<void>;
  
  /**
   * Subscribe to domain module events and forward them via WebSocket.
   */
  subscribe(): void;
}

/**
 * Connection manager interface for handling client lifecycle.
 */
export interface IConnectionManager {
  /**
   * Handle new client connection.
   */
  onConnection(socket: any): Promise<void>;
  
  /**
   * Handle client disconnection.
   */
  onDisconnect(socketId: string): Promise<void>;
  
  /**
   * Get connection metadata for a socket.
   */
  getConnection(socketId: string): ClientConnection | undefined;
  
  /**
   * Get all connections for a session.
   */
  getSessionConnections(sessionId: string): ClientConnection[];
}

/**
 * Realtime module public interface.
 */
export interface IRealtimeModule {
  /** Socket.IO server instance */
  io: any;
  
  /** Event broadcaster instance */
  broadcaster: IEventBroadcaster;
  
  /** Connection manager instance */
  connectionManager: IConnectionManager;
  
  /** Start the realtime server */
  start(): Promise<void>;
  
  /** Stop the realtime server and clean up resources */
  stop(): Promise<void>;
}

// ============================================================================
// Error Classes
// ============================================================================

/**
 * Base error class for Realtime module errors.
 */
export class RealtimeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RealtimeError';
    Object.setPrototypeOf(this, RealtimeError.prototype);
  }
}

/**
 * Error for WebSocket connection failures.
 */
export class RealtimeConnectionError extends RealtimeError {
  constructor(message: string, public socketId?: string) {
    super(message);
    this.name = 'RealtimeConnectionError';
    Object.setPrototypeOf(this, RealtimeConnectionError.prototype);
  }
}

/**
 * Error for event broadcasting failures.
 */
export class EventBroadcastError extends RealtimeError {
  constructor(
    message: string,
    public eventId?: string,
    public sessionId?: string
  ) {
    super(message);
    this.name = 'EventBroadcastError';
    Object.setPrototypeOf(this, EventBroadcastError.prototype);
  }
}

/**
 * Error for event replay failures.
 */
export class EventReplayError extends RealtimeError {
  constructor(
    message: string,
    public fromEventId?: string,
    public sessionId?: string
  ) {
    super(message);
    this.name = 'EventReplayError';
    Object.setPrototypeOf(this, EventReplayError.prototype);
  }
}
