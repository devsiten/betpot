import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import { api } from '@/services/api';

// Session timeout: 2 hours in milliseconds
const SESSION_TIMEOUT = 2 * 60 * 60 * 1000;

interface AuthStore {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  lastActivity: number | null;

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, walletAddress?: string) => Promise<void>;
  walletLogin: (walletAddress: string, signature: string, message: string) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
  isAdmin: () => boolean;
  updateActivity: () => void;
  checkSessionTimeout: () => boolean;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: true,
      isAuthenticated: false,
      lastActivity: null,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      setToken: (token) => {
        if (token) {
          localStorage.setItem('betpot_token', token);
        } else {
          localStorage.removeItem('betpot_token');
        }
        set({ token });
      },

      updateActivity: () => {
        set({ lastActivity: Date.now() });
      },

      checkSessionTimeout: () => {
        const { lastActivity, isAuthenticated, logout } = get();
        if (!isAuthenticated || !lastActivity) return false;

        const now = Date.now();
        if (now - lastActivity > SESSION_TIMEOUT) {
          // Session expired - logout
          logout();
          return true; // Session was expired
        }
        return false; // Session still valid
      },

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const response = await api.login(email, password);
          if (response.success && response.data) {
            set({
              user: response.data.user,
              token: response.data.token,
              isAuthenticated: true,
              isLoading: false,
              lastActivity: Date.now(),
            });
            localStorage.setItem('betpot_token', response.data.token);
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (email, password, walletAddress) => {
        set({ isLoading: true });
        try {
          const response = await api.register(email, password, walletAddress);
          if (response.success && response.data) {
            set({
              user: response.data.user,
              token: response.data.token,
              isAuthenticated: true,
              isLoading: false,
              lastActivity: Date.now(),
            });
            localStorage.setItem('betpot_token', response.data.token);
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      walletLogin: async (walletAddress, signature, message) => {
        set({ isLoading: true });
        try {
          const response = await api.walletLogin(walletAddress, signature, message);
          if (response.success && response.data) {
            set({
              user: response.data.user,
              token: response.data.token,
              isAuthenticated: true,
              isLoading: false,
              lastActivity: Date.now(),
            });
            localStorage.setItem('betpot_token', response.data.token);
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem('betpot_token');
        localStorage.removeItem('betpot_wallet');
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          lastActivity: null,
        });
      },

      fetchUser: async () => {
        const token = localStorage.getItem('betpot_token');
        if (!token) {
          set({ isLoading: false, isAuthenticated: false });
          return;
        }

        // Check session timeout first
        const { checkSessionTimeout } = get();
        if (checkSessionTimeout()) {
          return; // Session expired, already logged out
        }

        try {
          const response = await api.getMe();
          if (response.success && response.data) {
            set({
              user: response.data,
              token,
              isAuthenticated: true,
              isLoading: false,
              lastActivity: Date.now(),
            });
          }
        } catch {
          localStorage.removeItem('betpot_token');
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            lastActivity: null,
          });
        }
      },

      isAdmin: () => {
        const { user } = get();
        return user?.role === 'admin';
      },
    }),
    {
      name: 'betpot-auth',
      partialize: (state) => ({ token: state.token, lastActivity: state.lastActivity }),
    }
  )
);
