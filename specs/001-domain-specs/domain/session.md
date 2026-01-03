# Domain Specification: Session

**Created**: January 3, 2026  
**Status**: Draft

## Purpose

A Session represents a bounded time period during which a presenter conducts a live event with participants. It acts as the root aggregate that contains all polls and coordinates participant interactions within a specific event context.

The Session ensures that polls and votes are isolated to a specific event and provides lifecycle management for the entire polling experience.

---

## States

A Session progresses through the following states:

### 1. **Preparing**
- Initial state when session is created
- Presenter can configure session settings
- No participants can join yet
- No polls are visible to participants

### 2. **Active**
- Session is live and accepting participants
- Participants can join and view active polls
- Presenter can create, activate, and manage polls
- All real-time interactions are enabled

### 3. **Paused**
- Session temporarily suspends new participant joins
- Existing participants remain connected
- No new votes are accepted on any polls
- Presenter retains full control

### 4. **Ended**
- Session has concluded
- No new participants can join
- No new votes accepted
- Results remain viewable (read-only)
- Session data eligible for archival or deletion

---

## Commands

Commands that can be issued to a Session:

### CreateSession
- **Actor**: Presenter
- **Preconditions**: None
- **Effect**: Creates a new session in Preparing state
- **Postconditions**: Session exists with unique identifier, presenter is owner

### StartSession
- **Actor**: Presenter
- **Preconditions**: Session is in Preparing state
- **Effect**: Transitions session to Active state
- **Postconditions**: Session accepts participants and poll interactions

### PauseSession
- **Actor**: Presenter
- **Preconditions**: Session is in Active state
- **Effect**: Transitions session to Paused state
- **Postconditions**: All polls become temporarily inactive, no votes accepted

### ResumeSession
- **Actor**: Presenter
- **Preconditions**: Session is in Paused state
- **Effect**: Transitions session to Active state
- **Postconditions**: Previously active polls resume accepting votes

### EndSession
- **Actor**: Presenter
- **Preconditions**: Session is in Active or Paused state
- **Effect**: Transitions session to Ended state
- **Postconditions**: All polls closed, session read-only, no new interactions possible

### JoinSession
- **Actor**: Participant
- **Preconditions**: Session is in Active state, participant has valid session access code
- **Effect**: Associates participant with session
- **Postconditions**: Participant can view and interact with active polls

---

## Events

Events emitted by Session state transitions:

- **SessionCreated**: Session initialized with unique identifier
- **SessionStarted**: Session transitioned to Active, participants can join
- **SessionPaused**: Session temporarily suspended
- **SessionResumed**: Session returned to Active from Paused
- **SessionEnded**: Session concluded, all activity ceased
- **ParticipantJoined**: New participant associated with session

---

## Invariants

Rules that must always hold true for a Session:

1. **Single Active State**: A session can only be in one state at any time
2. **Presenter Authority**: Only the designated presenter can issue session lifecycle commands
3. **Sequential State Transitions**: State transitions must follow defined paths (cannot skip states)
4. **No Retroactive Changes**: Once Ended, a session cannot transition to any other state
5. **Participant Isolation**: Participants from one session cannot interact with polls from another session
6. **Active Session Requirement**: Participants can only join when session is Active
7. **Poll Inheritance**: All polls within a session are automatically affected by session state (e.g., paused session pauses all polls)
8. **Unique Session Identity**: Each session has a globally unique identifier
9. **Presenter Ownership**: A session has exactly one presenter who created it
10. **Zero Data Loss**: Once a session reaches Active state, all accepted votes must be preserved even after session ends

---

## Business Rules

- Session access code must be generated and remain constant throughout session lifecycle
- Session may optionally have a human-readable title for display purposes
- Session creation timestamp must be recorded
- Session state transitions must be logged for audit purposes
- When session is paused, all participant connections remain open but interactions are disabled
- Session end time is recorded when EndSession command is executed
