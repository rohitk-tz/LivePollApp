// Poll controller - HTTP request handlers
// Handles REST API endpoints for poll operations

import { Request, Response, NextFunction } from 'express';
import { PollService } from './service.js';
import {
  Poll,
  PollType,
  PollStatus,
  PollNotFoundError,
  PollValidationError,
  ActivePollExistsError
} from './types.js';

// Map poll to frontend format with isActive field and vote counts
async function toFrontendPollWithVotes(poll: Poll, service: PollService) {
  // Get vote counts for active or closed polls
  const voteCounts = (poll.status === PollStatus.Active || poll.status === PollStatus.Closed)
    ? await service['repository'].getVoteCounts(poll.id)
    : new Map<string, number>();

  return {
    ...poll,
    isActive: poll.status === PollStatus.Active,
    options: poll.options?.map(opt => ({
      ...opt,
      voteCount: voteCounts.get(opt.id) || 0
    }))
  };
}

// Map poll to frontend format with isActive field (without vote counts)
function toFrontendPoll(poll: Poll) {
  return {
    ...poll,
    isActive: poll.status === PollStatus.Active
  };
}

export class PollController {
  constructor(private service: PollService) {}

  /**
   * POST /sessions/:id/polls
   * Create a new poll for a session
   */
  createPoll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sessionId = req.params.id;
      const { question, pollType, allowMultiple, isAnonymous, minRating, maxRating, options } = req.body;

      // Validate required fields
      if (!question) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'question is required'
        });
        return;
      }

      if (!pollType) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'pollType is required'
        });
        return;
      }

      // Validate pollType enum
      if (!Object.values(PollType).includes(pollType)) {
        res.status(400).json({
          error: 'Bad Request',
          message: `Invalid pollType. Must be one of: ${Object.values(PollType).join(', ')}`
        });
        return;
      }

      const result = await this.service.createPoll({
        sessionId,
        question,
        pollType,
        allowMultiple,
        isAnonymous,
        minRating,
        maxRating,
        options
      });

      res.status(201).json({
        poll: toFrontendPoll(result.poll),
        event: result.event
      });
    } catch (error) {
      if (error instanceof PollValidationError) {
        res.status(400).json({
          error: 'Validation Error',
          message: error.message
        });
        return;
      }
      next(error);
    }
  };

  /**
   * POST /polls/:id/activate
   * Activate a poll to make it votable
   */
  activatePoll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const pollId = req.params.id;
      const result = await this.service.activatePoll(pollId);

      res.status(200).json({
        poll: toFrontendPoll(result.poll),
        event: result.event
      });
    } catch (error) {
      if (error instanceof PollNotFoundError) {
        res.status(404).json({
          error: 'Not Found',
          message: error.message
        });
        return;
      }
      if (error instanceof PollValidationError) {
        res.status(400).json({
          error: 'Validation Error',
          message: error.message
        });
        return;
      }
      if (error instanceof ActivePollExistsError) {
        res.status(409).json({
          error: 'Conflict',
          message: error.message
        });
        return;
      }
      next(error);
    }
  };

  /**
   * POST /polls/:id/close
   * Close a poll to stop accepting votes
   */
  closePoll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const pollId = req.params.id;
      const result = await this.service.closePoll(pollId);

      res.status(200).json({
        poll: toFrontendPoll(result.poll),
        event: result.event
      });
    } catch (error) {
      if (error instanceof PollNotFoundError) {
        res.status(404).json({
          error: 'Not Found',
          message: error.message
        });
        return;
      }
      if (error instanceof PollValidationError) {
        res.status(400).json({
          error: 'Validation Error',
          message: error.message
        });
        return;
      }
      next(error);
    }
  };

  /**
   * GET /polls/:id
   * Get poll by ID
   */
  getPoll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const pollId = req.params.id;
      const poll = await this.service.getPoll(pollId);
      const pollWithVotes = await toFrontendPollWithVotes(poll, this.service);

      res.status(200).json(pollWithVotes);
    } catch (error) {
      if (error instanceof PollNotFoundError) {
        res.status(404).json({
          error: 'Not Found',
          message: error.message
        });
        return;
      }
      next(error);
    }
  };

  /**
   * GET /polls/:id/results
   * Get poll results with vote counts
   */
  getPollResults = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const pollId = req.params.id;
      const results = await this.service.getPollResults(pollId);

      res.status(200).json(results);
    } catch (error) {
      if (error instanceof PollNotFoundError) {
        res.status(404).json({
          error: 'Not Found',
          message: error.message
        });
        return;
      }
      next(error);
    }
  };

  /**
   * GET /sessions/:id/polls
   * Get all polls for a session
   */
  getSessionPolls = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sessionId = req.params.id;
      const polls = await this.service.getSessionPolls(sessionId);

      // Map polls with vote counts
      const pollsWithVotes = await Promise.all(
        polls.map(poll => toFrontendPollWithVotes(poll, this.service))
      );

      res.status(200).json({
        polls: pollsWithVotes,
        count: polls.length,
        sessionId
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /sessions/:id/polls/active
   * Get the active poll for a session (if any)
   */
  getActivePoll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sessionId = req.params.id;
      const poll = await this.service.getActivePoll(sessionId);

      if (!poll) {
        res.status(404).json({
          error: 'Not Found',
          message: 'No active poll found for this session'
        });
        return;
      }

      const pollWithVotes = await toFrontendPollWithVotes(poll, this.service);
      res.status(200).json(pollWithVotes);
    } catch (error) {
      next(error);
    }
  };
}
