/**
 * Internal event bus for inter-module communication.
 * Implements a simple in-process event dispatcher using EventEmitter.
 * 
 * This is the bridge between domain modules (Session, Poll, Vote, Participant)
 * and infrastructure modules (Realtime). Domain modules emit domain events,
 * and the Realtime module subscribes to them to broadcast via WebSocket.
 * 
 * Per ADR-001 and ADR-002:
 * - Domain modules MUST NOT depend on WebSocket or Realtime code
 * - Realtime module MUST NOT contain business logic
 * - Events flow from domain → event bus → realtime → WebSocket clients
 */

import { EventEmitter } from 'events';

/**
 * Domain event types emitted by core modules.
 */
export enum DomainEventType {
  // Session events
  SESSION_CREATED = 'session:created',
  SESSION_STARTED = 'session:started',
  SESSION_ENDED = 'session:ended',
  
  // Poll events
  POLL_CREATED = 'poll:created',
  POLL_ACTIVATED = 'poll:activated',
  POLL_CLOSED = 'poll:closed',
  
  // Vote events
  VOTE_SUBMITTED = 'vote:submitted',
  VOTE_ACCEPTED = 'vote:accepted',
  VOTE_REJECTED = 'vote:rejected',
  RESULTS_UPDATED = 'results:updated',
  
  // Participant events
  PARTICIPANT_JOINED = 'participant:joined',
  PARTICIPANT_DISCONNECTED = 'participant:disconnected'
}

/**
 * Base interface for all domain events.
 */
export interface DomainEvent {
  /** Event type identifier */
  type: DomainEventType;
  
  /** Session ID for routing to session rooms */
  sessionId: string;
  
  /** Timestamp when the event occurred */
  timestamp: Date;
  
  /** Event-specific payload data */
  payload: any;
}

/**
 * Session domain events.
 */
export interface SessionCreatedEvent extends DomainEvent {
  type: DomainEventType.SESSION_CREATED;
  payload: {
    sessionId: string;
    code: string;
    presenterName: string;
  };
}

export interface SessionStartedEvent extends DomainEvent {
  type: DomainEventType.SESSION_STARTED;
  payload: {
    sessionId: string;
    startedAt: Date;
  };
}

export interface SessionEndedEvent extends DomainEvent {
  type: DomainEventType.SESSION_ENDED;
  payload: {
    sessionId: string;
    endedAt: Date;
  };
}

/**
 * Poll domain events.
 */
export interface PollCreatedEvent extends DomainEvent {
  type: DomainEventType.POLL_CREATED;
  payload: {
    pollId: string;
    sessionId: string;
    question: string;
    pollType: string;
    options?: Array<{ id: string; text: string }>;
  };
}

export interface PollActivatedEvent extends DomainEvent {
  type: DomainEventType.POLL_ACTIVATED;
  payload: {
    pollId: string;
    sessionId: string;
    activatedAt: Date;
  };
}

export interface PollClosedEvent extends DomainEvent {
  type: DomainEventType.POLL_CLOSED;
  payload: {
    pollId: string;
    sessionId: string;
    closedAt: Date;
    results?: any;
  };
}

/**
 * Vote domain events.
 */
export interface VoteAcceptedEvent extends DomainEvent {
  type: DomainEventType.VOTE_ACCEPTED;
  payload: {
    voteId: string;
    pollId: string;
    participantId: string;
    optionId?: string;
    submittedAt: Date;
  };
}

export interface VoteRejectedEvent extends DomainEvent {
  type: DomainEventType.VOTE_REJECTED;
  payload: {
    pollId: string;
    participantId: string;
    reason: string;
  };
}

export interface ResultsUpdatedEvent extends DomainEvent {
  type: DomainEventType.RESULTS_UPDATED;
  payload: {
    pollId: string;
    sessionId: string;
    results: any;
  };
}

/**
 * Participant domain events.
 */
export interface ParticipantJoinedEvent extends DomainEvent {
  type: DomainEventType.PARTICIPANT_JOINED;
  payload: {
    participantId: string;
    sessionId: string;
    displayName: string;
    joinedAt: Date;
  };
}

export interface ParticipantDisconnectedEvent extends DomainEvent {
  type: DomainEventType.PARTICIPANT_DISCONNECTED;
  payload: {
    participantId: string;
    sessionId: string;
    disconnectedAt: Date;
  };
}

/**
 * Type guard helpers for event types.
 */
export type AllDomainEvents =
  | SessionCreatedEvent
  | SessionStartedEvent
  | SessionEndedEvent
  | PollCreatedEvent
  | PollActivatedEvent
  | PollClosedEvent
  | VoteAcceptedEvent
  | VoteRejectedEvent
  | ResultsUpdatedEvent
  | ParticipantJoinedEvent
  | ParticipantDisconnectedEvent;

/**
 * Event handler callback type.
 */
export type EventHandler<T extends DomainEvent = DomainEvent> = (event: T) => void | Promise<void>;

/**
 * EventBus class for managing domain event publishing and subscription.
 * 
 * This is a singleton instance that provides:
 * - Type-safe event publishing for domain modules
 * - Type-safe event subscription for infrastructure modules
 * - Decoupled communication between modules
 */
export class EventBus {
  private emitter: EventEmitter;
  
  constructor() {
    this.emitter = new EventEmitter();
    // Increase max listeners to support multiple subscribers per event
    this.emitter.setMaxListeners(20);
  }
  
  /**
   * Publish a domain event to all subscribers.
   */
  publish<T extends DomainEvent>(event: T): void {
    try {
      console.log(`[EventBus] Publishing event: ${event.type} for session ${event.sessionId}`);
      this.emitter.emit(event.type, event);
    } catch (error) {
      console.error(`[EventBus] Error publishing event ${event.type}:`, error);
      throw error;
    }
  }
  
  /**
   * Subscribe to a specific domain event type.
   */
  subscribe<T extends DomainEvent>(
    eventType: DomainEventType,
    handler: EventHandler<T>
  ): void {
    console.log(`[EventBus] Subscribing to event: ${eventType}`);
    this.emitter.on(eventType, handler);
  }
  
  /**
   * Unsubscribe from a specific domain event type.
   */
  unsubscribe<T extends DomainEvent>(
    eventType: DomainEventType,
    handler: EventHandler<T>
  ): void {
    this.emitter.off(eventType, handler);
  }
  
  /**
   * Subscribe to all domain events (useful for debugging or logging).
   */
  subscribeAll(handler: EventHandler): void {
    Object.values(DomainEventType).forEach((eventType) => {
      this.emitter.on(eventType, handler);
    });
  }
  
  /**
   * Remove all event listeners (useful for testing or shutdown).
   */
  removeAllListeners(): void {
    this.emitter.removeAllListeners();
  }
}

/**
 * Singleton instance of the event bus.
 * This is the shared instance used across all modules.
 */
export const eventBus = new EventBus();

/**
 * Helper function to create a domain event with standard fields.
 */
export function createDomainEvent<T extends DomainEvent>(
  type: DomainEventType,
  sessionId: string,
  payload: T['payload']
): T {
  return {
    type,
    sessionId,
    timestamp: new Date(),
    payload
  } as T;
}
