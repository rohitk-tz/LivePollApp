// Poll routes - Express router configuration
// Defines REST API endpoints for poll operations

import { Router } from 'express';
import { PollController } from './controller.js';

export function createPollRoutes(controller: PollController): Router {
  const router = Router();

  // Create a new poll for a session
  router.post('/sessions/:id/polls', controller.createPoll);

  // Get all polls for a session
  router.get('/sessions/:id/polls', controller.getSessionPolls);

  // Get the active poll for a session
  router.get('/sessions/:id/polls/active', controller.getActivePoll);

  // Get poll by ID
  router.get('/polls/:id', controller.getPoll);

  // Get poll results with vote counts
  router.get('/polls/:id/results', controller.getPollResults);

  // Activate a poll
  router.post('/polls/:id/activate', controller.activatePoll);

  // Close a poll
  router.post('/polls/:id/close', controller.closePoll);

  return router;
}
