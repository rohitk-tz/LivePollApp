// Vote controller - HTTP request handlers
// Handles REST API endpoints for vote operations

import { Request, Response, NextFunction } from 'express';
import { VoteService } from './service.js';
import { VoteNotFoundError } from './types.js';

export class VoteController {
  constructor(private service: VoteService) {}

  /**
   * POST /polls/:id/votes
   * Submit a vote for a poll
   */
  submitVote = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const pollId = req.params.id;
      const { participantId, optionId, ratingValue, textResponse } = req.body;

      // Validate required field
      if (!participantId) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'participantId is required'
        });
        return;
      }

      const result = await this.service.submitVote({
        pollId,
        participantId,
        optionId,
        ratingValue,
        textResponse
      });

      // Check if vote was rejected
      if ('vote' in result) {
        res.status(201).json({
          vote: result.vote,
          event: result.event
        });
      } else {
        res.status(400).json({
          error: 'Vote Rejected',
          message: result.event.reason,
          event: result.event
        });
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /votes/:id
   * Get vote by ID
   */
  getVote = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const voteId = req.params.id;
      const vote = await this.service.getVote(voteId);
      res.status(200).json(vote);
    } catch (error) {
      if (error instanceof VoteNotFoundError) {
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
   * GET /polls/:id/votes
   * Get all votes for a poll
   */
  getVotesByPoll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const pollId = req.params.id;
      const votes = await this.service.getVotesByPoll(pollId);
      const count = votes.length;
      
      res.status(200).json({
        votes,
        count,
        pollId
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /participants/:id/votes
   * Get all votes by a participant
   */
  getVotesByParticipant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const participantId = req.params.id;
      const votes = await this.service.getVotesByParticipant(participantId);
      
      res.status(200).json({
        votes,
        count: votes.length,
        participantId
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /polls/:id/votes/count
   * Get vote count for a poll
   */
  getVoteCount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const pollId = req.params.id;
      const count = await this.service.countVotes(pollId);
      
      res.status(200).json({
        pollId,
        count
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /polls/:pollId/participants/:participantId/voted
   * Check if participant has voted on a poll
   */
  hasVoted = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { pollId, participantId } = req.params;
      const hasVoted = await this.service.hasParticipantVoted(participantId, pollId);
      
      res.status(200).json({
        pollId,
        participantId,
        hasVoted
      });
    } catch (error) {
      next(error);
    }
  };
}
