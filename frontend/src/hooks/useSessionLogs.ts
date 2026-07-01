import { useState, useEffect, useCallback } from 'react';
import sessionLogsApi from '../api/sessionLogs';
import { SessionLog } from '../types/sessionLog';

export const useSessionLogs = () => {
  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await sessionLogsApi.getLogs();
      setSessionLogs(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load session logs');
    } finally {
      setLoading(false);
    }
  }, []);

  const logSession = async (data: { session_date: string; session_type: string; discussed_items: string[]; action_items: { id: string; text: string; completed: boolean }[] }) => {
    try {
      const newLog = await sessionLogsApi.createLog(data);
      setSessionLogs(prev => [newLog, ...prev]);
      return newLog;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to log session');
    }
  };

  const toggleItem = async (logId: number, itemId: string, completed: boolean) => {
    // Optimistic UI update
    setSessionLogs(prev => prev.map(log => {
      if (log.id === logId) {
        return {
          ...log,
          action_items: log.action_items.map(item => {
            if (item.id === itemId) {
              return { ...item, completed };
            }
            return item;
          })
        };
      }
      return log;
    }));

    try {
      const updatedLog = await sessionLogsApi.toggleAction(logId, itemId, completed);
      setSessionLogs(prev => prev.map(log => log.id === logId ? updatedLog : log));
    } catch (err: any) {
      // Revert on error
      await fetchLogs();
      throw new Error(err.message || 'Failed to toggle action item');
    }
  };

  const deleteLog = async (logId: number) => {
    try {
      await sessionLogsApi.deleteLog(logId);
      setSessionLogs(prev => prev.filter(log => log.id !== logId));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete session log');
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return {
    sessionLogs,
    loading,
    error,
    refresh: fetchLogs,
    logSession,
    toggleItem,
    deleteLog
  };
};
export default useSessionLogs;
