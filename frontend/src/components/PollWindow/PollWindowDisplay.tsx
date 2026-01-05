import { PollData, ConnectionStatus } from '../../types/pollWindow';
import { PollBarChart } from './PollBarChart';
import { ConnectionStatusIndicator } from './ConnectionStatusIndicator';

interface PollWindowDisplayProps {
  poll: PollData;
  connectionStatus: ConnectionStatus;
  recentlyUpdatedOptionId?: string | null;
  onRetryConnection?: () => void;
}

export function PollWindowDisplay({ 
  poll, 
  connectionStatus,
  recentlyUpdatedOptionId = null,
  onRetryConnection,
}: PollWindowDisplayProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      {/* Connection Status Indicator */}
      <ConnectionStatusIndicator status={connectionStatus} onRetry={onRetryConnection} />

      {/* Poll Question - Large and prominent for presentation */}
      <div className="mb-8">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight mb-4">
          {poll.question}
        </h1>
        <div className="flex items-center space-x-4 text-xl text-gray-600">
          <span className="px-4 py-2 bg-white rounded-full shadow-sm">
            📊 Total Votes: <span className="font-bold text-gray-900">{poll.totalVotes}</span>
          </span>
          <span className={`px-4 py-2 rounded-full shadow-sm ${
            poll.status === 'active' 
              ? 'bg-green-100 text-green-800' 
              : poll.status === 'closed'
              ? 'bg-gray-300 text-gray-700'
              : 'bg-blue-100 text-blue-800'
          }`}>
            {poll.status === 'active' && '🟢 Active'}
            {poll.status === 'closed' && '🔴 Closed'}
            {poll.status === 'draft' && '📝 Draft'}
          </span>
        </div>
      </div>

      {/* Bar Chart - Main visualization */}
      <div className="bg-white rounded-2xl shadow-2xl p-8">
        <PollBarChart 
          options={poll.options} 
          recentlyUpdatedOptionId={recentlyUpdatedOptionId}
        />
      </div>

      {/* Options Summary Table (for detailed view) */}
      <div className="mt-8 bg-white rounded-2xl shadow-xl p-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Detailed Results</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="text-left py-3 px-4 text-xl font-semibold text-gray-700">Option</th>
                <th className="text-right py-3 px-4 text-xl font-semibold text-gray-700">Votes</th>
                <th className="text-right py-3 px-4 text-xl font-semibold text-gray-700">Percentage</th>
              </tr>
            </thead>
            <tbody>
              {poll.options.map((option, index) => (
                <tr 
                  key={option.id} 
                  className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-6 h-6 rounded-full flex-shrink-0"
                        style={{ 
                          backgroundColor: `${['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'][index % 8]}`
                        }}
                      />
                      <span className="text-2xl text-gray-800 font-medium break-words">
                        {option.text}
                      </span>
                    </div>
                  </td>
                  <td className="text-right py-4 px-4 text-2xl font-bold text-gray-900">
                    {option.voteCount}
                  </td>
                  <td className="text-right py-4 px-4 text-2xl font-bold text-blue-600">
                    {option.percentage.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
