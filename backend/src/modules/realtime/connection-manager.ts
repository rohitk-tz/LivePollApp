/**
 * Connection manager for handling WebSocket client lifecycle.
 * Manages connections, disconnections, and reconnections.
 */

import type { Server as SocketIOServer, Socket } from 'socket.io';
import {
  ClientConnection,
  ConnectionStatus,
  IConnectionManager,
  RealtimeConnectionError
} from './types';
import {
  validateConnectionParams,
  joinSessionRoom,
  leaveSessionRoom,
  sendConnectionEstablished,
  setupHeartbeat
} from './server';

/**
 * ConnectionManager implementation.
 * Tracks active connections and handles lifecycle events.
 */
export class ConnectionManager implements IConnectionManager {
  private connections: Map<string, ClientConnection> = new Map();
  private heartbeatTimers: Map<string, NodeJS.Timeout> = new Map();
  private onHeartbeatCallback?: (participantId: string) => Promise<void>;

  constructor(
    private io: SocketIOServer,
    private heartbeatInterval: number = 30000,
    onHeartbeat?: (participantId: string) => Promise<void>
  ) {
    this.onHeartbeatCallback = onHeartbeat;
  }

  /**
   * Handle new client connection.
   */
  async onConnection(socket: Socket): Promise<void> {
    try {
      // Validate connection parameters
      const { sessionId, participantId, fromEventId } =
        validateConnectionParams(socket);

      console.log(
        `[Realtime] New connection: socket=${socket.id}, session=${sessionId}, participant=${participantId}`
      );

      // Join session room
      await joinSessionRoom(socket, sessionId);

      // Create connection record
      const connection: ClientConnection = {
        socketId: socket.id,
        sessionId,
        participantId,
        status: ConnectionStatus.CONNECTED,
        connectedAt: new Date(),
        lastEventId: fromEventId
      };

      this.connections.set(socket.id, connection);

      // Setup heartbeat
      const heartbeatTimer = setupHeartbeat(socket, this.heartbeatInterval);
      this.heartbeatTimers.set(socket.id, heartbeatTimer);

      // Send connection established event
      sendConnectionEstablished(socket, sessionId, participantId);

      // Handle event replay if fromEventId provided
      if (fromEventId) {
        await this.handleEventReplay(socket, sessionId, fromEventId);
      }

      // Setup socket event handlers
      this.setupSocketHandlers(socket, connection);

      console.log(
        `[Realtime] Connection established: ${socket.id} in session ${sessionId}`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(
        `[Realtime] Connection failed for socket ${socket.id}:`,
        errorMessage
      );

      // Send error to client
      socket.emit('connection:error', {
        error: errorMessage,
        timestamp: new Date().toISOString()
      });

      // Disconnect the socket
      socket.disconnect(true);

      throw new RealtimeConnectionError(
        `Connection failed: ${errorMessage}`,
        socket.id
      );
    }
  }

  /**
   * Handle client disconnection.
   */
  async onDisconnect(socketId: string): Promise<void> {
    const connection = this.connections.get(socketId);

    if (!connection) {
      console.warn(`[Realtime] Disconnect called for unknown socket: ${socketId}`);
      return;
    }

    try {
      console.log(
        `[Realtime] Disconnecting: socket=${socketId}, session=${connection.sessionId}`
      );

      // Update connection status
      connection.status = ConnectionStatus.DISCONNECTED;

      // Clear heartbeat timer
      const heartbeatTimer = this.heartbeatTimers.get(socketId);
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        this.heartbeatTimers.delete(socketId);
      }

      // Get socket and leave session room
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        await leaveSessionRoom(socket, connection.sessionId);
      }

      // Remove connection record
      this.connections.delete(socketId);

      console.log(
        `[Realtime] Disconnected: ${socketId} from session ${connection.sessionId}`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(
        `[Realtime] Error during disconnect for ${socketId}:`,
        errorMessage
      );
    }
  }

  /**
   * Get connection metadata for a socket.
   */
  getConnection(socketId: string): ClientConnection | undefined {
    return this.connections.get(socketId);
  }

  /**
   * Get all connections for a session.
   */
  getSessionConnections(sessionId: string): ClientConnection[] {
    const sessionConnections: ClientConnection[] = [];

    for (const connection of this.connections.values()) {
      if (connection.sessionId === sessionId) {
        sessionConnections.push(connection);
      }
    }

    return sessionConnections;
  }

  /**
   * Get total number of active connections.
   */
  getTotalConnections(): number {
    return this.connections.size;
  }

  /**
   * Setup socket event handlers.
   */
  private setupSocketHandlers(
    socket: Socket,
    connection: ClientConnection
  ): void {
    // Handle heartbeat pong
    socket.on('heartbeat:pong', async () => {
      // Update last activity timestamp
      connection.connectedAt = new Date();
      
      // Call heartbeat callback to update participant's last_seen_at
      if (connection.participantId && this.onHeartbeatCallback) {
        try {
          await this.onHeartbeatCallback(connection.participantId);
        } catch (error) {
          console.error(
            `[Realtime] Failed to process heartbeat for participant ${connection.participantId}:`,
            error instanceof Error ? error.message : 'Unknown error'
          );
        }
      }
    });

    // Handle client-initiated disconnect
    socket.on('disconnect', async (reason: string) => {
      console.log(
        `[Realtime] Socket ${socket.id} disconnected: ${reason}`
      );
      await this.onDisconnect(socket.id);
    });

    // Handle connection errors
    socket.on('error', (error: Error) => {
      console.error(
        `[Realtime] Socket ${socket.id} error:`,
        error.message
      );
      connection.status = ConnectionStatus.ERROR;
    });

    // Handle reconnection
    socket.on('reconnect', async (fromEventId?: string) => {
      console.log(
        `[Realtime] Socket ${socket.id} reconnecting from event: ${fromEventId}`
      );
      connection.status = ConnectionStatus.RECONNECTING;

      if (fromEventId) {
        await this.handleEventReplay(
          socket,
          connection.sessionId,
          fromEventId
        );
      }

      connection.status = ConnectionStatus.CONNECTED;
    });

    // Handle poll room subscription (for interactive poll windows)
    socket.on('poll:subscribe', async ({ pollId }: { pollId: string }) => {
      if (!pollId || typeof pollId !== 'string') {
        socket.emit('poll:subscribe:error', {
          error: 'Invalid pollId parameter',
          timestamp: new Date().toISOString()
        });
        return;
      }

      try {
        const pollRoom = `poll:${pollId}`;
        await socket.join(pollRoom);
        console.log(
          `[Realtime] Socket ${socket.id} subscribed to poll room: ${pollRoom}`
        );

        socket.emit('poll:subscribe:success', {
          pollId,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(
          `[Realtime] Failed to subscribe socket ${socket.id} to poll ${pollId}:`,
          errorMessage
        );
        socket.emit('poll:subscribe:error', {
          error: errorMessage,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Handle poll room unsubscription
    socket.on('poll:unsubscribe', async ({ pollId }: { pollId: string }) => {
      if (!pollId || typeof pollId !== 'string') {
        return;
      }

      try {
        const pollRoom = `poll:${pollId}`;
        await socket.leave(pollRoom);
        console.log(
          `[Realtime] Socket ${socket.id} unsubscribed from poll room: ${pollRoom}`
        );
      } catch (error) {
        console.error(
          `[Realtime] Failed to unsubscribe socket ${socket.id} from poll ${pollId}:`,
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    });
  }

  /**
   * Handle event replay for reconnected clients.
   * This is a placeholder - actual implementation requires Redis.
   */
  private async handleEventReplay(
    socket: Socket,
    sessionId: string,
    fromEventId: string
  ): Promise<void> {
    console.log(
      `[Realtime] Event replay requested: socket=${socket.id}, session=${sessionId}, fromEventId=${fromEventId}`
    );

    // TODO: Implement event replay using Redis
    // 1. Fetch events from Redis sorted set (session:sessionId:events)
    // 2. Filter events with eventId > fromEventId
    // 3. Send events in order to the client
    // 4. Update connection.lastEventId

    // For now, send a replay notification
    socket.emit('event:replay:start', {
      fromEventId,
      timestamp: new Date().toISOString(),
      message: 'Event replay not yet implemented (requires Redis)'
    });

    socket.emit('event:replay:complete', {
      fromEventId,
      timestamp: new Date().toISOString(),
      replayedCount: 0
    });
  }

  /**
   * Cleanup all connections (for graceful shutdown).
   */
  async cleanup(): Promise<void> {
    console.log('[Realtime] Cleaning up all connections...');

    // Clear all heartbeat timers
    for (const timer of this.heartbeatTimers.values()) {
      clearInterval(timer);
    }
    this.heartbeatTimers.clear();

    // Disconnect all sockets
    for (const socketId of this.connections.keys()) {
      await this.onDisconnect(socketId);
    }

    console.log('[Realtime] All connections cleaned up');
  }
}
