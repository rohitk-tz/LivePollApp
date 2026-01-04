import { useState } from 'react';
import type { Poll } from '../types';

interface VotingComponentProps {
  poll: Poll;
  onVoteSubmit: (pollId: string, optionId: string) => void;
  participantId: string;
}

export default function VotingComponent({ poll, onVoteSubmit, participantId }: VotingComponentProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedOption) return;

    setSubmitting(true);
    onVoteSubmit(poll.id, selectedOption);
    
    // Reset after a delay
    setTimeout(() => {
      setSubmitting(false);
    }, 1000);
  };

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

      <div className="space-y-3">
        {poll.options.map((option) => (
          <label
            key={option.id}
            className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              selectedOption === option.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
            }`}
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

      <button
        type="submit"
        disabled={!selectedOption || submitting}
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
