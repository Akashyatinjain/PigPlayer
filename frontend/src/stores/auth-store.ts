import { create } from 'zustand';
import { authService } from '@/services/auth.service';
import { User } from '@/types/music';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  initAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  initAuth: async () => {
    try {
      const cachedUser = authService.getCurrentUser();
      const isAuth = authService.isAuthenticated();

      if (isAuth && cachedUser) {
        set({ user: cachedUser, isAuthenticated: true, isLoading: false });
      }

      // Verify token with backend
      if (isAuth) {
        const freshUser = await authService.getMe();
        if (freshUser) {
          set({ user: freshUser, isAuthenticated: true, isLoading: false });
        } else {
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (email, password) => {
    const data = await authService.login({ email, password });
    set({ user: data.user, isAuthenticated: true });
    return true;
  },

  register: async (name, email, password) => {
    const data = await authService.register({ name, email, password });
    set({ user: data.user, isAuthenticated: true });
    return true;
  },

  logout: async () => {
    await authService.logout();
    set({ user: null, isAuthenticated: false });
  },
}));
