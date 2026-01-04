/**
 * usePoll hook
 * Manages poll state and operations
 */

import { useState, useEffect } from 'react';
import { pollApi } from '../services/api';
import type { Poll } from '../types';

interface UsePollOptions {
  pollId?: string;
  sessionId?: string;
}

interface UsePollReturn {
  poll: Poll | null;
  polls: Poll[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function usePoll({ pollId, sessionId }: UsePollOptions = {}): UsePollReturn {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchPoll = async () => {
    if (!pollId && !sessionId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (pollId) {
        const fetchedPoll = await pollApi.getPoll(pollId);
        setPoll(fetchedPoll);
      } else if (sessionId) {
        const fetchedPolls = await pollApi.getSessionPolls(sessionId);
        setPolls(fetchedPolls);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch poll');
      setError(error);
      console.error('[usePoll] Error fetching poll:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPoll();
  }, [pollId, sessionId]);

  return {
    poll,
    polls,
    loading,
    error,
    refetch: fetchPoll,
  };
}
