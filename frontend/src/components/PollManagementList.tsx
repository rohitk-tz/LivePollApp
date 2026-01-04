import { useState } from 'react';
import { pollApi } from '../services/api';
import { ApiError, isApiError, ApiErrorCode } from '../services/errors';
import type { Poll } from '../types';

interface PollManagementListProps {
  polls: Poll[];
  onPollActivated?: (pollId: string) => void;
  onPollClosed?: (pollId: string) => void;
  onError?: (error: ApiError) => void;
}

export default function PollManagementList({ 
  polls, 
  onPollActivated, 
  onPollClosed, 
  onError 
}: PollManagementListProps) {
  const [activatingPollId, setActivatingPollId] = useState<string | null>(null);
  const [closingPollId, setClosingPollId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleActivatePoll = async (pollId: string) => {
    setActivatingPollId(pollId);
    setError(null);

    try {
      await pollApi.activatePoll(pollId);
      
      if (onPollActivated) {
        onPollActivated(pollId);
      }
    } catch (err) {
      if (isApiError(err)) {
        const apiError = err as ApiError;
        
        switch (apiError.code) {
          case ApiErrorCode.POLL_NOT_FOUND:
            setError('Poll not found. Please refresh the page.');
            break;
          case ApiErrorCode.INVALID_STATE:
            setError('Poll is not in Draft state.');
            break;
          case ApiErrorCode.SESSION_NOT_ACTIVE:
            setError('Session is not active.');
            break;
          case ApiErrorCode.ACTIVE_POLL_EXISTS:
            setError('Another poll is already active. Close it first.');
            break;
          case ApiErrorCode.INSUFFICIENT_OPTIONS:
            setError('Poll must have at least 2 options.');
            break;
          case ApiErrorCode.UNAUTHORIZED:
            setError('You are not authorized to activate this poll.');
            break;
          default:
            setError(apiError.getUserMessage());
        }
        
        if (onError) {
          onError(apiError);
        }
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Failed to activate poll.';
        setError(errorMessage);
      }
    } finally {
      setActivatingPollId(null);
    }
  };

  const handleClosePoll = async (pollId: string) => {
    setClosingPollId(pollId);
    setError(null);

    try {
      await pollApi.closePoll(pollId);
      
      if (onPollClosed) {
        onPollClosed(pollId);
      }
    } catch (err) {
      if (isApiError(err)) {
        const apiError = err as ApiError;
        
        switch (apiError.code) {
          case ApiErrorCode.POLL_NOT_FOUND:
            setError('Poll not found. Please refresh the page.');
            break;
          case ApiErrorCode.INVALID_STATE:
            setError('Poll is not active.');
            break;
          case ApiErrorCode.UNAUTHORIZED:
            setError('You are not authorized to close this poll.');
            break;
          default:
            setError(apiError.getUserMessage());
        }
        
        if (onError) {
          onError(apiError);
        }
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Failed to close poll.';
        setError(errorMessage);
      }
    } finally {
      setClosingPollId(null);
    }
  };

  const getPollStatusBadge = (poll: Poll) => {
    if (poll.isActive) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
          <span className="w-2 h-2 mr-2 bg-green-500 rounded-full animate-pulse"></span>
          Active
        </span>
      );
    }
    if (poll.closedAt) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
          Closed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
        Draft
      </span>
    );
  };

  const getTotalVotes = (poll: Poll): number => {
    return poll.options.reduce((sum, opt) => sum + (opt.voteCount || 0), 0);
  };

  if (polls.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-12 text-center">
        <div className="text-gray-400 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No polls yet</h3>
        <p className="text-gray-600">Create your first poll above to get started</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Poll Management</h2>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-2 border-red-500 text-red-800 px-4 py-3 rounded-lg mb-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-semibold">{error}</span>
          </div>
        </div>
      )}

      {/* Poll List */}
      <div className="space-y-4">
        {polls.map((poll) => (
          <div
            key={poll.id}
            className={`border-2 rounded-lg p-4 ${
              poll.isActive
                ? 'border-green-500 bg-green-50'
                : poll.closedAt
                ? 'border-gray-300 bg-gray-50'
                : 'border-blue-300 bg-blue-50'
            }`}
          >
            {/* Poll Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{poll.question}</h3>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>{poll.options.length} options</span>
                  {(poll.isActive || poll.closedAt) && (
                    <span>{getTotalVotes(poll)} votes</span>
                  )}
                  {poll.closedAt && (
                    <span>Closed {new Date(poll.closedAt).toLocaleString()}</span>
                  )}
                </div>
              </div>
              <div className="ml-4">
                {getPollStatusBadge(poll)}
              </div>
            </div>

            {/* Poll Options with Visual Results */}
            <div className="space-y-2 mb-4">
              {poll.options.map((option, index) => {
                const totalVotes = getTotalVotes(poll);
                const percentage = totalVotes > 0 && option.voteCount 
                  ? ((option.voteCount / totalVotes) * 100).toFixed(0)
                  : 0;
                const showResults = poll.isActive || poll.closedAt;

                return (
                  <div key={option.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center flex-1">
                        <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-white text-gray-700 font-semibold text-xs mr-2">
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span className="text-gray-700 flex-1">{option.optionText}</span>
                      </div>
                      {showResults && (
                        <span className="text-gray-500 font-medium ml-2">
                          {option.voteCount || 0} {option.voteCount === 1 ? 'vote' : 'votes'} ({percentage}%)
                        </span>
                      )}
                    </div>
                    {/* Visual progress bar for active/closed polls */}
                    {showResults && (
                      <div className="w-full bg-gray-200 rounded-full h-2 ml-8">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            poll.isActive ? 'bg-green-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              {/* Activate Button - Only for Draft polls */}
              {!poll.isActive && !poll.closedAt && (
                <button
                  onClick={() => handleActivatePoll(poll.id)}
                  disabled={activatingPollId === poll.id}
                  className="flex items-center px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {activatingPollId === poll.id ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Activating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Activate Poll
                    </>
                  )}
                </button>
              )}

              {/* Close Button - Only for Active polls */}
              {poll.isActive && (
                <button
                  onClick={() => handleClosePoll(poll.id)}
                  disabled={closingPollId === poll.id}
                  className="flex items-center px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {closingPollId === poll.id ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Closing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                      </svg>
                      Close Poll
                    </>
                  )}
                </button>
              )}

              {/* Closed indicator */}
              {poll.closedAt && (
                <span className="text-sm text-gray-600 font-medium">
                  Poll is closed
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
