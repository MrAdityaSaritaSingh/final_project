import { apiClient } from './client';

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export const authApi = {
  // Sign up a new user
  signup: async (name: string, email: string, password: string): Promise<AuthResponse> => {
    return apiClient.post('/api/auth/signup', { name, email, password });
  },

  // Log in a user
  login: async (email: string, password: string): Promise<AuthResponse> => {
    return apiClient.post('/api/auth/login', { email, password });
  },

  // Get current user info
  getCurrentUser: async (token: string): Promise<User> => {
    return apiClient.get('/api/auth/me', token);
  },

  // Store token in localStorage
  setToken: (token: string) => {
    localStorage.setItem('auth_token', token);
  },

  // Get token from localStorage
  getToken: (): string | null => {
    return localStorage.getItem('auth_token');
  },

  // Remove token from localStorage
  clearToken: () => {
    localStorage.removeItem('auth_token');
  },
};
