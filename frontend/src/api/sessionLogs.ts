import client from './client';
import { SessionLog } from '../types/sessionLog';

export const sessionLogsApi = {
  getLogs: () => client.get<any, SessionLog[]>('/session-logs'),
  createLog: (data: { session_date: string; session_type: string; discussed_items: string[]; action_items: { id: string; text: string; completed: boolean }[] }) => 
    client.post<any, SessionLog>('/session-logs', data),
  toggleAction: (logId: number, itemId: string, completed: boolean) => 
    client.put<any, SessionLog>(`/session-logs/${logId}/toggle-action`, { item_id: itemId, completed }),
  deleteLog: (logId: number) => client.delete(`/session-logs/${logId}`),
};
export default sessionLogsApi;
