import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { PollOption } from '../../types/pollWindow';
import { CHART_COLOR_PALETTE } from '../../constants/chartColors';
import config from '../../config';

interface PollBarChartProps {
  options: PollOption[];
  recentlyUpdatedOptionId?: string | null;
  animationDuration?: number;
  layout?: 'horizontal' | 'vertical';
  onAnimationComplete?: () => void;
}

export function PollBarChart({ 
  options,
  recentlyUpdatedOptionId = null,
  animationDuration = config.pollWindow.chart.animationDuration,
  layout = config.pollWindow.chart.layout,
}: PollBarChartProps) {
  // Transform options to chart data format
  const chartData = options.map((option, index) => ({
    id: option.id,
    name: option.text,
    votes: option.voteCount,
    percentage: option.percentage,
    color: CHART_COLOR_PALETTE[index % CHART_COLOR_PALETTE.length],
    isRecentlyUpdated: option.id === recentlyUpdatedOptionId,
  }));

  console.log('[PollBarChart] Chart data:', chartData);
  console.log('[PollBarChart] Layout:', layout);
  console.log('[PollBarChart] Vote counts:', chartData.map(d => `${d.name}: ${d.votes}`));

  // Calculate max value for domain (add 10% padding, minimum 10 for visibility)
  const maxVotes = Math.max(...chartData.map(d => d.votes), 1);
  const domainMax = Math.max(Math.ceil(maxVotes * 1.1), 10);
  
  console.log('[PollBarChart] maxVotes:', maxVotes, 'domainMax:', domainMax);

  if (!chartData || chartData.length === 0) {
    return <div className="text-center p-8 text-gray-500">No poll options available</div>;
  }

  // Vertical bar chart (works reliably)
  return (
    <div style={{ width: '100%', height: '500px', backgroundColor: '#fff' }}>
      <BarChart 
        width={1000}
        height={450}
        data={chartData}
        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey="name"
          tick={{ fontSize: 18, fill: '#1F2937', angle: 0 }}
          height={80}
        />
        <YAxis 
          domain={[0, domainMax]}
          tick={{ fontSize: 18, fill: '#4B5563' }}
        />
        <Bar 
          dataKey="votes"
          animationDuration={animationDuration}
          radius={[8, 8, 0, 0]}
        >
          {chartData.map((entry) => (
            <Cell 
              key={`cell-${entry.id}`} 
              fill={entry.color}
            />
          ))}
          <LabelList 
            dataKey="votes" 
            position="top" 
            style={{ 
              fontSize: '24px', 
              fontWeight: 'bold',
              fill: '#1F2937'
            }}
            formatter={(value: number, entry: any, index: number) => {
              const dataPoint = chartData[index];
              return dataPoint ? `${value} (${dataPoint.percentage.toFixed(1)}%)` : value;
            }}
          />
        </Bar>
      </BarChart>
    </div>
  );
}
