import type {
  Session,
  Poll,
  Participant,
  CreateSessionRequest,
  CreateSessionResponse,
  StartSessionResponse,
  PauseSessionResponse,
  ResumeSessionResponse,
  EndSessionResponse,
  JoinSessionRequest,
  JoinSessionResponse,
  CreatePollRequest,
  CreatePollResponse,
  UpdatePollDraftRequest,
  UpdatePollDraftResponse,
  ActivatePollResponse,
  ClosePollResponse,
  SubmitVoteRequest,
  SubmitVoteResponse,
  ReconnectToSessionRequest,
  ReconnectToSessionResponse,
  LeaveSessionRequest,
  LeaveSessionResponse,
} from '../types';
import config from '../config';
import { parseApiError } from './errors';

const API_BASE_URL = config.api.baseUrl;

/**
 * Helper function to handle fetch requests with error parsing
 */
async function fetchWithErrorHandling<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, options);
  
  // Check for API errors
  const apiError = await parseApiError(response);
  if (apiError) {
    throw apiError;
  }
  
  // Parse successful response
  return await response.json();
}

// Session API
export const sessionApi = {
  /**
   * Create a new session
   * POST /sessions
   */
  async createSession(request: CreateSessionRequest = {}): Promise<CreateSessionResponse> {
    return fetchWithErrorHandling<CreateSessionResponse>(
      `${API_BASE_URL}/sessions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      }
    );
  },

  /**
   * Start a session (transition from Preparing to Active)
   * POST /sessions/{sessionId}/start
   */
  async startSession(sessionId: string): Promise<StartSessionResponse> {
    return fetchWithErrorHandling<StartSessionResponse>(
      `${API_BASE_URL}/sessions/${sessionId}/start`,
      {
        method: 'POST',
      }
    );
  },

  /**
   * Pause an active session
   * POST /sessions/{sessionId}/pause
   */
  async pauseSession(sessionId: string): Promise<PauseSessionResponse> {
    return fetchWithErrorHandling<PauseSessionResponse>(
      `${API_BASE_URL}/sessions/${sessionId}/pause`,
      {
        method: 'POST',
      }
    );
  },

  /**
   * Resume a paused session
   * POST /sessions/{sessionId}/resume
   */
  async resumeSession(sessionId: string): Promise<ResumeSessionResponse> {
    return fetchWithErrorHandling<ResumeSessionResponse>(
      `${API_BASE_URL}/sessions/${sessionId}/resume`,
      {
        method: 'POST',
      }
    );
  },

  /**
   * End a session permanently
   * POST /sessions/{sessionId}/end
   */
  async endSession(sessionId: string): Promise<EndSessionResponse> {
    return fetchWithErrorHandling<EndSessionResponse>(
      `${API_BASE_URL}/sessions/${sessionId}/end`,
      {
        method: 'POST',
      }
    );
  },

  /**
   * Join a session with access code
   * POST /sessions/{sessionId}/join
   */
  async joinSession(sessionId: string, request: JoinSessionRequest): Promise<JoinSessionResponse> {
    return fetchWithErrorHandling<JoinSessionResponse>(
      `${API_BASE_URL}/sessions/${sessionId}/join`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      }
    );
  },

  /**
   * Get session by code (query endpoint)
   */
  async getSessionByCode(code: string): Promise<Session> {
    const response = await fetchWithErrorHandling<{ session: Session }>(
      `${API_BASE_URL}/sessions/code/${code}`
    );
    return response.session;
  },

  /**
   * Get session by ID (query endpoint)
   */
  async getSession(id: string): Promise<Session> {
    const response = await fetchWithErrorHandling<{ session: Session }>(
      `${API_BASE_URL}/sessions/${id}`
    );
    return response.session;
  },
};

// Poll API
export const pollApi = {
  /**
   * Create a new poll in a session
   * POST /sessions/{sessionId}/polls
   */
  async createPoll(sessionId: string, request: CreatePollRequest): Promise<CreatePollResponse> {
    return fetchWithErrorHandling<CreatePollResponse>(
      `${API_BASE_URL}/sessions/${sessionId}/polls`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      }
    );
  },

  /**
   * Update a poll draft
   * PATCH /polls/{pollId}
   */
  async updatePollDraft(pollId: string, request: UpdatePollDraftRequest): Promise<UpdatePollDraftResponse> {
    return fetchWithErrorHandling<UpdatePollDraftResponse>(
      `${API_BASE_URL}/polls/${pollId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      }
    );
  },

  /**
   * Activate a poll (transition from Draft to Active)
   * POST /polls/{pollId}/activate
   */
  async activatePoll(pollId: string): Promise<ActivatePollResponse> {
    return fetchWithErrorHandling<ActivatePollResponse>(
      `${API_BASE_URL}/polls/${pollId}/activate`,
      {
        method: 'POST',
      }
    );
  },

  /**
   * Close an active poll
   * POST /polls/{pollId}/close
   */
  async closePoll(pollId: string): Promise<ClosePollResponse> {
    return fetchWithErrorHandling<ClosePollResponse>(
      `${API_BASE_URL}/polls/${pollId}/close`,
      {
        method: 'POST',
      }
    );
  },

  /**
   * Get poll by ID (query endpoint)
   */
  async getPoll(pollId: string): Promise<Poll> {
    const response = await fetchWithErrorHandling<{ poll: Poll }>(
      `${API_BASE_URL}/polls/${pollId}`
    );
    return response.poll;
  },

  /**
   * Get all polls for a session (query endpoint)
   */
  async getSessionPolls(sessionId: string): Promise<Poll[]> {
    const response = await fetchWithErrorHandling<{ polls: Poll[] }>(
      `${API_BASE_URL}/sessions/${sessionId}/polls`
    );
    return response.polls;
  },
};

// Participant API
export const participantApi = {
  /**
   * Join session by session ID (using the joinSession endpoint)
   * This is a wrapper for backward compatibility
   */
  async joinSession(sessionId: string, displayName?: string): Promise<Participant> {
    // Note: This endpoint structure may differ from REST contracts
    // Keeping for backward compatibility with existing code
    const response = await fetchWithErrorHandling<{ participant: Participant }>(
      `${API_BASE_URL}/sessions/${sessionId}/participants`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName }),
      }
    );
    return response.participant;
  },

  /**
   * Join session by code (convenience method)
   */
  async joinSessionByCode(code: string, displayName?: string): Promise<{ participant: Participant; session: Session }> {
    // First get session by code
    const session = await sessionApi.getSessionByCode(code);
    // Then join the session
    const participant = await this.joinSession(session.id, displayName);
    return { participant, session };
  },

  /**
   * Reconnect to a session after disconnection
   * POST /sessions/{sessionId}/reconnect
   */
  async reconnectToSession(sessionId: string, request: ReconnectToSessionRequest): Promise<ReconnectToSessionResponse> {
    return fetchWithErrorHandling<ReconnectToSessionResponse>(
      `${API_BASE_URL}/sessions/${sessionId}/reconnect`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      }
    );
  },

  /**
   * Leave a session
   * POST /sessions/{sessionId}/leave
   */
  async leaveSession(sessionId: string, request: LeaveSessionRequest): Promise<LeaveSessionResponse> {
    return fetchWithErrorHandling<LeaveSessionResponse>(
      `${API_BASE_URL}/sessions/${sessionId}/leave`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      }
    );
  },
};

// Vote API (using WebSocket, but keeping REST fallback)
export const voteApi = {
  /**
   * Submit a vote via REST (fallback)
   * POST /polls/{pollId}/votes
   */
  async submitVote(pollId: string, request: SubmitVoteRequest): Promise<SubmitVoteResponse> {
    return fetchWithErrorHandling<SubmitVoteResponse>(
      `${API_BASE_URL}/polls/${pollId}/votes`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      }
    );
  },

  /**
   * Check if a participant has already voted on a poll
   * GET /polls/{pollId}/participants/{participantId}/voted
   */
  async hasVoted(pollId: string, participantId: string): Promise<{ hasVoted: boolean }> {
    return fetchWithErrorHandling<{ hasVoted: boolean }>(
      `${API_BASE_URL}/polls/${pollId}/participants/${participantId}/voted`
    );
  },
};
