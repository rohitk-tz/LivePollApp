// Session routes - REST API routing
// Based on specs/004-api-contracts/spec.md

import { Router } from 'express';
import { SessionController } from './controller.js';
import {
  validateCreateSession,
  validateSessionId,
  validateSessionCode
} from './validation.js';

export function createSessionRoutes(controller: SessionController): Router {
  const router = Router();

  // POST /sessions - Create new session
  router.post('/', validateCreateSession, controller.createSession);

  // GET /sessions/:id - Get session by ID
  router.get('/:id', validateSessionId, controller.getSession);

  // GET /sessions/code/:code - Get session by code
  router.get('/code/:code', validateSessionCode, controller.getSessionByCode);

  // PATCH /sessions/:id/start - Start session
  router.patch('/:id/start', validateSessionId, controller.startSession);

  // PATCH /sessions/:id/end - End session
  router.patch('/:id/end', validateSessionId, controller.endSession);

  return router;
}
