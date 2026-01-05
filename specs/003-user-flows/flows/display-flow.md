# Display User Flow

**Created**: January 3, 2026  
**Actor**: Display  
**Status**: Draft

## Overview

The Display is a passive observer that shows live polling results on a shared screen (e.g., projector, large monitor) visible to all event attendees. The Display has **no control** over session or poll state—it is a read-only interface that reflects the current system state in real-time. This document describes the Display's observation patterns and the events it responds to.

---

## Flow 1: Initialize Display Connection

### Actor
Display

### Preconditions
- Session exists and has a display access token or URL
- Display device is available (projector, monitor, etc.)

### Goal
Connect the display to a session for passive observation

### Steps

1. **Connect to Session**
   - **Action**: Display is configured with session identifier or display URL
   - **Command Issued**: None (Display cannot issue commands)
   - **System Response**: Display establishes read-only connection to session
   - **Authentication**: Display-specific token (not participant or presenter)
   - **Result**: Display receives initial state and event stream
   - **Display Shows**: 
     - Session title
     - "Waiting for first poll" or current Active poll
     - Participant count (optional)

2. **Receive Initial State**
   - **Action**: Display synchronizes with current session state
   - **Events Observed**: 
     - Current session state (Active, Paused, etc.)
     - Current Active poll (if any)
     - Current vote results
   - **Result**: Display shows current state
   - **Display Shows**:
     - If no Active poll: Waiting message
     - If Active poll: Poll question, options, live results
     - Session status indicator

### Failure Scenarios

| Failure Condition | System Behavior | Display Experience |
|------------------|-----------------|-------------------|
| Invalid session identifier | Connection rejected | Error: session not found |
| Session not started (Preparing) | Connection may be rejected or show "waiting" | Display shows session not ready |
| Session ended | Connection rejected or shows "session ended" | Display shows session concluded |
| Network interruption during setup | Connection timeout | Retry mechanism needed |

### Success Criteria
- Display establishes read-only connection
- Initial state loaded and shown
- Real-time event stream begins
- No commands can be issued by Display

---

## Flow 2: Observe Poll Activation

### Actor
Display

### Preconditions
- Display is connected to Active session
- Presenter activates a poll

### Goal
Show newly activated poll and initialize results display

### Steps

1. **Poll Activation Event**
   - **Action**: Presenter activates a poll
   - **Event Observed**: `PollActivated`
   - **System Response**: Event delivered to Display
   - **Payload Received**:
     - Poll unique identifier
     - Poll question text
     - List of response options
     - Initial vote counts (all zero)
   - **Display Shows**:
     - Transition animation (optional)
     - Poll question prominently displayed
     - Response options with labels
     - Vote counts starting at zero
     - Visual representation (bars, pie chart, etc.)

2. **Clear Previous Poll (If Any)**
   - **Action**: System clears or archives previous poll display
   - **Event Observed**: Previous poll's `PollClosed` event (if applicable)
   - **Display Shows**: 
     - Previous poll fades out (optional UX)
     - New poll takes over display

### Success Criteria
- Poll activation triggers immediate display update
- Question and options clearly visible
- Results initialized to zero
- No lag in display update (real-time feel)

---

## Flow 3: Observe Real-Time Vote Updates

### Actor
Display

### Preconditions
- Display is connected to Active session
- Poll is Active
- Participants are submitting votes

### Goal
Show live vote results as they are counted

### Steps

1. **Vote Accepted Events**
   - **Action**: Participants submit votes, votes are accepted
   - **Events Observed**: `VoteAccepted` (one per vote, or aggregate updates)
   - **System Response**: Event stream delivers vote updates
   - **Payload Received**:
     - Updated vote count per option
     - Total vote count
     - Percentages (calculated client-side or provided)
   - **Display Shows**:
     - Vote count increments for selected option
     - Total count increases
     - Percentages recalculate
     - Visual representation updates (bars grow, pie slices adjust)
     - Smooth animations (optional)

2. **High-Volume Voting**
   - **Action**: Many participants vote simultaneously (voting surge)
   - **Events Observed**: Rapid `VoteAccepted` events
   - **System Response**: May batch updates for performance
   - **Display Shows**:
     - Counts update rapidly but smoothly
     - No individual vote visible (aggregate only)
     - Display remains responsive

3. **Continuous Updates**
   - **Action**: Votes continue to arrive over time
   - **Events Observed**: Ongoing `VoteAccepted` events
   - **Display Shows**: 
     - Live results continuously updating
     - "Live Results" indicator
     - No manual refresh needed

### Success Criteria
- Real-time updates feel instantaneous
- Vote counts accurate at all times
- Display handles high-volume voting without lag
- Smooth visual updates enhance experience

---

## Flow 4: Observe Poll Closure

### Actor
Display

### Preconditions
- Display is showing Active poll with live results
- Presenter closes the poll

### Goal
Show finalized results and indicate voting is complete

### Steps

1. **Poll Closed Event**
   - **Action**: Presenter closes the poll (or activates new poll, auto-closing this one)
   - **Event Observed**: `PollClosed`
   - **System Response**: Event delivered to Display
   - **Payload Received**:
     - Poll unique identifier
     - Final vote counts
     - Final percentages
   - **Display Shows**:
     - "Final Results" or "Voting Closed" indicator
     - Final vote counts (no further changes)
     - Visual indication of completion (e.g., "✓ Closed")
     - Results remain visible for a period

2. **Wait for Next Poll**
   - **Action**: Display awaits next poll activation
   - **Display Shows**:
     - Final results may remain on screen
     - Or transition to "Waiting for next poll" message
     - Or show summary screen with multiple poll results

### Success Criteria
- Poll closure immediately reflected on Display
- Clear indication that voting is complete
- Final results prominently shown
- Display ready for next poll

---

## Flow 5: Observe Session Pause and Resume

### Actor
Display

### Preconditions
- Display is connected to Active session
- Presenter pauses or resumes session

### Goal
Reflect session state changes on Display

### Steps

1. **Session Paused**
   - **Action**: Presenter pauses the session
   - **Event Observed**: `SessionPaused`
   - **System Response**: Event delivered to Display
   - **Display Shows**:
     - "Session Paused" overlay or banner
     - Current poll and results remain visible but static
     - No vote updates occur
     - Optional: Countdown or "Resume pending" message

2. **Session Resumed**
   - **Action**: Presenter resumes the session
   - **Event Observed**: `SessionResumed`
   - **System Response**: Event delivered to Display
   - **Display Shows**:
     - "Session Resumed" message (brief)
     - Pause indicator removed
     - If poll Active: live updates resume
     - Normal operation restored

### Success Criteria
- Session pause clearly communicated on Display
- Results remain visible during pause
- Resume immediately restores live updates
- No confusion about session state

---

## Flow 6: Observe Session End

### Actor
Display

### Preconditions
- Display is connected to Active or Paused session
- Presenter ends the session

### Goal
Show session conclusion and final summary

### Steps

1. **Session Ended Event**
   - **Action**: Presenter ends the session
   - **Event Observed**: `SessionEnded`
   - **System Response**: Event delivered to Display
   - **Cascade Effect**: All polls automatically close
   - **Display Shows**:
     - "Session Ended" or "Thank You" message
     - Summary of all polls and results (optional)
     - Final statistics (total participants, total votes, etc.)
     - No further updates

2. **Static Final State**
   - **Action**: Display remains showing final state
   - **Events Observed**: No further events
   - **Display Shows**:
     - Final results remain visible
     - Session concluded indicator
     - Optional: QR code or link for post-event survey

3. **Disconnect (Optional)**
   - **Action**: Display connection times out or is manually closed
   - **System Response**: Connection terminated
   - **Display Shows**: Disconnected or blank screen

### Success Criteria
- Session end clearly communicated
- Final summary visible
- No further updates expected
- Graceful conclusion of display experience

---

## Flow 7: Handle Connection Issues

### Actor
Display

### Preconditions
- Display is connected to session
- Network interruption occurs

### Goal
Handle disconnections gracefully and reconnect when possible

### Steps

1. **Connection Lost**
   - **Action**: Network interruption or server issue
   - **System Response**: Connection dropped
   - **Display Shows**:
     - "Connection lost" indicator
     - Last known state remains visible (frozen)
     - "Reconnecting..." message
     - Automatic retry mechanism

2. **Reconnection Attempt**
   - **Action**: Display attempts to reconnect automatically
   - **System Response**: 
     - If successful: resynchronizes with current state
     - If failed: continues retrying with backoff
   - **Display Shows**:
     - Reconnection attempts in progress
     - If successful: resume showing live state
     - If persistent failure: manual intervention needed

3. **State Resynchronization**
   - **Action**: Display reconnects and receives current state
   - **Events Observed**: Current session and poll state
   - **Display Shows**:
     - "Reconnected" message (brief)
     - Current poll and live results
     - Continues as if no interruption (from user perspective)

### Failure Scenarios

| Failure Condition | System Behavior | Display Experience |
|------------------|-----------------|-------------------|
| Prolonged disconnection | Repeated reconnection attempts | "Connection lost" indicator, manual refresh needed |
| Session ended during disconnect | Reconnection shows "session ended" | Display shows final state or error |
| Network totally down | No reconnection possible | Display frozen on last state |

### Success Criteria
- Connection loss detected immediately
- Automatic reconnection attempts
- State resynchronization upon reconnection
- Minimal disruption to viewing experience

---

## Flow 8: Display Multiple Poll History (Optional)

### Actor
Display

### Preconditions
- Display is connected to session
- Multiple polls have been activated and closed

### Goal
Show history of polls and results (if supported by display mode)

### Steps

1. **Accumulate Poll History**
   - **Action**: As polls close, Display stores their results
   - **Events Observed**: `PollClosed` for each poll
   - **Display Shows**:
     - Current Active poll prominently
     - Side panel or section with previous poll results
     - Scrolling summary of all polls

2. **Switch Display Modes (Optional)**
   - **Action**: Display may alternate between modes
   - **Display Modes**:
     - **Live Mode**: Current Active poll with real-time results
     - **Summary Mode**: All polls with final results
     - **Highlight Mode**: Specific poll emphasized
   - **Display Shows**: Content based on current mode

### Success Criteria
- Poll history preserved and accessible
- Multiple display modes supported (if applicable)
- Smooth transitions between modes

---

## Flow 9: Edge Cases and Display-Specific Scenarios

### Actor
Display

### Goal
Handle edge cases and display-specific situations

### Edge Case Scenarios

#### Scenario A: No Active Poll for Extended Period
- **Situation**: Session Active but no poll activated yet
- **Display Shows**:
  - "Waiting for first poll" message
  - Session title
  - Participant count (optional)
  - Event branding or graphics

#### Scenario B: Very Long Poll Question
- **Situation**: Poll question text is too long for display
- **Display Shows**:
  - Truncated text with ellipsis
  - Or scrolling text
  - Or font size adjustment to fit

#### Scenario C: Many Response Options (>10)
- **Situation**: Poll has numerous options that don't fit on screen
- **Display Shows**:
  - Scrolling or paginated view
  - Top results highlighted
  - "See more" indicator

#### Scenario D: Zero Votes on Poll
- **Situation**: Poll Active but no votes submitted yet
- **Display Shows**:
  - All options at 0 votes
  - "Waiting for votes" indicator
  - Empty visualization (bars at zero, empty pie chart)

#### Scenario E: Tie in Vote Counts
- **Situation**: Multiple options have equal vote counts
- **Display Shows**:
  - All tied options displayed equally
  - "Tie" indicator (optional)
  - No artificial winner selection

#### Scenario F: Display Started After Session Began
- **Situation**: Display connects mid-session
- **System Response**: Delivers current state
- **Display Shows**:
  - Current Active poll (if any)
  - Current results
  - Does NOT show history of previous polls (unless specifically requested)

#### Scenario G: Rapid Poll Transitions
- **Situation**: Presenter activates polls in quick succession
- **Display Shows**:
  - Smooth transitions between polls
  - Brief pause to show final results of previous poll
  - Or immediate switch if transitions very rapid

### Success Criteria
- All edge cases handled gracefully
- Display remains readable and functional
- No crashes or frozen states
- Degrades gracefully when content doesn't fit

---

## Event Summary

Events the Display observes:

- **SessionStarted**: Session begins (if Display connects during Preparing → Active)
- **SessionPaused**: Session temporarily suspended
- **SessionResumed**: Session restored to Active
- **SessionEnded**: Session concluded
- **PollActivated**: New poll available for display
- **PollClosed**: Poll finalized
- **VoteAccepted**: Real-time vote counted (aggregate updates)
- **ParticipantJoined**: Participant count increment (optional to display)
- **ParticipantLeft**: Participant count decrement (optional to display)

---

## Key Principles

1. **Read-Only**: Display cannot issue commands or mutate state
2. **Real-Time**: All updates propagate immediately to Display
3. **No Personal Data**: Display shows aggregate results only, no individual voter information
4. **Always Accurate**: Display reflects authoritative backend state
5. **Graceful Degradation**: Handles connection issues and edge cases smoothly
6. **Passive Observer**: Display reacts to Presenter's actions, no control over session
7. **Audience-Focused**: Optimized for visibility by large audience

---

## Display Data Requirements

Information the Display needs to receive:

### Session Information
- Session title
- Session state (Active, Paused, Ended)
- Total participant count (optional)

### Active Poll Information
- Poll question text
- Response options (labels and identifiers)
- Current vote count per option
- Total votes submitted
- Percentages or proportions
- Poll state (Active, Closed)

### Historical Information (Optional)
- Previous polls with final results
- Overall session statistics

### Visual Assets (Optional)
- Event branding (logos, colors)
- Custom graphics or backgrounds
- Presenter information

---

## Display Configuration Options

Potential configuration settings for Display (not commands, just passive settings):

- **Display Mode**: Live, Summary, Hybrid
- **Update Frequency**: Real-time vs batched (for performance)
- **Visual Style**: Bar chart, pie chart, list view, etc.
- **Show Participant Count**: Yes/No
- **Show Percentages**: Yes/No
- **Animation Level**: Full, Reduced, None
- **Text Size**: Adjust for screen size and viewing distance
- **Color Scheme**: Match event branding

These are configuration settings, NOT commands the Display issues. They are set by the Presenter or system administrator.

---

## Non-Functional Considerations

### Performance
- Display must handle high-frequency vote updates without lag
- Smooth animations enhance experience but must not compromise performance
- Batching updates acceptable if maintains real-time "feel"

### Reliability
- Automatic reconnection on network disruption
- Graceful degradation if connection unstable
- Last known state displayed until reconnection

### Visibility
- Large, readable text for audience viewing
- High contrast for readability
- Visual hierarchy emphasizes current poll

### Accessibility
- Color-blind friendly color schemes
- Text alternatives to visual representations
- Clear labels and indicators

---

## Summary

The Display is a critical component for the live event experience, providing a shared view of poll results visible to all attendees. Its passive, read-only nature ensures data integrity while delivering real-time feedback that enhances audience engagement. By observing events and reflecting system state accurately, the Display completes the polling experience alongside the Presenter's control and Attendees' participation.
