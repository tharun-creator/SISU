/**
 * api.js — Centralized API client with JWT token injection and error handling
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem('sisu_token');
    localStorage.removeItem('sisu_user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    const error = new Error(typeof err.detail === 'string' ? err.detail : (err.detail?.message || 'Request failed'));
    error.detail = err.detail; // Attach full detail for structured errors (like 409 alternatives)
    throw error;
  }

  // 204 No Content
  if (res.status === 204) return null;

  return res.json();
}

export const api = {
  // Auth
  register: (data) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request('/api/auth/me'),

  // Chat
  chat: (message, history = []) => request('/api/chat', { method: 'POST', body: JSON.stringify({ message, history }) }),

  // Meetings
  getMeetings: (status) => request(`/api/meetings${status ? `?status=${status}` : ''}`),
  createMeeting: (data) => request('/api/meetings', { method: 'POST', body: JSON.stringify(data) }),
  getMeeting: (id) => request(`/api/meetings/${id}`),
  cancelMeeting: (id) => request(`/api/meetings/${id}`, { method: 'DELETE' }),

  // Admin
  adminGetMeetings: (status) => request(`/api/admin/meetings${status ? `?status=${status}` : ''}`),
  adminUpdateStatus: (id, data) => request(`/api/admin/meetings/${id}/status`, { method: 'PUT', body: JSON.stringify(data) }),

  // Notifications
  getNotifications: () => request('/api/notifications'),
  markRead: (id) => request(`/api/notifications/${id}/read`, { method: 'PUT' }),
  markAllRead: () => request('/api/notifications/read-all', { method: 'PUT' }),

  // Availability
  getAvailability: () => request('/api/availability'),
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
