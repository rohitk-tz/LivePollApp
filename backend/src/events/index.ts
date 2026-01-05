/**
 * Events module - Internal event bus for inter-module communication.
 * 
 * This module provides a centralized event dispatcher for domain events.
 * Domain modules emit events, infrastructure modules subscribe to them.
 */

export {
  EventBus,
  eventBus,
  DomainEventType,
  createDomainEvent,
  type DomainEvent,
  type SessionCreatedEvent,
  type SessionStartedEvent,
  type SessionEndedEvent,
  type PollCreatedEvent,
  type PollActivatedEvent,
  type PollClosedEvent,
  type VoteAcceptedEvent,
  type VoteRejectedEvent,
  type ResultsUpdatedEvent,
  type ParticipantJoinedEvent,
  type ParticipantDisconnectedEvent,
  type AllDomainEvents,
  type EventHandler
} from './event-bus.js';
