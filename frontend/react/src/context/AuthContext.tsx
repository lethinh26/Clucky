import React, { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from 'react';
import type { MockUser } from '../mocks/catalogData';
import { endSession, getSessionState, getServerSessionState, loadSession, subscribeSession } from '../lib/session';

interface AuthContextType {
  user: MockUser | null;
  ready: boolean;
  error: unknown;
  isAdmin: boolean;
  isStoreManager: boolean;
  isStaff: boolean;
  logout: () => Promise<unknown>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const session = useSyncExternalStore(subscribeSession, getSessionState, getServerSessionState);
  useEffect(() => {
    try { localStorage.removeItem('clucky_admin_role'); } catch {}
    void loadSession().catch(() => {});
  }, []);
  const user = useMemo<MockUser | null>(() => {
    if (!session.user || session.user.role === 'CUSTOMER') return null;
    return { ...session.user, id: session.user.userId, role: session.user.role };
  }, [session.user]);
  return <AuthContext.Provider value={{
    user, ready: session.ready, error: session.error,
    isAdmin: user?.role === 'ADMIN', isStoreManager: user?.role === 'STORE_MANAGER',
    isStaff: user?.role === 'STAFF', logout: () => endSession(),
  }}>{children}</AuthContext.Provider>;
};

export function useAuthState() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

export function useAuth() {
  const context = useAuthState();
  if (!context.user) throw new Error('This component requires an authenticated route');
  return { ...context, user: context.user };
}

export default AuthContext;
