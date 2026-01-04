import type { Poll } from '../types';

interface PollDisplayProps {
  poll: Poll;
}

/**
 * Read-only poll display component
 * Shows poll question, options, and state without voting capability
 * Used for display-only views or after voting is complete
 */
export default function PollDisplay({ poll }: PollDisplayProps) {
  return (
    <div className="space-y-4">
      {/* Poll Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">{poll.question}</h3>
          {poll.isAnonymous && (
            <p className="text-sm text-gray-600 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Anonymous poll
            </p>
          )}
        </div>
        
        {/* Poll Status Badge */}
        <div className="ml-4">
          {poll.isActive && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              <span className="w-2 h-2 mr-2 bg-green-500 rounded-full animate-pulse"></span>
              Active
            </span>
          )}
          {poll.closedAt && !poll.isActive && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
              Closed
            </span>
          )}
          {!poll.isActive && !poll.closedAt && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
              Draft
            </span>
          )}
        </div>
      </div>

      {/* Poll Options Display */}
      <div className="space-y-3">
        {poll.options.map((option, index) => (
          <div
            key={option.id}
            className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg bg-white"
          >
            <div className="flex items-center flex-1">
              {/* Option Letter */}
              <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 text-blue-700 font-semibold text-sm mr-3">
                {String.fromCharCode(65 + index)}
              </div>
              
              {/* Option Text */}
              <span className="text-gray-900 font-medium">{option.optionText}</span>
            </div>

            {/* Vote Count (if available) */}
            {option.voteCount !== undefined && (
              <div className="ml-4 text-right">
                <span className="text-lg font-bold text-gray-700">{option.voteCount}</span>
                <span className="text-sm text-gray-500 ml-1">
                  {option.voteCount === 1 ? 'vote' : 'votes'}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Poll Metadata */}
      <div className="pt-4 border-t border-gray-200 text-sm text-gray-600 space-y-1">
        {poll.allowMultiple && (
          <p className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Multiple votes allowed
          </p>
        )}
        {poll.closedAt && (
          <p className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Closed {new Date(poll.closedAt).toLocaleString()}
          </p>
        )}
        {poll.createdAt && (
          <p className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Created {new Date(poll.createdAt).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}
