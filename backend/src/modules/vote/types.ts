// Vote domain types and interfaces
// Based on specs/008-module-boundaries/spec.md - Vote Management Module

export interface Vote {
  id: string;
  pollId: string;
  participantId: string;
  optionId: string | null;
  ratingValue: number | null;
  textResponse: string | null;
  submittedAt: Date;
}

export interface SubmitVoteInput {
  pollId: string;
  participantId: string;
  optionId?: string;
  ratingValue?: number;
  textResponse?: string;
}

export interface VoteAcceptedEvent {
  voteId: string;
  pollId: string;
  participantId: string;
  optionId: string | null;
  submittedAt: Date;
}

export interface VoteRejectedEvent {
  pollId: string;
  participantId: string;
  reason: string;
}

// Domain errors
export class VoteNotFoundError extends Error {
  constructor(voteId: string) {
    super(`Vote not found: ${voteId}`);
    this.name = 'VoteNotFoundError';
  }
}

export class InvalidVoteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidVoteError';
  }
}

export class DuplicateVoteError extends Error {
  constructor(participantId: string, pollId: string) {
    super(`Participant ${participantId} has already voted on poll ${pollId}`);
    this.name = 'DuplicateVoteError';
  }
}

export class PollNotActiveError extends Error {
  constructor(pollId: string) {
    super(`Poll ${pollId} is not active or has been closed`);
    this.name = 'PollNotActiveError';
  }
}
