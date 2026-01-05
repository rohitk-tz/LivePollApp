// Poll domain types and interfaces
// Based on specs/008-module-boundaries/spec.md - Poll Management Module

export enum PollType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  RATING_SCALE = 'RATING_SCALE',
  OPEN_TEXT = 'OPEN_TEXT'
}

export enum PollStatus {
  Draft = 'Draft',
  Active = 'Active',
  Closed = 'Closed'
}

export interface PollOption {
  id: string;
  pollId: string;
  optionText: string;
  sequenceOrder: number;
}

export interface Poll {
  id: string;
  sessionId: string;
  question: string;
  pollType: PollType;
  status: PollStatus;
  allowMultiple: boolean;
  isAnonymous: boolean;
  minRating: number | null;
  maxRating: number | null;
  sequenceOrder: number;
  createdAt: Date;
  closedAt: Date | null;
  options?: PollOption[];
}

export interface CreatePollInput {
  sessionId: string;
  question: string;
  pollType: PollType;
  allowMultiple?: boolean;
  isAnonymous?: boolean;
  minRating?: number;
  maxRating?: number;
  options?: Array<{
    text: string;
    order?: number;
  }>;
}

export interface PollResults {
  pollId: string;
  question: string;
  pollType: PollType;
  totalVotes: number;
  options: Array<{
    optionId: string;
    text: string;
    voteCount: number;
    percentage: number;
  }>;
  isAnonymous: boolean;
  closedAt: Date | null;
}

export interface PollCreatedEvent {
  pollId: string;
  sessionId: string;
  question: string;
  pollType: PollType;
  createdAt: Date;
}

export interface PollActivatedEvent {
  pollId: string;
  sessionId: string;
  activatedAt: Date;
}

export interface PollClosedEvent {
  pollId: string;
  sessionId: string;
  closedAt: Date;
  totalVotes: number;
}

// Domain errors
export class PollNotFoundError extends Error {
  constructor(pollId: string) {
    super(`Poll not found: ${pollId}`);
    this.name = 'PollNotFoundError';
  }
}

export class InvalidPollStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPollStateError';
  }
}

export class PollValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PollValidationError';
  }
}

export class ActivePollExistsError extends Error {
  constructor(sessionId: string) {
    super(`Another poll is already active in session ${sessionId}`);
    this.name = 'ActivePollExistsError';
  }
}
