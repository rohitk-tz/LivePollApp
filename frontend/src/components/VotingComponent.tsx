import { useState } from 'react';
import type { Poll } from '../types';
import { voteApi } from '../services/api';
import { ApiError, isApiError, ApiErrorCode } from '../services/errors';

interface VotingComponentProps {
  poll: Poll;
  participantId: string;
  onVoteSuccess?: (voteId: string, selectedOptionId: string) => void;
  onVoteError?: (error: ApiError) => void;
}

export default function VotingComponent({ 
  poll, 
  participantId, 
  onVoteSuccess,
  onVoteError 
}: VotingComponentProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [voteAccepted, setVoteAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedOption || submitting || voteAccepted) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await voteApi.submitVote(poll.id, {
        participantId,
        selectedOptionId: selectedOption,
      });

      // Vote accepted - show success state
      setVoteAccepted(true);
      if (onVoteSuccess) {
        onVoteSuccess(response.voteId, response.selectedOptionId);
      }
    } catch (err) {
      // Handle API errors with specific messages
      if (isApiError(err)) {
        const apiError = err as ApiError;
        
        switch (apiError.code) {
          case ApiErrorCode.DUPLICATE_VOTE:
            setError('You have already voted on this poll.');
            setVoteAccepted(true); // Disable further voting
            break;
          case ApiErrorCode.INVALID_STATE:
            setError('This poll is no longer accepting votes.');
            break;
          case ApiErrorCode.SESSION_NOT_ACTIVE:
            setError('The session is not currently active.');
            break;
          case ApiErrorCode.PARTICIPANT_NOT_JOINED:
            setError('You must join the session to vote.');
            break;
          case ApiErrorCode.INVALID_OPTION:
            setError('The selected option is not valid.');
            break;
          case ApiErrorCode.POLL_NOT_FOUND:
            setError('This poll no longer exists.');
            break;
          default:
            setError(apiError.getUserMessage());
        }
        
        if (onVoteError) {
          onVoteError(apiError);
        }
      } else {
        // Handle unexpected errors
        const errorMessage = err instanceof Error ? err.message : 'Failed to submit vote. Please try again.';
        setError(errorMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // If vote was accepted, show confirmation
  if (voteAccepted) {
    return (
      <div className="space-y-4">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-gray-900 mb-2">{poll.question}</h3>
        </div>

        <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6 text-center">
          <div className="flex justify-center mb-3">
            <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h4 className="text-lg font-bold text-green-900 mb-1">Vote Submitted!</h4>
          <p className="text-green-700">Your vote has been recorded.</p>
        </div>

        {/* Show selected option */}
        <div className="space-y-3">
          {poll.options.map((option) => (
            <div
              key={option.id}
              className={`flex items-center p-4 border-2 rounded-lg ${
                selectedOption === option.id
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              {selectedOption === option.id && (
                <svg className="w-5 h-5 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              <span className={`font-medium ${selectedOption === option.id ? 'text-green-900' : 'text-gray-700'}`}>
                {option.optionText}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-gray-900 mb-2">{poll.question}</h3>
        {poll.isAnonymous && (
          <p className="text-sm text-gray-600">
            <svg className="inline w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Anonymous poll
          </p>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-2 border-red-500 text-red-800 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-semibold">{error}</span>
          </div>
        </div>
      )}

      {/* Poll Options */}
      <div className="space-y-3">
        {poll.options.map((option) => (
          <label
            key={option.id}
            className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              selectedOption === option.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
            } ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input
              type="radio"
              name="pollOption"
              value={option.id}
              checked={selectedOption === option.id}
              onChange={(e) => setSelectedOption(e.target.value)}
              className="w-5 h-5 text-blue-600 focus:ring-blue-500"
              disabled={submitting}
            />
            <span className="ml-3 text-gray-900 font-medium">{option.optionText}</span>
          </label>
        ))}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!selectedOption || submitting || voteAccepted}
        className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Submitting...
          </span>
        ) : (
          'Submit Vote'
        )}
      </button>
    </form>
  );
}
