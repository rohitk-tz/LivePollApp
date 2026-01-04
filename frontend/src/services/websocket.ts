import { io, Socket } from 'socket.io-client';
import config from '../config';
import type {
  ConnectionEstablishedEvent,
  SessionStartedEvent,
  SessionEndedEvent,
  SessionPausedEvent,
  SessionResumedEvent,
  PollCreatedEvent,
  PollActivatedEvent,
  PollClosedEvent,
  PollDraftUpdatedEvent,
  VoteAcceptedEvent,
  VoteRejectedEvent,
  ParticipantJoinedEvent,
  ParticipantReconnectedEvent,
  ParticipantLeftEvent,
  ErrorGeneralEvent,
} from '../types';

export interface WebSocketConnectionOptions {
  sessionId: string;
  actorType: 'presenter' | 'attendee' | 'display';
  actorId?: string;
  fromEventId?: string; // For event replay
}

export interface WebSocketCallbacks {
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onReconnect?: (attemptNumber: number) => void;
  onReconnectAttempt?: (attemptNumber: number) => void;
  onReconnectError?: (error: Error) => void;
  onReconnectFailed?: () => void;
  onError?: (error: Error) => void;
}

class WebSocketService {
  private socket: Socket | null = null;
  private connected = false;
  private callbacks: WebSocketCallbacks = {};
  private eventListeners: Map<string, Set<Function>> = new Map();

  /**
   * Connect to WebSocket server with connection options
   */
  connect(options: WebSocketConnectionOptions, callbacks: WebSocketCallbacks = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      this.callbacks = callbacks;

      // Build connection URL with query parameters
      const query: Record<string, string> = {
        sessionId: options.sessionId,
        actorType: options.actorType,
      };

      if (options.actorId) {
        query.actorId = options.actorId;
      }

      if (options.fromEventId) {
        query.fromEventId = options.fromEventId;
      }

      this.socket = io(config.websocket.url, {
        transports: ['websocket', 'polling'],
        reconnection: config.websocket.reconnection,
        reconnectionDelay: config.websocket.reconnectionDelay,
        reconnectionAttempts: config.websocket.reconnectionAttempts,
        query,
      });

      this.socket.on('connect', () => {
        console.log('WebSocket connected');
        this.connected = true;
        this.callbacks.onConnect?.();
        resolve();
      });

      this.socket.on('disconnect', (reason: string) => {
        console.log('WebSocket disconnected:', reason);
        this.connected = false;
        this.callbacks.onDisconnect?.(reason);
      });

      this.socket.on('reconnect', (attemptNumber: number) => {
        console.log('WebSocket reconnected after', attemptNumber, 'attempts');
        this.connected = true;
        this.callbacks.onReconnect?.(attemptNumber);
      });

      this.socket.on('reconnect_attempt', (attemptNumber: number) => {
        console.log('WebSocket reconnection attempt', attemptNumber);
        this.callbacks.onReconnectAttempt?.(attemptNumber);
      });

      this.socket.on('reconnect_error', (error: Error) => {
        console.error('WebSocket reconnection error:', error);
        this.callbacks.onReconnectError?.(error);
      });

      this.socket.on('reconnect_failed', () => {
        console.error('WebSocket reconnection failed');
        this.callbacks.onReconnectFailed?.();
      });

      this.socket.on('connect_error', (error: Error) => {
        console.error('WebSocket connection error:', error);
        this.callbacks.onError?.(error);
        reject(error);
      });

      // Connection events
      this.socket.on('connection:established', (data: ConnectionEstablishedEvent) => {
        console.log('Connection established:', data);
      });

      // Listen to generic 'event' and route based on eventType
      this.socket.on('event', (wrappedEvent: any) => {
        const { eventType, payload } = wrappedEvent;
        console.log(`[WebSocket] Received event: ${eventType}`, payload);
        
        // Call all registered listeners for this event type
        if (eventType && payload) {
          const listeners = this.eventListeners.get(eventType);
          if (listeners) {
            listeners.forEach(callback => {
              try {
                callback(payload);
              } catch (error) {
                console.error(`Error in ${eventType} listener:`, error);
              }
            });
          }
        }
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
    // Clear all event listeners
    this.eventListeners.clear();
  }

  isConnected(): boolean {
    return this.connected;
  }

  // Helper methods for event listener management
  private registerListener(eventType: string, callback: Function): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType)!.add(callback);
  }

  private unregisterListener(eventType: string, callback: Function): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.eventListeners.delete(eventType);
      }
    }
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
    this.registerListener('session:started', callback);
  }

  onSessionEnded(callback: (data: SessionEndedEvent) => void): void {
    this.registerListener('session:ended', callback);
  }

  onSessionPaused(callback: (data: SessionPausedEvent) => void): void {
    this.registerListener('session:paused', callback);
  }

  onSessionResumed(callback: (data: SessionResumedEvent) => void): void {
    this.registerListener('session:resumed', callback);
  }

  onPollCreated(callback: (data: PollCreatedEvent) => void): void {
    this.registerListener('poll:created', callback);
  }

  onPollActivated(callback: (data: PollActivatedEvent) => void): void {
    this.registerListener('poll:activated', callback);
  }

  onPollClosed(callback: (data: PollClosedEvent) => void): void {
    this.registerListener('poll:closed', callback);
  }

  onPollDraftUpdated(callback: (data: PollDraftUpdatedEvent) => void): void {
    this.registerListener('poll:draft_updated', callback);
  }

  onVoteAccepted(callback: (data: VoteAcceptedEvent) => void): void {
    this.registerListener('vote:accepted', callback);
  }

  onVoteRejected(callback: (data: VoteRejectedEvent) => void): void {
    this.registerListener('vote:rejected', callback);
  }

  onResultsUpdated(callback: (data: any) => void): void {
    this.registerListener('results:updated', callback);
  }

  onParticipantJoined(callback: (data: ParticipantJoinedEvent) => void): void {
    this.registerListener('participant:joined', callback);
  }

  onParticipantReconnected(callback: (data: ParticipantReconnectedEvent) => void): void {
    this.registerListener('participant:reconnected', callback);
  }

  onParticipantLeft(callback: (data: ParticipantLeftEvent) => void): void {
    this.registerListener('participant:left', callback);
  }

  onError(callback: (data: ErrorGeneralEvent) => void): void {
    this.registerListener('error:general', callback);
  }

  // Remove event listeners
  offSessionStarted(callback: (data: SessionStartedEvent) => void): void {
    this.unregisterListener('session:started', callback);
  }

  offSessionEnded(callback: (data: SessionEndedEvent) => void): void {
    this.unregisterListener('session:ended', callback);
  }

  offSessionPaused(callback: (data: SessionPausedEvent) => void): void {
    this.unregisterListener('session:paused', callback);
  }

  offSessionResumed(callback: (data: SessionResumedEvent) => void): void {
    this.unregisterListener('session:resumed', callback);
  }

  offPollCreated(callback: (data: PollCreatedEvent) => void): void {
    this.unregisterListener('poll:created', callback);
  }

  offPollActivated(callback: (data: PollActivatedEvent) => void): void {
    this.unregisterListener('poll:activated', callback);
  }

  offPollClosed(callback: (data: PollClosedEvent) => void): void {
    this.unregisterListener('poll:closed', callback);
  }

  offPollDraftUpdated(callback: (data: PollDraftUpdatedEvent) => void): void {
    this.unregisterListener('poll:draft_updated', callback);
  }

  offVoteAccepted(callback: (data: VoteAcceptedEvent) => void): void {
    this.unregisterListener('vote:accepted', callback);
  }

  offVoteRejected(callback: (data: VoteRejectedEvent) => void): void {
    this.unregisterListener('vote:rejected', callback);
  }

  offResultsUpdated(callback: (data: any) => void): void {
    this.unregisterListener('results:updated', callback);
  }

  offParticipantJoined(callback: (data: ParticipantJoinedEvent) => void): void {
    this.unregisterListener('participant:joined', callback);
  }

  offParticipantReconnected(callback: (data: ParticipantReconnectedEvent) => void): void {
    this.unregisterListener('participant:reconnected', callback);
  }

  offParticipantLeft(callback: (data: ParticipantLeftEvent) => void): void {
    this.unregisterListener('participant:left', callback);
  }

  offError(callback: (data: ErrorGeneralEvent) => void): void {
    this.unregisterListener('error:general', callback);
  }
}

export const websocketService = new WebSocketService();
