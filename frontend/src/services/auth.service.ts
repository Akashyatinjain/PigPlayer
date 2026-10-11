import api from '@/lib/api';
import { User } from '@/types/music';

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export const authService = {
  async register(data: { name: string; email: string; password: string }): Promise<AuthResponse> {
    const res = await api.post('/auth/register', data);
    const { user, accessToken, refreshToken } = res.data.data;
    if (typeof window !== 'undefined') {
      localStorage.setItem('soundify_access_token', accessToken);
      localStorage.setItem('soundify_refresh_token', refreshToken);
      localStorage.setItem('soundify_user', JSON.stringify(user));
    }
    return res.data.data;
  },

  async login(data: { email: string; password: string }): Promise<AuthResponse> {
    const res = await api.post('/auth/login', data);
    const { user, accessToken, refreshToken } = res.data.data;
    if (typeof window !== 'undefined') {
      localStorage.setItem('soundify_access_token', accessToken);
      localStorage.setItem('soundify_refresh_token', refreshToken);
      localStorage.setItem('soundify_user', JSON.stringify(user));
    }
    return res.data.data;
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('soundify_access_token');
        localStorage.removeItem('soundify_refresh_token');
        localStorage.removeItem('soundify_user');
      }
    }
  },

  async getMe(): Promise<User | null> {
    try {
      const res = await api.get('/auth/me');
      return res.data.data;
    } catch {
      return null;
    }
  },

  getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('soundify_user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    return Boolean(localStorage.getItem('soundify_access_token'));
  },

  async ensureAuth(): Promise<boolean> {
    if (this.isAuthenticated()) return true;
    try {
      const email = process.env.NEXT_PUBLIC_LOCAL_USER_EMAIL || 'local@soundify.app';
      const password = process.env.NEXT_PUBLIC_LOCAL_USER_PASSWORD || 'soundify';
      await this.login({ email, password });
      return true;
    } catch {
      return false;
    }
  },
};
