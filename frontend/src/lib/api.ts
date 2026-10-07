import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const rawUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').trim().replace(/\/+$/, '');
const API_BASE_URL = rawUrl.endsWith('/api') ? rawUrl : `${rawUrl}/api`;

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor to attach JWT access token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('soundify_access_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh and errors
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (typeof window === 'undefined') {
        return Promise.reject(error);
      }

      const refreshToken = localStorage.getItem('soundify_refresh_token');

      // If no refresh token or already retried, clear session
      if (!refreshToken || originalRequest.url?.includes('/auth/refresh') || originalRequest.url?.includes('/auth/login')) {
        localStorage.removeItem('soundify_access_token');
        localStorage.removeItem('soundify_refresh_token');
        localStorage.removeItem('soundify_user');
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken, user } = response.data.data;
        localStorage.setItem('soundify_access_token', accessToken);
        if (newRefreshToken) {
          localStorage.setItem('soundify_refresh_token', newRefreshToken);
        }
        if (user) {
          localStorage.setItem('soundify_user', JSON.stringify(user));
        }

        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        processQueue(null, accessToken);
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem('soundify_access_token');
        localStorage.removeItem('soundify_refresh_token');
        localStorage.removeItem('soundify_user');
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
