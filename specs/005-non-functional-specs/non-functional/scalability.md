# Scalability Requirements

**Created**: January 3, 2026  
**Status**: Draft  
**Feature**: 005-non-functional-specs

## Purpose

This specification defines scalability requirements for the Live Event Polling Application to support growth from small events (50 participants) to large events (2000+ participants) through horizontal scaling. Requirements are implementation-agnostic and focus on capacity planning and scaling patterns.

**References**:
- [Constitution](../../.specify/memory/constitution.md) - High-concurrency voting requirement
- [Performance Requirements](performance.md) - Per-instance capacity targets
- [REST API Contracts](../../004-api-contracts/api/rest.md)

---

## Scalability Principles

1. **Horizontal Scaling**: Add more instances rather than bigger instances (scale-out vs scale-up)
2. **Stateless Services**: Instances share no state, enabling independent scaling
3. **Linear Capacity Growth**: Adding N instances increases capacity by ~N× (near-linear)
4. **Elastic Scaling**: Add/remove capacity dynamically based on load
5. **Isolation**: Sessions isolated to prevent cross-session resource contention

---

## Capacity Planning

### Single Instance Capacity

**Target**: 500 concurrent participants per instance

**Basis**:
- Memory: 2GB allocated, 1.5GB usable
- Per-participant memory: ~3MB (connection state, session data, buffers)
- 1500MB ÷ 3MB = 500 participants
- CPU headroom: 40-50% utilization at capacity (burst tolerance)

**Measured Metrics**:
- 500 participants voting on single poll: p95 latency < 200ms
- Event delivery: p95 < 100ms to all 500 connections
- CPU utilization: 60-70% at capacity (steady state)
- Memory utilization: 80% at capacity

---

### Multi-Instance Capacity

| Instances | Target Capacity | Use Cases |
|-----------|-----------------|-----------|
| 1 | 500 participants | Small events, development, testing |
| 2 | 1000 participants | Medium events, high availability |
| 4 | 2000 participants | Large events, peak load |
| 8 | 4000 participants | Very large events, growth buffer |

**Scaling Factor**: Each additional instance adds ~500 participant capacity (linear)

**Overhead**: ~5% capacity lost to coordination/redundancy (acceptable)

---

### Session Distribution

**Strategy**: Distribute sessions across instances using load balancing

**Distribution Methods**:

1. **Round-Robin**: New sessions assigned to instances in rotation
2. **Least-Loaded**: New sessions assigned to instance with fewest participants
3. **Session Affinity** (optional): All requests for session routed to same instance

**Recommendation**: Least-loaded distribution with session affinity for efficiency

**Example**:
```
4 instances, 8 sessions:
Instance 1: Session A (300 participants), Session E (150 participants)
Instance 2: Session B (400 participants)
Instance 3: Session C (200 participants), Session F (200 participants)
Instance 4: Session D (100 participants), Session G (100 participants), Session H (50 participants)

Total: 1500 participants across 4 instances
Avg load: 375 participants per instance (within capacity)
```

---

## Scaling Triggers

### Scale-Up Triggers (Add Capacity)

**Trigger 1: CPU Utilization**
- Threshold: Average CPU > 70% across all instances for 5 minutes
- Action: Add 1 instance
- Rationale: Approaching capacity, add headroom before performance degrades

**Trigger 2: Memory Utilization**
- Threshold: Average memory > 75% across all instances for 5 minutes
- Action: Add 1 instance
- Rationale: Memory exhaustion leads to crashes

**Trigger 3: Connection Count**
- Threshold: Total connections > 80% of capacity (4000 of 5000 max)
- Action: Add 1 instance
- Rationale: Approaching connection limit, expand capacity

**Trigger 4: Latency Degradation**
- Threshold: p95 REST latency > 250ms for 3 minutes
- Action: Add 1 instance
- Rationale: Performance degrading, load too high

---

### Scale-Down Triggers (Remove Capacity)

**Trigger 1: Low CPU Utilization**
- Threshold: Average CPU < 30% across all instances for 15 minutes
- Action: Remove 1 instance (drain connections gracefully)
- Rationale: Over-provisioned, reduce cost

**Trigger 2: Low Connection Count**
- Threshold: Total connections < 40% of capacity for 15 minutes
- Action: Remove 1 instance
- Rationale: Under-utilized, consolidate load

**Minimum Instances**: Always maintain at least 2 instances (high availability)

**Cool-Down Period**: Wait 5 minutes after scaling before next scaling decision (prevent flapping)

---

## Scaling Mechanics

### Adding Capacity (Scale-Up)

**Process**:
1. Provision new instance (or start stopped instance)
2. New instance performs health check, reports "healthy"
3. Load balancer adds instance to pool
4. New sessions distributed to new instance
5. Capacity increased immediately (new sessions) or gradually (existing sessions complete)

**Time to Scale**: Under 60 seconds from trigger to instance accepting traffic

**Impact**: Zero impact on existing sessions (new capacity absorbs new load)

---

### Removing Capacity (Scale-Down)

**Process**:
1. Select instance to remove (prefer one with fewest active sessions)
2. Mark instance as "draining" in load balancer
3. Stop routing new sessions to instance
4. Wait for existing sessions to end naturally OR migrate sessions (if supported)
5. Once instance idle (zero sessions), terminate instance

**Time to Scale Down**: Variable (depends on session duration)

**Graceful Shutdown**: Instance continues serving existing sessions until empty

**Impact**: Zero impact on users (sessions complete before instance removal)

---

### Emergency Scaling

**Scenario**: Sudden traffic spike (10x normal load)

**Response**:
1. **Immediate**: Activate rate limiting, load shedding (reject new joins)
2. **Fast** (60 seconds): Add 2 instances in parallel
3. **Follow-Up**: Add more capacity if load sustained

**Trade-Off**: Brief degradation (rate limiting) preferable to total system failure

---

## Scalability Limits

### Per-Session Limits

- **Maximum Participants**: 1000 per session
- **Rationale**: Beyond 1000, event broadcast latency increases (O(N) fanout)
- **Mitigation**: For larger events, split into multiple sessions

**Example**: 2000-person event → 2 sessions with 1000 participants each

---

### System-Wide Limits

- **Maximum Concurrent Sessions**: 100 across all instances
- **Maximum Concurrent Participants**: 10,000 across all instances (20 instances)
- **Rationale**: Designed for typical enterprise/conference use cases

**Growth Path**: Increase limits by adding more instances or optimizing per-instance capacity

---

### Database Scalability

**Constraint**: Database may become bottleneck before application servers

**Capacity Planning**:
- **Writes**: 200 votes/second (current capacity)
- **Reads**: 1000 queries/second (current capacity)
- **Connections**: 500 concurrent connections (connection pooling)

**Scaling Database**:
- **Vertical**: Increase database instance size (CPU, memory, IOPS)
- **Horizontal**: Read replicas for queries, single primary for writes
- **Sharding** (future): Partition data by session ID for write scalability

**Bottleneck Detection**: Monitor database CPU, query latency, connection saturation

---

## Load Balancing Strategy

### Load Balancer Requirements

**Distribution Algorithm**: Least-connections or least-loaded (prefer balanced distribution)

**Health Checks**:
- Frequency: Every 10 seconds
- Timeout: 3 seconds
- Unhealthy Threshold: 3 consecutive failures
- Healthy Threshold: 2 consecutive successes

**Session Affinity**:
- **REST API**: Optional (stateless requests work anywhere)
- **Event Stream**: Required (WebSocket connection to specific instance)

**Affinity Mechanism**: Use session ID for routing (e.g., consistent hashing)

---

### Load Balancer Failure Handling

**Scenario**: Instance fails health check

**Response**:
1. Load balancer stops routing new requests to instance
2. Existing connections remain until client reconnects (for event streams)
3. Clients automatically reconnect to healthy instance
4. Event replay ensures no missed events

**Failover Time**: Under 30 seconds (health check interval + reconnection)

---

## Multi-Region Scalability (Optional)

**Deployment Model**: Single-region initially, multi-region for growth

### Single-Region Architecture

**Pros**:
- Simple deployment
- Low latency within region
- No cross-region replication complexity

**Cons**:
- Limited to users in one geographic area
- Single point of failure (regional outage)

**Suitable For**: Up to 10,000 concurrent participants in one region

---

### Multi-Region Architecture (Future)

**Deployment**: Instances in multiple regions (US, EU, APAC)

**Routing**: Users routed to nearest region (geo-DNS or CDN)

**Data Replication**: Session data replicated across regions (eventual consistency acceptable for displays, strong consistency for votes)

**Use Case**: Global events with participants worldwide

**Complexity**: Increases operational overhead (monitoring, deployment, data sync)

---

## Scalability Testing Strategy

### Load Testing Scenarios

#### Scenario 1: Single Session Scaling
- **Start**: 100 participants
- **Ramp**: Add 50 participants every 30 seconds
- **Peak**: 500 participants
- **Duration**: 30 minutes at peak
- **Validation**: Latency stable throughout ramp-up

#### Scenario 2: Multi-Session Scaling
- **Setup**: 10 sessions starting with 50 participants each
- **Ramp**: Each session adds participants to 100
- **Total**: 1000 participants across 10 sessions
- **Validation**: No cross-session interference

#### Scenario 3: Auto-Scaling Test
- **Setup**: Start with 2 instances (1000 capacity)
- **Ramp**: Add participants until 1200 (trigger scale-up)
- **Expected**: 3rd instance added automatically within 60 seconds
- **Validation**: Capacity increases, latency remains stable

#### Scenario 4: Elastic Load Test
- **Phase 1**: Ramp up to 2000 participants (peak load)
- **Phase 2**: Hold for 15 minutes
- **Phase 3**: Ramp down to 500 participants (scale-down trigger)
- **Expected**: Instances removed after cool-down period
- **Validation**: Smooth scaling up and down

---

### Capacity Benchmarking

**Objective**: Determine actual per-instance capacity limits

**Method**:
1. Single instance, single session
2. Ramp participants from 100 to 1000 in increments of 50
3. Measure latency at each increment
4. Identify point where latency exceeds SLA (capacity limit)

**Expected**: Capacity limit around 500 participants (latency degrades beyond)

**Documentation**: Record actual capacity for future planning

---

## Resource Efficiency

### Cost Optimization

**Objective**: Minimize infrastructure cost while meeting performance SLAs

**Strategies**:
1. **Right-Sizing**: Use instance size matching workload (avoid over-provisioning)
2. **Auto-Scaling**: Scale down during off-peak hours
3. **Reserved Capacity**: Pre-purchase instances for predictable load
4. **Spot Instances** (if applicable): Use cheaper spot instances for non-critical workloads

**Cost Metrics**:
- Cost per participant per hour
- Cost per session
- Infrastructure cost as percentage of revenue (if commercial product)

---

### Resource Utilization Targets

**Efficient Utilization**:
- CPU: 50-70% average (headroom for bursts)
- Memory: 60-80% average
- Network: 40-60% of bandwidth

**Over-Provisioned** (waste):
- CPU: <30% average
- Action: Scale down

**Under-Provisioned** (risk):
- CPU: >80% average
- Action: Scale up immediately

---

## Session Lifecycle and Resource Management

### Session Resource Allocation

**On Session Creation**:
- Allocate session metadata (10MB)
- Reserve participant capacity (e.g., 100 slots initially)

**During Session**:
- Allocate per-participant resources as they join (100KB each)
- Allocate per-poll resources as polls created (1MB each)

**On Session End**:
- Release all session resources within 60 seconds
- Trigger garbage collection
- Resources available for new sessions

---

### Resource Reclamation

**Idle Session Cleanup**:
- Sessions with zero participants for 1 hour → automatic cleanup (optional)
- Ended sessions → cleanup after 24 hours (event buffer expires)

**Connection Cleanup**:
- Disconnected event streams closed after 5 minutes of inactivity
- Zombie connections detected via keep-alive and forcibly closed

---

## Scalability Constraints and Trade-Offs

### Consistency vs. Availability (CAP Theorem)

**Choice**: Prioritize Consistency and Partition Tolerance (CP)

**Rationale**: "Zero Vote Loss" requires consistency; brief unavailability acceptable during partition

**Trade-Off**: System may reject writes during network partition rather than risk data loss

**User Impact**: 503 errors during partition, recovers when partition heals

---

### Latency vs. Throughput

**Choice**: Prioritize Latency (real-time responsiveness)

**Rationale**: "Real-Time First" requires low latency; batch processing unacceptable

**Trade-Off**: Lower maximum throughput than batch-oriented design

**User Impact**: Feels instant (good), but max capacity lower than theoretical max

---

### Isolation vs. Efficiency

**Choice**: Moderate isolation (session-level isolation, shared infrastructure)

**Rationale**: Balance multi-tenancy efficiency with acceptable blast radius

**Trade-Off**: One session's load can impact others (mitigated by load balancing)

**User Impact**: Most users unaffected, rare cases of cross-session interference

---

## Scalability Monitoring

### Key Metrics

- `instances_active` - Number of running instances
- `participants_per_instance` - Participant count per instance
- `cpu_utilization_per_instance` - CPU percentage per instance
- `memory_utilization_per_instance` - Memory usage per instance
- `sessions_per_instance` - Session count per instance
- `scaling_events{type}` - Count of scale-up/scale-down events
- `capacity_utilization_percent` - Current load as percentage of total capacity

### Capacity Dashboards

**Real-Time Dashboard**:
- Current total capacity (participants)
- Current utilization (participants / capacity)
- Per-instance load (participants per instance)
- Headroom (capacity remaining before scale-up trigger)

**Planning Dashboard**:
- Historical capacity utilization over time
- Peak utilization by day/hour (identify patterns)
- Cost per participant (efficiency metric)
- Scaling event history (frequency of scaling)

---

## Constitution Alignment

### High-Concurrency Voting Bursts

**Requirement**: "System must support high-concurrency voting bursts"

**Scalability Alignment**:
- ✅ Horizontal scaling increases burst capacity linearly
- ✅ Load balancing distributes bursts across instances
- ✅ Per-instance capacity (100 votes/second) scales to 400 votes/second with 4 instances

---

### Multiple Concurrent Events

**Requirement**: System supports multiple simultaneous events

**Scalability Alignment**:
- ✅ Session isolation prevents cross-session interference
- ✅ Load balancing distributes sessions across instances
- ✅ 100 concurrent sessions supported (realistic multi-event scenario)

---

## Scalability Acceptance Criteria

System meets scalability requirements when:

1. ✅ Single instance supports 500 concurrent participants with SLA latency
2. ✅ Adding 1 instance increases capacity by ~500 participants (linear scaling)
3. ✅ Auto-scaling adds instance within 60 seconds when CPU > 70%
4. ✅ Load balancing distributes sessions evenly (variance < 20%)
5. ✅ 10 concurrent sessions show no cross-session performance interference
6. ✅ Elastic load test scales up to 2000 participants, then down to 500 smoothly
7. ✅ Session resource cleanup completes within 60 seconds of session end
8. ✅ Database scales to 200 votes/second with read replicas for queries
9. ✅ Capacity utilization metrics emit correctly, dashboards visualize current state
10. ✅ System supports 100 concurrent sessions across instances without degradation

**Sign-off**: Scalability validated via load testing and auto-scaling tests before production deployment
