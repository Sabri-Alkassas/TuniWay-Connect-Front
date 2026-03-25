import { client } from './client';
import type { AuthResponse } from '../types/user';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  dateOfBirth: string;
  phone?: string | null;
}

export const authApi = {
  login: (payload: LoginPayload) =>
    client.post<AuthResponse>('/auth/login', payload),

  register: (payload: RegisterPayload) =>
    client.post<AuthResponse>('/auth/register', payload),
};
