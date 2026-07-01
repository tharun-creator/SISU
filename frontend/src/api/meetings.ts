import client from './client';
import { Meeting } from '../types/meeting';

export const meetingsApi = {
  getMeetings: (status?: string) => client.get<any, Meeting[]>(`/meetings${status ? `?status=${status}` : ''}`),
  createMeeting: (data: any) => client.post<any, Meeting>('/meetings', data),
  getMeeting: (id: number) => client.get<any, Meeting>(`/meetings/${id}`),
  cancelMeeting: (id: number) => client.delete(`/meetings/${id}`),
  requestReschedule: (id: number, data: { new_start_time: string; new_end_time: string; reason: string }) => 
    client.put(`/meetings/${id}/reschedule`, data),
  confirmReschedule: (id: number) => client.put(`/meetings/${id}/confirm-reschedule`),
  getCalendarSignals: (month?: number, year?: number) => {
    let path = '/availability/calendar-signals';
    if (month !== undefined && year !== undefined) {
      path += `?month=${month + 1}&year=${year}`;
    }
    return client.get<any, any>(path);
  },
  getFreeSlots: (date: string, duration: number = 60) => 
    client.get<any, any[]>(`/availability/free-slots?date=${date}&duration=${duration}`),
};
export default meetingsApi;
