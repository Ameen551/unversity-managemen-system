import { useAuthStore } from '../auth/authStore';
import type { User } from '../types';

export const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, message: string, code: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function parseResponse(res: Response): Promise<unknown> {
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return res.json();
  }
  return res.text();
}

let refreshPromise: Promise<string | null> | null = null;

export async function tryRefresh(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'include' })
      .then(async (res) => {
        if (res.ok) {
          const json = (await res.json()) as { accessToken: string; user: User };
          useAuthStore.getState().setSession(json.user, json.accessToken);
          return json.accessToken;
        }
        useAuthStore.getState().clear();
        return null;
      })
      .catch(() => {
        useAuthStore.getState().clear();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestInit = {},
  retryOnUnauthorized = true
): Promise<T> {
  const { accessToken } = useAuthStore.getState();

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (res.status === 401 && retryOnUnauthorized) {
    const newToken = await tryRefresh();
    if (newToken) {
      return apiRequest<T>(path, options, false);
    }
    throw new ApiError(401, 'Your session has expired. Please log in again.', 'UNAUTHORIZED');
  }

  const body = (await parseResponse(res)) as
    | { success: boolean; message?: string; code?: string; details?: unknown; [k: string]: unknown }
    | string;

  if (!res.ok) {
    const message =
      typeof body === 'string'
        ? 'Something went wrong. Please try again.'
        : (body?.message ?? 'Something went wrong. Please try again.');
    throw new ApiError(res.status, message, typeof body === 'object' ? (body?.code ?? 'ERROR') : 'ERROR', typeof body === 'object' ? body?.details : undefined);
  }

  return body as T;
}

export const api = {
  get: <T = unknown>(path: string) => apiRequest<T>(path),
  post: <T = unknown>(path: string, body?: unknown) =>
    apiRequest<T>(path, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  put: <T = unknown>(path: string, body?: unknown) =>
    apiRequest<T>(path, {
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  delete: <T = unknown>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
  upload: <T = unknown>(path: string, formData: FormData) =>
    apiRequest<T>(path, { method: 'POST', body: formData }),
};
