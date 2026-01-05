// Server entry point
// Starts the Express server with database connection and WebSocket support

import 'dotenv/config';
import { createServer } from 'http';
import { PrismaClient } from '@prisma/client';
import { createApp } from './app.js';
import { createRealtimeModule } from './modules/realtime/index.js';
import { ParticipantService } from './modules/participant/service.js';

const PORT = process.env.PORT || 3000;
const prisma = new PrismaClient();

const app = createApp(prisma);

// Create HTTP server (required for Socket.IO)
const httpServer = createServer(app);

// Create ParticipantService for heartbeat tracking
const participantService = new ParticipantService(prisma);

// Initialize Realtime module
const realtimeModule = createRealtimeModule(httpServer, {
  corsOrigins: [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000'
  ],
  heartbeatInterval: 30000,
  connectionTimeout: 60000
});

// Start server with async initialization
(async () => {
  try {
    // Setup heartbeat callback for participant tracking
    if ('connectionManager' in realtimeModule) {
      const cm = realtimeModule.connectionManager as any;
      if (cm.constructor.name === 'ConnectionManager') {
        // Inject heartbeat callback
        cm.onHeartbeatCallback = async (participantId: string) => {
          try {
            await participantService.updateLastSeen(participantId);
          } catch (error) {
            console.error(`[Server] Failed to update participant last_seen_at:`, error);
          }
        };
        console.log('[Server] Participant heartbeat tracking enabled');
      }
    }

    // Start realtime module
    await realtimeModule.start();

    // Start HTTP server
    const server = httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`WebSocket endpoint: ws://localhost:${PORT}`);
    });

    // Graceful shutdown handlers
    const shutdown = async (signal: string) => {
      console.log(`${signal} received, shutting down gracefully...`);
      server.close(async () => {
        await realtimeModule.stop();
        await prisma.$disconnect();
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
