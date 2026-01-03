# Real-Time Event Contracts

**Created**: January 3, 2026  
**Status**: Draft  
**Feature**: 004-api-contracts

## Purpose

This specification defines the real-time event stream contracts for the Live Event Polling Application. All domain events are pushed to connected clients via persistent connections (WebSocket or Server-Sent Events) to enable the "Real-Time First" constitution principle.

Clients subscribe to event streams and receive JSON-formatted event messages as domain state changes occur. This eliminates the need for polling and ensures all actors observe state changes within 100ms.

**References**:
- [Session Domain Spec](../../001-domain-specs/domain/session.md)
- [Poll Domain Spec](../../001-domain-specs/domain/poll.md)
- [Vote Domain Spec](../../001-domain-specs/domain/vote.md)
- [Participant Domain Spec](../../001-domain-specs/domain/participant.md)
- [State Machine Spec](../../002-state-transitions/domain/state-machine.md)
- [Display Flow](../../003-user-flows/flows/display-flow.md)

---

## Event Stream Connection

### Endpoint

**WebSocket**: `ws://host/events` or `wss://host/events` (secure)

**Server-Sent Events**: `GET /events` with `Accept: text/event-stream`

### Connection Parameters

**Query Parameters**:
- `sessionId` (required): UUID of session to subscribe to
- `actorType` (required): One of `presenter`, `attendee`, `display`
- `actorId` (optional): UUID of presenter or participant for authorization

**Example WebSocket Connection**:
```javascript
ws://example.com/events?sessionId=123e4567-e89b-12d3-a456-426614174000&actorType=attendee&actorId=987f6543-e21a-11eb-b456-426614174000
```

**Example SSE Connection**:
```http
GET /events?sessionId=123e4567-e89b-12d3-a456-426614174000&actorType=display HTTP/1.1
Accept: text/event-stream
```

### Authentication

- Presenter: Must provide valid presenter/owner credentials for session
- Attendee: Must provide participant ID obtained from JoinSession command
- Display: No authentication required (read-only public observer)

### Scoping

Clients receive events only for the session specified in `sessionId` query parameter. Events from other sessions are not delivered.

---

## Event Message Format

All events follow this JSON structure:

```json
{
  "eventId": "string (UUID, unique for idempotency and replay)",
  "eventType": "string (domain event name)",
  "timestamp": "ISO8601 timestamp",
  "sessionId": "string (UUID)",
  "payload": {
    // Event-specific data
  }
}
```

### Event Ordering

- Events are delivered in causal order: if event A caused event B, clients receive A before B
- Events within same session maintain strict ordering
- Events across different sessions have no ordering guarantees

### Event Replay

Clients can request event replay from a specific event ID using query parameter:

```
ws://host/events?sessionId=...&actorType=...&fromEventId=abc123
```

System replays all events after `fromEventId` before delivering new real-time events.

---

## Session Events

### SessionCreated

Emitted when presenter creates a new session.

**Domain Event**: `SessionCreated` (from CreateSession command)

**When It Occurs**: Session transitions from [Initial] → Preparing

**Who Receives**: Presenter only (session not yet joinable)

**Payload**:
```json
{
  "eventId": "uuid",
  "eventType": "SessionCreated",
  "timestamp": "2026-01-03T10:00:00Z",
  "sessionId": "uuid",
  "payload": {
    "sessionId": "uuid",
    "state": "Preparing",
    "accessCode": "string (6-digit)",
    "title": "string or null",
    "description": "string or null",
    "createdAt": "ISO8601 timestamp"
  }
}
```

**Client Action**: Display session details to presenter, show access code to share

---

### SessionStarted

Emitted when presenter starts session, enabling participant joins.

**Domain Event**: `SessionStarted` (from StartSession command)

**When It Occurs**: Session transitions from Preparing → Active

**Who Receives**: Presenter, any pre-connected displays

**Payload**:
```json
{
  "eventId": "uuid",
  "eventType": "SessionStarted",
  "timestamp": "2026-01-03T10:05:00Z",
  "sessionId": "uuid",
  "payload": {
    "sessionId": "uuid",
    "state": "Active",
    "startedAt": "ISO8601 timestamp"
  }
}
```

**Client Action**: Update session status to Active, enable participant join UI

---

### SessionPaused

Emitted when presenter pauses session, temporarily stopping all interactions.

**Domain Event**: `SessionPaused` (from PauseSession command)

**When It Occurs**: Session transitions from Active → Paused

**Who Receives**: Presenter, all connected attendees, all connected displays

**Payload**:
```json
{
  "eventId": "uuid",
  "eventType": "SessionPaused",
  "timestamp": "2026-01-03T10:30:00Z",
  "sessionId": "uuid",
  "payload": {
    "sessionId": "uuid",
    "state": "Paused",
    "pausedAt": "ISO8601 timestamp"
  }
}
```

**Client Action**: Disable vote submission UI, show "Session Paused" message to attendees and displays

**Side Effects**: All active polls stop accepting votes (no separate event per poll)

---

### SessionResumed

Emitted when presenter resumes paused session.

**Domain Event**: `SessionResumed` (from ResumeSession command)

**When It Occurs**: Session transitions from Paused → Active

**Who Receives**: Presenter, all connected attendees, all connected displays

**Payload**:
```json
{
  "eventId": "uuid",
  "eventType": "SessionResumed",
  "timestamp": "2026-01-03T10:35:00Z",
  "sessionId": "uuid",
  "payload": {
    "sessionId": "uuid",
    "state": "Active",
    "resumedAt": "ISO8601 timestamp"
  }
}
```

**Client Action**: Re-enable vote submission UI if poll is active, remove "Session Paused" message

**Side Effects**: Previously active polls resume accepting votes (no separate event per poll)

---

### SessionEnded

Emitted when presenter ends session, permanently concluding all activity.

**Domain Event**: `SessionEnded` (from EndSession command)

**When It Occurs**: Session transitions from Active/Paused → Ended

**Who Receives**: Presenter, all connected attendees, all connected displays

**Payload**:
```json
{
  "eventId": "uuid",
  "eventType": "SessionEnded",
  "timestamp": "2026-01-03T11:00:00Z",
  "sessionId": "uuid",
  "payload": {
    "sessionId": "uuid",
    "state": "Ended",
    "endedAt": "ISO8601 timestamp",
    "pollCount": "integer",
    "participantCount": "integer",
    "totalVotes": "integer"
  }
}
```

**Client Action**: Disable all interaction UI, show session summary, transition to results-only view

**Side Effects**: All active polls automatically close, all participants transition to Left (separate events for each)

---

## Poll Events

### PollCreated

Emitted when presenter creates a poll in draft state.

**Domain Event**: `PollCreated` (from CreatePoll command)

**When It Occurs**: Poll transitions from [Initial] → Draft

**Who Receives**: Presenter only (draft polls not visible to attendees/displays)

**Payload**:
```json
{
  "eventId": "uuid",
  "eventType": "PollCreated",
  "timestamp": "2026-01-03T10:10:00Z",
  "sessionId": "uuid",
  "payload": {
    "pollId": "uuid",
    "sessionId": "uuid",
    "state": "Draft",
    "question": "string",
    "options": [
      {
        "optionId": "uuid",
        "text": "string",
        "order": "integer"
      }
    ],
    "createdAt": "ISO8601 timestamp"
  }
}
```

**Client Action**: Add poll to presenter's draft list for editing/activation

---

### PollDraftUpdated

Emitted when presenter modifies draft poll content.

**Domain Event**: `PollDraftUpdated` (from UpdatePollDraft command)

**When It Occurs**: Poll content changes while in Draft state

**Who Receives**: Presenter only

**Payload**:
```json
{
  "eventId": "uuid",
  "eventType": "PollDraftUpdated",
  "timestamp": "2026-01-03T10:12:00Z",
  "sessionId": "uuid",
  "payload": {
    "pollId": "uuid",
    "state": "Draft",
    "question": "string (updated)",
    "options": [
      {
        "optionId": "uuid",
        "text": "string",
        "order": "integer"
      }
    ],
    "updatedAt": "ISO8601 timestamp"
  }
}
```

**Client Action**: Update poll content in presenter's draft list

---

### PollActivated

Emitted when presenter activates poll, making it visible and votable.

**Domain Event**: `PollActivated` (from ActivatePoll command)

**When It Occurs**: Poll transitions from Draft → Active

**Who Receives**: Presenter, all connected attendees, all connected displays

**Payload**:
```json
{
  "eventId": "uuid",
  "eventType": "PollActivated",
  "timestamp": "2026-01-03T10:15:00Z",
  "sessionId": "uuid",
  "payload": {
    "pollId": "uuid",
    "sessionId": "uuid",
    "state": "Active",
    "question": "string",
    "options": [
      {
        "optionId": "uuid",
        "text": "string",
        "voteCount": 0
      }
    ],
    "totalVotes": 0,
    "activatedAt": "ISO8601 timestamp"
  }
}
```

**Client Action**: 
- Attendees: Display poll question and voting UI
- Displays: Show poll question, options, and vote counts (initially zero)
- Presenter: Update poll status to Active, show real-time vote counts

---

### PollClosed

Emitted when presenter closes poll, stopping vote acceptance and finalizing results.

**Domain Event**: `PollClosed` (from ClosePoll command)

**When It Occurs**: Poll transitions from Active → Closed

**Who Receives**: Presenter, all connected attendees, all connected displays

**Payload**:
```json
{
  "eventId": "uuid",
  "eventType": "PollClosed",
  "timestamp": "2026-01-03T10:20:00Z",
  "sessionId": "uuid",
  "payload": {
    "pollId": "uuid",
    "sessionId": "uuid",
    "state": "Closed",
    "question": "string",
    "options": [
      {
        "optionId": "uuid",
        "text": "string",
        "voteCount": "integer (final count)"
      }
    ],
    "totalVotes": "integer (final count)",
    "closedAt": "ISO8601 timestamp"
  }
}
```

**Client Action**:
- Attendees: Disable voting UI, show final results
- Displays: Highlight final vote counts
- Presenter: Mark poll as complete, show final analytics

---

## Vote Events

### VoteAccepted

Emitted when participant's vote is validated and accepted.

**Domain Event**: `VoteAccepted` (from SubmitVote command)

**When It Occurs**: Vote transitions from Pending → Accepted

**Who Receives**: Presenter, all connected attendees, all connected displays

**Payload**:
```json
{
  "eventId": "uuid",
  "eventType": "VoteAccepted",
  "timestamp": "2026-01-03T10:16:30Z",
  "sessionId": "uuid",
  "payload": {
    "voteId": "uuid",
    "pollId": "uuid",
    "selectedOptionId": "uuid",
    "updatedVoteCounts": [
      {
        "optionId": "uuid",
        "voteCount": "integer (new count)"
      }
    ],
    "totalVotes": "integer (new total)"
  }
}
```

**Note**: Participant ID is NOT included to preserve anonymity

**Client Action**:
- All clients: Update vote counts for affected option and total
- Attendee who voted: Show confirmation "Your vote has been recorded"
- Display: Animate vote count increment

---

### VoteRejected

Emitted when participant's vote fails validation.

**Domain Event**: `VoteRejected` (from SubmitVote validation failure)

**When It Occurs**: Vote validation fails (duplicate, invalid option, poll not active, etc.)

**Who Receives**: Only the specific attendee who submitted the vote (not broadcast)

**Payload**:
```json
{
  "eventId": "uuid",
  "eventType": "VoteRejected",
  "timestamp": "2026-01-03T10:16:30Z",
  "sessionId": "uuid",
  "payload": {
    "voteId": "uuid",
    "pollId": "uuid",
    "participantId": "uuid",
    "rejectionReason": "DUPLICATE_VOTE|INVALID_OPTION|POLL_NOT_ACTIVE|SESSION_NOT_ACTIVE",
    "rejectionMessage": "string (human-readable explanation)"
  }
}
```

**Client Action**: Show error message to attendee, do not update vote counts

**Privacy Note**: Rejection events are scoped to individual participant to avoid leaking voting patterns

---

## Participant Events

### ParticipantJoined

Emitted when attendee successfully joins session.

**Domain Event**: `ParticipantJoined` (from JoinSession command)

**When It Occurs**: Participant transitions from [Initial] → Joining → Connected

**Who Receives**: Presenter, all connected displays (NOT other attendees for privacy)

**Payload**:
```json
{
  "eventId": "uuid",
  "eventType": "ParticipantJoined",
  "timestamp": "2026-01-03T10:08:00Z",
  "sessionId": "uuid",
  "payload": {
    "participantId": "uuid (anonymous)",
    "sessionId": "uuid",
    "connectionState": "Connected",
    "joinedAt": "ISO8601 timestamp",
    "participantCount": "integer (new count)"
  }
}
```

**Client Action**:
- Presenter: Increment participant count display
- Display: Update participant count
- Joining attendee: Receive via REST response, not event stream

---

### ParticipantReconnected

Emitted when attendee reconnects after temporary disconnection.

**Domain Event**: `ParticipantReconnected` (from ReconnectToSession command)

**When It Occurs**: Participant transitions from Disconnected → Connected

**Who Receives**: Presenter only (informational, not shown to displays/attendees)

**Payload**:
```json
{
  "eventId": "uuid",
  "eventType": "ParticipantReconnected",
  "timestamp": "2026-01-03T10:25:00Z",
  "sessionId": "uuid",
  "payload": {
    "participantId": "uuid",
    "sessionId": "uuid",
    "connectionState": "Connected",
    "reconnectedAt": "ISO8601 timestamp"
  }
}
```

**Client Action**: Update presenter's participant status tracking

---

### ParticipantDisconnected

Emitted when participant's connection drops unexpectedly.

**Domain Event**: `ParticipantDisconnected` (from connection timeout/error)

**When It Occurs**: Participant transitions from Connected → Disconnected

**Who Receives**: Presenter only (informational)

**Payload**:
```json
{
  "eventId": "uuid",
  "eventType": "ParticipantDisconnected",
  "timestamp": "2026-01-03T10:22:00Z",
  "sessionId": "uuid",
  "payload": {
    "participantId": "uuid",
    "sessionId": "uuid",
    "connectionState": "Disconnected",
    "disconnectedAt": "ISO8601 timestamp",
    "reason": "CONNECTION_TIMEOUT|NETWORK_ERROR"
  }
}
```

**Client Action**: Update presenter's participant connection status

**Note**: Participant count NOT decremented - disconnected participants can reconnect

---

### ParticipantLeft

Emitted when participant explicitly leaves session or session ends.

**Domain Event**: `ParticipantLeft` (from LeaveSession command or session cascade)

**When It Occurs**: Participant transitions from Connected/Disconnected → Left

**Who Receives**: Presenter, all connected displays (NOT other attendees)

**Payload**:
```json
{
  "eventId": "uuid",
  "eventType": "ParticipantLeft",
  "timestamp": "2026-01-03T10:45:00Z",
  "sessionId": "uuid",
  "payload": {
    "participantId": "uuid",
    "sessionId": "uuid",
    "connectionState": "Left",
    "leftAt": "ISO8601 timestamp",
    "participantCount": "integer (new count)"
  }
}
```

**Client Action**: Decrement participant count, remove from active participant list

---

## Event Cascade Scenarios

### Scenario: Session Paused

When presenter pauses session, clients receive this event sequence:

1. **SessionPaused** - Session state changes
2. *No additional poll events* - Polls implicitly stop accepting votes via session state

Clients infer that active polls cannot accept votes when session is Paused.

---

### Scenario: Session Ended

When presenter ends session, clients receive this event sequence:

1. **SessionEnded** - Session state changes
2. **PollClosed** - For each active poll (if any)
3. **ParticipantLeft** - For each connected participant

All events delivered within 100ms window to maintain causal consistency.

---

### Scenario: Poll Activated

When presenter activates poll, clients receive:

1. **PollActivated** - Poll becomes visible and votable
2. **VoteAccepted** - As participants submit votes (streaming continuously)

No additional "poll opened" or "voting started" events - activation is sufficient.

---

## Event Stream Error Handling

### Connection Failures

**Client Behavior**: Automatically attempt reconnection with exponential backoff (1s, 2s, 4s, 8s, max 30s)

**Server Behavior**: Accept reconnection and replay events from `fromEventId` if provided

### Missed Events

**Client Detection**: Track last received `eventId`, detect gaps in sequence

**Client Recovery**: Reconnect with `fromEventId` query parameter to replay missed events

**Server Guarantee**: Events buffered for 24 hours for replay purposes

### Duplicate Events

**Client Protection**: Use `eventId` for deduplication - ignore events with already-processed IDs

**Server Guarantee**: Same `eventId` never reused, guaranteed unique per event occurrence

---

## Event Delivery Guarantees

### At-Least-Once Delivery

- System guarantees every event delivered to connected clients
- Reconnecting clients receive replayed events to fill gaps
- Clients must deduplicate using `eventId`

### Ordering Guarantee

- Events within same session delivered in causal order
- State transitions observable in correct sequence
- Example: PollActivated always before VoteAccepted for that poll

### Latency Guarantee

- Events delivered within 100ms of occurrence (95th percentile)
- Measured from command execution completion to client receipt
- Excludes network latency beyond server control

---

## Actor-Specific Event Filtering

### Presenter

Receives all events for owned sessions:
- All session lifecycle events
- All poll events (including draft changes)
- All participant connection events
- All vote events

### Attendee

Receives events relevant to participation:
- Session lifecycle events (Started, Paused, Resumed, Ended)
- Poll events (Activated, Closed) - excludes draft operations
- Vote events (Accepted) - excludes individual rejection details
- Own rejection events (VoteRejected) - scoped to self only

### Display

Receives events for public observation:
- Session lifecycle events (Started, Paused, Resumed, Ended)
- Poll events (Activated, Closed)
- Vote events (Accepted) for real-time count updates
- Participant join/leave events (aggregate counts)

**Privacy Principle**: Displays never receive individual participant identifiers beyond counts

---

## Event Mapping Summary

| Domain Event | REST Command Trigger | Event Recipients | Purpose |
|--------------|---------------------|------------------|---------|
| SessionCreated | CreateSession | Presenter | Notify session initialized |
| SessionStarted | StartSession | Presenter, Displays | Enable joins and polls |
| SessionPaused | PauseSession | All actors | Suspend voting |
| SessionResumed | ResumeSession | All actors | Resume voting |
| SessionEnded | EndSession | All actors | Conclude session |
| PollCreated | CreatePoll | Presenter | Poll drafted |
| PollDraftUpdated | UpdatePollDraft | Presenter | Draft edited |
| PollActivated | ActivatePoll | All actors | Begin voting |
| PollClosed | ClosePoll | All actors | End voting, show results |
| VoteAccepted | SubmitVote (valid) | All actors | Update counts |
| VoteRejected | SubmitVote (invalid) | Submitter only | Notify failure |
| ParticipantJoined | JoinSession | Presenter, Displays | Update count |
| ParticipantReconnected | ReconnectToSession | Presenter | Connection restored |
| ParticipantDisconnected | Connection timeout | Presenter | Connection lost |
| ParticipantLeft | LeaveSession | Presenter, Displays | Update count |

All events maintain strict 1:1 mapping to domain events defined in domain specifications.
