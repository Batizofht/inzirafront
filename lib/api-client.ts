import { Platform } from 'react-native';
import { getAuthToken } from './userPreference';

// Local-dev-only fallbacks — never shipped in a production build. If
// EXPO_PUBLIC_API_URL is missing outside of __DEV__, resolveApiBaseUrl()
// throws instead of silently baking these internal addresses into the bundle.
const DEFAULT_WEB_API = 'https://api.inzira.co/api/v1';
const DEFAULT_ANDROID_API = 'http://10.0.2.2:4002/api/v1';
const DEFAULT_IOS_API = 'https://api.inzira.co/api/v1';

function resolveApiBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl;

  if (!__DEV__) {
    throw new Error('EXPO_PUBLIC_API_URL is required in production builds');
  }

  return Platform.OS === 'android' ? DEFAULT_ANDROID_API : Platform.OS === 'ios' ? DEFAULT_IOS_API : DEFAULT_WEB_API;
}

export const API_BASE_URL = resolveApiBaseUrl();

export type ApiRequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  isFormData?: boolean;
  /** Per-request timeout. Uploads pass a larger value. */
  timeoutMs?: number;
};

/**
 * fetch() never times out on its own. Without this, a request that stalls (a
 * dropped mobile connection mid-flight) leaves the caller awaiting forever —
 * which is how the payment status poll could hang with the spinner up.
 */
const DEFAULT_TIMEOUT_MS = 30_000;
const FORM_DATA_TIMEOUT_MS = 120_000;

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = false, isFormData = false } = options;
  const timeoutMs = options.timeoutMs ?? (isFormData ? FORM_DATA_TIMEOUT_MS : DEFAULT_TIMEOUT_MS);

  const headers: Record<string, string> = {};
  
  // Don't set Content-Type for FormData - let browser set it with boundary
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  if (auth) {
    const token = await getAuthToken();
    if (!token) {
      throw new Error('Missing auth token');
    }
    headers.Authorization = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${path}`;
  if (__DEV__) {
    console.log(`[API] ${method} ${url}`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body == null ? undefined : isFormData ? body as FormData : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (networkErr: any) {
    if (__DEV__) {
      console.log('[API] Network error:', networkErr);
    }
    if (networkErr?.name === 'AbortError') {
      throw new Error('The server took too long to respond. Please try again.');
    }
    throw new Error('Cannot connect to server. Please check your internet connection.');
  } finally {
    clearTimeout(timeoutId);
  }

  const json = await response.json().catch(() => ({}));

  if (!response.ok || json?.status === 0) {
    const err = new Error(json?.message || `Request failed: ${response.status}`) as Error & { data?: unknown };
    err.data = json?.data;
    throw err;
  }

  return json as T;
}
