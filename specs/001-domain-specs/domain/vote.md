# Domain Specification: Vote

**Created**: January 3, 2026  
**Status**: Draft

## Purpose

A Vote represents a participant's response to a specific poll question. It captures the participant's choice among the available options and contributes to the aggregated poll results.

The Vote ensures that each participant can vote only once per poll and that votes are immutable once submitted, preserving data integrity and preventing vote manipulation.

---

## States

A Vote progresses through the following states:

### 1. **Pending**
- Vote has been submitted by participant
- Undergoing validation checks
- Not yet counted in poll results
- Can still be rejected if validation fails

### 2. **Accepted**
- Vote passed all validation checks
- Counted in poll results
- Immutable and permanent
- Contributes to real-time result aggregation

### 3. **Rejected**
- Vote failed validation checks
- Not counted in poll results
- Participant notified of rejection reason
- Participant may retry if poll still Active

---

## Commands

Commands that can be issued for a Vote:

### SubmitVote
- **Actor**: Participant
- **Preconditions**:
  - Participant has joined the session
  - Poll is in Active state
  - Session is in Active state
  - Participant has not already voted on this poll
  - Selected option exists in the poll
- **Effect**: Creates vote in Pending state
- **Postconditions**: Vote associated with participant, poll, and selected option

### ValidateVote
- **Actor**: System (automatic)
- **Preconditions**: Vote is in Pending state
- **Effect**: Validates vote against business rules
- **Postconditions**: Vote transitions to either Accepted or Rejected

---

## Events

Events emitted by Vote state transitions:

- **VoteSubmitted**: Participant submitted vote for validation
- **VoteAccepted**: Vote passed validation and counted in results
- **VoteRejected**: Vote failed validation with reason code

---

## Invariants

Rules that must always hold true for a Vote:

1. **One Vote Per Poll**: A participant can submit at most one Accepted vote per poll
2. **Immutability**: Once a vote reaches Accepted state, it cannot be changed or deleted
3. **No Orphan Votes**: A vote must be associated with exactly one participant, one poll, and one selected option
4. **Poll Binding**: A vote belongs to exactly one poll and cannot be transferred
5. **Participant Binding**: A vote belongs to exactly one participant and cannot be transferred
6. **Valid Option Selection**: The selected option must exist within the poll at the time of submission
7. **Temporal Validity**: Votes can only be submitted while poll is Active
8. **Zero Vote Loss**: Once Accepted, a vote must never be lost or excluded from results
9. **No Duplicate Counting**: An Accepted vote is counted exactly once in poll results
10. **Rejection is Final**: A Rejected vote cannot transition to Accepted
11. **State Finality**: Once in Accepted or Rejected state, no further transitions are possible

---

## Business Rules

### Validation Rules

A vote must pass all of the following validations to be Accepted:

1. **Session Validity**: The associated session must be in Active state
2. **Poll Validity**: The associated poll must be in Active state
3. **Participant Validity**: The participant must be registered with the session
4. **Option Validity**: The selected option must exist in the poll's option set
5. **Uniqueness**: The participant must not have an existing Accepted vote for this poll
6. **Temporal Window**: Vote submission timestamp must fall within poll's active period

### Rejection Reasons

Votes may be rejected for the following reasons:

- **SESSION_INACTIVE**: Session is not in Active state
- **POLL_CLOSED**: Poll is not in Active state (Draft or Closed)
- **INVALID_OPTION**: Selected option does not exist in poll
- **DUPLICATE_VOTE**: Participant already has an Accepted vote for this poll
- **PARTICIPANT_NOT_FOUND**: Participant is not registered with session
- **TEMPORAL_VIOLATION**: Vote submitted outside poll's active window

### Vote Recording

- Vote submission timestamp must be recorded
- Vote validation timestamp must be recorded
- Selected option identifier must be preserved
- If rejected, rejection reason must be stored
- Vote transitions through validation pipeline within milliseconds to maintain "instantaneous" user experience

### Result Aggregation

- Accepted votes immediately contribute to poll results
- Vote counts per option must always equal the total number of Accepted votes
- Results update in real-time as votes transition to Accepted state
- Rejected votes never contribute to results
