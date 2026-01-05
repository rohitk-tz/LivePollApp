/**
 * Event broadcaster for publishing domain events via WebSocket.
 * Subscribes to domain module events and broadcasts them to session rooms.
 */

import type { Server as SocketIOServer } from 'socket.io';
import { nanoid } from 'nanoid';
import {
  WebSocketEvent,
  IEventBroadcaster,
  EventBroadcastError
} from './types';
import {
  eventBus,
  DomainEventType,
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
  type ParticipantDisconnectedEvent
} from '../../events/index.js';

/**
 * EventBroadcaster implementation.
 * Bridges domain events to WebSocket clients.
 */
export class EventBroadcaster implements IEventBroadcaster {
  constructor(private io: SocketIOServer) {}

  /**
   * Broadcast an event to all clients in a session room.
   */
  async broadcast(
    sessionId: string,
    event: WebSocketEvent
  ): Promise<void> {
    try {
      // Validate event structure
      if (!event.eventId || !event.eventType || !event.timestamp) {
        throw new EventBroadcastError(
          'Invalid event structure: missing required fields',
          event.eventId,
          sessionId
        );
      }

      // Broadcast to session room
      this.io.to(sessionId).emit('event', event);

      console.log(
        `[Realtime] Broadcast event ${event.eventType} to session ${sessionId}`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(
        `[Realtime] Failed to broadcast event to session ${sessionId}:`,
        errorMessage
      );

      throw new EventBroadcastError(
        `Broadcast failed: ${errorMessage}`,
        event.eventId,
        sessionId
      );
    }
  }

  /**
   * Broadcast an event to all clients in a poll-specific room.
   * Used for interactive poll windows that subscribe to individual polls.
   */
  async broadcastToPoll(
    pollId: string,
    eventType: string,
    payload: any
  ): Promise<void> {
    try {
      const pollRoom = `poll:${pollId}`;
      
      // Emit directly to poll room with poll-specific event name
      this.io.to(pollRoom).emit(eventType, {
        ...payload,
        timestamp: new Date().toISOString()
      });

      console.log(
        `[Realtime] Broadcast ${eventType} to poll room ${pollRoom}`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(
        `[Realtime] Failed to broadcast to poll ${pollId}:`,
        errorMessage
      );
    }
  }

  /**
   * Create a WebSocket event from domain event data.
   */
  private createWebSocketEvent<T>(
    eventType: string,
    sessionId: string,
    payload: T
  ): WebSocketEvent<T> {
    return {
      eventId: nanoid(),
      eventType,
      timestamp: new Date().toISOString(),
      sessionId,
      payload
    };
  }

  /**
   * Subscribe to domain module events from the event bus.
   * Wires up all domain event handlers to broadcast via WebSocket.
   */
  subscribe(): void {
    console.log('[Realtime] Subscribing to domain events from event bus...');
    
    // Session events
    eventBus.subscribe<SessionCreatedEvent>(
      DomainEventType.SESSION_CREATED,
      (event) => this.handleSessionCreated(event)
    );
    
    eventBus.subscribe<SessionStartedEvent>(
      DomainEventType.SESSION_STARTED,
      (event) => this.handleSessionStarted(event)
    );
    
    eventBus.subscribe<SessionEndedEvent>(
      DomainEventType.SESSION_ENDED,
      (event) => this.handleSessionEnded(event)
    );
    
    // Poll events
    eventBus.subscribe<PollCreatedEvent>(
      DomainEventType.POLL_CREATED,
      (event) => this.handlePollCreated(event)
    );
    
    eventBus.subscribe<PollActivatedEvent>(
      DomainEventType.POLL_ACTIVATED,
      (event) => this.handlePollActivated(event)
    );
    
    eventBus.subscribe<PollClosedEvent>(
      DomainEventType.POLL_CLOSED,
      (event) => this.handlePollClosed(event)
    );
    
    // Vote events
    eventBus.subscribe<VoteAcceptedEvent>(
      DomainEventType.VOTE_ACCEPTED,
      (event) => this.handleVoteAccepted(event)
    );
    
    eventBus.subscribe<VoteRejectedEvent>(
      DomainEventType.VOTE_REJECTED,
      (event) => this.handleVoteRejected(event)
    );
    
    eventBus.subscribe<ResultsUpdatedEvent>(
      DomainEventType.RESULTS_UPDATED,
      (event) => this.handleResultsUpdated(event)
    );
    
    // Participant events
    eventBus.subscribe<ParticipantJoinedEvent>(
      DomainEventType.PARTICIPANT_JOINED,
      (event) => this.handleParticipantJoined(event)
    );
    
    eventBus.subscribe<ParticipantDisconnectedEvent>(
      DomainEventType.PARTICIPANT_DISCONNECTED,
      (event) => this.handleParticipantDisconnected(event)
    );
    
    console.log('[Realtime] Successfully subscribed to all domain events');
  }

  /**
   * Handle session created event.
   */
  private async handleSessionCreated(domainEvent: SessionCreatedEvent): Promise<void> {
    const event = this.createWebSocketEvent(
      'session:created',
      domainEvent.sessionId,
      domainEvent.payload
    );
    await this.broadcast(domainEvent.sessionId, event);
  }

  /**
   * Handle session started event.
   */
  private async handleSessionStarted(domainEvent: SessionStartedEvent): Promise<void> {
    const event = this.createWebSocketEvent(
      'session:started',
      domainEvent.sessionId,
      domainEvent.payload
    );
    await this.broadcast(domainEvent.sessionId, event);
  }

  /**
   * Handle session ended event.
   */
  private async handleSessionEnded(domainEvent: SessionEndedEvent): Promise<void> {
    const event = this.createWebSocketEvent(
      'session:ended',
      domainEvent.sessionId,
      domainEvent.payload
    );
    await this.broadcast(domainEvent.sessionId, event);
  }

  /**
   * Handle participant joined event.
   */
  private async handleParticipantJoined(domainEvent: ParticipantJoinedEvent): Promise<void> {
    const event = this.createWebSocketEvent(
      'participant:joined',
      domainEvent.sessionId,
      domainEvent.payload
    );
    await this.broadcast(domainEvent.sessionId, event);
  }

  /**
   * Handle participant disconnected event.
   */
  private async handleParticipantDisconnected(domainEvent: ParticipantDisconnectedEvent): Promise<void> {
    const event = this.createWebSocketEvent(
      'participant:disconnected',
      domainEvent.sessionId,
      domainEvent.payload
    );
    await this.broadcast(domainEvent.sessionId, event);
  }

  /**
   * Handle poll created event.
   */
  private async handlePollCreated(domainEvent: PollCreatedEvent): Promise<void> {
    const event = this.createWebSocketEvent(
      'poll:created',
      domainEvent.sessionId,
      domainEvent.payload
    );
    await this.broadcast(domainEvent.sessionId, event);
  }

  /**
   * Handle poll activated event.
   */
  private async handlePollActivated(domainEvent: PollActivatedEvent): Promise<void> {
    const event = this.createWebSocketEvent(
      'poll:activated',
      domainEvent.sessionId,
      domainEvent.payload
    );
    await this.broadcast(domainEvent.sessionId, event);

    // Also broadcast to poll-specific room for interactive poll windows
    if (domainEvent.payload.pollId) {
      await this.broadcastToPoll(
        domainEvent.payload.pollId,
        `poll:${domainEvent.payload.pollId}:updated`,
        {
          pollId: domainEvent.payload.pollId,
          status: 'active'
        }
      );
    }
  }

  /**
   * Handle poll closed event.
   */
  private async handlePollClosed(domainEvent: PollClosedEvent): Promise<void> {
    const event = this.createWebSocketEvent(
      'poll:closed',
      domainEvent.sessionId,
      domainEvent.payload
    );
    await this.broadcast(domainEvent.sessionId, event);

    // Also broadcast to poll-specific room for interactive poll windows
    if (domainEvent.payload.pollId) {
      await this.broadcastToPoll(
        domainEvent.payload.pollId,
        `poll:${domainEvent.payload.pollId}:updated`,
        {
          pollId: domainEvent.payload.pollId,
          status: 'closed'
        }
      );
    }
  }

  /**
   * Handle vote accepted event.
   */
  private async handleVoteAccepted(domainEvent: VoteAcceptedEvent): Promise<void> {
    // Fetch vote breakdown for the poll
    let voteBreakdown: Array<{ optionId: string; voteCount: number; percentage: number }> = [];
    let currentVoteCount = 0;
    
    if (domainEvent.payload.pollId) {
      try {
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();
        
        // Get all votes for this poll grouped by option
        const votes = await prisma.vote.groupBy({
          by: ['optionId'],
          where: {
            pollId: domainEvent.payload.pollId
          },
          _count: {
            id: true
          }
        });
        
        // Get total vote count
        currentVoteCount = await prisma.vote.count({
          where: {
            pollId: domainEvent.payload.pollId
          }
        });
        
        // Calculate percentages
        voteBreakdown = votes.map(v => ({
          optionId: v.optionId,
          voteCount: v._count.id,
          percentage: currentVoteCount > 0 ? (v._count.id / currentVoteCount) * 100 : 0
        }));
        
        await prisma.$disconnect();
      } catch (error) {
        console.error('[Broadcaster] Failed to fetch vote breakdown:', error);
      }
    }
    
    // Create enriched event with vote breakdown
    const enrichedPayload = {
      ...domainEvent.payload,
      currentVoteCount,
      voteBreakdown
    };
    
    const event = this.createWebSocketEvent(
      'vote:accepted',
      domainEvent.sessionId,
      enrichedPayload
    );
    await this.broadcast(domainEvent.sessionId, event);

    // Also broadcast to poll-specific room for interactive poll windows
    if (domainEvent.payload.pollId && domainEvent.payload.optionId) {
      try {
        // Find the vote count for the specific option from the breakdown we already fetched
        const optionBreakdown = voteBreakdown.find(v => v.optionId === domainEvent.payload.optionId);
        const newVoteCount = optionBreakdown ? optionBreakdown.voteCount : 0;

        console.log(`[Broadcaster] Broadcasting vote update to poll room: poll:${domainEvent.payload.pollId}`);
        
        // Emit poll-specific event with updated vote count
        await this.broadcastToPoll(
          domainEvent.payload.pollId,
          `poll:${domainEvent.payload.pollId}:vote-submitted`,
          {
            pollId: domainEvent.payload.pollId,
            optionId: domainEvent.payload.optionId,
            newVoteCount,
            voteId: domainEvent.payload.voteId
          }
        );
      } catch (error) {
        console.error(
          `[Realtime] Failed to broadcast vote update to poll room:`,
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    }
  }

  /**
   * Handle vote rejected event.
   */
  private async handleVoteRejected(domainEvent: VoteRejectedEvent): Promise<void> {
    const event = this.createWebSocketEvent(
      'vote:rejected',
      domainEvent.sessionId,
      domainEvent.payload
    );
    await this.broadcast(domainEvent.sessionId, event);
  }

  /**
   * Handle results updated event.
   */
  private async handleResultsUpdated(domainEvent: ResultsUpdatedEvent): Promise<void> {
    const event = this.createWebSocketEvent(
      'results:updated',
      domainEvent.sessionId,
      domainEvent.payload
    );
    await this.broadcast(domainEvent.sessionId, event);
  }

  /**
   * Broadcast a custom event (for testing or manual triggering).
   */
  async broadcastCustomEvent(
    eventType: string,
    sessionId: string,
    payload: any
  ): Promise<void> {
    const event = this.createWebSocketEvent(eventType, sessionId, payload);
    await this.broadcast(sessionId, event);
  }
}
