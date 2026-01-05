# API Contracts - Navigation and Overview

**Feature**: 004-api-contracts  
**Branch**: `004-api-contracts`  
**Created**: January 3, 2026

## Quick Links

- **[REST Command Contracts](api/rest.md)** - Synchronous HTTP endpoints for domain commands
- **[Real-Time Event Contracts](api/realtime.md)** - WebSocket/SSE event stream for state changes
- **[Validation Report](validation-report.md)** - Verification against domain specs and state machine
- **[Feature Specification](spec.md)** - User stories, requirements, and success criteria

## What's Included

This specification defines the external contracts (API) for the Live Event Polling Application:

### REST Command Contracts
- **13 command endpoints** mapping 1:1 to domain commands
- **3 query endpoints** for read-only state retrieval
- Preconditions, success responses, failure scenarios for each endpoint
- State machine validation enforcement
- Domain event emission on success
- Actor authority enforcement (Presenter vs Participant)

### Real-Time Event Contracts
- **15 event types** mapping 1:1 to domain events
- WebSocket and Server-Sent Events (SSE) support
- Event payload schemas for each event type
- Actor-specific event filtering (Presenter, Attendee, Display)
- Reconnection and event replay mechanisms
- Causal ordering guarantees

---

## Contract Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Clients                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│  │Presenter │    │ Attendee │    │ Display  │              │
│  │   App    │    │   App    │    │   App    │              │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘              │
└───────┼───────────────┼───────────────┼─────────────────────┘
        │               │               │
        │   REST API    │               │   Event Stream
        │  (Commands)   │               │   (WebSocket/SSE)
        ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway                             │
│  ┌───────────────────────┐  ┌──────────────────────────┐   │
│  │   REST Endpoints      │  │   Event Stream Endpoint  │   │
│  │  - Session commands   │  │  - Connection mgmt       │   │
│  │  - Poll commands      │  │  - Event broadcast       │   │
│  │  - Vote commands      │  │  - Event replay          │   │
│  │  - Query endpoints    │  │  - Actor filtering       │   │
│  └───────────────────────┘  └──────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   Domain Layer                               │
│  - State machine enforcement                                 │
│  - Command execution                                         │
│  - Domain event emission                                     │
│  - Invariant validation                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Command-Event Flow

Example: Participant submits vote

```
1. Attendee App → POST /polls/{id}/votes (REST)
   Request: { participantId, selectedOptionId }

2. API validates preconditions:
   ✓ Poll in Active state
   ✓ Session in Active state
   ✓ Participant joined and connected
   ✓ No duplicate vote
   ✓ Valid option selected

3. Domain executes SubmitVote command
   - Vote transitions: [Initial] → Pending → Accepted
   - Emits VoteAccepted domain event

4. API returns 202 Accepted
   Response: { voteId, pollId, status: "Accepted" }

5. Event stream broadcasts VoteAccepted (< 100ms)
   To: All connected clients (Presenter, Attendees, Displays)
   Payload: { voteId, pollId, selectedOptionId, updatedVoteCounts }

6. Clients update UI with new vote count
```

---

## REST Endpoints Summary

### Session Commands

| Endpoint | Method | Domain Command | Actor |
|----------|--------|---------------|-------|
| `/sessions` | POST | CreateSession | Presenter |
| `/sessions/{id}/start` | POST | StartSession | Presenter |
| `/sessions/{id}/pause` | POST | PauseSession | Presenter |
| `/sessions/{id}/resume` | POST | ResumeSession | Presenter |
| `/sessions/{id}/end` | POST | EndSession | Presenter |
| `/sessions/{id}/join` | POST | JoinSession | Participant |
| `/sessions/{id}/reconnect` | POST | ReconnectToSession | Participant |
| `/sessions/{id}/leave` | POST | LeaveSession | Participant |

### Poll Commands

| Endpoint | Method | Domain Command | Actor |
|----------|--------|---------------|-------|
| `/sessions/{id}/polls` | POST | CreatePoll | Presenter |
| `/polls/{id}` | PATCH | UpdatePollDraft | Presenter |
| `/polls/{id}/activate` | POST | ActivatePoll | Presenter |
| `/polls/{id}/close` | POST | ClosePoll | Presenter |

### Vote Commands

| Endpoint | Method | Domain Command | Actor |
|----------|--------|---------------|-------|
| `/polls/{id}/votes` | POST | SubmitVote | Participant |

### Query Endpoints (Read-Only)

| Endpoint | Method | Purpose | Actor |
|----------|--------|---------|-------|
| `/sessions/{id}` | GET | Retrieve session state | All |
| `/sessions/{id}/polls` | GET | List all polls | All (filtered by role) |
| `/sessions/{id}/polls/active` | GET | Get active poll | All |

---

## Event Types Summary

### Session Events

- **SessionCreated** - Session initialized (Presenter only)
- **SessionStarted** - Session goes live (All)
- **SessionPaused** - Session temporarily suspended (All)
- **SessionResumed** - Session resumed from pause (All)
- **SessionEnded** - Session permanently concluded (All)

### Poll Events

- **PollCreated** - Poll drafted (Presenter only)
- **PollDraftUpdated** - Draft poll edited (Presenter only)
- **PollActivated** - Poll becomes votable (All)
- **PollClosed** - Poll stops accepting votes (All)

### Vote Events

- **VoteAccepted** - Vote validated and counted (All, anonymous)
- **VoteRejected** - Vote validation failed (Submitter only)

### Participant Events

- **ParticipantJoined** - Attendee joins session (Presenter, Displays)
- **ParticipantReconnected** - Attendee reconnects (Presenter only)
- **ParticipantDisconnected** - Connection lost (Presenter only)
- **ParticipantLeft** - Attendee leaves session (Presenter, Displays)

---

## Actor Capabilities Matrix

| Capability | Presenter | Attendee | Display |
|------------|-----------|----------|---------|
| **REST Commands** |
| Session lifecycle | ✅ Full control | ❌ None | ❌ None |
| Poll creation/management | ✅ Full control | ❌ None | ❌ None |
| Join session | ❌ N/A | ✅ Yes | ❌ N/A |
| Submit votes | ❌ N/A | ✅ Yes | ❌ None |
| **Event Stream** |
| Session events | ✅ All | ✅ All | ✅ All |
| Poll events | ✅ All (incl. draft) | ✅ Active/Closed only | ✅ Active/Closed only |
| Vote events | ✅ All accepted votes | ✅ All accepted votes + own rejections | ✅ All accepted votes |
| Participant events | ✅ All | ❌ None | ✅ Aggregate counts only |

---

## Key Design Principles

### 1. Synchronous Commands, Asynchronous Events
- REST endpoints execute commands synchronously (immediate response)
- State changes broadcast via event stream asynchronously (< 100ms)
- Clients receive confirmation via REST response, updates via events

### 2. At-Least-Once Event Delivery
- Event stream guarantees delivery to connected clients
- Reconnecting clients replay missed events using `fromEventId`
- Clients deduplicate using unique `eventId`

### 3. State Machine Enforcement
- Every REST endpoint validates preconditions from [state-machine.md](../002-state-transitions/domain/state-machine.md)
- Invalid state transitions return 400 Bad Request with error code
- Terminal states (Ended, Closed, Left) cannot be reversed

### 4. Domain-Driven Contracts
- 1:1 mapping: Domain command ↔ REST endpoint
- 1:1 mapping: Domain event ↔ Event stream message
- No contract exposes implementation details (databases, caching, etc.)

### 5. Constitution Compliance
- **Real-Time First**: Event stream delivers updates within 100ms
- **Zero Vote Loss**: Synchronous vote acknowledgment before returning 202
- **Presenter Authority**: Only presenters can control session/poll lifecycle
- **Read-Only Display**: Display actor has zero REST commands, events only
- **Anonymous Participation**: No personal data in vote events

---

## Usage Examples

### Example 1: Presenter Creates Session and Poll

```bash
# 1. Create session
POST /sessions
{
  "title": "Team Standup Poll"
}
→ 201 Created
{
  "sessionId": "abc-123",
  "accessCode": "123456",
  "state": "Preparing"
}

# 2. Start session
POST /sessions/abc-123/start
→ 200 OK
{ "sessionId": "abc-123", "state": "Active" }

# 3. Create poll
POST /sessions/abc-123/polls
{
  "question": "What should we focus on today?",
  "options": [
    { "text": "Bug fixes" },
    { "text": "New features" },
    { "text": "Technical debt" }
  ]
}
→ 201 Created
{ "pollId": "poll-456", "state": "Draft" }

# 4. Activate poll
POST /polls/poll-456/activate
→ 200 OK
{ "pollId": "poll-456", "state": "Active" }
```

**Events received on stream**:
1. `SessionCreated` (presenter only)
2. `SessionStarted` (all)
3. `PollCreated` (presenter only)
4. `PollActivated` (all)

---

### Example 2: Attendee Joins and Votes

```bash
# 1. Join session with access code
POST /sessions/abc-123/join
{
  "accessCode": "123456"
}
→ 200 OK
{
  "participantId": "part-789",
  "connectionState": "Connected"
}

# 2. Submit vote
POST /polls/poll-456/votes
{
  "participantId": "part-789",
  "selectedOptionId": "option-1"
}
→ 202 Accepted
{
  "voteId": "vote-999",
  "status": "Accepted"
}
```

**Events received on stream**:
1. `SessionStarted` (when connecting)
2. `PollActivated` (when connecting to active session)
3. `VoteAccepted` (after voting) - all clients see updated counts

---

### Example 3: Display Observes Session (Zero Commands)

```javascript
// Display only uses event stream, never REST commands
const ws = new WebSocket(
  'ws://example.com/events?sessionId=abc-123&actorType=display'
);

ws.onmessage = (event) => {
  const { eventType, payload } = JSON.parse(event.data);
  
  switch (eventType) {
    case 'PollActivated':
      displayPoll(payload.question, payload.options);
      break;
    case 'VoteAccepted':
      updateVoteCount(payload.selectedOptionId, payload.updatedVoteCounts);
      break;
    case 'PollClosed':
      showFinalResults(payload.options);
      break;
    case 'SessionEnded':
      showSessionSummary(payload);
      break;
  }
};
```

**Display issues zero REST commands** ✅ Read-only as required

---

## Related Specifications

1. **[Domain Specifications](../001-domain-specs/README.md)** - Core domain model (Session, Poll, Vote, Participant)
2. **[State Machine](../002-state-transitions/domain/state-machine.md)** - Valid and invalid state transitions
3. **[User Flows](../003-user-flows/README.md)** - Actor interaction patterns
4. **[Constitution](../.specify/memory/constitution.md)** - System principles and invariants

---

## Next Steps

With external contracts defined, next phases could include:

1. **API Implementation Planning** - Technology selection, framework setup, deployment strategy
2. **Client SDK Design** - Type-safe client libraries for Presenter/Attendee/Display apps
3. **Testing Strategy** - Contract tests, integration tests, load tests
4. **Security Specification** - Authentication, authorization, rate limiting, CORS policies
5. **Deployment Architecture** - Infrastructure, scaling, monitoring, logging

---

## Quick Reference: Status Codes

| Status | Meaning | When Used |
|--------|---------|-----------|
| 200 OK | Command succeeded | State transition successful |
| 201 Created | Resource created | Session or poll created |
| 202 Accepted | Command accepted, processing | Vote accepted for validation |
| 400 Bad Request | Invalid state or precondition | State machine violation, validation failure |
| 403 Forbidden | Authorization failure | Wrong actor, invalid access code |
| 404 Not Found | Resource not found | Invalid ID, draft poll for non-presenter |
| 409 Conflict | Invariant violation | Duplicate vote, active poll exists |
| 422 Unprocessable Entity | Payload validation failed | Malformed JSON, invalid fields |
| 500 Internal Server Error | System failure | Database down, internal error |

---

**Ready for API implementation planning phase.**
