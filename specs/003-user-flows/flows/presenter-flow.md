# Presenter User Flow

**Created**: January 3, 2026  
**Actor**: Presenter  
**Status**: Draft

## Overview

The Presenter is the event organizer who controls the entire live polling session. They have exclusive authority over session lifecycle, poll creation and activation, and overall event flow. This document describes the step-by-step interactions a presenter performs from event setup through conclusion.

---

## Flow 1: Create and Start a Session

### Actor
Presenter

### Preconditions
- None (initial flow)

### Goal
Set up a new live polling session and make it ready for participants

### Steps

1. **Create Session**
   - **Action**: Presenter initiates session creation
   - **Command Issued**: `CreateSession`
   - **System Response**: Session created in Preparing state
   - **Event Observed**: `SessionCreated`
   - **Result**: Session has unique identifier and access code generated
   - **Presenter Sees**: Session details, access code to share with participants

2. **Configure Session (Optional)**
   - **Action**: Presenter sets session title or other optional settings
   - **Command Issued**: None (configuration happens in Preparing state)
   - **System Response**: Settings updated
   - **Result**: Session remains in Preparing state with updated settings

3. **Start Session**
   - **Action**: Presenter starts the session to begin accepting participants
   - **Command Issued**: `StartSession`
   - **System Response**: Session transitions from Preparing to Active
   - **Event Observed**: `SessionStarted`
   - **Result**: Participants can now join, polls can be created and activated
   - **Presenter Sees**: Session status changes to Active, participant join count begins

### Failure Scenarios

| Failure Condition | System Behavior | Presenter Experience |
|------------------|-----------------|---------------------|
| Session already exists | CreateSession rejected | Error message: cannot create duplicate |
| StartSession while Active | Command rejected | Error: session already active |
| StartSession after Ended | Command rejected | Error: cannot restart ended session |

### Success Criteria
- Session transitions from non-existent → Preparing → Active
- Access code generated and visible to presenter
- Participants can join after session started

---

## Flow 2: Create and Manage Polls

### Actor
Presenter

### Preconditions
- Session exists and is in Active state

### Goal
Create polls, activate them for voting, and close them when complete

### Steps

1. **Create Poll in Draft**
   - **Action**: Presenter creates a new poll with question and options
   - **Command Issued**: `CreatePoll`
   - **System Response**: Poll created in Draft state
   - **Event Observed**: `PollCreated`
   - **Precondition Check**: Session must be Active
   - **Result**: Poll exists but not visible to participants
   - **Presenter Sees**: Poll in draft list, can edit question/options

2. **Edit Poll (While in Draft)**
   - **Action**: Presenter modifies question text or response options
   - **Command Issued**: `UpdatePollDraft`
   - **System Response**: Poll updated, remains in Draft
   - **Event Observed**: `PollDraftUpdated`
   - **Result**: Changes saved, poll still not visible
   - **Presenter Sees**: Updated poll content

3. **Activate Poll**
   - **Action**: Presenter activates poll to begin voting
   - **Command Issued**: `ActivatePoll`
   - **System Response**: Poll transitions from Draft to Active
   - **Event Observed**: `PollActivated`
   - **Precondition Check**: 
     - Poll is in Draft state
     - Session is in Active state
     - No other poll is currently Active
     - Poll has at least 2 response options
   - **Cascade Effect**: If another poll was Active, it automatically closes first
   - **Result**: Poll visible to participants, voting opens, results begin aggregating
   - **Presenter Sees**: 
     - Poll status changes to Active
     - Previous poll (if any) shows as Closed
     - Real-time vote counts begin appearing
     - Participant count shows who can vote

4. **Monitor Live Results**
   - **Action**: Presenter observes vote counts as they come in
   - **Command Issued**: None (passive observation)
   - **Events Observed**: `VoteAccepted` (one per successful vote)
   - **Result**: Result counts update in real-time
   - **Presenter Sees**: 
     - Vote count per option incrementing
     - Total vote count
     - Percentage distribution
     - Number of Connected participants who can still vote

5. **Close Poll**
   - **Action**: Presenter closes poll to finalize results
   - **Command Issued**: `ClosePoll`
   - **System Response**: Poll transitions from Active to Closed
   - **Event Observed**: `PollClosed`
   - **Result**: Voting window closes, results finalized
   - **Presenter Sees**: 
     - Poll status changes to Closed
     - Final vote counts displayed
     - No further vote updates

### Failure Scenarios

| Failure Condition | System Behavior | Presenter Experience |
|------------------|-----------------|---------------------|
| CreatePoll when session not Active | Command rejected | Error: session must be active to create polls |
| ActivatePoll with <2 options | Command rejected | Error: poll needs at least 2 options |
| ActivatePoll while another Active | First poll auto-closes, new activates | Previous poll automatically closed (intentional) |
| ClosePoll when poll is Draft | Command rejected | Error: cannot close draft poll, must activate first |
| Edit poll after activation | Command rejected | Error: poll immutable once activated |

### Success Criteria
- Poll transitions from non-existent → Draft → Active → Closed
- Only one poll Active at any time (single-active-poll constraint enforced)
- Poll cannot be edited after activation
- Real-time results visible while Active
- Results finalized when Closed

---

## Flow 3: Pause and Resume Session

### Actor
Presenter

### Preconditions
- Session exists and is in Active state

### Goal
Temporarily suspend voting (e.g., during a break) and later resume

### Steps

1. **Pause Session**
   - **Action**: Presenter pauses the session
   - **Command Issued**: `PauseSession`
   - **System Response**: Session transitions from Active to Paused
   - **Event Observed**: `SessionPaused`
   - **Precondition Check**: Session must be in Active state
   - **Cascade Effect**: All polls stop accepting votes immediately
   - **Result**: 
     - No new votes accepted on any poll
     - Participants remain connected but cannot vote
     - No new participants can join
   - **Presenter Sees**: 
     - Session status changes to Paused
     - Vote acceptance stopped
     - Participants still connected

2. **Resume Session**
   - **Action**: Presenter resumes the session after pause
   - **Command Issued**: `ResumeSession`
   - **System Response**: Session transitions from Paused to Active
   - **Event Observed**: `SessionResumed`
   - **Precondition Check**: Session must be in Paused state
   - **Cascade Effect**: Previously active polls resume accepting votes
   - **Result**: 
     - Voting reopens on Active poll (if any)
     - Participants can submit votes again
     - New participants can join again
   - **Presenter Sees**: 
     - Session status changes to Active
     - Vote acceptance restored
     - System returns to normal operation

### Failure Scenarios

| Failure Condition | System Behavior | Presenter Experience |
|------------------|-----------------|---------------------|
| PauseSession when already Paused | Command rejected | Error: session already paused |
| PauseSession when Preparing | Command rejected | Error: session not started yet |
| ResumeSession when Active | Command rejected | Error: session already active |
| ResumeSession when Ended | Command rejected | Error: cannot resume ended session |

### Success Criteria
- Session transitions Active → Paused → Active
- Vote acceptance stops/resumes correctly
- No data loss during pause
- Participants remain connected through pause/resume cycle

---

## Flow 4: End Session

### Actor
Presenter

### Preconditions
- Session exists and is in Active or Paused state

### Goal
Permanently conclude the session, closing all polls and transitioning to read-only

### Steps

1. **End Session**
   - **Action**: Presenter ends the session
   - **Command Issued**: `EndSession`
   - **System Response**: Session transitions to Ended state
   - **Event Observed**: `SessionEnded`
   - **Precondition Check**: Session must be in Active or Paused state
   - **Cascade Effect**:
     - All Active polls automatically close
     - All participants transition to Left
     - Session becomes read-only
   - **Result**: 
     - No new polls can be created
     - No new participants can join
     - No new votes accepted
     - All results remain viewable
     - Session data eligible for archival or deletion
   - **Presenter Sees**: 
     - Session status changes to Ended
     - All polls shown as Closed
     - Final results displayed
     - Session marked as complete

2. **Review Final Results**
   - **Action**: Presenter views final results of all polls
   - **Command Issued**: None (passive observation)
   - **System Response**: Read-only access to all poll results
   - **Result**: All vote counts and percentages visible
   - **Presenter Sees**: 
     - Complete list of all polls with final results
     - Total participants who joined
     - Voting statistics per poll

### Failure Scenarios

| Failure Condition | System Behavior | Presenter Experience |
|------------------|-----------------|---------------------|
| EndSession when Preparing | Command rejected | Error: session hasn't started |
| EndSession when already Ended | Command rejected | Error: session already ended |
| Any command after Ended | Command rejected | Error: session is concluded (terminal state) |

### Success Criteria
- Session transitions to Ended state successfully
- All polls automatically close
- All participants automatically leave
- Results remain viewable in read-only mode
- No further state transitions possible (terminal state)

---

## Flow 5: Handle Multiple Polls Sequentially

### Actor
Presenter

### Preconditions
- Session exists and is in Active state

### Goal
Run multiple polls one after another during a live event

### Steps

1. **Create First Poll**
   - **Action**: Presenter creates and activates first poll
   - **Commands Issued**: `CreatePoll`, `ActivatePoll`
   - **Events Observed**: `PollCreated`, `PollActivated`
   - **Result**: First poll is Active, participants can vote
   - **Presenter Sees**: Poll 1 active, votes coming in

2. **Monitor First Poll**
   - **Action**: Presenter watches votes accumulate
   - **Events Observed**: `VoteAccepted` (multiple)
   - **Result**: Real-time vote counts update
   - **Presenter Sees**: Live results for Poll 1

3. **Transition to Second Poll**
   - **Action**: Presenter activates second poll (may close first poll manually or let auto-close happen)
   - **Commands Issued**: `CreatePoll` (Poll 2), `ActivatePoll` (Poll 2)
   - **System Response**: Poll 1 automatically closes, Poll 2 becomes Active
   - **Events Observed**: `PollClosed` (Poll 1), `PollActivated` (Poll 2)
   - **Cascade Effect**: Single-active-poll constraint enforced
   - **Result**: Poll 1 finalized, Poll 2 accepting votes
   - **Presenter Sees**: 
     - Poll 1 shows final results
     - Poll 2 now active
     - Participants can vote on Poll 2

4. **Continue Pattern**
   - **Action**: Presenter repeats process for additional polls
   - **Commands Issued**: `CreatePoll`, `ActivatePoll` (for each new poll)
   - **Result**: Sequential polling flow maintained
   - **Presenter Sees**: History of all polls with their final results

### Failure Scenarios

| Failure Condition | System Behavior | Presenter Experience |
|------------------|-----------------|---------------------|
| Try to activate two polls simultaneously | Second activation auto-closes first | First poll closes automatically (intentional behavior) |
| Try to reactivate closed poll | Command rejected | Error: closed poll cannot be reactivated |

### Success Criteria
- Multiple polls can be run sequentially
- Only one poll Active at any time
- Previous poll results preserved when moving to next poll
- Smooth transitions between polls

---

## Flow 6: Handle Edge Cases and Errors

### Actor
Presenter

### Preconditions
- Varies by scenario

### Goal
Understand how system responds to edge cases and presenter errors

### Edge Case Scenarios

#### Scenario A: Delete Draft Poll (Not in Spec - Assumption)
- **Action**: Presenter decides not to use a draft poll
- **Expected**: System should allow deletion of Draft polls (not yet specified in domain)
- **Workaround**: Leave poll in Draft, it won't affect participants
- **Note**: Deletion functionality not defined in domain specs

#### Scenario B: Accidentally Pause During Active Voting
- **Action**: Presenter hits PauseSession while votes are being submitted
- **Command Issued**: `PauseSession`
- **System Response**: 
  - Session transitions to Paused immediately
  - Pending votes complete validation
  - New vote submissions rejected with SESSION_INACTIVE
- **Result**: 
  - Votes in validation pipeline complete
  - All new votes rejected
- **Presenter Sees**: Warning that votes will stop being accepted
- **Recovery**: Issue `ResumeSession` to restore voting

#### Scenario C: Network Interruption While Managing Session
- **Action**: Presenter's connection drops temporarily
- **System Response**: 
  - Session state preserved on backend
  - Commands queued or rejected until reconnection
- **Result**: Session continues for participants (their view unaffected)
- **Presenter Sees**: 
  - Connection lost indicator
  - Upon reconnection: current session state restored
- **Note**: Presenter authority maintained on backend even during disconnect

#### Scenario D: Create Poll in Paused Session
- **Action**: Presenter tries to create poll while session paused
- **Command Issued**: `CreatePoll`
- **System Response**: Command rejected
- **Result**: No poll created
- **Presenter Sees**: Error: polls can only be created when session is Active
- **Recovery**: Resume session first, then create poll

#### Scenario E: Close Poll During Vote Surge
- **Action**: Presenter closes poll while many votes being submitted
- **Command Issued**: `ClosePoll`
- **System Response**: 
  - Poll transitions to Closed immediately
  - Pending votes in validation pipeline complete
  - New vote submissions rejected with POLL_CLOSED
- **Result**: 
  - All votes that reached Pending state before closure are validated
  - Votes submitted after closure rejected
- **Presenter Sees**: Final vote count includes all validated votes

### Success Criteria
- System handles edge cases gracefully
- Presenter receives clear error messages
- No data loss during edge cases
- Session state always consistent
- Recovery paths exist for most errors

---

## Command Summary

All commands the Presenter can issue:

| Command | From State | To State | Conditions |
|---------|-----------|----------|------------|
| CreateSession | (none) | Preparing | None |
| StartSession | Preparing | Active | Session in Preparing |
| PauseSession | Active | Paused | Session in Active |
| ResumeSession | Paused | Active | Session in Paused |
| EndSession | Active/Paused | Ended | Session in Active or Paused |
| CreatePoll | (none) | Draft | Session in Active |
| UpdatePollDraft | Draft | Draft | Poll in Draft |
| ActivatePoll | Draft | Active | Session Active, poll has ≥2 options, no other Active poll |
| ClosePoll | Active | Closed | Poll in Active |

---

## Event Summary

Events the Presenter observes:

- **SessionCreated**: New session initialized
- **SessionStarted**: Session accepting participants
- **SessionPaused**: Voting temporarily suspended
- **SessionResumed**: Voting restored
- **SessionEnded**: Session concluded
- **PollCreated**: New poll in draft
- **PollDraftUpdated**: Draft poll modified
- **PollActivated**: Poll now accepting votes
- **PollClosed**: Poll finalized
- **VoteAccepted**: Individual vote counted (aggregate only, not individual voter)
- **ParticipantJoined**: New participant connected (count only, not identity)

---

## Key Principles

1. **Presenter Authority**: Only the presenter can issue session and poll lifecycle commands
2. **Single Active Poll**: System enforces one Active poll at a time, auto-closing previous
3. **Terminal States**: Ended sessions and Closed polls cannot transition to other states
4. **Cascade Effects**: Session state changes automatically affect polls and participants
5. **Real-Time Feedback**: All events visible to presenter immediately
6. **Data Preservation**: All accepted votes and results preserved through state transitions
