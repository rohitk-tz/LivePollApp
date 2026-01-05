import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sessionApi, pollApi } from '../services/api';
import { websocketService } from '../services/websocket';
import type { 
  Session, 
  Poll, 
  PollCreatedEvent, 
  PollActivatedEvent, 
  PollClosedEvent,
  SessionEndedEvent,
  ResultsUpdatedEvent
} from '../types';
import PollCreationForm from '../components/PollCreationForm';
import PollManagementList from '../components/PollManagementList';
import ErrorDisplay from '../components/ErrorDisplay';
import Navigation from '../components/Navigation';
import QRCodeDisplay from '../components/QRCodeDisplay';
import SessionDashboard from '../components/SessionDashboard';

/**
 * Presenter Dashboard Page
 * Admin interface for managing polls and sessions
 */
export default function PresenterDashboard() {
  const { sessionCode } = useParams<{ sessionCode: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<Session | null>(null);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  // Retrieve presenter ID from localStorage (in real app, would use auth)
  const presenterId = localStorage.getItem('presenterId') || 'presenter-1';

  // Load session and polls
  useEffect(() => {
    if (!sessionCode) {
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

        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load session');
      } finally {
        setLoading(false);
      }
    };

    loadSessionData();
  }, [sessionCode, navigate]);

  // Setup WebSocket connection
  useEffect(() => {
    const setupWebSocket = async () => {
      try {
        if (!session) return;

        await websocketService.connect(
          {
            sessionId: session.id,
            actorType: 'presenter',
            actorId: presenterId,
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
  }, [session, presenterId]);

  // Handle poll created event
  const handlePollCreated = useCallback((data: PollCreatedEvent) => {
    console.log('Poll created:', data);
    
    // Add new poll to list
    const newPoll: Poll = {
      id: data.pollId,
      sessionId: data.sessionId,
      question: data.question,
      pollType: data.pollType,
      allowMultiple: data.allowMultiple,
      isAnonymous: data.isAnonymous,
      isActive: false,
      options: data.options?.map((opt, index) => ({
        id: opt.id,
        pollId: data.pollId,
        optionText: opt.optionText,
        sequenceOrder: opt.sequenceOrder || index + 1,
        voteCount: 0,
      })) || [],
      createdAt: data.createdAt,
      closedAt: null,
    };
    
    setPolls(prevPolls => [...prevPolls, newPoll]);
  }, []);

  // Handle poll activated event
  const handlePollActivated = useCallback(async (data: PollActivatedEvent) => {
    console.log('Poll activated:', data);
    
    // Fetch all session polls to ensure consistent state
    try {
      if (session) {
        const updatedPolls = await pollApi.getSessionPolls(session.id);
        console.log('Fetched updated polls after activation:', updatedPolls);
        setPolls(updatedPolls);
      }
    } catch (error) {
      console.error('Failed to fetch updated polls:', error);
      // Fallback to simple update
      setPolls(prevPolls =>
        prevPolls.map(p => ({
          ...p,
          isActive: p.id === data.pollId,
          options: p.id === data.pollId && p.options
            ? p.options.map(opt => ({ ...opt, voteCount: opt.voteCount || 0 }))
            : p.options
        }))
      );
    }
  }, [session]);

  // Handle poll closed event
  const handlePollClosed = useCallback(async (data: PollClosedEvent) => {
    console.log('Poll closed:', data);
    
    // Fetch all session polls to ensure consistent state with final vote counts
    try {
      if (session) {
        const updatedPolls = await pollApi.getSessionPolls(session.id);
        console.log('Fetched updated polls after closure:', updatedPolls);
        setPolls(updatedPolls);
      }
    } catch (error) {
      console.error('Failed to fetch updated polls:', error);
      // Fallback to simple update
      setPolls(prevPolls =>
        prevPolls.map(p =>
          p.id === data.pollId
            ? { ...p, isActive: false, closedAt: data.closedAt }
            : p
        )
      );
    }
  }, [session]);

  // Handle results updated event (when votes come in)
  const handleResultsUpdated = useCallback((data: ResultsUpdatedEvent) => {
    console.log('[Presenter] Results updated:', data);
    
    setPolls(prevPolls =>
      prevPolls.map(p => {
        if (p.id === data.pollId && data.results?.options) {
          return {
            ...p,
            options: p.options.map(opt => {
              const updatedOption = data.results.options.find((o: any) => o.id === opt.id);
              return updatedOption ? { ...opt, voteCount: updatedOption.voteCount } : opt;
            })
          };
        }
        return p;
      })
    );
  }, []);

  // Handle vote accepted event (for real-time vote updates)
  const handleVoteAccepted = useCallback((data: any) => {
    console.log('[Presenter] Vote accepted:', data);
    
    // Update poll vote counts with the vote breakdown from the event
    if (data.voteBreakdown) {
      setPolls(prevPolls =>
        prevPolls.map(p => {
          if (p.id === data.pollId) {
            return {
              ...p,
              options: p.options.map(opt => {
                const breakdown = data.voteBreakdown.find((b: any) => b.optionId === opt.id);
                return breakdown ? { ...opt, voteCount: breakdown.voteCount } : opt;
              })
            };
          }
          return p;
        })
      );
    }
  }, []);

  // Handle session ended event
  const handleSessionEnded = useCallback((data: SessionEndedEvent) => {
    console.log('Session ended:', data);
    
    setSession(prev => prev ? { ...prev, status: 'ENDED', endedAt: data.endedAt } : null);
    setError('Session has ended');
  }, []);

  // Setup event listeners
  useEffect(() => {
    if (!wsConnected || !session) return;

    console.log('[Presenter] Setting up WebSocket event listeners');
    
    websocketService.onPollCreated(handlePollCreated);
    websocketService.onPollActivated(handlePollActivated);
    websocketService.onPollClosed(handlePollClosed);
    websocketService.onVoteAccepted(handleVoteAccepted);
    websocketService.onResultsUpdated(handleResultsUpdated);
    websocketService.onSessionEnded(handleSessionEnded);

    return () => {
      websocketService.offPollCreated(handlePollCreated);
      websocketService.offPollActivated(handlePollActivated);
      websocketService.offPollClosed(handlePollClosed);
      websocketService.offVoteAccepted(handleVoteAccepted);
      websocketService.offResultsUpdated(handleResultsUpdated);
      websocketService.offSessionEnded(handleSessionEnded);
    };
  }, [wsConnected, session, handlePollCreated, handlePollActivated, handlePollClosed, handleVoteAccepted, handleResultsUpdated, handleSessionEnded]);

  // Handle poll created callback
  const handlePollCreatedCallback = useCallback((pollId: string) => {
    console.log('Poll created via form:', pollId);
    // Poll will be added to list via WebSocket event
  }, []);

  // Handle poll activated callback
  const handlePollActivatedCallback = useCallback((pollId: string) => {
    console.log('Poll activated:', pollId);
    // Poll state will be updated via WebSocket event
  }, []);

  // Handle poll closed callback
  const handlePollClosedCallback = useCallback((pollId: string) => {
    console.log('Poll closed:', pollId);
    // Poll state will be updated via WebSocket event
  }, []);

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

  if (!session) return null;

  const sessionUrl = `${window.location.origin}/session/${session.code}`;
  const participantCount = 0; // TODO: Track participant count from WebSocket events

  const handleStartSession = async () => {
    try {
      await sessionApi.startSession(session.id);
      setSession({ ...session, status: 'ACTIVE', startedAt: new Date().toISOString() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session');
    }
  };

  const handleEndSession = async () => {
    try {
      await sessionApi.endSession(session.id);
      setSession({ ...session, status: 'ENDED', endedAt: new Date().toISOString() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end session');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation sessionCode={session.code} userRole="presenter" />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6">
            <ErrorDisplay message={error} onRetry={() => setError(null)} />
          </div>
        )}

        {/* WebSocket Status */}
        {!wsConnected && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-6">
            <p className="font-semibold">Connecting to real-time updates...</p>
          </div>
        )}

        {/* Three Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* QR Code Display */}
          <div className="lg:col-span-1">
            <QRCodeDisplay
              sessionCode={session.code}
              sessionUrl={sessionUrl}
              presenterName={session.presenterName}
            />
          </div>

          {/* Session Dashboard */}
          <div className="lg:col-span-2">
            <SessionDashboard
              session={session}
              participantCount={participantCount}
              onStartSession={handleStartSession}
              onEndSession={handleEndSession}
            />
          </div>
        </div>

        {/* Two Column Layout - Polls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Poll Creation */}
          <div>
            {session.status === 'ACTIVE' && (
              <PollCreationForm
                sessionId={session.id}
                onPollCreated={handlePollCreatedCallback}
              />
            )}
            {session.status !== 'ACTIVE' && (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Session Not Active</h3>
                <p className="text-gray-600">Start the session to create polls</p>
              </div>
            )}
          </div>

          {/* Right Column - Poll Management */}
          <div>
            <PollManagementList
              polls={polls}
              onPollActivated={handlePollActivatedCallback}
              onPollClosed={handlePollClosedCallback}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
