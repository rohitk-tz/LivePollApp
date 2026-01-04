import { io, Socket } from 'socket.io-client';
import type {
  ConnectionEstablishedEvent,
  SessionStartedEvent,
  SessionEndedEvent,
  PollCreatedEvent,
  PollActivatedEvent,
  PollClosedEvent,
  VoteAcceptedEvent,
  VoteRejectedEvent,
  ParticipantJoinedEvent,
  ErrorGeneralEvent,
} from '../types';

class WebSocketService {
  private socket: Socket | null = null;
  private connected = false;

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io('http://localhost:3000', {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      this.socket.on('connect', () => {
        console.log('WebSocket connected');
        this.connected = true;
        resolve();
      });

      this.socket.on('disconnect', () => {
        console.log('WebSocket disconnected');
        this.connected = false;
      });

      this.socket.on('connect_error', (error: Error) => {
        console.error('WebSocket connection error:', error);
        reject(error);
      });

      // Connection events
      this.socket.on('connection:established', (data: ConnectionEstablishedEvent) => {
        console.log('Connection established:', data);
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  // Join session room
  joinSessionRoom(sessionId: string): void {
    if (this.socket) {
      this.socket.emit('join:session', { sessionId });
    }
  }

  // Submit vote via WebSocket
  submitVote(pollId: string, participantId: string, optionId: string): void {
    if (this.socket) {
      this.socket.emit('vote:submitted', {
        pollId,
        participantId,
        voteData: { selectedOptionIds: [optionId] },
        submittedAt: new Date().toISOString(),
      });
    }
  }

  // Event listeners
  onSessionStarted(callback: (data: SessionStartedEvent) => void): void {
    if (this.socket) {
      this.socket.on('session:started', callback);
    }
  }

  onSessionEnded(callback: (data: SessionEndedEvent) => void): void {
    if (this.socket) {
      this.socket.on('session:ended', callback);
    }
  }

  onPollCreated(callback: (data: PollCreatedEvent) => void): void {
    if (this.socket) {
      this.socket.on('poll:created', callback);
    }
  }

  onPollActivated(callback: (data: PollActivatedEvent) => void): void {
    if (this.socket) {
      this.socket.on('poll:activated', callback);
    }
  }

  onPollClosed(callback: (data: PollClosedEvent) => void): void {
    if (this.socket) {
      this.socket.on('poll:closed', callback);
    }
  }

  onVoteAccepted(callback: (data: VoteAcceptedEvent) => void): void {
    if (this.socket) {
      this.socket.on('vote:accepted', callback);
    }
  }

  onVoteRejected(callback: (data: VoteRejectedEvent) => void): void {
    if (this.socket) {
      this.socket.on('vote:rejected', callback);
    }
  }

  onParticipantJoined(callback: (data: ParticipantJoinedEvent) => void): void {
    if (this.socket) {
      this.socket.on('participant:joined', callback);
    }
  }

  onError(callback: (data: ErrorGeneralEvent) => void): void {
    if (this.socket) {
      this.socket.on('error:general', callback);
    }
  }

  // Remove event listeners
  offSessionStarted(callback: (data: SessionStartedEvent) => void): void {
    if (this.socket) {
      this.socket.off('session:started', callback);
    }
  }

  offSessionEnded(callback: (data: SessionEndedEvent) => void): void {
    if (this.socket) {
      this.socket.off('session:ended', callback);
    }
  }

  offPollCreated(callback: (data: PollCreatedEvent) => void): void {
    if (this.socket) {
      this.socket.off('poll:created', callback);
    }
  }

  offPollActivated(callback: (data: PollActivatedEvent) => void): void {
    if (this.socket) {
      this.socket.off('poll:activated', callback);
    }
  }

  offPollClosed(callback: (data: PollClosedEvent) => void): void {
    if (this.socket) {
      this.socket.off('poll:closed', callback);
    }
  }

  offVoteAccepted(callback: (data: VoteAcceptedEvent) => void): void {
    if (this.socket) {
      this.socket.off('vote:accepted', callback);
    }
  }

  offVoteRejected(callback: (data: VoteRejectedEvent) => void): void {
    if (this.socket) {
      this.socket.off('vote:rejected', callback);
    }
  }

  offParticipantJoined(callback: (data: ParticipantJoinedEvent) => void): void {
    if (this.socket) {
      this.socket.off('participant:joined', callback);
    }
  }

  offError(callback: (data: ErrorGeneralEvent) => void): void {
    if (this.socket) {
      this.socket.off('error:general', callback);
    }
  }
}

export const websocketService = new WebSocketService();
