import { API_BASE } from './config';

export type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions {
  method?: RequestMethod;
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Base API client: builds URL, handles non-OK responses, parses JSON.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers: customHeaders = {} } = options;
  const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  const config: RequestInit = {
    method,
    headers,
  };

  if (body !== undefined && method !== 'GET') {
    config.body = JSON.stringify(body);
  }

  const res = await fetch(url, config);

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || `Request failed: ${res.status} ${res.statusText}`);
  }

  const contentType = res.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return res.json() as Promise<T>;
  }

  return undefined as unknown as T;
}

/** GET helper */
export function get<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'GET' });
}
