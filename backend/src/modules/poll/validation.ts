// Poll validation logic
// Validates poll creation and state transition requirements

import { PrismaClient } from '@prisma/client';
import { PollValidationError, ActivePollExistsError } from './types.js';

export class PollValidator {
  constructor(private prisma: PrismaClient) {}

  /**
   * Validate that session exists and is active
   */
  async validateSession(sessionId: string): Promise<void> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      throw new PollValidationError(`Session ${sessionId} does not exist`);
    }

    if (session.status !== 'ACTIVE') {
      throw new PollValidationError(
        `Session must be ACTIVE to create polls. Current status: ${session.status}`
      );
    }
  }

  /**
   * Validate poll options (for multiple choice polls)
   */
  validateOptions(
    options: Array<{ text: string; order?: number }>
  ): void {
    if (!options || options.length < 2) {
      throw new PollValidationError('Poll must have at least 2 options');
    }

    if (options.length > 10) {
      throw new PollValidationError('Poll cannot have more than 10 options');
    }

    // Validate option text
    options.forEach((opt, index) => {
      if (!opt.text || opt.text.trim().length === 0) {
        throw new PollValidationError(`Option ${index + 1} text cannot be empty`);
      }

      if (opt.text.length > 500) {
        throw new PollValidationError(
          `Option ${index + 1} text exceeds maximum length of 500 characters`
        );
      }
    });

    // Check for duplicate option text
    const textSet = new Set(options.map(opt => opt.text.trim().toLowerCase()));
    if (textSet.size !== options.length) {
      throw new PollValidationError('Poll options must have unique text');
    }
  }

  /**
   * Validate question text
   */
  validateQuestion(question: string): void {
    if (!question || question.trim().length === 0) {
      throw new PollValidationError('Question cannot be empty');
    }

    if (question.length > 500) {
      throw new PollValidationError(
        'Question exceeds maximum length of 500 characters'
      );
    }
  }

  /**
   * Validate rating bounds (for rating scale polls)
   */
  validateRatingBounds(minRating?: number, maxRating?: number): void {
    if (minRating !== undefined && maxRating !== undefined) {
      if (minRating >= maxRating) {
        throw new PollValidationError('minRating must be less than maxRating');
      }

      if (minRating < 1 || minRating > 10) {
        throw new PollValidationError('minRating must be between 1 and 10');
      }

      if (maxRating < 1 || maxRating > 10) {
        throw new PollValidationError('maxRating must be between 1 and 10');
      }
    }
  }

  /**
   * Validate no other poll is active in session (single-active-poll constraint)
   */
  async validateNoActivePoll(sessionId: string): Promise<void> {
    const activePoll = await this.prisma.poll.findFirst({
      where: {
        sessionId,
        closedAt: null
      }
    });

    if (activePoll) {
      throw new ActivePollExistsError(sessionId);
    }
  }

  /**
   * Validate poll can be activated
   */
  async validateCanActivate(pollId: string): Promise<void> {
    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        options: true,
        session: true
      }
    });

    if (!poll) {
      throw new PollValidationError(`Poll ${pollId} does not exist`);
    }

    if (poll.closedAt !== null) {
      throw new PollValidationError('Cannot activate a closed poll');
    }

    if (!poll.session || poll.session.status !== 'ACTIVE') {
      throw new PollValidationError(
        'Cannot activate poll - session is not active'
      );
    }

    // Check for multiple choice polls have options
    if (poll.pollType === 'MULTIPLE_CHOICE' && (!poll.options || poll.options.length < 2)) {
      throw new PollValidationError(
        'Cannot activate poll - must have at least 2 options'
      );
    }

    // Check no other poll is active
    await this.validateNoActivePoll(poll.sessionId);
  }

  /**
   * Validate poll can be closed
   */
  async validateCanClose(pollId: string): Promise<void> {
    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId }
    });

    if (!poll) {
      throw new PollValidationError(`Poll ${pollId} does not exist`);
    }

    if (poll.closedAt !== null) {
      throw new PollValidationError('Poll is already closed');
    }
  }
}
