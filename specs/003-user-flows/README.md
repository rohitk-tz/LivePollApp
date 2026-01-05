# User Flows Index

**Feature**: 003-user-flows  
**Created**: January 3, 2026  
**Status**: Complete

## Overview

This directory contains comprehensive user flow specifications for the Live Event Polling Application from three actor perspectives: Presenter, Attendee (Participant), and Display. These flows document step-by-step human interactions, commands issued, events observed, and failure scenarios.

---

## Flow Documents

### [Presenter Flow](flows/presenter-flow.md)
The event organizer who controls the session and poll lifecycle.

**Key Flows**:
1. Create and Start a Session
2. Create and Manage Polls
3. Pause and Resume Session
4. End Session
5. Handle Multiple Polls Sequentially
6. Handle Edge Cases and Errors

**Commands**: 9 total
- Session: CreateSession, StartSession, PauseSession, ResumeSession, EndSession
- Poll: CreatePoll, UpdatePollDraft, ActivatePoll, ClosePoll

---

### [Attendee Flow](flows/attendee-flow.md)
The participant who joins a session to view polls and submit votes.

**Key Flows**:
1. Join a Session
2. Vote on Active Poll
3. Handle Poll Transitions
4. Handle Session Pause and Resume
5. Handle Disconnection and Reconnection
6. Leave Session
7. Handle Session End
8. Edge Cases and Error Scenarios

**Commands**: 4 total
- Participant: JoinSession, SubmitVote, LeaveSession, ReconnectToSession

---

### [Display Flow](flows/display-flow.md)
The passive observer showing live results on a shared screen.

**Key Flows**:
1. Initialize Display Connection
2. Observe Poll Activation
3. Observe Real-Time Vote Updates
4. Observe Poll Closure
5. Observe Session Pause and Resume
6. Observe Session End
7. Handle Connection Issues
8. Display Multiple Poll History (Optional)
9. Edge Cases and Display-Specific Scenarios

**Commands**: 0 (read-only, passive observer)

---

## Actor Comparison

| Aspect | Presenter | Attendee | Display |
|--------|-----------|----------|---------|
| **Role** | Event organizer | Participant | Passive observer |
| **Authority** | Full control | Self only | None |
| **Commands** | 9 commands | 4 commands | 0 commands |
| **Can Create Session** | ✅ Yes | ❌ No | ❌ No |
| **Can Manage Polls** | ✅ Yes | ❌ No | ❌ No |
| **Can Vote** | ❌ No | ✅ Yes | ❌ No |
| **Can Join as Participant** | Optional | ✅ Yes | ❌ N/A |
| **Observes Events** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Real-Time Updates** | ✅ Yes | ✅ Yes | ✅ Yes |

---

## Command Summary

### Session Lifecycle (Presenter Only)

```
CreateSession → StartSession → [PauseSession ⟷ ResumeSession] → EndSession
```

- **CreateSession**: Initialize new session
- **StartSession**: Open session for participants
- **PauseSession**: Temporarily suspend voting
- **ResumeSession**: Restore voting
- **EndSession**: Permanently conclude session

### Poll Management (Presenter Only)

```
CreatePoll → [UpdatePollDraft] → ActivatePoll → ClosePoll
```

- **CreatePoll**: Create poll in draft
- **UpdatePollDraft**: Edit draft poll
- **ActivatePoll**: Open poll for voting (auto-closes previous)
- **ClosePoll**: Finalize poll results

### Participant Actions (Attendee Only)

```
JoinSession → SubmitVote → [Disconnected ⟷ ReconnectToSession] → LeaveSession
```

- **JoinSession**: Connect to active session
- **SubmitVote**: Submit vote on active poll
- **ReconnectToSession**: Restore connection after disconnect
- **LeaveSession**: Depart from session

### Display Actions

**None** - Display is read-only and issues no commands.

---

## Event Flow Diagram

```
Presenter Issues Command
        ↓
System Processes (State Transition)
        ↓
Event Emitted
        ↓
┌──────────────┬───────────────┬──────────────┐
↓              ↓               ↓              ↓
Presenter   Attendee(s)     Display      Database
Observes    Observe         Observes     Records
Updates     Updates         Updates      State
```

---

## Key Principles

### 1. Presenter Authority
Only the Presenter can control session and poll lifecycle. This enforces the "Presenter Authority" constitution principle.

### 2. Attendee Participation
Attendees participate by voting and joining/leaving, but cannot influence session or poll state.

### 3. Display Passivity
Display reflects system state but cannot mutate it, aligning with "Read-Only Display" constitution principle.

### 4. Real-Time First
All actors observe events in real-time without manual refresh, supporting "Real-Time First" constitution principle.

### 5. Anonymous by Default
Attendees don't require personal data to participate, supporting "Privacy & Data Philosophy" from constitution.

### 6. Zero Vote Loss
Once accepted, votes are immutable and preserved through all state transitions, fulfilling "Zero Vote Loss" principle.

---

## Failure Scenarios Summary

### Common Failure Patterns

1. **Precondition Failures**: Command issued when preconditions not met
   - Example: CreatePoll when session not Active
   - Result: Command rejected with clear error

2. **State Transition Violations**: Attempting invalid state transitions
   - Example: StartSession when already Active
   - Result: Command rejected, state unchanged

3. **Validation Failures**: Data validation fails during processing
   - Example: SubmitVote with duplicate vote
   - Result: Vote rejected with reason code

4. **Terminal State Violations**: Attempting to transition from terminal state
   - Example: Any command on Ended session
   - Result: Rejected, terminal state immutable

5. **Connection Issues**: Network interruptions during operations
   - Result: Graceful degradation, automatic reconnection

---

## Edge Cases Documented

### Presenter Edge Cases
- Accidentally pause during active voting
- Network interruption while managing session
- Create poll in paused session
- Close poll during vote surge
- Rapid poll transitions

### Attendee Edge Cases
- Vote submitted exactly as poll closes
- Double-click vote button
- Browser crash during vote submission
- Multiple browser tabs
- Vote then session ends

### Display Edge Cases
- No active poll for extended period
- Very long poll question
- Many response options (>10)
- Zero votes on poll
- Display started mid-session
- Rapid poll transitions

---

## Validation Status

See [validation-report.md](validation-report.md) for detailed validation.

**Summary**:
- ✅ All commands exist in domain specifications
- ✅ All state transitions valid per state-machine.md
- ✅ All events correspond to domain events
- ✅ Actor separation correctly maintained
- ✅ No APIs, endpoints, or tech details mentioned
- ✅ Zero issues found

---

## Usage Guidelines

### For API Design
- Use flows to identify required API endpoints
- Map commands to HTTP methods (POST for state changes, GET for queries)
- Use events to design WebSocket/SSE streams
- Maintain actor authority in authentication/authorization

### For UI Implementation
- Follow step-by-step flows for user experience
- Display clear feedback for each action
- Handle all documented failure scenarios
- Show real-time updates based on events

### For Testing
- Test all documented flows end-to-end
- Verify all failure scenarios handled correctly
- Test edge cases to ensure robustness
- Validate actor permissions enforced

### For Documentation
- Use flows as basis for user guides
- Create separate guides per actor (Presenter, Attendee)
- Include failure scenario troubleshooting
- Reference flows in API documentation

---

## Relationship to Other Specs

These user flows build upon:

- **[001-domain-specs](../001-domain-specs/README.md)**: Entities, states, commands, and events
- **[002-state-transitions](../002-state-transitions/README.md)**: Valid and invalid state transitions
- **Constitution**: Core principles (Presenter Authority, Real-Time First, Zero Vote Loss, etc.)

---

## Next Steps

With user flows complete:
1. **API Design**: Design REST and WebSocket APIs based on commands and events
2. **UI/UX Design**: Create interface mockups following flow patterns
3. **Implementation**: Build backend and frontend following flows
4. **Testing**: Write integration tests covering all flows
5. **Documentation**: Create user guides based on flows

---

## Completeness Check

### Presenter Flows
- ✅ All session lifecycle commands covered
- ✅ All poll management commands covered
- ✅ Edge cases documented
- ✅ Failure scenarios identified

### Attendee Flows
- ✅ Join/leave flows complete
- ✅ Voting flow with validation complete
- ✅ Reconnection handling documented
- ✅ Edge cases documented

### Display Flows
- ✅ Connection and initialization covered
- ✅ All observation patterns documented
- ✅ Connection handling described
- ✅ Edge cases for display-specific issues addressed

**Status**: ✅ Complete and ready for implementation planning
