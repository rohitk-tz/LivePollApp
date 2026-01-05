import type { Poll } from '../types';

interface ActivePollsDisplayProps {
  polls: Poll[];
  hasVoted: Set<string>;
}

export default function ActivePollsDisplay({ polls, hasVoted }: ActivePollsDisplayProps) {
  if (polls.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p>No polls available yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {polls.map((poll) => (
        <div
          key={poll.id}
          className={`border rounded-lg p-4 ${
            poll.isActive
              ? 'border-blue-500 bg-blue-50'
              : poll.closedAt
              ? 'border-gray-300 bg-gray-50'
              : 'border-gray-200'
          }`}
        >
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900 flex-1">{poll.question}</h3>
            <div className="flex items-center space-x-2">
              {poll.isActive && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Active
                </span>
              )}
              {poll.closedAt && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  Closed
                </span>
              )}
              {hasVoted.has(poll.id) && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  ✓ Voted
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {poll.options.map((option) => (
              <div key={option.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{option.optionText}</span>
                {option.voteCount !== undefined && (
                  <span className="text-gray-500 font-medium">
                    {option.voteCount} {option.voteCount === 1 ? 'vote' : 'votes'}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
