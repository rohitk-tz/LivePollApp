# ADR-002: Real-Time Communication Mechanism

**Status**: Accepted  
**Date**: January 3, 2026  
**Decision-Makers**: Architecture Team  
**Consulted**: Development Team, Infrastructure Team

---

## Context

The Live Event Polling Application requires a real-time communication mechanism to deliver domain events from the server to connected clients (presenters, participants, and displays). This is mandated by the constitution's "Real-Time First" principle and critical to the user experience during live events.

### Constitution Requirements

**Real-Time First Principle**:
> "All participant actions must be reflected system-wide in near real-time without manual refresh."

This requirement eliminates polling-based approaches and demands a push-based mechanism where the server initiates event delivery to clients as domain state changes occur.

**Key Requirements**:
- Vote results must appear on displays and participant screens within 100ms of acceptance
- Poll activation must reach all participants immediately so voting can begin
- Session state changes must propagate to all actors without refresh

### Non-Functional Requirements

**Performance Requirements**:
- Event delivery latency: < 100ms (p95) from domain event emission to client receipt
- Concurrent connections: Support 2000+ simultaneous WebSocket/SSE connections
- Event throughput: 150 events/second broadcast during peak voting
- Sustained connection duration: 2+ hours for long events

**Reliability Requirements**:
- Event replay: 24-hour buffer for client reconnection
- Connection resilience: Automatic reconnection on transient network failures
- Event ordering: Causal ordering maintained within session
- Zero event loss: Events persisted before broadcast, replay available on reconnect

### API Contract Requirements

**Event Stream Endpoint**: Defined in real-time event contracts
- **WebSocket**: `ws://host/events` or `wss://host/events`
- **Server-Sent Events**: `GET /events` with `Accept: text/event-stream`
- **Connection scoping**: Clients subscribe to specific session via `sessionId` query parameter
- **Event format**: JSON-formatted messages with `eventId`, `eventType`, `timestamp`, `payload`

### System Characteristics

**Architecture Style**: Modular Monolith (ADR-001)
- In-process event bus for module-to-module communication
- Event Bus module responsible for broadcasting to external clients
- Stateless application instances behind load balancer

**Event Volume**:
- Normal load: 50 events/second (5 sessions, 10 events/sec per session)
- Peak load: 150 events/second (poll activation burst across multiple sessions)
- Average event size: 500 bytes JSON

**Client Types**:
1. **Presenters**: Desktop/mobile browsers, manage poll lifecycle
2. **Participants**: Mobile browsers primarily, submit votes and view results
3. **Displays**: Large screens (projectors, TVs), read-only event observation

---

## Decision

**We will use WebSocket as the primary real-time communication mechanism, with Server-Sent Events (SSE) as a fallback option for clients with WebSocket restrictions.**

### Definition

**WebSocket** is a full-duplex communication protocol providing persistent, bidirectional channels between client and server over a single TCP connection. After an initial HTTP handshake, the connection upgrades to WebSocket protocol, enabling low-latency message exchange in both directions.

**Server-Sent Events (SSE)** is a server-to-client push protocol over standard HTTP, where the server maintains a long-lived HTTP connection and streams events as `text/event-stream` content. SSE is unidirectional (server → client only).

### Why Both Protocols?

**Primary: WebSocket**
- Used by 95%+ of clients (modern browsers, mobile apps)
- Lowest latency for event delivery
- Bidirectional capability enables future features (typing indicators, heartbeats)

**Fallback: Server-Sent Events**
- Used when WebSocket unavailable (corporate proxies, restrictive firewalls)
- Standard HTTP, better firewall traversal
- Unidirectional sufficient for current requirements (server broadcasts events, clients send commands via REST)

### Protocol Selection Logic

Clients attempt WebSocket connection first. If WebSocket fails (network restrictions, proxy limitations), client falls back to SSE. Server supports both protocols on same endpoint with protocol negotiation via headers.

---

## Alternatives Considered

### Alternative 1: HTTP Long Polling

**Description**: Client sends HTTP request, server holds request open until event available or timeout, client immediately sends new request after receiving response. Simulates push with pull-based mechanism.

**Pros**:
- **Maximum compatibility**: Works through any HTTP proxy or firewall
- **Simple implementation**: Standard HTTP, no special protocols
- **Stateless**: No persistent connections, works with any load balancer

**Cons**:
- **High latency**: 500ms-2s typical latency (request → hold → timeout → new request cycle)
  - **Violates performance target**: Cannot achieve <100ms event latency
  - During voting burst, 500ms delay means participants see outdated results
- **Server resource waste**: Holding thousands of open HTTP requests consumes threads/connections
  - Requires 2000 concurrent threads for 2000 participants (inefficient)
- **Bandwidth waste**: Repeated HTTP headers on every request (400-800 bytes overhead per request)
  - 2000 clients polling every 1 second = 800KB-1.6MB/sec header overhead alone
- **Event ordering complexity**: Multiple in-flight requests per client, difficult to guarantee order
- **Battery drain**: Mobile clients making continuous HTTP requests drain battery significantly

**Evaluation Against Requirements**:
- ❌ **Fails performance target**: 500ms-2s latency vs. <100ms requirement
- ❌ **Fails Real-Time First**: Polling inherently not real-time, delay always present
- ⚠️ **Meets reliability**: Event replay possible, but complex with multiple in-flight requests
- ✅ Meets compatibility (best compatibility)

**Decision**: **Rejected** due to inability to meet <100ms event latency and high resource overhead.

---

### Alternative 2: Server-Sent Events (SSE) Only

**Description**: Use SSE as the only real-time protocol, no WebSocket support. Server maintains long-lived HTTP connections and streams events as `text/event-stream`.

**Pros**:
- **Simple protocol**: Standard HTTP, built on familiar request/response model
- **Good browser support**: All modern browsers support SSE natively
- **Automatic reconnection**: Browsers handle reconnection automatically with `EventSource` API
- **Firewall-friendly**: Plain HTTP/HTTPS, better traversal than WebSocket
- **Lower implementation complexity**: Single protocol to implement and test

**Cons**:
- **Unidirectional only**: Server → client, no client → server messaging
  - Current system acceptable (commands via REST, events via SSE)
  - **Limits future features**: Cannot add bidirectional features (typing indicators, presence)
- **HTTP/1.1 connection limits**: Browsers limit to 6 concurrent HTTP/1.1 connections per domain
  - Participant in multiple sessions (e.g., attending 2 events) may hit limit
  - Mitigation: Use HTTP/2 (multiplexing removes limit) or subdomain sharding
- **Text-only protocol**: Binary data requires Base64 encoding (33% overhead)
  - Current JSON payload is text, not an issue
  - Future binary optimizations (Protocol Buffers, MessagePack) not supported
- **No built-in compression**: HTTP compression applies, but less efficient than WebSocket per-message compression
- **Proxy buffering issues**: Some proxies buffer SSE streams, delaying event delivery
  - Corporate proxies may interfere with real-time delivery

**Evaluation Against Requirements**:
- ✅ **Meets performance target**: <100ms latency achievable with SSE
- ✅ **Meets Real-Time First**: Server push enables real-time updates
- ✅ **Meets reliability**: Automatic reconnection, event replay supported
- ⚠️ **Limits future extensibility**: Unidirectional constrains future features

**Decision**: **Accepted as fallback option** but not primary due to unidirectional limitation and future flexibility concerns.

---

### Alternative 3: HTTP/2 Server Push

**Description**: Use HTTP/2's server push feature to proactively send events to clients as resources related to a primary request.

**Pros**:
- **Leverages HTTP/2 infrastructure**: Multiplexing, header compression, binary framing
- **Integrated with HTTP ecosystem**: Works with existing HTTP caching, CDNs

**Cons**:
- **Not designed for real-time events**: Server push intended for resource pre-loading (CSS, JS), not event streams
- **Limited browser API support**: No standard JavaScript API for receiving pushed resources as event streams
  - Browsers cache pushed resources, but application layer doesn't get real-time notifications
  - Would require custom service worker or polling cached resources (defeats purpose)
- **Push requires initiating request**: Client must make request first, server pushes related resources
  - For event stream, client would still need to poll or maintain long-lived request
- **Proxy/CDN interference**: Intermediate proxies may not forward pushed resources correctly
- **Specification complexity**: HTTP/2 push is complex, limited tooling support

**Evaluation Against Requirements**:
- ❌ **Poor API support**: No standard way to consume pushed events in browsers
- ❌ **Not designed for this use case**: Resource pre-loading, not event streaming
- ⚠️ **HTTP/2 infrastructure**: Requires HTTP/2 support (acceptable, widely available)

**Decision**: **Rejected** due to lack of browser API support for real-time event consumption and misalignment with HTTP/2 push's intended use case.

---

### Alternative 4: gRPC Streaming

**Description**: Use gRPC's bidirectional streaming over HTTP/2 for real-time communication.

**Pros**:
- **High performance**: Protocol Buffers binary encoding, HTTP/2 multiplexing
- **Type-safe contracts**: Protocol Buffers schema ensures compatibility
- **Bidirectional streaming**: Full-duplex communication like WebSocket
- **Excellent tooling**: Code generation, strong typing in many languages

**Cons**:
- **Browser support limitations**: gRPC-Web required for browsers, not native protocol
  - gRPC-Web is unidirectional (client → server streaming not supported)
  - Requires proxy (Envoy, gRPC-Web proxy) to translate HTTP/1.1 to gRPC
- **Ecosystem mismatch**: gRPC designed for service-to-service communication, not browser clients
- **Protocol complexity**: Protocol Buffers encoding/decoding, HTTP/2 framing
  - Overkill for JSON event payloads (500 bytes average)
- **Debugging difficulty**: Binary protocol, specialized tools required (vs. JSON in browser DevTools)
- **Firewall/proxy issues**: Some corporate proxies block gRPC traffic (non-standard content-type)

**Evaluation Against Requirements**:
- ✅ **Meets performance target**: <100ms latency achievable
- ❌ **Browser support**: Requires gRPC-Web proxy, unidirectional in browsers
- ❌ **Complexity**: Protocol Buffers, proxies, tooling overhead disproportionate to need
- ❌ **Constitution alignment**: "No Installation Required" - gRPC-Web adds client complexity

**Decision**: **Rejected** due to browser support limitations and excessive complexity for browser-based clients.

---

### Alternative 5: WebRTC Data Channels

**Description**: Use WebRTC's peer-to-peer data channels for real-time communication.

**Pros**:
- **Lowest possible latency**: Direct peer-to-peer, no server intermediary
- **NAT traversal**: Built-in STUN/TURN support for firewall traversal
- **Unreliable or reliable modes**: Can choose UDP-like (fast, unreliable) or TCP-like (reliable, ordered)

**Cons**:
- **Peer-to-peer model mismatch**: WebRTC designed for peer-to-peer (video calls), not client-server
  - Server acts as "peer", requires WebRTC signaling (SDP offer/answer exchange)
  - Added complexity for simple server → client event broadcast
- **Connection setup overhead**: ICE candidate gathering, STUN/TURN servers, SDP negotiation
  - 2-5 seconds connection establishment time (vs. <100ms for WebSocket)
  - **Violates performance target**: 2-5s initial connection time unacceptable
- **Firewall traversal complexity**: Requires STUN/TURN server infrastructure
  - TURN relays bandwidth (costly for 2000 concurrent connections)
- **Signaling protocol required**: Need separate signaling channel (WebSocket or HTTP) to establish WebRTC
  - If WebSocket available for signaling, why not use WebSocket for data?
- **Overkill for use case**: Media streaming features (video, audio codecs) unnecessary for text events

**Evaluation Against Requirements**:
- ❌ **High connection setup latency**: 2-5 seconds vs. <100ms requirement
- ❌ **Unnecessary complexity**: Peer-to-peer model, media features not needed
- ❌ **Infrastructure overhead**: TURN servers, signaling protocol
- ⚠️ **Lowest data latency**: Once connected, lowest latency possible (not relevant given setup time)

**Decision**: **Rejected** due to connection setup latency, architectural mismatch (peer-to-peer vs. client-server), and excessive complexity.

---

## Consequences

### Positive Consequences

1. **Low Latency Achieved**:
   - WebSocket connection establishment: <100ms after TCP handshake
   - Event delivery latency: <50ms typical (in-process event bus → WebSocket frame → client)
   - **Easily meets <100ms (p95) performance target**
   - Voting experience feels instantaneous to participants

2. **Bidirectional Capability**:
   - WebSocket enables client → server messaging (not required currently, but future-proof)
   - Potential future features: Heartbeat pings, typing indicators, presence detection
   - Commands could be sent via WebSocket instead of REST (optional optimization)

3. **Efficient Resource Utilization**:
   - Single TCP connection per client (vs. repeated HTTP requests in polling)
   - Minimal protocol overhead after handshake (2-14 bytes per frame vs. 400-800 bytes per HTTP request)
   - 2000 concurrent connections: ~6MB protocol overhead (WebSocket) vs. ~1.6MB/sec continuous overhead (polling)
   - **85-90% bandwidth reduction** compared to long polling

4. **Excellent Browser Support**:
   - WebSocket supported in all modern browsers (Chrome, Firefox, Safari, Edge)
   - Mobile browser support: iOS Safari, Android Chrome
   - No plugins or polyfills required
   - Fallback to SSE ensures universal coverage (99.9%+ browsers)

5. **Native Reconnection Handling**:
   - WebSocket connection failures detected immediately (TCP FIN/RST)
   - Client can implement exponential backoff reconnection strategy
   - Event replay from `fromEventId` ensures zero event loss on reconnect
   - 24-hour event buffer supports long network interruptions

6. **Load Balancer Compatibility**:
   - WebSocket connections can use sticky sessions (session affinity)
   - Once upgraded, connection persists to same instance (simplifies state management)
   - Load balancer distributes initial connections across instances

7. **Debugging and Monitoring**:
   - Browser DevTools show WebSocket frames (inspect messages in real-time)
   - JSON payload human-readable during development
   - Clear separation of commands (REST) and events (WebSocket) simplifies debugging

### Negative Consequences (with Mitigations)

1. **Stateful Connection Management**:
   - Server must track 2000+ concurrent WebSocket connections (vs. stateless REST)
   - Memory overhead: ~50KB per connection (buffers, state) = 100MB for 2000 connections
   - **Mitigation**: Acceptable memory cost on modern servers (2GB+ allocated per instance)
   - **Mitigation**: Horizontal scaling adds capacity (500 connections per instance)

2. **Load Balancer Configuration**:
   - Requires sticky sessions (session affinity) to route reconnections to same instance
   - Load balancer must support WebSocket protocol (Upgrade header handling)
   - **Mitigation**: All modern load balancers support WebSocket (ALB, Nginx, HAProxy)
   - **Mitigation**: Well-documented configuration patterns available

3. **Connection Timeout Management**:
   - Idle connections may be closed by intermediate proxies (30-120 seconds typical)
   - Need heartbeat mechanism (ping/pong) to keep connection alive
   - **Mitigation**: Implement server-initiated ping every 30 seconds, client responds with pong
   - **Mitigation**: Client reconnects on timeout, uses event replay to catch up

4. **Firewall and Proxy Challenges**:
   - Some corporate firewalls block WebSocket connections (non-HTTP traffic)
   - Restrictive proxies may not forward Upgrade header correctly
   - **Mitigation**: SSE fallback for environments blocking WebSocket (99% coverage)
   - **Mitigation**: Use WSS (WebSocket Secure) port 443 to match HTTPS (better traversal)

5. **Mobile Network Resilience**:
   - Mobile devices switch networks (Wi-Fi → 4G), breaking TCP connection
   - Connection drops frequent on mobile (elevators, tunnels, poor signal)
   - **Mitigation**: Client implements automatic reconnection with exponential backoff
   - **Mitigation**: Event replay from last received `eventId` ensures zero data loss
   - **Mitigation**: UI shows "reconnecting" state, transparent to user

6. **Testing Complexity**:
   - WebSocket integration tests more complex than REST (stateful, asynchronous)
   - Need to test connection lifecycle (connect, disconnect, reconnect, timeout)
   - **Mitigation**: WebSocket testing libraries available (testing frameworks support WebSocket)
   - **Mitigation**: End-to-end tests validate full connection lifecycle

### Monitoring and Success Metrics

**Connection Metrics**:
- Active WebSocket connections count (total and per instance)
- Connection duration histogram (identify premature disconnections)
- Reconnection rate (connections/minute)
- WebSocket upgrade success rate (failures indicate proxy issues)

**Performance Metrics**:
- Event delivery latency (domain event publish → client receipt)
  - Target: <100ms (p95)
- Event broadcast fanout time (publish 1 event → all 500 clients receive)
  - Target: <100ms (p95) for 500 concurrent connections
- Message throughput (messages/second per instance)
  - Target: 150 messages/sec sustained

**Reliability Metrics**:
- Event loss rate (events published but not delivered)
  - Target: 0% (event replay ensures recovery)
- Reconnection success rate (reconnections / disconnections)
  - Target: >99%
- Client-side reconnection time (disconnect → reconnect → event replay complete)
  - Target: <5 seconds (p95)

### When to Revisit This Decision

**Reconsideration Triggers**:

1. **WebSocket becomes non-standard**: Unlikely, but if browsers deprecate WebSocket (replaced by HTTP/3 WebTransport, etc.)
2. **Connection scale exceeds capacity**: >5000 concurrent connections per instance (current target: 500)
3. **Binary protocol needed**: JSON encoding becomes bottleneck (current: 500 bytes avg, acceptable)
4. **Strong bidirectional requirements emerge**: If commands move from REST to WebSocket (requires redesign)
5. **Edge computing deployment**: Geographic distribution requires edge termination of WebSocket connections

**Future Technology Options**:
- **WebTransport over HTTP/3**: Successor to WebSocket, lower latency, better multiplexing (when widely available)
- **gRPC-Web for internal services**: If service-to-service real-time communication needed (not browser-facing)
- **GraphQL Subscriptions**: If query flexibility + subscriptions needed (overkill for simple event broadcast)

---

## Implementation Guidance (Technology-Agnostic)

### What's Defined

✅ **Protocol**: WebSocket primary, SSE fallback  
✅ **Endpoint**: `/events` with query parameters (`sessionId`, `actorType`, `actorId`)  
✅ **Message format**: JSON with `eventId`, `eventType`, `timestamp`, `sessionId`, `payload`  
✅ **Event ordering**: Causal ordering within session  
✅ **Event replay**: Support `fromEventId` query parameter, 24-hour buffer  
✅ **Connection scoping**: Session-based subscriptions  
✅ **Heartbeat**: Server ping every 30 seconds, client pong response  
✅ **Reconnection**: Client exponential backoff, event replay on reconnect  

### What's NOT Defined (Implementation Details)

❌ **WebSocket library**: No specific library/framework chosen (Socket.IO, ws, uWebSockets, etc.)  
❌ **Connection pooling**: No specific connection management implementation  
❌ **Event storage**: No specific database/cache for 24-hour event buffer  
❌ **Load balancer**: No specific load balancer product (Nginx, HAProxy, cloud ALB)  
❌ **Serialization**: No specific JSON library (standard library vs. high-performance parser)  
❌ **Authentication mechanism**: No specific token format (JWT, opaque tokens, etc.)  

---

## Related Specifications

- [Constitution](../../.specify/memory/constitution.md) - Real-Time First principle
- [ADR-001: System Architecture Style](adr-001-system-architecture-style.md) - Modular Monolith architecture
- [Real-Time Event Contracts](../../004-api-contracts/api/realtime.md) - Event stream endpoint, message format
- [Performance Requirements](../../005-non-functional-specs/non-functional/performance.md) - <100ms event latency target
- [Reliability Requirements](../../005-non-functional-specs/non-functional/reliability.md) - Event replay, zero event loss
- [Scalability Requirements](../../005-non-functional-specs/non-functional/scalability.md) - 2000 concurrent connections

---

## Notes

- **WebSocket + SSE hybrid approach** ensures maximum compatibility while optimizing for performance
- **Event replay architecture** is critical for mobile resilience (frequent disconnections)
- **Sticky sessions** required for WebSocket but acceptable trade-off for connection persistence
- **Heartbeat mechanism** essential for detecting idle connection timeouts by proxies
- **JSON payload format** balances human readability (debugging) with performance (500 bytes acceptable)

---

**Last Updated**: January 3, 2026  
**Next Review**: After 6 months of production operation or when connection scale exceeds 2000 concurrent
