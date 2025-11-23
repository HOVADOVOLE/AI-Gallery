/**
 * Configured Axios instance for making API requests.
 * Includes interceptors for attaching JWT tokens and handling errors.
 */

import axios from 'axios';
import { useAuthStore } from '../store/authStore';

// Base configuration
// Note: We use /api relative path because Vite proxy handles the redirection
export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- Request Interceptor ---
// Adds the Authorization header to every request if a token exists
api.interceptors.request.use(
  (config) => {
    // We access the store directly (outside of a component)
    const token = useAuthStore.getState().token;
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Switch to JSON for non-login requests if needed, 
    // but FastAPI handles JSON bodies automatically even with this header usually.
    // However, for cleaness, we might override Content-Type in specific calls.
    return config;
  },
  (error) => Promise.reject(error)
);

// --- Response Interceptor ---
// Handles global errors like 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid -> Logout user
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);
