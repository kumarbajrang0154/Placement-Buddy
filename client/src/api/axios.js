import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle different error cases
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      
      // Only redirect if not already on login/signup page
      if (!window.location.pathname.includes('/login') && 
          !window.location.pathname.includes('/signup')) {
        window.location.href = '/login';
      }
    }
    
    // Add helpful error context
    if (!error.response) {
      error.message = 'Network error. Please check your connection.';
    } else if (error.response.status === 503) {
      error.message = 'Server temporarily unavailable. Please try again later.';
    } else if (error.response.status === 429) {
      error.message = 'Too many requests. Please try again later.';
    }
    
    return Promise.reject(error);
  }
);

export default api;

