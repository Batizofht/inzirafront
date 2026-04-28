import { apiRequest } from './api-client';

export async function getMyPrivacySettings(): Promise<{ status: number; data: { settings: { dataSharing: boolean; twoFactor: boolean } } }> {
  return apiRequest('/profile/me/privacy', { auth: true });
}

export async function updateMyPrivacySettings(payload: { dataSharing?: boolean; twoFactor?: boolean }): Promise<{ status: number; message: string; data: { settings: { dataSharing: boolean; twoFactor: boolean } } }> {
  return apiRequest('/profile/me/privacy', { method: 'PATCH', auth: true, body: payload });
}
