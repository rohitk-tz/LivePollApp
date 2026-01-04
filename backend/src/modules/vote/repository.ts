// Vote repository - Data access layer using Prisma
// Implements CRUD operations for Vote entity

import { PrismaClient, Vote as PrismaVote } from '@prisma/client';
import { Vote } from './types.js';

export class VoteRepository {
  constructor(private prisma: PrismaClient) {}

  // Convert Prisma Vote to domain Vote
  private toDomain(prismaVote: PrismaVote): Vote {
    return {
      id: prismaVote.id,
      pollId: prismaVote.pollId,
      participantId: prismaVote.participantId,
      optionId: prismaVote.optionId,
      ratingValue: prismaVote.ratingValue,
      textResponse: prismaVote.textResponse,
      submittedAt: prismaVote.submittedAt
    };
  }

  async create(
    pollId: string,
    participantId: string,
    voteData: {
      optionId?: string;
      ratingValue?: number;
      textResponse?: string;
    }
  ): Promise<Vote> {
    const vote = await this.prisma.vote.create({
      data: {
        pollId,
        participantId,
        optionId: voteData.optionId || null,
        ratingValue: voteData.ratingValue || null,
        textResponse: voteData.textResponse || null
      }
    });
    return this.toDomain(vote);
  }

  async findById(id: string): Promise<Vote | null> {
    const vote = await this.prisma.vote.findUnique({
      where: { id }
    });
    return vote ? this.toDomain(vote) : null;
  }

  async findByPoll(pollId: string): Promise<Vote[]> {
    const votes = await this.prisma.vote.findMany({
      where: { pollId },
      orderBy: { submittedAt: 'asc' }
    });
    return votes.map(vote => this.toDomain(vote));
  }

  async findByParticipant(participantId: string): Promise<Vote[]> {
    const votes = await this.prisma.vote.findMany({
      where: { participantId },
      orderBy: { submittedAt: 'asc' }
    });
    return votes.map(vote => this.toDomain(vote));
  }

  async countByPoll(pollId: string): Promise<number> {
    return await this.prisma.vote.count({
      where: { pollId }
    });
  }

  async hasVoted(participantId: string, pollId: string): Promise<boolean> {
    const count = await this.prisma.vote.count({
      where: {
        participantId,
        pollId
      }
    });
    return count > 0;
  }

  async countByPollOption(pollId: string, optionId: string): Promise<number> {
    return await this.prisma.vote.count({
      where: {
        pollId,
        optionId
      }
    });
  }

  async getVoteCountsByOption(pollId: string): Promise<Map<string, number>> {
    const votes = await this.prisma.vote.groupBy({
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
    votes.forEach(vote => {
      if (vote.optionId) {
        counts.set(vote.optionId, vote._count.id);
      }
    });
    return counts;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.vote.delete({
      where: { id }
    });
  }
}
