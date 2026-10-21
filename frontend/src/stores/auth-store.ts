import { create } from 'zustand';
import { authService } from '@/services/auth.service';
import { User } from '@/types/music';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  initAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  clearError: () => set({ error: null }),

  initAuth: async () => {
    try {
      const cachedUser = authService.getCurrentUser();
      const isAuth = authService.isAuthenticated();

      if (isAuth && cachedUser) {
        set({ user: cachedUser, isAuthenticated: true, isLoading: false, error: null });
      }

      // Verify token with backend
      if (isAuth) {
        const freshUser = await authService.getMe();
        if (freshUser) {
          set({ user: freshUser, isAuthenticated: true, isLoading: false, error: null });
        } else {
          set({ user: null, isAuthenticated: false, isLoading: false, error: null });
        }
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false, error: null });
      }
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false, error: null });
    }
  },

  login: async (email, password) => {
    try {
      set({ error: null });
      const data = await authService.login({ email, password });
      set({ user: data.user, isAuthenticated: true, error: null });
      return true;
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error)?.message ||
        'Failed to sign in. Please check your credentials.';
      set({ user: null, isAuthenticated: false, error: message });
      return false;
    }
  },

  register: async (name, email, password) => {
    try {
      set({ error: null });
      const data = await authService.register({ name, email, password });
      set({ user: data.user, isAuthenticated: true, error: null });
      return true;
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error)?.message ||
        'Failed to register account.';
      set({ user: null, isAuthenticated: false, error: message });
      return false;
    }
  },

  logout: async () => {
    await authService.logout();
    set({ user: null, isAuthenticated: false, error: null });
  },
}));
