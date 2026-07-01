import client from './client';
import { Meeting } from '../types/meeting';
import { User } from '../types/user';

export const adminApi = {
  getMeetings: (status?: string) => client.get<any, Meeting[]>(`/admin/meetings${status ? `?status=${status}` : ''}`),
  updateStatus: (id: number, data: { status: string; reason?: string }) => 
    client.put<any, Meeting>(`/admin/meetings/${id}/status`, data),
  getUsers: () => client.get<any, User[]>('/admin/users'),
  createUser: (data: any) => client.post<any, User>('/admin/users/create', data),
  promoteUser: (data: { email: string; role: string }) => client.post<any, User>('/admin/users/promote', data),
  demoteUser: (data: { email: string }) => client.post<any, User>('/admin/users/demote', data),
  updateUserStatus: (id: number, data: { status: string }) => client.put(`/admin/users/${id}/status`, data),
  updateUserPriority: (id: number, data: { priority_multiplier: number }) => client.put(`/admin/users/${id}/priority`, data),
  deleteUser: (id: number) => client.delete(`/admin/users/${id}`),
  setDateSignal: (data: { date: string; is_available: boolean; slots?: any[] }) => 
    client.post('/admin/availability/date-signal', data),
};
export default adminApi;
