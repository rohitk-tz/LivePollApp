// Session repository - Data access layer using Prisma
// Implements CRUD operations for Session entity

import { PrismaClient, Session as PrismaSession } from '@prisma/client';
import { Session, SessionStatus } from './types.js';

export class SessionRepository {
  constructor(private prisma: PrismaClient) {}

  // Convert Prisma Session to domain Session
  private toDomain(prismaSession: PrismaSession): Session {
    return {
      id: prismaSession.id,
      code: prismaSession.code,
      presenterName: prismaSession.presenterName,
      status: prismaSession.status as SessionStatus,
      createdAt: prismaSession.createdAt,
      startedAt: prismaSession.startedAt,
      endedAt: prismaSession.endedAt
    };
  }

  async create(code: string, presenterName: string): Promise<Session> {
    const session = await this.prisma.session.create({
      data: {
        code,
        presenterName,
        status: 'PENDING'
      }
    });
    return this.toDomain(session);
  }

  async findById(id: string): Promise<Session | null> {
    const session = await this.prisma.session.findUnique({
      where: { id }
    });
    return session ? this.toDomain(session) : null;
  }

  async findByCode(code: string): Promise<Session | null> {
    const session = await this.prisma.session.findUnique({
      where: { code }
    });
    return session ? this.toDomain(session) : null;
  }

  async updateStatus(
    id: string,
    status: SessionStatus,
    timestamp?: Date
  ): Promise<Session> {
    const updateData: {
      status: SessionStatus;
      startedAt?: Date;
      endedAt?: Date;
    } = { status };

    if (status === SessionStatus.ACTIVE && timestamp) {
      updateData.startedAt = timestamp;
    } else if (status === SessionStatus.ENDED && timestamp) {
      updateData.endedAt = timestamp;
    }

    const session = await this.prisma.session.update({
      where: { id },
      data: updateData
    });
    return this.toDomain(session);
  }

  async codeExists(code: string): Promise<boolean> {
    const count = await this.prisma.session.count({
      where: { code }
    });
    return count > 0;
  }
}
