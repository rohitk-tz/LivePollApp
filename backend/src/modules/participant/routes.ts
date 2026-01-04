// Participant routes - Express route definitions
// Defines HTTP endpoints for participant operations

import { Router } from 'express';
import { ParticipantController } from './controller.js';
import { PrismaClient } from '@prisma/client';

export function createParticipantRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const controller = new ParticipantController(prisma);

  // Join session - register new participant
  router.post('/sessions/:id/join', controller.joinSession);

  // Get participant by ID
  router.get('/participants/:id', controller.getParticipant);

  // Get all participants for a session
  router.get('/sessions/:id/participants', controller.getSessionParticipants);

  // Remove participant
  router.delete('/participants/:id', controller.removeParticipant);

  return router;
}
