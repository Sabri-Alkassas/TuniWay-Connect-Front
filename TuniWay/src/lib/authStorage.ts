import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_ACCESS = 'tuniway_access_token';
const KEY_REFRESH = 'tuniway_refresh_token';

export async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(KEY_ACCESS);
}

export async function getRefreshToken(): Promise<string | null> {
  return AsyncStorage.getItem(KEY_REFRESH);
}

export async function setTokens(accessToken: string | null, refreshToken: string | null): Promise<void> {
  if (accessToken) {
    await AsyncStorage.setItem(KEY_ACCESS, accessToken);
  } else {
    await AsyncStorage.removeItem(KEY_ACCESS);
  }
  if (refreshToken) {
    await AsyncStorage.setItem(KEY_REFRESH, refreshToken);
  } else {
    await AsyncStorage.removeItem(KEY_REFRESH);
  }
}

export async function clearTokens(): Promise<void> {
  await AsyncStorage.multiRemove([KEY_ACCESS, KEY_REFRESH]);
}
