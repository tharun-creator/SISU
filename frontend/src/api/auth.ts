import client from './client';
import { User } from '../types/user';

export const authApi = {
  getMe: () => client.get<any, User>('/auth/me'),
  updateProfile: (data: { name?: string; phone?: string; company?: string; job_title?: string; timezone?: string }) => 
    client.put<any, User>('/auth/update-profile', data),
  changePassword: (data: any) => client.put('/auth/change-password', data),
  getCaptcha: () => client.get<{ success: boolean; data: { image: string; token: string } }>('/auth/captcha'),
};
export default authApi;
