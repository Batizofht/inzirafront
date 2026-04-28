import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { getAuthUser, isLoggedIn, logout as performLogout, type AuthUser } from '@/lib/userPreference';

type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isMountedRef = useRef(true);

  const refreshUser = useCallback(async () => {
    try {
      const loggedIn = await isLoggedIn();
      if (loggedIn) {
        const authUser = await getAuthUser();
        if (isMountedRef.current) {
          setUser(authUser);
        }
      } else {
        if (isMountedRef.current) {
          setUser(null);
        }
      }
    } catch (error) {
      console.error('Failed to refresh auth user:', error);
      if (isMountedRef.current) {
        setUser(null);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    refreshUser().finally(() => {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    });

    const intervalId = setInterval(() => {
      refreshUser();
    }, 5000);

    return () => {
      isMountedRef.current = false;
      clearInterval(intervalId);
    };
  }, [refreshUser]);

  const logout = async () => {
    await performLogout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
