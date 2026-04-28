import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, apiRequest } from '../api-client';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  // Initialize notification listeners
  static initializeNotificationListeners(notificationReceivedCallback, notificationResponseCallback) {
    const notificationListener = Notifications.addNotificationReceivedListener(
      notificationReceivedCallback || (notification => console.log('Notification received:', notification))
    );

    const responseListener = Notifications.addNotificationResponseReceivedListener(
      notificationResponseCallback || (response => console.log('Notification response:', response))
    );

    return { notificationListener, responseListener };
  }

  // Register for push notifications and return the token
 static async registerForPushNotifications() {
  console.log("🔹 Registering for push notifications...");
  let token;

  // Android channel setup
  if (Platform.OS === 'android') {
    console.log("🔹 Setting Android notification channel...");
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  // Check permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  console.log("🔹 Existing permissions:", existingStatus);
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
    console.log("🔹 Permission request result:", finalStatus);
  }

  if (finalStatus !== 'granted') {
    console.log("❌ Push notification permission not granted!");
    return null;
  }
  

  // Get token
  try {
    console.log("🔹 Getting Expo push token...");

const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    console.log("✅ Expo push token received:", token);

    await AsyncStorage.setItem('expoPushToken', token);
    return token;
  } catch (error) {
    console.error("❌ Error getting push token:", error);
    return null;
  }
}


  // Save token to server
  static async saveTokenToServer(token, userId) {
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
    } catch (error: any) {
      if (error?.message?.includes('401') || error?.data?.status === 0) {
        console.log('Token not saved - user not authenticated (401)');
      } else {
        console.error('Error saving token to server:', error);
      }
      return false;
    }
  }


  // Get locally stored notifications
  static async getStoredNotifications() {
    try {
      const notificationsJson = await AsyncStorage.getItem('localNotifications');
      return notificationsJson ? JSON.parse(notificationsJson) : [];
    } catch (error) {
      console.error('Error getting stored notifications:', error);
      return [];
    }
  }

  // Store a notification locally
  static async storeNotification(notification) {
    try {
      const notifications = await this.getStoredNotifications();
      
      // Add new notification with seen status
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
      ];
      
      // Limit to 50 notifications
      const limitedNotifications = updatedNotifications.slice(0, 50);
      
      await AsyncStorage.setItem('localNotifications', JSON.stringify(limitedNotifications));
      return true;
    } catch (error) {
      console.error('Error storing notification locally:', error);
      return false;
    }
  }

  // Mark notification as seen
  static async markNotificationAsSeen(notificationId) {
    try {
      const notifications = await this.getStoredNotifications();
      const updatedNotifications = notifications.map(notification => 
        notification.id === notificationId ? { ...notification, seen: true } : notification
      );
      
      await AsyncStorage.setItem('localNotifications', JSON.stringify(updatedNotifications));
      return true;
    } catch (error) {
      console.error('Error marking notification as seen:', error);
      return false;
    }
  }

  // Get unread notification count
  static async getUnreadCount() {
    try {
      const notifications = await this.getStoredNotifications();
      return notifications.filter(notification => !notification.seen).length;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // Schedule a local notification
  static async scheduleLocalNotification(title, body, data = {}, trigger = null) {
    try {
      const notificationContent = {
        title,
        body,
        data,
      };

      const notificationTrigger = trigger || { seconds: 1 };

      await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: notificationTrigger,
      });
      
      return true;
    } catch (error) {
      console.error('Error scheduling local notification:', error);
      return false;
    }
  }
}

export default NotificationService; 