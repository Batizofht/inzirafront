import React, { useState, useEffect, useRef } from "react";
import { View } from "react-native";
import { useAuth } from "../../context/AuthContext";
import NotificationService from "./NotificationService";
import * as Notifications from "expo-notifications";
import i18n from "../../i18n";

export default function Themman(): React.ReactElement {
  const [expoPushToken, setExpoPushToken] = useState<string>("");
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);
  const { user } = useAuth();

  // Get current language
  const getCurrentLanguage = (): string => {
    return i18n.language || 'en';
  };

  useEffect(() => {
    // Initialize notification service
    const initNotifications = async () => {
      try {
        // Register for push notifications
        const token = await NotificationService.registerForPushNotifications();
        if (token) {
          setExpoPushToken(token);
          console.log("TOKEN >>>", token);

          // Save token to server if we have a user
          if (user && user.id) {
            await NotificationService.saveTokenToServer(token, user.id, getCurrentLanguage());
          }
        }
      } catch (error) {
        console.error("Error initializing notifications:", error);
      }
    };

    initNotifications();

    // Set up notification listeners
    const listeners = NotificationService.initializeNotificationListeners(
      // Notification received callback
      (receivedNotification: Notifications.Notification) => {
        setNotification(receivedNotification);

        // Store notification locally
        if (receivedNotification?.request?.content) {
          const content = receivedNotification.request.content;
          NotificationService.storeNotification({
            title: content.title,
            body: content.body,
            data: content.data as Record<string, unknown> | undefined,
            notificationId: content.data?.notificationId as string | undefined,
          });
        }
      },
      // Notification response callback (user tapped notification)
      (response: Notifications.NotificationResponse) => {
        console.log("Notification response:", response);
        // Handle notification response if needed
        // You can navigate to a specific screen based on notification data
        const data = response.notification.request.content.data;
        if (data?.notificationId) {
          // Navigate to notification detail or relevant screen
          console.log("User tapped notification:", data.notificationId);
        }
      }
    );
    
    notificationListener.current = listeners.notificationListener;
    responseListener.current = listeners.responseListener;

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  // When user changes, update token on server
  useEffect(() => {
    if (expoPushToken && user && user.id) {
      NotificationService.saveTokenToServer(expoPushToken, user.id, getCurrentLanguage());
    }
  }, [expoPushToken, user]);

  // This component doesn't render anything visible
  return <View style={{ display: "none" }} />;
}
