// Express application setup
// Configures Express with middleware and routes

import express, { Express } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import {
  SessionRepository,
  SessionService,
  SessionController,
  createSessionRoutes
} from './modules/session/index.js';
import { createVoteModule } from './modules/vote/index.js';
import { createPollModule } from './modules/poll/index.js';
import { createParticipantModule } from './modules/participant/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

export function createApp(prisma: PrismaClient): Express {
  const app = express();

  // CORS middleware - must be before other middleware
  app.use(cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Initialize Session module
  const sessionRepository = new SessionRepository(prisma);
  const sessionService = new SessionService(sessionRepository);
  const sessionController = new SessionController(sessionService);
  const sessionRoutes = createSessionRoutes(sessionController);

  // Initialize Vote module
  const voteModule = createVoteModule(prisma);

  // Initialize Poll module
  const pollModule = createPollModule(prisma);

  // Initialize Participant module
  const participantModule = createParticipantModule(prisma);

  // Register routes
  app.use('/sessions', sessionRoutes);
  app.use('/', voteModule.routes);
  app.use('/', pollModule.routes);
  app.use('/', participantModule.routes);

  // Error handling (must be last)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
