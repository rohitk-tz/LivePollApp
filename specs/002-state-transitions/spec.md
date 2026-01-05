# Feature Specification: Domain State Transitions

**Feature Branch**: `002-state-transitions`  
**Created**: January 3, 2026  
**Status**: Complete  
**Input**: User description: "Generate a DOMAIN STATE TRANSITION specification for the Live Event Polling Application"

## Overview

This specification documents all valid and invalid state transitions for the Live Event Polling Application domain model. It provides a comprehensive reference for understanding how entities transition between states in response to commands, and explicitly lists forbidden transitions to prevent invariant violations.

The specification covers:
- **Session lifecycle**: Preparing → Active ⟷ Paused → Ended
- **Poll lifecycle**: Draft → Active → Closed
- **Vote acceptance**: Pending → Accepted/Rejected
- **Participant connection**: Joining → Connected ⟷ Disconnected → Left

For the complete state transition specification, see:
- [State Machine Specification](domain/state-machine.md)

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Session Lifecycle State Transitions (Priority: P1)

A presenter manages session state through its full lifecycle while the system enforces valid transitions and rejects invalid ones.

**Why this priority**: Session is the root aggregate. Understanding its state transitions is critical for all other functionality.

**Independent Test**: Can be fully tested by attempting all valid transitions (Preparing→Active→Paused→Active→Ended) and verifying invalid transitions are rejected (e.g., Preparing→Ended, Ended→Active).

**Acceptance Scenarios**:

1. **Given** new session created, **When** StartSession command issued, **Then** session transitions from Preparing to Active
2. **Given** session in Active state, **When** PauseSession command issued, **Then** session transitions to Paused and all polls stop accepting votes
3. **Given** session in Paused state, **When** ResumeSession command issued, **Then** session returns to Active and polls resume accepting votes
4. **Given** session in Active state, **When** EndSession command issued, **Then** session transitions to Ended, all polls close, and all participants leave
5. **Given** session in Preparing state, **When** EndSession command issued, **Then** command is rejected (must be Active or Paused)
6. **Given** session in Ended state, **When** any command issued, **Then** command is rejected (Ended is terminal)

---

### User Story 2 - Poll Lifecycle State Transitions (Priority: P1)

A presenter creates polls, activates them one at a time, and closes them while the system enforces the single-active-poll constraint.

**Why this priority**: Poll state management is core functionality. The single-active-poll invariant is critical for user experience.

**Independent Test**: Can be fully tested by creating multiple polls, activating them sequentially while verifying previous poll closes automatically, and attempting invalid transitions.

**Acceptance Scenarios**:

1. **Given** active session, **When** CreatePoll command issued, **Then** poll is created in Draft state
2. **Given** poll in Draft state with ≥2 options, **When** ActivatePoll command issued, **Then** poll transitions to Active
3. **Given** one poll Active, **When** another poll is activated, **Then** first poll automatically closes and second becomes Active
4. **Given** poll in Active state, **When** ClosePoll command issued, **Then** poll transitions to Closed and stops accepting votes
5. **Given** poll in Draft state, **When** ClosePoll command issued, **Then** command is rejected (must be Active)
6. **Given** poll in Closed state, **When** ActivatePoll command issued, **Then** command is rejected (Closed is terminal)

---

### User Story 3 - Vote Validation State Transitions (Priority: P1)

A participant submits votes that transition through validation pipeline (Pending → Accepted/Rejected) based on business rules.

**Why this priority**: Vote validation is critical for data integrity. Understanding when votes are accepted vs rejected is essential.

**Independent Test**: Can be fully tested by submitting votes under various conditions (valid, duplicate, closed poll, etc.) and verifying correct state transitions.

**Acceptance Scenarios**:

1. **Given** connected participant and active poll, **When** SubmitVote command issued, **Then** vote enters Pending state
2. **Given** vote in Pending state with all validations passing, **When** ValidateVote executed, **Then** vote transitions to Accepted and increments result count
3. **Given** vote in Pending state with duplicate vote detected, **When** ValidateVote executed, **Then** vote transitions to Rejected with DUPLICATE_VOTE reason
4. **Given** vote in Pending state with poll closed, **When** ValidateVote executed, **Then** vote transitions to Rejected with POLL_CLOSED reason
5. **Given** vote in Accepted state, **When** any modification attempted, **Then** operation is rejected (Accepted is immutable)
6. **Given** vote in Rejected state, **When** acceptance attempted, **Then** operation is rejected (Rejected is terminal)

---

### User Story 4 - Participant Connection State Transitions (Priority: P2)

A participant joins, potentially disconnects, reconnects, and eventually leaves while the system maintains vote history.

**Why this priority**: Connection management impacts user experience but the core voting functionality can work with simple connect/disconnect model initially.

**Independent Test**: Can be fully tested by participant joining, disconnecting, reconnecting within grace period, and leaving while verifying vote preservation.

**Acceptance Scenarios**:

1. **Given** active session, **When** JoinSession command issued with valid code, **Then** participant transitions from Joining to Connected
2. **Given** participant in Connected state, **When** connection lost, **Then** participant transitions to Disconnected with votes preserved
3. **Given** participant in Disconnected state within grace period, **When** ReconnectToSession issued with matching ID, **Then** participant returns to Connected with vote history intact
4. **Given** participant in Disconnected state past grace period, **When** timeout occurs, **Then** participant automatically transitions to Left
5. **Given** participant in Connected state, **When** LeaveSession command issued, **Then** participant transitions to Left with votes remaining in results
6. **Given** participant in Left state, **When** rejoin attempted, **Then** operation is rejected (Left is terminal for that identity)

---

### User Story 5 - Cascade State Transitions (Priority: P2)

When certain entity state changes occur, related entities automatically cascade to appropriate states.

**Why this priority**: Cascades ensure consistency but can be partially implemented initially (e.g., manual poll closure before session end).

**Independent Test**: Can be fully tested by triggering parent state changes and verifying child entities cascade correctly.

**Acceptance Scenarios**:

1. **Given** session with active poll, **When** session transitions to Paused, **Then** poll stops accepting votes but remains Active
2. **Given** session with active polls, **When** session transitions to Ended, **Then** all polls automatically close
3. **Given** session with connected participants, **When** session transitions to Ended, **Then** all participants automatically transition to Left
4. **Given** one active poll, **When** second poll activated, **Then** first poll automatically closes before second activates
5. **Given** active poll with pending votes, **When** poll closes, **Then** pending votes complete validation before window closes

---

### Edge Cases

- **What happens when presenter attempts backward transition?** Command is rejected with precondition failure (e.g., cannot go Ended → Active)
- **What happens when multiple polls try to activate simultaneously?** System serializes activations, automatically closing previous before activating next
- **What happens when vote submitted exactly as poll closes?** Vote enters Pending state; if validation completes before closure finalizes, vote Accepted; otherwise Rejected with POLL_CLOSED
- **What happens when participant disconnects with vote in Pending?** Vote validation completes independent of participant state; vote may be Accepted
- **What happens when session paused with votes in Pending?** Pending votes complete validation; new votes rejected with SESSION_INACTIVE
- **What happens to participant vote history when they transition to Left?** All Accepted votes remain in poll results permanently
- **What happens when trying invalid transition from terminal state?** System rejects with clear error indicating state is terminal

---

## Requirements *(mandatory)*

### Functional Requirements

#### State Transition Enforcement
- **FR-001**: System MUST enforce that Session can only transition through valid paths: Preparing → Active ⟷ Paused → Ended
- **FR-002**: System MUST reject Session transitions from Ended to any other state
- **FR-003**: System MUST enforce that Poll can only transition through valid paths: Draft → Active → Closed
- **FR-004**: System MUST reject Poll transitions from Closed to any other state
- **FR-005**: System MUST enforce that Vote can only transition through valid paths: Pending → Accepted OR Pending → Rejected
- **FR-006**: System MUST reject Vote transitions from Accepted or Rejected to any other state
- **FR-007**: System MUST enforce that Participant follows valid paths: Joining → Connected ⟷ Disconnected → Left
- **FR-008**: System MUST reject Participant transitions from Left to any other state

#### Command-State Mapping
- **FR-009**: System MUST verify command preconditions match current state before executing transition
- **FR-010**: System MUST validate actor permissions before allowing state transitions
- **FR-011**: System MUST emit state transition events after successful transitions
- **FR-012**: System MUST record timestamps for all state transitions

#### Cross-Entity Dependencies
- **FR-013**: System MUST enforce that Poll can only be created/activated when Session is Active
- **FR-014**: System MUST enforce that Vote can only be submitted when Session is Active AND Poll is Active AND Participant is Connected
- **FR-015**: System MUST enforce single-active-poll constraint: only one poll Active per session at any time
- **FR-016**: System MUST enforce one-vote-per-poll constraint during Pending → Accepted transition

#### Cascade Rules
- **FR-017**: System MUST automatically close all Active polls when Session transitions to Ended
- **FR-018**: System MUST automatically transition all participants to Left when Session transitions to Ended
- **FR-019**: System MUST automatically close previously Active poll when new poll is activated
- **FR-020**: System MUST stop vote acceptance (but not cancel pending validations) when Session transitions to Paused
- **FR-021**: System MUST resume vote acceptance when Session transitions from Paused to Active

#### Invalid Transition Handling
- **FR-022**: System MUST explicitly reject attempts at backward state transitions (e.g., Active → Preparing)
- **FR-023**: System MUST explicitly reject attempts to transition from terminal states
- **FR-024**: System MUST provide clear error messages indicating why transition was rejected
- **FR-025**: System MUST maintain current state when rejecting invalid transition (no partial transitions)

#### Determinism Guarantees
- **FR-026**: System MUST produce identical state transitions given identical preconditions and commands
- **FR-027**: System MUST complete cascading transitions atomically (all or nothing)
- **FR-028**: System MUST process state transitions sequentially to avoid race conditions
- **FR-029**: System MUST maintain audit trail of all state transitions for debugging

### Key Entities

This specification enhances the existing entities defined in [001-domain-specs](../001-domain-specs/README.md) by adding:

- **Session**: Enhanced with explicit valid/invalid transition paths and cascade rules
- **Poll**: Enhanced with single-active-poll enforcement and automatic closure rules
- **Vote**: Enhanced with validation pipeline state flow and immutability enforcement
- **Participant**: Enhanced with reconnection state management and grace period handling

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All valid state transitions complete successfully when preconditions are met
- **SC-002**: All invalid state transitions are explicitly rejected with clear error messages
- **SC-003**: Terminal states (Ended, Closed, Accepted, Rejected, Left) cannot transition to any other state with 100% enforcement
- **SC-004**: Session pause immediately stops vote acceptance across all polls
- **SC-005**: Session end automatically closes all polls and transitions all participants to Left
- **SC-006**: Single-active-poll constraint is enforced with automatic closure of previous poll when new poll activates
- **SC-007**: Vote validation pipeline (Pending → Accepted/Rejected) completes within milliseconds
- **SC-008**: Participant reconnection within grace period restores Connected state with complete vote history
- **SC-009**: Cascade operations complete atomically (either all succeed or all fail)
- **SC-010**: State transitions are deterministic: same inputs always produce same outputs
- **SC-011**: All state transitions emit events for real-time propagation
- **SC-012**: Audit trail captures all state transitions with timestamps and actors for debugging
