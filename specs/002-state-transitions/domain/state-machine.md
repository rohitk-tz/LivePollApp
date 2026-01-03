# Domain State Transition Specification

**Created**: January 3, 2026  
**Status**: Draft  
**Feature**: 002-state-transitions

## Purpose

This specification defines all valid and invalid state transitions for the Live Event Polling Application domain model. It provides a comprehensive reference for understanding how domain entities change state in response to commands, and explicitly documents forbidden transitions to prevent system invariant violations.

This specification is derived from the individual domain specifications:
- [Session Domain Spec](../001-domain-specs/domain/session.md)
- [Poll Domain Spec](../001-domain-specs/domain/poll.md)
- [Vote Domain Spec](../001-domain-specs/domain/vote.md)
- [Participant Domain Spec](../001-domain-specs/domain/participant.md)

---

## Session State Transitions

### Valid Transitions

```
[Initial] → Preparing → Active ⟷ Paused → Ended
```

#### 1. Initial → Preparing
- **Trigger**: CreateSession command
- **Actor**: Presenter
- **Preconditions**: None
- **Effect**: New session created with unique identifier
- **Invariants Enforced**: 
  - Session has unique identifier
  - Presenter is owner

#### 2. Preparing → Active
- **Trigger**: StartSession command
- **Actor**: Presenter
- **Preconditions**: Session is in Preparing state
- **Effect**: Session begins accepting participants and poll interactions
- **Invariants Enforced**:
  - Session accepts participants
  - Presenter can create/activate polls

#### 3. Active → Paused
- **Trigger**: PauseSession command
- **Actor**: Presenter
- **Preconditions**: Session is in Active state
- **Effect**: Temporarily suspends all voting and participant joins
- **Side Effects**:
  - All polls stop accepting votes (cascade)
  - Participants remain connected but cannot vote
  - No new participants can join
- **Invariants Enforced**:
  - Vote acceptance window closed for all polls
  - Presenter retains control

#### 4. Paused → Active
- **Trigger**: ResumeSession command
- **Actor**: Presenter
- **Preconditions**: Session is in Paused state
- **Effect**: Restores voting and participant interactions
- **Side Effects**:
  - Previously active polls resume accepting votes
  - Participants can submit votes again
  - Participants can join again
- **Invariants Enforced**:
  - No state changes occurred during pause (data integrity)

#### 5. Active → Ended
- **Trigger**: EndSession command
- **Actor**: Presenter
- **Preconditions**: Session is in Active state
- **Effect**: Permanently concludes session
- **Side Effects**:
  - All active polls automatically close
  - All participants transition to Left
  - Session becomes read-only
- **Invariants Enforced**:
  - All accepted votes preserved
  - Results remain viewable
  - Session data eligible for archival/deletion

#### 6. Paused → Ended
- **Trigger**: EndSession command
- **Actor**: Presenter
- **Preconditions**: Session is in Paused state
- **Effect**: Permanently concludes session from paused state
- **Side Effects**: Same as Active → Ended
- **Invariants Enforced**: Same as Active → Ended

---

### Invalid Transitions

The following state transitions are **FORBIDDEN** and must be rejected:

#### Preparing → Paused
- **Why Invalid**: Cannot pause a session that hasn't started
- **Violation**: Session lifecycle logic violation
- **Correct Path**: Preparing → Active → Paused

#### Preparing → Ended
- **Why Invalid**: Cannot end a session that hasn't started
- **Violation**: Session never served its purpose
- **Correct Path**: Preparing → Active → Ended

#### Ended → Any State
- **Why Invalid**: Session conclusion is permanent
- **Violation**: Would violate "Ended is terminal" invariant
- **Correct Path**: Create new session instead

#### Active → Preparing
- **Why Invalid**: Cannot return to preparation after going live
- **Violation**: Retroactive state violation, data consistency issues
- **Correct Path**: No valid path (backwards transition forbidden)

#### Paused → Preparing
- **Why Invalid**: Cannot return to preparation after pausing
- **Violation**: Retroactive state violation
- **Correct Path**: No valid path (backwards transition forbidden)

---

## Poll State Transitions

### Valid Transitions

```
[Initial] → Draft → Active → Closed
```

#### 1. Initial → Draft
- **Trigger**: CreatePoll command
- **Actor**: Presenter
- **Preconditions**: Session exists and is in Active state
- **Effect**: New poll created within session
- **Invariants Enforced**:
  - Poll has unique identifier
  - Poll associated with session
  - Poll not visible to participants

#### 2. Draft → Active
- **Trigger**: ActivatePoll command
- **Actor**: Presenter
- **Preconditions**:
  - Poll is in Draft state
  - Session is in Active state
  - No other poll in session is Active
  - Poll has at least 2 response options
- **Effect**: Poll becomes visible and accepts votes
- **Side Effects**:
  - If another poll was Active, it automatically closes first
  - Vote counts initialized to zero
- **Invariants Enforced**:
  - Single active poll per session
  - Poll cannot be modified after activation

#### 3. Active → Closed
- **Trigger**: ClosePoll command (explicit) OR session state change (automatic)
- **Actor**: Presenter OR System
- **Preconditions**: Poll is in Active state
- **Effect**: Poll stops accepting votes, results finalized
- **Automatic Triggers**:
  - Session transitions to Paused (poll temporarily inactive)
  - Session transitions to Ended (poll permanently closed)
  - Another poll in session is activated (single active poll rule)
- **Invariants Enforced**:
  - Results are final and immutable
  - Accepted votes preserved
  - Vote window closed

---

### Invalid Transitions

The following state transitions are **FORBIDDEN** and must be rejected:

#### Draft → Closed
- **Why Invalid**: Cannot close a poll that was never active
- **Violation**: Poll never served its purpose
- **Correct Path**: Draft → Active → Closed OR delete draft poll

#### Closed → Active
- **Why Invalid**: Cannot reactivate a closed poll
- **Violation**: Would invalidate "Closed is final" invariant
- **Violation**: Could cause vote re-submission and result manipulation
- **Correct Path**: Create new poll with same question instead

#### Closed → Draft
- **Why Invalid**: Cannot return to draft after closing
- **Violation**: Results are final, cannot edit
- **Correct Path**: No valid path (backwards transition forbidden)

#### Active → Draft
- **Why Invalid**: Cannot return to draft after activation
- **Violation**: Poll is immutable once active, participants may have voted
- **Correct Path**: Active → Closed, then create new draft

---

## Vote State Transitions

### Valid Transitions

```
[Initial] → Pending → Accepted
                   ↘ Rejected
```

#### 1. Initial → Pending
- **Trigger**: SubmitVote command
- **Actor**: Participant
- **Preconditions**:
  - Participant has joined session (Connected state)
  - Poll is in Active state
  - Session is in Active state
  - Participant has not already voted on this poll
  - Selected option exists in the poll
- **Effect**: Vote enters validation pipeline
- **Invariants Enforced**:
  - Vote associated with participant and poll
  - Vote not yet counted in results

#### 2. Pending → Accepted
- **Trigger**: ValidateVote command (automatic)
- **Actor**: System
- **Preconditions**: All validation rules pass:
  1. Session is Active
  2. Poll is Active
  3. Participant is Connected to session
  4. Selected option exists in poll
  5. No existing Accepted vote from this participant for this poll
  6. Vote submitted within poll's active window
- **Effect**: Vote counted in results immediately
- **Side Effects**:
  - Result count for selected option increments by 1
  - Real-time result update triggered
- **Invariants Enforced**:
  - Vote is immutable
  - One vote per participant per poll
  - Zero vote loss

#### 3. Pending → Rejected
- **Trigger**: ValidateVote command (automatic)
- **Actor**: System
- **Preconditions**: At least one validation rule fails
- **Effect**: Vote excluded from results, rejection reason recorded
- **Rejection Reasons**:
  - SESSION_INACTIVE: Session not in Active state
  - POLL_CLOSED: Poll not in Active state
  - INVALID_OPTION: Selected option doesn't exist
  - DUPLICATE_VOTE: Participant already voted on this poll
  - PARTICIPANT_NOT_FOUND: Participant not in session
  - TEMPORAL_VIOLATION: Vote outside poll's active window
- **Side Effects**:
  - Participant notified with rejection reason
  - Participant may retry if poll still Active
- **Invariants Enforced**:
  - Rejected votes never counted
  - Validation ensures data integrity

---

### Invalid Transitions

The following state transitions are **FORBIDDEN** and must be rejected:

#### Accepted → Rejected
- **Why Invalid**: Cannot reject a vote after acceptance
- **Violation**: Would violate "Zero Vote Loss" principle
- **Violation**: Would corrupt result counts
- **Correct Path**: No valid path (acceptance is final)

#### Rejected → Accepted
- **Why Invalid**: Cannot accept a vote after rejection
- **Violation**: Validation already determined vote invalid
- **Correct Path**: Participant must submit new vote (new Pending state)

#### Accepted → Pending
- **Why Invalid**: Cannot return vote to validation
- **Violation**: Vote is immutable after acceptance
- **Correct Path**: No valid path (acceptance is final)

#### Rejected → Pending
- **Why Invalid**: Cannot re-validate a rejected vote
- **Violation**: Rejection is final for that vote instance
- **Correct Path**: Participant submits new vote (creates new Pending)

---

## Participant State Transitions

### Valid Transitions

```
[Initial] → Joining → Connected ⟷ Disconnected → Left
                                 ↘               ↗
```

#### 1. Initial → Joining
- **Trigger**: JoinSession command
- **Actor**: Participant
- **Preconditions**:
  - Session exists and is in Active state
  - Valid session access code provided
  - Participant identifier unique within session
- **Effect**: Participant begins joining process
- **Invariants Enforced**:
  - Access validation in progress
  - Not yet visible in session

#### 2. Joining → Connected
- **Trigger**: System validation (automatic)
- **Actor**: System
- **Preconditions**: Access validation passes
- **Effect**: Participant fully joined and visible
- **Side Effects**:
  - Participant count increments
  - Participant can view active polls
  - Participant can submit votes
- **Invariants Enforced**:
  - Unique participant identity
  - Real-time updates enabled

#### 3. Connected → Disconnected
- **Trigger**: HandleDisconnection command (automatic) OR network failure
- **Actor**: System
- **Preconditions**: Connection lost
- **Effect**: Participant temporarily offline
- **Side Effects**:
  - Participant count decrements
  - Vote history preserved
  - Connection can be restored
- **Invariants Enforced**:
  - Previous votes remain valid
  - Participant identity preserved

#### 4. Disconnected → Connected
- **Trigger**: ReconnectToSession command
- **Actor**: Participant
- **Preconditions**:
  - Participant in Disconnected state
  - Session still Active
  - Matching identifier and access code provided
  - Within reconnection grace period
- **Effect**: Participant back online
- **Side Effects**:
  - Participant count increments
  - Vote history restored
  - Real-time updates resume
- **Invariants Enforced**:
  - Same participant identity
  - Vote history continuity

#### 5. Connected → Left
- **Trigger**: LeaveSession command (explicit) OR session ends (automatic)
- **Actor**: Participant OR System
- **Preconditions**: Participant in Connected or Disconnected state
- **Effect**: Permanent departure from session
- **Side Effects**:
  - Participant count decrements
  - Connection terminated
  - Previous votes preserved in results
- **Invariants Enforced**:
  - Accepted votes remain in results
  - No retroactive vote removal

#### 6. Disconnected → Left
- **Trigger**: LeaveSession command OR grace period timeout OR session ends
- **Actor**: Participant OR System
- **Preconditions**: Participant in Disconnected state
- **Effect**: Same as Connected → Left
- **Automatic Triggers**:
  - Grace period expires (e.g., 5 minutes)
  - Session transitions to Ended
- **Invariants Enforced**: Same as Connected → Left

---

### Invalid Transitions

The following state transitions are **FORBIDDEN** and must be rejected:

#### Left → Connected
- **Why Invalid**: Cannot rejoin after explicitly leaving
- **Violation**: Left is terminal for that participant identity
- **Correct Path**: Participant must join as new identity

#### Left → Disconnected
- **Why Invalid**: Cannot disconnect after leaving
- **Violation**: Left is terminal state
- **Correct Path**: No valid path (backwards transition forbidden)

#### Connected → Joining
- **Why Invalid**: Cannot return to joining after connected
- **Violation**: Participant already validated and active
- **Correct Path**: No valid path (backwards transition forbidden)

#### Disconnected → Joining
- **Why Invalid**: Cannot return to joining after disconnection
- **Violation**: Participant already validated
- **Correct Path**: Disconnected → Connected (reconnection)

---

## Cross-Entity State Dependencies

This section documents how state transitions in one entity affect or constrain transitions in related entities.

### Session → Poll Dependencies

| Session Transition | Effect on Polls |
|-------------------|----------------|
| Active → Paused | All active polls stop accepting votes (remain Active but functionally closed) |
| Paused → Active | Previously active polls resume accepting votes |
| Active → Ended | All active polls automatically close (Active → Closed) |
| Paused → Ended | All polls automatically close |

**Constraint**: Polls can only be activated when session is Active

---

### Session → Participant Dependencies

| Session Transition | Effect on Participants |
|-------------------|----------------------|
| Preparing → Active | Participants can now join |
| Active → Paused | Connected participants cannot vote; cannot join |
| Paused → Active | Connected participants can vote; can join |
| Active → Ended | All participants transition to Left |
| Paused → Ended | All participants transition to Left |

**Constraint**: Participants can only join when session is Active

---

### Session → Vote Dependencies

| Session Transition | Effect on Votes |
|-------------------|----------------|
| Active → Paused | No new votes accepted; pending votes complete validation |
| Paused → Active | Votes can be submitted again |
| Active → Ended | No new votes accepted; pending votes complete validation |

**Constraint**: Votes only accepted when session is Active

---

### Poll → Vote Dependencies

| Poll Transition | Effect on Votes |
|----------------|----------------|
| Draft → Active | Vote acceptance window opens |
| Active → Closed | Vote acceptance window closes; pending votes complete validation |

**Constraint**: Votes only accepted when poll is Active

---

### Participant → Vote Dependencies

| Participant Transition | Effect on Votes |
|----------------------|----------------|
| Connected → Disconnected | Cannot submit new votes; existing votes preserved |
| Disconnected → Connected | Can submit votes again |
| Connected → Left | Cannot submit new votes; existing votes preserved in results |

**Constraint**: Votes only accepted when participant is Connected

---

## Cascade Rules

When certain state transitions occur, they trigger automatic cascading transitions in related entities.

### Session Pause Cascade
```
Session: Active → Paused
  ↓
Poll (if Active): Functionally inactive but state remains Active
  ↓
Vote: Submissions rejected with SESSION_INACTIVE
```

### Session End Cascade
```
Session: Active/Paused → Ended
  ↓
Poll (all Active): Active → Closed
  ↓
Participant (all): Any → Left
  ↓
Vote: No new submissions accepted
```

### Poll Activation Cascade
```
Poll A: Draft → Active
  ↓ (if Poll B was Active)
Poll B: Active → Closed (automatic)
```

### Reconnection Grace Period Expiry
```
Participant: Disconnected → Left (after timeout)
  ↓
Vote: Existing votes remain in results (no cascade)
```

---

## State Transition Summary Tables

### Session States

| From State | To State | Command | Actor | Validation Required |
|-----------|----------|---------|-------|-------------------|
| (Initial) | Preparing | CreateSession | Presenter | None |
| Preparing | Active | StartSession | Presenter | Must be Preparing |
| Active | Paused | PauseSession | Presenter | Must be Active |
| Paused | Active | ResumeSession | Presenter | Must be Paused |
| Active | Ended | EndSession | Presenter | Must be Active or Paused |
| Paused | Ended | EndSession | Presenter | Must be Active or Paused |

**Invalid**: Preparing→Paused, Preparing→Ended, Ended→Any, Active→Preparing, Paused→Preparing

---

### Poll States

| From State | To State | Command | Actor | Validation Required |
|-----------|----------|---------|-------|-------------------|
| (Initial) | Draft | CreatePoll | Presenter | Session Active |
| Draft | Active | ActivatePoll | Presenter | Draft state, Session Active, No other Active poll, ≥2 options |
| Active | Closed | ClosePoll | Presenter | Must be Active |
| Active | Closed | (Auto) | System | Session paused/ended OR another poll activated |

**Invalid**: Draft→Closed, Closed→Active, Closed→Draft, Active→Draft

---

### Vote States

| From State | To State | Command | Actor | Validation Required |
|-----------|----------|---------|-------|-------------------|
| (Initial) | Pending | SubmitVote | Participant | Connected, Poll Active, Session Active, No duplicate, Valid option |
| Pending | Accepted | ValidateVote | System | All validation rules pass |
| Pending | Rejected | ValidateVote | System | At least one validation rule fails |

**Invalid**: Accepted→Rejected, Rejected→Accepted, Accepted→Pending, Rejected→Pending

---

### Participant States

| From State | To State | Command | Actor | Validation Required |
|-----------|----------|---------|-------|-------------------|
| (Initial) | Joining | JoinSession | Participant | Session Active, Valid code, Unique ID |
| Joining | Connected | (Auto) | System | Validation passes |
| Connected | Disconnected | HandleDisconnection | System | Connection lost |
| Disconnected | Connected | ReconnectToSession | Participant | Session Active, Matching ID, Within grace period |
| Connected | Left | LeaveSession | Participant | Connected or Disconnected |
| Disconnected | Left | LeaveSession | Participant | Connected or Disconnected |
| Disconnected | Left | (Auto) | System | Grace period expired OR session ended |
| Connected | Left | (Auto) | System | Session ended |

**Invalid**: Left→Connected, Left→Disconnected, Connected→Joining, Disconnected→Joining

---

## Validation Rules Summary

### Session State Validations
1. Only presenter can issue session lifecycle commands
2. State transitions must follow defined paths
3. Ended state is terminal (no further transitions)

### Poll State Validations
1. Only one poll Active per session at any time
2. Poll must have ≥2 options before activation
3. Poll immutable once Active or Closed
4. Closed state is terminal

### Vote State Validations
1. Six validation rules must pass for acceptance:
   - Session Active
   - Poll Active
   - Participant Connected
   - Valid option selected
   - No duplicate vote
   - Within temporal window
2. Accepted state is immutable and final
3. Rejected votes never counted in results

### Participant State Validations
1. Unique identifier within session scope
2. Can only join when session is Active
3. Reconnection requires matching identifier
4. Left state is terminal for that identity

---

## Determinism Guarantees

All state transitions in the Live Event Polling domain are **deterministic**:

1. **Same inputs → Same outputs**: Given identical preconditions and commands, transitions always produce the same result state
2. **No ambiguous transitions**: Each state has clearly defined valid next states
3. **Explicit rejection**: Invalid transitions are explicitly rejected, not ignored
4. **Cascade predictability**: Automatic cascades follow defined rules without ambiguity
5. **Terminal states**: Ended (Session), Closed (Poll), Accepted/Rejected (Vote), and Left (Participant) are final with no outbound transitions

This determinism ensures:
- Predictable system behavior
- Reproducible test scenarios
- Clear audit trails
- Data integrity preservation
