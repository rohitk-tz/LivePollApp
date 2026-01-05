import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sessionApi, pollApi, voteApi } from '../services/api';
import { websocketService } from '../services/websocket';
import type { Session, Poll, PollActivatedEvent, PollClosedEvent, VoteAcceptedEvent, SessionEndedEvent } from '../types';
import ActivePollsDisplay from '../components/ActivePollsDisplay';
import VotingComponent from '../components/VotingComponent';
import PollResultsVisualization from '../components/PollResultsVisualization';
import ErrorDisplay from '../components/ErrorDisplay';

export default function ParticipantPollViewPage() {
  const { sessionCode } = useParams<{ sessionCode: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<Session | null>(null);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [activePoll, setActivePoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState<Set<string>>(new Set());
  const [wsConnected, setWsConnected] = useState(false);

  const participantId = localStorage.getItem('participantId');
  const displayName = localStorage.getItem('participantName');

  // Load session and polls
  useEffect(() => {
    if (!sessionCode) {
      navigate('/');
      return;
    }

    // If no participantId, redirect to join page with session code pre-filled
    if (!participantId) {
      navigate('/', { state: { sessionCode } });
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

        // Check voting status for all polls
        if (participantId) {
          const votedPollIds = new Set<string>();
          await Promise.all(
            pollsData.map(async (poll) => {
              try {
                const { hasVoted } = await voteApi.hasVoted(poll.id, participantId);
                if (hasVoted) {
                  votedPollIds.add(poll.id);
                }
              } catch (err) {
                console.error(`Failed to check voting status for poll ${poll.id}:`, err);
              }
            })
          );
          setHasVoted(votedPollIds);
        }

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
  const handlePollActivated = useCallback(async (data: PollActivatedEvent) => {
    console.log('[Participant] Poll activated event received:', data);
    console.log('[Participant] Looking for poll with ID:', data.pollId);
    
    // Check if we have this poll locally
    setPolls(prevPolls => {
      const pollExists = prevPolls.some(p => p.id === data.pollId);
      console.log('[Participant] Poll exists locally:', pollExists);
      console.log('[Participant] Current poll IDs:', prevPolls.map(p => p.id));
      
      if (!pollExists) {
        // Poll not found locally, need to fetch updated polls
        console.log('[Participant] Poll not found locally, fetching updated polls...');
        // Trigger a refetch (will be handled below)
        return prevPolls;
      }
      
      // Deactivate all polls and activate the new one
      const updated = prevPolls.map(p => ({
        ...p,
        isActive: p.id === data.pollId,
      }));
      
      // Set active poll
      const active = updated.find(p => p.id === data.pollId);
      console.log('[Participant] New active poll:', active);
      setActivePoll(active || null);

      return updated;
    });
    
    // If poll doesn't exist, fetch updated polls list
    if (session) {
      try {
        const pollsData = await pollApi.getSessionPolls(session.id);
        console.log('[Participant] Fetched updated polls:', pollsData.length);
        setPolls(pollsData);
        
        // Find and set the active poll
        const active = pollsData.find(p => p.id === data.pollId);
        console.log('[Participant] Active poll after fetch:', active);
        setActivePoll(active || null);
      } catch (err) {
        console.error('[Participant] Failed to fetch updated polls:', err);
      }
    }
  }, [session]);

  // Handle poll closed event
  const handlePollClosed = useCallback((data: PollClosedEvent) => {
    setPolls(prevPolls =>
      prevPolls.map(p =>
        p.id === data.pollId
          ? { ...p, isActive: false, closedAt: data.closedAt }
          : p
      )
    );
    
    if (activePoll?.id === data.pollId) {
      setActivePoll(null);
    }
  }, [activePoll]);

  // Handle vote accepted event
  const handleVoteAccepted = useCallback((data: VoteAcceptedEvent) => {
    console.log('[Participant] Vote accepted event received:', data);
    console.log('[Participant] Current participantId:', participantId);
    console.log('[Participant] Event participantId:', data.participantId);
    
    // Update poll vote counts
    if (data.voteBreakdown) {
      setPolls(prevPolls =>
        prevPolls.map(p => {
          if (p.id === data.pollId) {
            return {
              ...p,
              options: p.options.map(opt => {
                const breakdown = data.voteBreakdown?.find(b => b.optionId === opt.id);
                return breakdown
                  ? { ...opt, voteCount: breakdown.voteCount }
                  : opt;
              }),
            };
          }
          return p;
        })
      );

      // Update active poll
      if (activePoll?.id === data.pollId) {
        setActivePoll(prev => {
          if (!prev) return null;
          return {
            ...prev,
            options: prev.options.map(opt => {
              const breakdown = data.voteBreakdown?.find(b => b.optionId === opt.id);
              return breakdown
                ? { ...opt, voteCount: breakdown.voteCount }
                : opt;
            }),
          };
        });
      }
    }

    // Mark as voted if this was our vote
    if (data.participantId === participantId) {
      console.log('[Participant] Marking poll as voted:', data.pollId);
      setHasVoted(prev => {
        const updated = new Set([...prev, data.pollId]);
        console.log('[Participant] Updated hasVoted set:', Array.from(updated));
        return updated;
      });
    } else {
      console.log('[Participant] Not marking as voted - participant ID mismatch');
    }
  }, [activePoll, participantId]);

  // Handle session ended event
  const handleSessionEnded = useCallback((data: SessionEndedEvent) => {
    setSession(prev => prev ? { ...prev, status: 'ENDED', endedAt: data.endedAt } : null);
    setActivePoll(null);
    setError('Session has ended');
  }, []);

  // Setup event listeners
  useEffect(() => {
    if (!wsConnected) return;

    console.log('[Participant] Setting up WebSocket event listeners');
    
    websocketService.onPollActivated(handlePollActivated);
    websocketService.onPollClosed(handlePollClosed);
    websocketService.onVoteAccepted(handleVoteAccepted);
    websocketService.onSessionEnded(handleSessionEnded);

    console.log('[Participant] Event listeners registered');

    return () => {
      console.log('[Participant] Cleaning up WebSocket event listeners');
      websocketService.offPollActivated(handlePollActivated);
      websocketService.offPollClosed(handlePollClosed);
      websocketService.offVoteAccepted(handleVoteAccepted);
      websocketService.offSessionEnded(handleSessionEnded);
    };
  }, [wsConnected, handlePollActivated, handlePollClosed, handleVoteAccepted, handleSessionEnded]);

  // Handle successful vote submission
  const handleVoteSuccess = useCallback((voteId: string, selectedOptionId: string) => {
    console.log('[Participant] Vote submitted successfully:', { voteId, selectedOptionId, activePollId: activePoll?.id });
    
    // Mark poll as voted
    if (activePoll) {
      setHasVoted(prev => {
        const updated = new Set([...prev, activePoll.id]);
        console.log('[Participant] Updated hasVoted set:', Array.from(updated));
        return updated;
      });
    }
  }, [activePoll]);

  // Handle vote submission errors
  const handleVoteError = useCallback((error: any) => {
    console.error('Vote submission failed:', error);
    // Error is already displayed in VotingComponent
  }, []);

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
                  'text-yellow-600'
                }`}>{session?.status}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {session?.status === 'ENDED' && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-6">
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

        {/* Active Poll Section */}
        {activePoll && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Active Poll</h2>
              {console.log('[Participant] Rendering active poll section. hasVoted:', hasVoted.has(activePoll.id), 'pollId:', activePoll.id)}
            </div>

            {hasVoted.has(activePoll.id) ? (
              <>
                {console.log('[Participant] Showing results for poll:', activePoll.id)}
                <PollResultsVisualization poll={activePoll} />
              </>
            ) : (
              <>
                {console.log('[Participant] Showing voting form for poll:', activePoll.id)}
                <VotingComponent
                  poll={activePoll}
                  participantId={participantId!}
                  onVoteSuccess={handleVoteSuccess}
                  onVoteError={handleVoteError}
                />
              </>
            )}
          </div>
        )}

        {/* All Polls Display */}
        {!activePoll && polls.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {session?.status === 'ACTIVE' ? 'Waiting for next poll...' : 'Session Polls'}
            </h2>
            <ActivePollsDisplay polls={polls} hasVoted={hasVoted} />
          </div>
        )}

        {polls.length === 0 && session?.status === 'ACTIVE' && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No polls yet</h3>
            <p className="text-gray-600">The presenter will create polls shortly</p>
          </div>
        )}
      </div>
    </div>
  );
}
