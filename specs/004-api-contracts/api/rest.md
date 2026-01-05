# REST Command Contracts

**Created**: January 3, 2026  
**Status**: Draft  
**Feature**: 004-api-contracts

## Purpose

This specification defines the synchronous REST API contracts for all domain commands in the Live Event Polling Application. Each endpoint maps directly to a domain command, validates preconditions, executes the command, and returns success or failure responses.

All contracts enforce domain invariants defined in the state machine specification and emit domain events for successful state transitions.

**References**:
- [Session Domain Spec](../../001-domain-specs/domain/session.md)
- [Poll Domain Spec](../../001-domain-specs/domain/poll.md)
- [Vote Domain Spec](../../001-domain-specs/domain/vote.md)
- [Participant Domain Spec](../../001-domain-specs/domain/participant.md)
- [State Machine Spec](../../002-state-transitions/domain/state-machine.md)
- [Presenter Flow](../../003-user-flows/flows/presenter-flow.md)
- [Attendee Flow](../../003-user-flows/flows/attendee-flow.md)

---

## Contract Format

Each command contract follows this structure:

- **Endpoint**: HTTP method and URL path
- **Domain Command**: Corresponding command from domain specifications
- **Actor**: Who can invoke this command
- **Request Payload**: JSON schema for request body
- **Preconditions**: Requirements that must be met before execution (from state-machine.md)
- **Success Response**: HTTP status, response body for successful execution
- **Domain Event Emitted**: Event triggered by successful execution
- **Failure Responses**: HTTP status and error details for each precondition violation
- **State Transition**: Before and after states (from state-machine.md)

---

## Session Commands

### CreateSession

Creates a new polling session in Preparing state.

**Endpoint**: `POST /sessions`

**Domain Command**: `CreateSession`

**Actor**: Presenter

**Request Payload**:
```json
{
  "title": "string (optional)",
  "description": "string (optional)"
}
```

**Preconditions**: None

**Success Response**: HTTP 201 Created
```json
{
  "sessionId": "string (UUID)",
  "accessCode": "string (6-digit code)",
  "state": "Preparing",
  "title": "string or null",
  "description": "string or null",
  "createdAt": "ISO8601 timestamp"
}
```

**Domain Event Emitted**: `SessionCreated`

**Failure Responses**:

| Status | Error Code | Description | When It Occurs |
|--------|-----------|-------------|----------------|
| 422 | INVALID_PAYLOAD | Request payload validation failed | Malformed JSON or invalid field types |
| 500 | INTERNAL_ERROR | Internal system failure | Database unavailable, etc. |

**State Transition**: `[Initial] → Preparing`

---

### StartSession

Transitions session from Preparing to Active, enabling participant joins and poll interactions.

**Endpoint**: `POST /sessions/{sessionId}/start`

**Domain Command**: `StartSession`

**Actor**: Presenter

**Request Payload**: None

**Preconditions**:
- Session exists
- Session is in Preparing state

**Success Response**: HTTP 200 OK
```json
{
  "sessionId": "string (UUID)",
  "state": "Active",
  "startedAt": "ISO8601 timestamp"
}
```

**Domain Event Emitted**: `SessionStarted`

**Failure Responses**:

| Status | Error Code | Description | When It Occurs |
|--------|-----------|-------------|----------------|
| 404 | SESSION_NOT_FOUND | Session does not exist | Invalid sessionId |
| 400 | INVALID_STATE | Session not in Preparing state | Session already Active, Paused, or Ended |
| 403 | UNAUTHORIZED | Requester is not session owner | Presenter authority violation |

**State Transition**: `Preparing → Active`

---

### PauseSession

Temporarily suspends session, stopping vote acceptance and participant joins.

**Endpoint**: `POST /sessions/{sessionId}/pause`

**Domain Command**: `PauseSession`

**Actor**: Presenter

**Request Payload**: None

**Preconditions**:
- Session exists
- Session is in Active state

**Success Response**: HTTP 200 OK
```json
{
  "sessionId": "string (UUID)",
  "state": "Paused",
  "pausedAt": "ISO8601 timestamp"
}
```

**Domain Event Emitted**: `SessionPaused`

**Side Effects**:
- All active polls stop accepting votes
- Participants cannot submit votes
- No new participants can join

**Failure Responses**:

| Status | Error Code | Description | When It Occurs |
|--------|-----------|-------------|----------------|
| 404 | SESSION_NOT_FOUND | Session does not exist | Invalid sessionId |
| 400 | INVALID_STATE | Session not in Active state | Session in Preparing, Paused, or Ended |
| 403 | UNAUTHORIZED | Requester is not session owner | Presenter authority violation |

**State Transition**: `Active → Paused`

---

### ResumeSession

Returns session from Paused to Active, restoring vote acceptance and participant joins.

**Endpoint**: `POST /sessions/{sessionId}/resume`

**Domain Command**: `ResumeSession`

**Actor**: Presenter

**Request Payload**: None

**Preconditions**:
- Session exists
- Session is in Paused state

**Success Response**: HTTP 200 OK
```json
{
  "sessionId": "string (UUID)",
  "state": "Active",
  "resumedAt": "ISO8601 timestamp"
}
```

**Domain Event Emitted**: `SessionResumed`

**Side Effects**:
- Previously active polls resume accepting votes
- Participants can submit votes again
- New participants can join

**Failure Responses**:

| Status | Error Code | Description | When It Occurs |
|--------|-----------|-------------|----------------|
| 404 | SESSION_NOT_FOUND | Session does not exist | Invalid sessionId |
| 400 | INVALID_STATE | Session not in Paused state | Session in Preparing, Active, or Ended |
| 403 | UNAUTHORIZED | Requester is not session owner | Presenter authority violation |

**State Transition**: `Paused → Active`

---

### EndSession

Permanently concludes session, closing all polls and preventing further interactions.

**Endpoint**: `POST /sessions/{sessionId}/end`

**Domain Command**: `EndSession`

**Actor**: Presenter

**Request Payload**: None

**Preconditions**:
- Session exists
- Session is in Active or Paused state

**Success Response**: HTTP 200 OK
```json
{
  "sessionId": "string (UUID)",
  "state": "Ended",
  "endedAt": "ISO8601 timestamp",
  "pollCount": "integer",
  "participantCount": "integer",
  "totalVotes": "integer"
}
```

**Domain Event Emitted**: `SessionEnded`

**Side Effects**:
- All active polls automatically close
- All participants transition to Left state
- Session becomes read-only

**Failure Responses**:

| Status | Error Code | Description | When It Occurs |
|--------|-----------|-------------|----------------|
| 404 | SESSION_NOT_FOUND | Session does not exist | Invalid sessionId |
| 400 | INVALID_STATE | Session not in Active or Paused state | Session in Preparing or already Ended |
| 403 | UNAUTHORIZED | Requester is not session owner | Presenter authority violation |

**State Transition**: `Active → Ended` or `Paused → Ended`

---

### JoinSession

Associates participant with session, enabling them to view and vote on polls.

**Endpoint**: `POST /sessions/{sessionId}/join`

**Domain Command**: `JoinSession`

**Actor**: Participant (Attendee)

**Request Payload**:
```json
{
  "accessCode": "string (6-digit code)"
}
```

**Preconditions**:
- Session exists
- Session is in Active state
- Access code matches session access code

**Success Response**: HTTP 200 OK
```json
{
  "sessionId": "string (UUID)",
  "participantId": "string (UUID)",
  "connectionState": "Connected",
  "joinedAt": "ISO8601 timestamp"
}
```

**Domain Event Emitted**: `ParticipantJoined`

**Failure Responses**:

| Status | Error Code | Description | When It Occurs |
|--------|-----------|-------------|----------------|
| 404 | SESSION_NOT_FOUND | Session does not exist | Invalid sessionId |
| 400 | INVALID_STATE | Session not in Active state | Session in Preparing, Paused, or Ended |
| 403 | INVALID_ACCESS_CODE | Access code does not match | Wrong access code provided |
| 422 | INVALID_PAYLOAD | Missing or invalid access code | Malformed request |

**State Transition**: `[Initial] → Joining → Connected`

---

## Poll Commands

### CreatePoll

Creates a new poll in Draft state within an active session.

**Endpoint**: `POST /sessions/{sessionId}/polls`

**Domain Command**: `CreatePoll`

**Actor**: Presenter

**Request Payload**:
```json
{
  "question": "string (required, 1-500 chars)",
  "options": [
    {
      "text": "string (required, 1-200 chars)",
      "order": "integer (optional, default by array position)"
    }
  ]
}
```

**Preconditions**:
- Session exists
- Session is in Active state
- Minimum 2 options provided
- Maximum 10 options provided

**Success Response**: HTTP 201 Created
```json
{
  "pollId": "string (UUID)",
  "sessionId": "string (UUID)",
  "state": "Draft",
  "question": "string",
  "options": [
    {
      "optionId": "string (UUID)",
      "text": "string",
      "order": "integer"
    }
  ],
  "createdAt": "ISO8601 timestamp"
}
```

**Domain Event Emitted**: `PollCreated`

**Failure Responses**:

| Status | Error Code | Description | When It Occurs |
|--------|-----------|-------------|----------------|
| 404 | SESSION_NOT_FOUND | Session does not exist | Invalid sessionId |
| 400 | INVALID_STATE | Session not in Active state | Session in Preparing, Paused, or Ended |
| 400 | INSUFFICIENT_OPTIONS | Less than 2 options provided | Fewer than 2 options |
| 400 | TOO_MANY_OPTIONS | More than 10 options provided | More than 10 options |
| 422 | INVALID_PAYLOAD | Invalid question or option format | Malformed JSON, empty strings, etc. |
| 403 | UNAUTHORIZED | Requester is not session owner | Presenter authority violation |

**State Transition**: `[Initial] → Draft`

---

### UpdatePollDraft

Modifies question or options of a poll in Draft state.

**Endpoint**: `PATCH /polls/{pollId}`

**Domain Command**: `UpdatePollDraft`

**Actor**: Presenter

**Request Payload**:
```json
{
  "question": "string (optional, 1-500 chars)",
  "options": [
    {
      "optionId": "string (UUID, optional for existing)",
      "text": "string (required, 1-200 chars)",
      "order": "integer (optional)"
    }
  ]
}
```

**Preconditions**:
- Poll exists
- Poll is in Draft state
- If options provided, minimum 2 options
- If options provided, maximum 10 options

**Success Response**: HTTP 200 OK
```json
{
  "pollId": "string (UUID)",
  "state": "Draft",
  "question": "string",
  "options": [
    {
      "optionId": "string (UUID)",
      "text": "string",
      "order": "integer"
    }
  ],
  "updatedAt": "ISO8601 timestamp"
}
```

**Domain Event Emitted**: `PollDraftUpdated`

**Failure Responses**:

| Status | Error Code | Description | When It Occurs |
|--------|-----------|-------------|----------------|
| 404 | POLL_NOT_FOUND | Poll does not exist | Invalid pollId |
| 400 | INVALID_STATE | Poll not in Draft state | Poll is Active or Closed |
| 400 | INSUFFICIENT_OPTIONS | Less than 2 options after update | Updated option count < 2 |
| 400 | TOO_MANY_OPTIONS | More than 10 options after update | Updated option count > 10 |
| 422 | INVALID_PAYLOAD | Invalid question or option format | Malformed JSON, empty strings, etc. |
| 403 | UNAUTHORIZED | Requester is not session owner | Presenter authority violation |

**State Transition**: `Draft → Draft` (no state change, content updated)

---

### ActivatePoll

Transitions poll from Draft to Active, making it visible and votable for participants.

**Endpoint**: `POST /polls/{pollId}/activate`

**Domain Command**: `ActivatePoll`

**Actor**: Presenter

**Request Payload**: None

**Preconditions**:
- Poll exists
- Poll is in Draft state
- Session is in Active state
- No other poll in session is Active (single-active-poll constraint)
- Poll has at least 2 response options

**Success Response**: HTTP 200 OK
```json
{
  "pollId": "string (UUID)",
  "sessionId": "string (UUID)",
  "state": "Active",
  "question": "string",
  "options": [
    {
      "optionId": "string (UUID)",
      "text": "string",
      "voteCount": 0
    }
  ],
  "activatedAt": "ISO8601 timestamp"
}
```

**Domain Event Emitted**: `PollActivated`

**Failure Responses**:

| Status | Error Code | Description | When It Occurs |
|--------|-----------|-------------|----------------|
| 404 | POLL_NOT_FOUND | Poll does not exist | Invalid pollId |
| 400 | INVALID_STATE | Poll not in Draft state | Poll already Active or Closed |
| 400 | SESSION_NOT_ACTIVE | Session not in Active state | Session is Preparing, Paused, or Ended |
| 409 | ACTIVE_POLL_EXISTS | Another poll already active | Single-active-poll constraint violated |
| 400 | INSUFFICIENT_OPTIONS | Poll has fewer than 2 options | Missing options |
| 403 | UNAUTHORIZED | Requester is not session owner | Presenter authority violation |

**State Transition**: `Draft → Active`

---

### ClosePoll

Transitions poll from Active to Closed, stopping vote acceptance and finalizing results.

**Endpoint**: `POST /polls/{pollId}/close`

**Domain Command**: `ClosePoll`

**Actor**: Presenter

**Request Payload**: None

**Preconditions**:
- Poll exists
- Poll is in Active state

**Success Response**: HTTP 200 OK
```json
{
  "pollId": "string (UUID)",
  "state": "Closed",
  "question": "string",
  "options": [
    {
      "optionId": "string (UUID)",
      "text": "string",
      "voteCount": "integer (final count)"
    }
  ],
  "totalVotes": "integer",
  "closedAt": "ISO8601 timestamp"
}
```

**Domain Event Emitted**: `PollClosed`

**Failure Responses**:

| Status | Error Code | Description | When It Occurs |
|--------|-----------|-------------|----------------|
| 404 | POLL_NOT_FOUND | Poll does not exist | Invalid pollId |
| 400 | INVALID_STATE | Poll not in Active state | Poll is Draft or already Closed |
| 403 | UNAUTHORIZED | Requester is not session owner | Presenter authority violation |

**State Transition**: `Active → Closed`

---

## Vote Commands

### SubmitVote

Submits participant's vote for an active poll, validates eligibility, and accepts or rejects.

**Endpoint**: `POST /polls/{pollId}/votes`

**Domain Command**: `SubmitVote`

**Actor**: Participant (Attendee)

**Request Payload**:
```json
{
  "participantId": "string (UUID)",
  "selectedOptionId": "string (UUID)"
}
```

**Preconditions**:
- Poll exists
- Poll is in Active state
- Session is in Active state
- Participant is joined to session (Connected state)
- Participant has not already voted on this poll
- Selected option exists in poll

**Success Response**: HTTP 202 Accepted
```json
{
  "voteId": "string (UUID)",
  "pollId": "string (UUID)",
  "participantId": "string (UUID)",
  "selectedOptionId": "string (UUID)",
  "status": "Accepted",
  "submittedAt": "ISO8601 timestamp"
}
```

**Domain Event Emitted**: `VoteAccepted`

**Failure Responses**:

| Status | Error Code | Description | When It Occurs |
|--------|-----------|-------------|----------------|
| 404 | POLL_NOT_FOUND | Poll does not exist | Invalid pollId |
| 400 | INVALID_STATE | Poll not in Active state | Poll is Draft or Closed |
| 400 | SESSION_NOT_ACTIVE | Session not in Active state | Session is Preparing, Paused, or Ended |
| 403 | PARTICIPANT_NOT_JOINED | Participant not joined to session | Invalid participantId or not joined |
| 409 | DUPLICATE_VOTE | Participant already voted on poll | One vote per participant constraint |
| 400 | INVALID_OPTION | Selected option does not exist | Invalid selectedOptionId |
| 422 | INVALID_PAYLOAD | Missing required fields | Malformed JSON |

**State Transition**: `[Initial] → Pending → Accepted`

**Note**: Rejected votes return 4xx status and do not transition to Accepted state. The VoteRejected event is emitted internally but not via public event stream.

---

## Participant Connection Commands

### ReconnectToSession

Re-establishes participant connection after temporary disconnection.

**Endpoint**: `POST /sessions/{sessionId}/reconnect`

**Domain Command**: `ReconnectToSession`

**Actor**: Participant (Attendee)

**Request Payload**:
```json
{
  "participantId": "string (UUID)"
}
```

**Preconditions**:
- Session exists
- Participant exists and was previously joined
- Participant is in Disconnected state
- Session is in Active state

**Success Response**: HTTP 200 OK
```json
{
  "participantId": "string (UUID)",
  "sessionId": "string (UUID)",
  "connectionState": "Connected",
  "reconnectedAt": "ISO8601 timestamp"
}
```

**Domain Event Emitted**: `ParticipantReconnected`

**Failure Responses**:

| Status | Error Code | Description | When It Occurs |
|--------|-----------|-------------|----------------|
| 404 | SESSION_NOT_FOUND | Session does not exist | Invalid sessionId |
| 404 | PARTICIPANT_NOT_FOUND | Participant does not exist | Invalid participantId |
| 400 | INVALID_STATE | Participant not in Disconnected state | Participant already Connected or Left |
| 400 | SESSION_NOT_ACTIVE | Session not in Active state | Session ended or paused |

**State Transition**: `Disconnected → Connected`

---

### LeaveSession

Explicitly disconnects participant from session.

**Endpoint**: `POST /sessions/{sessionId}/leave`

**Domain Command**: `LeaveSession`

**Actor**: Participant (Attendee)

**Request Payload**:
```json
{
  "participantId": "string (UUID)"
}
```

**Preconditions**:
- Session exists
- Participant exists and is joined to session
- Participant is in Connected or Disconnected state

**Success Response**: HTTP 200 OK
```json
{
  "participantId": "string (UUID)",
  "sessionId": "string (UUID)",
  "connectionState": "Left",
  "leftAt": "ISO8601 timestamp"
}
```

**Domain Event Emitted**: `ParticipantLeft`

**Failure Responses**:

| Status | Error Code | Description | When It Occurs |
|--------|-----------|-------------|----------------|
| 404 | SESSION_NOT_FOUND | Session does not exist | Invalid sessionId |
| 404 | PARTICIPANT_NOT_FOUND | Participant does not exist | Invalid participantId |
| 400 | INVALID_STATE | Participant already Left | Participant in Left state |

**State Transition**: `Connected → Left` or `Disconnected → Left`

---

## Query Endpoints (Read-Only)

These endpoints retrieve current state without modifying domain state. They do not map to domain commands.

### GetSession

Retrieves current session state and metadata.

**Endpoint**: `GET /sessions/{sessionId}`

**Success Response**: HTTP 200 OK
```json
{
  "sessionId": "string (UUID)",
  "state": "Preparing|Active|Paused|Ended",
  "title": "string or null",
  "description": "string or null",
  "accessCode": "string (only for presenter)",
  "participantCount": "integer",
  "pollCount": "integer",
  "createdAt": "ISO8601 timestamp",
  "startedAt": "ISO8601 timestamp or null",
  "endedAt": "ISO8601 timestamp or null"
}
```

**Failure Responses**:

| Status | Error Code | Description |
|--------|-----------|-------------|
| 404 | SESSION_NOT_FOUND | Session does not exist |

---

### GetActivePoll

Retrieves currently active poll for a session (returns 404 if no active poll).

**Endpoint**: `GET /sessions/{sessionId}/polls/active`

**Success Response**: HTTP 200 OK
```json
{
  "pollId": "string (UUID)",
  "sessionId": "string (UUID)",
  "state": "Active",
  "question": "string",
  "options": [
    {
      "optionId": "string (UUID)",
      "text": "string",
      "voteCount": "integer"
    }
  ],
  "totalVotes": "integer",
  "activatedAt": "ISO8601 timestamp"
}
```

**Failure Responses**:

| Status | Error Code | Description |
|--------|-----------|-------------|
| 404 | SESSION_NOT_FOUND | Session does not exist |
| 404 | NO_ACTIVE_POLL | No poll currently active |

---

### ListPolls

Retrieves all polls for a session (all states: Draft, Active, Closed).

**Endpoint**: `GET /sessions/{sessionId}/polls`

**Actor Filter**: Presenter sees all polls (including Draft), Attendee/Display see only Active and Closed polls

**Success Response**: HTTP 200 OK
```json
{
  "polls": [
    {
      "pollId": "string (UUID)",
      "state": "Draft|Active|Closed",
      "question": "string",
      "options": [
        {
          "optionId": "string (UUID)",
          "text": "string",
          "voteCount": "integer (0 for Draft, actual count for Active/Closed)"
        }
      ],
      "totalVotes": "integer",
      "createdAt": "ISO8601 timestamp",
      "activatedAt": "ISO8601 timestamp or null",
      "closedAt": "ISO8601 timestamp or null"
    }
  ]
}
```

**Failure Responses**:

| Status | Error Code | Description |
|--------|-----------|-------------|
| 404 | SESSION_NOT_FOUND | Session does not exist |

---

## Common Error Response Format

All error responses follow this structure:

```json
{
  "error": {
    "code": "ERROR_CODE_CONSTANT",
    "message": "Human-readable error description",
    "timestamp": "ISO8601 timestamp",
    "requestId": "string (UUID for tracking)"
  }
}
```

---

## Contract Validation Summary

| Domain Command | REST Endpoint | State Transition | Actor | Preconditions Met |
|----------------|---------------|------------------|-------|-------------------|
| CreateSession | POST /sessions | [Initial] → Preparing | Presenter | ✓ None |
| StartSession | POST /sessions/{id}/start | Preparing → Active | Presenter | ✓ Session in Preparing |
| PauseSession | POST /sessions/{id}/pause | Active → Paused | Presenter | ✓ Session in Active |
| ResumeSession | POST /sessions/{id}/resume | Paused → Active | Presenter | ✓ Session in Paused |
| EndSession | POST /sessions/{id}/end | Active/Paused → Ended | Presenter | ✓ Session in Active or Paused |
| JoinSession | POST /sessions/{id}/join | [Initial] → Connected | Participant | ✓ Session Active, valid access code |
| CreatePoll | POST /sessions/{id}/polls | [Initial] → Draft | Presenter | ✓ Session Active, 2-10 options |
| UpdatePollDraft | PATCH /polls/{id} | Draft → Draft | Presenter | ✓ Poll in Draft, 2-10 options |
| ActivatePoll | POST /polls/{id}/activate | Draft → Active | Presenter | ✓ Poll Draft, Session Active, no other active poll |
| ClosePoll | POST /polls/{id}/close | Active → Closed | Presenter | ✓ Poll in Active |
| SubmitVote | POST /polls/{id}/votes | [Initial] → Accepted | Participant | ✓ Poll Active, Session Active, no duplicate vote |
| ReconnectToSession | POST /sessions/{id}/reconnect | Disconnected → Connected | Participant | ✓ Participant Disconnected, Session Active |
| LeaveSession | POST /sessions/{id}/leave | Connected/Disconnected → Left | Participant | ✓ Participant joined |

All contracts enforce state machine rules from [state-machine.md](../../002-state-transitions/domain/state-machine.md) and emit corresponding domain events.
