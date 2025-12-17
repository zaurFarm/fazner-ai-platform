import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import { apiClient } from '@/api/client';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => Promise<void>;
  loadProfile: () => Promise<void>;
  clearError: () => void;
  updateProfile: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await apiClient.login(email, password);
          
          if (response.success && response.data) {
            const { user, token } = response.data;
            set({
              user,
              token,
              isAuthenticated: true,
              isLoading: false,
            });
            apiClient.setAuthToken(token);
          } else {
            set({
              error: response.error?.message || 'Login failed',
              isLoading: false,
            });
          }
        } catch (error: any) {
          set({
            error: error.message || 'An unexpected error occurred',
            isLoading: false,
          });
        }
      },

      register: async (userData: any) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await apiClient.register(userData);
          
          if (response.success && response.data) {
            const { user, token } = response.data;
            set({
              user,
              token,
              isAuthenticated: true,
              isLoading: false,
            });
            apiClient.setAuthToken(token);
          } else {
            set({
              error: response.error?.message || 'Registration failed',
              isLoading: false,
            });
          }
        } catch (error: any) {
          set({
            error: error.message || 'An unexpected error occurred',
            isLoading: false,
          });
        }
      },

      logout: async () => {
        try {
          await apiClient.logout();
        } catch (error) {
          // Continue with logout even if API call fails
          console.warn('Logout API call failed:', error);
        }
        
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
        apiClient.removeAuthToken();
      },

      loadProfile: async () => {
        const token = get().token;
        if (!token) return;

        set({ isLoading: true });
        
        try {
          const response = await apiClient.getProfile();
          
          if (response.success && response.data) {
            set({
              user: response.data,
              isLoading: false,
            });
          } else {
            // Token might be invalid
            get().logout();
          }
        } catch (error: any) {
          console.error('Failed to load profile:', error);
          get().logout();
        }
      },

      clearError: () => {
        set({ error: null });
      },

      updateProfile: (updates: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: { ...currentUser, ...updates },
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);