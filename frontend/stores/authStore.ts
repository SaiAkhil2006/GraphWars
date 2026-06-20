'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from 'firebase/auth';

interface AuthState {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      loading: true,
      setUser: (user) => set({ user, loading: false }),
      setLoading: (loading) => set({ loading }),
    }),
    {
      name: 'graphwars-auth',
      partialize: () => ({}),
    }
  )
);
