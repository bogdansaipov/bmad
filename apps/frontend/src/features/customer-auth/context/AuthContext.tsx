import React, { createContext, useContext, useEffect, useState } from 'react';
import type { LoginResponse, SessionResponse } from '@handrix/contracts';
import { fetchSession } from '../api/auth.api';
import { clearAccessToken, setAccessToken } from '../lib/auth-storage';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: AuthStatus;
  user: SessionResponse | null;
  login: (response: LoginResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<SessionResponse | null>(null);

  useEffect(() => {
    fetchSession()
      .then((session) => {
        if (session) {
          setUser(session);
          setStatus('authenticated');
        } else {
          setStatus('unauthenticated');
        }
      })
      .catch(() => {
        setStatus('unauthenticated');
      });
  }, []);

  function login(response: LoginResponse) {
    setAccessToken(response.accessToken);
    setUser({ userId: response.userId, email: response.email, role: response.role });
    setStatus('authenticated');
  }

  function logout() {
    clearAccessToken();
    setUser(null);
    setStatus('unauthenticated');
  }

  return (
    <AuthContext.Provider value={{ status, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
