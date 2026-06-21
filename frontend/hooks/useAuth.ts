'use client';

import { useEffect } from 'react';
import { auth, onAuthStateChanged } from '@/lib/firebase';
import { useAuthStore } from '@/stores/authStore';

export function useAuth() {
  const { user, loading, setUser, setLoading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, [setUser, setLoading]);

  return { user, loading, isAuthenticated: !!user };
}
