// Session service - Business logic layer
// Implements session lifecycle management per specs/008-module-boundaries/spec.md

import { customAlphabet } from 'nanoid';
import { SessionRepository } from './repository.js';
import {
  Session,
  SessionStatus,
  CreateSessionInput,
  SessionCreatedEvent,
  SessionStartedEvent,
  SessionEndedEvent,
  SessionNotFoundError,
  InvalidSessionStateError,
  SessionCodeGenerationError
} from './types.js';

// Generate 6-character alphanumeric codes (uppercase letters and digits)
const generateCode = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 6);

export class SessionService {
  constructor(private repository: SessionRepository) {}

  /**
   * Create a new session with unique code generation
   * Published event: SessionCreated
   */
  async createSession(input: CreateSessionInput): Promise<{
    session: Session;
    event: SessionCreatedEvent;
  }> {
    // Generate unique session code with retry logic
    let code: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      code = generateCode();
      attempts++;
      
      if (attempts >= maxAttempts) {
        throw new SessionCodeGenerationError(
          'Failed to generate unique session code after multiple attempts'
        );
      }
    } while (await this.repository.codeExists(code));

    const session = await this.repository.create(code, input.presenterName);

    const event: SessionCreatedEvent = {
      sessionId: session.id,
      code: session.code,
      presenterName: session.presenterName,
      createdAt: session.createdAt
    };

    return { session, event };
  }

  /**
   * Start a session - transitions from PENDING to ACTIVE
   * Published event: SessionStarted
   */
  async startSession(sessionId: string): Promise<{
    session: Session;
    event: SessionStartedEvent;
  }> {
    const session = await this.repository.findById(sessionId);
    
    if (!session) {
      throw new SessionNotFoundError(sessionId);
    }

    if (session.status !== SessionStatus.PENDING) {
      throw new InvalidSessionStateError(
        `Cannot start session in ${session.status} state. Session must be PENDING.`
      );
    }

    const startedAt = new Date();
    const updatedSession = await this.repository.updateStatus(
      sessionId,
      SessionStatus.ACTIVE,
      startedAt
    );

    const event: SessionStartedEvent = {
      sessionId: updatedSession.id,
      startedAt: updatedSession.startedAt!
    };

    return { session: updatedSession, event };
  }

  /**
   * End a session - transitions from ACTIVE to ENDED
   * Published event: SessionEnded
   */
  async endSession(sessionId: string): Promise<{
    session: Session;
    event: SessionEndedEvent;
  }> {
    const session = await this.repository.findById(sessionId);
    
    if (!session) {
      throw new SessionNotFoundError(sessionId);
    }

    if (session.status !== SessionStatus.ACTIVE) {
      throw new InvalidSessionStateError(
        `Cannot end session in ${session.status} state. Session must be ACTIVE.`
      );
    }

    const endedAt = new Date();
    const updatedSession = await this.repository.updateStatus(
      sessionId,
      SessionStatus.ENDED,
      endedAt
    );

    const event: SessionEndedEvent = {
      sessionId: updatedSession.id,
      endedAt: updatedSession.endedAt!
    };

    return { session: updatedSession, event };
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<Session> {
    const session = await this.repository.findById(sessionId);
    
    if (!session) {
      throw new SessionNotFoundError(sessionId);
    }

    return session;
  }

  /**
   * Get session by code
   */
  async getSessionByCode(code: string): Promise<Session> {
    const session = await this.repository.findByCode(code);
    
    if (!session) {
      throw new SessionNotFoundError(code);
    }

    return session;
  }
}
