# Feature Specification: External Contract Specifications

**Feature Branch**: `004-api-contracts`  
**Created**: January 3, 2026  
**Status**: Draft  
**Input**: User description: "Generate EXTERNAL CONTRACT specifications for the Live Event Polling Application. Define REST command contracts and Real-time event contracts with preconditions, success outcomes, failure scenarios, and domain event mapping. Must align with domain commands, events, and state machine."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Presenter Creates and Controls Session via REST (Priority: P1)

A presenter initiates a new live polling session by sending session creation commands, receives session identifiers and access codes, then controls the session lifecycle (start, pause, resume, end) through synchronous REST requests. The system validates each command against domain preconditions and returns immediate success/failure responses.

**Why this priority**: Core capability - without session creation and control, no polling can occur. This is the foundational contract enabling presenter authority.

**Independent Test**: Create session via REST endpoint, verify session ID and access code returned, issue lifecycle commands, confirm each state transition or rejection message.

**Acceptance Scenarios**:

1. **Given** no existing session, **When** presenter sends CreateSession command via REST, **Then** system returns 201 with session ID, access code, and session in Preparing state
2. **Given** session in Preparing state, **When** presenter sends StartSession command, **Then** system returns 200 with session transitioned to Active state
3. **Given** session in Active state, **When** presenter sends PauseSession command, **Then** system returns 200 with session transitioned to Paused state
4. **Given** session in Ended state, **When** presenter sends StartSession command, **Then** system returns 400 with error "Cannot restart ended session"

---

### User Story 2 - Participants Vote via REST (Priority: P1)

A participant joins a session using an access code, views active polls, and submits votes through REST commands. The system validates vote eligibility (session active, poll active, no duplicate vote) and returns immediate acceptance or rejection.

**Why this priority**: Core voting capability - equal importance to session creation since voting is the primary user interaction.

**Independent Test**: Join session via REST, receive participant ID, submit vote to active poll, verify vote accepted or rejection reason provided.

**Acceptance Scenarios**:

1. **Given** session is Active, **When** participant sends JoinSession command with valid access code, **Then** system returns 200 with participant ID
2. **Given** poll is Active and participant has not voted, **When** participant sends SubmitVote command, **Then** system returns 202 with vote accepted
3. **Given** participant has already voted on poll, **When** participant sends SubmitVote command again, **Then** system returns 409 with error "Duplicate vote rejected"
4. **Given** poll is Closed, **When** participant sends SubmitVote command, **Then** system returns 400 with error "Poll no longer accepting votes"

---

### User Story 3 - Real-Time Event Subscription for All Actors (Priority: P1)

All actors (Presenter, Attendee, Display) establish persistent event stream connections to receive real-time updates about state changes. The system pushes domain events as they occur without requiring client polling or refresh actions.

**Why this priority**: Core real-time capability mandated by constitution "Real-Time First" principle - critical for live event experience.

**Independent Test**: Establish WebSocket/SSE connection, trigger domain command via REST, verify corresponding event pushed to all connected clients within 100ms.

**Acceptance Scenarios**:

1. **Given** client establishes event stream connection, **When** presenter starts session, **Then** client receives SessionStarted event within 100ms
2. **Given** multiple clients connected, **When** participant submits vote, **Then** all clients receive VoteAccepted event with updated vote count
3. **Given** display client connected, **When** presenter activates poll, **Then** display receives PollActivated event with poll details
4. **Given** connection drops, **When** client reconnects, **Then** system provides event replay from last acknowledged event ID

---

### User Story 4 - Poll Management via REST (Priority: P2)

Presenter creates polls in draft state, edits poll content, activates polls when ready, and closes polls to stop voting. Each REST command validates against single-active-poll constraint and session state requirements.

**Why this priority**: Essential for presenter workflow but secondary to session creation - polls cannot exist without session.

**Independent Test**: Create draft poll via REST, edit it, activate it while session is active, verify single-active-poll enforcement.

**Acceptance Scenarios**:

1. **Given** session is Active, **When** presenter sends CreatePoll command, **Then** system returns 201 with poll ID in Draft state
2. **Given** poll is in Draft, **When** presenter sends UpdatePollDraft command, **Then** system returns 200 with updated poll content
3. **Given** poll is Draft and no other poll is Active, **When** presenter sends ActivatePoll command, **Then** system returns 200 with poll transitioned to Active
4. **Given** another poll is Active, **When** presenter sends ActivatePoll command for second poll, **Then** system returns 409 with error "Only one poll can be active"

---

### User Story 5 - Error Handling and State Validation (Priority: P2)

All REST commands validate preconditions before executing, returning detailed error messages when commands violate domain invariants or state machine rules. Clients receive actionable error information to guide user experience.

**Why this priority**: Critical for robust user experience but not blocking MVP - basic error handling sufficient for P1.

**Independent Test**: Attempt invalid commands (e.g., activate poll when session paused, vote on draft poll), verify appropriate 4xx error codes with descriptive messages.

**Acceptance Scenarios**:

1. **Given** session is Paused, **When** presenter sends ActivatePoll command, **Then** system returns 400 with error "Cannot activate poll while session paused"
2. **Given** poll is in Draft, **When** participant sends SubmitVote command, **Then** system returns 404 with error "Poll not found" (draft polls invisible to participants)
3. **Given** participant not joined to session, **When** participant sends SubmitVote command, **Then** system returns 403 with error "Must join session before voting"
4. **Given** malformed command payload, **When** client sends REST request, **Then** system returns 422 with validation error details

---

### User Story 6 - Event Filtering and Scoping (Priority: P3)

Actors receive only events relevant to their role and session scope. Participants receive events only for their joined session, displays receive events for observed session, presenters receive comprehensive events for their owned sessions.

**Why this priority**: Nice-to-have optimization - MVP can broadcast all events to all clients, filtering improves scalability and privacy.

**Independent Test**: Connect multiple clients to different sessions, trigger events in one session, verify clients only receive events from their subscribed session.

**Acceptance Scenarios**:

1. **Given** participant joined session A, **When** vote occurs in session B, **Then** participant receives no event notification
2. **Given** display observing session A, **When** presenter pauses session A, **Then** display receives SessionPaused event
3. **Given** presenter owns multiple sessions, **When** vote occurs in session A, **Then** presenter receives event scoped to session A only

---

### Edge Cases

- **Concurrent Command Execution**: What happens when presenter sends ActivatePoll and ClosePoll commands simultaneously for same poll?
- **Network Partition During Command**: How does system handle REST command that executes but client never receives response due to network failure?
- **Event Delivery Guarantee**: What happens when client misses events during temporary disconnection - are events buffered, replayed, or lost?
- **Command Idempotency**: Can client safely retry failed REST commands without causing duplicate state changes?
- **State Machine Violation Attempts**: How does system respond when client attempts transition forbidden by state-machine.md (e.g., Ended → Active)?
- **Burst Voting**: How does system handle 1000 concurrent SubmitVote commands when poll becomes active?
- **Event Ordering**: How does system ensure clients observe events in causally consistent order (e.g., PollActivated before VoteAccepted)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST expose synchronous REST endpoints for all domain commands (CreateSession, StartSession, PauseSession, ResumeSession, EndSession, JoinSession, CreatePoll, UpdatePollDraft, ActivatePoll, ClosePoll, SubmitVote)
- **FR-002**: Each REST command MUST validate preconditions defined in state-machine.md before execution
- **FR-003**: System MUST return success responses (2xx) for valid commands that execute successfully
- **FR-004**: System MUST return client error responses (4xx) for commands that violate preconditions or domain invariants
- **FR-005**: System MUST return server error responses (5xx) only for internal system failures, not domain validation failures
- **FR-006**: System MUST expose persistent event stream endpoint (WebSocket or Server-Sent Events) for real-time updates
- **FR-007**: Event stream MUST push domain events to connected clients within 100ms of event occurrence
- **FR-008**: System MUST emit domain events for all state transitions (SessionCreated, SessionStarted, PollActivated, VoteAccepted, etc.)
- **FR-009**: System MUST map each REST command to exactly one domain command defined in domain specifications
- **FR-010**: System MUST map each event stream message to exactly one domain event defined in domain specifications
- **FR-011**: REST responses MUST include sufficient information for clients to update local state (entity IDs, new state values, timestamps)
- **FR-012**: Event messages MUST include sufficient information for clients to update views without additional REST calls (full entity snapshots or deltas)
- **FR-013**: System MUST enforce constitution principle "Zero Vote Loss" through synchronous vote acknowledgment before responding to client
- **FR-014**: System MUST enforce constitution principle "Presenter Authority" by restricting session/poll lifecycle commands to presenter role
- **FR-015**: System MUST enforce constitution principle "Real-Time First" by guaranteeing event delivery to connected clients
- **FR-016**: REST endpoints MUST accept and return JSON payloads only
- **FR-017**: Event stream MUST use JSON format for all event messages
- **FR-018**: System MUST validate request payloads against strict schemas, rejecting malformed requests with 422 status
- **FR-019**: System MUST include error response body with machine-readable error code and human-readable message for all failures
- **FR-020**: System MUST support CORS for web browser clients from any origin [NEEDS CLARIFICATION: Should CORS be restricted to specific origins for security?]
- **FR-021**: Event stream MUST support reconnection with event replay from last acknowledged event ID to prevent event loss during disconnections
- **FR-022**: System MUST assign unique identifiers to all events for replay and ordering purposes

### Key Entities

The external contracts expose these domain entities through REST responses and event payloads:

- **Session**: Unique identifier, state (Preparing/Active/Paused/Ended), access code, participant count, poll count
- **Poll**: Unique identifier, session identifier, state (Draft/Active/Closed), question text, response options with vote counts
- **Vote**: Unique identifier, poll identifier, participant identifier, selected option, validation status (Pending/Accepted/Rejected), rejection reason
- **Participant**: Unique identifier, session identifier, connection state (Joining/Connected/Disconnected/Left), anonymous identity

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Presenters can create session, start it, create poll, and activate poll using only REST commands without any manual system intervention
- **SC-002**: Participants can join session and submit votes with vote acceptance confirmed within 200ms (REST round-trip + validation)
- **SC-003**: All connected clients receive state change events within 100ms of command execution (95th percentile latency)
- **SC-004**: System handles 500 concurrent vote submissions when poll activated without losing any votes (Zero Vote Loss)
- **SC-005**: REST command failures provide actionable error messages enabling client to correct request without consulting documentation
- **SC-006**: Event stream clients automatically recover from temporary network interruptions without missing events (reconnection + replay)
- **SC-007**: 100% of domain commands have corresponding REST endpoints with documented preconditions and outcomes
- **SC-008**: 100% of domain events have corresponding real-time event messages with documented payloads
- **SC-009**: Zero forbidden state transitions from state-machine.md can be triggered through REST API (enforcement validation)
- **SC-010**: Display clients can observe entire session lifecycle from SessionStarted to SessionEnded using only event stream (no REST polling required)
