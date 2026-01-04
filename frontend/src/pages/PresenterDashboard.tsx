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
  SessionEndedEvent 
} from '../types';
import PollCreationForm from '../components/PollCreationForm';
import PollManagementList from '../components/PollManagementList';
import ErrorDisplay from '../components/ErrorDisplay';

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
  const handlePollActivated = useCallback((data: PollActivatedEvent) => {
    console.log('Poll activated:', data);
    
    setPolls(prevPolls =>
      prevPolls.map(p => ({
        ...p,
        isActive: p.id === data.pollId,
      }))
    );
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
  }, []);

  // Handle session ended event
  const handleSessionEnded = useCallback((data: SessionEndedEvent) => {
    console.log('Session ended:', data);
    
    setSession(prev => prev ? { ...prev, status: 'ENDED', endedAt: data.endedAt } : null);
    setError('Session has ended');
  }, []);

  // Setup event listeners
  useEffect(() => {
    if (!wsConnected) return;

    websocketService.onPollCreated(handlePollCreated);
    websocketService.onPollActivated(handlePollActivated);
    websocketService.onPollClosed(handlePollClosed);
    websocketService.onSessionEnded(handleSessionEnded);

    return () => {
      websocketService.offPollCreated(handlePollCreated);
      websocketService.offPollActivated(handlePollActivated);
      websocketService.offPollClosed(handlePollClosed);
      websocketService.offSessionEnded(handleSessionEnded);
    };
  }, [wsConnected, handlePollCreated, handlePollActivated, handlePollClosed, handleSessionEnded]);

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Presenter Dashboard</h1>
              <p className="text-sm text-gray-600">
                Session Code: <span className="font-mono font-bold text-lg">{sessionCode}</span>
                {wsConnected && <span className="ml-4 text-green-600">● Live</span>}
                {!wsConnected && <span className="ml-4 text-gray-400">○ Connecting...</span>}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">
                Status: <span className={`font-semibold ${
                  session?.status === 'ACTIVE' ? 'text-green-600' :
                  session?.status === 'ENDED' ? 'text-red-600' :
                  'text-yellow-600'
                }`}>{session?.status}</span>
              </p>
              <p className="text-sm text-gray-600">
                Presenter: <span className="font-semibold">{session?.presenterName}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Session Status Messages */}
        {session?.status === 'ENDED' && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
            <p className="font-semibold">This session has ended</p>
            <p className="text-sm">No further polls can be created or activated</p>
          </div>
        )}

        {session?.status === 'PENDING' && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-6">
            <p className="font-semibold">Session is not started yet</p>
            <p className="text-sm">Start the session to begin creating and activating polls</p>
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Poll Creation */}
          <div>
            {session && session.status === 'ACTIVE' && (
              <PollCreationForm
                sessionId={session.id}
                onPollCreated={handlePollCreatedCallback}
              />
            )}
            {session && session.status !== 'ACTIVE' && (
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
