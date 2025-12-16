import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ActivityLog, TimeRange } from '../types';
import { format, subDays, subMonths, subYears, isAfter, startOfDay } from 'date-fns';

interface StatsViewProps {
  logs: ActivityLog[];
}

const COLORS = ['#6366f1', '#e2e8f0']; // Indigo 500, Slate 200

const StatsView: React.FC<StatsViewProps> = ({ logs }) => {
  const [range, setRange] = useState<TimeRange>(TimeRange.ALL_TIME);

  const stats = useMemo(() => {
    const now = new Date();
    let startDate: Date | null = null;

    switch (range) {
      case TimeRange.DAY:
        startDate = startOfDay(now);
        break;
      case TimeRange.MONTH:
        startDate = subMonths(now, 1);
        break;
      case TimeRange.THREE_MONTHS:
        startDate = subMonths(now, 3);
        break;
      case TimeRange.SIX_MONTHS:
        startDate = subMonths(now, 6);
        break;
      case TimeRange.YEAR:
        startDate = subYears(now, 1);
        break;
      case TimeRange.ALL_TIME:
      default:
        startDate = null;
    }

    // Filter logs based on date and exclude summary logs
    const filteredLogs = logs.filter(log => {
      if (log.isSummary || log.activityId === 'SUMMARY') return false;
      if (!startDate) return true;
      return isAfter(new Date(log.timestamp), startDate);
    });

    const completed = filteredLogs.filter(l => l.completed).length;
    const total = filteredLogs.length;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

    return { completed, total, percentage };
  }, [logs, range]);

  const data = [
    { name: 'Completed', value: stats.completed },
    { name: 'Missed', value: stats.total - stats.completed },
  ];

  // If no data, show a placeholder
  const hasData = stats.total > 0;

  return (
    <div className="flex flex-col space-y-6 w-full animate-fade-in">
      <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2">
        {Object.values(TimeRange).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              range === r
                ? 'bg-primary text-white shadow-md'
                : 'bg-white text-slate-500 hover:bg-slate-100'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col items-center">
        <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Completion Rate</h3>
        <div className="text-5xl font-light text-slate-800 mb-6">
          {stats.percentage}%
        </div>

        <div className="w-full h-64 relative">
          {!hasData ? (
             <div className="absolute inset-0 flex items-center justify-center text-slate-300 text-sm">
               No data for this period
             </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        
        <div className="flex w-full justify-between mt-4 px-8">
           <div className="text-center">
              <div className="text-2xl font-medium text-slate-700">{stats.completed}</div>
              <div className="text-xs text-slate-400">Done</div>
           </div>
           <div className="text-center">
              <div className="text-2xl font-medium text-slate-300">{stats.total}</div>
              <div className="text-xs text-slate-400">Total</div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default StatsView;