// Participant service - Business logic for participant management
// Handles participant registration, retrieval, and event generation

import { PrismaClient } from '@prisma/client';
import {
  Participant,
  JoinSessionInput,
  ParticipantJoinedEvent,
  ParticipantNotFoundError
} from './types.js';
import { ParticipantRepository } from './repository.js';
import { ParticipantValidator } from './validation.js';
import { eventBus, DomainEventType, createDomainEvent } from '../../events/index.js';

export class ParticipantService {
  private repository: ParticipantRepository;
  private validator: ParticipantValidator;

  constructor(prisma: PrismaClient) {
    this.repository = new ParticipantRepository(prisma);
    this.validator = new ParticipantValidator(prisma);
  }

  /**
   * Register a participant joining a session
   * Returns participant and ParticipantJoinedEvent with count
   */
  async joinSession(
    input: JoinSessionInput
  ): Promise<{ participant: Participant; event: ParticipantJoinedEvent }> {
    // Validate session exists and is active
    await this.validator.validateSessionForJoin(input.sessionId);

    // Validate display name if provided
    this.validator.validateDisplayName(input.displayName);

    // Create participant
    const participant = await this.repository.create(
      input.sessionId,
      input.displayName
    );

    // Count total participants in session
    const participantCount = await this.repository.countBySession(input.sessionId);

    // Create event
    const event: ParticipantJoinedEvent = {
      participantId: participant.id,
      sessionId: participant.sessionId,
      displayName: participant.displayName,
      joinedAt: participant.joinedAt,
      participantCount
    };

    // Publish domain event to event bus
    eventBus.publish(
      createDomainEvent(
        DomainEventType.PARTICIPANT_JOINED,
        participant.sessionId,
        {
          participantId: participant.id,
          sessionId: participant.sessionId,
          displayName: participant.displayName,
          joinedAt: participant.joinedAt
        }
      )
    );

    return { participant, event };
  }

  /**
   * Get a participant by ID
   */
  async getParticipant(participantId: string): Promise<Participant> {
    const participant = await this.repository.findById(participantId);

    if (!participant) {
      throw new ParticipantNotFoundError(participantId);
    }

    return participant;
  }

  /**
   * Get all participants for a session
   */
  async getSessionParticipants(sessionId: string): Promise<Participant[]> {
    return this.repository.findBySessionId(sessionId);
  }

  /**
   * Count participants in a session
   */
  async countSessionParticipants(sessionId: string): Promise<number> {
    return this.repository.countBySession(sessionId);
  }

  /**
   * Remove a participant (for disconnection)
   */
  async removeParticipant(participantId: string): Promise<void> {
    // Get participant before deletion to access sessionId
    const participant = await this.getParticipant(participantId);

    // Delete participant
    await this.repository.delete(participantId);
    
    // Publish domain event to event bus
    eventBus.publish(
      createDomainEvent(
        DomainEventType.PARTICIPANT_DISCONNECTED,
        participant.sessionId,
        {
          participantId: participant.id,
          sessionId: participant.sessionId,
          disconnectedAt: new Date()
        }
      )
    );
  }

  /**
   * Update participant's last seen timestamp
   * Called on heartbeat to track participant activity
   */
  async updateLastSeen(participantId: string): Promise<void> {
    // Verify participant exists
    await this.getParticipant(participantId);
    
    // Update last_seen_at
    await this.repository.updateLastSeen(participantId);
  }
}
