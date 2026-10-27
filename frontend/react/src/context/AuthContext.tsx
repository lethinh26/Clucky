import React, { createContext, useContext, useState, useEffect } from 'react';
import { MockUser, mockUsers } from '../mocks/catalogData';

interface AuthContextType {
  user: MockUser;
  switchRole: (role: 'ADMIN' | 'STORE_MANAGER' | 'STAFF') => void;
  isAdmin: boolean;
  isStoreManager: boolean;
  isStaff: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<MockUser>(() => {
    const saved = localStorage.getItem('clucky_admin_role');
    if (saved && mockUsers[saved]) {
      return mockUsers[saved];
    }
    return mockUsers.ADMIN;
  });

  const switchRole = (role: 'ADMIN' | 'STORE_MANAGER' | 'STAFF') => {
    const userForRole = mockUsers[role];
    if (userForRole) {
      setCurrentUser(userForRole);
      localStorage.setItem('clucky_admin_role', role);
    }
  };

  const logout = () => {
    // Demo logout reset
    setCurrentUser(mockUsers.ADMIN);
  };

  return (
    <AuthContext.Provider
      value={{
        user: currentUser,
        switchRole,
        isAdmin: currentUser.role === 'ADMIN',
        isStoreManager: currentUser.role === 'STORE_MANAGER',
        isStaff: currentUser.role === 'STAFF',
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
