// Vote service - Business logic layer
// Implements vote submission and retrieval per specs/008-module-boundaries/spec.md

import { Prisma } from '@prisma/client';
import { VoteRepository } from './repository.js';
import { VoteValidator } from './validation.js';
import {
  Vote,
  SubmitVoteInput,
  VoteAcceptedEvent,
  VoteRejectedEvent,
  VoteNotFoundError
} from './types.js';

export class VoteService {
  constructor(
    private repository: VoteRepository,
    private validator: VoteValidator
  ) {}

  /**
   * Submit a vote - validates and creates vote record
   * Published events: VoteAccepted or VoteRejected
   */
  async submitVote(input: SubmitVoteInput): Promise<{
    vote: Vote;
    event: VoteAcceptedEvent;
  } | {
    event: VoteRejectedEvent;
  }> {
    try {
      // Validate poll is active
      await this.validator.validatePollActive(input.pollId);

      // Validate participant exists and belongs to session
      await this.validator.validateParticipant(input.participantId, input.pollId);

      // Check for duplicate vote
      const hasVoted = await this.repository.hasVoted(input.participantId, input.pollId);
      if (hasVoted) {
        const rejectedEvent: VoteRejectedEvent = {
          pollId: input.pollId,
          participantId: input.participantId,
          reason: 'Participant has already voted on this poll'
        };
        return { event: rejectedEvent };
      }

      // Validate vote data matches poll type
      await this.validator.validateVoteData(input.pollId, {
        optionId: input.optionId,
        ratingValue: input.ratingValue,
        textResponse: input.textResponse
      });

      // Create vote
      const vote = await this.repository.create(
        input.pollId,
        input.participantId,
        {
          optionId: input.optionId,
          ratingValue: input.ratingValue,
          textResponse: input.textResponse
        }
      );

      const acceptedEvent: VoteAcceptedEvent = {
        voteId: vote.id,
        pollId: vote.pollId,
        participantId: vote.participantId,
        optionId: vote.optionId,
        submittedAt: vote.submittedAt
      };

      return { vote, event: acceptedEvent };
    } catch (error) {
      // Handle Prisma unique constraint violation for duplicate votes
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const rejectedEvent: VoteRejectedEvent = {
          pollId: input.pollId,
          participantId: input.participantId,
          reason: 'Participant has already voted on this poll'
        };
        return { event: rejectedEvent };
      }

      // For validation errors, convert to rejected event
      if (error instanceof Error) {
        const rejectedEvent: VoteRejectedEvent = {
          pollId: input.pollId,
          participantId: input.participantId,
          reason: error.message
        };
        return { event: rejectedEvent };
      }

      throw error;
    }
  }

  /**
   * Get vote by ID
   */
  async getVote(voteId: string): Promise<Vote> {
    const vote = await this.repository.findById(voteId);
    
    if (!vote) {
      throw new VoteNotFoundError(voteId);
    }

    return vote;
  }

  /**
   * Get all votes for a poll
   */
  async getVotesByPoll(pollId: string): Promise<Vote[]> {
    return await this.repository.findByPoll(pollId);
  }

  /**
   * Get all votes by a participant
   */
  async getVotesByParticipant(participantId: string): Promise<Vote[]> {
    return await this.repository.findByParticipant(participantId);
  }

  /**
   * Count votes for a poll
   */
  async countVotes(pollId: string): Promise<number> {
    return await this.repository.countByPoll(pollId);
  }

  /**
   * Check if participant has voted on a poll
   */
  async hasParticipantVoted(participantId: string, pollId: string): Promise<boolean> {
    return await this.repository.hasVoted(participantId, pollId);
  }

  /**
   * Get vote counts by option for a poll
   */
  async getVoteCountsByOption(pollId: string): Promise<Map<string, number>> {
    return await this.repository.getVoteCountsByOption(pollId);
  }
}
