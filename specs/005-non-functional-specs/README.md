# Non-Functional Requirements - Navigation and Overview

**Feature**: 005-non-functional-specs  
**Branch**: `005-non-functional-specs`  
**Created**: January 3, 2026

## Quick Links

- **[Performance Requirements](non-functional/performance.md)** - Latency, throughput, capacity targets
- **[Reliability Requirements](non-functional/reliability.md)** - Availability, durability, recovery objectives
- **[Security Requirements](non-functional/security.md)** - Authentication, authorization, input validation, rate limiting
- **[Scalability Requirements](non-functional/scalability.md)** - Horizontal scaling, capacity planning, resource efficiency
- **[Validation Report](validation-report.md)** - Constitution alignment and requirement verification
- **[Feature Specification](spec.md)** - User stories, requirements summary, success criteria

## What's Included

This specification defines quality attributes (non-functional requirements) for the Live Event Polling Application across four dimensions:

### Performance (performance.md)
- **Latency Targets**: REST < 200ms (p95), Events < 100ms (p95)
- **Throughput Capacity**: 100 votes/second per poll, 200 votes/second total
- **Connection Capacity**: 2000 concurrent WebSocket/SSE connections
- **Resource Budgets**: 3MB per participant, 10MB per session
- **Load Testing**: 5 scenarios including burst voting, soak tests, multi-session concurrency

### Reliability (reliability.md)
- **Uptime Target**: 99.9% availability during event hours
- **Vote Durability**: Zero loss guarantee with persist-before-acknowledge
- **Recovery Time**: 10-second RTO for process crashes
- **Event Replay**: 24-hour buffer for client reconnection
- **Chaos Testing**: Random process kills, network partitions, database failures

### Security (security.md)
- **Access Control**: Session access codes, presenter authority, participant anonymity
- **Input Validation**: Strict schema validation, HTML encoding, injection prevention
- **Rate Limiting**: 100 REST req/min, 10 connections/min per IP
- **Data Privacy**: Anonymous participation, no personal data, short-lived retention
- **Penetration Testing**: 6 attack scenarios including SQL injection, XSS, brute force

### Scalability (scalability.md)
- **Single Instance Capacity**: 500 concurrent participants
- **Linear Scaling**: Add 1 instance = +500 participant capacity
- **Auto-Scaling**: CPU/memory/latency triggers for elastic capacity
- **Session Isolation**: Prevent cross-session resource contention
- **Capacity Planning**: Support up to 100 concurrent sessions, 10,000 total participants

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                  Quality Attributes                          │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │Performance   │  │ Reliability  │  │  Security    │      │
│  │- Latency     │  │- Durability  │  │- Validation  │      │
│  │- Throughput  │  │- Recovery    │  │- Rate Limit  │      │
│  │- Capacity    │  │- Uptime      │  │- Privacy     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│            ┌──────────────────────────┐                     │
│            │    Scalability           │                     │
│            │ - Horizontal Scaling     │                     │
│            │ - Auto-Scaling           │                     │
│            │ - Resource Efficiency    │                     │
│            └──────────────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│               Application Services                           │
│  - REST API (commands)                                       │
│  - Event Stream (WebSocket/SSE)                             │
│  - Domain logic, state machines                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Metrics Summary

### Performance Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| REST Latency (p95) | < 200ms | Vote submission, session commands |
| Event Latency (p95) | < 100ms | VoteAccepted, PollActivated |
| Vote Processing Rate | 100 votes/sec (burst) | Per-poll capacity |
| Concurrent Participants | 500 per instance | Single-session capacity |
| Total Capacity | 2000 participants | Multi-instance aggregate |

### Reliability Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Uptime | 99.9% | During event hours (30-day window) |
| Recovery Time (RTO) | 10 seconds | Process crash to serving traffic |
| Data Loss (RPO) | 0 for accepted votes | Vote durability guarantee |
| Event Replay | 24 hours | Buffer retention for reconnection |
| Health Check Interval | 10 seconds | Monitoring frequency |

### Security Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| REST Rate Limit | 100 req/min per IP | Prevent abuse |
| Connection Rate Limit | 10/min per IP | Prevent exhaustion |
| Input Validation | 100% rejection of malformed | Penetration test pass rate |
| Access Code Strength | 6 characters (2.2B combos) | Brute force resistance |
| Penetration Test | Zero critical vulnerabilities | Quarterly security audit |

### Scalability Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Per-Instance Capacity | 500 participants | Load test verification |
| Scaling Factor | ~500 per instance added | Linear growth |
| Auto-Scale Trigger | CPU > 70% for 5 min | Elastic capacity |
| Scale-Up Time | < 60 seconds | New instance to serving |
| Resource Utilization | 60-80% at capacity | Efficiency target |

---

## Testing Strategy Overview

### Performance Testing

**Scenarios**:
1. **Normal Session Flow**: 300 participants, 10 polls, 15 minutes
2. **Voting Burst**: 400 votes in 10 seconds, zero loss validation
3. **Multi-Session Concurrency**: 5 sessions, 1000 total participants
4. **Soak Test**: 2 hours, 300 participants, performance stability
5. **Scalability Test**: 1→2→4 instances, linear capacity validation

**Tools**: Load testing framework (JMeter, K6, Locust-like tools)

**Success Criteria**: All latency targets met, zero vote loss, resource budgets respected

---

### Reliability Testing

**Scenarios**:
1. **Random Process Kills**: Kill instance every 60 seconds, verify recovery
2. **Network Partitions**: Drop 50% packets for 30 seconds, verify recovery
3. **Database Failures**: Terminate connections, verify queuing and recovery
4. **Overload**: 10x normal traffic, verify load shedding
5. **Event Stream Failures**: Disable broadcast, verify REST API continues

**Tools**: Chaos engineering framework (Chaos Monkey, Gremlin-like tools)

**Success Criteria**: All failures recover automatically, zero vote loss, logs show proper handling

---

### Security Testing

**Scenarios**:
1. **SQL Injection**: Submit malicious payloads in poll questions
2. **XSS Attack**: Submit `<script>` tags in options
3. **Brute Force**: Try 100 access codes for session join
4. **Unauthorized Commands**: Participant attempts presenter operations
5. **Duplicate Vote Flooding**: Submit same vote 1000 times
6. **Connection Exhaustion**: Open 10,000 event stream connections

**Tools**: Penetration testing tools (OWASP ZAP, Burp Suite-like tools)

**Success Criteria**: All attacks mitigated, zero successful exploits, no system crashes

---

### Scalability Testing

**Scenarios**:
1. **Single Session Scaling**: Ramp 100 → 500 participants
2. **Multi-Session Scaling**: 10 sessions, 100 participants each
3. **Auto-Scaling Test**: Trigger scale-up at 70% CPU, verify instance added
4. **Elastic Load Test**: Ramp up to 2000, hold, ramp down to 500

**Tools**: Load balancer, orchestration platform (Kubernetes-like, cloud auto-scaling)

**Success Criteria**: Linear capacity increase, smooth scaling, no cross-session interference

---

## Constitution Alignment Matrix

| Constitution Principle | NFR Coverage | Validation |
|----------------------|--------------|------------|
| **Real-Time First** | Event delivery < 100ms, REST < 200ms | ✅ Performance spec |
| **Zero Vote Loss** | Persist before ack, ACID consistency | ✅ Reliability spec |
| **High-Concurrency** | 100 votes/sec burst, 400 votes in 10s | ✅ Performance spec |
| **Presenter Authority** | Role-based authorization, presenter tokens | ✅ Security spec |
| **Anonymous Participation** | No personal data, vote anonymity | ✅ Security spec |
| **No Installation** | Browser-based (implicit in REST/WebSocket) | ✅ API contracts |
| **Read-Only Display** | Display role has zero commands | ✅ Security spec |

---

## Load Profiles

### Normal Load (Steady State)

```
Sessions: 5 active
Participants: 300 per session (1500 total)
Voting rate: 30 votes/second across all sessions
Event rate: 50 events/second broadcast
REST rate: 30 commands/second

Expected Performance:
- REST latency: p95 < 150ms
- Event latency: p95 < 75ms
- CPU utilization: 50%
- Memory utilization: 70%
```

### Peak Load (Burst)

```
Sessions: 5 active
Participants: 500 per session (2500 total, over capacity)
Voting rate: 100 votes/second (poll activation burst)
Event rate: 150 events/second broadcast
REST rate: 50 commands/second

Expected Performance:
- REST latency: p95 < 200ms (within SLA)
- Event latency: p95 < 100ms (within SLA)
- CPU utilization: 75%
- Memory utilization: 85%
- Load shedding: New joins rejected (503)
```

---

## Capacity Planning Examples

### Small Event (100 participants)

**Resources**: 1 instance (20% capacity)
**Configuration**: Single-region, no auto-scaling needed
**Cost**: Minimal (1 instance)

### Medium Event (500 participants)

**Resources**: 1-2 instances (100% of 1, HA with 2)
**Configuration**: Single-region, 2 instances for reliability
**Cost**: Moderate (2 instances for redundancy)

### Large Event (2000 participants)

**Resources**: 4 instances (4 × 500 capacity)
**Configuration**: Single-region, auto-scaling enabled
**Cost**: High (4 instances + load balancer)

### Multi-Event (10 concurrent sessions, 100 each)

**Resources**: 2 instances (1000 participant capacity)
**Configuration**: Load balancing, session distribution
**Cost**: Moderate (2 instances)

---

## Monitoring and Alerting

### Real-Time Dashboard

**Metrics Displayed**:
- Current participant count (total and per-session)
- Active sessions count
- REST latency (p50, p95, p99)
- Event latency (p50, p95, p99)
- Vote processing rate
- CPU and memory utilization per instance
- Error rate (4xx, 5xx responses)

**Update Frequency**: Every 5 seconds

---

### Alerting Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| REST p95 latency | > 200ms | > 400ms | Investigate load, scale up |
| Event p95 latency | > 100ms | > 200ms | Check event broadcast, network |
| CPU utilization | > 70% | > 85% | Trigger auto-scaling |
| Memory utilization | > 75% | > 90% | Check for leaks, scale up |
| Error rate | > 5% | > 10% | Incident response |
| Uptime | < 99.9% | < 99.0% | Escalate to on-call |

---

## Trade-Offs and Design Decisions

### Consistency vs. Availability

**Decision**: Prioritize Consistency (CP in CAP theorem)

**Rationale**: "Zero Vote Loss" requires strong consistency

**Trade-Off**: May return 503 during network partition rather than accept potentially lost votes

---

### Latency vs. Throughput

**Decision**: Prioritize Latency (real-time responsiveness)

**Rationale**: "Real-Time First" requires low latency over max throughput

**Trade-Off**: Lower theoretical throughput than batch-oriented design

---

### Security vs. Convenience

**Decision**: Balance security with usability

**Rationale**: Access codes provide security, but no login/registration required

**Trade-Off**: Less secure than full authentication, but aligns with "No Installation" principle

---

## Future Considerations

### Multi-Region Deployment

**When**: User base expands globally, latency concerns for distant users

**Benefits**:
- Lower latency for geographically distributed participants
- Higher availability (region failover)
- Compliance with data residency requirements

**Complexity**: Data replication, cross-region coordination, increased cost

---

### Advanced Caching

**When**: Read-heavy workload (many displays observing few active polls)

**Benefits**: Reduced database load, improved query performance

**Complexity**: Cache invalidation, consistency management

---

### Real-Time Analytics

**When**: Presenters want live engagement metrics beyond vote counts

**Benefits**: Richer insights (participation rate, voting speed, demographic breakdowns)

**Complexity**: Additional processing, privacy considerations

---

## Related Specifications

1. **[Constitution](../.specify/memory/constitution.md)** - Core principles and invariants
2. **[API Contracts](../004-api-contracts/README.md)** - REST endpoints and event stream
3. **[User Flows](../003-user-flows/README.md)** - Actor interaction patterns
4. **[State Machine](../002-state-transitions/domain/state-machine.md)** - Valid state transitions
5. **[Domain Specifications](../001-domain-specs/README.md)** - Core domain model

---

## Next Steps

With non-functional requirements defined, next phases could include:

1. **Implementation Planning** - Technology selection, architecture design, deployment strategy
2. **Performance Baseline** - Establish baseline metrics before optimization
3. **Load Testing Setup** - Configure load testing environment and scenarios
4. **Monitoring Setup** - Deploy metrics collection, dashboards, alerting
5. **Security Hardening** - Implement authentication, rate limiting, input validation
6. **Scalability Validation** - Verify auto-scaling configuration and capacity

---

**Non-functional requirements are ready for implementation and testing.**
