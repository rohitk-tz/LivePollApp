// Vote validation logic
// Validates vote submission requirements per specs/008-module-boundaries/spec.md

import { PrismaClient } from '@prisma/client';
import { InvalidVoteError, PollNotActiveError } from './types.js';

export class VoteValidator {
  constructor(private prisma: PrismaClient) {}

  /**
   * Validate that poll exists and is active (not closed)
   */
  async validatePollActive(pollId: string): Promise<void> {
    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId }
    });

    if (!poll) {
      throw new InvalidVoteError(`Poll ${pollId} does not exist`);
    }

    if (poll.closedAt !== null) {
      throw new PollNotActiveError(pollId);
    }
  }

  /**
   * Validate that participant exists and belongs to the poll's session
   */
  async validateParticipant(participantId: string, pollId: string): Promise<void> {
    const participant = await this.prisma.participant.findUnique({
      where: { id: participantId }
    });

    if (!participant) {
      throw new InvalidVoteError(`Participant ${participantId} does not exist`);
    }

    // Check that participant's session matches poll's session
    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId },
      select: { sessionId: true }
    });

    if (!poll) {
      throw new InvalidVoteError(`Poll ${pollId} does not exist`);
    }

    if (participant.sessionId !== poll.sessionId) {
      throw new InvalidVoteError(
        `Participant ${participantId} does not belong to the session for poll ${pollId}`
      );
    }
  }

  /**
   * Validate that option belongs to the poll (for multiple choice polls)
   */
  async validateOption(optionId: string, pollId: string): Promise<void> {
    const option = await this.prisma.pollOption.findUnique({
      where: { id: optionId }
    });

    if (!option) {
      throw new InvalidVoteError(`Option ${optionId} does not exist`);
    }

    if (option.pollId !== pollId) {
      throw new InvalidVoteError(
        `Option ${optionId} does not belong to poll ${pollId}`
      );
    }
  }

  /**
   * Validate vote data matches poll type
   */
  async validateVoteData(
    pollId: string,
    voteData: {
      optionId?: string;
      ratingValue?: number;
      textResponse?: string;
    }
  ): Promise<void> {
    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId }
    });

    if (!poll) {
      throw new InvalidVoteError(`Poll ${pollId} does not exist`);
    }

    // Check that at least one vote data field is provided
    const hasData = voteData.optionId || voteData.ratingValue !== undefined || voteData.textResponse;
    if (!hasData) {
      throw new InvalidVoteError('Vote must include optionId, ratingValue, or textResponse');
    }

    // Validate based on poll type
    switch (poll.pollType) {
      case 'MULTIPLE_CHOICE':
        if (!voteData.optionId) {
          throw new InvalidVoteError('Multiple choice polls require optionId');
        }
        if (voteData.ratingValue !== undefined || voteData.textResponse) {
          throw new InvalidVoteError('Multiple choice polls only accept optionId');
        }
        // Validate option belongs to poll
        await this.validateOption(voteData.optionId, pollId);
        break;

      case 'RATING_SCALE':
        if (voteData.ratingValue === undefined) {
          throw new InvalidVoteError('Rating scale polls require ratingValue');
        }
        if (voteData.optionId || voteData.textResponse) {
          throw new InvalidVoteError('Rating scale polls only accept ratingValue');
        }
        // Validate rating is within bounds
        if (poll.minRating !== null && voteData.ratingValue < poll.minRating) {
          throw new InvalidVoteError(
            `Rating value ${voteData.ratingValue} is below minimum ${poll.minRating}`
          );
        }
        if (poll.maxRating !== null && voteData.ratingValue > poll.maxRating) {
          throw new InvalidVoteError(
            `Rating value ${voteData.ratingValue} is above maximum ${poll.maxRating}`
          );
        }
        break;

      case 'OPEN_TEXT':
        if (!voteData.textResponse) {
          throw new InvalidVoteError('Open text polls require textResponse');
        }
        if (voteData.optionId || voteData.ratingValue !== undefined) {
          throw new InvalidVoteError('Open text polls only accept textResponse');
        }
        break;

      default:
        throw new InvalidVoteError(`Unknown poll type: ${poll.pollType}`);
    }
  }
}
