# Domain Specification: Poll

**Created**: January 3, 2026  
**Status**: Draft

## Purpose

A Poll represents a question posed to participants during a live event session. It collects participant responses (votes) and aggregates results in real-time for display to all session participants.

The Poll ensures that only one question is active at a time within a session and enforces voting rules according to session state and poll lifecycle.

---

## States

A Poll progresses through the following states:

### 1. **Draft**
- Initial state when poll is created
- Presenter can edit question and response options
- Not visible to participants
- No votes can be submitted

### 2. **Active**
- Poll is visible to all participants in the session
- Participants can submit votes
- Results update in real-time
- Only one poll can be Active per session at any time

### 3. **Closed**
- Poll no longer accepts votes
- Results remain visible and final
- Cannot transition back to Active
- Historical record is preserved

---

## Commands

Commands that can be issued to a Poll:

### CreatePoll
- **Actor**: Presenter
- **Preconditions**: Session exists and is in Active state
- **Effect**: Creates new poll in Draft state within the session
- **Postconditions**: Poll exists with unique identifier, associated with session

### ActivatePoll
- **Actor**: Presenter
- **Preconditions**: 
  - Poll is in Draft state
  - Session is in Active state
  - No other poll in the session is currently Active
  - Poll has at least 2 response options
- **Effect**: Transitions poll to Active state
- **Postconditions**: Poll visible to participants, votes can be submitted

### ClosePoll
- **Actor**: Presenter
- **Preconditions**: Poll is in Active state
- **Effect**: Transitions poll to Closed state
- **Postconditions**: No new votes accepted, results are final

### UpdatePollDraft
- **Actor**: Presenter
- **Preconditions**: Poll is in Draft state
- **Effect**: Modifies question text or response options
- **Postconditions**: Poll remains in Draft with updated content

---

## Events

Events emitted by Poll state transitions:

- **PollCreated**: Poll initialized with unique identifier within session
- **PollActivated**: Poll transitioned to Active, visible to participants
- **PollClosed**: Poll finalized, voting ended
- **PollDraftUpdated**: Poll question or options modified while in Draft

---

## Invariants

Rules that must always hold true for a Poll:

1. **Single Active Poll**: Only one poll can be Active within a session at any given time
2. **Immutable When Active**: Poll question and options cannot be changed once poll is Active or Closed
3. **Closed is Final**: Once Closed, a poll can never return to Active or Draft state
4. **Minimum Options**: A poll must have at least 2 response options before it can be Activated
5. **Maximum Options**: A poll may have at most a reasonable number of options (e.g., 10) to ensure usability
6. **Session Binding**: A poll belongs to exactly one session and cannot be moved to another session
7. **Presenter Authority**: Only the session presenter can issue poll lifecycle commands
8. **No Orphan Polls**: A poll cannot exist without an associated session
9. **Vote Acceptance Window**: Votes are only accepted when poll is Active AND session is Active
10. **Result Integrity**: Aggregated results must always reflect the exact count of validated votes
11. **No Retroactive Votes**: Votes submitted after poll closes must be rejected

---

## Business Rules

- Poll question must be non-empty text
- Each response option must have non-empty text label
- Response options within a poll must be uniquely identifiable
- When a poll is activated, any previously active poll in the session must be automatically closed
- Poll results aggregate as: option identifier → vote count
- Vote counts start at zero when poll is activated
- Results are recalculated in real-time as votes are received
- Poll creation timestamp must be recorded
- Poll activation timestamp must be recorded when poll becomes Active
- Poll closure timestamp must be recorded when poll is Closed
- Results are available for viewing even while poll is Active (live results)
