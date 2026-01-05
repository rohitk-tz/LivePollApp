import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { PollData } from '../types/pollWindow';
import { PollWindowDisplay } from '../components/PollWindow/PollWindowDisplay';
import { usePollWindowData } from '../hooks/usePollWindowData';
import config from '../config';

// Wrapper component for Socket.IO connection (only renders when poll data is loaded)
function LivePollWindow({ pollId, initialPoll }: { pollId: string; initialPoll: PollData }) {
  const {
    poll: livePoll,
    connectionStatus,
    recentlyUpdatedOptionId,
    reconnect,
  } = usePollWindowData({
    pollId,
    initialPoll,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <PollWindowDisplay 
        poll={livePoll} 
        connectionStatus={connectionStatus}
        recentlyUpdatedOptionId={recentlyUpdatedOptionId}
        onRetryConnection={reconnect}
      />
    </div>
  );
}

export function PollWindowPage() {
  const { pollId } = useParams<{ pollId: string }>();
  const [initialPoll, setInitialPoll] = useState<PollData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial poll data before establishing Socket.IO connection
  useEffect(() => {
    if (!pollId) {
      setError('Invalid poll ID');
      setIsLoading(false);
      return;
    }

    const fetchPollData = async () => {
      try {
        console.log('[PollWindow] Fetching poll data for pollId:', pollId);
        const response = await fetch(`${config.websocket.url}/polls/${pollId}`);
        
        console.log('[PollWindow] Response status:', response.status);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Poll not found');
          }
          throw new Error('Failed to fetch poll data');
        }

        const data = await response.json();
        console.log('[PollWindow] Received poll data:', data);
        
        // Validate that we have options array
        if (!data.options || !Array.isArray(data.options)) {
          throw new Error('Invalid poll data: missing options array');
        }
        
        // Calculate percentages for options
        const totalVotes = data.options.reduce((sum: number, opt: any) => sum + (opt.voteCount || 0), 0);
        const optionsWithPercentages = data.options.map((opt: any) => ({
          id: opt.id,
          text: opt.optionText, // Map optionText to text
          voteCount: opt.voteCount || 0,
          percentage: totalVotes > 0 ? ((opt.voteCount || 0) / totalVotes) * 100 : 0,
        }));

        const pollData = {
          id: data.id,
          sessionId: data.sessionId,
          question: data.question,
          status: data.status.toLowerCase(), // Map "Active" to "active"
          options: optionsWithPercentages,
          totalVotes,
          createdAt: data.createdAt,
        };
        
        console.log('[PollWindow] Transformed poll data:', pollData);
        
        setInitialPoll(pollData);
        setIsLoading(false);
      } catch (err) {
        console.error('[PollWindow] Error fetching poll:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
        setIsLoading(false);
      }
    };

    fetchPollData();
  }, [pollId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Loading poll...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
          <p className="text-xl text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.close()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Close Window
          </button>
        </div>
      </div>
    );
  }

  if (!initialPoll || !pollId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-xl text-gray-600">Poll not found</p>
      </div>
    );
  }

  console.log('[PollWindow] Final poll status:', initialPoll.status);

  // For closed or draft polls, show static display without Socket.IO connection
  if (initialPoll.status === 'closed' || initialPoll.status === 'draft') {
    console.log('[PollWindow] Showing static view for non-active poll');
    return (
      <div className="min-h-screen bg-gray-50">
        <PollWindowDisplay 
          poll={initialPoll} 
          connectionStatus="connected"
          recentlyUpdatedOptionId={null}
          onRetryConnection={() => {}}
        />
      </div>
    );
  }

  console.log('[PollWindow] Starting live Socket.IO connection for active poll');
  return <LivePollWindow pollId={pollId} initialPoll={initialPoll} />;
}
