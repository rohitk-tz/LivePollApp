// Session domain types and interfaces
// Based on specs/008-module-boundaries/spec.md - Session Management Module

export enum SessionStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  ENDED = 'ENDED'
}

export interface Session {
  id: string;
  code: string;
  presenterName: string;
  status: SessionStatus;
  createdAt: Date;
  startedAt: Date | null;
  endedAt: Date | null;
}

export interface CreateSessionInput {
  presenterName: string;
}

export interface SessionCreatedEvent {
  sessionId: string;
  code: string;
  presenterName: string;
  createdAt: Date;
}

export interface SessionStartedEvent {
  sessionId: string;
  startedAt: Date;
}

export interface SessionEndedEvent {
  sessionId: string;
  endedAt: Date;
}

// Domain errors
export class SessionNotFoundError extends Error {
  constructor(sessionId: string) {
    super(`Session not found: ${sessionId}`);
    this.name = 'SessionNotFoundError';
  }
}

export class InvalidSessionStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidSessionStateError';
  }
}

export class SessionCodeGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionCodeGenerationError';
  }
}
