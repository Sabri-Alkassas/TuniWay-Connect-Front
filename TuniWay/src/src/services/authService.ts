import { apiClient } from '../lib/apiClient';
import { clearTokens, setTokens } from '../lib/authStorage';
import { useAuthStore } from '../store/authStore';
import type { Role } from '../types/user';
import type {
  LoginBody,
  LoginResponseBody,
  LogoutResponseBody,
  RefreshBody,
  RefreshResponseBody,
  RegisterClientBody,
  RegisterClientResponseBody,
  VerifyEmailBody,
  VerifyEmailResponseBody,
  TwoFactorBody,
  TwoFactorResponseBody,
} from '../types/auth';

function mapBackendRole(role?: string): Role {
  switch (role?.toUpperCase()) {
    case 'ADMIN':
      return 'admin';
    case 'EMPLOYEE':
      return 'driver';
    case 'CLIENT':
    default:
      return 'user';
  }
}

/** POST `/auth/login` */
export async function login(body: LoginBody): Promise<LoginResponseBody> {
  const { data } = await apiClient.post<LoginResponseBody>('/auth/login', body);

  if (data.accessToken && data.refreshToken) {
    await setTokens(data.accessToken, data.refreshToken);
  }

  if (data.authenticated && data.accessToken) {
    await useAuthStore.getState().setAuth(data.accessToken, {
      id: data.id ?? '',
      email: data.email ?? '',
      role: mapBackendRole(data.role),
      firstName: '',
      lastName: '',
      username: '',
      dateOfBirth: '',
      createdAt: '',
    });
  }

  return data;
}

/** POST `/auth/register-client` */
export async function registerClient(body: RegisterClientBody): Promise<RegisterClientResponseBody> {
  const { data } = await apiClient.post<RegisterClientResponseBody>('/auth/register-client', body);
  return data;
}

/** POST `/auth/verify-email` */
export async function verifyEmail(body: VerifyEmailBody): Promise<VerifyEmailResponseBody> {
  const { data } = await apiClient.post<VerifyEmailResponseBody>('/auth/verify-email', body);
  return data;
}

/** POST `/auth/2fa/verify` - staff only */
export async function verifyTwoFactor(body: TwoFactorBody): Promise<TwoFactorResponseBody> {
  const { data } = await apiClient.post<TwoFactorResponseBody>('/auth/2fa/verify', body);

  if (data.authenticated && data.accessToken && data.refreshToken) {
    await setTokens(data.accessToken, data.refreshToken);
    await useAuthStore.getState().setAuth(data.accessToken, {
      id: (data as any).id ?? '',
      email: (data as any).email ?? '',
      role: mapBackendRole((data as any).role),
      firstName: '',
      lastName: '',
      username: '',
      dateOfBirth: '',
      createdAt: '',
    });
  }

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
