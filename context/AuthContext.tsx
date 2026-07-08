import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { getAuthUser, isLoggedIn, logout as performLogout, type AuthUser } from '@/lib/userPreference';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { apiRequest } from '@/lib/api-client';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isMountedRef = useRef(true);
  const pushRegisteredRef = useRef(false);

  const registerPushToken = useCallback(async () => {
    if (pushRegisteredRef.current) return;
    pushRegisteredRef.current = true;
    try {
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
      if (finalStatus !== 'granted') return;

      const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      await apiRequest('/profile/me/device-token', {
        method: 'PUT',
        auth: true,
        body: { deviceToken: tokenData.data },
      });
    } catch (_) {
      // best-effort
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const loggedIn = await isLoggedIn();
      if (loggedIn) {
        const authUser = await getAuthUser();
        if (isMountedRef.current) {
          setUser(authUser);
          registerPushToken();
        }
      } else {
        if (isMountedRef.current) {
          setUser(null);
        }
      }
    } catch (error) {
      console.error('Failed to refresh auth user:', error);
      if (isMountedRef.current) {
        setUser(null);
      }
    }
  }, [registerPushToken]);

  useEffect(() => {
    isMountedRef.current = true;

    refreshUser().finally(() => {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    });

    const intervalId = setInterval(() => {
      refreshUser();
    }, 5000);

    // Notification listeners
    const notifListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
    });

    return () => {
      isMountedRef.current = false;
      clearInterval(intervalId);
      notifListener.remove();
      responseListener.remove();
    };
  }, [refreshUser]);

  const logout = async () => {
    await performLogout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
