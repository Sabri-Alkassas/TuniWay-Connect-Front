import { safeGetItem, safeMultiRemove, safeRemoveItem, safeSetItem } from './safeStorage';

const KEY_ACCESS = 'tuniway_access_token';
const KEY_REFRESH = 'tuniway_refresh_token';

export async function getAccessToken(): Promise<string | null> {
  return safeGetItem(KEY_ACCESS);
}

export async function getRefreshToken(): Promise<string | null> {
  return safeGetItem(KEY_REFRESH);
}

export async function setTokens(accessToken: string | null, refreshToken: string | null): Promise<void> {
  if (accessToken) {
    await safeSetItem(KEY_ACCESS, accessToken);
  } else {
    await safeRemoveItem(KEY_ACCESS);
  }
  if (refreshToken) {
    await safeSetItem(KEY_REFRESH, refreshToken);
  } else {
    await safeRemoveItem(KEY_REFRESH);
  }
}

export async function clearTokens(): Promise<void> {
  await safeMultiRemove([KEY_ACCESS, KEY_REFRESH]);
}
