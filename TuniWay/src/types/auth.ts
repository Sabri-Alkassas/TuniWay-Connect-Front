
export type LoginBody = {
  email: string;
  password_hash: string;
};

export type RegisterClientBody = {
  email: string;
  password_hash: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  birthDate?: string;
};

export type LoginResponseBody = {
  id?: string;
  email?: string;
  role?: string;
  status?: string;
  lastLoginAt?: string;
  authenticated: boolean;
  twoFactorRequired?: boolean;
  tempToken?: string;
  accessToken?: string;
  refreshToken?: string;
  message?: string;
};

export type RegisterClientResponseBody = {
  id?: string;
  email?: string;
  role?: string;
  status?: string;
  createdAt?: string;
  message?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  birthDate?: string;
};

export type RefreshBody = {
  refreshToken: string;
};

export type RefreshResponseBody = {
  authenticated?: boolean;
  accessToken?: string;
  refreshToken?: string;
  message?: string;
};

export type LogoutResponseBody = {
  message?: string;
};
