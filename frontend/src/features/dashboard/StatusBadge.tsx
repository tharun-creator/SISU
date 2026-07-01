import React from 'react';

export const STATUS_CONFIG: Record<string, { colorClass: string; bgClass: string; borderClass: string; label: string }> = {
  pending: { 
    colorClass: 'text-amber-600', 
    bgClass: 'bg-amber-50', 
    borderClass: 'border-amber-200', 
    label: 'Pending Approval' 
  },
  approved: { 
    colorClass: 'text-emerald-600', 
    bgClass: 'bg-emerald-50', 
    borderClass: 'border-emerald-200', 
    label: 'Confirmed' 
  },
  rejected: { 
    colorClass: 'text-rose-600', 
    bgClass: 'bg-rose-50', 
    borderClass: 'border-rose-200', 
    label: 'Declined' 
  },
  cancelled: { 
    colorClass: 'text-slate-500', 
    bgClass: 'bg-slate-50', 
    borderClass: 'border-slate-200', 
    label: 'Cancelled' 
  },
  rescheduled: { 
    colorClass: 'text-sky-600', 
    bgClass: 'bg-sky-50', 
    borderClass: 'border-sky-200', 
    label: 'Rescheduled' 
  },
  reschedule_requested: { 
    colorClass: 'text-amber-600', 
    bgClass: 'bg-amber-50', 
    borderClass: 'border-amber-300', 
    label: 'Reschedule Requested' 
  },
  reschedule_proposed: { 
    colorClass: 'text-amber-600', 
    bgClass: 'bg-amber-50', 
    borderClass: 'border-amber-300', 
    label: 'Proposed Reschedule' 
  },
  completed: { 
    colorClass: 'text-indigo-600', 
    bgClass: 'bg-indigo-50', 
    borderClass: 'border-indigo-200', 
    label: 'Completed' 
  },
};

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = STATUS_CONFIG[status.toLowerCase()] || {
    colorClass: 'text-slate-500',
    bgClass: 'bg-slate-50',
    borderClass: 'border-slate-200',
    label: status,
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold font-body shadow-sm ${config.bgClass} ${config.colorClass} ${config.borderClass}`}>
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
      {config.label}
    </span>
  );
};
export default StatusBadge;
