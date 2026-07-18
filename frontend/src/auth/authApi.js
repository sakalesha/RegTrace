import axios from 'axios';

const baseApiUrl = import.meta.env.VITE_API_URL || '/api/v1';
const API_BASE_URL = `${baseApiUrl}/auth`;

export const loginApi = async (email, password) => {
  const formData = new URLSearchParams();
  formData.append('username', email);
  formData.append('password', password);

  const response = await axios.post(`${API_BASE_URL}/login`, formData, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });
  return response.data;
};

export const logoutApi = async (token) => {
  await axios.post(`${API_BASE_URL}/logout`, {}, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
};

export const getMeApi = async (token) => {
  const response = await axios.get(`${API_BASE_URL}/me`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.data;
};

export const changePasswordApi = async (token, currentPassword, newPassword) => {
  const response = await axios.post(`${API_BASE_URL}/change-password`, {
    current_password: currentPassword,
    new_password: newPassword
  }, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.data;
};

import API from '../api/client';

export const createUserApi = async (userData) => {
  const response = await API.post('/auth/users', userData);
  return response.data;
};
