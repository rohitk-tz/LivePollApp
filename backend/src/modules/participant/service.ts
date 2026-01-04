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
   * Remove a participant
   */
  async removeParticipant(participantId: string): Promise<void> {
    // Verify participant exists
    await this.getParticipant(participantId);

    // Delete participant
    await this.repository.delete(participantId);
  }
}
