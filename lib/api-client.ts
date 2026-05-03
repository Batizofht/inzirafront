import { Platform } from 'react-native';
import { getAuthToken } from './userPreference';

const DEFAULT_WEB_API = 'https://bonetsell.onrender.com/api/v1';
const DEFAULT_ANDROID_API = 'http://10.0.2.2:4002/api/v1';
const DEFAULT_IOS_API = 'https://bonetsell.onrender.com/api/v1';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === 'android' ? DEFAULT_ANDROID_API : Platform.OS === 'ios' ? DEFAULT_IOS_API : DEFAULT_WEB_API) ;

export type ApiRequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  isFormData?: boolean;
};

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = false, isFormData = false } = options;

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
  console.log(`[API] ${method} ${url}`, body ? { body } : '');

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body == null ? undefined : isFormData ? body as FormData : JSON.stringify(body),
    });
    console.log(`[API] Response status: ${response.status}`);
  } catch (networkErr) {
    console.log('[API] Network error:', networkErr);
    throw new Error('Cannot connect to server. Please check your internet connection.');
  }

  const json = await response.json().catch(() => ({}));
  console.log(`[API] Response body:`, json);

  if (!response.ok || json?.status === 0) {
    const err = new Error(json?.message || `Request failed: ${response.status}`) as Error & { data?: unknown };
    err.data = json?.data;
    throw err;
  }

  return json as T;
}
