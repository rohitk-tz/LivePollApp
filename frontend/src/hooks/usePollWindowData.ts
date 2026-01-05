import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { PollData, ConnectionStatus, VoteUpdate } from '../types/pollWindow';
import config from '../config';

interface UsePollWindowDataProps {
  pollId: string;
  initialPoll: PollData;
}

interface UsePollWindowDataReturn {
  poll: PollData;
  connectionStatus: ConnectionStatus;
  recentlyUpdatedOptionId: string | null;
  reconnect: () => void;
}

const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY = 1000; // 1 second

/**
 * Custom hook for managing Socket.IO connection and real-time poll updates
 * Handles connection lifecycle, event subscriptions, automatic reconnection
 */
export function usePollWindowData({
  pollId,
  initialPoll,
}: UsePollWindowDataProps): UsePollWindowDataReturn {
  const [poll, setPoll] = useState<PollData>(initialPoll);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [recentlyUpdatedOptionId, setRecentlyUpdatedOptionId] = useState<string | null>(null);
  
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const isUnmountingRef = useRef(false);

  // Extract sessionId from initial poll
  const sessionId = initialPoll.sessionId;

  // Calculate exponential backoff delay
  const getReconnectDelay = useCallback(() => {
    const attempts = reconnectAttemptsRef.current;
    return Math.min(BASE_RECONNECT_DELAY * Math.pow(2, attempts), 16000);
  }, []);

  // Attempt reconnection with exponential backoff
  const attemptReconnect = useCallback(() => {
    if (isUnmountingRef.current) return;
    
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      setConnectionStatus('error');
      return;
    }

    const delay = getReconnectDelay();
    reconnectAttemptsRef.current++;

    reconnectTimeoutRef.current = setTimeout(() => {
      if (!isUnmountingRef.current) {
        // Will reconnect via the ref
        if (reconnectFnRef.current) {
          reconnectFnRef.current();
        }
      }
    }, delay);
  }, [getReconnectDelay]);

  const reconnectFnRef = useRef<(() => void) | null>(null);

  // Recalculate percentages when vote counts change
  const recalculatePercentages = useCallback((options: typeof poll.options) => {
    const totalVotes = options.reduce((sum, opt) => sum + opt.voteCount, 0);
    return options.map(opt => ({
      ...opt,
      percentage: totalVotes > 0 ? (opt.voteCount / totalVotes) * 100 : 0,
    }));
  }, []);

  // Handle vote update events
  const handleVoteUpdate = useCallback((update: VoteUpdate) => {
    setPoll(prevPoll => {
      const updatedOptions = prevPoll.options.map(opt => 
        opt.id === update.optionId
          ? { ...opt, voteCount: update.newVoteCount }
          : opt
      );

      const optionsWithPercentages = recalculatePercentages(updatedOptions);
      const totalVotes = updatedOptions.reduce((sum, opt) => sum + opt.voteCount, 0);

      return {
        ...prevPoll,
        options: optionsWithPercentages,
        totalVotes,
      };
    });

    // Set recently updated option for pulse effect
    setRecentlyUpdatedOptionId(update.optionId);
    setTimeout(() => setRecentlyUpdatedOptionId(null), 300);
  }, [recalculatePercentages]);

  // Handle poll metadata updates
  const handlePollUpdate = useCallback((updatedPoll: Partial<PollData>) => {
    setPoll(prevPoll => ({
      ...prevPoll,
      ...updatedPoll,
    }));
  }, []);

  // Handle poll deletion
  const handlePollDeleted = useCallback(() => {
    setPoll(prevPoll => ({
      ...prevPoll,
      status: 'closed',
    }));
    // Could also show a deletion message in the UI
  }, []);

  // Connect to Socket.IO server
  const connect = useCallback(() => {
    console.log('[usePollWindowData] connect() called, isUnmounting:', isUnmountingRef.current);
    
    if (isUnmountingRef.current) return;

    console.log('[usePollWindowData] Attempting to connect to:', config.websocket.url);
    console.log('[usePollWindowData] Poll ID:', pollId);
    console.log('[usePollWindowData] Session ID:', sessionId);
    setConnectionStatus('connecting');

    try {
      const socket = io(config.websocket.url, {
        transports: ['polling', 'websocket'], // Try polling first, then upgrade to websocket
        reconnection: false, // Manual reconnection with exponential backoff
        timeout: 10000, // 10 second timeout
        forceNew: true, // Force new connection
        query: {
          sessionId: sessionId,
        },
      });

      socketRef.current = socket;
      console.log('[usePollWindowData] Socket instance created');

      // Connection event handlers
      socket.on('connect', () => {
        if (isUnmountingRef.current) return;
        
        console.log('[usePollWindowData] Socket connected successfully');
        console.log('[usePollWindowData] Socket ID:', socket.id);
        
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0; // Reset attempts on successful connection

        // Subscribe to poll-specific events
        console.log('[usePollWindowData] Subscribing to poll:', pollId);
        socket.emit('poll:subscribe', { pollId });
      });

    socket.on('disconnect', (reason) => {
      if (isUnmountingRef.current) return;
      
      setConnectionStatus('disconnected');

      // Attempt reconnection if not a manual disconnect
      if (reason !== 'io client disconnect') {
        attemptReconnect();
      }
    });

    socket.on('connect_error', (error) => {
      if (isUnmountingRef.current) return;
      
      console.error('[usePollWindowData] Socket connection error:', error);
      setConnectionStatus('error');
      attemptReconnect();
    });

    socket.on('connect_timeout', () => {
      if (isUnmountingRef.current) return;
      console.error('[usePollWindowData] Socket connection timeout');
      setConnectionStatus('error');
      attemptReconnect();
    });

    // Poll subscription acknowledgment handlers
    socket.on('poll:subscribe:success', (data) => {
      console.log('[usePollWindowData] Poll subscription successful:', data);
    });

    socket.on('poll:subscribe:error', (data) => {
      console.error('[usePollWindowData] Poll subscription failed:', data);
    });

    // Poll-specific event handlers
    console.log('[usePollWindowData] Registering event handlers for poll:', pollId);
    socket.on(`poll:${pollId}:vote-submitted`, (data) => {
      console.log('[usePollWindowData] Vote submitted event received:', data);
      handleVoteUpdate(data);
    });
    socket.on(`poll:${pollId}:updated`, (data) => {
      console.log('[usePollWindowData] Poll updated event received:', data);
      handlePollUpdate(data);
    });
    socket.on(`poll:${pollId}:deleted`, () => {
      console.log('[usePollWindowData] Poll deleted event received');
      handlePollDeleted();
    });

      return socket;
    } catch (error) {
      console.error('[usePollWindowData] Failed to create socket:', error);
      setConnectionStatus('error');
      return null;
    }
  }, [pollId, handleVoteUpdate, handlePollUpdate, handlePollDeleted]);

  // Store connect function in ref for reconnection
  useEffect(() => {
    reconnectFnRef.current = connect;
  }, [connect]);

  // Manual reconnect function (for retry button)
  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    
    // Clear existing timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Disconnect existing socket
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    connect();
  }, [connect]);

  // Initialize socket connection
  useEffect(() => {
    console.log('[usePollWindowData] useEffect initializing socket connection');
    isUnmountingRef.current = false; // Reset unmounting flag on mount
    connect();

    // Cleanup on unmount
    return () => {
      console.log('[usePollWindowData] useEffect cleanup - component unmounting');
      isUnmountingRef.current = true;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (socketRef.current) {
        socketRef.current.emit('poll:unsubscribe', { pollId });
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [connect, pollId]);

  // Window beforeunload cleanup
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (socketRef.current) {
        socketRef.current.emit('poll:unsubscribe', { pollId });
        socketRef.current.disconnect();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [pollId]);

  return {
    poll,
    connectionStatus,
    recentlyUpdatedOptionId,
    reconnect,
  };
}
