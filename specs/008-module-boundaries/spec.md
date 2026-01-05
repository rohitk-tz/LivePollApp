# Feature Specification: Backend Module Boundaries

**Feature Branch**: `008-module-boundaries`  
**Created**: January 3, 2026  
**Status**: Draft  
**Input**: Define logical backend module boundaries for the Live Event Polling Application implemented as a Modular Monolith

## User Scenarios & Testing

### User Story 1 - Define Core Domain Modules (Priority: P1)

Development teams need to understand the core business logic modules and their responsibilities to implement the polling system's essential capabilities (sessions, polls, votes).

**Why this priority**: Core domain modules contain the fundamental business logic and data that the entire application depends on. Without clear boundaries here, all subsequent development becomes chaotic.

**Independent Test**: Can be validated by reviewing module definitions against domain specifications (session.md, poll.md, vote.md) and confirming each module's responsibilities align with exactly one bounded context.

**Acceptance Scenarios**:

1. **Given** domain specifications exist for sessions, polls, and votes, **When** defining modules, **Then** each domain concept maps to exactly one module with clear ownership
2. **Given** a business requirement change to poll behavior, **When** identifying affected modules, **Then** changes are isolated to a single module without cascading effects
3. **Given** module definitions, **When** checking for overlap, **Then** no two modules claim ownership of the same domain entity or business rule

---

### User Story 2 - Define Real-Time Communication Module (Priority: P1)

Development teams need a dedicated module for managing WebSocket connections and event broadcasting to isolate real-time concerns from business logic.

**Why this priority**: Per ADR-002, real-time communication is a cross-cutting concern that must be separated from domain logic to enable scaling and prevent coupling.

**Independent Test**: Can be validated by confirming the real-time module has no business logic and only transforms domain events into WebSocket messages, with clear interfaces to domain modules.

**Acceptance Scenarios**:

1. **Given** domain events are published, **When** real-time module receives them, **Then** events are broadcast to appropriate WebSocket rooms without modifying business data
2. **Given** a WebSocket connection failure, **When** handling the error, **Then** domain modules continue operating normally and events are queued for replay
3. **Given** need to add a new domain event, **When** implementing, **Then** real-time module requires zero changes to its core logic

---

### User Story 3 - Define Module Interaction Patterns (Priority: P2)

Development teams need clear rules for how modules communicate to prevent tight coupling and circular dependencies.

**Why this priority**: Clear interaction patterns prevent architectural decay and enable modules to evolve independently, which is essential for maintainability.

**Independent Test**: Can be validated by drawing a dependency graph where all arrows flow in one direction (no cycles) and confirming all inter-module communication uses defined patterns (events, interfaces, or async messaging).

**Acceptance Scenarios**:

1. **Given** Module A needs data from Module B, **When** implementing the interaction, **Then** Module A either subscribes to Module B's events or calls a well-defined interface, never accessing Module B's internals
2. **Given** a new business requirement spanning multiple modules, **When** implementing, **Then** modules communicate only through their exposed capabilities
3. **Given** module interaction rules, **When** reviewing code, **Then** violations can be detected through static analysis or build-time checks

---

### Edge Cases

- What happens when a module needs data from multiple other modules? (Define aggregation patterns)
- How does the system handle modules that need to transaction across multiple modules? (Define transaction boundaries)
- What if a new requirement doesn't fit cleanly into existing modules? (Define module evolution criteria)

## Requirements

### Functional Requirements

- **FR-001**: System MUST define separate modules for Session Management, Poll Management, Vote Management, and Participant Management
- **FR-002**: System MUST define a Real-Time Communication module that handles WebSocket connections and event broadcasting
- **FR-003**: Each module MUST have a single, well-defined responsibility aligned with one bounded context
- **FR-004**: Each module MUST explicitly declare which domain entities it owns
- **FR-005**: Each module MUST explicitly declare its exposed capabilities (APIs and events)
- **FR-006**: Module dependencies MUST be explicitly declared and MUST NOT form circular dependencies
- **FR-007**: Business logic MUST remain within domain modules and MUST NOT leak into infrastructure modules
- **FR-008**: Modules MUST communicate through well-defined interfaces or domain events, NOT direct database access
- **FR-009**: Real-time communication MUST be isolated from business logic per ADR-002
- **FR-010**: Module boundaries MUST align with ADR-001 (Modular Monolith architecture)

### Key Entities

**Note**: Modules will own these entities, but implementation details (schemas, tables) are out of scope for this specification.

- **Session**: Owned by Session Management module - represents a presenter's polling event with lifecycle (draft, active, ended)
- **Poll**: Owned by Poll Management module - represents a question with options/rating scale presented to participants
- **Vote**: Owned by Vote Management module - represents a participant's response to a poll
- **Participant**: Owned by Participant Management module - represents an attendee joining a session
- **WebSocket Connection**: Owned by Real-Time Communication module - manages bidirectional connections for live updates

## Success Criteria

### Measurable Outcomes

- **SC-001**: Each defined module has zero overlap in domain entity ownership (100% clear boundaries)
- **SC-002**: Dependency graph contains zero circular dependencies between modules
- **SC-003**: All inter-module communication follows one of three defined patterns (events, interfaces, async messaging)
- **SC-004**: 100% of business logic resides in domain modules (Session, Poll, Vote, Participant), with 0% in infrastructure modules
- **SC-005**: Real-time module can be horizontally scaled independently without affecting domain module scaling (validating ADR-002 alignment)
- **SC-006**: Development teams can implement user stories that touch only 1-2 modules for 80% of requirements

---

## Module Definitions

### 1. Session Management Module

**Core Responsibilities**:
- Manage session lifecycle (create, start, end)
- Generate and validate unique session access codes
- Track which poll is currently active in a session
- Enforce presenter authorization for session operations

**Owned Domain Entities**:
- Session (id, presenterId, title, slug, status, activePollId, timestamps)

**Exposed Capabilities**:

*APIs*:
- `createSession(presenterId, title)` → Session
- `getSession(sessionId)` → Session
- `getSessionBySlug(slug)` → Session
- `startSession(sessionId, presenterId)` → Session
- `endSession(sessionId, presenterId)` → Session
- `activatePoll(sessionId, pollId, presenterId)` → Session

*Published Events*:
- `SessionCreated(sessionId, title, slug, presenterId)`
- `SessionStarted(sessionId, startedAt)`
- `SessionEnded(sessionId, endedAt)`
- `PollActivated(sessionId, pollId, activatedAt)`

**Dependencies**:
- NONE (Session is a root aggregate with no dependencies on other domain modules)

**Interaction Rules**:
- Other modules can subscribe to Session events to react to lifecycle changes
- Other modules can query Session state via exposed APIs but cannot modify Session entities directly
- Session module validates presenter authorization before publishing events

---

### 2. Poll Management Module

**Core Responsibilities**:
- Create polls with different types (multiple choice, rating scale, open text)
- Manage poll options for multiple-choice polls
- Close polls to stop accepting votes
- Aggregate vote data into results (counts, percentages, averages)

**Owned Domain Entities**:
- Poll (id, sessionId, question, pollType, allowMultiple, isAnonymous, sequenceOrder, timestamps)
- PollOption (id, pollId, optionText, sequenceOrder)

**Exposed Capabilities**:

*APIs*:
- `createPoll(sessionId, question, pollType, options, settings)` → Poll
- `getPoll(pollId)` → Poll
- `getSessionPolls(sessionId)` → Poll[]
- `closePoll(pollId, presenterId)` → Poll
- `getPollResults(pollId)` → PollResults

*Published Events*:
- `PollCreated(pollId, sessionId, question, pollType)`
- `PollClosed(pollId, closedAt)`

**Dependencies**:
- Session Management (validates sessionId exists and presenter owns session)
- Vote Management (reads vote data to calculate results, does not own votes)

**Interaction Rules**:
- Subscribes to `SessionEnded` event to auto-close all open polls
- Queries Vote Management for vote counts but never modifies vote entities
- Validates poll closure requests through Session module's presenter authorization

---

### 3. Vote Management Module

**Core Responsibilities**:
- Accept and validate vote submissions
- Enforce vote constraints (prevent duplicates, validate poll is active)
- Validate vote data matches poll type (option selection, rating value, text response)
- Store individual vote records for auditability

**Owned Domain Entities**:
- Vote (id, pollId, participantId, optionId, textResponse, ratingValue, submittedAt)

**Exposed Capabilities**:

*APIs*:
- `submitVote(pollId, participantId, voteData)` → Vote
- `getVotesByPoll(pollId)` → Vote[]
- `getVotesByParticipant(participantId)` → Vote[]
- `countVotesByPoll(pollId)` → number

*Published Events*:
- `VoteAccepted(voteId, pollId, participantId, submittedAt)`
- `VoteRejected(pollId, participantId, reason)` (for validation failures)

**Dependencies**:
- Poll Management (validates poll exists, is active, not closed)
- Participant Management (validates participant exists and is in correct session)

**Interaction Rules**:
- Subscribes to `PollClosed` event to reject new votes for closed polls
- Provides read-only access to vote counts for Poll Management's results aggregation
- Does not expose individual vote details unless poll is non-anonymous

---

### 4. Participant Management Module

**Core Responsibilities**:
- Register participants joining a session
- Track participant join timestamps
- Optionally store participant display names
- Count active participants per session

**Owned Domain Entities**:
- Participant (id, sessionId, displayName, joinedAt)

**Exposed Capabilities**:

*APIs*:
- `joinSession(sessionId, displayName?)` → Participant
- `getParticipant(participantId)` → Participant
- `getSessionParticipants(sessionId)` → Participant[]
- `countSessionParticipants(sessionId)` → number

*Published Events*:
- `ParticipantJoined(participantId, sessionId, displayName, joinedAt, participantCount)`
- `ParticipantLeft(participantId, sessionId)` (optional, for future disconnection tracking)

**Dependencies**:
- Session Management (validates session exists and is active before allowing joins)

**Interaction Rules**:
- Subscribes to `SessionEnded` event to prevent new participant joins
- Provides participant validation for Vote Management's vote submissions
- Never modifies Session or Vote entities

---

### 5. Real-Time Communication Module

**Core Responsibilities**:
- Manage WebSocket connections for presenters and participants
- Organize connections into session-based rooms
- Broadcast domain events to appropriate rooms
- Handle connection lifecycle (connect, disconnect, reconnect with event replay)
- Store events in Redis for 24-hour replay buffer

**Owned Domain Entities**:
- WebSocket Connection (socketId, sessionId, role, lastEventId)
- Event Replay Buffer (session-scoped event queue in Redis)

**Exposed Capabilities**:

*APIs*:
- `joinRoom(socketId, sessionId, lastEventId?)` → void
- `leaveRoom(socketId, sessionId)` → void
- `broadcastToSession(sessionId, event)` → void
- `sendToClient(socketId, event)` → void

*Published Events*:
- NONE (this module only broadcasts events from other modules)

**Dependencies**:
- ALL domain modules (subscribes to all domain events to broadcast them)
- Session Management (validates session exists before allowing room joins)

**Interaction Rules**:
- Subscribes to wildcard domain events (`*`) and forwards to WebSocket clients
- Does NOT modify or interpret event payloads, acts purely as a transport layer
- Stores all domain events in Redis for event replay on reconnection
- Has NO business logic - purely infrastructure concern per ADR-002

---

## Module Interaction Patterns

### Pattern 1: Domain Events (Preferred for Decoupling)

Used when Module A needs to react to state changes in Module B without tight coupling.

**Example**: Real-Time module subscribes to `VoteAccepted` events to broadcast vote counts.

**Rules**:
- Publisher module emits events after committing state changes
- Subscriber modules receive events asynchronously
- Events are immutable facts about what happened (past tense)
- No return values from event handlers

### Pattern 2: API Calls (For Synchronous Validation)

Used when Module A needs immediate validation or data from Module B before proceeding.

**Example**: Vote module calls Poll Management's `getPoll(pollId)` to validate poll is active before accepting vote.

**Rules**:
- Calling module depends on called module (creates directed dependency)
- APIs must be stateless and side-effect free for queries
- Commands that modify state should publish events afterward

### Pattern 3: Shared Read-Only Views (For Aggregation)

Used when Module A needs to read large datasets owned by Module B.

**Example**: Poll Management queries Vote Management's vote counts to calculate results.

**Rules**:
- Reading module never modifies data
- Owning module provides optimized read-only queries
- Results may be eventually consistent if caching is involved

### Anti-Pattern: Direct Database Access (FORBIDDEN)

Modules MUST NOT query or modify another module's database tables directly. All access goes through exposed APIs or events.

---

## Dependency Graph

```
┌─────────────────────────────────────────────────────┐
│  Real-Time Communication Module                     │
│  (subscribes to all domain events)                  │
└───────────────┬─────────────────────────────────────┘
                │
                │ subscribes to events from all below
                ▼
┌──────────────────────────────────────────────────────┐
│  Domain Modules (No dependencies between each other  │
│  except through events)                              │
└──────────────────────────────────────────────────────┘
                │
        ┌───────┴──────┬──────────┬────────────┐
        ▼              ▼          ▼            ▼
┌──────────────┐ ┌──────────┐ ┌────────┐ ┌────────────┐
│   Session    │ │   Poll   │ │  Vote  │ │ Participant│
│ Management   │ │Mgmt      │ │  Mgmt  │ │    Mgmt    │
└──────────────┘ └────┬─────┘ └───┬────┘ └──────┬─────┘
                      │            │             │
                      │            │             │
                      └────────────┴─────────────┘
                       Query APIs for validation
                       (Session validates ownership,
                        Poll validates state,
                        Participant validates existence)
```

**Key Observations**:
- **Zero circular dependencies**: All dependency arrows point downward or horizontally (between domain modules via APIs)
- **Real-Time is a leaf consumer**: It depends on all domain modules but none depend on it
- **Session is root aggregate**: No dependencies on other domain modules
- **Poll, Vote, Participant**: May query Session for validation but don't modify it

---

## Validation Checklist

- ✅ **Module boundaries align with domain specs**: Each module maps to one bounded context (Session, Poll, Vote, Participant)
- ✅ **No circular dependencies**: Dependency graph shows one-way arrows only
- ✅ **Business logic in domain modules**: All domain rules (vote validation, poll lifecycle) are in domain modules, not Real-Time module
- ✅ **Real-time isolated**: Real-Time module has no business logic per ADR-002
- ✅ **ADR-001 compliance**: Modular Monolith structure with logical module boundaries
- ✅ **ADR-003 compliance**: Each module owns its entities, no shared database tables
- ✅ **ADR-004 compliance**: Modules can scale independently (Real-Time can scale horizontally per ADR-004)

---

## Out of Scope

This specification intentionally does NOT include:

- **Implementation code**: No folder structure, files, or code
- **Database schemas**: Entity ownership is defined, but not table structure
- **Technology choices**: Already defined in implementation-technology-stack.md
- **Configuration**: No environment variables, connection strings
- **Deployment**: No Docker, Kubernetes, or hosting decisions
- **API protocols**: REST vs GraphQL vs gRPC decided elsewhere
- **Frontend modules**: Only backend modules are in scope

---

## Assumptions

- Each module will be implemented as a separate folder/namespace within the monolithic codebase (per ADR-001)
- Domain events will use an in-process EventEmitter pattern for module communication (per implementation-technology-stack.md)
- Real-Time module will use Socket.IO for WebSocket management (per implementation-technology-stack.md)
- All modules will share the same database instance but own separate tables (per ADR-003)
- Horizontal scaling will replicate all modules together (Modular Monolith) until traffic demands separation (per ADR-004)

---

## Next Steps

After this specification is approved:

1. **Planning Phase**: Create plan.md with technical approach for implementing modules
2. **Tasks Phase**: Break down implementation into tasks (folder structure, interfaces, event definitions)
3. **Implementation Phase**: Code each module following the defined boundaries
4. **Validation Phase**: Review code for adherence to module boundaries and interaction patterns

**Note**: This specification focuses on WHAT modules exist and their responsibilities. The planning phase will define HOW to implement them.
