# Reliability Requirements

**Created**: January 3, 2026  
**Status**: Draft  
**Feature**: 005-non-functional-specs

## Purpose

This specification defines reliability requirements for the Live Event Polling Application to ensure the "Zero Vote Loss" principle and system availability during critical live events. Requirements focus on data durability, fault tolerance, and graceful recovery.

**References**:
- [Constitution](../../.specify/memory/constitution.md) - Zero Vote Loss principle
- [REST API Contracts](../../004-api-contracts/api/rest.md)
- [State Machine](../../002-state-transitions/domain/state-machine.md)

---

## Reliability Principles

1. **Zero Vote Loss**: Accepted votes must never be lost under any failure condition
2. **Fail-Safe Defaults**: System failures default to safe states (reject new requests rather than accept and lose data)
3. **Graceful Degradation**: Partial failures isolated to minimize blast radius
4. **Automatic Recovery**: System recovers from transient failures without manual intervention
5. **Data Consistency**: State machines enforce consistent transitions even during failures

---

## Availability Requirements

### Uptime Target

**SLA**: 99.9% availability during scheduled event hours

**Calculation**:
```
99.9% uptime = 43.2 minutes downtime per month (30 days)
              = 8.64 hours downtime per year

For 8-hour event day:
99.9% = 28.8 seconds max downtime per event
```

**Measurement Window**: Scheduled event hours only (not 24/7)

**Rationale**: Live events are time-bound; availability during events is critical, off-hours maintenance acceptable

---

### Availability Exclusions

Downtime NOT counted against SLA:
- Scheduled maintenance during non-event hours
- Client-side network failures
- DDoS attacks exceeding protection capacity
- Force majeure events (natural disasters, etc.)

Downtime COUNTED against SLA:
- Unplanned service outages
- Deployments during event hours
- Configuration errors causing unavailability
- Dependency failures within control (own infrastructure)

---

### Availability Monitoring

**Health Check Endpoint**: `GET /health`

**Response**:
```json
{
  "status": "healthy" | "degraded" | "unhealthy",
  "checks": {
    "database": "ok",
    "event_stream": "ok",
    "memory": "ok"
  },
  "timestamp": "ISO8601"
}
```

**Status Definitions**:
- `healthy`: All systems operational, meeting SLAs
- `degraded`: Partial functionality, some SLAs exceeded but core operations working
- `unhealthy`: Critical failures, service unavailable

**Monitoring Frequency**: Every 10 seconds

**Alerting**: Trigger alert if unhealthy for 60 consecutive seconds (avoid false positives)

---

## Data Durability Requirements

### Vote Persistence Guarantee

**Requirement**: Once vote acknowledgment returned to client (202 Accepted), vote MUST be durably persisted

**Implementation-Agnostic Specification**:
1. Vote submitted via POST /polls/{id}/votes
2. System validates vote (participant eligible, poll active, no duplicate)
3. System persists vote to durable storage
4. System emits VoteAccepted domain event
5. System returns 202 Accepted response to client
6. **Critical**: Steps 3 and 4 MUST complete before step 5

**Durability Definition**: Vote survives single-point failures including:
- Process crash
- Server restart
- Power loss
- Network partition

**NOT required to survive**: Simultaneous failure of all data replicas (catastrophic scenario)

---

### Vote Persistence Failure Handling

**Scenario**: Vote submitted but persistence fails

**Response**:
1. System MUST return 503 Service Unavailable (not 202)
2. System MUST NOT emit VoteAccepted event
3. Client retries submission
4. System applies idempotency: retry either persists successfully or detects duplicate (already persisted)

**Outcome**: Either vote persisted or client knows submission failed (no silent data loss)

---

### Session State Durability

**Requirement**: Session state transitions (Active, Paused, Ended) must be durable

**Rationale**: If session shows "Active" to presenter, then service crashes, session MUST still be Active after restart (not revert to Preparing)

**Durability Guarantee**: All domain command state changes persisted before acknowledgment

---

### Event Replay Buffer

**Requirement**: System MUST buffer events for 24 hours to support client reconnection

**Rationale**: Clients disconnected briefly (network blip, page refresh) can replay missed events

**Buffer Scope**: Per-session event stream

**Buffer Size**: Estimated 10,000 events per session max (very active 2-hour session)

**Retention**: Events purged 24 hours after session ends

**Overflow Handling**: If buffer exceeds capacity, oldest events dropped, client must refetch full state

---

## Fault Tolerance Requirements

### Process Crash Recovery

**Scenario**: Service process crashes (e.g., out-of-memory, segfault, manual kill)

**Recovery Target**:
- **RTO** (Recovery Time Objective): 10 seconds to process restart and serving requests
- **RPO** (Recovery Point Objective): Zero data loss for acknowledged votes

**Recovery Steps**:
1. Watchdog detects process failure (health check timeout)
2. Orchestrator restarts process
3. Process initializes, loads state from durable storage
4. Health check returns "healthy"
5. Load balancer resumes traffic
6. Total time: under 10 seconds

**Data Validation**: On restart, verify:
- Active sessions remain Active (state consistency)
- Accepted votes retrievable (durability)
- Event sequence numbers continuous (no gaps)

---

### Database Connection Failure

**Scenario**: Database connection lost temporarily (network partition, database restart)

**Behavior**:
- **Reads**: Return 503 Service Unavailable for query operations
- **Writes** (votes, commands): Queue for retry up to 30 seconds, then return 503
- **Event Stream**: Continue delivering events from cache/buffer (read-only impact minimal)

**Recovery**:
1. Detect connection failure (connection timeout, error)
2. Attempt reconnection with exponential backoff (1s, 2s, 4s, 8s, 16s)
3. On reconnection, flush queued writes
4. Resume normal operations

**Client Impact**: Brief 503 errors during reconnection window, then automatic recovery

---

### Event Stream Infrastructure Failure

**Scenario**: WebSocket/SSE broadcast subsystem fails

**Isolation**: REST API continues operating (commands still accepted)

**Impact**: Clients don't receive real-time updates (must rely on polling or refresh)

**Degradation Mode**:
- Accept commands normally (votes, poll activations, etc.)
- Log events even if broadcast fails (for replay when recovered)
- Health check shows "degraded" status

**Recovery**: Restart event stream subsystem independently, clients reconnect and replay missed events

**Rationale**: Isolate failures—voting continues even if live updates temporarily unavailable

---

### Partial Client Delivery Failure

**Scenario**: Event broadcast succeeds for 90% of clients but fails for 10% (network issues, client crashes)

**Handling**:
- System considers event delivered successfully (majority rule)
- Failed clients marked as "disconnected" after timeout (30 seconds no acknowledgment)
- Disconnected clients can reconnect and replay events
- No retry logic at broadcast level (would delay 90% who succeeded)

**Rationale**: Optimize for the majority; provide recovery path for minority

---

## Graceful Degradation Patterns

### Circuit Breaker for Dependencies

**When**: Dependency (database, external service) fails repeatedly

**Pattern**:
1. Track failure rate for dependency
2. If failures exceed threshold (e.g., 50% in 60 seconds), open circuit
3. Circuit open: Fail fast with 503, don't attempt requests (reduces load on failing dependency)
4. After cooldown period (30 seconds), half-open: Test with one request
5. If test succeeds, close circuit; if fails, reopen

**User Impact**: Faster error responses (fail fast), clearer degradation state

---

### Read-Only Mode

**When**: Database writes failing but reads succeeding

**Behavior**:
- Accept query operations (GET endpoints)
- Reject command operations with 503 (POST, PATCH)
- Event stream continues with cached/buffered data

**Use Case**: Database in read-only mode (replica promotion, maintenance)

**Recovery**: Automatic when database write capability restored

---

### Load Shedding

**When**: System at capacity, new requests would cause overload

**Behavior**:
- Accept requests from existing sessions (participants already joined)
- Reject new session joins with 503 "Capacity exceeded, try again later"
- Prioritize vote submissions over session creation

**Rationale**: Protect active events, defer new events to when capacity available

---

## Data Consistency Requirements

### ACID Properties for Votes

**Atomicity**: Vote acceptance is all-or-nothing (either fully persisted or not at all)

**Consistency**: Vote submission respects domain invariants:
- One vote per participant per poll
- Poll must be Active
- Session must be Active

**Isolation**: Concurrent votes don't interfere (e.g., two votes at same instant both succeed if both valid)

**Durability**: Accepted votes persist across failures (covered above)

**Validation**: Simulate concurrent votes, verify all constraints enforced, no violations

---

### State Machine Consistency

**Requirement**: State transitions follow state-machine.md rules even during failures

**Example**: Session cannot go from Paused → Preparing (invalid transition)

**Enforcement**:
- Validate transition before persisting
- If validation fails, reject command (400 error)
- Crash during state change: Either old state (transaction rolled back) or new state (transaction committed), never inconsistent middle state

**Validation**: Chaos test with random process kills during state transitions, verify state always valid

---

### Event Ordering Consistency

**Requirement**: Clients observe events in causal order

**Example**: Client must receive PollActivated before VoteAccepted for that poll

**Enforcement**:
- Assign monotonic sequence numbers to events
- Clients receive events in sequence number order
- If sequence gap detected, client requests replay

**Edge Case**: Network reordering

**Solution**: Client buffers out-of-order events, processes when sequence continuous

---

## Failover and Redundancy

### Service Instance Redundancy

**Requirement**: System operates with multiple service instances for redundancy

**Configuration**: Minimum 2 instances for high availability (N+1 redundancy)

**Failover Scenario**:
1. Instance 1 crashes
2. Load balancer detects failure (health check timeout)
3. Load balancer stops routing traffic to Instance 1
4. Instance 2 handles all traffic (temporary performance degradation acceptable)
5. Orchestrator restarts Instance 1
6. Traffic resumes to both instances

**Client Impact**: Brief latency increase (<10 seconds), no vote loss, automatic reconnection

---

### Database Redundancy

**Requirement**: Database must have redundancy to prevent single point of failure

**Configuration**: At least one standby replica (implementation-agnostic)

**Failover Scenario**:
1. Primary database fails
2. Replica promoted to primary
3. Service reconnects to new primary
4. Total downtime: under 60 seconds (within SLA)

**Data Loss**: RPO = 0 (synchronous replication) or RPO = 5 seconds (asynchronous replication acceptable)

---

## Recovery Procedures

### Automated Recovery

**Scenarios Handled Automatically**:
- Process crashes → Restart via orchestrator
- Connection failures → Reconnect with exponential backoff
- Event stream disconnect → Client reconnects and replays
- Overload → Load shedding and rate limiting

**No Manual Intervention Required**: System self-heals from transient failures

---

### Manual Recovery Procedures

**Scenarios Requiring Human Intervention**:
- Database corruption → Restore from backup
- Catastrophic failure (all replicas lost) → Restore from disaster recovery site
- Configuration errors → Rollback or correct config
- Security incidents → Isolate, investigate, remediate

**Documentation**: Runbooks for each manual recovery scenario (out of scope for this spec)

---

## Backup and Disaster Recovery

### Backup Requirements

**Frequency**: Continuous incremental backups + daily full backups

**Retention**: 30 days for compliance and recovery

**Scope**: All session data, votes, poll definitions

**Testing**: Monthly restore test to verify backups valid

---

### Disaster Recovery

**RTO**: 4 hours to restore service from catastrophic failure

**RPO**: 5 minutes of data loss acceptable in disaster scenario (contrast with zero loss for accepted votes under normal failures)

**Disaster Definition**: Entire data center unavailable (fire, earthquake, etc.)

**Recovery**: Restore from offsite backups to alternate infrastructure

**Frequency**: Rare (outside normal SLA calculations)

---

## Error Handling Philosophy

### Client-Facing Errors

**Principle**: Provide actionable error messages without exposing internal details

**Good Example**:
```json
{
  "error": {
    "code": "DUPLICATE_VOTE",
    "message": "You have already voted on this poll",
    "requestId": "abc-123"
  }
}
```

**Bad Example**:
```json
{
  "error": "PG::UniqueViolation: duplicate key value violates unique constraint participant_poll_vote"
}
```

**Rationale**: First tells user what to do (don't retry), second exposes database internals

---

### Internal Error Logging

**Requirement**: Log all errors with sufficient context for debugging

**Log Contents**:
- Timestamp
- Error type and message
- Request context (endpoint, session ID, participant ID)
- Stack trace (internal only, never shown to clients)
- Request ID (for correlation with client reports)

**Log Levels**:
- ERROR: Vote persistence failure, process crash, constraint violations
- WARN: Rate limiting triggered, database slow, degraded mode
- INFO: Normal operations, health check passes

---

## Reliability Testing Strategy

### Chaos Engineering

**Scenarios**:
1. **Random Process Kills**: Kill random service instance every 60 seconds, verify no vote loss
2. **Network Partitions**: Drop 50% of packets for 30 seconds, verify recovery
3. **Database Failures**: Terminate database connections, verify queuing and recovery
4. **Overload**: Send 10x normal traffic, verify load shedding, no crashes
5. **Event Stream Failures**: Disable broadcast, verify REST API continues, events buffered

**Validation**: All scenarios recover automatically, zero vote loss, logs show proper error handling

---

### Failure Injection

**Method**: Introduce failures during load tests to validate recovery

**Examples**:
- Crash process during vote submission: Verify vote persisted or client received error
- Kill database during state transition: Verify state consistent after recovery
- Drop event messages: Verify clients replay successfully

**Acceptance**: All failures handled per specification, no silent data corruption

---

## Constitution Alignment

### Zero Vote Loss Principle

**Requirement**: "Once a vote is accepted, it must never be lost, duplicated, or altered"

**Reliability Alignment**:
- ✅ Durability guarantee: Votes persisted before acknowledgment
- ✅ Process crash recovery: Votes survive restarts
- ✅ Idempotency: Retries don't create duplicates
- ✅ Immutability: No endpoints modify accepted votes

**Validation**: Chaos test with crashes during voting, verify zero loss

---

### Temporary Network Interruptions

**Requirement**: "Temporary network interruptions must not result in data loss"

**Reliability Alignment**:
- ✅ Event replay: Clients recover missed events
- ✅ Retry logic: Clients retry failed commands
- ✅ Idempotency: Retries safe (duplicate detection)
- ✅ Connection resilience: Automatic reconnection

**Validation**: Simulate network failures, verify recovery

---

## Reliability Acceptance Criteria

System meets reliability requirements when:

1. ✅ Achieves 99.9% uptime over 30-day measurement period
2. ✅ Zero vote loss in chaos test with random process kills
3. ✅ Recovers from process crash within 10 seconds automatically
4. ✅ All state transitions consistent after failures (state machine validation)
5. ✅ Event replay succeeds for clients disconnected under 30 seconds
6. ✅ Database failover completes within 60 seconds with RPO ≤ 5 seconds
7. ✅ Load shedding activates at capacity without crashing
8. ✅ Circuit breaker opens/closes correctly for failing dependencies
9. ✅ Monthly backup restore test succeeds
10. ✅ All error responses include actionable messages, no internal details exposed

**Sign-off**: Reliability validated via chaos testing before production deployment
