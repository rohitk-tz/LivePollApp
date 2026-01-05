# Domain Specifications Index

**Feature**: 001-domain-specs  
**Created**: January 3, 2026  
**Status**: Complete

## Overview

This directory contains the domain model specifications for the Live Event Polling Application. These specifications define the core business concepts, their states, behaviors, and invariants without reference to implementation technologies.

---

## Domain Concepts

### Core Entities

1. **[Session](domain/session.md)**
   - Bounded time period for a live event
   - Contains polls and coordinates participant interactions
   - States: Preparing, Active, Paused, Ended

2. **[Poll](domain/poll.md)**
   - Question posed to participants during a session
   - Collects votes and aggregates real-time results
   - States: Draft, Active, Closed

3. **[Vote](domain/vote.md)**
   - Participant's response to a specific poll
   - Immutable once accepted
   - States: Pending, Accepted, Rejected

4. **[Participant](domain/participant.md)**
   - Attendee who joins a session to vote
   - Anonymous by default
   - States: Joining, Connected, Disconnected, Left

---

## Key Domain Rules

### From Constitution

All specifications comply with:
- **Real-Time First**: Events enable instant system-wide updates
- **Zero Vote Loss**: Accepted votes are immutable and preserved
- **Presenter Authority**: Only presenters control poll and session lifecycle
- **Anonymous Participation**: No personal data required

### Cross-Cutting Invariants

1. **Single Active Poll**: Only one poll can be Active per session at any time
2. **One Vote Per Poll**: Each participant may vote at most once per poll
3. **Closed Polls Don't Accept Votes**: Voting only possible when poll is Active
4. **Vote Immutability**: Accepted votes can never be changed or deleted
5. **Session Isolation**: Polls and votes are scoped to their session

---

## Relationships

```
Session (1) ─────→ (N) Poll
   │                    │
   │                    │
   └────→ (N) Participant
              │
              └────→ (N) Vote ←──── Poll (1)
```

- A Session contains multiple Polls
- A Session has multiple Participants
- A Poll belongs to one Session
- A Vote belongs to one Poll and one Participant
- Results are aggregated per Poll from accepted Votes

---

## State Transitions

### Session Lifecycle
```
Preparing → Active ⟷ Paused → Ended
```

### Poll Lifecycle
```
Draft → Active → Closed
```

### Vote Lifecycle
```
Pending → Accepted
        ↘ Rejected
```

### Participant Lifecycle
```
Joining → Connected ⟷ Disconnected → Left
```

---

## Validation

See [validation-report.md](validation-report.md) for detailed compliance verification against the constitution.

**Status**: ✅ All specifications pass constitution compliance checks

---

## Usage

These domain specifications serve as:
1. **Business Requirements**: What the system must do (WHAT)
2. **Validation Criteria**: Rules that must always hold true
3. **Foundation for Design**: Basis for technical planning (HOW)

**Important**: These specs intentionally exclude:
- APIs, endpoints, transport protocols
- UI designs, screens, flows
- Databases, storage mechanisms
- Technology selections

---

## Next Steps

With domain specifications complete, the next phase is:
- **Planning**: Define technical architecture, components, and implementation strategy
- **Design**: Create API contracts, data schemas, and system interactions
- **Implementation**: Build the system following these domain rules
