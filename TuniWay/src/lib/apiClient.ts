import axios from 'axios';
import { getApiV1BaseUrl } from '../config/apiBaseUrl';
import { getAccessToken } from './authStorage';

/**
 * Axios client for the TuniWay Connect API (`/api/v1/...`).
 * Sends `Authorization: Bearer` when an access token is stored (see `authStorage`).
 */
export const apiClient = axios.create({
  baseURL: getApiV1BaseUrl(),
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
