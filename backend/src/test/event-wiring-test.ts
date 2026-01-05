/**
 * Event Wiring Test Script
 * 
 * This script demonstrates the event flow from domain modules to the Realtime module:
 * 1. Domain modules emit events to the event bus
 * 2. Event bus dispatches events to subscribers
 * 3. Realtime module receives events and broadcasts via WebSocket
 * 
 * To run this test:
 * 1. Start the backend server: npm run dev
 * 2. Connect a WebSocket client to ws://localhost:3000
 * 3. Use the REST API to trigger domain events (create session, start session, etc.)
 * 4. Observe WebSocket events in the client
 */

import { eventBus, DomainEventType } from '../events/index.js';

/**
 * Test event subscriptions by logging all domain events
 */
export function setupEventLogging(): void {
  console.log('[Test] Setting up event logging...');
  
  // Log all session events
  eventBus.subscribe(DomainEventType.SESSION_CREATED, (event) => {
    console.log('[Test] SESSION_CREATED:', event);
  });
  
  eventBus.subscribe(DomainEventType.SESSION_STARTED, (event) => {
    console.log('[Test] SESSION_STARTED:', event);
  });
  
  eventBus.subscribe(DomainEventType.SESSION_ENDED, (event) => {
    console.log('[Test] SESSION_ENDED:', event);
  });
  
  // Log all poll events
  eventBus.subscribe(DomainEventType.POLL_CREATED, (event) => {
    console.log('[Test] POLL_CREATED:', event);
  });
  
  eventBus.subscribe(DomainEventType.POLL_ACTIVATED, (event) => {
    console.log('[Test] POLL_ACTIVATED:', event);
  });
  
  eventBus.subscribe(DomainEventType.POLL_CLOSED, (event) => {
    console.log('[Test] POLL_CLOSED:', event);
  });
  
  // Log all vote events
  eventBus.subscribe(DomainEventType.VOTE_ACCEPTED, (event) => {
    console.log('[Test] VOTE_ACCEPTED:', event);
  });
  
  eventBus.subscribe(DomainEventType.VOTE_REJECTED, (event) => {
    console.log('[Test] VOTE_REJECTED:', event);
  });
  
  eventBus.subscribe(DomainEventType.RESULTS_UPDATED, (event) => {
    console.log('[Test] RESULTS_UPDATED:', event);
  });
  
  // Log all participant events
  eventBus.subscribe(DomainEventType.PARTICIPANT_JOINED, (event) => {
    console.log('[Test] PARTICIPANT_JOINED:', event);
  });
  
  eventBus.subscribe(DomainEventType.PARTICIPANT_DISCONNECTED, (event) => {
    console.log('[Test] PARTICIPANT_DISCONNECTED:', event);
  });
  
  console.log('[Test] Event logging enabled for all domain events');
}

/**
 * Verify event wiring by counting event subscriptions
 */
export function verifyEventWiring(): void {
  const eventTypes = Object.values(DomainEventType);
  console.log(`[Test] Total domain event types: ${eventTypes.length}`);
  console.log('[Test] Event types:', eventTypes);
  
  // Note: EventEmitter doesn't expose listener counts easily,
  // but you can verify subscriptions are working by triggering domain actions
  // and observing log output
}

// Export for use in server.ts
export default {
  setupEventLogging,
  verifyEventWiring
};
