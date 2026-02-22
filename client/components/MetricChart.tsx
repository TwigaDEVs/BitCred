'use client';

import { ScoreMetrics } from '@/types/index';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';

interface MetricsChartProps {
  metrics: ScoreMetrics;
}

export function MetricsChart({ metrics }: MetricsChartProps) {
  const data = [
    {
      metric: 'Hodl Duration',
      value: metrics.hodl * 100,
      fullMark: 100,
    },
    {
      metric: 'Tx Frequency',
      value: metrics.frequency * 100,
      fullMark: 100,
    },
    {
      metric: 'Balance Stability',
      value: metrics.stability * 100,
      fullMark: 100,
    },
  ];

  return (
    <div className="glass p-6 rounded-xl">
      <h3 className="text-lg font-semibold mb-4">Behavioral Analysis</h3>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data}>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis 
            dataKey="metric" 
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
          />
          <PolarRadiusAxis 
            angle={90} 
            domain={[0, 100]}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
          />
          <Radar
            name="Score"
            dataKey="value"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.5}
          />
        </RadarChart>
      </ResponsiveContainer>
      
      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-yellow-500">
            {(metrics.hodl * 100).toFixed(0)}%
          </div>
          <div className="text-xs text-muted-foreground">Hodl</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-blue-500">
            {(metrics.frequency * 100).toFixed(0)}%
          </div>
          <div className="text-xs text-muted-foreground">Frequency</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-green-500">
            {(metrics.stability * 100).toFixed(0)}%
          </div>
          <div className="text-xs text-muted-foreground">Stability</div>
        </div>
      </div>
    </div>
  );
}