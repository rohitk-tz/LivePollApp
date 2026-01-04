// Vote routes - Express router configuration
// Defines REST API endpoints for vote operations

import { Router } from 'express';
import { VoteController } from './controller.js';

export function createVoteRoutes(controller: VoteController): Router {
  const router = Router();

  // Submit a vote for a poll
  router.post('/polls/:id/votes', controller.submitVote);

  // Get vote by ID
  router.get('/votes/:id', controller.getVote);

  // Get all votes for a poll
  router.get('/polls/:id/votes', controller.getVotesByPoll);

  // Get vote count for a poll
  router.get('/polls/:id/votes/count', controller.getVoteCount);

  // Get all votes by a participant
  router.get('/participants/:id/votes', controller.getVotesByParticipant);

  // Check if participant has voted on a poll
  router.get('/polls/:pollId/participants/:participantId/voted', controller.hasVoted);

  return router;
}
