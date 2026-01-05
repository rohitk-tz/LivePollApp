import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sessionApi, pollApi } from '../services/api';
import { websocketService } from '../services/websocket';
import type { Session, Poll, PollActivatedEvent, PollClosedEvent, SessionEndedEvent } from '../types';
import PollDisplay from '../components/PollDisplay';
import EmptyState from '../components/EmptyState';
import ErrorDisplay from '../components/ErrorDisplay';

/**
 * Read-only poll display page for participants
 * Shows the currently active poll without voting capability
 * Updates in real-time via WebSocket events
 */
export default function ParticipantPollDisplayPage() {
  const { sessionCode } = useParams<{ sessionCode: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<Session | null>(null);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [activePoll, setActivePoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  const participantId = localStorage.getItem('participantId');

  // Load session and polls
  useEffect(() => {
    if (!sessionCode || !participantId) {
      navigate('/');
      return;
    }

    const loadSessionData = async () => {
      try {
        setLoading(true);
        const sessionData = await sessionApi.getSessionByCode(sessionCode);
        setSession(sessionData);

        // Check if session is ended
        if (sessionData.status === 'ENDED') {
          setError('This session has ended');
          return;
        }

        // Load polls
        const pollsData = await pollApi.getSessionPolls(sessionData.id);
        setPolls(pollsData);

        // Find active poll
        const active = pollsData.find(p => p.isActive);
        setActivePoll(active || null);

        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load session');
      } finally {
        setLoading(false);
      }
    };

    loadSessionData();
  }, [sessionCode, participantId, navigate]);

  // Setup WebSocket connection
  useEffect(() => {
    const setupWebSocket = async () => {
      try {
        if (!session || !participantId) return;

        await websocketService.connect(
          {
            sessionId: session.id,
            actorType: 'attendee',
            actorId: participantId,
          },
          {
            onConnect: () => {
              console.log('WebSocket connected');
              setWsConnected(true);
            },
            onDisconnect: (reason: string) => {
              console.log('WebSocket disconnected:', reason);
              setWsConnected(false);
            },
          }
        );

        // Join session room
        websocketService.joinSessionRoom(session.id);
      } catch (err) {
        console.error('WebSocket connection failed:', err);
        setWsConnected(false);
      }
    };

    setupWebSocket();

    return () => {
      websocketService.disconnect();
    };
  }, [session, participantId]);

  // Handle poll activated event
  const handlePollActivated = useCallback((data: PollActivatedEvent) => {
    console.log('Poll activated:', data);
    
    // Update polls list
    setPolls(prevPolls => {
      // Deactivate all polls
      const updated = prevPolls.map(p => ({
        ...p,
        isActive: p.id === data.pollId,
      }));
      
      // Find and set active poll
      const active = updated.find(p => p.id === data.pollId);
      setActivePoll(active || null);

      return updated;
    });
  }, []);

  // Handle poll closed event
  const handlePollClosed = useCallback((data: PollClosedEvent) => {
    console.log('Poll closed:', data);
    
    setPolls(prevPolls =>
      prevPolls.map(p =>
        p.id === data.pollId
          ? { ...p, isActive: false, closedAt: data.closedAt }
          : p
      )
    );
    
    // Clear active poll if it was closed
    if (activePoll?.id === data.pollId) {
      setActivePoll(null);
    }
  }, [activePoll]);

  // Handle session ended event
  const handleSessionEnded = useCallback((data: SessionEndedEvent) => {
    console.log('Session ended:', data);
    
    setSession(prev => prev ? { ...prev, status: 'ENDED', endedAt: data.endedAt } : null);
    setActivePoll(null);
  }, []);

  // Setup event listeners
  useEffect(() => {
    if (!wsConnected) return;

    websocketService.onPollActivated(handlePollActivated);
    websocketService.onPollClosed(handlePollClosed);
    websocketService.onSessionEnded(handleSessionEnded);

    return () => {
      websocketService.offPollActivated(handlePollActivated);
      websocketService.offPollClosed(handlePollClosed);
      websocketService.offSessionEnded(handleSessionEnded);
    };
  }, [wsConnected, handlePollActivated, handlePollClosed, handleSessionEnded]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading session...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <ErrorDisplay message={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm border-b flex-shrink-0">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{session?.presenterName}'s Poll</h1>
              <p className="text-sm text-gray-600">
                Code: <span className="font-mono font-bold">{sessionCode}</span>
                {wsConnected && <span className="ml-4 text-green-600">● Live</span>}
                {!wsConnected && <span className="ml-4 text-gray-400">○ Connecting...</span>}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">
                Status: <span className={`font-semibold ${
                  session?.status === 'ACTIVE' ? 'text-green-600' :
                  session?.status === 'ENDED' ? 'text-red-600' :
                  'text-gray-600'
                }`}>{session?.status}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Session Status Messages */}
        {session?.status === 'ENDED' && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
            <p className="font-semibold">This session has ended</p>
            <p className="text-sm">Thank you for participating!</p>
          </div>
        )}

        {session?.status === 'PENDING' && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg mb-6">
            <p className="font-semibold">Waiting for session to start...</p>
            <p className="text-sm">The presenter will start the session shortly</p>
          </div>
        )}

        {/* Active Poll Display (Read-Only) */}
        {activePoll && session?.status !== 'ENDED' && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-900">Current Poll</h2>
            </div>
            <PollDisplay poll={activePoll} />
          </div>
        )}

        {/* Empty State: No Active Poll */}
        {!activePoll && session?.status === 'ACTIVE' && polls.length > 0 && (
          <EmptyState
            icon="waiting"
            title="Waiting for next poll"
            message="The presenter will activate a poll shortly"
          />
        )}

        {/* Empty State: No Polls Yet */}
        {polls.length === 0 && session?.status === 'ACTIVE' && (
          <EmptyState
            icon="poll"
            title="No polls yet"
            message="The presenter will create polls shortly"
          />
        )}

        {/* Empty State: Session Ended */}
        {session?.status === 'ENDED' && (
          <EmptyState
            icon="ended"
            title="Session Ended"
            message="This polling session has concluded. Thank you for participating!"
          />
        )}

        {/* Previous Polls List (Optional - shown when no active poll) */}
        {!activePoll && polls.length > 0 && session?.status !== 'ENDED' && (
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Previous Polls</h2>
            <div className="space-y-4">
              {polls.filter(p => !p.isActive).map((poll) => (
                <div key={poll.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 flex-1">{poll.question}</h3>
                    {poll.closedAt && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Closed
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {poll.options.map((option) => (
                      <div key={option.id} className="flex items-center justify-between text-sm text-gray-600">
                        <span>{option.optionText}</span>
                        {option.voteCount !== undefined && (
                          <span className="font-medium">
                            {option.voteCount} {option.voteCount === 1 ? 'vote' : 'votes'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
