import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { getWorkstationName, setWorkstationName, getWorkstationFingerprint, syncDeviceIdentity } from '../utils/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('alnour_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('alnour_token') || null);
  const [loading, setLoading] = useState(true);
  const [workstationNameState, setWorkstationNameState] = useState(() => getWorkstationName());

  useEffect(() => {
    // Initial sync of device identity with server (handles cross-browser resolution)
    syncDeviceIdentity().then(info => {
      if (info && info.workstationName) {
        setWorkstationNameState(info.workstationName);
      }
    });

    async function verifySession() {
      if (token) {
        try {
          const res = await api.get('/auth/profile');
          if (res.success && res.user) {
            setUser(res.user);
            localStorage.setItem('alnour_user', JSON.stringify(res.user));
          }
        } catch (err) {
          console.warn('[AUTH] Session verification failed, clearing auth:', err.message);
          setUser(null);
          setToken(null);
          localStorage.removeItem('alnour_token');
          localStorage.removeItem('alnour_user');
        }
      }
      setLoading(false);
    }
    verifySession();
  }, [token]);

  const updateWorkstation = (name) => {
    setWorkstationName(name);
    setWorkstationNameState(name);
  };

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    if (res.success && res.token) {
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem('alnour_token', res.token);
      localStorage.setItem('alnour_user', JSON.stringify(res.user));
      if (res.workstationName) {
        updateWorkstation(res.workstationName);
      }
      return res;
    }
    throw new Error(res.message || 'Login failed');
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('alnour_token');
    localStorage.removeItem('alnour_user');
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      loading, 
      login, 
      logout, 
      workstationName: workstationNameState, 
      updateWorkstation,
      deviceKey: getWorkstationFingerprint() 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
