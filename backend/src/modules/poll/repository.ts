// Poll repository - Data access layer using Prisma
// Implements CRUD operations for Poll and PollOption entities

import {
  PrismaClient,
  Poll as PrismaPoll,
  PollOption as PrismaPollOption,
  PollType as PrismaPollType
} from '@prisma/client';
import { Poll, PollOption, PollType } from './types.js';

export class PollRepository {
  constructor(private prisma: PrismaClient) {}

  // Convert Prisma Poll to domain Poll
  private toDomain(
    prismaPoll: PrismaPoll & { options?: PrismaPollOption[] }
  ): Poll {
    return {
      id: prismaPoll.id,
      sessionId: prismaPoll.sessionId,
      question: prismaPoll.question,
      pollType: prismaPoll.pollType as PollType,
      allowMultiple: prismaPoll.allowMultiple,
      isAnonymous: prismaPoll.isAnonymous,
      minRating: prismaPoll.minRating,
      maxRating: prismaPoll.maxRating,
      sequenceOrder: prismaPoll.sequenceOrder,
      createdAt: prismaPoll.createdAt,
      closedAt: prismaPoll.closedAt,
      options: prismaPoll.options?.map(opt => this.optionToDomain(opt))
    };
  }

  // Convert Prisma PollOption to domain PollOption
  private optionToDomain(prismaPollOption: PrismaPollOption): PollOption {
    return {
      id: prismaPollOption.id,
      pollId: prismaPollOption.pollId,
      optionText: prismaPollOption.optionText,
      sequenceOrder: prismaPollOption.sequenceOrder
    };
  }

  async create(
    sessionId: string,
    question: string,
    pollType: PollType,
    settings: {
      allowMultiple?: boolean;
      isAnonymous?: boolean;
      minRating?: number;
      maxRating?: number;
    },
    sequenceOrder: number
  ): Promise<Poll> {
    const poll = await this.prisma.poll.create({
      data: {
        sessionId,
        question,
        pollType: pollType as PrismaPollType,
        allowMultiple: settings.allowMultiple ?? false,
        isAnonymous: settings.isAnonymous ?? true,
        minRating: settings.minRating ?? null,
        maxRating: settings.maxRating ?? null,
        sequenceOrder
      },
      include: {
        options: true
      }
    });
    return this.toDomain(poll);
  }

  async createOptions(
    pollId: string,
    options: Array<{ text: string; order: number }>
  ): Promise<PollOption[]> {
    await this.prisma.pollOption.createMany({
      data: options.map(opt => ({
        pollId,
        optionText: opt.text,
        sequenceOrder: opt.order
      }))
    });

    // Fetch the created options
    const pollOptions = await this.prisma.pollOption.findMany({
      where: { pollId },
      orderBy: { sequenceOrder: 'asc' }
    });

    return pollOptions.map(opt => this.optionToDomain(opt));
  }

  async findById(id: string, includeOptions = true): Promise<Poll | null> {
    const poll = await this.prisma.poll.findUnique({
      where: { id },
      include: {
        options: includeOptions ? { orderBy: { sequenceOrder: 'asc' } } : false
      }
    });
    return poll ? this.toDomain(poll) : null;
  }

  async findBySessionId(sessionId: string): Promise<Poll[]> {
    const polls = await this.prisma.poll.findMany({
      where: { sessionId },
      include: {
        options: { orderBy: { sequenceOrder: 'asc' } }
      },
      orderBy: { sequenceOrder: 'asc' }
    });
    return polls.map(poll => this.toDomain(poll));
  }

  async getNextSequenceOrder(sessionId: string): Promise<number> {
    const maxOrder = await this.prisma.poll.aggregate({
      where: { sessionId },
      _max: { sequenceOrder: true }
    });
    return (maxOrder._max.sequenceOrder ?? 0) + 1;
  }

  async hasActivePoll(sessionId: string): Promise<boolean> {
    const count = await this.prisma.poll.count({
      where: {
        sessionId,
        closedAt: null
      }
    });
    return count > 0;
  }

  async getActivePoll(sessionId: string): Promise<Poll | null> {
    const poll = await this.prisma.poll.findFirst({
      where: {
        sessionId,
        closedAt: null
      },
      include: {
        options: { orderBy: { sequenceOrder: 'asc' } }
      }
    });
    return poll ? this.toDomain(poll) : null;
  }

  async close(id: string, closedAt: Date): Promise<Poll> {
    const poll = await this.prisma.poll.update({
      where: { id },
      data: { closedAt },
      include: {
        options: { orderBy: { sequenceOrder: 'asc' } }
      }
    });
    return this.toDomain(poll);
  }

  async countBySession(sessionId: string): Promise<number> {
    return await this.prisma.poll.count({
      where: { sessionId }
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.poll.delete({
      where: { id }
    });
  }

  // Get vote counts for poll options (queries Vote module data)
  async getVoteCounts(pollId: string): Promise<Map<string, number>> {
    const voteCounts = await this.prisma.vote.groupBy({
      by: ['optionId'],
      where: {
        pollId,
        optionId: { not: null }
      },
      _count: {
        id: true
      }
    });

    const counts = new Map<string, number>();
    voteCounts.forEach(vc => {
      if (vc.optionId) {
        counts.set(vc.optionId, vc._count.id);
      }
    });
    return counts;
  }

  async getTotalVotes(pollId: string): Promise<number> {
    return await this.prisma.vote.count({
      where: { pollId }
    });
  }
}
