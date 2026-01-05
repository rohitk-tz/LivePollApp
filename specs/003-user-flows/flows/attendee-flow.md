# Attendee User Flow

**Created**: January 3, 2026  
**Actor**: Attendee (Participant)  
**Status**: Draft

## Overview

An Attendee is a participant who joins a live event session to view polls and submit votes. Attendees have no control over session or poll lifecycle—they are consumers of the polling experience created by the Presenter. This document describes the step-by-step interactions an attendee performs from joining through leaving a session.

---

## Flow 1: Join a Session

### Actor
Attendee

### Preconditions
- Session exists and is in Active state
- Attendee has received session access code from Presenter

### Goal
Connect to the live polling session to participate

### Steps

1. **Initiate Join**
   - **Action**: Attendee provides session access code
   - **Command Issued**: `JoinSession`
   - **System Response**: Participant enters Joining state, validation begins
   - **Precondition Check**:
     - Session exists and is Active
     - Access code is valid
     - Participant identifier is unique within session
   - **Result**: If validation passes, participant transitions to Connected
   - **Attendee Sees**: 
     - Joining in progress indicator
     - Upon success: Session title, welcome message
     - Participant is now Connected

2. **Observe Initial State**
   - **Action**: Attendee views current session state
   - **Command Issued**: None (passive observation)
   - **Events Observed**: 
     - Current Active poll (if any)
     - Poll results (live)
   - **Result**: Attendee synchronized with session state
   - **Attendee Sees**:
     - Active poll question and options (if poll is Active)
     - Current vote results
     - No previous Closed polls visible (only current Active poll)

### Failure Scenarios

| Failure Condition | System Behavior | Attendee Experience |
|------------------|-----------------|---------------------|
| Invalid access code | JoinSession rejected | Error: invalid session code |
| Session is Preparing | JoinSession rejected | Error: session not started yet |
| Session is Paused | JoinSession rejected | Error: session temporarily unavailable |
| Session is Ended | JoinSession rejected | Error: session has concluded |
| Duplicate participant ID | JoinSession rejected | Error: identifier already in use |

### Success Criteria
- Attendee transitions from non-existent → Joining → Connected
- Session access validated
- Anonymous participation enabled (no personal data required)
- Attendee can view Active poll immediately after joining

---

## Flow 2: Vote on Active Poll

### Actor
Attendee

### Preconditions
- Attendee is Connected to session
- Session is in Active state
- Poll is in Active state
- Attendee has not already voted on this poll

### Goal
Submit a vote for the active poll and see results update

### Steps

1. **View Active Poll**
   - **Action**: Attendee sees the active poll
   - **Command Issued**: None (passive observation)
   - **System Response**: Poll question and options displayed
   - **Attendee Sees**:
     - Poll question text
     - List of response options
     - Current live results (if shown)
     - Indication whether they have already voted

2. **Select Option**
   - **Action**: Attendee chooses one response option
   - **Command Issued**: None yet (local selection)
   - **System Response**: None (client-side only)
   - **Attendee Sees**: Selected option highlighted

3. **Submit Vote**
   - **Action**: Attendee submits their vote
   - **Command Issued**: `SubmitVote`
   - **System Response**: Vote enters Pending state, validation begins
   - **Precondition Check**:
     - Attendee is Connected
     - Poll is Active
     - Session is Active
     - Attendee hasn't already voted on this poll
     - Selected option exists in poll
   - **Validation Process** (automatic, system-side):
     - Vote transitions through validation pipeline
     - If all checks pass: Vote → Accepted
     - If any check fails: Vote → Rejected
   - **Attendee Sees**: 
     - Submitting indicator
     - Within milliseconds: confirmation or error

4. **Receive Confirmation**
   - **Action**: Attendee receives vote acceptance confirmation
   - **Event Observed**: Vote accepted (implied by confirmation message)
   - **Result**: Vote counted in results immediately
   - **Attendee Sees**:
     - Success confirmation
     - Vote is locked (cannot change)
     - Results update to include their vote
     - "You voted for [Option]" indicator

5. **See Results Update**
   - **Action**: Attendee observes live results
   - **Events Observed**: `VoteAccepted` (from other participants)
   - **Result**: Result counts update in real-time
   - **Attendee Sees**:
     - Vote counts per option
     - Percentages or visual representation
     - Results change as other participants vote

### Failure Scenarios

| Failure Condition | System Behavior | Attendee Experience |
|------------------|-----------------|---------------------|
| Already voted on this poll | Vote rejected (DUPLICATE_VOTE) | Error: you've already voted on this poll |
| Poll closed before submission | Vote rejected (POLL_CLOSED) | Error: poll is no longer accepting votes |
| Session paused during submission | Vote rejected (SESSION_INACTIVE) | Error: voting temporarily unavailable |
| Invalid option selected | Vote rejected (INVALID_OPTION) | Error: invalid selection |
| Disconnected during submission | Vote enters Pending, validation may complete | Varies: may succeed if validation completes before disconnect |

### Success Criteria
- Vote transitions from non-existent → Pending → Accepted
- One-vote-per-poll constraint enforced
- Vote immutable after acceptance
- Results update immediately upon acceptance
- Clear feedback on success or failure

---

## Flow 3: Handle Poll Transitions

### Actor
Attendee

### Preconditions
- Attendee is Connected to session
- Attendee observing Active poll

### Goal
Experience smooth transitions as Presenter manages polls

### Steps

1. **Poll Closes**
   - **Action**: Presenter closes the active poll (or activates new poll)
   - **Event Observed**: `PollClosed`
   - **System Response**: Poll transitions to Closed, voting stops
   - **Attendee Sees**:
     - Poll status changes to "Closed"
     - Vote button disabled (if not yet voted)
     - Final results displayed
     - No further changes to results

2. **New Poll Activates**
   - **Action**: Presenter activates a new poll
   - **Event Observed**: `PollActivated`
   - **System Response**: New poll becomes Active
   - **Attendee Sees**:
     - Previous poll results fade/hide (optional UX)
     - New poll question and options appear
     - Fresh voting opportunity
     - Results start at zero

3. **Vote on New Poll**
   - **Action**: Attendee votes on the new active poll
   - **Command Issued**: `SubmitVote`
   - **Result**: Same flow as Flow 2 (Vote on Active Poll)
   - **Attendee Sees**: New vote submitted, results updating

### Success Criteria
- Attendee experiences seamless poll transitions
- Real-time updates when polls change
- Clear indication of poll status (Active vs Closed)
- Can vote on each new poll independently

---

## Flow 4: Handle Session Pause and Resume

### Actor
Attendee

### Preconditions
- Attendee is Connected to session
- Session is Active

### Goal
Understand behavior during session pause/resume

### Steps

1. **Session Pauses**
   - **Action**: Presenter pauses the session
   - **Event Observed**: `SessionPaused`
   - **System Response**: Session transitions to Paused
   - **Cascade Effect**: All polls stop accepting votes
   - **Attendee State**: Remains Connected
   - **Attendee Sees**:
     - Message: "Session temporarily paused"
     - Vote submission disabled
     - Can still see current poll and results
     - Maintains connection

2. **Attempt to Vote During Pause**
   - **Action**: Attendee tries to submit vote while session paused
   - **Command Issued**: `SubmitVote`
   - **System Response**: Vote rejected (SESSION_INACTIVE)
   - **Attendee Sees**: Error: voting temporarily unavailable

3. **Session Resumes**
   - **Action**: Presenter resumes the session
   - **Event Observed**: `SessionResumed`
   - **System Response**: Session transitions back to Active
   - **Cascade Effect**: Active polls resume accepting votes
   - **Attendee State**: Remains Connected
   - **Attendee Sees**:
     - Message: "Session resumed"
     - Vote submission re-enabled
     - Can now submit votes again

### Success Criteria
- Attendee remains Connected during pause
- Clear communication of paused state
- Vote attempts during pause are rejected gracefully
- Normal operation resumes after session resumed

---

## Flow 5: Handle Disconnection and Reconnection

### Actor
Attendee

### Preconditions
- Attendee is Connected to session
- Network interruption occurs

### Goal
Reconnect to session and resume participation with vote history intact

### Steps

1. **Connection Lost**
   - **Action**: Network interruption or client crash
   - **Command Issued**: None (automatic)
   - **System Response**: Participant transitions to Disconnected
   - **Participant State Change**: Connected → Disconnected
   - **Vote History**: All previously accepted votes preserved
   - **Attendee Sees**: 
     - Connection lost indicator
     - Unable to interact with session

2. **Attempt Reconnection**
   - **Action**: Attendee reconnects within grace period (e.g., 5 minutes)
   - **Command Issued**: `ReconnectToSession`
   - **System Response**: Validation of participant identifier
   - **Precondition Check**:
     - Session still Active
     - Participant identifier matches
     - Within grace period
   - **Result**: If validation passes, participant transitions back to Connected
   - **Attendee Sees**:
     - Reconnection in progress
     - Upon success: session state restored

3. **Resume Participation**
   - **Action**: Attendee continues participating
   - **System Response**: Vote history intact
   - **Attendee Sees**:
     - Current active poll
     - Previous votes still counted and visible
     - Can vote on polls they haven't voted on yet
     - Cannot re-vote on polls already voted on

### Failure Scenarios

| Failure Condition | System Behavior | Attendee Experience |
|------------------|-----------------|---------------------|
| Grace period expired | Reconnection rejected | Must rejoin as new participant (new identity) |
| Session ended during disconnect | Reconnection rejected | Session no longer available |
| Identifier mismatch | Reconnection rejected | Must rejoin as new participant |

### Success Criteria
- Disconnected participant can reconnect within grace period
- Vote history preserved across disconnection
- Same participant identity restored
- Cannot vote again on polls already voted on

---

## Flow 6: Leave Session

### Actor
Attendee

### Preconditions
- Attendee is Connected or Disconnected

### Goal
Explicitly leave the session

### Steps

1. **Leave Explicitly**
   - **Action**: Attendee chooses to leave session (closes browser, clicks leave button)
   - **Command Issued**: `LeaveSession`
   - **System Response**: Participant transitions to Left
   - **Result**: Connection terminated permanently
   - **Vote History**: All previously accepted votes remain in poll results
   - **Attendee Sees**: 
     - Leaving confirmation
     - Session disconnected

2. **Attempt to Rejoin**
   - **Action**: Attendee tries to rejoin with same identifier
   - **Command Issued**: `JoinSession` with previous identifier
   - **System Response**: Rejected (Left is terminal for that identity)
   - **Attendee Sees**: Must join as new participant with new identifier
   - **Note**: Can rejoin with new identifier (treated as new participant)

### Automatic Leave Scenarios

- **Session Ends**: All participants automatically transition to Left
- **Grace Period Expires**: Disconnected participants transition to Left after timeout

### Success Criteria
- Participant transitions to Left successfully
- Previous votes preserved in results
- Cannot rejoin with same identity (terminal state)
- Can rejoin as new participant with new identity

---

## Flow 7: Handle Session End

### Actor
Attendee

### Preconditions
- Attendee is Connected to session
- Session is Active or Paused

### Goal
Experience session conclusion gracefully

### Steps

1. **Session Ends**
   - **Action**: Presenter ends the session
   - **Event Observed**: `SessionEnded`
   - **System Response**: Session transitions to Ended
   - **Cascade Effect**: All participants automatically transition to Left
   - **Attendee Sees**:
     - Message: "Session has ended"
     - Final poll results displayed
     - Thank you message (optional)
     - No further interaction possible

2. **View Final Results (Optional)**
   - **Action**: Attendee reviews final results before leaving
   - **Command Issued**: None (read-only access may or may not be available)
   - **System Response**: Read-only view of results (if supported)
   - **Attendee Sees**: Final vote counts for all polls

3. **Automatic Disconnect**
   - **Action**: System automatically disconnects attendee
   - **System Response**: Connection terminated
   - **Attendee State**: Left
   - **Attendee Sees**: Session closed, disconnected

### Success Criteria
- Attendee notified when session ends
- Final results viewable (read-only)
- Graceful disconnection
- Cannot reconnect to ended session

---

## Flow 8: Edge Cases and Error Scenarios

### Actor
Attendee

### Goal
Understand edge case behaviors and error handling

### Edge Case Scenarios

#### Scenario A: Vote Submitted Exactly as Poll Closes
- **Action**: Attendee clicks submit just as Presenter closes poll
- **Command Issued**: `SubmitVote`
- **System Response**: 
  - If vote reaches Pending before poll closes: validation may complete, vote Accepted
  - If vote reaches system after poll closes: vote Rejected (POLL_CLOSED)
- **Attendee Sees**: Either success confirmation or "poll closed" error
- **Result**: Non-deterministic from attendee perspective (depends on timing)

#### Scenario B: Double-Click Vote Button
- **Action**: Attendee accidentally clicks vote button twice rapidly
- **Command Issued**: `SubmitVote` (twice)
- **System Response**: 
  - First vote enters Pending → Accepted
  - Second vote rejected (DUPLICATE_VOTE)
- **Attendee Sees**: Success for first vote, ignored or error for second

#### Scenario C: Browser Crash During Vote Submission
- **Action**: Browser crashes after submitting vote
- **Command Issued**: `SubmitVote` (vote may be in Pending)
- **System Response**: 
  - Vote validation completes independent of browser state
  - Vote may be Accepted even though browser crashed
- **Attendee Sees** (after restart): 
  - Upon reconnection: vote may already be recorded
  - Can check if vote was counted

#### Scenario D: Multiple Browser Tabs
- **Action**: Attendee opens session in multiple tabs with same identifier
- **System Response**: Only one connection allowed per participant identifier
- **Attendee Sees**: Second tab rejected or first tab disconnected (implementation choice)
- **Note**: Behavior may vary, but voting constraints remain enforced

#### Scenario E: Rapid Poll Transitions
- **Action**: Presenter rapidly activates multiple polls in sequence
- **Events Observed**: `PollActivated`, `PollClosed` (multiple times quickly)
- **Attendee Sees**: 
  - Polls change rapidly
  - May miss opportunity to vote if too fast
  - Each poll change is a distinct event

#### Scenario F: Vote on Poll Then Session Ends
- **Action**: Attendee has voted, then session ends before poll closes
- **System Response**: 
  - Session transitions to Ended
  - Poll automatically closes
  - Vote already Accepted remains in results
- **Attendee Sees**: 
  - Session ended message
  - Their vote is in the final results

### Success Criteria
- Edge cases handled gracefully
- Clear error messages provided
- No data corruption in edge cases
- System remains consistent

---

## Command Summary

Commands an Attendee can issue:

| Command | From State | To State | Conditions |
|---------|-----------|----------|------------|
| JoinSession | (none) | Joining → Connected | Session Active, valid code, unique ID |
| SubmitVote | (none) | Pending (vote) | Connected, Poll Active, Session Active, no duplicate |
| LeaveSession | Connected/Disconnected | Left | Participant in Connected or Disconnected |
| ReconnectToSession | Disconnected | Connected | Session Active, matching ID, within grace period |

---

## Event Summary

Events an Attendee observes:

- **ParticipantConnected**: Attendee successfully joined (self)
- **PollActivated**: New poll available for voting
- **PollClosed**: Poll finalized, no more votes
- **VoteAccepted**: Real-time results update (aggregate, not individual voters)
- **SessionPaused**: Voting temporarily stopped
- **SessionResumed**: Voting restored
- **SessionEnded**: Session concluded
- **ParticipantDisconnected**: Connection lost (self)
- **ParticipantLeft**: Permanently departed (self)

---

## Key Principles

1. **Anonymous Participation**: No personal data required, system-generated IDs
2. **One Vote Per Poll**: Enforced through validation pipeline
3. **Vote Immutability**: Cannot change vote after acceptance
4. **Real-Time Experience**: Events propagate immediately
5. **Graceful Degradation**: Disconnection doesn't lose votes
6. **Passive Role**: Attendees react to Presenter's actions, no control over session
7. **Zero Vote Loss**: Accepted votes preserved through all state transitions
