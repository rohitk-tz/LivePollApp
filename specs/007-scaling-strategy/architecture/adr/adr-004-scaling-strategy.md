# ADR-004: Scaling Strategy

**Status**: Accepted  
**Date**: January 3, 2026  
**Decision-Makers**: Architecture Team  
**Consulted**: Development Team, Operations Team, Infrastructure Team

---

## Context

The Live Event Polling Application requires a scaling strategy that balances operational simplicity for initial deployment with the ability to grow capacity when demand increases. The strategy must preserve real-time communication semantics, maintain Zero Vote Loss guarantees, and support the Modular Monolith architecture.

### Constitution Requirements

**Real-Time First Principle**:
> "All participant actions must be reflected system-wide in near real-time without manual refresh."

**Scaling Implications**:
- Real-time events must reach all participants in a session regardless of which application instance they're connected to
- Message ordering per session must be preserved across instances
- Event broadcast cannot introduce significant latency overhead

**Zero Vote Loss Principle**:
> "Once a vote is accepted, it must never be lost, duplicated, or altered."

**Scaling Implications**:
- Horizontal scaling cannot compromise ACID transaction guarantees
- Vote acceptance acknowledgment must guarantee durability before response
- Database consistency must be maintained across multiple application instances

**High-Concurrency Requirement**:
> "The system must support voting bursts when polls activate."

**Scaling Implications**:
- Must handle 400+ participants voting within 2-second window
- Burst capacity may exceed single instance capabilities
- Scaling strategy must enable capacity growth for larger events

### Non-Functional Requirements

**Performance Requirements** (from NFR specs):
- REST API latency: < 200ms (p95)
- Event delivery: < 100ms (p95)
- Vote processing: 100 votes/second burst capacity
- Session join: < 500ms (includes connection + state sync)

**Scalability Requirements**:
- **NFR-P003**: Single instance must support 500 concurrent participants
- **NFR-P007**: System must support 2000 total concurrent participants across all instances
- **NFR-P008**: Horizontal scaling must provide linear capacity growth (N instances = N × 500 capacity)

**Reliability Requirements**:
- **NFR-R003**: Recovery from process crashes within 10 seconds
- **NFR-R006**: Graceful shutdown without terminating active sessions
- **NFR-R007**: Session state consistency under concurrent operations

### Architectural Constraints

**From ADR-001 (Modular Monolith)**:
- Single deployable unit with logical modules
- Stateless application instances preferred for horizontal scaling
- In-process event bus for module-to-module communication
- Shared database for persistence

**From ADR-002 (WebSocket + SSE)**:
- Long-lived stateful connections (2+ hours)
- 24-hour event replay buffer required
- Session-scoped event subscriptions
- Connection persistence across request/response cycles

**From ADR-003 (RDBMS Persistence)**:
- ACID transactions via relational database
- Single database master for write operations
- Read replicas for query scaling
- Database connection pooling required

### Current State and Growth Projections

**Initial Deployment**:
- Target capacity: 500 concurrent participants
- Typical event size: 50-200 participants
- Expected load: 2-5 concurrent sessions
- Deployment environment: Single region cloud infrastructure

**Growth Projections**:
- 6-month target: 1000 concurrent participants
- 12-month target: 2000 concurrent participants
- 18-month target: 5000+ concurrent participants
- Unknown: Peak demand during viral events

### Operational Considerations

**Development Team**:
- Stronger expertise in monolithic architectures
- Limited distributed systems experience
- Prefer simple operational model initially

**Infrastructure Team**:
- Cloud-native deployment (containers, orchestration)
- Experience with load balancing, auto-scaling
- 24/7 monitoring and alerting capabilities

**Budget Constraints**:
- Cost-conscious initial deployment (avoid over-provisioning)
- Pay-for-usage preferred over fixed capacity
- Manual scaling acceptable initially, auto-scaling later

---

## Decision

**We will implement a Start Simple, Scale on Demand strategy: Deploy initially on a single application instance with the capability to scale horizontally to multiple instances when capacity requirements increase.**

### Definition

**Start Simple, Scale on Demand** means:

1. **Initial Deployment**: Single application instance handles all traffic
   - Supports 500 concurrent participants (target capacity)
   - Simplest operational model (single process, no coordination)
   - Lowest cost (minimal infrastructure)

2. **Scale Trigger**: Add instances when capacity thresholds reached
   - Connection count approaches 400+ (80% of 500 capacity)
   - Event delivery latency degrades (approaching 100ms limit)
   - CPU/memory utilization exceeds 70% sustained

3. **Horizontal Scaling**: Add stateless application instances behind load balancer
   - Each instance supports 500 concurrent participants
   - Load balancer distributes connections across instances
   - Sticky sessions ensure connection persistence
   - Shared database for all instances

4. **Elastic Growth**: Continue adding instances as demand grows
   - 2 instances = 1000 participants
   - 4 instances = 2000 participants
   - 10 instances = 5000 participants (18-month target)

### Scaling Topology

**Single Instance (Initial)**:

```
┌─────────────┐
│   Clients   │ (500 max)
└──────┬──────┘
       │
       │ WebSocket/HTTPS
       ▼
┌─────────────────────┐
│  Application Node   │
│  - REST API         │
│  - WebSocket Server │
│  - Event Bus        │
│  - Business Logic   │
└─────────┬───────────┘
          │
          │ SQL
          ▼
┌─────────────────────┐
│   Database (RDBMS)  │
│   - Master (writes) │
└─────────────────────┘
```

**Multi-Instance (Scaled)**:

```
┌─────────────┐
│   Clients   │ (2000 max)
└──────┬──────┘
       │
       │ WebSocket/HTTPS
       ▼
┌─────────────────────────────────────────────┐
│         Load Balancer                       │
│         - Sticky Sessions (WebSocket)       │
│         - Round-Robin (REST)                │
└─────┬──────────────────┬────────────────────┘
      │                  │
      │                  │
      ▼                  ▼
┌───────────────┐  ┌───────────────┐
│ Application   │  │ Application   │  ... (N instances)
│ Instance 1    │  │ Instance 2    │
│ (500 max)     │  │ (500 max)     │
└───────┬───────┘  └───────┬───────┘
        │                  │
        │                  │
        └──────────┬───────┘
                   │ SQL
                   ▼
┌───────────────────────────────────────────┐
│           Database (RDBMS)                │
│   - Master (writes)                       │
│   - Read Replicas (queries)               │
└───────────────────────────────────────────┘
```

### Key Design Decisions

**1. Stateless Application Instances**:
- No in-memory state shared across instances
- Session state persisted in database
- Event replay buffer persisted in database (24-hour retention table)
- WebSocket connections are stateful but session data is not

**2. Sticky Sessions for WebSocket Connections**:
- Load balancer routes client to same instance for connection duration
- Connection persists for event session (up to 2+ hours)
- Connection loss triggers reconnection (may land on different instance)
- Event replay from database enables seamless reconnection

**3. Shared Database for All Instances**:
- Single database master handles all writes (ACID transactions)
- Read replicas for query load distribution
- Database connection pooling per instance
- All instances see consistent state immediately (strong consistency)

**4. Session-Scoped Event Broadcasting**:
- Each instance broadcasts to its own connected clients
- Events persisted in database event_log table before broadcast
- Other instances poll or subscribe to event_log for their connected clients
- Polling interval: 100ms (acceptable latency overhead)

**5. Manual Scaling Initially, Auto-Scaling Later**:
- Phase 1 (0-6 months): Manual instance addition based on monitoring alerts
- Phase 2 (6-12 months): Auto-scaling rules based on CPU, connection count
- Phase 3 (12+ months): Predictive scaling based on scheduled events

---

## Alternatives Considered

### Alternative 1: Always-On Horizontal Scaling (Multi-Instance from Day 1)

**Description**: Deploy with minimum 2 instances from initial launch, establish horizontal scaling patterns immediately.

**Pros**:
- Scaling patterns tested from day 1
- Built-in redundancy (instance failure doesn't take down system)
- No architecture changes needed when scaling
- Validates load balancer configuration early

**Cons**:
- Higher initial costs (2× infrastructure even with low load)
- Over-provisioned for initial demand (500 target, 1000 capacity)
- Additional operational complexity (load balancer, sticky sessions) from start
- More complex debugging (which instance handled request?)

**Rejection Rationale**: Over-provisioning for uncertain demand contradicts cost-conscious deployment. Operational complexity without immediate benefit. Scaling patterns can be validated in staging environment before production need. 500 participant capacity sufficient for initial MVP launch based on market research.

---

### Alternative 2: Pure Single-Node Without Scaling Path

**Description**: Deploy single application instance with no provisions for horizontal scaling. If capacity exceeded, scale vertically (larger instance) only.

**Pros**:
- Simplest possible architecture
- No load balancer, sticky sessions, or coordination logic
- Lowest operational complexity
- Lowest cost for initial deployment
- No inter-instance communication needed

**Cons**:
- **Vertical scaling limits**: Single instance ceiling (16-32 vCPUs typical cloud limit)
- **No redundancy**: Instance failure = complete system outage
- **Scaling delays**: Vertical scaling requires instance restart (downtime)
- **Growth constraint**: May hit single-instance limits faster than expected
- **Risky bet**: What if event goes viral and demand spikes 10×?

**Rejection Rationale**: Too risky for production system. While initial demand low, viral event risk real (conferences, universities amplifying social media). Single point of failure unacceptable for live event reliability. Vertical scaling ceiling may be reached within 12 months based on growth projections (2000 participants = 4 instances, not vertically scalable). Constitution's high-concurrency requirement suggests eventual need for horizontal scaling.

---

### Alternative 3: Serverless / Auto-Scaling Only Model

**Description**: Deploy using serverless functions (AWS Lambda, Azure Functions) or aggressive auto-scaling with instance lifecycle under 60 seconds. No "base" instance concept - scale to zero when idle, scale up immediately on demand.

**Pros**:
- Cost optimization (pay only for active event time)
- Zero infrastructure costs during idle hours
- Automatic capacity provisioning (no manual scaling)
- Cloud-native elasticity

**Cons**:
- **Cold start latency**: 100-500ms function initialization violates <200ms REST, <100ms event targets
- **WebSocket limitations**: Serverless functions not designed for long-lived connections (2+ hour events)
- **State management complexity**: Stateful WebSocket connections incompatible with ephemeral functions
- **Event replay buffer**: 24-hour buffer requires persistent storage, defeats serverless benefits
- **Database connection pooling**: Cold starts exhaust connection pools (each function = new connection)
- **Cost at scale**: Per-invocation pricing expensive for high-frequency events (150 events/sec)

**Rejection Rationale**: Fundamentally incompatible with WebSocket real-time requirements (ADR-002). Cold starts violate performance targets. Long-lived connections (2+ hours) antithetical to serverless ephemeral model. Event replay buffer (24 hours) requires always-on storage. Database connection pooling issues for RDBMS (ADR-003). Modular Monolith architecture (ADR-001) assumes persistent process with in-process event bus. Serverless better suited for request/response workloads, not persistent bidirectional streams.

---

### Alternative 4: Microservices with Per-Service Scaling

**Description**: Decompose system into microservices (Session Service, Poll Service, Vote Service, Event Service), scale each service independently based on load.

**Pros**:
- Granular scaling (scale Vote Service during voting bursts, Session Service during joins)
- Independent deployment (update Vote Service without restarting Session Service)
- Technology diversity (different languages/frameworks per service)
- Fault isolation (Vote Service crash doesn't affect Session Service)

**Cons**:
- **Rejected in ADR-001**: Contradicts Modular Monolith decision
- **Network latency**: Inter-service calls add 30-150ms (violates <200ms REST, <100ms event targets)
- **Distributed transactions**: Zero Vote Loss requires cross-service ACID (vote + aggregate update)
- **Operational complexity**: Service mesh, API gateway, distributed tracing, log aggregation
- **Development complexity**: Distributed debugging, eventual consistency challenges
- **Over-engineering**: 500 participant target doesn't justify microservices overhead

**Rejection Rationale**: Contradicts ADR-001 (Modular Monolith) which explicitly rejected microservices due to latency overhead, operational complexity, and scale mismatch. Re-litigating this decision requires new evidence (e.g., single instance cannot meet performance targets). Current evidence shows 500 participants achievable on single instance. Microservices appropriate when services have different scaling profiles (e.g., 10× more reads than writes), but our workload relatively uniform (voting creates both writes and broadcasts).

---

## Consequences

### Positive Consequences

1. **✅ Operational Simplicity Initially**:
   - Single instance deployment requires minimal infrastructure (no load balancer)
   - Standard debugging (single process, local logs)
   - No coordination complexity (sticky sessions, distributed state)
   - Faster time-to-market (simpler MVP)

2. **✅ Cost-Effective Start**:
   - Pay only for required capacity (500 participants, not 2000)
   - Avoid over-provisioning for uncertain demand
   - Infrastructure costs scale with revenue (more events = more capacity needed)

3. **✅ Proven Scaling Path**:
   - Horizontal scaling well-understood pattern (Modular Monolith supports it)
   - Load balancing technology mature and reliable
   - Can scale to 10,000+ participants (20 instances × 500)
   - Growth not architecturally constrained

4. **✅ Preserves Real-Time Semantics**:
   - Sticky sessions ensure connection persistence (WebSocket to same instance)
   - Event replay from database enables cross-instance reconnection
   - Session-scoped broadcasting maintains message ordering
   - <100ms event delivery maintained with polling overhead

5. **✅ Maintains Zero Vote Loss**:
   - Shared database provides ACID transactions across all instances
   - Vote acceptance guaranteed durable before acknowledgment
   - No distributed transaction complexity
   - Strong consistency maintained

6. **✅ Flexible Growth**:
   - Add instances incrementally (1 → 2 → 4 → 8)
   - Manual scaling initially (low ops burden)
   - Auto-scaling later (mature operational capability)
   - Scale down during low usage (cost savings)

7. **✅ Redundancy When Needed**:
   - Single instance acceptable for MVP/low-stakes events
   - Add redundancy (2+ instances) when reliability critical
   - Instance failure recoverable (clients reconnect to other instances)

### Negative Consequences (with Mitigations)

1. **⚠️ Single Point of Failure Initially**:
   - **Issue**: Single instance crash = complete outage
   - **Mitigation**: 10-second recovery target (container orchestration auto-restart), acceptable for MVP
   - **Timeline**: Move to 2-instance minimum after 6 months or first critical event
   - **Monitoring**: Alert on instance health, connection count, resource usage

2. **⚠️ Scaling Delays (Manual Scaling)**:
   - **Issue**: Adding instances requires manual intervention (5-10 minute process)
   - **Mitigation**: Monitor connection count, alert at 80% capacity (400/500 connections)
   - **Timeline**: Implement auto-scaling by month 6 when demand patterns understood
   - **Planning**: Schedule capacity increases before announced large events

3. **⚠️ WebSocket Connection Redistribution on Scale-Up**:
   - **Issue**: New instance added but existing connections stay on old instances (sticky sessions)
   - **Mitigation**: Load balancer routes new connections to least-loaded instance
   - **Gradual rebalancing**: As sessions end, new sessions distributed across all instances
   - **Acceptable**: Imbalance temporary (sessions end within 2 hours), next event rebalanced

4. **⚠️ Database Becomes Bottleneck**:
   - **Issue**: All instances share single database master (write bottleneck)
   - **Mitigation**: Read replicas for query scaling (2000 queries/sec supported)
   - **Evidence**: 100 votes/sec burst = 1% of RDBMS capacity (10,000+ writes/sec capable per ADR-003)
   - **Acceptable**: Database scaling independent of application scaling (upgrade master instance, shard later if needed)

5. **⚠️ Event Broadcast Cross-Instance Overhead**:
   - **Issue**: Instance 1 accepts vote, must notify Instance 2 clients (database polling adds latency)
   - **Mitigation**: 100ms polling interval = <100ms delivery target, acceptable overhead
   - **Alternative**: Pub/sub message bus for cross-instance events (future enhancement)
   - **Session Affinity Reduces Impact**: Most events consumed by clients on same instance (presenter, voters in same session)

6. **⚠️ Sticky Session Configuration Required**:
   - **Issue**: WebSocket connections require sticky sessions (connection to same instance)
   - **Mitigation**: All modern load balancers support sticky sessions (cookie-based or IP-based)
   - **Testing**: Validate sticky session behavior in staging before production
   - **Documentation**: Operations runbook includes load balancer configuration

### Architectural Evolution

**Phase 1 (0-6 months): Single Instance**
- 500 participant capacity
- Manual monitoring and scaling
- Focus on feature development, market fit

**Phase 2 (6-12 months): Horizontal Scaling**
- Add instances as demand grows (target: 2000 participants = 4 instances)
- Implement auto-scaling rules (CPU, connection count)
- Add redundancy (minimum 2 instances for reliability)

**Phase 3 (12-18 months): Optimization**
- Optimize event broadcast (pub/sub message bus instead of database polling)
- Implement predictive scaling (schedule-based for known events)
- Connection draining for graceful instance shutdown
- Geographic distribution if international demand emerges

**Phase 4 (18+ months): Re-evaluate**
- If 10,000+ participants: Consider microservices for Vote Service (highest load)
- If multi-region: Consider distributed architecture (ADR reconsideration)
- If serverless matured: Re-evaluate cold start limitations with WebSocket improvements

---

## Implementation Guidance

### What's Defined (Technology-Agnostic)

✅ **Scaling strategy**: Single instance initially, horizontal scaling on demand  
✅ **Capacity model**: 500 participants per instance  
✅ **Scaling trigger**: 80% capacity (400 connections), latency degradation, resource utilization  
✅ **Scaling approach**: Stateless instances, sticky sessions, shared database  
✅ **Event coordination**: Database-persisted events with instance polling  
✅ **Connection handling**: Sticky sessions for WebSocket persistence  

### What's NOT Defined (Implementation Details)

❌ **Load balancer product**: No HAProxy, NGINX, AWS ALB, etc. chosen  
❌ **Container orchestration**: No Kubernetes, Docker Swarm, ECS specified  
❌ **Auto-scaling configuration**: No scaling policies, thresholds, cooldown periods  
❌ **Monitoring tools**: No Prometheus, Grafana, CloudWatch, Datadog specified  
❌ **Cloud provider**: No AWS, Azure, GCP deployment specified  
❌ **Database clustering**: No PostgreSQL replication, MySQL master-replica configuration  
❌ **Event coordination implementation**: No message bus (Redis Pub/Sub, RabbitMQ, Kafka) vs. database polling decided  

---

## Monitoring and Success Metrics

### Capacity Metrics

**Connection Count**:
- Current connections per instance (target: <400)
- Total connections across all instances (target: <2000)
- Connection churn rate (connects + disconnects per second)
- Alert threshold: 80% capacity (400 connections per instance)

**Instance Metrics**:
- Active instance count
- CPU utilization per instance (target: <70% sustained)
- Memory utilization per instance (target: <80%)
- Network bandwidth per instance

### Performance Metrics (Per Instance)

**REST API Latency**:
- p50, p95, p99 latency for all endpoints
- Target: <200ms (p95)
- Degradation alert: >250ms (p95) sustained for 5 minutes

**Event Delivery Latency**:
- Time from domain event emission to client receipt
- Target: <100ms (p95)
- Degradation alert: >150ms (p95) sustained for 5 minutes

**Vote Processing Throughput**:
- Votes processed per second per instance
- Target: 100 votes/sec burst capacity
- Degradation alert: Vote queue depth >50

### Reliability Metrics

**Instance Availability**:
- Uptime per instance
- Recovery time from crash (target: <10 seconds)
- Graceful shutdown success rate (target: 100%)

**Connection Reliability**:
- WebSocket disconnection rate
- Reconnection success rate (target: >99%)
- Event replay usage (indicates connection instability)

### Scaling Metrics

**Scale Events**:
- Number of scale-up events (instances added)
- Number of scale-down events (instances removed)
- Time to add instance (manual: target <10 min, auto: target <2 min)

**Load Distribution**:
- Connection distribution across instances (ideal: even distribution)
- Imbalance ratio (max connections / avg connections, target: <1.3)

---

## When to Revisit This Decision

### Reconsideration Triggers

1. **Single instance performance ceiling reached**:
   - Cannot support 500 participants on single instance
   - Performance degradation below targets even on largest available instance
   - Evidence: Load tests show 300-400 participant ceiling

2. **Horizontal scaling insufficient**:
   - Need >20 instances to support demand (10,000+ participants)
   - Database becomes bottleneck (write contention across many instances)
   - Evidence: Database CPU >80% sustained, write queue depth growing

3. **Event coordination overhead unacceptable**:
   - Cross-instance event broadcast adds >50ms latency
   - Database polling creates excessive query load
   - Evidence: Event delivery latency >150ms p95 with multi-instance

4. **Geographic distribution required**:
   - International users with >200ms latency to single region
   - Data residency requirements (GDPR, local regulations)
   - Evidence: User complaints, latency metrics from distant regions

5. **Cost inefficiency detected**:
   - Auto-scaling aggressive (frequent scale up/down creating waste)
   - Over-provisioned for bursty workload (long idle periods)
   - Evidence: <30% average utilization across instances

### Future Architecture Options

**If performance ceiling hit**:
- Microservices: Extract Vote Service (highest load) to independently scalable service
- Serverless hybrid: Use serverless for bursty REST endpoints, persistent instances for WebSocket

**If database bottleneck**:
- Database sharding: Partition by session ID (each instance owns subset of sessions)
- NewSQL: Migrate to horizontally scalable RDBMS (CockroachDB, Google Spanner)

**If event coordination costly**:
- Message bus: Introduce Redis Pub/Sub, RabbitMQ, or Kafka for cross-instance events
- Event store: Dedicated event streaming platform (Kafka, Pulsar) replaces database polling

**If geographic distribution needed**:
- Multi-region active-active: Deploy instances in multiple regions with global database
- Edge computing: Deploy lightweight instances at edge locations, federate to central database

---

## Related Decisions

- **ADR-001 (System Architecture Style)**: Modular Monolith provides foundation for horizontal scaling
- **ADR-002 (Real-Time Communication)**: WebSocket sticky sessions required for this scaling strategy
- **ADR-003 (Persistence Strategy)**: Shared RDBMS enables stateless application instances with strong consistency

---

## Notes

This scaling strategy optimizes for:
1. **Simplicity initially**: Single instance for MVP reduces operational burden
2. **Growth flexibility**: Proven horizontal scaling pattern supports 10,000+ participants
3. **Cost efficiency**: Pay for capacity as demand grows
4. **Risk mitigation**: Scaling path validated, not betting on untested architecture

The decision intentionally delays complexity (load balancer, sticky sessions, auto-scaling) until demand justifies it. Evidence-based triggers define when to add complexity.

Key assumption: 500 participants per instance achievable based on resource budgeting (3MB per participant × 500 = 1.5GB memory, CPU sufficient for <100ms event delivery). Load testing must validate this assumption before production launch.
