import { apiClient } from '../lib/apiClient';
import { clearTokens, setTokens } from '../lib/authStorage';
import { useAuthStore } from '../store/authStore';
import type {
  LoginBody,
  LoginResponseBody,
  LogoutResponseBody,
  RefreshBody,
  RefreshResponseBody,
  RegisterClientBody,
  RegisterClientResponseBody,
} from '../types/auth';

/** POST `/auth/login` */
export async function login(body: LoginBody): Promise<LoginResponseBody> {
  const { data } = await apiClient.post<LoginResponseBody>('/auth/login', body);

  if (data.accessToken && data.refreshToken) {
    await setTokens(data.accessToken, data.refreshToken);
  }

  // ← this was missing: update the Zustand store so the app
  //   knows the user is authenticated immediately
  if (data.authenticated && data.accessToken) {
    useAuthStore.getState().setAuth(data.accessToken, {
      id:          data.id ?? '',
      email:       data.email ?? '',
      role:        (data.role as any) ?? 'user',
      firstName:   '',
      lastName:    '',
      username:    '',
      dateOfBirth: '',
      createdAt:   '',
    });
  }

  return data;
}

/** POST `/auth/register-client` */
export async function registerClient(body: RegisterClientBody): Promise<RegisterClientResponseBody> {
  const { data } = await apiClient.post<RegisterClientResponseBody>('/auth/register-client', body);
  return data;
}

/** POST `/auth/refresh` */
export async function refreshSession(body: RefreshBody): Promise<RefreshResponseBody> {
  const { data } = await apiClient.post<RefreshResponseBody>('/auth/refresh', body);
  if (data.accessToken && data.refreshToken) {
    await setTokens(data.accessToken, data.refreshToken);
  }
  return data;
}

/** POST `/auth/logout` */
export async function logout(body?: Record<string, unknown>): Promise<LogoutResponseBody> {
  const { data } = await apiClient.post<LogoutResponseBody>('/auth/logout', body ?? {});
  await clearTokens();
  useAuthStore.getState().clearAuth();
  return data;
}