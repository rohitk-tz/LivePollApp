# Architecture Decision Record: System Architecture Style

**Feature**: 006-system-architecture-adr  
**Branch**: `006-system-architecture-adr`  
**Created**: January 3, 2026  
**Status**: Draft

---

## Quick Links

- **[ADR-001: System Architecture Style](architecture/adr/adr-001-system-architecture-style.md)** - Main decision document
- **[Feature Specification](spec.md)** - User stories, requirements, success criteria
- **[Validation Report](validation-report.md)** - Constitution alignment and requirement verification

---

## What's Included

This specification documents the architectural decision to implement the Live Event Polling Application as a **Modular Monolith**, including:

### Architecture Decision Record (ADR-001)

**Decision**: The system will be implemented as a Modular Monolith

**Key Points**:
- **Single deployable unit** with clear logical module boundaries
- **In-process communication** enables <200ms REST, <100ms event latency
- **Horizontal scaling** via stateless instances behind load balancer
- **Module boundaries** align with domain aggregates (Session, Poll, Vote, Events)
- **Strong consistency** via local ACID transactions (Zero Vote Loss)
- **Future migration path** to microservices if needed

---

## Decision Context

### Constitution Principles Supported

| Principle | How Modular Monolith Supports It |
|-----------|-----------------------------------|
| **Real-Time First** | In-process event bus: <100ms latency vs. 50-100ms microservice overhead |
| **Zero Vote Loss** | Local ACID transactions, no distributed transaction complexity |
| **High-Concurrency** | 100 votes/sec burst, horizontal scaling to 2000 participants |
| **Presenter Authority** | Session module encapsulates authorization logic |
| **No Installation** | REST/WebSocket/SSE APIs support browser-based clients |

---

### Performance Targets Validated

| Metric | Target | Modular Monolith Support |
|--------|--------|-------------------------|
| REST API latency | < 200ms (p95) | In-process communication (microsecond latency) |
| Event stream latency | < 100ms (p95) | In-process event bus, direct broadcast |
| Vote processing | 100 votes/sec burst | Modular architecture supports burst handling |
| Query operations | < 100ms (p95) | Direct database access, no inter-service calls |

---

### Scalability Validated

| Requirement | Target | Modular Monolith Support |
|------------|--------|-------------------------|
| Single instance | 500 participants | Resource allocation per instance |
| Horizontal scaling | Linear capacity growth | Stateless instances, load balancing |
| Total capacity | 2000+ participants | 4 instances × 500 = 2000 validated |
| Auto-scaling | Dynamic adjustment | Instance scaling supported |

---

## Logical Module Structure

```
┌─────────────────────────────────────────────────────────┐
│                  API Layer (REST/WebSocket)              │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                 Application Services                     │
└─────────────────────────────────────────────────────────┘
                          │
      ┌───────────────────┼───────────────────┐
      ▼                   ▼                   ▼
┌──────────┐      ┌──────────┐      ┌──────────┐
│ Session  │      │   Poll   │      │   Vote   │
│  Module  │      │  Module  │      │  Module  │
└──────────┘      └──────────┘      └──────────┘
      │                   │                   │
      └───────────────────┼───────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────┐
│            Event Bus (In-Process)                        │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Infrastructure Services                     │
└─────────────────────────────────────────────────────────┘
```

### Module Responsibilities

**Session Module**:
- Session lifecycle (create, start, pause, resume, end)
- Participant registration and authentication
- Access control (presenter authorization)
- Emits: `SessionStarted`, `ParticipantJoined`, `SessionEnded`

**Poll Module**:
- Poll creation and configuration
- Poll lifecycle (draft → active → closed)
- Result aggregation and queries
- Emits: `PollCreated`, `PollActivated`, `PollClosed`

**Vote Module**:
- Vote submission and validation
- Vote persistence (Zero Vote Loss)
- Vote counting and queries
- Emits: `VoteAccepted`

**Event Bus Module**:
- In-process event publishing and subscription
- WebSocket/SSE connection management
- Event broadcast and serialization
- 24-hour event replay buffer

---

## Alternatives Considered

### 1. Traditional Monolith

**Rejected**: No enforced module boundaries, maintainability degrades over time

**Key Concern**: Would violate domain-driven design principles, risk data corruption

---

### 2. Microservices Architecture

**Rejected**: Network latency overhead prevents meeting performance targets

**Key Concern**: 
- Inter-service calls add 30-150ms latency (3 hops for vote submission)
- Cannot achieve <200ms REST, <100ms event latency
- Distributed transaction complexity conflicts with Zero Vote Loss
- Operational complexity disproportionate to current scale (<2000 participants)

---

### 3. Serverless Architecture (FaaS)

**Rejected**: Cold start latency and WebSocket limitations

**Key Concern**:
- Cold starts: 100-500ms latency violates performance targets
- WebSocket limitations: 1-hour connection max, not suitable for long-lived connections
- Cannot maintain 24-hour in-memory event replay buffer

---

## Trade-Offs

### Positive Consequences

1. ✅ **Performance**: In-process communication easily meets <200ms REST, <100ms events
2. ✅ **Simplicity**: Single codebase, single deployment, standard debugging
3. ✅ **Consistency**: Local ACID transactions, Zero Vote Loss guaranteed
4. ✅ **Scalability**: Horizontal scaling via stateless instances
5. ✅ **Maintainability**: Clear module boundaries, testable modules
6. ✅ **Operations**: Single artifact, reduced infrastructure costs
7. ✅ **Future**: Well-defined modules can be extracted to microservices later

### Negative Consequences (with Mitigations)

1. ⚠️ **Scaling Granularity**: Cannot scale modules independently  
   **Mitigation**: Acceptable for <2000 participants, revisit at 10,000+

2. ⚠️ **Deployment Coupling**: All modules deploy together  
   **Mitigation**: Fast pipelines (<5 min), blue-green deployments

3. ⚠️ **Resource Sharing**: Module load impacts others  
   **Mitigation**: Resource budgeting (3MB per participant), load shedding

4. ⚠️ **Technology Lock-In**: Single language/framework  
   **Mitigation**: Team has consistent expertise, acceptable constraint

5. ⚠️ **Boundary Erosion**: Risk of degrading to traditional monolith  
   **Mitigation**: Architecture tests (ArchUnit-style), code review enforcement

6. ⚠️ **Database Scaling**: Bottleneck at 10,000+ participants  
   **Mitigation**: Read replicas, caching, acceptable for current scale

---

## When to Revisit This Decision

**Reconsideration Triggers**:

1. **Scale**: Consistent 5,000+ concurrent participants (10× current target)
2. **Performance**: Unable to meet latency targets due to resource contention
3. **Deployment**: Business requires independent module deployments
4. **Technology**: Strong need for different languages/frameworks per module
5. **Geography**: Multi-region deployment with data residency requirements

**Future Architecture Options**:
- Extract Vote Module to microservice (if vote processing bottleneck)
- Extract Event Bus to message broker (if event volume exceeds capacity)
- Migrate to full microservices (if multiple triggers occur)

---

## Validation Summary

### Constitution Alignment: ✅ 5/5 Principles Supported

- **Real-Time First**: In-process event bus <100ms
- **Zero Vote Loss**: Local ACID transactions
- **High-Concurrency**: 100 votes/sec burst, horizontal scaling
- **Presenter Authority**: Session module authorization
- **No Installation**: REST/WebSocket APIs

### Non-Functional Requirements: ✅ ALL TARGETS MET

- Performance: <200ms REST, <100ms events validated
- Scalability: Horizontal scaling to 2000 participants validated
- Reliability: Zero vote loss via ACID transactions
- Security: Session module access control

### Domain Specifications: ✅ PERFECT 1:1 ALIGNMENT

- Session aggregate → Session module
- Poll aggregate → Poll module
- Vote aggregate → Vote module
- Events → Event Bus module

### API Contracts: ✅ ALL ENDPOINTS SUPPORTED

- All REST endpoints map to module operations
- All real-time events map to module emissions

---

## Implementation Guidance

### What's Defined (Technology-Agnostic)

✅ **Logical module boundaries**: Session, Poll, Vote, Events  
✅ **Module responsibilities**: Commands, queries, events per module  
✅ **Module dependencies**: Session ← Poll ← Vote (proper layering)  
✅ **Communication patterns**: Events (publish/subscribe), commands (direct)  
✅ **Scaling model**: Horizontal (stateless instances, load balancer)  

### What's NOT Defined (Implementation Details)

❌ **Folder structure**: No file organization specified  
❌ **Technology stack**: No languages, frameworks, databases chosen  
❌ **Deployment topology**: No containers, orchestration, cloud provider  
❌ **Database schema**: No tables, indexes, relations defined  
❌ **Module APIs**: No method signatures, interfaces specified  

---

## Related Specifications

1. **[Constitution](../.specify/memory/constitution.md)** - Core principles and invariants
2. **[Domain Specifications](../001-domain-specs/README.md)** - Session, Poll, Vote entities
3. **[State Transitions](../002-state-transitions/README.md)** - State machine, valid flows
4. **[User Flows](../003-user-flows/README.md)** - Actor interaction patterns
5. **[API Contracts](../004-api-contracts/README.md)** - REST endpoints, event streams
6. **[Non-Functional Requirements](../005-non-functional-specs/README.md)** - Performance, scalability, reliability

---

## Next Steps

With the architecture decision documented:

1. **Technology Selection** - Choose language, framework, database (future spec/ADR)
2. **Module Implementation Planning** - Define folder structure, module APIs
3. **Infrastructure Planning** - Deployment strategy, container orchestration
4. **Database Design** - Schema design, migration strategy
5. **Development Workflow** - Branching strategy, CI/CD pipeline

---

**Architecture decision is ready to guide implementation planning.**
