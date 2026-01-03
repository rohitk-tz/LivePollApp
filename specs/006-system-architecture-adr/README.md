# Architecture Decision Record: System Architecture Style

**Feature**: 006-system-architecture-adr  
**Branch**: `006-system-architecture-adr`  
**Created**: January 3, 2026  
**Status**: Draft

---

## Quick Links

### Architecture Decision Records

- **[ADR-001: System Architecture Style](architecture/adr/adr-001-system-architecture-style.md)** - Modular Monolith decision
- **[ADR-002: Real-Time Communication](architecture/adr/adr-002-realtime-communication.md)** - WebSocket + SSE decision
- **[ADR-003: Persistence Strategy](architecture/adr/adr-003-persistence-strategy.md)** - Relational Database decision

### Supporting Documentation

- **[Feature Specification](spec.md)** - User stories, requirements, success criteria
- **[Validation Report ADR-001](validation-report.md)** - System architecture validation
- **[Validation Report ADR-002](validation-adr-002.md)** - Real-time communication validation
- **[Validation Report ADR-003](validation-adr-003.md)** - Persistence strategy validation

---

## What's Included

This specification documents architectural decisions for the Live Event Polling Application:

### ADR-001: System Architecture Style

**Decision**: The system will be implemented as a Modular Monolith

**Key Points**:
- **Single deployable unit** with clear logical module boundaries
- **In-process communication** enables <200ms REST, <100ms event latency
- **Horizontal scaling** via stateless instances behind load balancer
- **Module boundaries** align with domain aggregates (Session, Poll, Vote, Events)
- **Strong consistency** via local ACID transactions (Zero Vote Loss)
- **Future migration path** to microservices if needed

### ADR-002: Real-Time Communication Mechanism

**Decision**: WebSocket as primary protocol with Server-Sent Events (SSE) as fallback

**Key Points**:
- **WebSocket primary**: Low latency (<50ms typical), bidirectional, 95%+ browser support
- **SSE fallback**: Ensures compatibility in restrictive network environments
- **Event replay**: 24-hour buffer for zero data loss on reconnect
- **Heartbeat mechanism**: 30-second ping/pong keeps connections alive
- **Connection scoping**: Session-based subscriptions via query parameters
- **Load balancer support**: Sticky sessions for WebSocket persistence

### ADR-003: Persistence Strategy

**Decision**: The system will use a Relational Database (RDBMS) as the primary persistence store

**Key Points**:
- **ACID transactions** guarantee Zero Vote Loss via durability
- **Database constraints** enforce domain invariants (foreign keys, unique constraints)
- **Transactional integrity** for atomic vote submission, poll activation
- **Query flexibility** via SQL aggregations for poll results
- **Strong consistency** supports read-your-writes guarantee
- **Read scalability** via read replicas for 2000 concurrent queries

---

## ADR-001: System Architecture Style

### Decision Context

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

## ADR-002: Real-Time Communication Mechanism

### Decision Context

**Real-Time First Principle**: All participant actions must be reflected system-wide in near real-time without manual refresh.

**Performance Requirements**:
- Event delivery latency: < 100ms (p95)
- Concurrent connections: 2000+ simultaneous
- Event throughput: 150 events/second peak
- Connection duration: 2+ hours

**Reliability Requirements**:
- Event replay: 24-hour buffer
- Zero event loss on reconnect
- Causal ordering within session

---

### Why WebSocket + SSE?

**WebSocket Primary**:
- ✅ **Lowest latency**: <50ms typical event delivery
- ✅ **Bidirectional**: Enables future features (heartbeat, presence)
- ✅ **Efficient**: 85-90% bandwidth reduction vs. polling
- ✅ **Browser support**: All modern browsers natively

**SSE Fallback**:
- ✅ **Compatibility**: Works through restrictive firewalls/proxies
- ✅ **Standard HTTP**: Better firewall traversal than WebSocket
- ✅ **Automatic reconnection**: Browser handles reconnection

---

### Alternatives Rejected

**1. HTTP Long Polling** ❌
- Latency: 500ms-2s vs. <100ms requirement
- Resource waste: 2000 threads for 2000 clients
- Bandwidth: 800KB-1.6MB/sec header overhead

**2. SSE Only** ❌
- Unidirectional: Limits future features
- HTTP/1.1 connection limits: 6 per domain
- Accepted as fallback but not primary

**3. HTTP/2 Server Push** ❌
- No browser API for event consumption
- Not designed for real-time event streaming

**4. gRPC Streaming** ❌
- Browser limitations: Requires gRPC-Web proxy
- Complexity: Protocol Buffers overkill for JSON events

**5. WebRTC Data Channels** ❌
- Connection setup: 2-5 seconds vs. <100ms requirement
- Peer-to-peer model mismatch for client-server

---

### Trade-Offs

#### Positive Consequences

1. ✅ **Low latency**: <50ms typical, easily meets <100ms target
2. ✅ **Bidirectional**: Future-proof for new features
3. ✅ **Resource efficient**: 85-90% bandwidth reduction vs. polling
4. ✅ **Browser support**: 99.9%+ with fallback
5. ✅ **Event replay**: Zero loss on reconnect
6. ✅ **Load balancer compatible**: Sticky sessions supported
7. ✅ **Debuggable**: Browser DevTools, JSON human-readable

#### Negative Consequences (with Mitigations)

1. ⚠️ **Stateful connections**: 50KB per connection = 100MB for 2000  
   **Mitigation**: Acceptable on 2GB+ instances

2. ⚠️ **Sticky sessions required**: Load balancer configuration  
   **Mitigation**: All modern load balancers support

3. ⚠️ **Connection timeouts**: Idle proxies close connections  
   **Mitigation**: 30-second heartbeat ping/pong

4. ⚠️ **Firewall challenges**: Corporate restrictions  
   **Mitigation**: SSE fallback for 99% coverage

5. ⚠️ **Mobile resilience**: Frequent network switches  
   **Mitigation**: Auto-reconnect + event replay

6. ⚠️ **Testing complexity**: Stateful asynchronous tests  
   **Mitigation**: WebSocket testing libraries available

---

### Monitoring Metrics

**Connection Metrics**:
- Active WebSocket connections (total, per instance)
- Connection duration histogram
- Reconnection rate
- Upgrade success rate

**Performance Metrics**:
- Event delivery latency (target: <100ms p95)
- Broadcast fanout time (target: <100ms p95 for 500 clients)
- Message throughput (target: 150 msg/sec)

**Reliability Metrics**:
- Event loss rate (target: 0%)
- Reconnection success rate (target: >99%)
- Reconnection time (target: <5 seconds p95)

---

### When to Revisit

**Reconsideration Triggers**:
1. WebSocket deprecated by browsers (unlikely)
2. Connection scale exceeds 5,000 per instance
3. Binary protocol needed (JSON bottleneck)
4. Strong bidirectional requirements (commands via WebSocket)
5. Edge computing deployment (geographic distribution)

**Future Options**: WebTransport over HTTP/3, GraphQL Subscriptions

---

## ADR-003: Persistence Strategy

### Decision Context

**Zero Vote Loss Principle**: "Once a vote is accepted, it must never be lost, duplicated, or altered."

**Domain Invariants Requiring Enforcement**:
- **Vote**: One vote per participant per poll (uniqueness)
- **Vote**: Immutability after acceptance
- **Vote**: No orphan votes (referential integrity)
- **Poll**: Only one active poll per session
- **Poll**: Valid option selection
- **Session**: Valid state transitions

**Transactional Requirements**:
- Vote submission: Insert vote + update aggregate atomically
- Poll activation: Deactivate current + activate new atomically
- Session end: Close polls + transition participants atomically

**Performance Requirements**:
- Vote submission: <150ms (p95)
- Poll results query: <100ms (p95)
- Concurrent writes: 100 votes/sec burst
- Concurrent reads: 2000 queries/sec

---

### Why Relational Database (RDBMS)?

**ACID Transactions**:
- ✅ **Zero Vote Loss**: Durability guarantees vote persistence before acknowledgment
- ✅ **Atomicity**: All-or-nothing for vote submission, poll activation
- ✅ **Consistency**: Database constraints enforce domain invariants
- ✅ **Isolation**: Concurrent votes don't violate uniqueness

**Database Constraints**:
- ✅ **Primary Keys**: Session, Poll, Vote uniqueness
- ✅ **Foreign Keys**: Vote → Poll, Vote → Participant, Poll → Session
- ✅ **Unique Constraints**: One vote per participant per poll, one active poll per session
- ✅ **Check Constraints**: Valid state values

**Query Flexibility**:
- ✅ **SQL Aggregations**: Poll results, vote counts, option rankings
- ✅ **JOINs**: Session → Polls → Votes for comprehensive queries
- ✅ **Indexes**: Optimize query performance (<100ms target)

**Operational Maturity**:
- ✅ **Backup/Restore**: Point-in-time recovery for data loss prevention
- ✅ **Monitoring**: Transaction metrics, query performance, constraint violations
- ✅ **Team Expertise**: Well-understood operational practices

---

### Alternatives Rejected

**1. Document Database** ❌
- **No foreign key constraints**: Application must enforce referential integrity
- **Weaker transactions**: Multi-document transactions less mature
- **No unique constraints across collections**: One vote per poll harder to enforce
- **Risk to Zero Vote Loss**: Application bugs can violate invariants

**2. Key-Value Store** ❌
- **No multi-key transactions**: Cannot atomically update vote + poll aggregate
- **No query capabilities**: 500 votes = 500 reads for aggregation
- **Snapshot-based persistence**: Potential data loss between snapshots
- **No referential integrity**: Application must enforce all constraints

**3. Event Sourcing** ❌
- **Eventual consistency**: Read model updates asynchronously
- **Read-your-writes violation**: Participant may not see their vote immediately
- **Operational complexity**: Two persistence stores (event store + read model)
- **Overkill**: Time-travel queries not required

**4. In-Memory Only** ❌
- **Complete Zero Vote Loss violation**: All data lost on crash
- **No durability**: Process restart = all sessions, polls, votes lost
- **Only acceptable for**: Development/testing, never production

---

### Trade-Offs

#### Positive Consequences

1. ✅ **Zero Vote Loss Guaranteed**: ACID durability, durable writes before acknowledgment
2. ✅ **Domain Invariants Enforced**: Database constraints prevent violations (no application bugs)
3. ✅ **Transactional Integrity**: Atomic operations for vote submission, poll activation
4. ✅ **Query Flexibility**: SQL aggregations, JOINs for poll results (<100ms)
5. ✅ **Operational Maturity**: Backup, restore, PITR, team expertise
6. ✅ **Read Scalability**: Read replicas for 2000 concurrent queries
7. ✅ **Schema Evolution**: Migration tools for backward compatibility

#### Negative Consequences (with Mitigations)

1. ⚠️ **Write Scalability Ceiling**: 10,000-50,000 writes/sec limit  
   **Mitigation**: Current 100 votes/sec = 0.2-1% capacity, acceptable

2. ⚠️ **Schema Rigidity**: Migrations required for changes  
   **Mitigation**: Online schema change tools, zero-downtime

3. ⚠️ **Horizontal Scaling Complexity**: Sharding difficult  
   **Mitigation**: Read replicas handle queries, single master sufficient

4. ⚠️ **Object-Relational Impedance**: Domain objects vs. tables  
   **Mitigation**: ORM abstracts mapping, acceptable trade-off

5. ⚠️ **Query Performance Requires Indexing**: Missing indexes = slow queries  
   **Mitigation**: Index on query paths, monitor with query analysis

6. ⚠️ **Single Point of Failure**: Master database failure  
   **Mitigation**: HA configurations, RTO 10s with automated failover

---

### Monitoring Metrics

**Transaction Metrics**:
- Vote submission latency (target: <150ms p95)
- Transaction rollback rate (target: <1%)
- Deadlock rate (target: <0.1%)
- Transaction throughput (votes/sec, activations/sec)

**Constraint Violation Metrics**:
- Unique constraint violations (indicates application bugs)
- Foreign key violations (indicates data integrity issues)
- Check constraint violations (indicates invalid state transitions)

**Query Performance Metrics**:
- Poll result aggregation latency (target: <100ms p95)
- Session poll list query (target: <100ms p95)
- Index hit ratio (target: >95%)
- Full table scan count (target: 0 on hot paths)

**Durability Metrics**:
- Write-ahead log (WAL) flush latency
- Replication lag (target: <1 second)
- Checkpoint frequency
- Connection pool utilization

---

### When to Revisit

**Reconsideration Triggers**:
1. **Write throughput exceeds 5,000 votes/sec sustained** (50× current capacity)
2. **Complex querying abandoned** (only key-value lookups needed)
3. **Schema changes too frequent** (weekly evolution required)
4. **Global distribution required** (multi-region active-active)
5. **Time-travel queries needed** (audit trail, historical reconstruction)

**Future Options**: Sharding, NewSQL (CockroachDB, Spanner), Hybrid (RDBMS + Document DB), Event Sourcing

---

## ADR-001, ADR-002, ADR-003: Complete Architecture

### Full Architecture Flow

```
┌─────────────────────────────────────────────────────────┐
│              Client (Browser/Mobile)                     │
│  - REST Commands (POST/PUT/DELETE)                      │
│  - WebSocket Events (server push)                       │
└─────────────────────────────────────────────────────────┘
              │                           │
              │ REST                      │ WebSocket
              │ (Commands)                │ (Events)
              ▼                           ▼
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
└──────────┘      └──────────┘      └──────────┘
      │                   │                   │
      │   Domain Events   │                   │
      │ (SessionStarted,  │                   │
      │  PollActivated,   │                   │
      │  VoteAccepted)    │                   │
      └───────────────────┼───────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────┐
│            Event Bus (In-Process)                        │
│  - Domain event publishing                              │
│  - Event subscriptions (module-to-module)               │
│  - WebSocket broadcast (to connected clients)           │
│  - 24-hour event replay buffer                          │
└─────────────────────────────────────────────────────────┘
                          │
                          │ Broadcast via WebSocket
                          ▼
                    (Back to clients)
                          
      ┌───────────────────┼───────────────────┐
      ▼                   ▼                   ▼
┌──────────┐      ┌──────────┐      ┌──────────┐
│ Session  │      │   Poll   │      │   Vote   │
│  Table   │      │  Table   │      │  Table   │
│          │      │          │      │          │
│ - PK     │      │ - PK     │      │ - PK     │
│ - State  │      │ - FK     │      │ - FK     │
│          │      │ - Active │      │ - Unique │
└──────────┘      └──────────┘      └──────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│               Relational Database (RDBMS)                │
│  - ACID transactions (Zero Vote Loss)                    │
│  - Foreign keys (referential integrity)                  │
│  - Unique constraints (one vote per poll)                │
│  - Durable writes (WAL, replication)                     │
└─────────────────────────────────────────────────────────┘
```

**Architecture Decisions Summary**:
1. **ADR-001 (Modular Monolith)**: Single deployable with clear module boundaries
2. **ADR-002 (WebSocket + SSE)**: Real-time event delivery <100ms
3. **ADR-003 (RDBMS)**: ACID transactions guarantee Zero Vote Loss

---

## ADR-001 & ADR-002: Combined Architecture

### Communication Flow

```
┌─────────────────────────────────────────────────────────┐
│              Client (Browser/Mobile)                     │
│  - REST Commands (POST/PUT/DELETE)                      │
│  - WebSocket Events (server push)                       │
└─────────────────────────────────────────────────────────┘
              │                           │
              │ REST                      │ WebSocket
              │ (Commands)                │ (Events)
              ▼                           ▼
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
└──────────┘      └──────────┘      └──────────┘
      │                   │                   │
      │   Domain Events   │                   │
      │ (SessionStarted,  │                   │
      │  PollActivated,   │                   │
      │  VoteAccepted)    │                   │
      └───────────────────┼───────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────┐
│            Event Bus (In-Process)                        │
│  - Domain event publishing                              │
│  - Event subscriptions (module-to-module)               │
│  - WebSocket broadcast (to connected clients)           │
│  - 24-hour event replay buffer                          │
└─────────────────────────────────────────────────────────┘
                          │
                          │ Broadcast via WebSocket
                          ▼
                    (Back to clients)
```

**Key Insights**:
- **Commands flow down**: Client → REST → Application Services → Modules
- **Events flow up**: Modules → Event Bus → WebSocket → Clients
- **Separation of concerns**: REST for commands, WebSocket for events
- **In-process efficiency**: Module-to-module via event bus (microseconds)
- **External real-time**: WebSocket to clients (<100ms)

---

## Next Steps

With three core architecture decisions documented:

1. **Technology Selection** (Future ADR):
   - Programming language (Python, Java, TypeScript, C#, etc.)
   - WebSocket library (Socket.IO, ws, uWebSockets, SignalR, etc.)
   - Framework (Spring Boot, Django, Express, ASP.NET Core, etc.)
   - **Database product** (PostgreSQL, MySQL, SQL Server, etc.)
   - **ORM selection** (SQLAlchemy, Hibernate, Entity Framework, Prisma, etc.)

2. **Database Schema Design**:
   - Table structures (Session, Poll, Vote, Participant, Option)
   - Primary keys, foreign keys, unique constraints
   - Indexes for query optimization
   - Check constraints for state validation
   - Migration strategy (online schema changes)

3. **Module Implementation Planning**:
   - Folder structure (modules, services, repositories)
   - Module APIs and interfaces
   - Dependency injection patterns
   - WebSocket connection management
   - Transaction boundaries (aggregate boundaries)

4. **Infrastructure Planning**:
   - Load balancer configuration (sticky sessions for WebSocket)
   - Database HA configuration (master-replica, automated failover)
   - Connection pooling settings
   - Backup and recovery procedures
   - Monitoring and alerting setup

5. **Event Buffer Implementation**:
   - Event storage table schema
   - 24-hour retention policy
   - Event replay logic
   - Event serialization format

---

**Architecture foundation complete. Ready for technology selection and detailed design.**
