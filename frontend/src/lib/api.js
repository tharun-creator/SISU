/**
 * api.js — Centralized API client with JWT token injection and error handling
 */

const configuredApiUrl = import.meta.env.VITE_API_URL;
const isLocalApp = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const BASE_URL = (configuredApiUrl || (isLocalApp ? 'http://localhost:8000' : '')).replace(/\/$/, '');

function getConnectionErrorMessage() {
  if (!configuredApiUrl && !isLocalApp) {
    return 'Backend URL is not configured. Add VITE_API_URL in Vercel with your Render backend URL, then redeploy the frontend.';
  }

  return `Could not connect to the backend server${BASE_URL ? ` at ${BASE_URL}` : ''}. Please make sure the backend is deployed and running.`;
}

function getToken() {
  return localStorage.getItem('sisu_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

    if (res.status === 401) {
      localStorage.removeItem('sisu_token');
      localStorage.removeItem('sisu_user');
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      let errorData;
      try {
        errorData = await res.json();
      } catch (e) {
        errorData = { detail: 'An unexpected error occurred' };
      }
      
      const message = typeof errorData.detail === 'string' 
        ? errorData.detail 
        : (errorData.detail?.message || 'Request failed');
        
      const error = new Error(message);
      error.detail = errorData.detail;
      error.status = res.status;
      throw error;
    }

    if (res.status === 204) return null;
    return await res.json();
  } catch (err) {
    if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
      throw new Error(getConnectionErrorMessage());
    }
    throw err;
  }
}

export const api = {
  // Auth
  register: (data) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request('/api/auth/me'),
  forgotPassword: (data) => {
    const body = typeof data === 'string' ? { email: data } : data;
    return request('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify(body) });
  },
  resetPassword: (tokenOrData, password) => {
    const body = typeof tokenOrData === 'string' ? { token: tokenOrData, password } : tokenOrData;
    return request('/api/auth/reset-password', { method: 'POST', body: JSON.stringify(body) });
  },
  getCaptcha: () => request('/api/auth/captcha'),
  updateProfile: (data) => request('/api/auth/update-profile', { method: 'PUT', body: JSON.stringify(data) }),
  changePassword: (data) => request('/api/auth/change-password', { method: 'PUT', body: JSON.stringify(data) }),


  // Chat
  chat: (message, history = []) => request('/api/chat', { method: 'POST', body: JSON.stringify({ message, history }) }),

  // Meetings
  getMeetings: (status) => request(`/api/meetings${status ? `?status=${status}` : ''}`),
  createMeeting: (data) => request('/api/meetings', { method: 'POST', body: JSON.stringify(data) }),
  getMeeting: (id) => request(`/api/meetings/${id}`),
  cancelMeeting: (id) => request(`/api/meetings/${id}`, { method: 'DELETE' }),
  requestReschedule: (id, data) => request(`/api/meetings/${id}/reschedule`, { method: 'PUT', body: JSON.stringify(data) }),
  confirmReschedule: (id) => request(`/api/meetings/${id}/confirm-reschedule`, { method: 'PUT' }),


  // Admin
  adminGetMeetings: (status) => request(`/api/admin/meetings${status ? `?status=${status}` : ''}`),
  adminUpdateStatus: (id, data) => request(`/api/admin/meetings/${id}/status`, { method: 'PUT', body: JSON.stringify(data) }),
  adminGetUsers: () => request('/api/admin/users'),
  adminCreateUser: (data) => request('/api/admin/users/create', { method: 'POST', body: JSON.stringify(data) }),
  adminPromoteUser: (data) => request('/api/admin/users/promote', { method: 'POST', body: JSON.stringify(data) }),
  adminDemoteUser: (data) => request('/api/admin/users/demote', { method: 'POST', body: JSON.stringify(data) }),
  adminUpdateUserStatus: (id, data) => request(`/api/admin/users/${id}/status`, { method: 'PUT', body: JSON.stringify(data) }),
  adminUpdateUserPriority: (id, data) => request(`/api/admin/users/${id}/priority`, { method: 'PUT', body: JSON.stringify(data) }),
  adminDeleteUser: (id) => request(`/api/admin/users/${id}`, { method: 'DELETE' }),
  getCalendarSignals: () => request('/api/availability/calendar-signals'),
  adminSetDateSignal: (data) => request('/api/admin/availability/date-signal', { method: 'POST', body: JSON.stringify(data) }),

  // Notifications
  getNotifications: () => request('/api/notifications'),
  markRead: (id) => request(`/api/notifications/${id}/read`, { method: 'PUT' }),
  markAllRead: () => request('/api/notifications/read-all', { method: 'PUT' }),

  // Availability
  getAvailability: () => request('/api/availability'),
  createAvailability: (data) => request('/api/availability', { method: 'POST', body: JSON.stringify(data) }),
  updateAvailability: (id, data) => request(`/api/availability/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAvailability: (id) => request(`/api/availability/${id}`, { method: 'DELETE' }),
  getFreeSlots: (date, duration = 60) => request(`/api/availability/free-slots?date=${date}&duration=${duration}`),
  getAvailableSlots: (fromTime, duration = 60, count = 10) => 
    request(`/api/meetings/available-slots?from_time=${fromTime}&duration=${duration}&count=${count}`),

  // Stats
  getStats: () => request('/api/dashboard/stats'),

  // Legacy
  getLegacyBookings: (status) => request(`/api/bookings${status ? `?status=${status}` : ''}`),
  updateLegacyStatus: (id, status) =>
    request(`/api/bookings/${id}/status?status=${status}`, { method: 'PUT' }),
};
