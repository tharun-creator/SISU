import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import AppLayout from '../../components/layout/AppLayout';
import useSessionLogs from '../../hooks/useSessionLogs';
import SessionLogCard from './SessionLogCard';
import SessionLogModal from './SessionLogModal';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import notesApi from '../../api/notes';

export const SessionLogsPage: React.FC = () => {
  const { sessionLogs, loading, error, logSession, deleteLog, toggleItem } = useSessionLogs();
  const [modalOpen, setModalOpen] = useState(false);
  const toast = useToast();

  const handleDeleteLog = async (logId: number) => {
    if (!window.confirm('Are you sure you want to delete this session log?')) return;
    try {
      await deleteLog(logId);
      toast.show('Session log deleted successfully', 'success');
    } catch (err: any) {
      toast.show(err.message || 'Failed to delete session log', 'error');
    }
  };

  const handleLogSubmit = async (data: { session_date: string; session_type: string; discussed_items: string[]; action_items: { id: string; text: string; completed: boolean }[] }) => {
    try {
      await logSession(data);
      toast.show('Session log created successfully!', 'success');
    } catch (err: any) {
      toast.show(err.message || 'Failed to log session', 'error');
      throw err;
    }
  };

  const handleExportToNotebook = async (log: any) => {
    try {
      let dateLabel = '';
      try {
        dateLabel = format(parseISO(log.session_date), 'MMMM d, yyyy');
      } catch {
        dateLabel = log.session_date.split('T')[0];
      }

      let content = `# Session Notes - ${dateLabel}\n\n`;
      content += `Type: ${log.session_type}\n\n`;
      
      if (log.discussed_items && log.discussed_items.length > 0) {
        content += `## Discussed Topics\n`;
        log.discussed_items.forEach((item: string) => {
          content += `- ${item}\n`;
        });
        content += `\n`;
      }
      
      if (log.action_items && log.action_items.length > 0) {
        content += `## Action Items / To-Dos\n`;
        log.action_items.forEach((item: any) => {
          content += `- ${item.text}\n`;
        });
        content += `\n`;
      }

      await notesApi.createNote({
        title: `Session Notes - ${dateLabel} (${log.session_type})`,
        content: content.trim()
      });
      toast.show('Session logs exported to Notebook successfully!', 'success');
    } catch (err: any) {
      toast.show(err.message || 'Failed to export session logs to Notebook', 'error');
    }
  };

  return (
    <AppLayout title="Coaching Session Logs">
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in pb-12">
        {/* Header */}
        <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
          <div>
            <h1 className="font-heading text-2xl font-bold text-slate-800">Session Ledger</h1>
            <p className="font-body text-xs text-slate-400 mt-1">Track discussed topics and pending action items for each call.</p>
          </div>
        </div>

        {/* Content list */}
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-rose-50 border border-rose-100 p-4 text-xs font-body text-rose-600">
            {error}
          </div>
        ) : sessionLogs.length === 0 ? (
          <EmptyState
            title="No sessions logged yet"
            description="Log your first coaching session to track topics discussed and action item checklists."
            icon="note_alt"
          />
        ) : (
          <div className="space-y-6">
            {sessionLogs.map((log) => (
              <SessionLogCard 
                key={log.id} 
                log={log} 
                onExport={handleExportToNotebook}
                onDelete={handleDeleteLog}
                onToggleItem={toggleItem}
              />
            ))}
          </div>
        )}

        {/* Bottom CTA trigger */}
        <button
          onClick={() => setModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-slate-900 border border-slate-800 hover:bg-slate-850 px-4 py-4 text-sm font-bold text-white transition-all shadow-md active:scale-[0.98]"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          <span>Log new session</span>
        </button>
      </div>

      <SessionLogModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleLogSubmit}
      />
    </AppLayout>
  );
};
export default SessionLogsPage;
