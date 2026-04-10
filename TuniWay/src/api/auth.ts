import { apiClient } from '../lib/apiClient';
import type {
  LoginBody,
  LoginResponseBody,
  RegisterClientBody,
  RegisterClientResponseBody,
} from '../types/auth';

export const authApi = {
  login: (body: LoginBody) =>
    apiClient.post<LoginResponseBody>('/auth/login', body),

  register: (body: RegisterClientBody) =>
    apiClient.post<RegisterClientResponseBody>('/auth/register-client', body),
};