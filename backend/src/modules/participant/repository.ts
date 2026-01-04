// Participant repository - Data access layer using Prisma
// Implements CRUD operations for Participant entity

import { PrismaClient, Participant as PrismaParticipant } from '@prisma/client';
import { Participant } from './types.js';

export class ParticipantRepository {
  constructor(private prisma: PrismaClient) {}

  // Convert Prisma Participant to domain Participant
  private toDomain(prismaParticipant: PrismaParticipant): Participant {
    return {
      id: prismaParticipant.id,
      sessionId: prismaParticipant.sessionId,
      displayName: prismaParticipant.displayName,
      joinedAt: prismaParticipant.joinedAt
    };
  }

  async create(sessionId: string, displayName?: string): Promise<Participant> {
    const participant = await this.prisma.participant.create({
      data: {
        sessionId,
        displayName: displayName || null
      }
    });
    return this.toDomain(participant);
  }

  async findById(id: string): Promise<Participant | null> {
    const participant = await this.prisma.participant.findUnique({
      where: { id }
    });
    return participant ? this.toDomain(participant) : null;
  }

  async findBySessionId(sessionId: string): Promise<Participant[]> {
    const participants = await this.prisma.participant.findMany({
      where: { sessionId },
      orderBy: { joinedAt: 'asc' }
    });
    return participants.map(p => this.toDomain(p));
  }

  async countBySession(sessionId: string): Promise<number> {
    return await this.prisma.participant.count({
      where: { sessionId }
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.participant.delete({
      where: { id }
    });
  }

  /**
   * Update participant's last_seen_at timestamp
   * Used for tracking participant activity via heartbeats
   */
  async updateLastSeen(id: string): Promise<void> {
    await this.prisma.participant.update({
      where: { id },
      data: { lastSeenAt: new Date() }
    });
  }
}
