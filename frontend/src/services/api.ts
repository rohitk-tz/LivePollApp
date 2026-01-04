import type { Session, Poll, Participant } from '../types';

const API_BASE_URL = '/api';

// Session API
export const sessionApi = {
  async getSessionByCode(code: string): Promise<Session> {
    const response = await fetch(`${API_BASE_URL}/sessions/code/${code}`);
    if (!response.ok) {
      throw new Error(`Failed to get session: ${response.statusText}`);
    }
    const data = await response.json();
    return data.session;
  },

  async getSession(id: string): Promise<Session> {
    const response = await fetch(`${API_BASE_URL}/sessions/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to get session: ${response.statusText}`);
    }
    const data = await response.json();
    return data.session;
  },
};

// Poll API
export const pollApi = {
  async getPoll(pollId: string): Promise<Poll> {
    const response = await fetch(`${API_BASE_URL}/polls/${pollId}`);
    if (!response.ok) {
      throw new Error(`Failed to get poll: ${response.statusText}`);
    }
    const data = await response.json();
    return data.poll;
  },

  async getSessionPolls(sessionId: string): Promise<Poll[]> {
    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/polls`);
    if (!response.ok) {
      throw new Error(`Failed to get polls: ${response.statusText}`);
    }
    const data = await response.json();
    return data.polls;
  },
};

// Participant API
export const participantApi = {
  async joinSession(sessionId: string, displayName?: string): Promise<Participant> {
    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/participants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ displayName }),
    });
    if (!response.ok) {
      throw new Error(`Failed to join session: ${response.statusText}`);
    }
    const data = await response.json();
    return data.participant;
  },

  async joinSessionByCode(code: string, displayName?: string): Promise<{ participant: Participant; session: Session }> {
    // First get session by code
    const session = await sessionApi.getSessionByCode(code);
    // Then join the session
    const participant = await this.joinSession(session.id, displayName);
    return { participant, session };
  },
};

// Vote API (using WebSocket, but keeping REST fallback)
export const voteApi = {
  async submitVote(pollId: string, participantId: string, optionId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/polls/${pollId}/votes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ participantId, optionId }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to submit vote: ${response.statusText}`);
    }
  },
};
