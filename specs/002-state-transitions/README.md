# Domain State Transitions Index

**Feature**: 002-state-transitions  
**Created**: January 3, 2026  
**Status**: Complete

## Overview

This directory contains the comprehensive state transition specification for the Live Event Polling Application domain model. It documents all valid state transitions, invalid transitions, cascade rules, and cross-entity dependencies.

---

## Contents

### Main Specification

**[State Machine Specification](domain/state-machine.md)**
- Complete documentation of all state transitions for Session, Poll, Vote, and Participant
- Valid transitions with command triggers and preconditions
- Invalid transitions with explanations
- Cross-entity dependencies and cascade rules
- Determinism guarantees

### Supporting Documentation

**[Validation Report](validation-report.md)**
- Verification that all transitions are supported by domain specifications
- Coverage analysis for all entities
- Constraint compliance validation
- Issue tracking (none found)

**[Feature Specification](spec.md)**
- User stories for state transition behaviors
- Functional requirements for enforcement
- Success criteria for validation

---

## Quick Reference

### Session State Machine

```
[Initial] → Preparing → Active ⟷ Paused → Ended
```

**Valid Commands**:
- CreateSession: Initial → Preparing
- StartSession: Preparing → Active
- PauseSession: Active → Paused
- ResumeSession: Paused → Active
- EndSession: Active/Paused → Ended

**Invalid**: Preparing→Ended, Ended→Any, backward transitions

---

### Poll State Machine

```
[Initial] → Draft → Active → Closed
```

**Valid Commands**:
- CreatePoll: Initial → Draft
- ActivatePoll: Draft → Active (auto-closes previous Active poll)
- ClosePoll: Active → Closed

**Invalid**: Draft→Closed, Closed→Active, Closed→Draft, Active→Draft

---

### Vote State Machine

```
[Initial] → Pending → Accepted
                   ↘ Rejected
```

**Valid Commands**:
- SubmitVote: Initial → Pending
- ValidateVote: Pending → Accepted OR Pending → Rejected

**Invalid**: Accepted→Rejected, Rejected→Accepted, any from terminal states

---

### Participant State Machine

```
[Initial] → Joining → Connected ⟷ Disconnected → Left
```

**Valid Commands**:
- JoinSession: Initial → Joining → Connected
- HandleDisconnection: Connected → Disconnected
- ReconnectToSession: Disconnected → Connected
- LeaveSession: Connected/Disconnected → Left

**Invalid**: Left→Any, backward to Joining

---

## Key Concepts

### Terminal States

States that cannot transition to any other state:
- **Session**: Ended
- **Poll**: Closed
- **Vote**: Accepted, Rejected
- **Participant**: Left

### Cascade Rules

Automatic state transitions triggered by parent entity changes:

1. **Session → Paused**: All polls stop accepting votes
2. **Session → Ended**: All polls close, all participants leave
3. **Poll Activation**: Previous active poll automatically closes
4. **Grace Period Expiry**: Disconnected participant becomes Left

### Cross-Entity Dependencies

- **Session Active** required for: Poll activation, Participant joining, Vote submission
- **Poll Active** required for: Vote acceptance
- **Participant Connected** required for: Vote submission

---

## Usage Guidelines

### For Implementation

1. Reference [state-machine.md](domain/state-machine.md) for authoritative state transition logic
2. Implement precondition checks before allowing transitions
3. Emit events after successful transitions for real-time updates
4. Handle cascade rules atomically (all or nothing)
5. Explicitly reject invalid transitions with clear error messages

### For Testing

1. Test all valid transitions complete successfully
2. Test all invalid transitions are rejected
3. Test cascade rules trigger correctly
4. Test terminal states cannot transition further
5. Verify determinism: same inputs → same outputs

### For Documentation

- Use state machine diagrams from this spec in technical documentation
- Reference transition tables for API contract definitions
- Use validation report to demonstrate compliance with domain rules

---

## Relationship to Other Specs

This specification builds upon and complements:
- **[001-domain-specs](../001-domain-specs/README.md)**: Defines entities, states, commands, and invariants
- **Constitution**: Ensures state transitions honor core principles (Real-Time First, Zero Vote Loss, Presenter Authority)

---

## Next Steps

With state transitions fully specified:
1. **Design Phase**: Create API contracts that expose these state transitions
2. **Implementation**: Build state machines following this specification
3. **Testing**: Validate all transitions and cascades work correctly
4. **Monitoring**: Track state transition metrics and audit trails

---

## Validation Status

✅ **All transitions validated** against domain specifications  
✅ **No issues found** in cross-references  
✅ **Constraint compliance** verified (no APIs, no UI, no tech details)  
✅ **Coverage complete**: 100% of commands mapped to transitions

**Ready for**: Planning and implementation
