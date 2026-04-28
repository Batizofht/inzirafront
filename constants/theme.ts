/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0A2540'; // Professional Deep Navy
const tintColorDark = '#60A5FA';  // Crisp Blue for dark mode visibility

export const Colors = {
  light: {
    text: '#1A1D20',
    background: '#FFFFFF',
    tint: tintColorLight,
    icon: '#6C757D',
    tabIconDefault: '#ADB5BD',
    tabIconSelected: tintColorLight,
    card: '#F8F9FA',
    border: '#E9ECEF',
    primary: '#0A2540',
    secondary: '#495057',
    accent: '#1A1D20',
  },
  dark: {
    text: '#F8F9FA',
    background: '#121212', 
    tint: tintColorDark,
    icon: '#A0A0A0',
    tabIconDefault: '#6C757D',
    tabIconSelected: tintColorDark,
    card: '#1E1E1E',
    border: '#2D2D2D',
    primary: '#60A5FA',
    secondary: '#ADB5BD', 
    accent: '#F8F9FA',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
