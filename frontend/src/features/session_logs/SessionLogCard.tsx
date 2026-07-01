import React from 'react';
import { format, parseISO } from 'date-fns';
import { SessionLog } from '../../types/sessionLog';

interface SessionLogCardProps {
  log: SessionLog;
  onExport: (log: SessionLog) => void;
  onDelete: (logId: number) => void;
  onToggleItem?: (logId: number, itemId: string, completed: boolean) => void;
}

export const SessionLogCard: React.FC<SessionLogCardProps> = ({ log, onExport, onDelete, onToggleItem }) => {
  // Format date safely
  let dateLabel = '';
  try {
    dateLabel = format(parseISO(log.session_date), 'MMMM d, yyyy');
  } catch {
    dateLabel = log.session_date.split('T')[0];
  }

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-6 text-slate-800 shadow-sm space-y-6 transition-all hover:shadow-md">
      {/* Title block */}
      <div className="flex items-center justify-between border-b border-slate-50 pb-4">
        <div>
          <h3 className="font-heading text-lg font-bold text-slate-800">{dateLabel}</h3>
          <p className="font-body text-xs font-semibold text-slate-400 capitalize mt-0.5">{log.session_type}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onExport(log)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 font-body text-xs font-bold text-slate-600 transition-all active:scale-[0.98]"
            title="Send to Executive Notebook"
          >
            <span className="material-symbols-outlined text-sm text-indigo-600">description</span>
            <span>Send to Notebook</span>
          </button>

          <button
            onClick={() => onDelete(log.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-100 hover:border-rose-200 bg-rose-50/30 hover:bg-rose-600 hover:text-white font-body text-xs font-bold text-rose-600 transition-all active:scale-[0.98]"
            title="Delete Session Log"
          >
            <span className="material-symbols-outlined text-sm">delete</span>
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Discussed topics */}
      {log.discussed_items.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-body text-[10px] font-bold text-slate-400 uppercase tracking-widest">Discussed Topics</h4>
          <ul className="space-y-1">
            {log.discussed_items.map((item, idx) => (
              <li key={idx} className="py-1.5 font-body text-sm text-slate-600 flex items-start gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300 mt-2 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action items / Points note */}
      {log.action_items.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-body text-[10px] font-bold text-slate-400 uppercase tracking-widest">Points Note / Action Items</h4>
          <div className="space-y-1.5">
            {log.action_items.map((item) => (
              <label 
                key={item.id} 
                className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer w-full"
              >
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={(e) => onToggleItem && onToggleItem(log.id, item.id, e.target.checked)}
                  className="h-4 w-4 rounded border-slate-350 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className={`font-body text-sm transition-all ${item.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                  {item.text}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionLogCard;
