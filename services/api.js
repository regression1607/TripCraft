import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { auth } from './firebase';

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 minutes for AI generation
});

// Request interceptor - always get fresh token from Firebase
api.interceptors.request.use(async (config) => {
  try {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const token = await currentUser.getIdToken(); // auto-refreshes if expired
      config.headers.Authorization = `Bearer ${token}`;
      await AsyncStorage.setItem('token', token);
    } else {
      const token = await AsyncStorage.getItem('token');
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    const token = await AsyncStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  console.log(`[API] --> ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
  return config;
});

// Response logging
api.interceptors.response.use(
  (response) => {
    console.log(`[API] <-- ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error(`[API] <-- ERROR ${error.response?.status || 'NETWORK'} ${error.config?.url}`, error.message);
    return Promise.reject(error);
  }
);

export const authAPI = {
  verify: () => api.post('/auth/verify'),
  me: () => api.get('/auth/me'),
};

export const tripsAPI = {
  create: (data) => api.post('/trips', data),
  getAll: () => api.get('/trips'),
  getById: (id) => api.get(`/trips/${id}`),
  delete: (id) => api.delete(`/trips/${id}`),
};

export const itineraryAPI = {
  generate: (tripId) => api.post('/itinerary/generate', { tripId }),
  update: (id, data) => api.put(`/itinerary/${id}`, data),
};

export const weatherAPI = {
  getByCity: (city) => api.get(`/weather/${encodeURIComponent(city)}`),
};

export default api;
