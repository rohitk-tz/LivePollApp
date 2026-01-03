# Domain Specification: Participant

**Created**: January 3, 2026  
**Status**: Draft

## Purpose

A Participant represents an attendee who joins a live event session to view polls and submit votes. The Participant maintains minimal identity information necessary for vote tracking while supporting anonymous participation as the default mode.

The Participant ensures vote uniqueness per poll and provides a consistent identity throughout the session duration without requiring personal data collection.

---

## States

A Participant progresses through the following states:

### 1. **Joining**
- Participant is in the process of connecting to a session
- Session access validation in progress
- Not yet visible in session participant list
- Cannot interact with polls

### 2. **Connected**
- Participant successfully joined the session
- Can view active polls
- Can submit votes
- Receives real-time updates
- Visible in participant count

### 3. **Disconnected**
- Participant lost connection to session
- May be temporary network interruption
- Previously submitted votes are preserved
- Can reconnect and resume participation

### 4. **Left**
- Participant explicitly left the session
- Connection permanently terminated
- Previous votes remain in results
- Cannot rejoin with same participant identity

---

## Commands

Commands that can be issued for a Participant:

### JoinSession
- **Actor**: Participant (self)
- **Preconditions**:
  - Session exists and is in Active state
  - Valid session access code provided
  - Participant identifier is unique within session
- **Effect**: Creates participant in Joining state, then transitions to Connected
- **Postconditions**: Participant associated with session, can interact with polls

### SubmitVote
- **Actor**: Participant (self)
- **Preconditions**:
  - Participant is in Connected state
  - Poll is Active
  - Participant has not already voted on this poll
- **Effect**: Creates vote associated with participant
- **Postconditions**: Vote enters validation pipeline

### LeaveSession
- **Actor**: Participant (self)
- **Preconditions**: Participant is in Connected or Disconnected state
- **Effect**: Transitions participant to Left state
- **Postconditions**: Participant no longer receives updates, connection closed

### HandleDisconnection
- **Actor**: System (automatic)
- **Preconditions**: Participant is in Connected state, connection lost
- **Effect**: Transitions participant to Disconnected state
- **Postconditions**: Participant can attempt reconnection

### ReconnectToSession
- **Actor**: Participant (self)
- **Preconditions**:
  - Participant is in Disconnected state
  - Session is still Active
  - Participant provides matching identifier and session access code
- **Effect**: Transitions participant back to Connected state
- **Postconditions**: Participant resumes receiving updates, previous vote history intact

---

## Events

Events emitted by Participant state transitions:

- **ParticipantJoining**: Participant initiated session join process
- **ParticipantConnected**: Participant successfully joined session
- **ParticipantDisconnected**: Participant lost connection
- **ParticipantReconnected**: Participant restored connection
- **ParticipantLeft**: Participant explicitly left session

---

## Invariants

Rules that must always hold true for a Participant:

1. **Unique Session Identity**: Each participant has a unique identifier within a session
2. **Session Binding**: A participant belongs to exactly one session
3. **Vote Ownership**: All votes submitted by a participant remain associated with that participant identity
4. **No Identity Transfer**: Participant identity cannot be transferred between sessions
5. **Anonymous by Default**: Participant identity does not require or store personal information
6. **Vote History Preservation**: Previous votes remain valid even after disconnection or leaving
7. **Single Connection**: A participant can have at most one active connection to a session
8. **Reconnection Continuity**: Reconnecting participant resumes same identity and vote history
9. **State Consistency**: Participant state accurately reflects connection and session status
10. **No Zombie Participants**: Disconnected participants who don't reconnect within a timeout may be transitioned to Left

---

## Business Rules

### Identity Management

- Participant identifier is generated or assigned at join time
- Identifier must be unique within the session scope
- Identifier can be:
  - System-generated anonymous ID (default)
  - User-chosen nickname (if supported and unique)
- No email, phone number, or personal identifiers required
- Participant identity is session-scoped and does not persist across sessions

### Connection Management

- Participant receives real-time updates only while in Connected state
- Disconnected participants have a grace period for reconnection (e.g., 5 minutes)
- After grace period expires, system may transition Disconnected to Left
- Reconnection requires matching the original participant identifier
- Multiple simultaneous connection attempts with same identifier are rejected

### Vote Tracking

- System maintains a list of polls voted on by each participant
- Participant can query their own vote history within session
- One-vote-per-poll constraint is enforced by checking participant's vote history
- Participant cannot see other participants' individual votes (privacy)

### Session Lifecycle Integration

- When session ends, all participants automatically transition to Left state
- Participants cannot join a session in Preparing, Paused, or Ended state
- When session is paused, Connected participants remain Connected but cannot vote

### Participation Metrics

- Session tracks count of Connected participants for presenter visibility
- Count excludes Joining, Disconnected, and Left participants
- Participant join timestamp is recorded
- Participant leave/disconnect timestamp is recorded
