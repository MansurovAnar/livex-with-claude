import React, { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin, logout as apiLogout, getMe } from '../api/auth.api';

const AuthContext = createContext(null);

export const LEADERBOARD_FLAG = 'showPartnerLeaderboard';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      getMe()
        .then(res => setUser(res.data.data))
        .catch(() => localStorage.removeItem('accessToken'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await apiLogin(email, password);
    const { accessToken, user: userData } = res.data.data;
    localStorage.setItem('accessToken', accessToken);
    // Partner leaderboard (LV#38) pops up once per login; PartnerLayout consumes the flag
    if (userData.role === 'partner') sessionStorage.setItem(LEADERBOARD_FLAG, '1');
    setUser(userData);
    return userData;
  };

  const logout = async () => {
    await apiLogout().catch(() => {});
    localStorage.removeItem('accessToken');
    sessionStorage.removeItem(LEADERBOARD_FLAG);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
