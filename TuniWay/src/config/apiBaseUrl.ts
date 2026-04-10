/**
 * API root (no trailing slash). Set `EXPO_PUBLIC_API_URL` in `.env` and restart Expo.
 *
 * - Same machine (iOS simulator / Expo web): `http://localhost:8080` (or `9080` if your API uses that port)
 * - Android emulator: `http://10.0.2.2:8080` (or `:9080`)
 * - Physical device: `http://<your-computer-LAN-IP>:8080`
 */
export function getApiBaseUrl(): string {
  const raw = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8082';
  return raw.replace(/\/$/, '');
}

/** Versioned REST base: `{base}/api/v1` */
export function getApiV1BaseUrl(): string {
  return `${getApiBaseUrl()}/api/v1`;
}
