// Session controller - REST API handlers
// API contracts per specs/004-api-contracts/spec.md

import { Request, Response, NextFunction } from 'express';
import { SessionService } from './service.js';

export class SessionController {
  constructor(private sessionService: SessionService) {}

  /**
   * POST /sessions - Create new session
   * Request: { presenterName: string }
   * Response: 201 { session: Session, event: SessionCreatedEvent }
   */
  createSession = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { presenterName } = req.body;

      const result = await this.sessionService.createSession({ presenterName });

      res.status(201).json({
        session: result.session,
        event: result.event
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /sessions/:id - Get session by ID
   * Response: 200 { session: Session }
   */
  getSession = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;

      const session = await this.sessionService.getSession(id);

      res.status(200).json({ session });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /sessions/code/:code - Get session by code
   * Response: 200 { session: Session }
   */
  getSessionByCode = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { code } = req.params;

      const session = await this.sessionService.getSessionByCode(code);

      res.status(200).json({ session });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /sessions/:id/start - Start session
   * Response: 200 { session: Session, event: SessionStartedEvent }
   */
  startSession = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;

      const result = await this.sessionService.startSession(id);

      res.status(200).json({
        session: result.session,
        event: result.event
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /sessions/:id/end - End session
   * Response: 200 { session: Session, event: SessionEndedEvent }
   */
  endSession = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;

      const result = await this.sessionService.endSession(id);

      res.status(200).json({
        session: result.session,
        event: result.event
      });
    } catch (error) {
      next(error);
    }
  };
}
