import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { env } from '../config/env';
import { ApiResponse } from '../types/api';

export const client = axios.create({
  baseURL: env.apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request Interceptor
client.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('sisu_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor
client.interceptors.response.use(
  (response) => {
    // Return the inner data from the SuccessResponse envelope
    const resBody = response.data as ApiResponse<any>;
    if (resBody && resBody.success) {
      return resBody.data;
    }
    return response.data;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any;
    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Auto Refresh Token on 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return client(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('sisu_refresh_token');
      if (refreshToken) {
        try {
          // Request refresh from backend
          const res = await axios.post(`${env.apiUrl}/auth/refresh?refresh_token=${refreshToken}`);
          const data = res.data;
          
          if (data && data.success) {
            const { access_token, refresh_token: newRefreshToken } = data.data;
            localStorage.setItem('sisu_token', access_token);
            localStorage.setItem('sisu_refresh_token', newRefreshToken);
            
            client.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
            processQueue(null, access_token);
            
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${access_token}`;
            }
            return client(originalRequest);
          }
        } catch (refreshError) {
          processQueue(refreshError, null);
          localStorage.removeItem('sisu_token');
          localStorage.removeItem('sisu_refresh_token');
          localStorage.removeItem('sisu_user');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }
    }

    // Format error from envelope
    const errorResponse = error.response?.data as ApiResponse<any>;
    if (errorResponse && errorResponse.success === false) {
      return Promise.reject(new Error(errorResponse.error.message || 'An error occurred'));
    }

    return Promise.reject(error);
  }
);
export default client;
