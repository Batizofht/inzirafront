import { apiRequest } from './api-client';

export type Notification = {
  id: string;
  userId: string;
  type: 'contact_request' | 'message' | 'listing' | 'system' | 'subscription';
  title: string;
  body: string;
  isRead: boolean;
  seen?: boolean;
  createdAt: string;
};

export type NotificationsResponse = {
  status: number;
  data: {
    notifications: Notification[];
  };
};

export async function fetchNotifications(): Promise<NotificationsResponse> {
  return apiRequest('/notifications', { auth: true });
}

export async function fetchUnreadNotificationsCount(): Promise<{ status: number; data: { unreadCount: number } }> {
  return apiRequest('/notifications/unread-count', { auth: true });
}

export async function markNotificationRead(id: string): Promise<{ status: number; message: string; data: { notification: Notification } }> {
  return apiRequest(`/notifications/${id}/read`, {
    method: 'PATCH',
    auth: true,
  });
}

export async function markAllNotificationsRead(): Promise<{ status: number; message: string }> {
  return apiRequest('/notifications/read-all', {
    method: 'PATCH',
    auth: true,
  });
}

export async function deleteNotification(id: string): Promise<{ status: number; message: string }> {
  return apiRequest(`/notifications/${id}`, {
    method: 'DELETE',
    auth: true,
  });
}

export async function deleteAllNotifications(): Promise<{ status: number; message: string }> {
  return apiRequest('/notifications/all', {
    method: 'DELETE',
    auth: true,
  });
}

export async function getMyNotificationSettings(): Promise<{ status: number; data: { settings: { push: boolean; email: boolean; marketing: boolean } } }> {
  return apiRequest('/profile/me/notifications', { auth: true });
}

export async function updateMyNotificationSettings(payload: { push?: boolean; email?: boolean; marketing?: boolean }): Promise<{ status: number; message: string; data: { settings: { push: boolean; email: boolean; marketing: boolean } } }> {
  return apiRequest('/profile/me/notifications', { method: 'PATCH', auth: true, body: payload });
}
