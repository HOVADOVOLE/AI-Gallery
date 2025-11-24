/**
 * Global state management for User Authentication using Zustand.
 * Persists the JWT token in localStorage so login survives page refreshes.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserProfile {
  id: number;
  email: string;
  full_name: string;
  role: string;
}

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  
  // Actions
  setToken: (token: string) => void;
  setUser: (user: UserProfile) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      setToken: (token: string) => set({ token, isAuthenticated: true }),
      
      setUser: (user: UserProfile) => set({ user }),
      
      logout: () => set({ token: null, user: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage', // key in localStorage
    }
  )
);
