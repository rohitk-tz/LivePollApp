// Poll service - Business logic layer
// Implements poll creation, activation, closure, and results per specs/008-module-boundaries/spec.md

import { PollRepository } from './repository.js';
import { PollValidator } from './validation.js';
import {
  Poll,
  PollType,
  CreatePollInput,
  PollResults,
  PollCreatedEvent,
  PollActivatedEvent,
  PollClosedEvent,
  PollNotFoundError
} from './types.js';
import { eventBus, DomainEventType, createDomainEvent } from '../../events/index.js';

export class PollService {
  constructor(
    private repository: PollRepository,
    private validator: PollValidator
  ) {}

  /**
   * Create a new poll for a session
   * Published event: PollCreated
   */
  async createPoll(input: CreatePollInput): Promise<{
    poll: Poll;
    event: PollCreatedEvent;
  }> {
    // Validate session is active
    await this.validator.validateSession(input.sessionId);

    // Validate question
    this.validator.validateQuestion(input.question);

    // Validate poll type specific requirements
    if (input.pollType === PollType.MULTIPLE_CHOICE) {
      if (!input.options || input.options.length === 0) {
        throw new Error('Multiple choice polls require options');
      }
      this.validator.validateOptions(input.options);
    } else if (input.pollType === PollType.RATING_SCALE) {
      this.validator.validateRatingBounds(input.minRating, input.maxRating);
    }

    // Get next sequence order
    const sequenceOrder = await this.repository.getNextSequenceOrder(input.sessionId);

    // Create poll
    const poll = await this.repository.create(
      input.sessionId,
      input.question,
      input.pollType,
      {
        allowMultiple: input.allowMultiple,
        isAnonymous: input.isAnonymous,
        minRating: input.minRating,
        maxRating: input.maxRating
      },
      sequenceOrder
    );

    // Create options if provided
    if (input.options && input.options.length > 0) {
      const options = input.options.map((opt, index) => ({
        text: opt.text,
        order: opt.order ?? index + 1
      }));
      
      const createdOptions = await this.repository.createOptions(poll.id, options);
      poll.options = createdOptions;
    }

    const event: PollCreatedEvent = {
      pollId: poll.id,
      sessionId: poll.sessionId,
      question: poll.question,
      pollType: poll.pollType,
      createdAt: poll.createdAt
    };

    // Publish domain event to event bus
    eventBus.publish(
      createDomainEvent(
        DomainEventType.POLL_CREATED,
        poll.sessionId,
        {
          pollId: poll.id,
          sessionId: poll.sessionId,
          question: poll.question,
          pollType: poll.pollType,
          options: poll.options?.map(opt => ({ id: opt.id, text: opt.optionText }))
        }
      )
    );

    return { poll, event };
  }

  /**
   * Activate a poll (only one poll can be active at a time per session)
   * Published event: PollActivated
   */
  async activatePoll(pollId: string): Promise<{
    poll: Poll;
    event: PollActivatedEvent;
  }> {
    // Validate poll can be activated
    await this.validator.validateCanActivate(pollId);

    const activatedAt = new Date();

    // Update poll status to Active
    const poll = await this.repository.activate(pollId);

    const event: PollActivatedEvent = {
      pollId: poll.id,
      sessionId: poll.sessionId,
      activatedAt
    };

    // Publish domain event to event bus
    eventBus.publish(
      createDomainEvent(
        DomainEventType.POLL_ACTIVATED,
        poll.sessionId,
        {
          pollId: poll.id,
          sessionId: poll.sessionId,
          activatedAt
        }
      )
    );

    return { poll, event };
  }

  /**
   * Close a poll to stop accepting votes
   * Published event: PollClosed
   */
  async closePoll(pollId: string): Promise<{
    poll: Poll;
    event: PollClosedEvent;
  }> {
    // Validate poll can be closed
    await this.validator.validateCanClose(pollId);

    const closedAt = new Date();
    const poll = await this.repository.close(pollId, closedAt);

    // Get total votes
    const totalVotes = await this.repository.getTotalVotes(pollId);

    const event: PollClosedEvent = {
      pollId: poll.id,
      sessionId: poll.sessionId,
      closedAt,
      totalVotes
    };

    // Publish domain event to event bus
    eventBus.publish(
      createDomainEvent(
        DomainEventType.POLL_CLOSED,
        poll.sessionId,
        {
          pollId: poll.id,
          sessionId: poll.sessionId,
          closedAt
        }
      )
    );

    return { poll, event };
  }

  /**
   * Get poll by ID
   */
  async getPoll(pollId: string): Promise<Poll> {
    const poll = await this.repository.findById(pollId, true);
    
    if (!poll) {
      throw new PollNotFoundError(pollId);
    }

    return poll;
  }

  /**
   * Get all polls for a session
   */
  async getSessionPolls(sessionId: string): Promise<Poll[]> {
    return await this.repository.findBySessionId(sessionId);
  }

  /**
   * Get poll results with vote counts
   */
  async getPollResults(pollId: string): Promise<PollResults> {
    const poll = await this.repository.findById(pollId, true);
    
    if (!poll) {
      throw new PollNotFoundError(pollId);
    }

    const totalVotes = await this.repository.getTotalVotes(pollId);
    const voteCounts = await this.repository.getVoteCounts(pollId);

    const optionsWithVotes = (poll.options || []).map(option => {
      const voteCount = voteCounts.get(option.id) || 0;
      const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;

      return {
        optionId: option.id,
        text: option.optionText,
        voteCount,
        percentage: Math.round(percentage * 100) / 100 // Round to 2 decimal places
      };
    });

    return {
      pollId: poll.id,
      question: poll.question,
      pollType: poll.pollType,
      totalVotes,
      options: optionsWithVotes,
      isAnonymous: poll.isAnonymous,
      closedAt: poll.closedAt
    };
  }

  /**
   * Get the currently active poll for a session (if any)
   */
  async getActivePoll(sessionId: string): Promise<Poll | null> {
    return await this.repository.getActivePoll(sessionId);
  }

  /**
   * Check if session has an active poll
   */
  async hasActivePoll(sessionId: string): Promise<boolean> {
    return await this.repository.hasActivePoll(sessionId);
  }
}
