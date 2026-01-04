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

export interface SessionPausedEvent {
  sessionId: string;
  state: 'Paused';
  pausedAt: string;
}

export interface SessionResumedEvent {
  sessionId: string;
  state: 'Active';
  resumedAt: string;
}

export interface PollDraftUpdatedEvent {
  pollId: string;
  state: 'Draft';
  question: string;
  options: PollOption[];
  updatedAt: string;
}

export interface ParticipantReconnectedEvent {
  participantId: string;
  sessionId: string;
  connectionState: 'Connected';
  reconnectedAt: string;
}

export interface ParticipantLeftEvent {
  participantId: string;
  sessionId: string;
  connectionState: 'Left';
  leftAt: string;
}

// API Request Types
export interface CreateSessionRequest {
  title?: string;
  description?: string;
}

export interface CreateSessionResponse {
  sessionId: string;
  accessCode: string;
  state: 'Preparing';
  title: string | null;
  description: string | null;
  createdAt: string;
}

export interface StartSessionResponse {
  sessionId: string;
  state: 'Active';
  startedAt: string;
}

export interface PauseSessionResponse {
  sessionId: string;
  state: 'Paused';
  pausedAt: string;
}

export interface ResumeSessionResponse {
  sessionId: string;
  state: 'Active';
  resumedAt: string;
}

export interface EndSessionResponse {
  sessionId: string;
  state: 'Ended';
  endedAt: string;
  pollCount: number;
  participantCount: number;
  totalVotes: number;
}

export interface JoinSessionRequest {
  accessCode: string;
}

export interface JoinSessionResponse {
  sessionId: string;
  participantId: string;
  connectionState: 'Connected';
  joinedAt: string;
}

export interface CreatePollRequest {
  question: string;
  options: Array<{
    text: string;
    order?: number;
  }>;
}

export interface CreatePollResponse {
  pollId: string;
  sessionId: string;
  state: 'Draft';
  question: string;
  options: Array<{
    optionId: string;
    text: string;
    order: number;
  }>;
  createdAt: string;
}

export interface UpdatePollDraftRequest {
  question?: string;
  options?: Array<{
    optionId?: string;
    text: string;
    order?: number;
  }>;
}

export interface UpdatePollDraftResponse {
  pollId: string;
  state: 'Draft';
  question: string;
  options: Array<{
    optionId: string;
    text: string;
    order: number;
  }>;
  updatedAt: string;
}

export interface ActivatePollResponse {
  pollId: string;
  sessionId: string;
  state: 'Active';
  question: string;
  options: Array<{
    optionId: string;
    text: string;
    voteCount: number;
  }>;
  activatedAt: string;
}

export interface ClosePollResponse {
  pollId: string;
  state: 'Closed';
  question: string;
  options: Array<{
    optionId: string;
    text: string;
    voteCount: number;
  }>;
  totalVotes: number;
  closedAt: string;
}

export interface SubmitVoteRequest {
  participantId: string;
  selectedOptionId: string;
}

export interface SubmitVoteResponse {
  voteId: string;
  pollId: string;
  participantId: string;
  selectedOptionId: string;
  status: 'Accepted';
  submittedAt: string;
}

export interface ReconnectToSessionRequest {
  participantId: string;
}

export interface ReconnectToSessionResponse {
  participantId: string;
  sessionId: string;
  connectionState: 'Connected';
  reconnectedAt: string;
}

export interface LeaveSessionRequest {
  participantId: string;
}

export interface LeaveSessionResponse {
  participantId: string;
  sessionId: string;
  connectionState: 'Left';
  leftAt: string;
}
