import { Platform } from 'react-native';

/**
 * Check if running on web platform (desktop or mobile browser)
 */
export const isWeb = Platform.OS === 'web';

/**
 * Check if running on native mobile app (iOS or Android)
 */
export const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

/**
 * Check if running on iOS
 */
export const isIOS = Platform.OS === 'ios';

/**
 * Check if running on Android
 */
export const isAndroid = Platform.OS === 'android';

/**
 * Get platform name
 */
export const getPlatform = (): 'ios' | 'android' | 'web' | 'macos' | 'windows' | 'native' => {
  return Platform.OS as any;
};
