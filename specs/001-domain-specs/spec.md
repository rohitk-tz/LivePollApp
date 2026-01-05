# Feature Specification: Domain Model for Live Event Polling

**Feature Branch**: `001-domain-specs`  
**Created**: January 3, 2026  
**Status**: Complete  
**Input**: User description: "Generate DOMAIN specifications for the Live Event Polling Application"

## Overview

This specification defines the core domain model for the Live Event Polling Application. It establishes the business concepts, their states, behaviors, and invariants without reference to implementation technologies.

The domain model consists of four primary concepts:
- **Session**: The root aggregate representing a live event
- **Poll**: Questions posed to participants
- **Vote**: Participant responses to polls
- **Participant**: Attendees who join sessions to vote

For detailed specifications, see:
- [Session Domain Spec](domain/session.md)
- [Poll Domain Spec](domain/poll.md)
- [Vote Domain Spec](domain/vote.md)
- [Participant Domain Spec](domain/participant.md)

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Session Lifecycle Management (Priority: P1)

A presenter creates and manages a live event session through its full lifecycle, from preparation through conclusion.

**Why this priority**: Session is the root aggregate that contains all other domain concepts. Without session lifecycle management, no other features can function.

**Independent Test**: Can be fully tested by creating a session, transitioning it through all states (Preparing → Active → Paused → Active → Ended), and verifying state invariants at each transition.

**Acceptance Scenarios**:

1. **Given** no existing session, **When** presenter creates a session, **Then** session exists in Preparing state with unique identifier
2. **Given** session in Preparing state, **When** presenter starts session, **Then** session transitions to Active state and participants can join
3. **Given** session in Active state, **When** presenter pauses session, **Then** session transitions to Paused state and no votes are accepted
4. **Given** session in Paused state, **When** presenter resumes session, **Then** session returns to Active state and voting resumes
5. **Given** session in Active state, **When** presenter ends session, **Then** session transitions to Ended state and becomes read-only

---

### User Story 2 - Poll Creation and Activation (Priority: P1)

A presenter creates polls with multiple response options and activates them for participant voting, ensuring only one poll is active at a time.

**Why this priority**: Polls are the primary mechanism for audience interaction. This is core functionality without which the application has no purpose.

**Independent Test**: Can be fully tested by creating multiple polls in draft, activating them one at a time, verifying single-active-poll invariant, and closing polls.

**Acceptance Scenarios**:

1. **Given** active session, **When** presenter creates poll with question and options, **Then** poll exists in Draft state
2. **Given** poll in Draft state with at least 2 options, **When** presenter activates poll, **Then** poll becomes Active and visible to participants
3. **Given** one active poll, **When** presenter activates another poll, **Then** previous poll automatically closes and new poll becomes Active
4. **Given** active poll, **When** presenter closes poll, **Then** poll transitions to Closed state and stops accepting votes
5. **Given** poll in Draft state, **When** presenter updates question or options, **Then** changes are saved and poll remains in Draft

---

### User Story 3 - Participant Voting (Priority: P1)

A participant joins a session and submits votes on active polls, with each vote validated and counted exactly once per poll.

**Why this priority**: Voting is the core user interaction. Without reliable voting, the system fails its primary purpose.

**Independent Test**: Can be fully tested by having a participant join, submit votes to active polls, verify one-vote-per-poll constraint, and confirm votes are immutable.

**Acceptance Scenarios**:

1. **Given** active session with access code, **When** participant joins session, **Then** participant transitions to Connected state
2. **Given** connected participant and active poll, **When** participant submits vote for an option, **Then** vote is validated and transitions to Accepted state
3. **Given** participant has voted on poll, **When** participant attempts second vote on same poll, **Then** vote is rejected with DUPLICATE_VOTE reason
4. **Given** accepted vote, **When** poll results are viewed, **Then** vote is counted exactly once in results
5. **Given** active poll, **When** participant submits vote for non-existent option, **Then** vote is rejected with INVALID_OPTION reason

---

### User Story 4 - Real-Time Result Aggregation (Priority: P2)

As votes are submitted and accepted, poll results are aggregated in real-time and reflect only validated votes.

**Why this priority**: Real-time feedback is a core value proposition, but the system can function (albeit less effectively) with delayed results.

**Independent Test**: Can be fully tested by submitting votes from multiple participants and verifying result counts update immediately to match accepted vote count.

**Acceptance Scenarios**:

1. **Given** active poll with zero votes, **When** vote is accepted, **Then** result count for selected option increases by 1
2. **Given** multiple participants voting concurrently, **When** votes are accepted, **Then** results reflect exact count of all accepted votes
3. **Given** rejected vote, **When** results are viewed, **Then** rejected vote is not included in counts
4. **Given** closed poll, **When** results are viewed, **Then** results show final counts from all accepted votes

---

### User Story 5 - Participant Reconnection (Priority: P2)

A participant who loses connection can reconnect to the session and resume participation with their vote history intact.

**Why this priority**: Network reliability is important for user experience but not critical for core voting functionality. Initial connection is sufficient for MVP.

**Independent Test**: Can be fully tested by connecting participant, disconnecting them, reconnecting with same identifier, and verifying vote history is preserved.

**Acceptance Scenarios**:

1. **Given** connected participant, **When** connection is lost, **Then** participant transitions to Disconnected state
2. **Given** disconnected participant, **When** participant reconnects with matching identifier, **Then** participant returns to Connected state with previous vote history
3. **Given** participant voted before disconnection, **When** participant reconnects, **Then** previously submitted votes remain valid and counted
4. **Given** disconnected participant exceeds grace period, **When** timeout occurs, **Then** participant transitions to Left state

---

### User Story 6 - Anonymous Participation (Priority: P3)

Participants can join and vote without providing personal information, using system-generated anonymous identifiers.

**Why this priority**: While important for privacy, the system can function with other identifier schemes. Anonymous-by-default can be ensured in initial implementation without complex requirements.

**Independent Test**: Can be fully tested by joining session without providing personal data and verifying system generates unique anonymous identifier.

**Acceptance Scenarios**:

1. **Given** participant attempts to join session, **When** no personal data is provided, **Then** system generates anonymous unique identifier
2. **Given** participant with anonymous ID, **When** participant submits vote, **Then** vote is associated with anonymous ID only
3. **Given** multiple participants, **When** each joins without personal data, **Then** each receives unique anonymous identifier

---

### Edge Cases

- **What happens when session is paused?** All polls within session immediately stop accepting votes; participants remain connected but interactions are disabled
- **What happens when poll is closed while votes are pending validation?** Pending votes in validation pipeline are completed; new vote submissions are rejected with POLL_CLOSED
- **What happens when participant attempts to vote on inactive poll?** Vote is rejected with POLL_CLOSED reason before reaching Pending state
- **What happens when two polls are activated simultaneously?** System enforces sequential activation; second activation automatically closes first poll before activating
- **What happens when session ends with active polls?** All active polls automatically transition to Closed state
- **What happens when presenter attempts invalid state transition?** Command is rejected and session remains in current state
- **What happens to votes when participant leaves session?** Participant's previously accepted votes remain in poll results; no retroactive removal

---

## Requirements *(mandatory)*

### Functional Requirements

#### Session Management
- **FR-001**: System MUST support creating sessions with unique identifiers
- **FR-002**: System MUST enforce that only the presenter can manage session lifecycle (start, pause, resume, end)
- **FR-003**: System MUST prevent participants from joining sessions that are not in Active state
- **FR-004**: System MUST transition session state only through valid paths (no skipping states)
- **FR-005**: System MUST prevent Ended sessions from transitioning to any other state
- **FR-006**: System MUST automatically affect all polls when session state changes (e.g., pausing session pauses all polls)

#### Poll Management
- **FR-007**: System MUST enforce that only one poll can be Active per session at any time
- **FR-008**: System MUST require polls to have at least 2 response options before activation
- **FR-009**: System MUST prevent modifications to poll question or options once poll is Active or Closed
- **FR-010**: System MUST prevent Closed polls from accepting votes
- **FR-011**: System MUST automatically close previously active poll when activating a new poll
- **FR-012**: System MUST allow presenters to create, activate, and close polls

#### Vote Processing
- **FR-013**: System MUST validate all votes before acceptance
- **FR-014**: System MUST enforce one vote per participant per poll constraint
- **FR-015**: System MUST reject votes for non-existent poll options
- **FR-016**: System MUST reject votes when poll is not Active
- **FR-017**: System MUST reject votes when session is not Active
- **FR-018**: System MUST make accepted votes immutable (no changes or deletions)
- **FR-019**: System MUST never lose, duplicate, or alter accepted votes
- **FR-020**: System MUST exclude rejected votes from poll results

#### Participant Management
- **FR-021**: System MUST generate unique anonymous identifiers for participants by default
- **FR-022**: System MUST not require personal data for participation
- **FR-023**: System MUST preserve vote history when participant reconnects
- **FR-024**: System MUST prevent duplicate participant identifiers within a session
- **FR-025**: System MUST allow participant reconnection within grace period after disconnection

#### Real-Time Updates
- **FR-026**: System MUST emit events for all state transitions
- **FR-027**: System MUST aggregate poll results in real-time as votes are accepted
- **FR-028**: System MUST ensure result counts exactly match accepted vote counts
- **FR-029**: System MUST complete vote validation within milliseconds to maintain instantaneous feel

#### Data Integrity
- **FR-030**: System MUST ensure each entity is in only one state at any time
- **FR-031**: System MUST prevent orphaned entities (votes without polls, polls without sessions, etc.)
- **FR-032**: System MUST record timestamps for all state transitions
- **FR-033**: System MUST maintain audit trail of session and poll lifecycle events

### Key Entities

- **Session**: Root aggregate representing a live event; contains unique identifier, presenter reference, state, creation timestamp, access code, and optional title; aggregates polls and participants
- **Poll**: Question with response options; contains unique identifier, session reference, question text, option list, state, and timestamps; aggregates votes
- **Vote**: Participant response; contains unique identifier, poll reference, participant reference, selected option, state, submission timestamp, validation timestamp, and optional rejection reason
- **Participant**: Attendee identity; contains unique identifier, session reference, state, join timestamp, anonymous-by-default identifier, and vote history references

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Presenters can create and manage session lifecycle (create, start, pause, resume, end) with clear state transitions visible
- **SC-002**: Presenters can create polls and activate them with automatic enforcement of single-active-poll constraint
- **SC-003**: Participants can join sessions using access code without providing personal information
- **SC-004**: Participants can submit votes that are validated and accepted within milliseconds (instantaneous feel)
- **SC-005**: Vote uniqueness constraint (one vote per participant per poll) is enforced with 100% accuracy
- **SC-006**: Accepted votes are never lost, duplicated, or altered across session lifecycle including pause/resume
- **SC-007**: Poll results accurately reflect the exact count of accepted votes at all times
- **SC-008**: Rejected votes are never included in poll result counts
- **SC-009**: Participants can reconnect after network interruption with vote history intact
- **SC-010**: System prevents all invalid state transitions (e.g., activating multiple polls, voting on closed polls)
- **SC-011**: All domain invariants hold true under normal and edge case conditions (tested via acceptance scenarios)
- **SC-012**: Session, poll, vote, and participant state machines follow deterministic paths with no ambiguous transitions

