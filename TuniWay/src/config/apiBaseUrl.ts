import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DEFAULT_API_PORT = '8082';
const LOCALHOST_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0']);

function stripTrailingSlash(value: string): string {
  return value.replace(/\/$/, '');
}

function getExpoDevHost(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    Constants.expoGoConfig?.debuggerHost ??
    null;

  if (!hostUri) {
    return null;
  }

  return hostUri.split(':')[0] ?? null;
}

function rewriteLocalhostForDevice(rawUrl: string): string {
  if (Platform.OS === 'web') {
    return stripTrailingSlash(rawUrl);
  }

  try {
    const url = new URL(rawUrl);
    const expoHost = getExpoDevHost();

    if (expoHost && LOCALHOST_HOSTS.has(url.hostname)) {
      url.hostname = expoHost;
    }

    return stripTrailingSlash(url.toString());
  } catch {
    return stripTrailingSlash(rawUrl);
  }
}

/**
 * API root (no trailing slash). Set `EXPO_PUBLIC_API_URL` in `.env` and restart Expo.
 *
 * - Web: `http://localhost:8082`
 * - Android emulator: `http://10.0.2.2:8082`
 * - Physical device: `http://<your-computer-LAN-IP>:8082`
 *
 * During Expo development on a physical device, `localhost` is automatically
 * rewritten to the Expo host machine IP so the phone can reach your backend.
 */
export function getApiBaseUrl(): string {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configuredUrl) {
    return rewriteLocalhostForDevice(configuredUrl);
  }

  const expoHost = getExpoDevHost();
  if (expoHost && Platform.OS !== 'web') {
    return `http://${expoHost}:${DEFAULT_API_PORT}`;
  }

  return `http://localhost:${DEFAULT_API_PORT}`;
}

/** Versioned REST base: `{base}/api/v1` */
export function getApiV1BaseUrl(): string {
  return `${getApiBaseUrl()}/api/v1`;
}
