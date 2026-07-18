import React, { createContext, useState, useEffect, useContext } from 'react';
import { loginApi, logoutApi, getMeApi } from './authApi';
import api from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('access_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const userData = await getMeApi(token);
          setUser(userData);
          // Set the default authorization header for the global API client
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } catch (error) {
          console.error("Session expired or invalid token", error);
          setToken(null);
          setUser(null);
          localStorage.removeItem('access_token');
          delete api.defaults.headers.common['Authorization'];
        }
      }
      setLoading(false);
    };
    initAuth();
  }, [token]);

  const login = async (email, password) => {
    try {
      const data = await loginApi(email, password);
      setToken(data.access_token);
      setUser(data.user);
      localStorage.setItem('access_token', data.access_token);
      api.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`;
      return { success: true };
    } catch (error) {
      console.error("Login failed", error);
      return { 
        success: false, 
        error: error.response?.data?.detail || "Login failed. Please check your credentials." 
      };
    }
  };

  const logout = async () => {
    if (token) {
      try {
        await logoutApi(token);
      } catch (e) {
        console.error("Logout API failed, clearing local state anyway");
      }
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem('access_token');
    delete api.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
