/**
 * Socket.IO server setup and configuration.
 * Manages WebSocket connections and session-based rooms.
 */

import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import {
  RealtimeServerConfig,
  RealtimeConnectionError
} from './types';

/**
 * Create and configure Socket.IO server.
 */
export function createSocketIOServer(
  httpServer: HTTPServer,
  config: RealtimeServerConfig
): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.corsOrigins,
      methods: ['GET', 'POST'],
      credentials: true
    },
    // Connection settings
    pingTimeout: config.connectionTimeout || 60000,
    pingInterval: config.heartbeatInterval || 30000,
    // Upgrade transport settings
    transports: ['websocket', 'polling'],
    allowUpgrades: true,
    // Performance settings
    maxHttpBufferSize: 1e6, // 1MB
    connectTimeout: 45000
  });

  console.log('[Realtime] Socket.IO server created');
  return io;
}

/**
 * Validate client connection parameters.
 */
export function validateConnectionParams(socket: any): {
  sessionId: string;
  participantId?: string;
  fromEventId?: string;
} {
  const { sessionId, participantId, fromEventId } = socket.handshake.query;

  if (!sessionId || typeof sessionId !== 'string') {
    throw new RealtimeConnectionError(
      'Missing or invalid sessionId parameter',
      socket.id
    );
  }

  return {
    sessionId,
    participantId: participantId as string | undefined,
    fromEventId: fromEventId as string | undefined
  };
}

/**
 * Join client to session room.
 */
export async function joinSessionRoom(
  socket: any,
  sessionId: string
): Promise<void> {
  try {
    await socket.join(sessionId);
    console.log(
      `[Realtime] Socket ${socket.id} joined session room: ${sessionId}`
    );
  } catch (error) {
    throw new RealtimeConnectionError(
      `Failed to join session room: ${sessionId}`,
      socket.id
    );
  }
}

/**
 * Leave client from session room.
 */
export async function leaveSessionRoom(
  socket: any,
  sessionId: string
): Promise<void> {
  try {
    await socket.leave(sessionId);
    console.log(
      `[Realtime] Socket ${socket.id} left session room: ${sessionId}`
    );
  } catch (error) {
    console.error(
      `[Realtime] Failed to leave session room: ${sessionId}`,
      error
    );
  }
}

/**
 * Get room size (number of connected clients).
 */
export function getSessionRoomSize(
  io: SocketIOServer,
  sessionId: string
): number {
  const room = io.sockets.adapter.rooms.get(sessionId);
  return room ? room.size : 0;
}

/**
 * Get all socket IDs in a session room.
 */
export function getSessionSocketIds(
  io: SocketIOServer,
  sessionId: string
): string[] {
  const room = io.sockets.adapter.rooms.get(sessionId);
  return room ? Array.from(room) : [];
}

/**
 * Send connection established event to client.
 */
export function sendConnectionEstablished(
  socket: any,
  sessionId: string,
  participantId?: string
): void {
  socket.emit('connection:established', {
    eventId: `conn-${Date.now()}-${socket.id}`,
    eventType: 'connection:established',
    timestamp: new Date().toISOString(),
    sessionId,
    payload: {
      socketId: socket.id,
      participantId,
      message: 'WebSocket connection established'
    }
  });
}

/**
 * Send heartbeat ping to client.
 */
export function sendHeartbeat(socket: any): void {
  socket.emit('heartbeat:ping', {
    timestamp: new Date().toISOString()
  });
}

/**
 * Setup heartbeat mechanism for a socket.
 */
export function setupHeartbeat(
  socket: any,
  interval: number = 30000
): NodeJS.Timeout {
  const heartbeatTimer = setInterval(() => {
    if (socket.connected) {
      sendHeartbeat(socket);
    }
  }, interval);

  // Clear heartbeat on disconnect
  socket.on('disconnect', () => {
    clearInterval(heartbeatTimer);
  });

  return heartbeatTimer;
}

/**
 * Setup global error handlers for Socket.IO server.
 */
export function setupErrorHandlers(io: SocketIOServer): void {
  io.engine.on('connection_error', (err: any) => {
    console.error('[Realtime] Connection error:', {
      code: err.code,
      message: err.message,
      context: err.context
    });
  });

  // Handle server-level errors
  io.on('error', (err: Error) => {
    console.error('[Realtime] Server error:', err);
  });
}
