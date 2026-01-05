# Realtime Module

WebSocket-based real-time event broadcasting module for the Live Event Polling Application.

## Overview

The Realtime module provides WebSocket connectivity using Socket.IO to broadcast domain events to connected clients in real-time. It follows the modular monolith architecture pattern and has zero business logic - it purely acts as an event broadcasting layer.

## Features

- ✅ WebSocket server with Socket.IO
- ✅ Session-based room management
- ✅ Connection lifecycle management (connect, disconnect, reconnect)
- ✅ Heartbeat mechanism (30-second ping/pong)
- ✅ Event broadcasting to session rooms
- ✅ CORS configuration for frontend clients
- ✅ Graceful shutdown support
- ⏳ Event replay cache (requires Redis)
- ⏳ Horizontal scaling with Redis adapter

## Architecture

### Module Structure

```
realtime/
├── types.ts                  # Type definitions and interfaces
├── server.ts                 # Socket.IO server configuration
├── broadcaster.ts            # Event broadcasting logic
├── connection-manager.ts     # Connection lifecycle management
├── index.ts                  # Module factory and exports
└── README.md                # This file
```

### Components

#### 1. Socket.IO Server (`server.ts`)
- Configures Socket.IO with CORS, heartbeat, and connection settings
- Manages session-based rooms for message routing
- Provides utility functions for room management

#### 2. Event Broadcaster (`broadcaster.ts`)
- Subscribes to domain module events
- Formats events into WebSocketEvent structure
- Broadcasts events to appropriate session rooms
- **TODO**: Wire up event subscriptions to domain modules

#### 3. Connection Manager (`connection-manager.ts`)
- Handles new client connections
- Validates connection parameters (sessionId, participantId)
- Manages connection metadata and tracking
- Implements heartbeat mechanism
- Handles disconnection and cleanup
- **TODO**: Implement event replay with Redis

## Usage

### Integration with Express Server

The Realtime module is integrated in `server.ts`:

```typescript
import { createServer } from 'http';
import { createApp } from './app.js';
import { createRealtimeModule } from './modules/realtime/index.js';

const app = createApp(prisma);
const httpServer = createServer(app);

// Initialize Realtime module
const realtimeModule = createRealtimeModule(httpServer, {
  corsOrigins: ['http://localhost:5173'],
  heartbeatInterval: 30000,
  connectionTimeout: 60000
});

// Start the module
await realtimeModule.start();

// Start HTTP server
httpServer.listen(3000);
```

### Client Connection

Clients connect via Socket.IO client library:

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  query: {
    sessionId: 'abc123',        // Required
    participantId: 'user456',   // Optional
    fromEventId: 'evt789'       // Optional (for event replay)
  }
});

// Listen for connection established
socket.on('connection:established', (data) => {
  console.log('Connected:', data);
});

// Listen for domain events
socket.on('event', (event) => {
  console.log('Event received:', event);
  // event = { eventId, eventType, timestamp, sessionId, payload }
});

// Handle heartbeat
socket.on('heartbeat:ping', () => {
  socket.emit('heartbeat:pong');
});
```

### Event Format

All events broadcast through WebSocket follow this structure:

```typescript
interface WebSocketEvent {
  eventId: string;           // Unique event ID
  eventType: string;         // e.g., "poll:activated"
  timestamp: string;         // ISO 8601 timestamp
  sessionId: string;         // Session scope
  payload: any;              // Event-specific data
}
```

### Supported Event Types

The module broadcasts these domain events:

**Session Events:**
- `session:started` - Session has started
- `session:ended` - Session has ended

**Participant Events:**
- `participant:joined` - New participant joined

**Poll Events:**
- `poll:created` - New poll created
- `poll:activated` - Poll opened for voting
- `poll:closed` - Poll closed with results

**Vote Events:**
- `vote:accepted` - Vote recorded successfully
- `vote:rejected` - Vote rejected with reason

**Connection Events:**
- `connection:established` - Client connected
- `connection:error` - Connection error occurred
- `heartbeat:ping` - Server heartbeat ping

## Configuration

### RealtimeServerConfig Options

```typescript
interface RealtimeServerConfig {
  corsOrigins: string[];           // Allowed CORS origins
  heartbeatInterval?: number;      // Heartbeat interval (default: 30000ms)
  connectionTimeout?: number;      // Connection timeout (default: 60000ms)
  enableEventReplay?: boolean;     // Enable event replay (default: false)
}
```

### Default Configuration

```typescript
{
  corsOrigins: [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000'
  ],
  heartbeatInterval: 30000,    // 30 seconds
  connectionTimeout: 60000,    // 60 seconds
  enableEventReplay: false     // Requires Redis
}
```

## Session-Based Rooms

The module uses Socket.IO rooms for session-based message routing:

- Each client joins a room named after their `sessionId`
- Events are broadcast to all clients in the session room: `io.to(sessionId).emit('event', data)`
- Clients automatically leave rooms on disconnect

## Connection Lifecycle

### 1. Connection
1. Client connects with `sessionId` query parameter
2. Server validates connection parameters
3. Client joins session room
4. Server sends `connection:established` event
5. Heartbeat mechanism starts

### 2. Disconnection
1. Client disconnects (intentional or network failure)
2. Server removes client from session room
3. Connection metadata cleaned up
4. Heartbeat timer cleared

### 3. Reconnection
1. Client reconnects with `fromEventId` parameter
2. Server validates reconnection
3. **TODO**: Server replays missed events from Redis cache
4. Client rejoins session room

## Performance

- **Target Latency**: <100ms event delivery (p95)
- **Concurrent Connections**: Supports 2000+ connections per instance
- **Heartbeat**: 30-second interval prevents connection timeouts
- **Event Buffer**: 24-hour event replay cache (requires Redis)

## TODO: Event Bus Integration

The broadcaster currently has placeholder methods for domain event handlers. To complete the integration:

1. **Create Event Bus** (Task 3.20):
   - Implement in-process event emitter or integrate external message broker
   - Domain modules emit events through the event bus

2. **Wire Up Subscriptions** (in `broadcaster.ts`):
   ```typescript
   subscribe(): void {
     // Subscribe to domain events
     eventBus.on('session:started', (data) => this.handleSessionStarted(data));
     eventBus.on('poll:activated', (data) => this.handlePollActivated(data));
     eventBus.on('vote:accepted', (data) => this.handleVoteAccepted(data));
     // ... etc
   }
   ```

3. **Domain Modules Emit Events**:
   - Session service: `eventBus.emit('session:started', { sessionId, code, startedAt })`
   - Poll service: `eventBus.emit('poll:activated', { pollId, sessionId, activatedAt })`
   - Vote service: `eventBus.emit('vote:accepted', { voteId, pollId, participantId })`

## TODO: Event Replay with Redis

For reconnection support with event replay (Task 3.25):

1. **Install Redis Client**:
   ```bash
   npm install redis ioredis @types/ioredis
   ```

2. **Store Events in Redis**:
   - Use sorted sets: `session:{sessionId}:events`
   - Score = timestamp for ordering
   - Value = JSON serialized event
   - TTL = 24 hours

3. **Implement Replay in connection-manager.ts**:
   ```typescript
   private async handleEventReplay(socket, sessionId, fromEventId) {
     const events = await redis.zrangebyscore(
       `session:${sessionId}:events`,
       fromEventId,
       '+inf'
     );
     for (const event of events) {
       socket.emit('event', JSON.parse(event));
     }
   }
   ```

## Testing

### Manual WebSocket Testing

Use a WebSocket client tool (e.g., Postman, wscat) or browser console:

```javascript
// Browser console
const socket = io('http://localhost:3000', {
  query: { sessionId: 'test-session' }
});

socket.on('connection:established', (data) => console.log('Connected:', data));
socket.on('event', (event) => console.log('Event:', event));
```

### Integration Testing

1. Start the backend server: `npm run dev`
2. Connect WebSocket client with valid sessionId
3. Trigger domain events (create poll, cast vote, etc.)
4. Verify events are broadcast to connected clients

## Security Considerations

- ✅ CORS configured for specific frontend origins
- ⏳ **TODO**: Implement authentication/authorization
  - Validate participant tokens on connection
  - Ensure users can only join sessions they belong to
  - Implement presenter vs participant permissions
- ⏳ **TODO**: Rate limiting to prevent abuse
- ⏳ **TODO**: Input validation for all client messages

## Deployment Notes

- **Sticky Sessions Required**: When load balancing, enable sticky sessions
- **Redis Adapter**: For horizontal scaling, install Redis adapter: `npm install @socket.io/redis-adapter`
- **Environment Variables**:
  - `PORT`: HTTP server port (default: 3000)
  - `CORS_ORIGINS`: Comma-separated list of allowed origins

## Dependencies

- `socket.io`: WebSocket library with fallback support
- `nanoid`: Unique event ID generation
- Express HTTP server (shared with REST API)

## References

- ADR-002: Real-Time Communication Architecture Decision Record
- Socket.IO Documentation: https://socket.io/docs/v4/
- Module Architecture: `/specs/011-design/implementation/modules.md`
