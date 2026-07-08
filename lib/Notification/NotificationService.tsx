import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from '../api-client';

class NotificationService {
  static initializeNotificationListeners(
    notificationReceivedCallback?: (notification: Notifications.Notification) => void,
    notificationResponseCallback?: (response: Notifications.NotificationResponse) => void,
  ) {
    const notificationListener = Notifications.addNotificationReceivedListener(
      notificationReceivedCallback || ((notification: Notifications.Notification) => console.log('Notification received:', notification)),
    );
    const responseListener = Notifications.addNotificationResponseReceivedListener(
      notificationResponseCallback || ((response: Notifications.NotificationResponse) => console.log('Notification response:', response)),
    );
    return { notificationListener, responseListener };
  }

  static async registerForPushNotifications() {
    let token: string | null = null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    try {
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      await AsyncStorage.setItem('expoPushToken', token);
      return token;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  static async saveTokenToServer(token: string, userId: string) {
    if (!token || !userId) {
      console.error('Missing token or userId for saving to server');
      return false;
    }
    try {
      const response = await apiRequest('/profile/me/device-token', {
        method: 'PUT',
        auth: true,
        body: { deviceToken: token },
      });
      console.log('Token saved successfully to server', token);
      return response?.status === 1;
    } catch (_) {
      return false;
    }
  }

  static async getStoredNotifications() {
    try {
      const notificationsJson = await AsyncStorage.getItem('localNotifications');
      return notificationsJson ? JSON.parse(notificationsJson) : [];
    } catch (_) {
      return [];
    }
  }

  static async storeNotification(notification: { notificationId?: string; title?: string; body?: string; data?: any }) {
    try {
      const notifications = await this.getStoredNotifications();
      const updatedNotifications = [
        {
          id: notification.notificationId || Date.now().toString(),
          title: notification.title,
          body: notification.body,
          data: notification.data,
          receivedAt: new Date().toISOString(),
          seen: false,
        },
        ...notifications,
      ].slice(0, 50);
      await AsyncStorage.setItem('localNotifications', JSON.stringify(updatedNotifications));
      return true;
    } catch (_) {
      return false;
    }
  }

  static async markNotificationAsSeen(notificationId: string) {
    try {
      const notifications = await this.getStoredNotifications();
      const updatedNotifications = notifications.map((n: any) =>
        n.id === notificationId ? { ...n, seen: true } : n,
      );
      await AsyncStorage.setItem('localNotifications', JSON.stringify(updatedNotifications));
      return true;
    } catch (_) {
      return false;
    }
  }

  static async getUnreadCount() {
    try {
      const notifications = await this.getStoredNotifications();
      return notifications.filter((n: any) => !n.seen).length;
    } catch (_) {
      return 0;
    }
  }

  static async scheduleLocalNotification(title: string, body: string, data: any = {}, trigger: any = null) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: { title, body, data },
        trigger: trigger || { seconds: 1 },
      });
      return true;
    } catch (_) {
      return false;
    }
  }
}

export default NotificationService;