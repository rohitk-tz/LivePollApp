/**
 * Realtime module main entry point.
 * Provides WebSocket-based real-time event broadcasting for live sessions.
 */

import type { Server as HTTPServer } from 'http';
import type { Server as SocketIOServer } from 'socket.io';
import {
  IRealtimeModule,
  RealtimeServerConfig,
  IEventBroadcaster,
  IConnectionManager
} from './types';
import { createSocketIOServer, setupErrorHandlers } from './server';
import { EventBroadcaster } from './broadcaster';
import { ConnectionManager } from './connection-manager';

// Re-export types
export * from './types';

/**
 * Default realtime server configuration.
 */
const DEFAULT_CONFIG: RealtimeServerConfig = {
  corsOrigins: [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000'
  ],
  heartbeatInterval: 30000, // 30 seconds
  connectionTimeout: 60000, // 60 seconds
  enableEventReplay: false // Requires Redis
};

/**
 * RealtimeModule implementation.
 */
class RealtimeModule implements IRealtimeModule {
  public io: SocketIOServer;
  public broadcaster: IEventBroadcaster;
  public connectionManager: IConnectionManager;
  private isStarted: boolean = false;

  constructor(
    httpServer: HTTPServer,
    config: Partial<RealtimeServerConfig> = {}
  ) {
    const finalConfig: RealtimeServerConfig = {
      ...DEFAULT_CONFIG,
      ...config
    };

    // Create Socket.IO server
    this.io = createSocketIOServer(httpServer, finalConfig);

    // Setup error handlers
    setupErrorHandlers(this.io);

    // Create broadcaster
    this.broadcaster = new EventBroadcaster(this.io);

    // Create connection manager
    this.connectionManager = new ConnectionManager(
      this.io,
      finalConfig.heartbeatInterval
    );

    console.log('[Realtime] Module initialized');
  }

  /**
   * Start the realtime server.
   */
  async start(): Promise<void> {
    if (this.isStarted) {
      console.warn('[Realtime] Module already started');
      return;
    }

    try {
      // Setup connection handlers
      this.io.on('connection', async (socket) => {
        try {
          await this.connectionManager.onConnection(socket);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          console.error(
            `[Realtime] Failed to handle connection:`,
            errorMessage
          );
        }
      });

      // Subscribe broadcaster to domain events
      this.broadcaster.subscribe();

      this.isStarted = true;
      console.log('[Realtime] Module started');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error('[Realtime] Failed to start module:', errorMessage);
      throw error;
    }
  }

  /**
   * Stop the realtime server and clean up resources.
   */
  async stop(): Promise<void> {
    if (!this.isStarted) {
      console.warn('[Realtime] Module not started');
      return;
    }

    try {
      console.log('[Realtime] Stopping module...');

      // Cleanup all connections
      if (this.connectionManager instanceof ConnectionManager) {
        await this.connectionManager.cleanup();
      }

      // Close Socket.IO server
      await new Promise<void>((resolve) => {
        this.io.close(() => {
          console.log('[Realtime] Socket.IO server closed');
          resolve();
        });
      });

      this.isStarted = false;
      console.log('[Realtime] Module stopped');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error('[Realtime] Error during shutdown:', errorMessage);
      throw error;
    }
  }
}

/**
 * Create and initialize the Realtime module.
 *
 * @param httpServer - HTTP server to attach Socket.IO to
 * @param config - Optional configuration overrides
 * @returns Initialized Realtime module instance
 *
 * @example
 * ```typescript
 * const httpServer = http.createServer(app);
 * const realtime = createRealtimeModule(httpServer, {
 *   corsOrigins: ['http://localhost:5173'],
 *   heartbeatInterval: 30000
 * });
 * await realtime.start();
 * ```
 */
export function createRealtimeModule(
  httpServer: HTTPServer,
  config?: Partial<RealtimeServerConfig>
): IRealtimeModule {
  return new RealtimeModule(httpServer, config);
}
