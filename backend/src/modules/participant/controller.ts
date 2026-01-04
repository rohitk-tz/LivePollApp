// Participant controller - HTTP request handlers
// Maps HTTP requests/responses to service operations

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ParticipantService } from './service.js';
import { ParticipantNotFoundError, ParticipantValidationError } from './types.js';

export class ParticipantController {
  private service: ParticipantService;

  constructor(prisma: PrismaClient) {
    this.service = new ParticipantService(prisma);
  }

  /**
   * POST /sessions/:id/join
   * Register a participant joining a session
   */
  joinSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const sessionId = req.params.id;
      const { displayName } = req.body;

      const { participant } = await this.service.joinSession({
        sessionId,
        displayName
      });

      res.status(200).json({
        sessionId: participant.sessionId,
        participantId: participant.id,
        joinedAt: participant.joinedAt
      });
    } catch (error) {
      if (error instanceof ParticipantValidationError) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };

  /**
   * GET /participants/:id
   * Get a participant by ID
   */
  getParticipant = async (req: Request, res: Response): Promise<void> => {
    try {
      const participantId = req.params.id;
      const participant = await this.service.getParticipant(participantId);

      res.status(200).json(participant);
    } catch (error) {
      if (error instanceof ParticipantNotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };

  /**
   * GET /sessions/:id/participants
   * Get all participants for a session
   */
  getSessionParticipants = async (req: Request, res: Response): Promise<void> => {
    try {
      const sessionId = req.params.id;
      const participants = await this.service.getSessionParticipants(sessionId);

      res.status(200).json({ participants });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * DELETE /participants/:id
   * Remove a participant
   */
  removeParticipant = async (req: Request, res: Response): Promise<void> => {
    try {
      const participantId = req.params.id;
      await this.service.removeParticipant(participantId);

      res.status(204).send();
    } catch (error) {
      if (error instanceof ParticipantNotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };
}
