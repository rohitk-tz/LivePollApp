# ADR-001: System Architecture Style

**Status**: Accepted  
**Date**: January 3, 2026  
**Decision-Makers**: Architecture Team  
**Consulted**: Development Team, Operations Team

---

## Context

The Live Event Polling Application requires an architectural style that satisfies several competing requirements:

### Constitution Principles

1. **Real-Time First**: All participant actions must be reflected system-wide in near real-time without manual refresh
2. **Zero Vote Loss**: Once a vote is accepted, it must never be lost, duplicated, or altered
3. **High-Concurrency**: The system must support voting bursts when polls activate (400+ participants voting within 10 seconds)
4. **Presenter Authority**: The presenter exclusively controls poll lifecycle and session state
5. **No Installation Required**: Browser-based participation without application downloads

### Non-Functional Requirements

**Performance Targets**:
- REST API latency: < 200ms (p95) for all commands
- Event stream latency: < 100ms (p95) for real-time broadcasts
- Vote processing: 100 votes/second burst capacity
- Query operations: < 100ms (p95) for read-only requests

**Scalability Targets**:
- Single instance: 500 concurrent participants
- Horizontal scaling: Linear capacity growth (N instances = N × 500 capacity)
- Total capacity: 2000+ concurrent participants across instances
- Auto-scaling: Dynamic capacity adjustment based on load

**Reliability Targets**:
- Uptime: 99.9% during event hours
- Vote durability: Zero data loss for accepted votes
- Recovery: 10-second RTO for process crashes
- Event replay: 24-hour buffer for client reconnection

### Domain Characteristics

**Core Entities**:
- **Session**: Event container with lifecycle (Draft → Active → Paused → Ended)
- **Poll**: Question with options, states (Draft → Active → Closed), presenter-controlled
- **Vote**: Participant's choice on a poll, immutable once accepted
- **Participant**: Anonymous actor joining session, identified by token

**Domain Properties**:
- Well-defined aggregate boundaries (Session aggregates Polls, Poll aggregates Votes)
- Strong consistency requirements within aggregates (Zero Vote Loss)
- Event-driven communication across aggregates (Real-Time First)
- Relatively stable domain model with low churn

### Technical Constraints

- Initial deployment: Single region, <2000 participants
- Development team: Stronger expertise in monolithic architectures than distributed systems
- Operational complexity: Limited DevOps resources for initial launch
- Time to market: MVP needed within 3-6 months
- Real-time requirements: WebSocket/SSE connections for event streaming

---

## Decision

**We will implement the Live Event Polling Application as a Modular Monolith.**

### Definition

A **Modular Monolith** is a single deployable unit organized into logical modules with:

1. **Clear Module Boundaries**: Each module encapsulates a domain aggregate with well-defined public interfaces
2. **Module Independence**: Modules communicate through defined contracts (domain events, service interfaces)
3. **Shared Infrastructure**: Single process with shared database, event bus, and runtime
4. **Deployment Unity**: All modules deploy together as one artifact
5. **Horizontal Scalability**: Multiple instances of the entire monolith behind a load balancer

### Logical Module Structure

```
┌─────────────────────────────────────────────────────────┐
│                  API Layer (REST/WebSocket)              │
│  - HTTP endpoints (commands, queries)                    │
│  - WebSocket/SSE event streams                          │
│  - Request validation, response formatting              │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                 Application Services                     │
│  - Use case orchestration                               │
│  - Cross-module workflows                               │
│  - Transaction boundaries                               │
└─────────────────────────────────────────────────────────┘
                          │
      ┌───────────────────┼───────────────────┐
      ▼                   ▼                   ▼
┌──────────┐      ┌──────────┐      ┌──────────┐
│ Session  │      │   Poll   │      │   Vote   │
│  Module  │      │  Module  │      │  Module  │
│          │      │          │      │          │
│ - Create │      │ - Create │      │ - Submit │
│ - Start  │      │ - Activate│     │ - Validate│
│ - Join   │      │ - Close  │      │ - Count  │
│ - End    │      │ - Results│      │ - Query  │
└──────────┘      └──────────┘      └──────────┘
      │                   │                   │
      └───────────────────┼───────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  Event Bus (In-Process)                  │
│  - Domain event publishing                              │
│  - Event subscriptions                                  │
│  - WebSocket/SSE broadcast                              │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Infrastructure Services                     │
│  - Data persistence                                     │
│  - Event storage                                        │
│  - Connection management                                │
│  - Authorization                                        │
└─────────────────────────────────────────────────────────┘
```

### Module Responsibilities

**Session Module**:
- Session lifecycle management (create, start, pause, resume, end)
- Participant registration and token validation
- Session access control (access codes, presenter authorization)
- Emits: `SessionStarted`, `SessionPaused`, `SessionResumed`, `SessionEnded`, `ParticipantJoined`

**Poll Module**:
- Poll creation and configuration (question, options, settings)
- Poll lifecycle transitions (draft → active → closed)
- Poll result aggregation and queries
- Depends on: Session module (session existence validation)
- Emits: `PollCreated`, `PollActivated`, `PollClosed`

**Vote Module**:
- Vote submission and validation (poll active, duplicate prevention)
- Vote persistence (Zero Vote Loss guarantee)
- Vote counting and result queries
- Depends on: Poll module (poll state validation), Session module (participant authentication)
- Emits: `VoteAccepted`

**Event Bus Module**:
- In-process event publishing and subscription
- WebSocket/SSE connection management
- Event serialization and broadcast
- Event replay buffer (24-hour retention)

### Module Communication Rules

1. **Commands**: Application services orchestrate cross-module commands
2. **Queries**: Modules expose query interfaces for read operations
3. **Events**: Modules publish domain events, other modules subscribe
4. **Dependencies**: Allowed Session ← Poll ← Vote, forbidden Vote → Session (skip levels)

---

## Alternatives Considered

### Alternative 1: Traditional Monolith (Single-Layer Architecture)

**Description**: Single codebase without enforced module boundaries, all code can access any other code directly.

**Pros**:
- Simplest to build initially (no architectural overhead)
- Fastest development for small features (no interface contracts)
- Single deployment artifact
- Easy debugging (entire stack in one process)

**Cons**:
- **High coupling risk**: Without boundaries, code becomes entangled over time
- **Difficult testing**: Cannot test modules in isolation, requires full system
- **Poor scalability**: Impossible to scale specific functionality independently
- **Maintainability degrades**: Changes in one area impact unrelated areas ("shotgun surgery")
- **Violates domain model**: No enforcement of aggregate boundaries, risks data corruption

**Evaluation Against Requirements**:
- ✅ Meets performance targets (in-process communication)
- ❌ **Fails maintainability**: Will become unmaintainable as team/codebase grows
- ⚠️ Meets scalability (horizontal scaling possible but entire codebase scales together)
- ❌ **Fails architectural principles**: No encapsulation, violates Domain-Driven Design

**Decision**: **Rejected** due to maintainability concerns and lack of enforced boundaries.

---

### Alternative 2: Microservices Architecture

**Description**: Decompose system into independent services (Session Service, Poll Service, Vote Service) with separate deployments, databases, and REST/gRPC communication.

**Pros**:
- **Independent scaling**: Scale Vote Service separately during high-volume voting
- **Technology flexibility**: Different languages/frameworks per service
- **Team autonomy**: Teams work independently on separate services
- **Fault isolation**: Failure in Poll Service doesn't crash Vote Service
- **Deployment independence**: Deploy services separately without full system restart

**Cons**:
- **Network latency overhead**: Inter-service calls add 10-50ms per hop
  - Example: SubmitVote requires Session validation + Poll validation + Vote persistence = 3 network hops = 30-150ms latency
  - **Violates performance target**: Cannot meet <200ms REST latency with multiple network hops
- **Distributed transactions complexity**: Vote acceptance requires coordination across services
  - Zero Vote Loss requires distributed transactions or saga patterns (complex)
- **Real-time event streaming challenges**: Broadcasting events across services requires message broker
  - Adds latency, operational complexity (Kafka, RabbitMQ, etc.)
  - Difficult to achieve <100ms event latency with inter-service messaging
- **Operational complexity**: Multiple deployment pipelines, monitoring, service discovery, API gateways
- **Data consistency challenges**: Eventual consistency conflicts with Zero Vote Loss guarantee
- **Development overhead**: Service contracts, versioning, backward compatibility
- **Debugging difficulty**: Distributed tracing required, harder to reproduce issues

**Evaluation Against Requirements**:
- ❌ **Fails performance targets**: Network latency prevents <200ms REST, <100ms events
- ❌ **Fails consistency requirements**: Zero Vote Loss difficult with distributed transactions
- ✅ Meets scalability (independent service scaling)
- ❌ **High operational complexity**: Requires significant DevOps investment

**Decision**: **Rejected** due to performance latency overhead and complexity disproportionate to current scale (<2000 participants).

---

### Alternative 3: Serverless Architecture (Function-as-a-Service)

**Description**: Deploy individual functions (CreateSession, SubmitVote, ActivatePoll) on serverless platform (AWS Lambda, Azure Functions) with API Gateway and managed services (DynamoDB, EventBridge).

**Pros**:
- **Auto-scaling**: Platform handles scaling automatically, zero infrastructure management
- **Cost efficiency**: Pay per invocation, no idle capacity costs
- **Operational simplicity**: No servers to manage, patch, or monitor
- **Built-in high availability**: Platform-provided redundancy and failover

**Cons**:
- **Cold start latency**: 100-500ms for first invocation after idle period
  - **Violates performance target**: Cannot guarantee <200ms REST latency with cold starts
  - Mitigation (provisioned concurrency) eliminates cost benefits
- **WebSocket limitations**: API Gateway WebSocket support limited (1-hour connection max, 128KB message size)
  - **Violates Real-Time First**: Long-polling workarounds add latency and complexity
  - SSE (Server-Sent Events) not natively supported in serverless
- **Stateless constraint**: Cannot maintain in-memory event buffers for replay (24-hour requirement)
  - Must externalize all state to managed services (DynamoDB Streams, EventBridge)
- **Execution time limits**: 15-minute max execution (Azure), 30-minute (AWS Lambda)
  - Not suitable for long-lived WebSocket connections
- **Distributed system complexity**: Similar challenges to microservices (distributed transactions, eventual consistency)
- **Vendor lock-in**: Tight coupling to cloud provider APIs, difficult to migrate
- **Local development challenges**: Difficult to replicate serverless environment locally

**Evaluation Against Requirements**:
- ❌ **Fails performance targets**: Cold start latency, WebSocket limitations
- ❌ **Fails Real-Time First**: WebSocket/SSE challenges for real-time event streaming
- ❌ **Fails event replay**: Cannot maintain in-memory 24-hour event buffer
- ✅ Meets scalability (platform auto-scaling)
- ⚠️ Operational simplicity offset by local development complexity

**Decision**: **Rejected** due to cold start latency, WebSocket limitations, and inability to support real-time event streaming requirements.

---

## Consequences

### Positive Consequences

1. **Performance Targets Achievable**:
   - In-process communication (microsecond latency) easily meets <200ms REST, <100ms event targets
   - No network hops between modules reduces latency by 50-100ms compared to microservices
   - Event broadcasting via in-process event bus achieves <100ms latency to all connected clients

2. **Simplified Development**:
   - Single codebase, single repository, single deployment pipeline
   - No inter-service contracts, API versioning, or backward compatibility concerns
   - Standard debugging (breakpoints, stack traces) without distributed tracing
   - Local development matches production architecture

3. **Operational Simplicity**:
   - Single deployment artifact (one container, one process)
   - Single monitoring/logging endpoint
   - No service discovery, API gateways, or inter-service networking
   - Reduced infrastructure costs (1 instance vs 3+ microservices)

4. **Strong Consistency**:
   - Zero Vote Loss guarantee easily implemented with local ACID transactions
   - No distributed transaction complexity (two-phase commit, sagas)
   - Atomic operations across modules within same database transaction

5. **Horizontal Scalability**:
   - Stateless instances (shared database) enable linear scaling
   - Load balancer distributes sessions across instances
   - Session affinity (sticky sessions) ensures WebSocket connections route correctly

6. **Clear Module Boundaries**:
   - Enforced encapsulation prevents coupling
   - Testable modules (unit tests, integration tests per module)
   - Domain-driven design principles maintained (aggregates, bounded contexts)

7. **Future Migration Path**:
   - Well-defined modules can be extracted to microservices later if needed
   - Modular monolith is a proven stepping stone to microservices (Shopify, Shopify Engineering blog)
   - Event-driven architecture (domain events) prepares for eventual inter-service messaging

### Negative Consequences

1. **Scaling Granularity**:
   - Cannot scale individual modules independently (all or nothing)
   - Example: High vote volume requires scaling entire monolith, not just Vote module
   - **Mitigation**: Acceptable for current scale (<2000 participants), revisit at 10,000+

2. **Deployment Coupling**:
   - All modules deploy together, no independent deployments
   - Change to Session module requires redeploying Poll and Vote modules
   - **Mitigation**: Fast deployment pipelines (<5 minutes), blue-green deployments minimize downtime

3. **Resource Sharing**:
   - All modules share same memory/CPU, one module's load impacts others
   - Example: Vote processing spike affects Session creation performance
   - **Mitigation**: Resource budgeting (3MB per participant), load shedding (reject joins at capacity)

4. **Technology Lock-In**:
   - Single language/framework for entire system (cannot mix technologies per module)
   - **Mitigation**: Acceptable constraint, team has consistent expertise

5. **Potential for Boundary Erosion**:
   - Without enforcement, developers may bypass module interfaces and access internals directly
   - Risk of degrading into traditional monolith over time
   - **Mitigation**: Architecture tests (ArchUnit-style), code review enforcement, static analysis

6. **Database Scaling Limits**:
   - Shared database becomes bottleneck at extreme scale (10,000+ participants)
   - **Mitigation**: Read replicas for queries, caching (event replay buffer), acceptable for current scale

### Monitoring and Success Metrics

**Performance Metrics**:
- REST API latency (p50, p95, p99) per endpoint
- Event delivery latency (domain event publish to client receipt)
- Module response times (measure each module's processing time)

**Scalability Metrics**:
- Participants per instance (target: 500)
- Auto-scaling effectiveness (time to add instance, capacity utilization)

**Architectural Health Metrics**:
- Module coupling (cross-module dependencies)
- Module cohesion (functionality within module boundaries)
- Architecture violations (bypassing interfaces, direct database access)

### When to Revisit This Decision

**Triggers for Reconsideration**:

1. **Scale exceeds capacity**: Consistent 5,000+ concurrent participants (10× current target)
2. **Performance degradation**: Unable to meet latency targets (<200ms REST, <100ms events) due to resource contention
3. **Independent deployment need**: Business requires deploying modules independently (e.g., regulatory compliance)
4. **Technology diversity**: Strong business case for different languages/frameworks per module
5. **Geographic distribution**: Multi-region deployment with data residency requirements (EU, US, Asia)

**Future Architecture Options**:

- **Extract Vote Module to Microservice**: If vote processing becomes bottleneck, extract for independent scaling
- **Extract Event Bus to Message Broker**: If event volume exceeds in-process capacity, migrate to Kafka/RabbitMQ
- **Migrate to Full Microservices**: If multiple triggers occur simultaneously, complete decomposition

---

## Related Specifications

- [Constitution](../../.specify/memory/constitution.md) - Core principles and invariants
- [Domain Specifications](../../001-domain-specs/README.md) - Session, Poll, Vote entities
- [Non-Functional Requirements](../../005-non-functional-specs/README.md) - Performance, scalability, reliability targets
- [API Contracts](../../004-api-contracts/README.md) - REST and real-time event interfaces

---

## Notes

- This ADR focuses on **logical architecture** (module boundaries, communication patterns), not physical architecture (folders, namespaces)
- Implementation details (framework choice, database selection) remain unspecified and technology-agnostic
- Module boundaries align with domain aggregates to maintain Domain-Driven Design principles
- The decision prioritizes **simplicity and performance** over **independent scalability** based on current requirements (<2000 participants)

---

**Last Updated**: January 3, 2026  
**Next Review**: After 6 months of production operation or when scaling beyond 2000 concurrent participants
