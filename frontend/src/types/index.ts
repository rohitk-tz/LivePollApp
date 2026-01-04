// Session Types
export interface Session {
  id: string;
  code: string;
  presenterName: string;
  status: 'PENDING' | 'ACTIVE' | 'ENDED';
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
}

// Poll Types
export interface Poll {
  id: string;
  sessionId: string;
  question: string;
  pollType: 'MULTIPLE_CHOICE' | 'RATING_SCALE' | 'OPEN_TEXT';
  allowMultiple: boolean;
  isAnonymous: boolean;
  isActive: boolean;
  options: PollOption[];
  createdAt: string;
  closedAt: string | null;
}

export interface PollOption {
  id: string;
  pollId: string;
  optionText: string;
  sequenceOrder: number;
  voteCount?: number;
}

// Participant Types
export interface Participant {
  id: string;
  sessionId: string;
  displayName: string | null;
  joinedAt: string;
  lastSeenAt: string | null;
}

// Vote Types
export interface Vote {
  id: string;
  pollId: string;
  participantId: string;
  optionId: string;
  votedAt: string;
}

// WebSocket Event Types
export interface ConnectionEstablishedEvent {
  connectionId: string;
  timestamp: string;
  serverVersion: string;
}

export interface SessionStartedEvent {
  sessionId: string;
  status: 'ACTIVE';
  startedAt: string;
  participantCount: number;
}

export interface SessionEndedEvent {
  sessionId: string;
  status: 'ENDED';
  endedAt: string;
  finalParticipantCount: number;
}

export interface PollCreatedEvent {
  pollId: string;
  sessionId: string;
  question: string;
  pollType: 'MULTIPLE_CHOICE' | 'RATING_SCALE' | 'OPEN_TEXT';
  allowMultiple: boolean;
  isAnonymous: boolean;
  options?: PollOption[];
  minRating?: number;
  maxRating?: number;
  sequenceOrder: number;
  createdAt: string;
}

export interface PollActivatedEvent {
  pollId: string;
  sessionId: string;
  question: string;
  activatedAt: string;
}

export interface PollClosedEvent {
  pollId: string;
  sessionId: string;
  closedAt: string;
  finalVoteCount: number;
}

export interface VoteAcceptedEvent {
  voteId: string;
  pollId: string;
  participantId?: string;
  submittedAt: string;
  currentVoteCount: number;
  voteBreakdown?: Array<{
    optionId: string;
    voteCount: number;
    percentage: number;
  }>;
  averageRating?: number;
  ratingDistribution?: Record<string, number>;
}

export interface VoteRejectedEvent {
  pollId: string;
  participantId: string;
  reason: 'POLL_CLOSED' | 'DUPLICATE_VOTE' | 'POLL_NOT_ACTIVE' | 'INVALID_OPTION' | 'INVALID_RATING';
  message: string;
  timestamp: string;
}

export interface ParticipantJoinedEvent {
  participantId: string;
  sessionId: string;
  displayName?: string;
  joinedAt: string;
  participantCount: number;
}

export interface ErrorGeneralEvent {
  errorCode: string;
  message: string;
  timestamp: string;
  requestContext?: {
    eventName: string;
    entityId: string;
  };
}
