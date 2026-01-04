// Participant domain types and interfaces
// Based on specs/008-module-boundaries/spec.md - Participant Management Module

export interface Participant {
  id: string;
  sessionId: string;
  displayName: string | null;
  joinedAt: Date;
}

export interface JoinSessionInput {
  sessionId: string;
  displayName?: string;
}

export interface ParticipantJoinedEvent {
  participantId: string;
  sessionId: string;
  displayName: string | null;
  joinedAt: Date;
  participantCount: number;
}

// Domain errors
export class ParticipantNotFoundError extends Error {
  constructor(participantId: string) {
    super(`Participant not found: ${participantId}`);
    this.name = 'ParticipantNotFoundError';
  }
}

export class ParticipantValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParticipantValidationError';
  }
}
