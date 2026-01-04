/**
 * useSession hook
 * Manages session state and operations
 */

import { useState, useEffect } from 'react';
import { sessionApi } from '../services/api';
import type { Session } from '../types';

interface UseSessionOptions {
  sessionId?: string;
  sessionCode?: string;
}

interface UseSessionReturn {
  session: Session | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useSession({ sessionId, sessionCode }: UseSessionOptions = {}): UseSessionReturn {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchSession = async () => {
    if (!sessionId && !sessionCode) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let fetchedSession: Session;
      
      if (sessionCode) {
        fetchedSession = await sessionApi.getSessionByCode(sessionCode);
      } else if (sessionId) {
        fetchedSession = await sessionApi.getSession(sessionId);
      } else {
        throw new Error('Either sessionId or sessionCode must be provided');
      }

      setSession(fetchedSession);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch session');
      setError(error);
      console.error('[useSession] Error fetching session:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, [sessionId, sessionCode]);

  return {
    session,
    loading,
    error,
    refetch: fetchSession,
  };
}
