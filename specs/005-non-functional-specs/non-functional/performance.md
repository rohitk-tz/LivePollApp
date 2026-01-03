# Performance Requirements

**Created**: January 3, 2026  
**Status**: Draft  
**Feature**: 005-non-functional-specs

## Purpose

This specification defines performance requirements for the Live Event Polling Application to ensure "Real-Time First" responsiveness mandated by the constitution. All requirements are measurable, technology-agnostic, and directly support user experience during live events.

**References**:
- [Constitution](../../.specify/memory/constitution.md) - Real-Time First principle
- [REST API Contracts](../../004-api-contracts/api/rest.md)
- [Real-Time Event Contracts](../../004-api-contracts/api/realtime.md)

---

## Performance Principles

1. **Responsiveness Over Throughput**: Low latency for individual operations prioritized over maximum batch processing
2. **Consistent Performance**: Predictable response times more valuable than occasional fast responses with frequent spikes
3. **Burst Tolerance**: System must handle natural voting bursts when polls activate without degradation
4. **Graceful Degradation**: Under extreme load, throttle new requests rather than failing existing operations

---

## Latency Requirements

### REST API Latency

| Operation | Target (p95) | Maximum (p99) | Rationale |
|-----------|--------------|---------------|-----------|
| CreateSession | 150ms | 300ms | Initial setup, user expects immediate confirmation |
| StartSession | 100ms | 200ms | Critical transition, presenter waiting to share access code |
| JoinSession | 300ms | 500ms | Includes connection setup and state sync, user tolerance higher |
| SubmitVote | 150ms | 200ms | Time-sensitive during voting window, impacts user confidence |
| ActivatePoll | 100ms | 200ms | Presenter controlling flow, waiting for participant reaction |
| ClosePoll | 100ms | 200ms | Presenter controlling flow, moving to results |
| PauseSession | 100ms | 200ms | Emergency control, must be responsive |
| ResumeSession | 100ms | 200ms | Resuming flow, presenter waiting |
| EndSession | 150ms | 300ms | Session conclusion, less time-critical |
| Query operations (GET) | 100ms | 150ms | Read-only, should feel instant |

**Measurement Method**: Measure server-side processing time from request receipt to response send (excludes network latency)

**Validation**: Load test with 300 concurrent participants, measure latencies over 30-minute duration, verify p95 and p99 thresholds met

---

### Event Stream Latency

| Event Type | Target (p95) | Maximum (p99) | Rationale |
|------------|--------------|---------------|-----------|
| SessionStarted | 50ms | 100ms | Critical for participant join experience |
| PollActivated | 50ms | 100ms | Must reach all participants quickly to start voting |
| VoteAccepted | 75ms | 100ms | Real-time feedback to all observers |
| PollClosed | 50ms | 100ms | Must stop vote submissions promptly |
| All other events | 100ms | 150ms | Still real-time but less critical timing |

**Measurement Method**: Timestamp event occurrence in domain layer, timestamp event delivery to client, calculate delta

**Validation**: Monitor event delivery latency in production with distributed tracing, verify percentiles meet targets

**Note**: Latency measured from domain event emission to client message receipt, includes:
- Event serialization
- Broadcast/fanout to connected clients
- Network transmission
- Client parsing

Does NOT include client UI rendering time.

---

## Throughput Requirements

### Vote Processing Capacity

- **Sustained**: 50 votes/second per poll (normal voting pace)
- **Burst**: 100 votes/second per poll (poll activation burst)
- **Duration**: Sustain burst rate for 10 seconds minimum (400-500 participants voting)

**Rationale**: When poll activates in 500-participant session, expect 80% participation within 10 seconds = 400 votes in 10s = 40 votes/second average, with initial spike higher

**Validation**: Load test with 500 simulated participants, activate poll, have 400 submit votes over 10 seconds with realistic timing distribution (front-loaded)

---

### Connection Capacity

- **Event Stream Connections**: 2000 concurrent WebSocket/SSE connections total
- **Connection Rate**: Support 50 new connections/second (thundering herd on session start)
- **Connection Overhead**: Each connection consumes under 1MB memory average

**Rationale**: Support 4 large sessions (500 participants each) concurrently, or 20 small sessions (100 participants each)

**Validation**: Load test establishing 2000 connections over 60 seconds, verify all accept, measure memory per connection

---

### Command Processing Rate

- **Session Commands**: 10 commands/second (presenter operations are infrequent)
- **Poll Commands**: 20 commands/second (multiple presenters, poll creation/activation)
- **Vote Commands**: 200 votes/second total across all sessions (aggregate capacity)
- **Query Operations**: 100 queries/second (displays and monitoring)

**Rationale**: Votes dominate traffic, must support concurrent voting across multiple active polls

**Validation**: Load test with mixed command types at specified rates, verify all process within latency targets

---

## Resource Utilization Targets

### Per-Session Resource Budget

- **Memory**: 10MB per session (includes session metadata, participant list, poll definitions)
- **Memory per Participant**: 100KB per connected participant (connection state, vote history)
- **CPU**: Under 5% of one core per session at 100 participants (normal voting activity)

**Rationale**: Enables 20 concurrent sessions with 100 participants each on modest hardware (2GB memory, 4 cores)

**Calculation Example**:
```
20 sessions × 10MB = 200MB
20 sessions × 100 participants × 100KB = 200MB
Total: 400MB for 2000 participants
```

**Validation**: Monitor resource usage in load tests, verify per-session consumption within budget

---

### Scalability Math

**Single Instance Capacity**:
- Memory: 2GB allocated, 1.5GB usable after overhead = 1500MB
- 1500MB ÷ 3MB per participant (includes session overhead) = 500 participants
- Target: 500 concurrent participants per instance with headroom

**Multi-Instance Scaling**:
- 2 instances = 1000 participants
- 4 instances = 2000 participants
- 8 instances = 4000 participants

**Linear scaling assumption**: No shared bottlenecks (database, message broker can scale independently)

---

## Performance Under Load

### Normal Load Profile

| Metric | Value |
|--------|-------|
| Concurrent participants | 300 per session |
| Active polls | 1 per session |
| Voting rate | 30 votes/second during voting window |
| Event stream messages | 50 events/second broadcast |
| REST requests | 10 commands/second + 20 queries/second |

**Expected Performance**:
- REST latency: p95 under 150ms
- Event latency: p95 under 75ms
- CPU utilization: 40-50% of allocated cores
- Memory utilization: 60-70% of allocated memory

---

### Peak Load Profile

| Metric | Value |
|--------|-------|
| Concurrent participants | 500 per session |
| Active polls | 1 per session (just activated) |
| Voting rate | 100 votes/second for 10 seconds (burst) |
| Event stream messages | 150 events/second broadcast (vote updates) |
| REST requests | 50 commands/second + 30 queries/second |

**Expected Performance**:
- REST latency: p95 under 200ms (still within SLA)
- Event latency: p95 under 100ms (constitution requirement)
- CPU utilization: 70-80% (headroom for spikes)
- Memory utilization: 80-85% (burst capacity)

**Validation**: Peak load test for 5 minutes, verify performance degradation under 10% from normal load

---

### Overload Behavior

**When capacity exceeded** (e.g., 600 participants try to join 500-participant capacity session):

1. **Detection**: Monitor request rate, latency, queue depth
2. **Response**: 
   - Return 503 Service Unavailable for new JoinSession requests
   - Existing participants continue operating normally
   - Event stream maintains delivery guarantees
3. **Recovery**: As participants leave, accept new joins
4. **Metrics**: Emit overload events for monitoring/alerting

**Rationale**: Fail new requests rather than degrade all users' experience

---

## Performance Testing Strategy

### Load Testing Scenarios

#### Scenario 1: Normal Session Flow
- **Setup**: 300 participants join over 60 seconds
- **Activity**: 10 polls, each active for 60 seconds, 80% participation
- **Duration**: 15 minutes
- **Validation**: All latency targets met throughout

#### Scenario 2: Voting Burst
- **Setup**: 500 participants connected
- **Activity**: Activate poll, 400 participants vote within 10 seconds
- **Duration**: 30 seconds (includes setup and results)
- **Validation**: Zero vote loss, all votes under 200ms, event delivery under 100ms

#### Scenario 3: Multi-Session Concurrency
- **Setup**: 5 sessions with 200 participants each (1000 total)
- **Activity**: Mixed voting activity across sessions
- **Duration**: 30 minutes
- **Validation**: No cross-session performance interference

#### Scenario 4: Soak Test
- **Setup**: 300 participants in 2-hour session
- **Activity**: Continuous voting, 20 polls over duration
- **Duration**: 2 hours
- **Validation**: Performance stable, no memory leaks, latency variance under 20%

#### Scenario 5: Scalability Test
- **Setup**: Test with 1, 2, 4 instances
- **Activity**: Increase participant count proportionally
- **Duration**: 15 minutes per configuration
- **Validation**: Linear capacity increase, consistent per-user latency

---

### Performance Monitoring

#### Real-Time Metrics (Emitted Continuously)

- `rest_latency_ms{endpoint, percentile}` - REST endpoint latency
- `event_latency_ms{event_type, percentile}` - Event delivery latency
- `votes_per_second{session_id, poll_id}` - Vote processing rate
- `active_connections{type}` - WebSocket/SSE connection count
- `active_participants{session_id}` - Participant count per session
- `cpu_utilization_percent` - CPU usage
- `memory_utilization_bytes` - Memory usage
- `command_rate{command_type}` - Command processing rate

#### Alerting Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| REST p95 latency | > 200ms | > 400ms | Investigate load, consider scaling |
| Event p95 latency | > 100ms | > 200ms | Check broadcast subsystem, network |
| Vote processing rate | < 50/sec | < 25/sec | Check database, validate capacity |
| CPU utilization | > 70% | > 85% | Scale horizontally |
| Memory utilization | > 75% | > 90% | Investigate leaks, scale if needed |
| Connection errors | > 5% | > 10% | Check network, load balancer config |

---

## Performance Degradation Scenarios

### Acceptable Degradation Patterns

| Condition | Degradation | Acceptable? | Mitigation |
|-----------|-------------|-------------|------------|
| 10% over capacity | +20% latency | ✅ Yes | Temporary, recovers when load drops |
| 25% over capacity | +50% latency | ⚠️ Marginal | Throttle new joins, alert operators |
| 50% over capacity | +100% latency | ❌ No | Hard limit, reject new requests |
| Database slow | Vote latency +100ms | ⚠️ Marginal | Queue votes, async processing |
| Network congestion | Event delivery +50ms | ⚠️ Marginal | Still under 150ms if baseline good |

---

### Unacceptable Degradation

- Vote loss under any load condition (violates Zero Vote Loss)
- Event delivery exceeding 300ms (breaks real-time experience)
- REST latency exceeding 1 second (user perceives as timeout)
- Complete service unavailability for over 10 seconds (violates recovery requirement)

---

## Performance Optimization Guidelines

### Efficient Patterns

1. **Batch Event Broadcasting**: Deliver single event to all 500 connections in one broadcast operation
2. **Connection Pooling**: Reuse database connections across requests
3. **Lazy Loading**: Don't fetch full poll history on session join, only active poll
4. **Stateless Services**: Enable horizontal scaling without session affinity
5. **Async Vote Processing**: Acknowledge vote synchronously, broadcast event asynchronously

### Anti-Patterns to Avoid

1. ❌ **Sequential Event Delivery**: Don't send events one-by-one to each client
2. ❌ **Blocking I/O**: Don't block request thread waiting for database
3. ❌ **Memory Leaks**: Don't accumulate unclosed connections or unbounded caches
4. ❌ **N+1 Queries**: Don't fetch participants one-by-one when broadcasting events
5. ❌ **Synchronous Cascades**: Don't wait for all clients to acknowledge event before responding

---

## Constitution Alignment

### Real-Time First Principle

**Requirement**: "Live updates must feel instantaneous to users"

**Performance Alignment**:
- ✅ Event delivery under 100ms (p95) ensures instant perception
- ✅ REST responses under 200ms (p95) provide immediate feedback
- ✅ No polling required due to event stream architecture

**Validation**: User perception study shows updates feel instant with <100ms latency

---

### High-Concurrency Voting Bursts

**Requirement**: "System must support high-concurrency voting bursts"

**Performance Alignment**:
- ✅ 100 votes/second burst capacity per poll
- ✅ 400 votes in 10 seconds supported (typical poll activation)
- ✅ Zero vote loss during bursts via synchronous acknowledgment

**Validation**: Load test with 400 simultaneous votes, zero loss, all under 200ms

---

## Performance Acceptance Criteria

System meets performance requirements when:

1. ✅ All REST endpoints meet p95 latency targets in load tests
2. ✅ All event types meet p95 delivery latency targets
3. ✅ Vote burst test (400 votes in 10s) completes with zero loss
4. ✅ Soak test (2 hours) shows latency variance under 20%
5. ✅ Multi-session test (1000 participants) shows no cross-session interference
6. ✅ Scalability test demonstrates linear capacity increase with instances
7. ✅ Overload test shows graceful degradation (503 responses, no crashes)
8. ✅ Resource utilization stays within budgets at target loads
9. ✅ All monitoring metrics emit correctly with <1s delay
10. ✅ Performance under peak load degrades less than 10% vs normal load

**Sign-off**: Performance validated via load testing before production deployment
