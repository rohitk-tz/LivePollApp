/**
 * useWebSocket hook
 * Manages WebSocket connection lifecycle and event subscriptions
 */

import { useEffect, useRef, useCallback } from 'react';
import { websocketService, type WebSocketConnectionOptions, type WebSocketCallbacks } from '../services/websocket';
import type {
  SessionStartedEvent,
  SessionEndedEvent,
  SessionPausedEvent,
  SessionResumedEvent,
  PollCreatedEvent,
  PollActivatedEvent,
  PollClosedEvent,
  VoteAcceptedEvent,
  VoteRejectedEvent,
  ParticipantJoinedEvent,
} from '../types';

interface WebSocketHookOptions extends WebSocketConnectionOptions {
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onSessionStarted?: (data: SessionStartedEvent) => void;
  onSessionEnded?: (data: SessionEndedEvent) => void;
  onSessionPaused?: (data: SessionPausedEvent) => void;
  onSessionResumed?: (data: SessionResumedEvent) => void;
  onPollCreated?: (data: PollCreatedEvent) => void;
  onPollActivated?: (data: PollActivatedEvent) => void;
  onPollClosed?: (data: PollClosedEvent) => void;
  onVoteAccepted?: (data: VoteAcceptedEvent) => void;
  onVoteRejected?: (data: VoteRejectedEvent) => void;
  onParticipantJoined?: (data: ParticipantJoinedEvent) => void;
}

export function useWebSocket(options: WebSocketHookOptions) {
  const optionsRef = useRef(options);
  
  // Update options ref when options change
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Connect to WebSocket on mount
  useEffect(() => {
    let isConnected = false;

    const connectWebSocket = async () => {
      try {
        const { sessionId, actorType, actorId, fromEventId, onConnect, onDisconnect } = optionsRef.current;
        
        const connectionOptions: WebSocketConnectionOptions = {
          sessionId,
          actorType,
          actorId,
          fromEventId,
        };

        const callbacks: WebSocketCallbacks = {
          onConnect,
          onDisconnect,
        };

        await websocketService.connect(connectionOptions, callbacks);
        isConnected = true;
        console.log('[useWebSocket] Connected to WebSocket');
      } catch (error) {
        console.error('[useWebSocket] Failed to connect:', error);
      }
    };

    connectWebSocket();

    // Cleanup on unmount
    return () => {
      if (isConnected) {
        websocketService.disconnect();
        console.log('[useWebSocket] Disconnected from WebSocket');
      }
    };
  }, []);

  // Setup event listeners
  useEffect(() => {
    const {
      onSessionStarted,
      onSessionEnded,
      onSessionPaused,
      onSessionResumed,
      onPollCreated,
      onPollActivated,
      onPollClosed,
      onVoteAccepted,
      onVoteRejected,
      onParticipantJoined,
    } = optionsRef.current;

    // Register event listeners
    if (onSessionStarted) {
      websocketService.onSessionStarted(onSessionStarted);
    }
    if (onSessionEnded) {
      websocketService.onSessionEnded(onSessionEnded);
    }
    if (onSessionPaused) {
      websocketService.onSessionPaused(onSessionPaused);
    }
    if (onSessionResumed) {
      websocketService.onSessionResumed(onSessionResumed);
    }
    if (onPollCreated) {
      websocketService.onPollCreated(onPollCreated);
    }
    if (onPollActivated) {
      websocketService.onPollActivated(onPollActivated);
    }
    if (onPollClosed) {
      websocketService.onPollClosed(onPollClosed);
    }
    if (onVoteAccepted) {
      websocketService.onVoteAccepted(onVoteAccepted);
    }
    if (onVoteRejected) {
      websocketService.onVoteRejected(onVoteRejected);
    }
    if (onParticipantJoined) {
      websocketService.onParticipantJoined(onParticipantJoined);
    }

    // Cleanup event listeners on unmount
    return () => {
      if (onSessionStarted) {
        websocketService.offSessionStarted(onSessionStarted);
      }
      if (onSessionEnded) {
        websocketService.offSessionEnded(onSessionEnded);
      }
      if (onSessionPaused) {
        websocketService.offSessionPaused(onSessionPaused);
      }
      if (onSessionResumed) {
        websocketService.offSessionResumed(onSessionResumed);
      }
      if (onPollCreated) {
        websocketService.offPollCreated(onPollCreated);
      }
      if (onPollActivated) {
        websocketService.offPollActivated(onPollActivated);
      }
      if (onPollClosed) {
        websocketService.offPollClosed(onPollClosed);
      }
      if (onVoteAccepted) {
        websocketService.offVoteAccepted(onVoteAccepted);
      }
      if (onVoteRejected) {
        websocketService.offVoteRejected(onVoteRejected);
      }
      if (onParticipantJoined) {
        websocketService.offParticipantJoined(onParticipantJoined);
      }
    };
  }, []);

  // Return utility functions
  const joinSessionRoom = useCallback((sessionId: string) => {
    websocketService.joinSessionRoom(sessionId);
  }, []);

  const submitVote = useCallback(
    (pollId: string, participantId: string, optionId: string) => {
      websocketService.submitVote(pollId, participantId, optionId);
    },
    []
  );

  return {
    joinSessionRoom,
    submitVote,
    isConnected: websocketService.isConnected(),
  };
}
