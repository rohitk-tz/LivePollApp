# Domain Event Wiring Implementation

## Overview

This implementation connects domain events from core modules (Session, Poll, Vote, Participant) to the Realtime module, enabling real-time WebSocket broadcasts to connected clients.

## Architecture

### Event Flow

```
Domain Module → Event Bus → Realtime Module → WebSocket → Clients
```

1. **Domain Modules** emit domain events when business actions occur
2. **Event Bus** dispatches events to all subscribers (in-process EventEmitter)
3. **Realtime Module** subscribes to domain events and translates them to WebSocket events
4. **WebSocket** broadcasts events to clients in the appropriate session room

### Module Separation (Per ADR-001 & ADR-002)

- ✅ Domain modules DO NOT depend on WebSocket or Realtime code
- ✅ Realtime module DOES NOT contain business logic
- ✅ Event bus provides clean separation between layers
- ✅ Domain modules remain testable in isolation

## Implementation Details

### 1. Event Bus (`src/events/event-bus.ts`)

**Purpose**: Centralized event dispatcher for inter-module communication

**Features**:
- Type-safe event publishing and subscription
- Support for 11 domain event types
- In-process EventEmitter (can be replaced with Redis pub/sub for horizontal scaling)
- Singleton instance shared across all modules

**Event Types**:
- `SESSION_CREATED`, `SESSION_STARTED`, `SESSION_ENDED`
- `POLL_CREATED`, `POLL_ACTIVATED`, `POLL_CLOSED`
- `VOTE_ACCEPTED`, `VOTE_REJECTED`, `RESULTS_UPDATED`
- `PARTICIPANT_JOINED`, `PARTICIPANT_DISCONNECTED`

### 2. Domain Module Integration

**Session Module** (`src/modules/session/service.ts`):
- Emits `SESSION_CREATED` when session is created
- Emits `SESSION_STARTED` when session starts
- Emits `SESSION_ENDED` when session ends

**Poll Module** (`src/modules/poll/service.ts`):
- Emits `POLL_CREATED` when poll is created
- Emits `POLL_ACTIVATED` when poll is activated
- Emits `POLL_CLOSED` when poll is closed

**Vote Module** (`src/modules/vote/service.ts`):
- Emits `VOTE_ACCEPTED` when vote is successfully recorded
- Emits `VOTE_REJECTED` when vote validation fails
- Emits `RESULTS_UPDATED` after each successful vote

**Participant Module** (`src/modules/participant/service.ts`):
- Emits `PARTICIPANT_JOINED` when participant joins session
- Emits `PARTICIPANT_DISCONNECTED` when participant is removed

### 3. Realtime Module Integration

**Broadcaster** (`src/modules/realtime/broadcaster.ts`):
- Subscribes to all 11 domain events on startup
- Translates domain events to WebSocket events
- Broadcasts to session-based rooms
- Maintains clean separation from business logic

## Testing the Event Flow

### Manual Testing Steps

1. **Start the backend server**:
   ```bash
   cd backend
   npm run dev
   ```

2. **Connect a WebSocket client** (using a tool like Postman or a browser WebSocket client):
   ```javascript
   const socket = io('http://localhost:3000', {
     query: { sessionId: 'test-session-id' }
   });
   
   socket.on('event', (event) => {
     console.log('Received event:', event);
   });
   ```

3. **Trigger domain events via REST API**:

   **Create a Session**:
   ```bash
   POST http://localhost:3000/sessions
   Body: { "presenterName": "John Doe" }
   ```
   → Emits `SESSION_CREATED` event
   → WebSocket clients receive `session:created` event

   **Start the Session**:
   ```bash
   PATCH http://localhost:3000/sessions/{sessionId}/start
   ```
   → Emits `SESSION_STARTED` event
   → WebSocket clients receive `session:started` event

   **Create a Poll**:
   ```bash
   POST http://localhost:3000/sessions/{sessionId}/polls
   Body: {
     "question": "What is your favorite color?",
     "pollType": "MULTIPLE_CHOICE",
     "options": [
       { "text": "Red" },
       { "text": "Blue" },
       { "text": "Green" }
     ]
   }
   ```
   → Emits `POLL_CREATED` event
   → WebSocket clients receive `poll:created` event

   **Activate the Poll**:
   ```bash
   PATCH http://localhost:3000/polls/{pollId}/activate
   ```
   → Emits `POLL_ACTIVATED` event
   → WebSocket clients receive `poll:activated` event

   **Submit a Vote**:
   ```bash
   POST http://localhost:3000/polls/{pollId}/votes
   Body: {
     "participantId": "participant-123",
     "optionId": "option-456"
   }
   ```
   → Emits `VOTE_ACCEPTED` event
   → Emits `RESULTS_UPDATED` event
   → WebSocket clients receive both events in real-time

4. **Observe event logs** in the server console:
   ```
   [EventBus] Publishing event: session:created for session abc123
   [Realtime] Broadcast event session:created to session abc123
   ```

### WebSocket Event Format

All events broadcast via WebSocket follow this structure:

```json
{
  "eventId": "unique-event-id",
  "eventType": "poll:activated",
  "timestamp": "2026-01-04T12:34:56.789Z",
  "sessionId": "abc123",
  "payload": {
    "pollId": "poll-456",
    "sessionId": "abc123",
    "activatedAt": "2026-01-04T12:34:56.789Z"
  }
}
```

## Event Mapping

| Domain Event | WebSocket Event | Trigger |
|-------------|-----------------|---------|
| `SESSION_CREATED` | `session:created` | POST /sessions |
| `SESSION_STARTED` | `session:started` | PATCH /sessions/:id/start |
| `SESSION_ENDED` | `session:ended` | PATCH /sessions/:id/end |
| `POLL_CREATED` | `poll:created` | POST /sessions/:id/polls |
| `POLL_ACTIVATED` | `poll:activated` | PATCH /polls/:id/activate |
| `POLL_CLOSED` | `poll:closed` | PATCH /polls/:id/close |
| `VOTE_ACCEPTED` | `vote:accepted` | POST /polls/:id/votes (success) |
| `VOTE_REJECTED` | `vote:rejected` | POST /polls/:id/votes (validation failure) |
| `RESULTS_UPDATED` | `results:updated` | After each successful vote |
| `PARTICIPANT_JOINED` | `participant:joined` | POST /sessions/:id/participants |
| `PARTICIPANT_DISCONNECTED` | `participant:disconnected` | WebSocket disconnect |

## Future Enhancements

### 1. Redis-based Event Bus (for horizontal scaling)
Replace in-process EventEmitter with Redis pub/sub to enable:
- Multiple backend instances
- Event replay with Redis sorted sets
- Durable event storage

### 2. Event Replay Cache
Store events in Redis with 24-hour TTL to support:
- Reconnection with event replay
- Client state synchronization
- Missed event recovery

### 3. Event Filtering
Add support for:
- Per-participant event filtering
- Anonymous poll privacy controls
- Presenter-only events

### 4. Event Metrics
Track:
- Event publish latency
- Broadcast delivery latency
- Failed broadcasts
- Event replay requests

## Constraints Met

✅ Domain modules MUST NOT depend on WebSocket or Realtime code  
✅ Realtime module MUST NOT contain business logic  
✅ DO NOT modify domain rules or state transitions  
✅ DO NOT introduce new events beyond those already defined  
✅ DO NOT change API contracts or database schema  
✅ Clean separation between domain logic and transport layer  
✅ Centralized event publishing mechanism  
✅ Deterministic event delivery per session  

## Files Modified

**Created**:
- `src/events/event-bus.ts` - Event bus implementation
- `src/events/index.ts` - Event module exports
- `src/test/event-wiring-test.ts` - Event logging utilities

**Modified**:
- `src/modules/session/service.ts` - Emit session events
- `src/modules/poll/service.ts` - Emit poll events
- `src/modules/vote/service.ts` - Emit vote events
- `src/modules/vote/validation.ts` - Add getPoll helper
- `src/modules/participant/service.ts` - Emit participant events
- `src/modules/realtime/broadcaster.ts` - Subscribe to domain events
- `src/verify-db.ts` - Fix TypeScript error

## Next Steps

1. ✅ Event bus infrastructure created
2. ✅ Domain modules wired to emit events
3. ✅ Realtime module subscribed to domain events
4. ✅ TypeScript compilation successful
5. ⏭️ Manual testing with REST API + WebSocket client
6. ⏭️ Integration tests for event flow
7. ⏭️ Add event replay with Redis (Task 3.25)
8. ⏭️ Add event metrics and monitoring
