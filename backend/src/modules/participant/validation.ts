// Participant validation logic
// Validates participant operations and session requirements

import { PrismaClient } from '@prisma/client';
import { ParticipantValidationError } from './types.js';

export class ParticipantValidator {
  constructor(private prisma: PrismaClient) {}

  /**
   * Validate that session exists and is active for joining
   */
  async validateSessionForJoin(sessionId: string): Promise<void> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      throw new ParticipantValidationError(`Session ${sessionId} does not exist`);
    }

    if (session.status !== 'ACTIVE') {
      throw new ParticipantValidationError(
        `Cannot join session - session must be ACTIVE. Current status: ${session.status}`
      );
    }
  }

  /**
   * Validate display name format
   */
  validateDisplayName(displayName?: string): void {
    if (displayName !== undefined && displayName !== null) {
      const trimmed = displayName.trim();
      
      if (trimmed.length === 0) {
        throw new ParticipantValidationError('Display name cannot be empty if provided');
      }

      if (trimmed.length > 100) {
        throw new ParticipantValidationError(
          'Display name exceeds maximum length of 100 characters'
        );
      }
    }
  }

  /**
   * Validate participant exists and belongs to session
   */
  async validateParticipantInSession(
    participantId: string,
    sessionId: string
  ): Promise<void> {
    const participant = await this.prisma.participant.findUnique({
      where: { id: participantId }
    });

    if (!participant) {
      throw new ParticipantValidationError(`Participant ${participantId} does not exist`);
    }

    if (participant.sessionId !== sessionId) {
      throw new ParticipantValidationError(
        `Participant ${participantId} does not belong to session ${sessionId}`
      );
    }
  }
}
