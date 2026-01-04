import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { Poll } from '../types';

interface PollResultsVisualizationProps {
  poll: Poll;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function PollResultsVisualization({ poll }: PollResultsVisualizationProps) {
  const totalVotes = poll.options.reduce((sum, opt) => sum + (opt.voteCount || 0), 0);

  const chartData = poll.options.map((option, index) => ({
    name: option.optionText,
    votes: option.voteCount || 0,
    percentage: totalVotes > 0 ? ((option.voteCount || 0) / totalVotes * 100).toFixed(1) : '0',
    fill: COLORS[index % COLORS.length],
  }));

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-900 mb-2">{poll.question}</h3>
        <p className="text-sm text-gray-600">
          {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'} • Thank you for voting!
        </p>
      </div>

      {/* Bar Chart */}
      <div className="bg-gray-50 rounded-lg p-4">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              angle={-45}
              textAnchor="end"
              height={100}
              interval={0}
            />
            <YAxis label={{ value: 'Votes', angle: -90, position: 'insideLeft' }} />
            <Tooltip 
              formatter={(value: number, _name: string, props: any) => [
                `${value} votes (${props.payload.percentage}%)`,
                'Votes'
              ]}
            />
            <Bar dataKey="votes" radius={[8, 8, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Results Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Option
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Votes
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Percentage
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {poll.options.map((option, index) => {
              const voteCount = option.voteCount || 0;
              const percentage = totalVotes > 0 ? (voteCount / totalVotes * 100).toFixed(1) : '0';
              
              return (
                <tr key={option.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-3"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <div className="text-sm font-medium text-gray-900">{option.optionText}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {voteCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    <div className="flex items-center justify-end">
                      <div className="w-20 bg-gray-200 rounded-full h-2 mr-3">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: COLORS[index % COLORS.length],
                          }}
                        />
                      </div>
                      <span className="font-semibold">{percentage}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
