import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { useTicketStore } from '../store/ticketStore';
import { useLocationStore } from '../store/locationStore';

// For Expo Go on a physical phone, use your machine's local IP
// e.g. http://192.168.1.x:8080/api
// For emulator use http://10.0.2.2:8080/api
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8080/api';

export const client = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await useAuthStore.getState().clearAuth();
      useTicketStore.getState().clearTickets();
      useLocationStore.getState().clearLocation();
    }
    return Promise.reject(error);
  },
);

export interface ApiError {
  message: string;
  status: number;
}

export function parseApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    return {
      message: error.response?.data?.message ?? error.message,
      status: error.response?.status ?? 0,
    };
  }
  return { message: 'An unexpected error occurred', status: 0 };
}
