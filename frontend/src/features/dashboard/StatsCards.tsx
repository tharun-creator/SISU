import React from 'react';
import Card from '../../components/ui/Card';

interface StatsCardsProps {
  stats: {
    total?: number;
    pending?: number;
    approved?: number;
    completed?: number;
  } | null;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  const cards = [
    {
      label: 'Total Sessions',
      value: stats?.total ?? 0,
      icon: 'hub',
      color: 'bg-indigo-50 text-indigo-600',
    },
    {
      label: 'Pending Approval',
      value: stats?.pending ?? 0,
      icon: 'pending',
      color: 'bg-amber-50 text-amber-600',
    },
    {
      label: 'Confirmed Sessions',
      value: stats?.approved ?? 0,
      icon: 'event_available',
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Completed Sessions',
      value: stats?.completed ?? 0,
      icon: 'task_alt',
      color: 'bg-sky-50 text-sky-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, idx) => (
        <Card key={idx} className="flex items-center gap-4 p-5">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.color}`}>
            <span className="material-symbols-outlined text-2xl">{card.icon}</span>
          </div>
          <div>
            <p className="font-body text-xs font-semibold text-slate-500 uppercase tracking-wider">{card.label}</p>
            <p className="font-heading text-2xl font-bold text-slate-800 mt-1">{card.value}</p>
          </div>
        </Card>
      ))}
    </div>
  );
};
export default StatsCards;
