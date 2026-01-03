# Feature Specification: WebSocket Event Contracts

**Feature Branch**: `010-realtime-events`  
**Created**: January 3, 2026  
**Status**: Draft  
**Input**: Define WebSocket event contracts for real-time communication in the Live Event Polling Application

## User Scenarios & Testing

### User Story 1 - Define Session Lifecycle Events (Priority: P1)

Developers need clearly defined events for session state transitions (created, started, ended) to broadcast real-time updates to all connected participants and presenters.

**Why this priority**: Session lifecycle is the foundation of the polling experience. Without these events, clients cannot react to session state changes, making real-time collaboration impossible.

**Independent Test**: Can be validated by reviewing event definitions against state-machine.md and confirming each session state transition has a corresponding event with required payload fields.

**Acceptance Scenarios**:

1. **Given** session state machine transitions exist, **When** defining events, **Then** each state transition (draft→active, active→ended) has a corresponding broadcast event
2. **Given** a session state transition event, **When** reviewing payload, **Then** all necessary fields (sessionId, timestamp, newState) are present
3. **Given** multiple clients connected to a session, **When** session state changes, **Then** all clients receive the same event simultaneously

---

### User Story 2 - Define Poll Lifecycle Events (Priority: P1)

Developers need events for poll creation, activation, and closure to notify participants when new polls appear and when voting closes.

**Why this priority**: Poll lifecycle events enable real-time poll flow. Without them, participants cannot see new polls or know when voting ends, breaking the core user experience.

**Independent Test**: Can be validated by mapping each poll state transition to an event and confirming payloads contain poll metadata (question, type, options) for client rendering.

**Acceptance Scenarios**:

1. **Given** a presenter creates a poll, **When** poll is created, **Then** event broadcasts poll details to all session participants
2. **Given** a presenter activates a poll, **When** activation occurs, **Then** event notifies participants that voting is open
3. **Given** a presenter closes a poll, **When** closure occurs, **Then** event notifies participants that voting has ended

---

### User Story 3 - Define Vote Events (Priority: P1)

Developers need events for vote submission and real-time vote count updates to show live results to presenters and participants.

**Why this priority**: Real-time vote updates are the core value proposition of live polling. Without these events, the system degrades to traditional non-live surveys.

**Independent Test**: Can be validated by confirming vote submission triggers broadcast event and vote count updates include aggregated results without exposing individual voter identities (for anonymous polls).

**Acceptance Scenarios**:

1. **Given** a participant submits a vote, **When** vote is accepted, **Then** event broadcasts updated vote counts to all session participants
2. **Given** an anonymous poll, **When** vote count event is sent, **Then** payload contains aggregated counts without individual voter information
3. **Given** a non-anonymous poll, **When** vote count event is sent, **Then** payload may include voter identities per poll settings

---

### User Story 4 - Define Participant Events (Priority: P2)

Developers need events for participant joins and disconnects to show real-time attendance to presenters.

**Why this priority**: Participant tracking helps presenters gauge engagement, but is not critical for core polling functionality.

**Independent Test**: Can be validated by confirming join/disconnect events include participant count and optional display names.

**Acceptance Scenarios**:

1. **Given** a new participant joins, **When** join occurs, **Then** event notifies presenter and updates participant count
2. **Given** a participant disconnects, **When** disconnect is detected, **Then** event updates participant count
3. **Given** participant events, **When** reviewing privacy, **Then** only necessary information (count, optional names) is included

---

### User Story 5 - Define Connection Management Events (Priority: P2)

Developers need events for connection establishment, heartbeat, and reconnection to enable reliable real-time communication with event replay.

**Why this priority**: Connection management ensures reliability and enables event replay per ADR-002, but clients can function without explicit heartbeat events.

**Independent Test**: Can be validated by confirming connection events support reconnection with lastEventId and event replay capabilities.

**Acceptance Scenarios**:

1. **Given** a client connects, **When** connection is established, **Then** client receives confirmation with assigned connection ID
2. **Given** a client reconnects, **When** reconnection includes lastEventId, **Then** server replays missed events
3. **Given** a connection loss, **When** client reconnects, **Then** state is synchronized via event replay

---

### Edge Cases

- What happens when a client reconnects during active voting? (Replay events to sync state)
- How does system handle duplicate vote events? (Server validates, only accepts one vote per participant per poll)
- What if event broadcast fails for some clients? (Clients reconnect and request event replay)
- How are events ordered for concurrent actions? (Events include timestamps and sequence numbers)
- What if a poll is closed while votes are in transit? (Server rejects late votes, sends rejection event)

## Requirements

### Functional Requirements

- **FR-001**: System MUST define events for all session state transitions (created, started, ended)
- **FR-002**: System MUST define events for all poll lifecycle actions (created, activated, closed)
- **FR-003**: System MUST define events for vote submission and vote count updates
- **FR-004**: System MUST define events for participant join and disconnect
- **FR-005**: System MUST define events for connection lifecycle (connected, disconnected, reconnected)
- **FR-006**: All events MUST include event name, direction, timestamp, and relevant entity identifiers
- **FR-007**: Server→Client events MUST include session context (sessionId or slug)
- **FR-008**: Vote count events MUST NOT expose individual voter identities for anonymous polls
- **FR-009**: Events MUST support event replay via sequence numbers or event IDs (per ADR-002)
- **FR-010**: Events MUST map to domain state transitions from state-machine.md
- **FR-011**: Event naming MUST be consistent and intention-revealing (verb-past-tense format)
- **FR-012**: Client→Server events MUST support validation failures with error responses
- **FR-013**: Events MUST include poll type information to enable type-specific client rendering
- **FR-014**: Events MUST support low-latency delivery (sub-100ms target per performance specs)
- **FR-015**: Events MUST use logical field names without framework-specific concepts

### Key Entities

**Note**: Events are ephemeral messages, not persistent entities. This section describes event categories.

- **Session Events**: Broadcast session lifecycle changes (created, started, ended) to all session participants
- **Poll Events**: Notify participants of poll creation, activation, and closure
- **Vote Events**: Deliver real-time vote submissions and aggregated vote counts
- **Participant Events**: Track participant joins and disconnects for attendance monitoring
- **Connection Events**: Manage WebSocket connection lifecycle and enable event replay

## Success Criteria

### Measurable Outcomes

- **SC-001**: Every domain state transition has a corresponding event (100% coverage)
- **SC-002**: All events include required contextual fields (sessionId, timestamp, entityId)
- **SC-003**: Event naming follows consistent convention (100% compliance with verb-past-tense format)
- **SC-004**: Anonymous poll vote events expose 0% individual voter information
- **SC-005**: Event delivery latency is under 100ms for 95% of events (per performance.md)
- **SC-006**: Reconnection with event replay restores full client state (100% state recovery)

---

## Event Catalog

### Connection Events

#### Event: `connection:established`

**Direction**: Server → Client  
**Trigger**: Client successfully connects to WebSocket  
**Purpose**: Confirm connection and provide connection identifier for reconnection

**Payload**:
- `connectionId` (string): Unique identifier for this connection
- `timestamp` (ISO 8601): Server time when connection established
- `serverVersion` (string): API version for compatibility

**Domain Mapping**: Connection lifecycle initialization

**Notes**: 
- Sent immediately upon successful connection
- Client should store connectionId for reconnection scenarios

---

#### Event: `connection:reconnected`

**Direction**: Server → Client  
**Trigger**: Client reconnects with lastEventId to request event replay  
**Purpose**: Acknowledge reconnection and begin event replay

**Payload**:
- `connectionId` (string): New connection identifier
- `timestamp` (ISO 8601): Reconnection timestamp
- `replayFrom` (string): EventId from which replay begins
- `replayCount` (integer): Number of events to replay

**Domain Mapping**: Connection lifecycle recovery

**Notes**:
- Followed immediately by replayed events
- If lastEventId is stale (>24 hours), full state sync may be required

---

#### Event: `connection:heartbeat`

**Direction**: Bidirectional (Server ↔ Client)  
**Trigger**: Periodic heartbeat timer (every 30 seconds)  
**Purpose**: Keep connection alive and detect connection failures

**Payload**:
- `timestamp` (ISO 8601): Heartbeat timestamp

**Domain Mapping**: Connection health monitoring

**Notes**:
- Enables faster disconnect detection than TCP keepalive
- Optional - clients can rely on WebSocket ping/pong instead

---

### Session Events

#### Event: `session:created`

**Direction**: Server → Client  
**Trigger**: Presenter creates a new session  
**Purpose**: Notify connected clients that session exists (primarily for session list views)

**Payload**:
- `sessionId` (UUID): Unique session identifier
- `title` (string): Session title
- `slug` (string): Session access code
- `presenterId` (UUID): Presenter who created session
- `status` (enum): Session status - `draft`
- `createdAt` (ISO 8601): Creation timestamp

**Domain Mapping**: Session state machine - entry to `draft` state

**Notes**:
- Primarily used by presenter's session management UI
- Participants don't receive this until they join

---

#### Event: `session:started`

**Direction**: Server → Client  
**Trigger**: Presenter transitions session from draft to active  
**Purpose**: Notify all participants that polling session is now live

**Payload**:
- `sessionId` (UUID): Session identifier
- `status` (enum): New status - `active`
- `startedAt` (ISO 8601): When session started
- `participantCount` (integer): Current number of participants

**Domain Mapping**: Session state machine - transition `draft` → `active`

**Broadcast Scope**: All clients in session room

**Notes**:
- Triggers UI transition from "waiting to start" to "active polling"
- Participants can now vote on active polls

---

#### Event: `session:ended`

**Direction**: Server → Client  
**Trigger**: Presenter transitions session to ended state  
**Purpose**: Notify all participants that session has concluded

**Payload**:
- `sessionId` (UUID): Session identifier
- `status` (enum): New status - `ended`
- `endedAt` (ISO 8601): When session ended
- `finalParticipantCount` (integer): Total participants at end

**Domain Mapping**: Session state machine - transition `active` → `ended`

**Broadcast Scope**: All clients in session room

**Notes**:
- Closes all open polls automatically
- Participants can still view results but cannot vote

---

### Poll Events

#### Event: `poll:created`

**Direction**: Server → Client  
**Trigger**: Presenter creates a new poll in session  
**Purpose**: Notify participants that a new poll exists (but is not yet active)

**Payload**:
- `pollId` (UUID): Unique poll identifier
- `sessionId` (UUID): Parent session identifier
- `question` (string): Poll question text
- `pollType` (enum): Type of poll - `multiple_choice`, `rating_scale`, `open_text`
- `allowMultiple` (boolean): Whether multiple selections allowed (multiple_choice only)
- `isAnonymous` (boolean): Whether votes are anonymous
- `options` (array of objects, optional): Poll options for multiple_choice type
  - `optionId` (UUID): Unique option identifier
  - `optionText` (string): Option display text
  - `sequenceOrder` (integer): Display order
- `minRating` (integer, optional): Minimum rating value (rating_scale only)
- `maxRating` (integer, optional): Maximum rating value (rating_scale only)
- `sequenceOrder` (integer): Poll order within session
- `createdAt` (ISO 8601): Creation timestamp

**Domain Mapping**: Poll creation action

**Broadcast Scope**: All clients in session room

**Notes**:
- Poll is created but not yet active for voting
- Clients should render poll UI in "not active" state

---

#### Event: `poll:activated`

**Direction**: Server → Client  
**Trigger**: Presenter sets poll as active in session  
**Purpose**: Notify participants that voting is now open for this poll

**Payload**:
- `pollId` (UUID): Activated poll identifier
- `sessionId` (UUID): Parent session identifier
- `question` (string): Poll question (for context)
- `activatedAt` (ISO 8601): Activation timestamp

**Domain Mapping**: Session state machine - `activePollId` updated

**Broadcast Scope**: All clients in session room

**Notes**:
- Only one poll can be active at a time
- Triggers UI transition to voting interface
- Previous active poll (if any) is implicitly deactivated

---

#### Event: `poll:closed`

**Direction**: Server → Client  
**Trigger**: Presenter closes an open poll  
**Purpose**: Notify participants that voting has ended for this poll

**Payload**:
- `pollId` (UUID): Closed poll identifier
- `sessionId` (UUID): Parent session identifier
- `closedAt` (ISO 8601): Closure timestamp
- `finalVoteCount` (integer): Total votes received

**Domain Mapping**: Poll state transition - open → closed

**Broadcast Scope**: All clients in session room

**Notes**:
- Participants can no longer vote on this poll
- Results remain visible
- Server rejects any late votes with error event

---

### Vote Events

#### Event: `vote:submitted`

**Direction**: Client → Server  
**Trigger**: Participant submits a vote  
**Purpose**: Send vote data to server for validation and persistence

**Payload**:
- `pollId` (UUID): Poll being voted on
- `participantId` (UUID): Participant submitting vote
- `voteData` (object): Vote details (type-specific)
  - For `multiple_choice`: `selectedOptionIds` (array of UUIDs)
  - For `rating_scale`: `ratingValue` (integer)
  - For `open_text`: `textResponse` (string)
- `submittedAt` (ISO 8601): Client timestamp (server uses server time for record)

**Domain Mapping**: Vote submission action

**Notes**:
- Server validates poll is open and participant hasn't voted yet
- On success, triggers `vote:accepted` event
- On failure, triggers `vote:rejected` event

---

#### Event: `vote:accepted`

**Direction**: Server → Client  
**Trigger**: Server successfully validates and persists vote  
**Purpose**: Confirm vote acceptance to submitter and broadcast updated counts

**Payload**:
- `voteId` (UUID): Unique vote identifier
- `pollId` (UUID): Poll voted on
- `participantId` (UUID): Participant who voted (only sent to submitter for confirmation)
- `submittedAt` (ISO 8601): Server timestamp
- `currentVoteCount` (integer): Total votes for this poll
- `voteBreakdown` (object, optional): Aggregated vote counts by option (for multiple_choice)
  - Array of: `optionId` (UUID), `voteCount` (integer), `percentage` (float)
- `averageRating` (float, optional): Average rating (for rating_scale polls)
- `ratingDistribution` (object, optional): Count by rating value (for rating_scale)

**Domain Mapping**: Vote state transition - submitted → accepted

**Broadcast Scope**: 
- Confirmation (with participantId) sent to submitter only
- Vote counts broadcast to all clients in session room

**Notes**:
- Aggregated counts preserve anonymity
- Individual voter identities never included in broadcast (even for non-anonymous polls)
- Non-anonymous polls can expose voter identities via separate API, not events

---

#### Event: `vote:rejected`

**Direction**: Server → Client  
**Trigger**: Server rejects vote due to validation failure  
**Purpose**: Inform submitter that vote was not accepted with reason

**Payload**:
- `pollId` (UUID): Poll that was voted on
- `participantId` (UUID): Participant who submitted
- `reason` (enum): Rejection reason - `poll_closed`, `duplicate_vote`, `poll_not_active`, `invalid_option`, `invalid_rating`
- `message` (string): Human-readable error message
- `timestamp` (ISO 8601): Rejection timestamp

**Domain Mapping**: Vote validation failure

**Broadcast Scope**: Submitter only (unicast)

**Notes**:
- Enables client to show error feedback
- Does not trigger vote count update
- Client should not retry automatically for `duplicate_vote` or `poll_closed`

---

### Participant Events

#### Event: `participant:joined`

**Direction**: Server → Client  
**Trigger**: New participant successfully joins session  
**Purpose**: Notify presenter and other participants of new attendee

**Payload**:
- `participantId` (UUID): New participant identifier
- `sessionId` (UUID): Session joined
- `displayName` (string, optional): Participant display name (if provided)
- `joinedAt` (ISO 8601): Join timestamp
- `participantCount` (integer): Updated total participant count

**Domain Mapping**: Participant join action

**Broadcast Scope**: All clients in session room

**Notes**:
- Display name is optional (anonymous participation allowed)
- Primarily used by presenter UI to show attendance
- Participants may see join notifications depending on UI design

---

#### Event: `participant:disconnected`

**Direction**: Server → Client  
**Trigger**: Participant WebSocket connection closes  
**Purpose**: Update participant count and notify presenter

**Payload**:
- `participantId` (UUID): Disconnected participant identifier
- `sessionId` (UUID): Session they were in
- `disconnectedAt` (ISO 8601): Disconnection timestamp
- `participantCount` (integer): Updated participant count

**Domain Mapping**: Participant disconnect action

**Broadcast Scope**: All clients in session room

**Notes**:
- Does not delete participant record (votes remain)
- Participant can reconnect with same participantId
- Optional event - may be omitted if attendance tracking not critical

---

### Error Events

#### Event: `error:general`

**Direction**: Server → Client  
**Trigger**: Server encounters error processing client request  
**Purpose**: Notify client of error with context for debugging

**Payload**:
- `errorCode` (string): Machine-readable error code
- `message` (string): Human-readable error message
- `timestamp` (ISO 8601): Error timestamp
- `requestContext` (object, optional): Context about failed request
  - `eventName` (string): Original event that failed
  - `entityId` (string): Entity involved in error

**Domain Mapping**: Error handling

**Broadcast Scope**: Affected client only (unicast)

**Notes**:
- Used for unexpected errors not covered by specific rejection events
- Client should log error and show user-friendly message

---

## Event Direction Summary

**Client → Server** (Commands):
1. `vote:submitted` - Participant submits vote
2. `connection:heartbeat` - Client heartbeat ping

**Server → Client** (Broadcasts/Notifications):
1. `connection:established` - Connection confirmation
2. `connection:reconnected` - Reconnection with replay
3. `connection:heartbeat` - Server heartbeat ping
4. `session:created` - Session created
5. `session:started` - Session started
6. `session:ended` - Session ended
7. `poll:created` - Poll created
8. `poll:activated` - Poll activated for voting
9. `poll:closed` - Poll closed
10. `vote:accepted` - Vote accepted and counts updated
11. `vote:rejected` - Vote rejected (unicast to submitter)
12. `participant:joined` - Participant joined session
13. `participant:disconnected` - Participant disconnected
14. `error:general` - General error (unicast to affected client)

**Total Events**: 14 events (2 client→server, 12 server→client)

---

## Event Flow Scenarios

### Scenario 1: Participant Joins and Votes

1. **Client**: Connects to WebSocket
2. **Server**: Sends `connection:established` with connectionId
3. **Client**: Joins session via REST API (not WebSocket event)
4. **Server**: Broadcasts `participant:joined` to all session clients
5. **Server**: Sends current session state (active poll, current votes) via REST API or event replay
6. **Client**: Displays active poll
7. **Client**: Sends `vote:submitted`
8. **Server**: Validates vote, persists to database
9. **Server**: Broadcasts `vote:accepted` with updated counts to all session clients
10. **All Clients**: Update UI with new vote counts

### Scenario 2: Presenter Starts Session and Activates Poll

1. **Presenter**: Creates session via REST API
2. **Server**: Broadcasts `session:created` (only if presenter UI is watching)
3. **Presenter**: Creates poll via REST API
4. **Server**: Broadcasts `poll:created` to all session clients
5. **Presenter**: Starts session via REST API
6. **Server**: Broadcasts `session:started` to all session clients
7. **Participant Clients**: Transition UI from "waiting" to "active"
8. **Presenter**: Activates poll via REST API
9. **Server**: Broadcasts `poll:activated` to all session clients
10. **Participant Clients**: Show voting interface

### Scenario 3: Client Reconnects After Disconnect

1. **Client**: Connection drops (network issue)
2. **Server**: Detects disconnect, broadcasts `participant:disconnected`
3. **Client**: Reconnects with `lastEventId` from last received event
4. **Server**: Sends `connection:reconnected` with replay count
5. **Server**: Replays missed events in order (session:ended, poll:closed, vote:accepted, etc.)
6. **Client**: Processes replayed events to sync state
7. **Client**: Resumes normal operation

---

## Event Naming Convention

**Format**: `{entity}:{action}`

**Entity Categories**:
- `connection` - WebSocket connection lifecycle
- `session` - Session lifecycle
- `poll` - Poll lifecycle
- `vote` - Vote submission and counts
- `participant` - Participant attendance
- `error` - Error conditions

**Action Naming**:
- Use past tense for completed actions: `created`, `started`, `ended`, `submitted`, `accepted`, `rejected`
- Use present tense for states: `established`, `reconnected`
- Use descriptive verbs: `joined`, `disconnected`, `activated`, `closed`

**Consistency Rules**:
- All lowercase
- Colon separator between entity and action
- No abbreviations
- Intention-revealing names

---

## Event Replay and Ordering

### Event Sequencing

All events include implicit sequence information for replay:
- `timestamp` (ISO 8601): Logical clock for ordering
- `eventId` (optional): Unique event identifier for replay

### Replay Mechanism

Per ADR-002, events are stored in Redis for 24-hour replay window:

1. Client includes `lastEventId` on reconnection
2. Server retrieves events since `lastEventId` from Redis
3. Server replays events in original order
4. If `lastEventId` is older than 24 hours, full state sync required

### Event Ordering Guarantees

- Events for same entity (e.g., same poll) are ordered
- Events for different entities may arrive out of order
- Clients should handle out-of-order events gracefully
- Timestamps provide logical ordering for UI rendering

---

## Privacy and Security Considerations

### Anonymous Polls

**Vote Events**:
- MUST NOT include individual `participantId` in broadcast
- MUST include only aggregated counts and percentages
- Vote confirmation sent to submitter only (unicast)

**Non-Anonymous Polls**:
- Vote events still use aggregated counts
- Individual voter identities available via REST API, not events
- Prevents accidental exposure via WebSocket broadcasts

### Data Minimization

Events include only necessary fields:
- No sensitive data (passwords, tokens, personal details)
- Participant display names are optional
- Connection IDs are opaque identifiers

### Validation

All Client→Server events validated:
- Authentication via connection context (session token)
- Authorization checked (participant belongs to session)
- Domain rules enforced (poll is open, no duplicate votes)
- Rejection events provide feedback without exposing security details

---

## Out of Scope

This specification intentionally does NOT include:

- **Implementation Code**: No Socket.io, WebSocket API, or JavaScript code
- **Message Serialization**: No JSON schema, Protocol Buffers, or encoding details
- **Transport Layer**: No WebSocket vs SSE vs long-polling decisions
- **Framework Concepts**: No rooms, namespaces, middleware, acknowledgments (Socket.io specific)
- **Authentication Mechanisms**: No JWT, session tokens, or auth flow (separate spec)
- **Redis Implementation**: No event storage, pub/sub, or cache details
- **Scaling Infrastructure**: No load balancing, sticky sessions, or horizontal scaling
- **Error Recovery**: No retry logic, exponential backoff, or circuit breakers
- **Rate Limiting**: No throttling or abuse prevention
- **Testing Strategy**: No integration tests or event mocks

---

## Assumptions

- WebSocket transport will be used (per ADR-002)
- Events will be JSON-serialized (default for WebSocket communication)
- Connection authentication will be handled outside event contracts (session tokens, JWTs)
- Event replay will be available for 24-hour window (per ADR-002)
- Clients will maintain local state and update based on events
- Server will broadcast to all session participants unless specified (unicast)
- Timestamps will be in UTC timezone (ISO 8601 format)
- Event delivery is at-least-once (clients must handle duplicate events)
- Clients are responsible for deduplication using eventId or timestamp

---

## Validation Against Requirements

✅ **Domain State Mapping**: All session and poll state transitions from state-machine.md have corresponding events

✅ **No State Mutation Without Validation**: Client→Server events (vote:submitted) are validated before triggering broadcast events

✅ **Consistent Naming**: All events follow `{entity}:{action}` convention with past-tense verbs

✅ **Low-Latency Support**: Event contracts are minimal payloads optimized for sub-100ms delivery per performance.md

✅ **Event Replay**: Connection events support reconnection with lastEventId for event replay per ADR-002

✅ **Privacy**: Anonymous poll vote events do not expose individual voter identities

✅ **Module Alignment**: Events map to domain modules (Session, Poll, Vote, Participant, Real-Time)

---

## Next Steps

After this specification is approved:

1. **Implementation Phase**: Convert event contracts to Socket.io event handlers
2. **Testing Phase**: Create integration tests for each event flow
3. **Documentation Phase**: Generate API documentation for client developers
4. **Client SDK Phase**: Create TypeScript/JavaScript event typing
5. **Monitoring Phase**: Add event tracking and latency metrics

**Note**: This specification focuses on WHAT events exist and THEIR payloads. The implementation phase will define HOW to emit and handle events using Socket.io.
