# ADR-003: Persistence Strategy

**Status**: Accepted  
**Date**: January 3, 2026  
**Decision-Makers**: Architecture Team  
**Consulted**: Development Team, Database Administrators

---

## Context

The Live Event Polling Application requires a persistence strategy that guarantees data integrity, supports complex domain invariants, and enables the "Zero Vote Loss" constitutional principle. The choice of persistence mechanism directly impacts the system's ability to maintain consistency, recover from failures, and enforce business rules.

### Constitution Requirements

**Zero Vote Loss Principle**:
> "Once a vote is accepted, it must never be lost, duplicated, or altered."

This requirement demands:
- **ACID transactions**: Atomic vote acceptance with immediate durability
- **Data integrity constraints**: Enforce uniqueness, referential integrity
- **Crash recovery**: Durable storage survives process crashes
- **No silent failures**: Persistence failures must be detected and rejected

**System Invariants** (from Constitution):
- A poll can have only one active state at any given time
- Closed polls never accept votes
- Each participant may submit at most one vote per poll
- Vote results represent only validated and persisted votes
- Session state is authoritative on the backend

### Domain Invariants Requiring Persistence

**Session Invariants**:
- Session has unique identifier (Primary Key constraint)
- Presenter is owner (Foreign Key constraint)
- Session state transitions are valid (State machine enforcement)
- Active sessions accept participants (State-dependent logic)

**Poll Invariants**:
- Poll belongs to exactly one session (Foreign Key constraint)
- Poll has unique identifier within session (Composite uniqueness)
- Only one poll per session can be active at a time (Uniqueness constraint)
- Closed polls never accept votes (State-based validation)

**Vote Invariants** (Critical for Zero Vote Loss):
1. **One Vote Per Poll**: Participant can submit at most one Accepted vote per poll (Unique constraint on participant + poll)
2. **Immutability**: Once Accepted, vote cannot be changed or deleted (Application-enforced, no UPDATE/DELETE)
3. **No Orphan Votes**: Vote associated with exactly one participant, poll, option (Foreign Key constraints)
4. **Zero Vote Loss**: Once Accepted, vote must never be lost (Durability guarantee)
5. **No Duplicate Counting**: Accepted vote counted exactly once (Unique constraint prevents duplicates)
6. **Valid Option Selection**: Selected option must exist in poll (Foreign Key constraint)

### Non-Functional Requirements

**Reliability Requirements**:
- **Vote Persistence Guarantee**: Once vote acknowledgment returned (202 Accepted), vote MUST be durably persisted
- **ACID Consistency**: All-or-nothing transactions (vote submission + result update atomic)
- **Recovery Time Objective (RTO)**: 10-second recovery from process crash
- **Data Integrity**: Referential integrity, uniqueness constraints enforced at storage layer

**Performance Requirements**:
- **Vote Submission Latency**: <150ms (p95) including persistence
- **Query Performance**: <100ms (p95) for poll results aggregation
- **Concurrent Writes**: Support 100 votes/second burst
- **Read Scalability**: Support 2000 concurrent result queries (read replicas)

### Transactional Requirements

**Critical Transactions** (from domain specs):

1. **Vote Submission** (Atomic):
   - Validate participant exists and hasn't voted
   - Validate poll is Active
   - Insert vote record (Accepted state)
   - Update poll vote count aggregate
   - **Must be atomic**: All or nothing (no partial state)

2. **Poll Activation** (Atomic):
   - Validate session is Active
   - Deactivate any currently active poll (uniqueness)
   - Activate target poll
   - **Must be atomic**: Only one active poll at a time

3. **Session End** (Atomic):
   - Close all active polls
   - Transition all participants to Left
   - Mark session as Ended
   - **Must be atomic**: Consistent final state

**Consistency Requirements**:
- **Strong Consistency**: Read-your-writes (participant sees their own vote immediately)
- **Transactional Boundaries**: Domain aggregate boundaries = transaction boundaries
- **Isolation**: Concurrent vote submissions must not violate "one vote per poll" invariant

---

## Decision

**We will use a Relational Database (RDBMS) as the primary persistence store for the Live Event Polling Application.**

### Definition

A **Relational Database** is a structured data store organizing data into tables with rows and columns, supporting:
- **ACID transactions**: Atomicity, Consistency, Isolation, Durability
- **Schema enforcement**: Data types, constraints (primary key, foreign key, unique, check)
- **SQL query language**: Declarative queries with joins, aggregations, indexes
- **Referential integrity**: Automatic enforcement of relationships between entities
- **Concurrent access control**: Locking, MVCC (Multi-Version Concurrency Control)

### Why Relational Database?

**Primary Rationale**:
1. **ACID Guarantees**: Zero Vote Loss requires durable, atomic transactions
2. **Schema Constraints**: Domain invariants enforced at database layer (fail-safe)
3. **Transactional Boundaries**: Natural alignment with domain aggregate boundaries
4. **Query Flexibility**: Complex aggregations (poll results), joins (session + polls + votes)
5. **Mature Ecosystem**: Well-understood operational practices, tooling, expertise

### How It Supports Requirements

**Zero Vote Loss**:
- Transaction commit = durable write to disk (survives crash)
- Unique constraints prevent duplicate votes
- Foreign key constraints prevent orphan votes
- Rollback on failure ensures no partial state

**Domain Invariants**:
- Primary keys enforce entity uniqueness
- Foreign keys enforce relationships (vote → poll, poll → session)
- Unique constraints enforce "one active poll per session", "one vote per participant per poll"
- Check constraints enforce state validity (e.g., poll state ∈ {Draft, Active, Closed})

**Performance Targets**:
- Indexes on query paths (poll results, session polls)
- Read replicas for query scalability (2000 concurrent reads)
- Connection pooling for concurrent writes (100 votes/sec)

---

## Alternatives Considered

### Alternative 1: Document Database (e.g., MongoDB, CouchDB)

**Description**: Store domain entities as JSON documents in collections, with flexible schema and hierarchical data structures.

**Pros**:
- **Schema flexibility**: Easy to add fields without migrations
- **Hierarchical data**: Naturally represent session → polls → votes as nested documents
- **Developer experience**: JSON documents map to application objects
- **Horizontal scaling**: Built-in sharding for distributed storage

**Cons**:
- **No multi-document transactions** (historically):
  - MongoDB added multi-document transactions in 4.0, but performance overhead
  - Transaction semantics weaker than RDBMS (e.g., no READ COMMITTED isolation)
  - **Risk to Zero Vote Loss**: Transaction failures harder to reason about
- **No declarative constraints**:
  - Unique constraints limited (single collection, not cross-collection)
  - No foreign key constraints (application must enforce referential integrity)
  - **Risk to domain invariants**: "One vote per poll" must be enforced in application layer
  - Application bugs can violate invariants (no database-level safety net)
- **Eventual consistency** (in distributed mode):
  - Read-your-writes not guaranteed without careful configuration
  - **Violates strong consistency requirement**: Participant may not see their vote immediately
- **Aggregation complexity**:
  - Poll result aggregation requires aggregation pipeline (less mature than SQL)
  - Performance unpredictable for complex joins (denormalization required)
- **Operational complexity**:
  - Sharding requires careful planning (shard key selection critical)
  - Backup/restore more complex than RDBMS (document-level consistency)

**Evaluation Against Requirements**:
- ⚠️ **Zero Vote Loss**: Multi-document transactions exist but weaker guarantees
- ❌ **Domain Invariants**: No foreign keys, limited unique constraints, application must enforce
- ❌ **Strong Consistency**: Eventual consistency conflicts with read-your-writes
- ✅ **Horizontal Scaling**: Better than RDBMS (but not needed at current scale <2000 participants)

**Decision**: **Rejected** due to lack of declarative constraints (foreign keys, cross-collection uniqueness) and weaker transaction semantics risking Zero Vote Loss.

---

### Alternative 2: Key-Value Store (e.g., Redis, Memcached with persistence)

**Description**: Store entities as serialized blobs (JSON, Protocol Buffers) keyed by entity ID, with fast in-memory access and optional persistence.

**Pros**:
- **Extreme performance**: Microsecond read/write latency (in-memory)
- **Simple data model**: Key → value, no schema complexity
- **Atomic operations**: Single-key operations are atomic
- **Pub/Sub support**: Redis pub/sub for real-time events (complements WebSocket)

**Cons**:
- **No multi-key transactions**:
  - Redis supports transactions (MULTI/EXEC), but limited to single connection, no rollback
  - Cannot atomically update vote + poll aggregate across keys
  - **Violates transactional requirements**: Vote submission requires multi-entity update
- **No relationships or constraints**:
  - No foreign keys (vote → poll relationship application-managed)
  - No unique constraints across keys (duplicate vote detection manual)
  - **Risk to domain invariants**: Application must manually enforce all invariants
- **No query flexibility**:
  - No SQL-like queries, no joins, no aggregations
  - Poll results require reading all votes and aggregating in application (inefficient)
  - **Performance degradation**: 500 votes per poll = 500 reads for result aggregation
- **Durability concerns** (if in-memory):
  - Redis persistence (RDB snapshots, AOF logs) not as robust as RDBMS
  - Snapshot-based persistence = potential data loss (last N seconds)
  - **Risk to Zero Vote Loss**: Crash between snapshot intervals loses recent votes
- **Schema evolution challenges**:
  - Stored as opaque blobs, no schema validation
  - Breaking changes require application-level migration (read old format, write new format)

**Evaluation Against Requirements**:
- ❌ **Zero Vote Loss**: Snapshot-based persistence risks data loss between snapshots
- ❌ **Transactional Requirements**: No multi-key transactions (vote + aggregate atomic update)
- ❌ **Domain Invariants**: No constraints, all enforcement in application layer
- ❌ **Query Flexibility**: No aggregations, must read all votes for poll results
- ✅ **Performance**: Excellent for individual reads/writes (but aggregation inefficient)

**Decision**: **Rejected** due to lack of multi-key transactions, no query capabilities, and weaker durability guarantees.

---

### Alternative 3: Event Sourcing (Event Store as primary persistence)

**Description**: Store immutable domain events as primary persistence, reconstruct current state by replaying events. All state changes captured as events (VoteSubmitted, PollActivated, etc.).

**Pros**:
- **Complete audit trail**: Every state change recorded as event (perfect history)
- **Time travel**: Reconstruct state at any point in time by replaying events to that point
- **Natural fit for real-time**: Domain events already defined for WebSocket broadcast
- **Append-only**: No UPDATE/DELETE operations, reduces locking contention
- **Immutability**: Aligns with "vote immutability" invariant

**Cons**:
- **Read model complexity**:
  - Current state requires replaying all events (slow for queries)
  - Must maintain separate read model (projections) for queries (CQRS required)
  - **Two persistence stores**: Event store + read model database (operational complexity)
  - Read model rebuild required if projection logic changes
- **Eventual consistency** (read model lags event store):
  - Participant votes, read model updates asynchronously
  - **Violates read-your-writes**: Participant may not see their vote immediately
  - Mitigation requires synchronous projection updates (defeats performance benefits)
- **Event schema evolution**:
  - Events immutable, cannot change past events
  - Schema changes require versioning (VoteSubmitted_v1, VoteSubmitted_v2)
  - Event replay must handle all historical versions (complex)
- **Query complexity**:
  - Poll results require projecting all VoteAccepted events for that poll
  - Aggregations spread across event stream, must traverse many events
  - **Performance unpredictable**: Large event streams slow down queries
- **Transaction boundaries unclear**:
  - Vote submission = VoteSubmitted event + VoteAccepted event (two events)
  - Atomicity across events requires saga or process manager (complexity)
  - **Risk to Zero Vote Loss**: Partial event persistence if crash between events
- **Operational complexity**:
  - Event store technology choice (EventStoreDB, Kafka, custom RDBMS)
  - Projection management (rebuild, monitoring, lag alerting)
  - Significantly higher operational overhead than single RDBMS

**Evaluation Against Requirements**:
- ⚠️ **Zero Vote Loss**: Achievable but requires careful event atomicity design
- ❌ **Strong Consistency**: Read model eventual consistency conflicts with read-your-writes
- ❌ **Operational Complexity**: Two stores (event + read model) excessive for current scale
- ❌ **Query Performance**: Replaying events for poll results inefficient
- ✅ **Audit Trail**: Complete history (but not a current requirement)

**Decision**: **Rejected** due to eventual consistency in read model (violates read-your-writes), operational complexity (two stores), and unnecessary for current requirements (no time travel needed).

---

### Alternative 4: In-Memory Only (No Persistent Storage)

**Description**: Store all state in application memory (RAM), no disk persistence. Session data exists only while application process is running.

**Pros**:
- **Extreme performance**: Nanosecond read/write latency (no I/O)
- **Zero operational complexity**: No database to configure, monitor, backup
- **Simple data model**: Plain application objects, no serialization
- **Perfect consistency**: All reads are latest writes (no replication lag)

**Cons**:
- **Total data loss on crash**:
  - Process crash = all sessions, polls, votes lost
  - **Violates Zero Vote Loss**: Votes disappear on restart
  - **Violates 99.9% uptime**: Every restart = complete data loss
  - Unacceptable for production system
- **No durability**:
  - Power failure, out-of-memory, segmentation fault = data gone
  - **Cannot meet RTO target**: Recovery impossible (no data to recover)
- **No horizontal scaling**:
  - Each instance has independent state, no shared storage
  - Load balancer sticky sessions required (vs. stateless with shared DB)
  - Instance failure = sessions on that instance lost
- **No backup/restore**:
  - Cannot backup session data for archival
  - Cannot restore from previous state after deployment error
- **Limited to available memory**:
  - 2000 participants × 3MB = 6GB minimum (fits, but no safety margin)
  - Long-running sessions accumulate event replay buffer (24 hours) = memory growth

**Evaluation Against Requirements**:
- ❌ **Zero Vote Loss**: Complete violation (all votes lost on crash)
- ❌ **99.9% Uptime**: Restart = data loss, violates reliability target
- ❌ **RTO 10 seconds**: Cannot recover (no persistent state)
- ❌ **Horizontal Scaling**: Each instance isolated, no shared state
- ✅ **Performance**: Best possible performance (irrelevant if data lost)

**Decision**: **Rejected** due to complete violation of Zero Vote Loss and inability to recover from failures. Only acceptable for development/testing, never production.

---

## Consequences

### Positive Consequences

1. **Zero Vote Loss Guaranteed**:
   - ACID transactions ensure vote persistence before acknowledgment
   - Durable writes survive process crashes, power failures
   - Transaction rollback prevents partial state (vote accepted but count not updated)
   - Database-level constraints (unique, foreign key) prevent invariant violations even if application has bugs

2. **Domain Invariants Enforced at Storage Layer**:
   - **Primary Keys**: Session, Poll, Vote uniqueness guaranteed
   - **Foreign Keys**: Vote → Poll, Poll → Session relationships enforced (no orphan votes)
   - **Unique Constraints**: "One vote per participant per poll" enforced by database (duplicate INSERT fails)
   - **Check Constraints**: State validity (e.g., vote state ∈ {Pending, Accepted, Rejected})
   - **Fail-Safe**: Application bugs cannot violate invariants (database rejects invalid operations)

3. **Transactional Integrity**:
   - Vote submission atomic: Insert vote + update poll aggregate + emit event (all or nothing)
   - Poll activation atomic: Deactivate current + activate new (only one active at a time)
   - Session end atomic: Close polls + transition participants + mark ended (consistent final state)
   - **Strong consistency**: Read-your-writes guaranteed (participant sees their vote immediately)

4. **Query Flexibility**:
   - SQL aggregations for poll results: `SELECT option_id, COUNT(*) FROM votes WHERE poll_id = ? GROUP BY option_id`
   - Complex queries: "Show all sessions with active polls" = single JOIN query
   - Indexes optimize query performance (<100ms poll results)
   - Ad-hoc queries for troubleshooting, analytics (no predefined access patterns needed)

5. **Operational Maturity**:
   - RDBMS operational practices well-established (backup, restore, monitoring)
   - Point-in-time recovery (PITR) for disaster recovery
   - SQL performance analysis tools (EXPLAIN, query profilers)
   - Team expertise: Developers, DBAs familiar with relational databases
   - Extensive tooling ecosystem (ORMs, migration tools, GUI clients)

6. **Read Scalability**:
   - Read replicas for query load distribution (2000 concurrent result queries)
   - Master for writes (100 votes/sec), replicas for reads
   - Replication lag acceptable for non-critical reads (poll results eventually consistent across replicas)

7. **Schema Evolution**:
   - Schema migrations well-understood (Flyway, Liquibase, custom scripts)
   - ALTER TABLE operations for adding columns, indexes
   - Backward-compatible changes deployable without downtime
   - Schema version control (migrations tracked in version control)

### Negative Consequences (with Mitigations)

1. **Write Scalability Ceiling**:
   - Single master for writes limits write throughput (typical: 10,000-50,000 writes/sec)
   - Current requirement: 100 votes/sec burst (0.2-1% of capacity)
   - **Future bottleneck**: If vote rate exceeds 10,000/sec, sharding or alternative needed
   - **Mitigation**: Acceptable for current scale (<2000 participants), revisit at 100× scale
   - **Mitigation**: Connection pooling, batch operations optimize write throughput

2. **Schema Rigidity**:
   - Schema changes require migrations (ALTER TABLE)
   - Large table alterations may require downtime (table locking)
   - Adding columns easier than removing (backward compatibility)
   - **Mitigation**: Online schema change tools (pt-online-schema-change, gh-ost) enable zero-downtime migrations
   - **Mitigation**: Feature flags allow schema changes before code deploys (forward compatibility)

3. **Horizontal Scaling Complexity**:
   - Read replicas easy (master → replicas), write sharding hard (partitioning by session ID?)
   - Cross-shard transactions difficult (e.g., global stats across all sessions)
   - **Mitigation**: Not needed at current scale (single instance handles 100 votes/sec easily)
   - **Mitigation**: Read replicas handle query scalability (2000 concurrent reads)

4. **Object-Relational Impedance Mismatch**:
   - Domain objects (Vote aggregate) vs. relational tables (votes, vote_options rows)
   - Must serialize/deserialize between application objects and table rows
   - Hierarchical data (Session → Polls → Votes) requires JOINs
   - **Mitigation**: ORM (Object-Relational Mapping) abstracts mapping (but adds complexity)
   - **Mitigation**: Acceptable trade-off for ACID guarantees and constraint enforcement

5. **Query Performance Requires Careful Indexing**:
   - Missing indexes = full table scans = slow queries (>100ms target violated)
   - Over-indexing = write overhead (every INSERT updates all indexes)
   - **Mitigation**: Index on query paths (poll_id for vote aggregation, session_id for polls)
   - **Mitigation**: Query profiling (EXPLAIN ANALYZE) validates index effectiveness
   - **Mitigation**: Monitoring query latency alerts on slow queries

6. **Single Point of Failure** (without high availability):
   - Master database failure = write unavailability (read replicas continue serving reads)
   - Recovery time depends on failover mechanism (manual vs. automatic)
   - **Mitigation**: High availability configurations (synchronous replication, automatic failover)
   - **Mitigation**: RTO 10 seconds achievable with automated failover (e.g., Patroni, cloud HA)

### Monitoring and Success Metrics

**Transaction Metrics**:
- Vote submission transaction latency (target: <150ms p95)
- Transaction rollback rate (target: <1% of votes)
- Deadlock rate (target: <0.1% of concurrent votes)
- Transaction throughput (vote/sec, poll activation/sec)

**Constraint Violation Metrics**:
- Unique constraint violations (duplicate vote attempts)
- Foreign key violations (orphan vote attempts)
- Check constraint violations (invalid state transitions)
- **These metrics indicate bugs**: Application should prevent invalid operations

**Query Performance Metrics**:
- Poll result aggregation latency (target: <100ms p95)
- Session poll list query latency (target: <100ms p95)
- Index hit ratio (target: >95%)
- Full table scan count (target: 0 on hot paths)

**Durability Metrics**:
- Write-ahead log (WAL) flush latency (indicates commit durability)
- Replication lag (master → replicas, target: <1 second)
- Checkpoint frequency (fsync to disk)

**Operational Metrics**:
- Database connection pool utilization (target: <80%)
- Disk I/O utilization (target: <70%)
- Database CPU utilization (target: <60% sustained)
- Disk space utilization (target: <70%)

### When to Revisit This Decision

**Reconsideration Triggers**:

1. **Write throughput exceeds 5,000 votes/sec sustained**: Single master bottleneck (current: 100 votes/sec, 50× headroom)
2. **Complex querying abandoned**: If application only does key-value lookups (no JOINs, aggregations), simpler store may suffice
3. **Schema changes too frequent**: If schema evolves weekly, schema-less store may reduce friction
4. **Global distribution required**: Multi-region active-active requires different approach (CRDT, distributed database)
5. **Time-travel queries needed**: If audit trail and historical state reconstruction required, Event Sourcing becomes attractive

**Future Architecture Options**:
- **Sharding**: Partition by session ID if single master bottleneck (complex, avoid if possible)
- **NewSQL Databases**: Distributed SQL with ACID (CockroachDB, YugabyteDB, Spanner) if global distribution needed
- **Hybrid Approach**: RDBMS for votes (ACID), Document DB for session metadata (flexibility)
- **Event Sourcing**: If complete audit trail becomes regulatory requirement

---

## Implementation Guidance (Technology-Agnostic)

### What's Defined

✅ **Persistence strategy**: Relational Database (RDBMS)  
✅ **Transaction requirements**: ACID transactions for vote submission, poll activation, session end  
✅ **Constraint requirements**: Primary keys, foreign keys, unique constraints, check constraints  
✅ **Consistency model**: Strong consistency, read-your-writes  
✅ **Durability guarantee**: Durable writes before acknowledgment (Zero Vote Loss)  
✅ **Scalability pattern**: Read replicas for query scaling  
✅ **Schema enforcement**: Database-enforced constraints (fail-safe)  
✅ **Query capabilities**: SQL aggregations, joins for poll results  

### What's NOT Defined (Implementation Details)

❌ **Specific database product**: No PostgreSQL, MySQL, SQL Server, Oracle chosen  
❌ **Schema definition**: No table definitions, column types, indexes specified  
❌ **ORM choice**: No SQLAlchemy, Hibernate, Entity Framework selected  
❌ **Migration tool**: No Flyway, Liquibase, Alembic chosen  
❌ **Connection pooling**: No specific pooling implementation (PgBouncer, HikariCP, etc.)  
❌ **High availability configuration**: No specific HA setup (synchronous replication, failover mechanism)  
❌ **Backup strategy**: No specific backup tool or schedule defined  
❌ **Monitoring tools**: No specific database monitoring solution chosen  

---

## Related Specifications

- [Constitution](../../.specify/memory/constitution.md) - Zero Vote Loss principle
- [ADR-001: System Architecture Style](adr-001-system-architecture-style.md) - Modular Monolith architecture
- [Domain: Session](../../001-domain-specs/domain/session.md) - Session entity and invariants
- [Domain: Poll](../../001-domain-specs/domain/poll.md) - Poll entity and invariants
- [Domain: Vote](../../001-domain-specs/domain/vote.md) - Vote entity and invariants (critical)
- [State Machine](../../002-state-transitions/domain/state-machine.md) - Valid state transitions
- [Reliability Requirements](../../005-non-functional-specs/non-functional/reliability.md) - Zero Vote Loss, RTO, ACID
- [Performance Requirements](../../005-non-functional-specs/non-functional/performance.md) - Vote submission <150ms

---

## Notes

- **ACID transactions are non-negotiable** for Zero Vote Loss (no eventually consistent alternatives)
- **Database constraints provide fail-safe** (application bugs cannot violate invariants)
- **Read replicas handle query scalability** (2000 concurrent reads), master handles writes (100 votes/sec)
- **Transactional boundaries = aggregate boundaries** (vote submission, poll activation, session end)
- **Schema migrations well-understood** (operational maturity outweighs schema flexibility concerns)
- **Single master write bottleneck acceptable** at current scale (100 votes/sec vs. 10,000+ capacity)

---

**Last Updated**: January 3, 2026  
**Next Review**: After 6 months of production operation or when write throughput exceeds 5,000 votes/sec sustained
