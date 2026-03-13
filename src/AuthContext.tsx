import React, { createContext, useContext, useState, useEffect } from 'react';
import { Teacher } from './types';

interface AuthContextType {
  user: Teacher | null;
  login: (teacher: Teacher) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('school_diary_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = (teacher: Teacher) => {
    setUser(teacher);
    localStorage.setItem('school_diary_user', JSON.stringify(teacher));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('school_diary_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
